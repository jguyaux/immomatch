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
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("property_matches")
    .select("*, properties(*)", { count: "exact" })
    .eq("user_id", req.userId)
    .or("is_validated.eq.false,is_validated.is.null")
    .or("is_dismissed.eq.false,is_dismissed.is.null")
    .gte("score", 50)
    .order("score", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({
    discoveries: (data || []).map(mapMatch),
    pagination: { page, limit, total: count },
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
    .or("is_validated.eq.false,is_validated.is.null")
    .or("is_dismissed.eq.false,is_dismissed.is.null")
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
