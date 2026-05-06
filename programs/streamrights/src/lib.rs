use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};

declare_id!("11111111111111111111111111111111");

#[program]
pub mod streamrights {
    use super::*;

    pub fn create_asset(
        ctx: Context<CreateAsset>,
        asset_id: [u8; 32],
        storage_uri: String,
        content_hash: [u8; 32],
        policy_ref: [u8; 32],
        price_lamports: u64,
        expires_at_unix: i64,
        max_access_count: u32,
    ) -> Result<()> {
        require!(storage_uri.len() <= MAX_STORAGE_URI_LEN, StreamRightsError::StringTooLong);
        require!(expires_at_unix > Clock::get()?.unix_timestamp, StreamRightsError::InvalidExpiry);

        let asset = &mut ctx.accounts.asset;
        asset.asset_id = asset_id;
        asset.owner = ctx.accounts.owner.key();
        asset.storage_uri = storage_uri;
        asset.content_hash = content_hash;
        asset.policy_ref = policy_ref;
        asset.price_lamports = price_lamports;
        asset.expires_at_unix = expires_at_unix;
        asset.max_access_count = max_access_count;
        asset.access_count = 0;
        asset.revoked = false;
        asset.created_at_unix = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn purchase_access(
        ctx: Context<PurchaseAccess>,
        request_nonce: [u8; 32],
        payment_lamports: u64,
    ) -> Result<()> {
        let asset_key = ctx.accounts.asset.key();
        let asset = &mut ctx.accounts.asset;
        let now = Clock::get()?.unix_timestamp;

        require!(!asset.revoked, StreamRightsError::AssetRevoked);
        require!(asset.expires_at_unix > now, StreamRightsError::LicenseExpired);
        require!(
            asset.access_count < asset.max_access_count,
            StreamRightsError::UsageLimitReached
        );
        require!(
            payment_lamports >= asset.price_lamports,
            StreamRightsError::InsufficientPayment
        );

        // Payment is sent directly to the asset owner wallet account.
        let transfer_ix = system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.owner_destination.key(),
            payment_lamports,
        );
        invoke(
            &transfer_ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.owner_destination.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let receipt = &mut ctx.accounts.receipt;
        receipt.asset = asset_key;
        receipt.asset_id = asset.asset_id;
        receipt.buyer = ctx.accounts.buyer.key();
        receipt.request_nonce = request_nonce;
        receipt.payment_lamports = payment_lamports;
        receipt.timestamp_unix = now;
        receipt.status = AccessStatus::PaidPendingArcium as u8;

        let access_marker = &mut ctx.accounts.access_marker;
        access_marker.asset = asset_key;
        access_marker.buyer = ctx.accounts.buyer.key();
        access_marker.request_nonce = request_nonce;
        access_marker.created_at_unix = now;

        asset.access_count = asset
            .access_count
            .checked_add(1)
            .ok_or(StreamRightsError::ArithmeticOverflow)?;

        emit!(AccessRequested {
            asset: asset_key,
            buyer: ctx.accounts.buyer.key(),
            request_nonce,
            amount_paid: payment_lamports,
        });

        Ok(())
    }

    pub fn revoke_access(ctx: Context<RevokeAccess>) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        require_keys_eq!(asset.owner, ctx.accounts.owner.key(), StreamRightsError::Unauthorized);
        asset.revoked = true;
        Ok(())
    }

    pub fn update_policy(
        ctx: Context<UpdatePolicy>,
        policy_ref: [u8; 32],
        price_lamports: u64,
        expires_at_unix: i64,
        max_access_count: u32,
    ) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        require_keys_eq!(asset.owner, ctx.accounts.owner.key(), StreamRightsError::Unauthorized);
        require!(expires_at_unix > Clock::get()?.unix_timestamp, StreamRightsError::InvalidExpiry);
        require!(
            max_access_count >= asset.access_count,
            StreamRightsError::InvalidAccessLimit
        );

        asset.policy_ref = policy_ref;
        asset.price_lamports = price_lamports;
        asset.expires_at_unix = expires_at_unix;
        asset.max_access_count = max_access_count;
        Ok(())
    }

    pub fn set_access_status(
        ctx: Context<SetAccessStatus>,
        buyer: Pubkey,
        request_nonce: [u8; 32],
        approved: bool,
    ) -> Result<()> {
        let asset = &ctx.accounts.asset;
        require_keys_eq!(asset.owner, ctx.accounts.owner.key(), StreamRightsError::Unauthorized);

        let receipt = &mut ctx.accounts.receipt;
        require_keys_eq!(receipt.asset, asset.key(), StreamRightsError::InvalidAssetReference);
        require_keys_eq!(receipt.buyer, buyer, StreamRightsError::InvalidBuyer);
        require!(receipt.request_nonce == request_nonce, StreamRightsError::InvalidNonce);

        receipt.status = if approved {
            AccessStatus::Approved as u8
        } else {
            AccessStatus::Denied as u8
        };
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(asset_id: [u8; 32])]
pub struct CreateAsset<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + Asset::MAX_SIZE,
        seeds = [ASSET_SEED, owner.key().as_ref(), asset_id.as_ref()],
        bump
    )]
    pub asset: Account<'info, Asset>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(request_nonce: [u8; 32])]
