import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import {
  LiveArciumAdapter,
  evaluatePolicyWithArcium,
  toSetAccessStatusPayload,
  type ArciumEvaluationResult,
  type ArciumPolicyInput,
  type SubmitEncryptedPolicyComputationFn,
  type ReadArciumPolicyResultFn
} from "../../sdk/src/node.js";

type OrchestratorConfig = {
  rpcUrl: string;
  streamrightsProgramId: string;
  mxeProgramId: string;
};

type AccessRequestEnvelope = {
  input: ArciumPolicyInput;
};

/**
 * Production orchestrator responsibilities:
 * - run Arcium network computation for policy evaluation
 * - map result to StreamRights `set_access_status` payload
 * - submit final status transaction on Solana
 */
export class AccessOrchestrator {
  private readonly provider: AnchorProvider;
  private readonly streamrightsProgramId: PublicKey;
  private readonly mxeProgramId: PublicKey;
  private readonly arciumAdapter: LiveArciumAdapter;

  constructor(
    cfg: OrchestratorConfig,
    payer: Keypair,
    submitComputation: SubmitEncryptedPolicyComputationFn,
    readResult: ReadArciumPolicyResultFn
  ) {
    const connection = new Connection(cfg.rpcUrl, "confirmed");
    this.provider = new AnchorProvider(connection, new Wallet(payer), {
      commitment: "confirmed"
    });
    this.streamrightsProgramId = new PublicKey(cfg.streamrightsProgramId);
    this.mxeProgramId = new PublicKey(cfg.mxeProgramId);
    this.arciumAdapter = new LiveArciumAdapter({
      provider: this.provider,
      mxeProgramId: this.mxeProgramId,
      submitComputation,
      readResult
    });
  }

  async processAccessRequest(req: AccessRequestEnvelope): Promise<ArciumEvaluationResult> {
    const result = await evaluatePolicyWithArcium(req.input, "network", this.arciumAdapter);
    const payload = toSetAccessStatusPayload(req.input, result);
    await this.submitSetAccessStatus(payload, req.input.buyer);
    return result;
  }

  // Uses a minimal custom ix builder placeholder; replace with generated Anchor client bindings.
  private async submitSetAccessStatus(
    payload: {
      assetId: string;
      buyer: string;
      requestNonce: string;
      approved: boolean;
      authorizationId?: string;
    },
    buyerPubkey: string
  ): Promise<string> {
    const buyer = new PublicKey(buyerPubkey);
    const requestNonce = this.requestNonceHexToBytes(payload.requestNonce);
    const data = this.encodeSetAccessStatusArgs(buyer, requestNonce, payload.approved);

    const ix = new TransactionInstruction({
      programId: this.streamrightsProgramId,
      keys: [
        // NOTE: add exact account metas once Anchor IDL-generated client is wired.
      ],
      data
    });

    const tx = new Transaction().add(ix);
    const sig = await this.provider.sendAndConfirm(tx, [], { commitment: "confirmed" });
    return sig;
  }

  private requestNonceHexToBytes(input: string): Uint8Array {
    const cleaned = input.replace(/-/g, "");
    const bytes = new Uint8Array(32);
    for (let i = 0; i < Math.min(64, cleaned.length); i += 2) {
      bytes[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
    }
    return bytes;
  }

  // Temporary serializer; replace with Anchor instruction coder from generated IDL.
  private encodeSetAccessStatusArgs(
    buyer: PublicKey,
    requestNonce: Uint8Array,
    approved: boolean
  ): Buffer {
    const data = Buffer.alloc(1 + 32 + 32 + 1);
    data[0] = 0; // TODO: discriminator for set_access_status
    buyer.toBuffer().copy(data, 1);
    Buffer.from(requestNonce).copy(data, 33);
    data[65] = approved ? 1 : 0;
    return data;
  }
}

/**
 * Example boot function to show wiring.
 * Replace env/config loading and callbacks with production implementations.
 */
export async function bootOrchestrator(): Promise<void> {
  const cfg: OrchestratorConfig = {
    rpcUrl: process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    streamrightsProgramId: process.env.STREAMRIGHTS_PROGRAM_ID ?? "11111111111111111111111111111111",
    mxeProgramId: process.env.ARCIUM_MXE_PROGRAM_ID ?? "11111111111111111111111111111111"
  };
  const payer = Keypair.generate();

  const submitComputation: SubmitEncryptedPolicyComputationFn = async (
    _input: ArciumPolicyInput
  ) => {
    // TODO: queue encrypted Arcium policy computation.
    return {
      computationOffset: new BN(1),
      txSignature: "pending-signature"
    };
  };

  const readResult: ReadArciumPolicyResultFn = async (
    _input: ArciumPolicyInput,
    _offset: BN,
    _finalizeSig: string
  ) => {
    // TODO: decode result account/callback from Arcium computation output.
    return {
      approved: true,
      reasonCode: "OK",
      authorizationId: "auth_placeholder",
      updatedUses: 1
    };
  };

  const orchestrator = new AccessOrchestrator(cfg, payer, submitComputation, readResult);
  void orchestrator;
}
