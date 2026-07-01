// Neighborhood Intelligence Service

export interface NeighborhoodInfo {
  stations: { name: string; distanceKm: number; drivingMinutes: number }[];
  highways: { label: string; access: string; distanceKm: number; drivingMinutes: number }[];
  schools: { name: string; type: string; distanceKm: number }[];
  floodRisk: "none" | "low" | "medium" | "high" | "unknown";
  priceEvolution5y: number | null;
  potentialScore: number | null;
  commune: string | null;
}

// ---------------------------------------------------------------------------
// Haversine distance (returns km)
// ---------------------------------------------------------------------------
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------------------------------------------------------------------------
// Driving time estimation (no routing API, pure formula)
// ---------------------------------------------------------------------------
function estimateDrivingMinutes(distanceKm: number): number {
  let minutes: number;
  if (distanceKm < 2) {
    minutes = distanceKm * 4;
  } else if (distanceKm < 8) {
    minutes = distanceKm * 2.5;
  } else if (distanceKm < 20) {
    minutes = distanceKm * 1.7;
  } else {
    minutes = distanceKm * 1.3;
  }
  return Math.round(minutes);
}

// ---------------------------------------------------------------------------
// Static Belgian train stations
// ---------------------------------------------------------------------------
const STATIONS: { name: string; lat: number; lng: number }[] = [
  { name: "Namur", lat: 50.4669, lng: 4.8628 },
  { name: "Gembloux", lat: 50.5609, lng: 4.6936 },
  { name: "Salzinnes", lat: 50.4538, lng: 4.8479 },
  { name: "Jambes", lat: 50.4646, lng: 4.8854 },
  { name: "Belgrade", lat: 50.4752, lng: 4.9012 },
  { name: "Champion", lat: 50.4889, lng: 4.8412 },
  { name: "Rhisnes", lat: 50.4939, lng: 4.8152 },
  { name: "Flawinne", lat: 50.4413, lng: 4.8183 },
  { name: "Bruxelles-Midi", lat: 50.8354, lng: 4.3353 },
  { name: "Bruxelles-Central", lat: 50.8453, lng: 4.3569 },
  { name: "Bruxelles-Nord", lat: 50.8600, lng: 4.3611 },
  { name: "Bruxelles-Luxembourg", lat: 50.8386, lng: 4.3648 },
  { name: "Ottignies", lat: 50.6680, lng: 4.5691 },
  { name: "Wavre", lat: 50.7162, lng: 4.5961 },
  { name: "Braine-l'Alleud", lat: 50.6813, lng: 4.3679 },
  { name: "Waterloo", lat: 50.7167, lng: 4.3908 },
  { name: "Court-Saint-Etienne", lat: 50.6332, lng: 4.5690 },
  { name: "Nivelles", lat: 50.5990, lng: 4.3212 },
  { name: "Louvain-la-Neuve-Université", lat: 50.6692, lng: 4.6167 },
  { name: "La Hulpe", lat: 50.7260, lng: 4.4877 },
  { name: "Rixensart", lat: 50.7038, lng: 4.5338 },
  { name: "Liège-Guillemins", lat: 50.6244, lng: 5.5663 },
  { name: "Charleroi-Central", lat: 50.4087, lng: 4.4456 },
  { name: "Mons", lat: 50.4541, lng: 3.9515 },
  { name: "Andenne", lat: 50.4884, lng: 5.0959 },
  { name: "Huy", lat: 50.5192, lng: 5.2378 },
  { name: "Dinant", lat: 50.2607, lng: 4.9095 },
  { name: "Ciney", lat: 50.2963, lng: 5.0946 },
  { name: "Marche-en-Famenne", lat: 50.2278, lng: 5.3437 },
  { name: "Namur-Est", lat: 50.4753, lng: 4.8985 },
];

// ---------------------------------------------------------------------------
// Static highway access points
// ---------------------------------------------------------------------------
interface HighwayAccess {
  label: string;
  access: string;
  lat: number;
  lng: number;
}

