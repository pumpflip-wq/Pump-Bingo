import { Buffer } from "buffer";
// @ts-ignore
window.Buffer = Buffer;
// @ts-ignore
globalThis.Buffer = Buffer;

import "./index.css";

// Use dynamic import to ensure Buffer polyfill is set up before Solana libraries load
async function bootstrap() {
  const { createRoot } = await import("react-dom/client");
  const { default: App } = await import("./App");
  
  const container = document.getElementById("root");
  if (container) {
    const root = createRoot(container);
    root.render(<App />);
  }
}

bootstrap();
