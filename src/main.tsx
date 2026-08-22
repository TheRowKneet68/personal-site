import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// A deploy between page-load and navigation orphans the old hashed chunk
// URLs (Vercel purges them) — sections then fail silently until a manual
// hard refresh. Reload once per session instead.
const CHUNK_FLAG = "rk-chunk-reload";
sessionStorage.removeItem(CHUNK_FLAG);
window.addEventListener("vite:preloadError", () => {
  if (!sessionStorage.getItem(CHUNK_FLAG)) {
    sessionStorage.setItem(CHUNK_FLAG, "1");
    window.location.reload();
  }
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("root element missing");

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