pub struct PurchaseAccess<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub asset: Account<'info, Asset>,
    #[account(mut, address = asset.owner)]
    /// CHECK: owner destination is constrained to the asset owner pubkey.
    pub owner_destination: UncheckedAccount<'info>,
    #[account(
        init,
        payer = buyer,
        space = 8 + AccessReceipt::MAX_SIZE,
        seeds = [RECEIPT_SEED, asset.key().as_ref(), buyer.key().as_ref(), request_nonce.as_ref()],
        bump
    )]
    pub receipt: Account<'info, AccessReceipt>,
    #[account(
        init,
        payer = buyer,
        space = 8 + AccessMarker::MAX_SIZE,
        seeds = [MARKER_SEED, asset.key().as_ref(), buyer.key().as_ref(), request_nonce.as_ref()],
        bump
    )]
    pub access_marker: Account<'info, AccessMarker>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeAccess<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub asset: Account<'info, Asset>,
}

#[derive(Accounts)]
pub struct UpdatePolicy<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub asset: Account<'info, Asset>,
}

#[derive(Accounts)]
#[instruction(buyer: Pubkey, request_nonce: [u8; 32])]
pub struct SetAccessStatus<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    pub asset: Account<'info, Asset>,
    #[account(
        mut,
        seeds = [RECEIPT_SEED, asset.key().as_ref(), buyer.as_ref(), request_nonce.as_ref()],
        bump
    )]
    pub receipt: Account<'info, AccessReceipt>,
}

#[account]
pub struct Asset {
    pub asset_id: [u8; 32],
    pub owner: Pubkey,
    pub storage_uri: String,
    pub content_hash: [u8; 32],
    pub policy_ref: [u8; 32],
    pub price_lamports: u64,
    pub expires_at_unix: i64,
    pub max_access_count: u32,
    pub access_count: u32,
    pub revoked: bool,
    pub created_at_unix: i64,
}

impl Asset {
    pub const MAX_SIZE: usize = 32 + 32 + 4 + MAX_STORAGE_URI_LEN + 32 + 32 + 8 + 8 + 4 + 4 + 1 + 8;
}

#[account]
pub struct AccessReceipt {
    pub asset: Pubkey,
    pub asset_id: [u8; 32],
    pub buyer: Pubkey,
    pub request_nonce: [u8; 32],
    pub payment_lamports: u64,
    pub timestamp_unix: i64,
    pub status: u8,
}

impl AccessReceipt {
    pub const MAX_SIZE: usize = 32 + 32 + 32 + 32 + 8 + 8 + 1;
}

#[account]
pub struct AccessMarker {
    pub asset: Pubkey,
    pub buyer: Pubkey,
    pub request_nonce: [u8; 32],
    pub created_at_unix: i64,
}

impl AccessMarker {
    pub const MAX_SIZE: usize = 32 + 32 + 32 + 8;
}

#[repr(u8)]
pub enum AccessStatus {
    PaidPendingArcium = 0,
    Approved = 1,
    Denied = 2,
}

#[event]
pub struct AccessRequested {
    pub asset: Pubkey,
    pub buyer: Pubkey,
    pub request_nonce: [u8; 32],
    pub amount_paid: u64,
}

#[error_code]
pub enum StreamRightsError {
    #[msg("Unauthorized operation")]
    Unauthorized,
    #[msg("Provided string is too long")]
    StringTooLong,
    #[msg("Asset has been revoked")]
    AssetRevoked,
    #[msg("License has expired")]
    LicenseExpired,
    #[msg("Usage limit reached")]
    UsageLimitReached,
    #[msg("Insufficient payment")]
    InsufficientPayment,
    #[msg("Invalid expiry")]
    InvalidExpiry,
    #[msg("Invalid access limit")]
    InvalidAccessLimit,
    #[msg("Invalid asset reference")]
    InvalidAssetReference,
    #[msg("Invalid nonce")]
    InvalidNonce,
    #[msg("Invalid buyer")]
    InvalidBuyer,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}

pub const ASSET_SEED: &[u8] = b"asset";
pub const RECEIPT_SEED: &[u8] = b"receipt";
pub const MARKER_SEED: &[u8] = b"marker";
pub const MAX_STORAGE_URI_LEN: usize = 256;
