import Head from "next/head";
import Link from "next/link";

function ArciumMark() {
  return <img src="/arcium-logo.png" alt="Arcium logo" style={{ width: 44, height: 44, borderRadius: 8 }} />;
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

function StepIcon({ kind }: { kind: "encrypt" | "policy" | "share" }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
  if (kind === "encrypt") {
    return (
      <svg {...common} aria-label="Encrypt">
        <path d="M7 10V8a5 5 0 0 1 10 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6.5 10.2h11c.7 0 1.3.6 1.3 1.3v8.2c0 .7-.6 1.3-1.3 1.3h-11c-.7 0-1.3-.6-1.3-1.3v-8.2c0-.7.6-1.3 1.3-1.3Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 14v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "policy") {
    return (
      <svg {...common} aria-label="Set policy">
        <path d="M8 6h8l2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 6v2h2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-label="Share link">
      <path d="M10 14a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 10a5 5 0 0 0-7.07 0L5.52 11.4a5 5 0 0 0 7.07 7.07L14 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 12h.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>StreamRights</title>
      </Head>
      <div className="sr-shell">
        <div className="sr-eclipse-glow" />
        <main className="sr-content">
          <section className="sr-card mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ArciumMark />
                <div className="sr-led text-2xl">ARCIUM</div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/app"
                  className="sr-btn-primary inline-flex items-center justify-center no-underline"
                >
                  Launch App
                </Link>
                <a href="#how-it-works" className="text-sm font-medium text-[#dacfff] no-underline">
                  How it works
                </a>
              </div>
            </div>

            <div className="mt-4">
              <h1 className="sr-led m-0 text-5xl leading-[0.95] md:text-6xl">Sell your files. Keep the keys.</h1>
              <p className="mt-3 max-w-[760px] text-base text-[#e6ddff]">
                Encrypted storage with policy-gated access on Solana.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {["Pay-to-decrypt", "Time-bound access", "Revocable permissions", "Wallet-native identity"].map((pill) => (
                <span key={pill} className="sr-pill">
                  {pill}
                </span>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <article className="sr-card">
              <h3 className="sr-led m-0 text-2xl">Encrypted by default</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#d5cef3]">
                Files are encrypted before upload. You control distribution.
              </p>
            </article>

            <article className="sr-card">
              <h3 className="sr-led m-0 text-2xl">Monetize without leaking</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#d5cef3]">
                Set price, expiry, and usage limits per file.
              </p>
            </article>

            <article className="sr-card">
              <h3 className="sr-led m-0 text-2xl">Cryptographic trust</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#d5cef3]">
                Solana handles payment. Arcium evaluates access policy.
              </p>
            </article>
          </section>

          <section id="how-it-works" className="sr-card mt-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="sr-led text-xl text-arcium-purple">How it works</div>
                <h2 className="sr-led mt-2 text-3xl">From encryption to authorized access</h2>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              {[
                { kind: "encrypt" as const, title: "Encrypt Files", line: "Encrypt locally, then publish ciphertext." },
                { kind: "policy" as const, title: "Set Policy", line: "Define price, expiry, and max unlocks." },
                { kind: "share" as const, title: "Share Link", line: "Buyers request access through one link." }
              ].map((step) => (
                <div key={step.title} className="sr-card min-w-[240px] flex-1">
                  <div className="flex items-center gap-3">
                    <div className="text-arcium-purple">
                      <StepIcon kind={step.kind} />
                    </div>
                    <div className="sr-led text-xl">{step.title}</div>
                  </div>
                  <div className="mt-2 text-sm leading-relaxed text-[#d5cef3]">{step.line}</div>
                </div>
              ))}
            </div>
          </section>

          <footer className="sr-card mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <ArciumMark />
              <div className="sr-led text-xl">Built on Arcium + Solana</div>
            </div>

            <div className="flex items-center gap-4">
              <a href="https://github.com/N8N411/Streamright" target="_blank" rel="noreferrer" className="sr-led text-lg text-[#dacfff] no-underline">
                GitHub
              </a>
              <div className="flex gap-3">
                <a href="https://x.com/arcium_hq" target="_blank" rel="noreferrer" className="text-[#dacfff]">
                  <XIcon />
                </a>
                <a href="https://discord.gg/arcium" target="_blank" rel="noreferrer" className="text-[#dacfff]">
                  <DiscordIcon />
                </a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
