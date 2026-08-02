import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, () => {
  console.log(`>> TheRowKneet API running on http://localhost:${env.port} (${env.isProduction ? "prod" : "dev"})`);
});
