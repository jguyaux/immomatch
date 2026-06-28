import { supabase } from "../config/supabase.js";
import { scoreProperty } from "./scoringService.js";
import type { Property, UserPreferences } from "../../../shared/types.js";

export async function processMatchesForUser(userId: string): Promise<number> {
  const preferences = await getUserPreferences(userId);
  if (!preferences) return 0;

  const newProperties = await getUnscoredProperties(userId);
  let matchCount = 0;

  for (const property of newProperties) {
    const result = await scoreProperty(property, preferences);

    const { error } = await supabase.from("property_matches").insert({
      user_id: userId,
      property_id: property.id,
      score: result.score,
      reasoning: result.reasoning,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
    });

    if (!error) matchCount++;
  }

  return matchCount;
}

export async function processMatchesForAllUsers(): Promise<void> {
  const { data: users } = await supabase
    .from("user_preferences")
    .select("user_id");

  if (!users) return;

  for (const { user_id } of users) {
    const count = await processMatchesForUser(user_id);
    console.log(`[Matching] ${count} nouveaux matchs pour user ${user_id}`);
  }
}

async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const { data } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    budgetMin: data.budget_min,
    budgetMax: data.budget_max,
    zones: data.zones,
    propertyTypes: data.property_types,
    bedroomsMin: data.bedrooms_min,
    bedroomsMax: data.bedrooms_max,
    surfaceMin: data.surface_min,
    surfaceMax: data.surface_max,
    pebScores: data.peb_scores,
    features: data.features,
    dealBreakers: data.deal_breakers,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function getUnscoredProperties(userId: string): Promise<Property[]> {
  const { data: scored } = await supabase
    .from("property_matches")
    .select("property_id")
    .eq("user_id", userId);

  const scoredIds = (scored || []).map((s) => s.property_id);

  let query = supabase.from("properties").select("*");
  if (scoredIds.length > 0) {
    query = query.not("id", "in", `(${scoredIds.join(",")})`);
  }

  const { data } = await query;
  if (!data) return [];

  return data.map((d) => ({
    id: d.id,
    externalId: d.external_id,
    source: d.source,
    url: d.url,
    title: d.title,
    description: d.description,
    price: d.price,
    propertyType: d.property_type,
    bedrooms: d.bedrooms,
    bathrooms: d.bathrooms,
    surface: d.surface,
    landSurface: d.land_surface,
    pebScore: d.peb_score,
    address: d.address,
    zipCode: d.zip_code,
    city: d.city,
    province: d.province,
    imageUrls: d.image_urls,
    features: d.features,
    rawData: d.raw_data,
    scrapedAt: d.scraped_at,
    createdAt: d.created_at,
  }));
}
