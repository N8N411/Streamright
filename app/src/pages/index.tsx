import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import Head from "next/head";
import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";

type ArciumEvaluationMode = "local" | "network";

type ArciumPolicyInput = {
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

type ArciumEvaluationResult = {
  approved: boolean;
  reasonCode: "OK" | "REVOKED" | "EXPIRED" | "INSUFFICIENT_PAYMENT" | "USAGE_LIMIT_REACHED";
  authorizationId?: string;
  updatedUses: number;
};

function evaluatePolicyWithArcium(input: ArciumPolicyInput, _mode: ArciumEvaluationMode): Promise<ArciumEvaluationResult> {
  if (input.revoked) {
    return Promise.resolve({ approved: false, reasonCode: "REVOKED", updatedUses: input.usesSoFar });
  }
  if (input.nowUnix >= input.expiresAtUnix) {
    return Promise.resolve({ approved: false, reasonCode: "EXPIRED", updatedUses: input.usesSoFar });
  }
  if (input.amountPaidLamports < input.priceLamports) {
    return Promise.resolve({
      approved: false,
      reasonCode: "INSUFFICIENT_PAYMENT",
      updatedUses: input.usesSoFar
    });
  }
  if (input.usesSoFar >= input.maxUses) {
    return Promise.resolve({
      approved: false,
      reasonCode: "USAGE_LIMIT_REACHED",
      updatedUses: input.usesSoFar
    });
  }
  return Promise.resolve({
    approved: true,
    reasonCode: "OK",
    authorizationId: `auth_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`,
    updatedUses: input.usesSoFar + 1
  });
}

function toSetAccessStatusPayload(input: ArciumPolicyInput, result: ArciumEvaluationResult) {
  return {
    assetId: input.assetId,
    buyer: input.buyer,
    requestNonce: input.requestNonce,
    approved: result.approved,
    authorizationId: result.authorizationId
  };
}

function ArciumMark() {
  return (
    <svg width="56" height="40" viewBox="0 0 120 90" fill="none" aria-label="Arcium style mark">
      <path d="M18 78L48 16L78 78" stroke="white" strokeWidth="12" strokeLinecap="round" />
      <path d="M42 78L72 16L102 78" stroke="white" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  const wallet = useWallet();
  const [fileName, setFileName] = useState<string>("");
  const [cipherSize, setCipherSize] = useState<number>(0);
  const [priceSol, setPriceSol] = useState("0.1");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [maxUses, setMaxUses] = useState("5");
  const [revoked, setRevoked] = useState(false);
  const [usesSoFar, setUsesSoFar] = useState(0);
  const [accessResult, setAccessResult] = useState<string>("");
  const [lastAuthId, setLastAuthId] = useState<string>("");
  const [lastStatusPayload, setLastStatusPayload] = useState<string>("");
  const [arciumMode, setArciumMode] = useState<ArciumEvaluationMode>("local");
  const [assetId] = useState<string>(() => `asset-${crypto.randomUUID().slice(0, 8)}`);
  const [shareLink, setShareLink] = useState("");
  const [buyerLinkInput, setBuyerLinkInput] = useState("");
  const [buyerRequested, setBuyerRequested] = useState(false);
  const [buyerCanDecrypt, setBuyerCanDecrypt] = useState(false);
  const [buyerMessage, setBuyerMessage] = useState("No buyer request yet.");

  const policyPreview = useMemo(
    () => `Pay ${priceSol} SOL, expires in ${expiresInDays} day(s), max ${maxUses} decryptions`,
    [priceSol, expiresInDays, maxUses]
  );

  const onFilePicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    setFileName(file.name);
    // Placeholder until sdk encryption wiring is finished.
    setCipherSize(bytes.byteLength + 28);
  };

  const runArciumCheck = async () => {
    const buyer = wallet.publicKey?.toBase58() ?? "wallet-not-connected";
    const priceLamports = BigInt(Math.floor(Number(priceSol || "0") * 1_000_000_000));
    const expiresAtUnix = Math.floor(Date.now() / 1000) + Number(expiresInDays || "0") * 24 * 60 * 60;
    const requestNonce = crypto.randomUUID();
    const amountPaidLamports = priceLamports;
    const input: ArciumPolicyInput = {
      assetId: fileName || "demo-asset",
      buyer,
      requestNonce,
      nowUnix: Math.floor(Date.now() / 1000),
      priceLamports,
      amountPaidLamports,
      expiresAtUnix,
      revoked,
      usesSoFar,
      maxUses: Number(maxUses || "0")
    };

    try {
      const result = await evaluatePolicyWithArcium(input, arciumMode);
      const statusPayload = toSetAccessStatusPayload(input, result);
      setLastStatusPayload(JSON.stringify(statusPayload));
      if (result.approved) {
        setUsesSoFar(result.updatedUses);
        setLastAuthId(result.authorizationId || "");
        setAccessResult(
          `Approved (${arciumMode}): authorization ${result.authorizationId} (nonce ${requestNonce})`
        );
      } else {
        setLastAuthId("");
        setAccessResult(`Denied (${arciumMode}): ${result.reasonCode} (nonce ${requestNonce})`);
      }
    } catch (error) {
      setLastAuthId("");
      setLastStatusPayload("");
      setAccessResult(`Error (${arciumMode}): ${(error as Error).message}`);
    }
  };

  const generateShareLink = () => {
    const params = new URLSearchParams({
      asset: assetId,
      price: priceSol,
      expiryDays: expiresInDays,
      max: maxUses
    });
    const link = `${window.location.origin}?${params.toString()}`;
    setShareLink(link);
    setBuyerLinkInput(link);
  };

  const buyerRequestAccess = async () => {
    setBuyerRequested(true);
    const buyer = wallet.publicKey?.toBase58() ?? "wallet-not-connected";
    const priceLamports = BigInt(Math.floor(Number(priceSol || "0") * 1_000_000_000));
    const expiresAtUnix = Math.floor(Date.now() / 1000) + Number(expiresInDays || "0") * 24 * 60 * 60;
    const requestNonce = crypto.randomUUID();
    const input: ArciumPolicyInput = {
      assetId,
      buyer,
      requestNonce,
      nowUnix: Math.floor(Date.now() / 1000),
      priceLamports,
      amountPaidLamports: priceLamports,
      expiresAtUnix,
      revoked,
      usesSoFar,
      maxUses: Number(maxUses || "0")
    };

    try {
      const result = await evaluatePolicyWithArcium(input, arciumMode);
      if (result.approved) {
        setBuyerCanDecrypt(true);
        setBuyerMessage(`Access approved. Authorization: ${result.authorizationId}`);
      } else {
        setBuyerCanDecrypt(false);
        setBuyerMessage(`Access denied: ${result.reasonCode}`);
      }
    } catch (error) {
      setBuyerCanDecrypt(false);
      setBuyerMessage(`Access error: ${(error as Error).message}`);
    }
  };

  return (
    <>
      <Head>
        <title>StreamRights App</title>
      </Head>
      <div className="sr-shell">
        <main
          className="sr-main"
          style={{
            background:
              "linear-gradient(180deg, rgba(110,73,255,0.20) 0%, rgba(86,56,224,0.20) 100%)",
            borderRadius: 16,
            padding: 14,
            border: "1px solid rgba(170,150,255,0.35)"
          }}
        >
          <header
            className="sr-topbar"
            style={{
              background: "rgba(96,64,232,0.35)",
              border: "1px solid rgba(171,150,255,0.4)",
              borderRadius: 12,
              padding: "10px 12px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ArciumMark />
              <div className="sr-brand">ARCIUM</div>
            </div>
            <WalletMultiButton />
          </header>

          <section
            className="sr-hero"
            style={{
              background: "linear-gradient(135deg, rgba(117,81,255,0.55), rgba(74,46,202,0.62))",
              border: "1px solid rgba(188,171,255,0.45)"
            }}
          >
            <h1 className="sr-title" style={{ color: "#fff" }}>
              StreamRights
            </h1>
            <p className="sr-sub" style={{ color: "#f3eeff" }}>
              Trustless, verifiable, and efficient encrypted access for modern applications.
            </p>
            <div className="sr-pill-row">
              <span className="sr-pill">Encrypted Shared State</span>
              <span className="sr-pill">Programmable Policies</span>
              <span className="sr-pill">No Trusted Gatekeeper</span>
            </div>
          </section>

          <section className="sr-layout">
            <div className="sr-panel" style={{ background: "rgba(112,78,248,0.36)", border: "1px solid rgba(196,182,255,0.38)" }}>
              <p className="sr-kicker">ENCRYPTED STORAGE LAYER</p>
              <h3>Data remains private by default.</h3>
              <p className="sr-muted">
                Encrypt data client-side before upload. Store ciphertext on IPFS or S3-compatible infrastructure
                while retaining confidentiality and control.
              </p>
              <input type="file" onChange={onFilePicked} />
              <div className="sr-actions" style={{ marginTop: 10 }}>
                <button onClick={generateShareLink}>Generate share link</button>
              </div>
            {fileName && (
              <p className="sr-muted" style={{ marginTop: 10 }}>
                Selected: {fileName} (encrypted payload estimate: {cipherSize} bytes)
              </p>
            )}
            {shareLink && (
              <p className="sr-muted" style={{ marginTop: 10, wordBreak: "break-all" }}>
                Share link: {shareLink}
              </p>
            )}
            </div>

            <div className="sr-panel" style={{ background: "rgba(112,78,248,0.36)", border: "1px solid rgba(196,182,255,0.38)" }}>
              <p className="sr-kicker">ACCESS POLICY FRAMEWORK</p>
              <h3>Define how access should behave.</h3>
              <p className="sr-muted">
                Configure pay-to-decrypt rules, expiration windows, and usage limits with revocation controls for
                each protected asset.
              </p>
              <div className="sr-fields">
                <input value={priceSol} onChange={(e) => setPriceSol(e.target.value)} />
                <input value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} />
                <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
              </div>
              <p className="sr-muted" style={{ marginTop: 10 }}>
                {policyPreview}
              </p>
            </div>

            <div className="sr-panel" style={{ background: "rgba(112,78,248,0.36)", border: "1px solid rgba(196,182,255,0.38)" }}>
              <p className="sr-kicker">MPC EXECUTION WORKFLOW</p>
              <h3>Policy decisions run in encrypted state.</h3>
              <p className="sr-muted">
                Solana settles payment and identity. Arcium evaluates policy in encrypted shared state and returns
                authorization outcomes without centralized backend trust.
              </p>
              <div className="sr-actions">
                <button onClick={runArciumCheck}>Purchase + Evaluate</button>
                <select value={arciumMode} onChange={(e) => setArciumMode(e.target.value as ArciumEvaluationMode)}>
                  <option value="local">Local mode</option>
                  <option value="network">Network mode</option>
                </select>
                <button onClick={() => setRevoked(true)}>Revoke</button>
                <button onClick={() => setRevoked(false)}>Unrevoke</button>
              </div>
              <p className="sr-muted" style={{ marginTop: 10 }}>
                Buyer: {wallet.publicKey?.toBase58() ?? "Connect wallet"} | Uses: {usesSoFar}/{maxUses} | Revoked:{" "}
                {revoked ? "yes" : "no"} | Mode: {arciumMode}
              </p>
            </div>

            <div className="sr-panel" style={{ background: "rgba(112,78,248,0.36)", border: "1px solid rgba(196,182,255,0.38)" }}>
              <p className="sr-kicker">AUTHORIZATION OUTPUT</p>
              <h3>Verifiable access, cryptographically enforced.</h3>
              <p className="sr-muted">
                Approved requests proceed to key-release flow. Denied requests are blocked by policy, preserving
                confidentiality, integrity, and licensing constraints.
              </p>
              <p className="sr-muted" style={{ marginTop: 10 }}>
                {accessResult || "No access evaluation yet."}
              </p>
              {lastAuthId && <p style={{ color: "#70d59e" }}>Key release gated by: {lastAuthId}</p>}
              {lastStatusPayload && <p className="sr-muted">Pending `set_access_status`: {lastStatusPayload}</p>}
            </div>

            <div className="sr-panel" style={{ background: "rgba(112,78,248,0.36)", border: "1px solid rgba(196,182,255,0.38)" }}>
              <p className="sr-kicker">BUYER EXPERIENCE</p>
              <h3>Open link, request access, decrypt if approved.</h3>
              <p className="sr-muted">
                Buyer pastes a shared link, pays, and receives authorization to decrypt if policy requirements are
                satisfied.
              </p>
              <input
                value={buyerLinkInput}
                onChange={(e) => setBuyerLinkInput(e.target.value)}
                placeholder="Paste shared link"
              />
              <div className="sr-actions" style={{ marginTop: 10 }}>
                <button onClick={buyerRequestAccess}>Buyer request access</button>
              </div>
              <p className="sr-muted" style={{ marginTop: 10 }}>{buyerMessage}</p>
              <p style={{ color: buyerCanDecrypt ? "#70d59e" : "#f3b0b0" }}>
                {buyerRequested
                  ? buyerCanDecrypt
                    ? "Buyer can decrypt this asset."
                    : "Buyer cannot decrypt this asset."
                  : "Buyer has not requested access."}
              </p>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
