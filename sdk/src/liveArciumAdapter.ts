import { BN, type AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, type Finality } from "@solana/web3.js";
import { awaitComputationFinalization } from "@arcium-hq/client";
import type { ArciumEvaluationResult, ArciumNetworkAdapter, ArciumPolicyInput } from "./arcium";

export type SubmittedArciumComputation = {
  computationOffset: BN;
  txSignature: string;
};

export type SubmitEncryptedPolicyComputationFn = (
  input: ArciumPolicyInput
) => Promise<SubmittedArciumComputation>;

export type ReadArciumPolicyResultFn = (
  input: ArciumPolicyInput,
  computationOffset: BN,
  finalizeSignature: string
) => Promise<ArciumEvaluationResult>;

export type LiveArciumAdapterConfig = {
  provider: AnchorProvider;
  mxeProgramId: PublicKey;
  submitComputation: SubmitEncryptedPolicyComputationFn;
  readResult: ReadArciumPolicyResultFn;
  commitment?: Finality;
  timeoutMs?: number;
};

/**
 * Network-backed Arcium adapter.
 * This performs:
 * 1) submit encrypted computation
 * 2) await finalization on Arcium
 * 3) read and map computation result to app-level authorization result
 */
export class LiveArciumAdapter implements ArciumNetworkAdapter {
  private readonly provider: AnchorProvider;
  private readonly mxeProgramId: PublicKey;
  private readonly submitComputation: SubmitEncryptedPolicyComputationFn;
  private readonly readResult: ReadArciumPolicyResultFn;
  private readonly commitment: Finality;
  private readonly timeoutMs: number;

  constructor(config: LiveArciumAdapterConfig) {
    this.provider = config.provider;
    this.mxeProgramId = config.mxeProgramId;
    this.submitComputation = config.submitComputation;
    this.readResult = config.readResult;
    this.commitment = config.commitment ?? "confirmed";
    this.timeoutMs = config.timeoutMs ?? 120_000;
  }

  async evaluateEncryptedPolicy(input: ArciumPolicyInput): Promise<ArciumEvaluationResult> {
    const submitted = await this.submitComputation(input);
    const finalizeSignature = await awaitComputationFinalization(
      this.provider,
      submitted.computationOffset,
      this.mxeProgramId,
      this.commitment,
      this.timeoutMs
    );
    return this.readResult(input, submitted.computationOffset, finalizeSignature);
  }
}
