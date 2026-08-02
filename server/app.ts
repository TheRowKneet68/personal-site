import express from "express";
import { env } from "./config/env.js";
import { api } from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", true);

app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  const allowed =
    env.corsOrigins.length > 0
      ? env.corsOrigins.includes(req.headers.origin ?? "")
      : true;
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use("/api", api);

app.use(notFound);
app.use(errorHandler);
