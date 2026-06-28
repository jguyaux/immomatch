import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import preferencesRouter from "./routes/preferences.js";
import matchesRouter from "./routes/matches.js";
import { startDailyScanJob } from "./jobs/dailyScan.js";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/preferences", preferencesRouter);
app.use("/api/matches", matchesRouter);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`[Server] ImmoMatch API running on port ${env.port}`);
  startDailyScanJob();
});