const HIGHWAY_ACCESSES: HighwayAccess[] = [
  { label: "E411", access: "Namur Nord", lat: 50.5026, lng: 4.8395 },
  { label: "E411", access: "Namur Sud / Lesves", lat: 50.4263, lng: 4.8629 },
  { label: "E411", access: "Rhisnes", lat: 50.4968, lng: 4.8076 },
  { label: "E411", access: "Profondeville", lat: 50.3782, lng: 4.8752 },
  { label: "E411", access: "Namur-Est", lat: 50.4792, lng: 4.9174 },
  { label: "E411", access: "Bruxelles Sud", lat: 50.7921, lng: 4.3576 },
  { label: "E411", access: "Arlon", lat: 49.6831, lng: 5.8297 },
  { label: "E40", access: "Liège Centre", lat: 50.6483, lng: 5.5631 },
  { label: "E40", access: "Leuven", lat: 50.8786, lng: 4.7023 },
  { label: "E40", access: "Bruxelles Est", lat: 50.8380, lng: 4.4278 },
  { label: "E40", access: "Gent", lat: 51.0553, lng: 3.7226 },
  { label: "E40", access: "Huy", lat: 50.5204, lng: 5.2457 },
  { label: "E42", access: "Namur", lat: 50.4732, lng: 4.8611 },
  { label: "E42", access: "Charleroi Ouest", lat: 50.4126, lng: 4.3961 },
  { label: "E42", access: "Mons Est", lat: 50.4601, lng: 3.9782 },
  { label: "E42", access: "Liège Ouest", lat: 50.6270, lng: 5.5154 },
  { label: "E42", access: "Gembloux", lat: 50.5541, lng: 4.7210 },
  { label: "E19", access: "Bruxelles Sud", lat: 50.8063, lng: 4.3297 },
  { label: "E19", access: "Mons", lat: 50.4541, lng: 3.9453 },
  { label: "E19", access: "Hal", lat: 50.7379, lng: 4.2341 },
];

// ---------------------------------------------------------------------------
// Price evolution static data (commune → % appreciation 2020-2025)
// ---------------------------------------------------------------------------
const PRICE_EVOLUTION: Record<string, number> = {
  // Namur province
  namur: 19,
  gembloux: 22,
  floreffe: 20,
  profondeville: 17,
  andenne: 16,
  eghezee: 18,
  ciney: 14,
  dinant: 15,
  rochefort: 13,
  "fosses-la-ville": 16,
  sambreville: 14,
  "jemeppe-sur-sambre": 15,
  mettet: 15,
  florennes: 14,
  // Brabant Wallon
  wavre: 28,
  ottignies: 30,
  "louvain-la-neuve": 30,
  waterloo: 22,
  "braine-l-alleud": 25,
  "court-saint-etienne": 24,
  nivelles: 21,
  genappe: 20,
  lasne: 23,
  "la hulpe": 26,
  rixensart: 25,
  rebecq: 19,
  tubize: 20,
  jodoigne: 17,
  perwez: 16,
  // Liège
  liege: 14,
  seraing: 12,
  herstal: 13,
  vise: 15,
  huy: 16,
  // Hainaut
  mons: 17,
  charleroi: 12,
  tournai: 14,
  mouscron: 13,
  // Brussels
  bruxelles: 18,
  ixelles: 20,
  "saint-gilles": 22,
  etterbeek: 19,
  forest: 21,
  anderlecht: 16,
  schaerbeek: 17,
  woluwe: 19,
};

// ---------------------------------------------------------------------------
// Commune normalization
// ---------------------------------------------------------------------------
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacritics
    .replace(/\s+/g, "-")
    .trim();
}

