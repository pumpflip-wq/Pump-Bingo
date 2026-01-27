import { Buffer } from "buffer";
// @ts-ignore
window.Buffer = Buffer;
// @ts-ignore
globalThis.Buffer = Buffer;

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
