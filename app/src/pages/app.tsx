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
  return <img src="/arcium-logo.png" alt="Arcium logo" className="h-11 w-11 rounded-lg" />;
}

export default function AppDashboard() {
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

  // Buyer flow
  const [shareLink, setShareLink] = useState("");
  const [buyerLinkInput, setBuyerLinkInput] = useState("");
  const [buyerRequested, setBuyerRequested] = useState(false);
  const [buyerCanDecrypt, setBuyerCanDecrypt] = useState(false);
  const [buyerMessage, setBuyerMessage] = useState("");

  const policyPreview = useMemo(() => `Pay ${priceSol} SOL, expires in ${expiresInDays} day(s), max ${maxUses} decryptions`, [priceSol, expiresInDays, maxUses]);

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
        setAccessResult(`Approved (${arciumMode}): authorization ${result.authorizationId} (nonce ${requestNonce})`);
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
        <title>StreamRights Dashboard</title>
      </Head>
      <div className="sr-shell">
        <div className="sr-eclipse-glow" />
        <main className="sr-content">
          <header className="sr-card mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ArciumMark />
              <div className="flex flex-col">
                <div className="sr-led text-2xl">StreamRights</div>
                <div className="text-xs text-[#d8cff7]">Solana + Arcium access control</div>
              </div>
            </div>
            <WalletMultiButton />
          </header>

          <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <article className="sr-card">
              <p className="sr-led mb-1 text-lg text-arcium-purple">Encrypt</p>
              <h3 className="sr-led m-0 text-3xl">Choose a file</h3>
              <p className="mt-2 text-sm text-[#d5cef3]">Encrypt first. Generate a share link after upload.</p>

              <div className="mt-3">
                <input type="file" onChange={onFilePicked} className="sr-input" />
              </div>

              <div className="mt-3">
                <button onClick={generateShareLink} className="sr-btn-primary">
                  Generate share link
                </button>
              </div>

              {fileName && <p className="mt-3 text-sm text-[#d5cef3]">Selected: {fileName}</p>}
              {fileName && <p className="mt-1 text-xs text-[#d5cef3]">Ciphertext est.: {cipherSize} bytes</p>}
              {shareLink && <p className="mt-3 break-all text-sm text-[#d5cef3]">Share link: {shareLink}</p>}
            </article>

            <article className="sr-card">
              <p className="sr-led mb-1 text-lg text-arcium-purple">Set policy</p>
              <h3 className="sr-led m-0 text-3xl">Define access rules</h3>
              <p className="mt-2 text-sm text-[#d5cef3]">Price, expiry, and usage limits for each asset.</p>

              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                <input className="sr-input" value={priceSol} onChange={(e) => setPriceSol(e.target.value)} placeholder="Price (SOL)" />
                <input className="sr-input" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} placeholder="Expiry (days)" />
                <input className="sr-input" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Max uses" />
              </div>
              <p className="mt-3 text-sm text-[#d5cef3]">{policyPreview}</p>
            </article>

            <article className="sr-card">
              <p className="sr-led mb-1 text-lg text-arcium-purple">Execution</p>
              <h3 className="sr-led m-0 text-3xl">Purchase + evaluate</h3>
              <p className="mt-2 text-sm text-[#d5cef3]">Run the policy and receive an authorization outcome.</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={runArciumCheck} className="sr-btn-primary">
                  Purchase + Evaluate
                </button>
                <select className="sr-input w-auto min-w-[130px]" value={arciumMode} onChange={(e) => setArciumMode(e.target.value as ArciumEvaluationMode)}>
                  <option value="local">Local mode</option>
                  <option value="network">Network mode</option>
                </select>
                <button onClick={() => setRevoked(true)} className="sr-btn-secondary">
                  Revoke
                </button>
                <button onClick={() => setRevoked(false)} className="sr-btn-secondary">
                  Unrevoke
                </button>
              </div>

              <p className="mt-3 text-sm text-[#d5cef3]">
                Buyer: {wallet.publicKey?.toBase58() ?? "Connect wallet"} | Uses: {usesSoFar}/{maxUses} | Revoked: {revoked ? "yes" : "no"} | Mode: {arciumMode}
              </p>
              <p className="mt-3 text-sm text-[#d5cef3]">{accessResult || "No access evaluation yet."}</p>
              {lastAuthId && <p className="mt-2 text-sm text-[#70d59e]">Key release gated by: {lastAuthId}</p>}
              {lastStatusPayload && <p className="mt-1 text-xs text-[#d5cef3]">Pending set_access_status: {lastStatusPayload}</p>}
            </article>

            <article className="sr-card">
              <p className="sr-led mb-1 text-lg text-arcium-purple">Buyer</p>
              <h3 className="sr-led m-0 text-3xl">Request and decrypt</h3>
              <p className="mt-2 text-sm text-[#d5cef3]">Paste a share link, request access, and check decrypt eligibility.</p>

              <div className="mt-3">
                <input className="sr-input" value={buyerLinkInput} onChange={(e) => setBuyerLinkInput(e.target.value)} placeholder="Paste shared link" />
              </div>

              <div className="mt-3">
                <button onClick={buyerRequestAccess} className="sr-btn-primary">
                  Buyer request access
                </button>
              </div>

              {buyerRequested && (
                <>
                  {buyerMessage && <p className="mt-3 text-sm text-[#d5cef3]">{buyerMessage}</p>}
                  <p className={`mt-2 text-sm ${buyerCanDecrypt ? "text-[#70d59e]" : "text-[#f3b0b0]"}`}>
                    {buyerCanDecrypt ? "Buyer can decrypt this asset." : "Buyer cannot decrypt this asset."}
                  </p>
                </>
              )}
            </article>
          </section>
        </main>
      </div>
    </>
  );
}

