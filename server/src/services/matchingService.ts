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
    .not("is_validated", "eq", true)
    .not("is_dismissed", "eq", true);

  const newProperties = await getUnscoredProperties(userId, preferences);
  console.log(`[Matching] user=${userId} zones=${JSON.stringify(preferences.zones)} props=${newProperties.length}`);
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
      is_validated: false,
      is_dismissed: false,
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
  // Exclure les propriétés déjà validées ou dismissées manuellement par l'utilisateur.
  // Les matches en attente (pending) ont été supprimés avant cet appel — leurs propriétés
  // seront donc réévaluées avec les critères actuels.
  const { data: scored } = await supabase
    .from("property_matches")
    .select("property_id")
    .eq("user_id", userId)
    .or("is_validated.eq.true,is_dismissed.eq.true");

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
      // Matcher uniquement sur city et zipCode — pas sur address/url qui peuvent
      // contenir le nom d'une commune sans que le bien y soit situé (ex: "Route de Namur").
      const cityNorm = p.city ? normalize(p.city) : null;
      const textMatch = cityNorm
        ? normalizedZones.some((zone) =>
            cityNorm === zone || cityNorm.includes(zone) || zone.includes(cityNorm)
          )
        : false;
      if (textMatch) return true;

      if (p.zipCode) {
        const zip = parseInt(p.zipCode, 10);
        if (!isNaN(zip)) {
          return normalizedZones.some((zone) => zipInZoneRange(zip, zone));
        }
      }
      return false;
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
        // Rejeter seulement si explicitement sans jardin (ne pas rejeter si non mentionné)
        if (["pas de jardin", "sans jardin", "zonder tuin", "no garden", "geen tuin"].some((w) => text.includes(w))) return true;
        break;
      case "Pas de garage":
        // Rejeter seulement si explicitement sans garage
        if (["pas de garage", "sans garage", "zonder garage", "no garage", "geen garage"].some((w) => text.includes(w))) return true;
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

const ZONE_ZIP_RANGES: Record<string, [number, number][]> = {
  // Régions
  "bruxelles capitale":     [[1000, 1299]],
  "brabant wallon":         [[1300, 1499]],
  "province de namur":      [[5000, 5999]],
  "province de liege":      [[4000, 4999]],
  "province du hainaut":    [[6000, 7999]],
  "province du luxembourg": [[6600, 6999]],
  "brabant flamand":        [[1500, 3499]],
  "flandre orientale":      [[9000, 9999]],
  "flandre occidentale":    [[8000, 8999]],
  "province d anvers":      [[2000, 2999]],
  "province de limbourg":   [[3500, 3999]],
  // Communes bruxelloises (19 communes, ZIP individuels)
  "anderlecht":              [[1070, 1070]],
  "auderghem":               [[1160, 1160]],
  "berchem sainte agathe":   [[1082, 1082]],
  "bruxelles":               [[1000, 1099]],
  "etterbeek":               [[1040, 1040]],
  "evere":                   [[1140, 1140]],
  "forest":                  [[1190, 1190]],
  "ganshoren":               [[1083, 1083]],
  "ixelles":                 [[1050, 1050]],
  "jette":                   [[1090, 1090]],
  "koekelberg":              [[1081, 1081]],
  "molenbeek saint jean":    [[1080, 1080]],
  "saint gilles":            [[1060, 1060]],
  "saint josse ten noode":   [[1210, 1210]],
  "schaerbeek":              [[1030, 1030]],
  "uccle":                   [[1180, 1180]],
  "watermael boitsfort":     [[1170, 1170]],
  "woluwe saint lambert":    [[1200, 1200]],
  "woluwe saint pierre":     [[1150, 1150]],
  // Brabant Wallon
  "braine l alleud":         [[1420, 1429]],
  "braine le chateau":       [[1440, 1440]],
  "chaumont gistoux":        [[1325, 1325]],
  "court saint etienne":     [[1490, 1490]],
  "chastre":                 [[1450, 1450]],
  "genappe":                 [[1470, 1479]],
  "grez doiceau":            [[1390, 1390]],
  "incourt":                 [[1315, 1315]],
  "jodoigne":                [[1370, 1370]],
  "lasne":                   [[1380, 1380]],
  "mont saint guibert":      [[1435, 1435]],
  "nivelles":                [[1400, 1419]],
  "ottignies":               [[1340, 1349]],
  "ottignies louvain la neuve": [[1340, 1349]],
  "louvain la neuve":        [[1348, 1348]],
  "perwez":                  [[1360, 1360]],
  "ramillies":               [[1367, 1367]],
  "rebecq":                  [[1430, 1430]],
  "rixensart":               [[1330, 1339]],
  "tubize":                  [[1480, 1489]],
  "villers la ville":        [[1495, 1495]],
  "wavre":                   [[1300, 1329]],
  "waterloo":                [[1410, 1410]],
  // Province de Namur
  namur:                     [[5000, 5024]],
  jambes:                    [[5100, 5100]],
  wepion:                    [[5100, 5100]],
  andenne:                   [[5300, 5330]],
  gembloux:                  [[5030, 5032]],
  profondeville:             [[5170, 5170]],
  dinant:                    [[5500, 5540]],
  // Reste
  mons:               [[7000, 7099]],
  liege:              [[4000, 4199]],
  charleroi:          [[6000, 6199]],
  louvain:            [[3000, 3099]],
  leuven:             [[3000, 3099]],
  gent:               [[9000, 9099]],
  antwerpen:          [[2000, 2199]],
  arlon:              [[6700, 6799]],
  tournai:            [[7500, 7599]],
  verviers:           [[4800, 4899]],
};

function zipInZoneRange(zip: number, normalizedZone: string): boolean {
  for (const [key, ranges] of Object.entries(ZONE_ZIP_RANGES)) {
    const keyNorm = normalize(key);
    if (keyNorm === normalizedZone || keyNorm.includes(normalizedZone) || normalizedZone.includes(keyNorm)) {
      if (ranges.some(([min, max]) => zip >= min && zip <= max)) return true;
    }
  }
  return false;
}
