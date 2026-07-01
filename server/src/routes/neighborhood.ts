import { Router, Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import { getNeighborhoodInfo } from "../services/neighborhoodService.js";

const router = Router();

router.get("/neighborhood/:propertyId", async (req: Request, res: Response): Promise<void> => {
  const { propertyId } = req.params;

  const { data: property, error } = await supabase
    .from("properties")
    .select("id, latitude, longitude, zip_code, city")
    .eq("id", propertyId)
    .single();

  if (error || !property) {
    res.status(404).json({ error: "Bien non trouvé" });
    return;
  }

  if (!property.latitude || !property.longitude) {
    res.status(400).json({ error: "Coordonnées GPS manquantes" });
    return;
  }

  try {
    const info = await getNeighborhoodInfo(
      property.latitude,
      property.longitude,
      property.zip_code,
      property.city
    );
    res.json(info);
  } catch (err) {
    console.error("[neighborhood] Error computing neighborhood info:", err);
    res.status(500).json({ error: "Erreur lors du calcul des données du quartier" });
  }
});

export default router;
