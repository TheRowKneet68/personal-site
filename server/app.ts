import express from "express";
import { env } from "./config/env.js";
import { api } from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export const app = express();

app.disable("x-powered-by");
// Trust X-Forwarded-* ONLY behind Vercel, whose edge overwrites those headers.
// Self-hosted/bare they are attacker-controlled and would let clients rotate
// their "IP" to dodge rate limits and brute-force lockouts.
app.set("trust proxy", env.isVercel);

app.use("/api/admin/upload", express.json({ limit: "10mb" }));
app.use(express.json({ limit: "2mb" }));

// ---- Security headers (hosting-independent: Vercel + self-hosted) ----
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (env.isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // 'unsafe-inline' scripts: the tiny theme-boot script in index.html runs before the bundle.
      "script-src 'self' 'unsafe-inline'",
      // 'unsafe-inline' styles: framer-motion sets element style attributes at runtime.
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https:",
      "font-src 'self'",
      "connect-src 'self'",
      // Instagram reel embeds in the Featured In section.
      "frame-src 'self' https://www.instagram.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  );
  next();
});

// ---- CORS: deny by default, echo an origin only when it's explicitly allowlisted.
// Same-origin requests (the Vercel deployment) never send an Origin we reject.
app.use((req, res, next) => {
  const origin = req.headers.origin ?? "";
  if (origin && env.corsOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.sendStatus(204);
    return;
  }
  next();
});

app.use("/api", api);

app.use(notFound);
app.use(errorHandler);
