import { Response } from "express";
import { supabase } from "../config/supabase.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

function mapMatch(row: any) {
  const { properties, ...match } = row;
  return {
    id: match.id,
    userId: match.user_id,
    propertyId: match.property_id,
    score: match.score,
    reasoning: match.reasoning,
    strengths: match.strengths,
    weaknesses: match.weaknesses,
    isFavorite: match.is_favorite,
    isViewed: match.is_viewed,
    isDismissed: match.is_dismissed,
    isValidated: match.is_validated,
    createdAt: match.created_at,
    property: properties
      ? {
          id: properties.id,
          externalId: properties.external_id,
          source: properties.source,
          url: properties.url,
          title: properties.title,
          description: properties.description,
          price: properties.price,
          propertyType: properties.property_type,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          surface: properties.surface,
          landSurface: properties.land_surface,
          pebScore: properties.peb_score,
          address: properties.address,
          zipCode: properties.zip_code,
          city: properties.city,
          province: properties.province,
          latitude: properties.latitude,
          longitude: properties.longitude,
          imageUrls: properties.image_urls || [],
          features: properties.features || [],
          rawData: properties.raw_data,
          scrapedAt: properties.scraped_at,
          createdAt: properties.created_at,
        }
      : null,
  };
}

export async function getMatches(req: AuthenticatedRequest, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const sortBy = (req.query.sortBy as string) || "score";

  let query = supabase
    .from("property_matches")
    .select("*, properties(*)", { count: "exact" })
    .eq("user_id", req.userId)
    .eq("is_dismissed", false)
    .eq("is_validated", true)
    .range(offset, offset + limit - 1);

  if (sortBy === "score") {
    query = query.order("score", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({
    matches: (data || []).map(mapMatch),
    pagination: { page, limit, total: count },
  });
}

export async function getDiscoveries(req: AuthenticatedRequest, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const minScore = Math.max(50, Math.min(100, parseInt(req.query.minScore as string) || 50));

  // Récupérer tous les matchs en attente triés par score (pas de pagination DB —
  // on fait la pagination en mémoire après rééquilibrage par ville).
  const { data, error, count } = await supabase
    .from("property_matches")
    .select("*, properties(*)", { count: "exact" })
    .eq("user_id", req.userId)
    .not("is_validated", "eq", true)
    .not("is_dismissed", "eq", true)
    .gte("score", minScore)
    .order("score", { ascending: false })
    .limit(2000);

  if (error) {
    console.error("[getDiscoveries] Erreur Supabase:", error);
    res.status(500).json({ error: error.message });
    return;
  }

  const allMatches = (data || []).map(mapMatch);

  // Grouper par ville
  const byCity = new Map<string, typeof allMatches>();
  for (const match of allMatches) {
    const city = match.property?.city || "autre";
    if (!byCity.has(city)) byCity.set(city, []);
    byCity.get(city)!.push(match);
  }

  const cityQueues = [...byCity.values()];
  const numCities = cityQueues.length || 1;

  // Quota strict par ville par page : chaque ville contribue au max ceil(limit/numCities)
  // biens par page, quelle que soit sa taille en base.
  // Ex : 3 villes, limit=20 → 7 biens max par ville par page.
  const perCityPerPage = Math.ceil(limit / numCities);
  const cityOffset = (page - 1) * perCityPerPage;

  const pageItems: typeof allMatches = [];
  for (const queue of cityQueues) {
    pageItems.push(...queue.slice(cityOffset, cityOffset + perCityPerPage));
  }
  // Trier par score à l'intérieur de la page équilibrée
  pageItems.sort((a, b) => b.score - a.score);
  const discoveries = pageItems.slice(0, limit);

  console.log(`[getDiscoveries] user=${req.userId} count=${count} cities=${numCities} perCityPerPage=${perCityPerPage}`);
  res.json({
    discoveries,
    pagination: { page, limit, total: count || 0 },
  });
}

export async function validateMatch(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("property_matches")
    .update({ is_validated: true })
    .eq("id", id)
    .eq("user_id", req.userId)
    .select("*, properties(*)")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ match: mapMatch(data) });
}

export async function updateMatch(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("property_matches")
    .update({
      is_favorite: req.body.isFavorite,
      is_viewed: req.body.isViewed,
      is_dismissed: req.body.isDismissed,
    })
    .eq("id", id)
    .eq("user_id", req.userId)
    .select("*, properties(*)")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ match: mapMatch(data) });
}

export async function getDiscoveriesCount(req: AuthenticatedRequest, res: Response) {
  const { count, error } = await supabase
    .from("property_matches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", req.userId)
    .not("is_validated", "eq", true)
    .not("is_dismissed", "eq", true)
    .gte("score", 50);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ count: count || 0 });
}

export async function getFavorites(req: AuthenticatedRequest, res: Response) {
  const { data, error } = await supabase
    .from("property_matches")
    .select("*, properties(*)")
    .eq("user_id", req.userId)
    .eq("is_favorite", true)
    .eq("is_validated", true)
    .order("score", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ favorites: (data || []).map(mapMatch) });
}
