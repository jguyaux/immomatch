import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { importProperty } from "../controllers/propertiesController.js";
import { runDailyScanWithProgress } from "../jobs/dailyScan.js";
import { getScanProgress, updateScanProgress } from "../services/scanProgress.js";

const router = Router();

router.post("/import", requireAuth, (req, res) => importProperty(req as AuthenticatedRequest, res));

router.get("/scan/progress", requireAuth, async (_req, res: Response) => {
  const progress = await getScanProgress();
  res.json(progress);
});

router.post("/scan", requireAuth, async (req, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const current = await getScanProgress();
  if (current.status === "running") {
    res.json({ status: "already_running" });
    return;
  }

  await updateScanProgress({ status: "running", step: 0, startedAt: Date.now(), imported: 0, matched: 0, source: "", message: "Démarrage du scan..." });
  res.json({ status: "started" });

  runDailyScanWithProgress((data) => {
    updateScanProgress({
      step: (data.step as number) ?? 0,
      total: (data.total as number) ?? 4,
      source: (data.source as string) ?? "",
      message: (data.message as string) ?? "",
    });
  }, authReq.userId).then((result) => {
    updateScanProgress({
      status: "done",
      step: 4,
      source: "",
      message: `Scan terminé — ${result.imported} biens importés, ${result.matched} matchs créés`,
      imported: result.imported,
      matched: result.matched,
    });
  }).catch((err) => {
    updateScanProgress({ status: "error", message: err instanceof Error ? err.message : "Erreur inconnue" });
  });
});

export default router;
