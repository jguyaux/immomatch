import { Response } from "express";
import { supabase } from "../config/supabase.js";
import { parseImmowebUrl } from "../services/immowebParser.js";
import { scoreProperty } from "../services/scoringService.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

export async function importProperty(req: AuthenticatedRequest, res: Response) {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "URL manquante" });
    return;
  }

  try {
    const parsed = await parseImmowebUrl(url);

    const { data: existing } = await supabase
      .from("properties")
      .select("id")
      .eq("external_id", parsed.externalId)
      .single();

    let propertyId: string;

    if (existing) {
      propertyId = existing.id;
    } else {
      const { data: inserted, error } = await supabase
        .from("properties")
        .insert({
          external_id: parsed.externalId,
          source: parsed.source,
          url: parsed.url,
          title: parsed.title,
          description: parsed.description,
          price: parsed.price,
          property_type: parsed.propertyType,
          bedrooms: parsed.bedrooms,
          bathrooms: parsed.bathrooms,
          surface: parsed.surface,
          land_surface: parsed.landSurface,
          peb_score: parsed.pebScore,
          address: parsed.address,
          zip_code: parsed.zipCode,
          city: parsed.city,
          province: parsed.province,
          image_urls: parsed.imageUrls,
          features: parsed.features,
          raw_data: parsed.rawData,
          scraped_at: parsed.scrapedAt,
        })
        .select("id")
        .single();

      if (error) {
        res.status(500).json({ error: "Erreur lors de la sauvegarde: " + error.message });
        return;
      }
      propertyId = inserted.id;
    }

    const { data: existingMatch } = await supabase
      .from("property_matches")
      .select("*")
      .eq("user_id", req.userId)
      .eq("property_id", propertyId)
      .single();

    if (existingMatch) {
      if (!existingMatch.is_validated) {
        await supabase
          .from("property_matches")
          .update({ is_validated: true })
          .eq("id", existingMatch.id);
        existingMatch.is_validated = true;
      }
      res.json({ property: parsed, match: existingMatch, alreadyScored: true });
      return;
    }

    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", req.userId)
      .single();

    let scoring = { score: 50, reasoning: "Import manuel", strengths: [] as string[], weaknesses: [] as string[] };

    if (prefs) {
      try {
        scoring = await scoreProperty(parsed, {
          id: prefs.id,
          userId: prefs.user_id,
          transactionType: prefs.transaction_type || "achat",
          budgetMin: prefs.budget_min,
          budgetMax: prefs.budget_max,
          zones: prefs.zones,
          propertyTypes: prefs.property_types,
          bedroomsMin: prefs.bedrooms_min,
          bedroomsMax: prefs.bedrooms_max,
          surfaceMin: prefs.surface_min,
          surfaceMax: prefs.surface_max,
          pebScores: prefs.peb_scores,
          features: prefs.features,
          dealBreakers: prefs.deal_breakers,
          notes: prefs.notes,
          createdAt: prefs.created_at,
          updatedAt: prefs.updated_at,
        });
      } catch (err) {
        console.error("[Import] Scoring echoue:", err);
      }
    }

    const { data: savedMatch } = await supabase
      .from("property_matches")
      .insert({
        user_id: req.userId,
        property_id: propertyId,
        score: scoring.score,
        reasoning: scoring.reasoning,
        strengths: scoring.strengths,
        weaknesses: scoring.weaknesses,
        is_validated: true,
      })
      .select()
      .single();

    res.json({ property: parsed, match: savedMatch, alreadyScored: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'import";
    res.status(400).json({ error: message });
  }
}
