import { Response } from "express";
import { supabase } from "../config/supabase.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

export async function getPreferences(req: AuthenticatedRequest, res: Response) {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", req.userId)
    .single();

  if (error && error.code !== "PGRST116") {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ preferences: data });
}

export async function upsertPreferences(req: AuthenticatedRequest, res: Response) {
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: req.userId,
        transaction_type: req.body.transactionType,
        budget_min: req.body.budgetMin,
        budget_max: req.body.budgetMax,
        zones: req.body.zones,
        property_types: req.body.propertyTypes,
        bedrooms_min: req.body.bedroomsMin,
        bedrooms_max: req.body.bedroomsMax,
        surface_min: req.body.surfaceMin,
        surface_max: req.body.surfaceMax,
        peb_scores: req.body.pebScores,
        features: req.body.features,
        deal_breakers: req.body.dealBreakers,
        notes: req.body.notes,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Supprimer (pas dismisser) les matches en attente — ils seront réévalués au prochain scan
  // avec les nouveaux critères. Les dismisses manuels (is_dismissed=true) restent exclus.
  await supabase
    .from("property_matches")
    .delete()
    .eq("user_id", req.userId)
    .eq("is_validated", false)
    .eq("is_dismissed", false);

  res.json({ preferences: data });
}
