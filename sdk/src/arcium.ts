export type ArciumPolicyInput = {
  assetId: string;
  buyer: string;
  requestNonce: string;
  nowUnix: number;
  priceLamports: bigint;
  amountPaidLamports: bigint;
  expiresAtUnix: number;
  revoked: boolean;
  usesSoFar: number;
  maxUses: number;
};

export type ArciumEvaluationResult = {
  approved: boolean;
  reasonCode:
    | "OK"
    | "REVOKED"
    | "EXPIRED"
    | "INSUFFICIENT_PAYMENT"
    | "USAGE_LIMIT_REACHED";
  authorizationId?: string;
  updatedUses: number;
};

export type SolanaAccessStatusPayload = {
  assetId: string;
  buyer: string;
  requestNonce: string;
  approved: boolean;
  authorizationId?: string;
};

export type ArciumEvaluationMode = "local" | "network";

export interface ArciumNetworkAdapter {
  evaluateEncryptedPolicy(input: ArciumPolicyInput): Promise<ArciumEvaluationResult>;
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}

// This mirrors intended Arcium circuit semantics and can be replaced
// by live network calls without changing app logic.
export function evaluatePolicy(input: ArciumPolicyInput): ArciumEvaluationResult {
  if (input.revoked) {
    return {
      approved: false,
      reasonCode: "REVOKED",
      updatedUses: input.usesSoFar
    };
  }
  if (input.nowUnix >= input.expiresAtUnix) {
    return {
      approved: false,
      reasonCode: "EXPIRED",
      updatedUses: input.usesSoFar
    };
  }
  if (input.amountPaidLamports < input.priceLamports) {
    return {
      approved: false,
      reasonCode: "INSUFFICIENT_PAYMENT",
      updatedUses: input.usesSoFar
    };
  }
  if (input.usesSoFar >= input.maxUses) {
    return {
      approved: false,
      reasonCode: "USAGE_LIMIT_REACHED",
      updatedUses: input.usesSoFar
    };
  }

  return {
    approved: true,
    reasonCode: "OK",
    authorizationId: `auth_${randomHex(12)}`,
    updatedUses: input.usesSoFar + 1
  };
}

export function toSetAccessStatusPayload(
  input: ArciumPolicyInput,
  result: ArciumEvaluationResult
): SolanaAccessStatusPayload {
  return {
    assetId: input.assetId,
    buyer: input.buyer,
    requestNonce: input.requestNonce,
    approved: result.approved,
    authorizationId: result.authorizationId
  };
}

export async function evaluatePolicyWithArcium(
  input: ArciumPolicyInput,
  mode: ArciumEvaluationMode,
  adapter?: ArciumNetworkAdapter
): Promise<ArciumEvaluationResult> {
  if (mode === "network") {
    if (!adapter) {
      throw new Error("Arcium network mode requires a network adapter.");
    }
    return adapter.evaluateEncryptedPolicy(input);
  }
  return evaluatePolicy(input);
}

export class PlaceholderArciumNetworkAdapter implements ArciumNetworkAdapter {
  async evaluateEncryptedPolicy(_input: ArciumPolicyInput): Promise<ArciumEvaluationResult> {
    throw new Error(
      "Live Arcium adapter is not configured yet. Plug in Arcis computation submission and finalization here."
    );
  }
}
