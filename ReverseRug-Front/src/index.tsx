import "./polyfills";
import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TrustWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { App } from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import "@solana/wallet-adapter-react-ui/styles.css";
import { Buffer } from "buffer";

// Polyfill Buffer for browser
(window as any).Buffer = Buffer;

console.log('🚀 ReverseRug Frontend - Loading...');

function Root() {
  console.log('🔧 Root component rendering...');
  
  // Use a reliable RPC endpoint
  const endpoint = useMemo(
    () => "https://api.devnet.solana.com",
    []
  );
  
  // Explicit wallet list so modal shows multiple options
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network: WalletAdapterNetwork.Devnet }),
      new TrustWalletAdapter(),
    ],
    []
  );

  console.log('✅ Wallet configuration initialized (explicit adapters)');

  return (
    <ErrorBoundary>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={false}>
          <WalletModalProvider>
            <App />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ErrorBoundary>
  );
}

console.log('📦 Creating React root...');
const rootElement = document.getElementById("app");
console.log('🎯 Root element:', rootElement);

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>,
  );
  console.log('✨ React app mounted!');
} else {
  console.error('❌ Root element #app not found!');
}
