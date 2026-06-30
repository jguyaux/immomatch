import { supabase } from "../config/supabase.js";
import { scoreProperty } from "./scoringService.js";
import type { Property, UserPreferences } from "../../../shared/types.js";

const MIN_SCORE_TO_SHOW = 50;

export async function processMatchesForUser(userId: string): Promise<number> {
  const preferences = await getUserPreferences(userId);
  if (!preferences) return 0;

  // Rafraichir les decouvertes : on efface les propositions en attente
  // (ni validees ni masquees) pour les re-evaluer avec les criteres actuels.
  await supabase
    .from("property_matches")
    .delete()
    .eq("user_id", userId)
    .eq("is_validated", false)
    .eq("is_dismissed", false);

  const newProperties = await getUnscoredProperties(userId, preferences);
  let matchCount = 0;

  for (const property of newProperties) {
    const result = await scoreProperty(property, preferences);

    if (result.score < MIN_SCORE_TO_SHOW) continue;

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

export async function processMatchesForAllUsers(): Promise<number> {
  const { data: users } = await supabase
    .from("user_preferences")
    .select("user_id");

  if (!users) return 0;

  let totalMatches = 0;
  for (const { user_id } of users) {
    const count = await processMatchesForUser(user_id);
    console.log(`[Matching] ${count} nouveaux matchs pour user ${user_id}`);
    totalMatches += count;
  }
  return totalMatches;
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
    transactionType: data.transaction_type || "achat",
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

async function getUnscoredProperties(userId: string, prefs: UserPreferences): Promise<Property[]> {
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

  const allProperties = data.map((d) => ({
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
  })) as Property[];

  const excludedTypes = ["terrain", "immeuble"];
  const excludedTitleWords = [
    "parking", "garage", "commerce", "commercial", "bureau", "bureaux",
    "entrepot", "industriel", "industrie", "hotel", "restaurant",
    "magasin", "atelier", "hangar", "box", "cave",
    "rez commercial", "rez-de-chaussee commercial", "surface commerciale",
  ];

  const rentalKeywords = ["a louer", "à louer", "te huur", "for rent", "loyer"];
  const saleKeywords = ["a vendre", "à vendre", "te koop", "for sale"];

  const budgetTolerance = 0.1; // 10% au-dessus du max accepte

  let filtered = allProperties.filter((p) => {
    if (excludedTypes.includes(p.propertyType)) return false;
    const text = `${p.title || ""} ${p.description || ""} ${p.url || ""}`.toLowerCase();
    if (excludedTitleWords.some((w) => text.includes(w))) return false;
    if (prefs.propertyTypes.length > 0 && !prefs.propertyTypes.includes(p.propertyType)) return false;

    if (p.price > 0 && p.price > prefs.budgetMax * (1 + budgetTolerance)) return false;

    if (prefs.transactionType === "achat") {
      if (rentalKeywords.some((w) => text.includes(w))) return false;
    } else if (prefs.transactionType === "location") {
      if (saleKeywords.some((w) => text.includes(w)) && !rentalKeywords.some((w) => text.includes(w))) return false;
    }

    if (violatesDealBreaker(p, prefs.dealBreakers, text)) return false;

    return true;
  });

  if (prefs.zones.length > 0) {
    const normalizedZones = prefs.zones.map((z) => normalize(z));
    filtered = filtered.filter((p) => {
      const searchFields = [p.city, p.address, p.zipCode, p.url]
        .filter(Boolean)
        .map((s) => normalize(s!));
      return normalizedZones.some((zone) =>
        searchFields.some((f) => f === zone || f.includes(zone) || zone.includes(f))
      );
    });
  }

  return filtered;
}

function violatesDealBreaker(p: Property, dealBreakers: string[], rawText: string): boolean {
  const text = normalize(rawText);

  for (const breaker of dealBreakers) {
    switch (breaker) {
      case "PEB F ou G":
        if (p.pebScore === "F" || p.pebScore === "G") return true;
        break;
      case "Pas de jardin":
        if (!text.includes("jardin") && !p.features.some((f) => normalize(f).includes("jardin"))) return true;
        break;
      case "Pas de garage":
        if (!text.includes("garage") && !p.features.some((f) => normalize(f).includes("garage"))) return true;
        break;
      case "Travaux importants":
        if (["a renover", "travaux importants", "gros travaux", "a rafraichir entierement"].some((w) => text.includes(normalize(w)))) return true;
        break;
      case "Zone inondable":
        if (["zone inondable", "risque d'inondation", "zone d'alea"].some((w) => text.includes(normalize(w)))) return true;
        break;
      case "Proximite autoroute":
        if (["proximite autoroute", "bord d'autoroute", "pres de l'autoroute"].some((w) => text.includes(normalize(w)))) return true;
        break;
      case "Toiture a refaire":
        if (["toiture a refaire", "toiture a renover", "toit a refaire"].some((w) => text.includes(normalize(w)))) return true;
        break;
      case "Problemes d'humidite":
        if (["probleme d'humidite", "humidite presente", "remontees capillaires", "traces d'humidite"].some((w) => text.includes(normalize(w)))) return true;
        break;
    }
  }
  return false;
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/-/g, " ")
    .trim();
}
