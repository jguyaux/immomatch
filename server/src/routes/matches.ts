import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { getMatches, getDiscoveries, getDiscoveriesCount, validateMatch, updateMatch, getFavorites } from "../controllers/matchesController.js";

const router = Router();

router.get("/", requireAuth, (req, res) => getMatches(req as AuthenticatedRequest, res));
router.get("/discoveries", requireAuth, (req, res) => getDiscoveries(req as AuthenticatedRequest, res));
router.get("/discoveries/count", requireAuth, (req, res) => getDiscoveriesCount(req as AuthenticatedRequest, res));
router.get("/favorites", requireAuth, (req, res) => getFavorites(req as AuthenticatedRequest, res));
router.post("/:id/validate", requireAuth, (req, res) => validateMatch(req as AuthenticatedRequest, res));
router.patch("/:id", requireAuth, (req, res) => updateMatch(req as AuthenticatedRequest, res));

export default router;