function lookupPriceEvolution(city?: string | null, zipCode?: string | null): number | null {
  if (city) {
    const key = normalizeName(city);
    if (PRICE_EVOLUTION[key] !== undefined) return PRICE_EVOLUTION[key];
    // Try partial match (e.g. "Ottignies-Louvain-la-Neuve" → "ottignies")
    for (const k of Object.keys(PRICE_EVOLUTION)) {
      if (key.startsWith(k) || k.startsWith(key)) {
        return PRICE_EVOLUTION[k];
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Schools via Overpass API
// ---------------------------------------------------------------------------
async function fetchSchools(lat: number, lng: number): Promise<{ name: string; type: string; distanceKm: number }[]> {
  const body = `[out:json][timeout:10];(node["amenity"="school"](around:5000,${lat},${lng});way["amenity"="school"](around:5000,${lat},${lng}););out center;`;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(body)}`,
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { elements: any[] };
    const schools = (json.elements || [])
      .map((el: any) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (!elLat || !elLng) return null;
        const name = el.tags?.name || "École";
        const iscedLevel = el.tags?.["isced:level"];
        let type = "école";
        if (iscedLevel === "1") type = "primaire";
        else if (iscedLevel === "2") type = "secondaire";
        const distanceKm = haversine(lat, lng, elLat, elLng);
        return { name, type, distanceKm };
      })
      .filter((s): s is { name: string; type: string; distanceKm: number } => s !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);
    return schools;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Flood zone via SPW Wallonie
// ---------------------------------------------------------------------------
async function fetchFloodRisk(lat: number, lng: number): Promise<"none" | "low" | "medium" | "high" | "unknown"> {
  try {
    const params = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "*",
      f: "json",
    });
    const url = `https://geoservices.wallonie.be/arcgis/rest/services/EAU/ZONES_INONDABLES/MapServer/0/query?${params.toString()}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return "unknown";
    const json = (await res.json()) as { features?: any[] };
    const features = json.features || [];
    if (features.length === 0) return "none";
    // Check risk field
    const attrs = features[0]?.attributes || {};
    const risque = (attrs["RISQUE"] || attrs["ALEA"] || "").toLowerCase();
    if (risque.includes("high") || risque.includes("eleve") || risque === "h") return "high";
    if (risque.includes("medium") || risque.includes("moyen") || risque === "m") return "medium";
    if (risque.includes("low") || risque.includes("faible") || risque === "l") return "low";
    // Features present but no recognizable risk field
    return "low";
  } catch {
    return "unknown";
  }
}

// ---------------------------------------------------------------------------
// Potential score (0-100)
// ---------------------------------------------------------------------------
function computePotentialScore(
  priceEvolution: number | null,
  stations: { distanceKm: number }[],
  highways: { distanceKm: number }[]
): number {
  const priceScore =
    priceEvolution != null ? Math.min((priceEvolution / 30) * 60, 60) : 30;

  const nearestStation = stations.length > 0 ? stations[0].distanceKm : Infinity;
  let stationScore = 0;
  if (nearestStation < 1) stationScore = 25;
  else if (nearestStation < 2) stationScore = 20;
  else if (nearestStation < 5) stationScore = 12;
  else if (nearestStation < 10) stationScore = 5;

  const nearestHighway = highways.length > 0 ? Math.min(...highways.map((h) => h.distanceKm)) : Infinity;
  let highwayScore = 0;
  if (nearestHighway < 5) highwayScore = 15;
  else if (nearestHighway < 10) highwayScore = 10;
  else if (nearestHighway < 20) highwayScore = 5;

  return Math.min(100, Math.round(priceScore + stationScore + highwayScore));
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export async function getNeighborhoodInfo(
  lat: number,
  lng: number,
  zipCode?: string | null,
  city?: string | null
): Promise<NeighborhoodInfo> {
  // --- Train stations: 3 nearest ---
  const stationsWithDist = STATIONS.map((s) => ({
    name: s.name,
    distanceKm: haversine(lat, lng, s.lat, s.lng),
  }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3)
    .map((s) => ({
      name: s.name,
      distanceKm: Math.round(s.distanceKm * 10) / 10,
      drivingMinutes: estimateDrivingMinutes(s.distanceKm),
    }));

  // --- Highways: nearest per label ---
  const highwayLabels = ["E40", "E411", "E42", "E19"];
  const highwaysResult = highwayLabels.map((label) => {
    const candidates = HIGHWAY_ACCESSES.filter((h) => h.label === label);
    const nearest = candidates
      .map((h) => ({ ...h, distanceKm: haversine(lat, lng, h.lat, h.lng) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)[0];
    return {
      label: nearest.label,
      access: nearest.access,
      distanceKm: Math.round(nearest.distanceKm * 10) / 10,
      drivingMinutes: estimateDrivingMinutes(nearest.distanceKm),
    };
  });

  // --- Price evolution ---
  const priceEvolution5y = lookupPriceEvolution(city, zipCode);
  const commune = city || null;

  // --- Schools + flood risk (parallel, failures tolerated) ---
  const [schoolsResult, floodResult] = await Promise.allSettled([
    fetchSchools(lat, lng),
    fetchFloodRisk(lat, lng),
  ]);

  const schools = schoolsResult.status === "fulfilled" ? schoolsResult.value : [];
  const floodRisk = floodResult.status === "fulfilled" ? floodResult.value : "unknown";

  // --- Potential score ---
  const potentialScore = computePotentialScore(priceEvolution5y, stationsWithDist, highwaysResult);

  return {
    stations: stationsWithDist,
    highways: highwaysResult,
    schools,
    floodRisk,
    priceEvolution5y,
    potentialScore,
    commune,
  };
}
