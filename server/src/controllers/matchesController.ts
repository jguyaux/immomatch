import { Response } from "express";
import { supabase } from "../config/supabase.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

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
    .range(offset, offset + limit - 1);

  if (sortBy === "score") {
    query = query.order("score", { ascending: false });
  } else if (sortBy === "price") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({
    matches: data,
    pagination: { page, limit, total: count },
  });
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
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ match: data });
}

export async function getFavorites(req: AuthenticatedRequest, res: Response) {
  const { data, error } = await supabase
    .from("property_matches")
    .select("*, properties(*)")
    .eq("user_id", req.userId)
    .eq("is_favorite", true)
    .order("score", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ favorites: data });
}
