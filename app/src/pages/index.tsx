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
    <img src="/arcium-logo.png" alt="Arcium logo" style={{ width: 44, height: 44, borderRadius: 8 }} />
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-label="X">
      <path d="M18.244 2H21l-6.56 7.497L22.2 22h-6.07l-4.755-6.215L5.95 22H3.19l7.015-8.017L2 2h6.224l4.298 5.672L18.244 2Zm-2.13 18h1.68L7.31 3.895H5.51L16.114 20Z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-label="Discord">
      <path d="M20.317 4.369A19.791 19.791 0 0 0 15.395 3c-.213.387-.462.907-.633 1.317a18.27 18.27 0 0 0-5.524 0A13.64 13.64 0 0 0 8.605 3a19.736 19.736 0 0 0-4.922 1.369C.533 9.058-.32 13.632.099 18.144a19.9 19.9 0 0 0 6.036 3.047c.487-.665.922-1.369 1.293-2.11a12.94 12.94 0 0 1-2.033-.97c.171-.126.337-.259.498-.396 3.928 1.847 8.185 1.847 12.066 0 .161.137.327.27.498.396a12.94 12.94 0 0 1-2.033.97c.371.741.806 1.445 1.293 2.11a19.88 19.88 0 0 0 6.036-3.047c.502-5.231-.857-9.763-3.411-13.775ZM8.02 15.331c-1.188 0-2.165-1.089-2.165-2.426 0-1.337.955-2.426 2.165-2.426 1.215 0 2.187 1.095 2.165 2.426 0 1.337-.955 2.426-2.165 2.426Zm7.96 0c-1.188 0-2.165-1.089-2.165-2.426 0-1.337.955-2.426 2.165-2.426 1.215 0 2.187 1.095 2.165 2.426 0 1.337-.955 2.426-2.165 2.426Z" />
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
      <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 80% 10%, #6e49ff66 0%, #0b0b12 35%), #09090f", padding: 24, color: "#F2F0FF", fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}>
        <main style={{ maxWidth: 1040, margin: "0 auto" }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 14, border: "1px solid #7c66d055", background: "#161325cc", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ArciumMark />
              <div style={{ fontWeight: 700, letterSpacing: 1.2 }}>ARCIUM</div>
            </div>
            <WalletMultiButton />
          </header>

          <section style={{ borderRadius: 16, border: "1px solid #9c86ff66", background: "linear-gradient(135deg,#7b5cff66,#3f2b9f88)", padding: 22, marginBottom: 14 }}>
            <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.05 }}>StreamRights</h1>
            <p style={{ margin: "10px 0 14px", fontSize: 16, color: "#e6ddff" }}>
              Encrypted file access you can monetize and control.
            </p>
            <p style={{ margin: "0 0 14px", fontSize: 14, color: "#d8cff7", maxWidth: 760 }}>
              Publish encrypted files, define access rules, and enforce them with Solana + Arcium without relying on
              a trusted backend.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Pay-to-decrypt", "Time-bound access", "Revocable permissions", "Wallet-native identity"].map((pill) => (
                <span key={pill} style={{ border: "1px solid #b29cff80", padding: "6px 10px", borderRadius: 999, fontSize: 12, color: "#f0eaff", background: "#6f56e633" }}>
                  {pill}
                </span>
              ))}
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            <article style={{ border: "1px solid #7f67d755", background: "#18132bcc", borderRadius: 12, padding: 14 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, letterSpacing: 2, color: "#9075ff", fontWeight: 700 }}>WHAT IT IS</p>
              <h3 style={{ margin: "0 0 8px", fontSize: 22 }}>Encrypted storage with controlled distribution.</h3>
              <p style={{ margin: 0, color: "#d5cef3", fontSize: 14 }}>
                Files are encrypted before upload and can be shared through a single link while access stays policy-gated.
              </p>
              <div style={{ marginTop: 10 }}>
                <input type="file" onChange={onFilePicked} />
              </div>
              <div style={{ marginTop: 10 }}>
                <button onClick={generateShareLink}>Generate share link</button>
              </div>
              {fileName && <p style={{ marginTop: 10, color: "#d5cef3", fontSize: 13 }}>Selected: {fileName} ({cipherSize} bytes encrypted est.)</p>}
              {shareLink && <p style={{ marginTop: 10, color: "#d5cef3", fontSize: 13, wordBreak: "break-all" }}>Share link: {shareLink}</p>}
            </article>

            <article style={{ border: "1px solid #7f67d755", background: "#18132bcc", borderRadius: 12, padding: 14 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, letterSpacing: 2, color: "#9075ff", fontWeight: 700 }}>WHY IT MATTERS</p>
              <h3 style={{ margin: "0 0 8px", fontSize: 22 }}>Monetize private files without losing control.</h3>
              <p style={{ margin: 0, color: "#d5cef3", fontSize: 14 }}>
                Set payment, expiry, and usage limits to protect value and reduce leakage risk across every file.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input value={priceSol} onChange={(e) => setPriceSol(e.target.value)} />
                <input value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} />
                <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
              </div>
              <p style={{ marginTop: 10, color: "#d5cef3", fontSize: 13 }}>{policyPreview}</p>
            </article>

            <article style={{ border: "1px solid #7f67d755", background: "#18132bcc", borderRadius: 12, padding: 14 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, letterSpacing: 2, color: "#9075ff", fontWeight: 700 }}>WHY TRUST IT</p>
              <h3 style={{ margin: "0 0 8px", fontSize: 22 }}>Authorization follows cryptographic policy.</h3>
              <p style={{ margin: 0, color: "#d5cef3", fontSize: 14 }}>
                Solana handles payment and identity. Arcium-compatible policy flow evaluates access conditions before authorization.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button onClick={runArciumCheck}>Purchase + Evaluate</button>
                <select value={arciumMode} onChange={(e) => setArciumMode(e.target.value as ArciumEvaluationMode)}>
                  <option value="local">Local mode</option>
                  <option value="network">Network mode</option>
                </select>
                <button onClick={() => setRevoked(true)}>Revoke</button>
                <button onClick={() => setRevoked(false)}>Unrevoke</button>
              </div>
              <p style={{ marginTop: 10, color: "#d5cef3", fontSize: 13 }}>
                Buyer: {wallet.publicKey?.toBase58() ?? "Connect wallet"} | Uses: {usesSoFar}/{maxUses} | Revoked: {revoked ? "yes" : "no"} | Mode: {arciumMode}
              </p>
              <p style={{ marginTop: 10, color: "#d5cef3", fontSize: 13 }}>{accessResult || "No access evaluation yet."}</p>
              {lastAuthId && <p style={{ marginTop: 8, color: "#70d59e", fontSize: 13 }}>Key release gated by: {lastAuthId}</p>}
              {lastStatusPayload && <p style={{ marginTop: 8, color: "#d5cef3", fontSize: 12 }}>Pending set_access_status: {lastStatusPayload}</p>}
            </article>

            <article style={{ border: "1px solid #7f67d755", background: "#18132bcc", borderRadius: 12, padding: 14 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, letterSpacing: 2, color: "#9075ff", fontWeight: 700 }}>BUYER EXPERIENCE</p>
              <h3 style={{ margin: "0 0 8px", fontSize: 22 }}>Simple flow, clear access outcome.</h3>
              <p style={{ margin: 0, color: "#d5cef3", fontSize: 14 }}>
                Buyers open a shared link, request access, and get a clear decrypt decision based on policy.
              </p>
              <div style={{ marginTop: 10 }}>
                <input value={buyerLinkInput} onChange={(e) => setBuyerLinkInput(e.target.value)} placeholder="Paste shared link" />
              </div>
              <div style={{ marginTop: 10 }}>
                <button onClick={buyerRequestAccess}>Buyer request access</button>
              </div>
              <p style={{ marginTop: 10, color: "#d5cef3", fontSize: 13 }}>{buyerMessage}</p>
              <p style={{ marginTop: 8, color: buyerCanDecrypt ? "#70d59e" : "#f3b0b0", fontSize: 13 }}>
                {buyerRequested ? (buyerCanDecrypt ? "Buyer can decrypt this asset." : "Buyer cannot decrypt this asset.") : "Buyer has not requested access."}
              </p>
            </article>
          </section>

          <footer style={{ marginTop: 14, border: "1px solid #7f67d755", borderRadius: 12, background: "#161325cc", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <ArciumMark />
              <span style={{ fontWeight: 700, letterSpacing: 1 }}>ARCIUM</span>
              <a href="https://arcium.com" target="_blank" rel="noreferrer" style={{ color: "#dacfff", textDecoration: "none", fontSize: 13 }}>Arcium</a>
              <a href="https://docs.arcium.com" target="_blank" rel="noreferrer" style={{ color: "#dacfff", textDecoration: "none", fontSize: 13 }}>Docs</a>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <a href="https://x.com/arcium_hq" target="_blank" rel="noreferrer" style={{ color: "#dacfff" }}><XIcon /></a>
              <a href="https://discord.gg/arcium" target="_blank" rel="noreferrer" style={{ color: "#dacfff" }}><DiscordIcon /></a>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
