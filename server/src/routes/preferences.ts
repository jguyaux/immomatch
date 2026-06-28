import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { getPreferences, upsertPreferences } from "../controllers/preferencesController.js";

const router = Router();

router.get("/", requireAuth, (req, res) => getPreferences(req as AuthenticatedRequest, res));
router.put("/", requireAuth, (req, res) => upsertPreferences(req as AuthenticatedRequest, res));

export default router;
