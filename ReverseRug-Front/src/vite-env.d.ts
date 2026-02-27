/// <reference types="vite/client" />

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '@solana/wallet-adapter-react-ui/styles.css' {
  const content: any;
  export default content;
}
