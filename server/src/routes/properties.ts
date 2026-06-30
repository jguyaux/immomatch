import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { importProperty } from "../controllers/propertiesController.js";
import { runDailyScanWithProgress } from "../jobs/dailyScan.js";

const router = Router();

router.post("/import", requireAuth, (req, res) => importProperty(req as AuthenticatedRequest, res));

router.post("/scan", requireAuth, async (_req, res: Response) => {
  // Repondre immediatement et lancer le scan en arriere-plan
  res.json({ status: "started", message: "Scan lance en arriere-plan. Verifiez les Decouvertes dans quelques minutes." });

  // Fire and forget — ne pas attendre la fin
  runDailyScanWithProgress(() => {}).then((result) => {
    console.log(`[Scan] Termine: ${result.imported} importes, ${result.matched} matchs`);
  }).catch((err) => {
    console.error("[Scan] Erreur:", err);
  });
});

export default router;
