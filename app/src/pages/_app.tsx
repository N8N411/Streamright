import type { AppProps } from "next/app";
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { Inter, VT323 } from "next/font/google";

import "@solana/wallet-adapter-react-ui/styles.css";
import "../styles/globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body"
});

const displayFont = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display"
});

export default function App({ Component, pageProps }: AppProps) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const ConnectionProviderCompat = ConnectionProvider as any;
  const WalletProviderCompat = WalletProvider as any;
  const WalletModalProviderCompat = WalletModalProvider as any;

  return (
    <ConnectionProviderCompat endpoint={endpoint}>
      <WalletProviderCompat wallets={wallets} autoConnect>
        <WalletModalProviderCompat>
          <div className={`${bodyFont.variable} ${displayFont.variable}`}>
            <Component {...pageProps} />
          </div>
        </WalletModalProviderCompat>
      </WalletProviderCompat>
    </ConnectionProviderCompat>
  );
}
