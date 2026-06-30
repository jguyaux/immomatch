import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { importProperty } from "../controllers/propertiesController.js";
import { runDailyScanWithProgress } from "../jobs/dailyScan.js";

const router = Router();

router.post("/import", requireAuth, (req, res) => importProperty(req as AuthenticatedRequest, res));

router.get("/scan", requireAuth, async (req, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await runDailyScanWithProgress(send);
    send({ type: "done", ...result });
  } catch (err) {
    send({ type: "error", message: err instanceof Error ? err.message : "Erreur" });
  } finally {
    res.end();
  }
});

export default router;
