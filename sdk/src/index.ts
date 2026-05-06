export type AccessPolicy = {
  assetId: string;
  owner: string;
  priceLamports: bigint;
  expiresAtUnix: number;
  maxDecryptions: number;
  revocable: boolean;
};

export type PurchaseRequest = {
  assetId: string;
  buyer: string;
  paymentSignature: string;
  requestNonce: string;
};

export type AuthorizationResult = {
  approved: boolean;
  reason?: string;
  authorizationId?: string;
};

// Placeholder interfaces for upcoming concrete integrations.
// These APIs make it easy to wire frontend flows while Arcium/Solana logic is implemented.
export interface StreamRightsClient {
  createPolicy(policy: AccessPolicy): Promise<string>;
  requestAccess(input: PurchaseRequest): Promise<AuthorizationResult>;
  revoke(assetId: string): Promise<string>;
}

export * from "./crypto";
export * from "./arcium";
