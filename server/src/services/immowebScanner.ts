import { supabase } from "../config/supabase.js";
import { parseImmowebUrl } from "./immowebParser.js";
import type { Property } from "../../../shared/types.js";

const BATCH_SIZE = 10;
const MAX_PAGES = 10;

function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

const TRANSACTION_MAP: Record<string, string> = {
  achat: "a-vendre",
  location: "a-louer",
};

const TYPE_MAP: Record<string, string> = {
  maison: "maison",
  appartement: "appartement",
  studio: "appartement",
  duplex: "appartement",
  villa: "villa",
};

// Regions belges — slug Immoweb + plages ZIP
const BELGIAN_REGIONS: Record<string, { slug: string; zips: [number, number][] }> = {
  "bruxelles capitale":    { slug: "bruxelles-capitale",    zips: [[1000, 1299]] },
  "brabant wallon":        { slug: "brabant-wallon",        zips: [[1300, 1499]] },
  "province de namur":     { slug: "province-de-namur",     zips: [[5000, 5999]] },
  "province de liege":     { slug: "province-de-liege",     zips: [[4000, 4999]] },
  "province du hainaut":   { slug: "province-du-hainaut",   zips: [[6000, 7999]] },
  "province du luxembourg":{ slug: "province-du-luxembourg",zips: [[6600, 6999]] },
  "brabant flamand":       { slug: "brabant-flamand",       zips: [[1500, 3499]] },
  "flandre orientale":     { slug: "flandre-orientale",     zips: [[9000, 9999]] },
  "flandre occidentale":   { slug: "flandre-occidentale",   zips: [[8000, 8999]] },
  "province d anvers":     { slug: "province-d-anvers",     zips: [[2000, 2999]] },
  "province de limbourg":  { slug: "province-de-limbourg",  zips: [[3500, 3999]] },
};

function getRegion(zone: string): { slug: string; zips: [number, number][] } | null {
  const key = normalize(zone);
  for (const [k, v] of Object.entries(BELGIAN_REGIONS)) {
    if (key === normalize(k)) return v;
  }
  return null;
}

// Postal code ranges [min, max] for Belgian cities/communes
const ZONE_ZIP_RANGES: Record<string, [number, number][]> = {
  namur: [[5000, 5024], [5100, 5110]],
  bruxelles: [[1000, 1099]],
  "mont saint guibert": [[1435, 1435]],
  mons: [[7000, 7099]],
  liege: [[4000, 4199]],
  charleroi: [[6000, 6199]],
  wavre: [[1300, 1399]],
  louvain: [[3000, 3099]],
  leuven: [[3000, 3099]],
  gent: [[9000, 9099]],
  antwerpen: [[2000, 2199]],
  ottignies: [[1340, 1349]],
  "louvain la neuve": [[1348, 1348]],
  nivelles: [[1400, 1499]],
  waterloo: [[1410, 1410]],
  arlon: [[6700, 6799]],
  tournai: [[7500, 7599]],
  verviers: [[4800, 4899]],
};

function normalize(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/-/g, " ").trim();
}

function getZipRanges(zone: string): [number, number][] {
  const region = getRegion(zone);
  if (region) return region.zips;
  const key = normalize(zone);
  for (const [k, v] of Object.entries(ZONE_ZIP_RANGES)) {
    if (key === k || key.includes(k) || k.includes(key)) return v;
  }
  return [];
}

function urlMatchesZone(url: string, zones: string[]): boolean {
  const zipMatch = url.match(/\/(\d{4})\//);
  if (!zipMatch) return true;
  const zip = parseInt(zipMatch[1], 10);

  for (const zone of zones) {
    const ranges = getZipRanges(zone);
    if (ranges.length === 0) {
      const zoneNorm = zone.toLowerCase().replace(/\s+/g, "-");
      if (url.toLowerCase().includes(zoneNorm)) return true;
    } else {
      if (ranges.some(([min, max]) => zip >= min && zip <= max)) return true;
    }
  }
  return false;
}

const MAX_NEW_URLS = 60;

export async function scanImmoweb(
  zones: string[],
  transactionType: string = "achat",
  propertyTypes: string[] = []
): Promise<Property[]> {
  console.log("[Immoweb] Demarrage du scan...");

  const transaction = TRANSACTION_MAP[transactionType] || "a-vendre";
  const types = propertyTypes.length > 0
    ? [...new Set(propertyTypes.map((t) => TYPE_MAP[t] || t))]
    : ["maison", "appartement", "villa"];

  // Lancer tous les fetchs zone×type en parallèle
  const combinations: { zone: string; type: string }[] = [];
  for (const zone of zones) {
    for (const type of types) {
      combinations.push({ zone, type });
    }
  }

  const allUrlsArrays = await Promise.allSettled(
    combinations.map(({ zone, type }) => fetchSearchResults(type, transaction, zone))
  );

  // Grouper par zone pour pouvoir interleaver en round-robin
  const urlsByZone = new Map<string, string[]>();
  for (let i = 0; i < combinations.length; i++) {
    const r = allUrlsArrays[i];
    if (r.status === "fulfilled") {
      const zone = combinations[i].zone;
      if (!urlsByZone.has(zone)) urlsByZone.set(zone, []);
      urlsByZone.get(zone)!.push(...r.value);
    }
  }

  // Dédupliquer globalement puis interleaver zone par zone (round-robin)
  // → chaque localité obtient des slots proportionnels dans le cap MAX_NEW_URLS
  const globalSeen = new Set<string>();
  const zoneQueues: string[][] = [];
  for (const urls of urlsByZone.values()) {
    const deduped = urls.filter((u) => {
      if (globalSeen.has(u)) return false;
      globalSeen.add(u);
      return true;
    });
    if (deduped.length > 0) zoneQueues.push(deduped);
  }

  const totalRaw = [...urlsByZone.values()].reduce((s, v) => s + v.length, 0);
  const uniqueUrls: string[] = [];
  const maxLen = Math.max(...zoneQueues.map((q) => q.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const queue of zoneQueues) {
      if (i < queue.length) uniqueUrls.push(queue[i]);
    }
  }
  console.log(`[Immoweb] ${totalRaw} brutes -> ${uniqueUrls.length} uniques (${zoneQueues.length} zone(s))`);

  const existingIds = await getExistingExternalIds(
    uniqueUrls.map((u) => `immoweb-${extractId(u)}`)
  );
  const newUrls = uniqueUrls
    .filter((u) => !existingIds.has(`immoweb-${extractId(u)}`))
    .slice(0, MAX_NEW_URLS);

  console.log(`[Immoweb] ${newUrls.length} nouvelles annonces a importer (cap ${MAX_NEW_URLS})`);

  const properties: Property[] = [];

  for (let i = 0; i < newUrls.length; i += BATCH_SIZE) {
    const batch = newUrls.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((url) => parseImmowebUrl(url).catch(() => null))
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        const prop = result.value;
        if (prop.price > 0 && !isExcludedType(prop)) {
          properties.push(prop);
        }
      }
    }

    console.log(`[Immoweb] ${Math.min(i + BATCH_SIZE, newUrls.length)}/${newUrls.length} parsees, ${properties.length} valides`);
  }

  console.log(`[Immoweb] ${properties.length} biens importes`);
  return properties;
}

function isExcludedType(prop: Property): boolean {
  const text = `${prop.title || ""} ${prop.propertyType || ""}`.toLowerCase();
  const excluded = [
    "parking", "garage", "commerce", "commercial", "bureau", "bureaux",
    "entrepot", "industriel", "hotel", "restaurant", "magasin",
    "atelier", "hangar", "terrain", "immeuble",
  ];
  return excluded.some((w) => text.includes(w));
}

const ZONE_POSTAL_CODES: Record<string, string> = {
  // Communes bruxelloises
  "anderlecht": "1070", "auderghem": "1160", "berchem sainte agathe": "1082",
  "bruxelles": "1000", "etterbeek": "1040", "evere": "1140",
  "forest": "1190", "ganshoren": "1083", "ixelles": "1050",
  "jette": "1090", "koekelberg": "1081", "molenbeek saint jean": "1080",
  "saint gilles": "1060", "saint josse ten noode": "1210",
  "schaerbeek": "1030", "uccle": "1180",
  "watermael boitsfort": "1170",
  "woluwe saint lambert": "1200", "woluwe saint pierre": "1150",
  // Brabant Wallon
  "braine l alleud": "1420", "braine le chateau": "1440",
  "court saint etienne": "1490", "genappe": "1470",
  "grez doiceau": "1390", "lasne": "1380", "nivelles": "1400",
  "ottignies": "1340", "louvain la neuve": "1348",
  "perwez": "1360", "rebecq": "1430", "rixensart": "1330",
  "tubize": "1480", "wavre": "1300", "waterloo": "1410",
  "villers la ville": "1495",
  // Province de Namur
  "namur": "5000", "andenne": "5300", "ciney": "5590",
  "dinant": "5500", "gembloux": "5030", "profondeville": "5170",
  "rochefort": "5580", "sambreville": "5060",
  // Reste de la Belgique
  "mons": "7000", "liege": "4000", "charleroi": "6000",
  "louvain": "3000", "leuven": "3000", "gent": "9000", "antwerpen": "2000",
  "arlon": "6700", "tournai": "7500", "verviers": "4800",
  "hasselt": "3500", "bruges": "8000", "brugge": "8000",
  "mechelen": "2800", "aalst": "9300", "kortrijk": "8500",
  "mont saint guibert": "1435",
};

function getPostalCode(zone: string): string {
  const key = normalize(zone);
  // Exact match first, then partial (handles "Ottignies-Louvain-la-Neuve" → "ottignies")
  for (const [k, v] of Object.entries(ZONE_POSTAL_CODES)) {
    if (key === normalize(k)) return v;
  }
  for (const [k, v] of Object.entries(ZONE_POSTAL_CODES)) {
    const kn = normalize(k);
    if (key.includes(kn) || kn.includes(key)) return v;
  }
  return "";
}

async function fetchSearchResults(type: string, transaction: string, zone: string): Promise<string[]> {
  // Pour les régions, on utilise le slug Immoweb directement (sans code postal)
  const region = getRegion(zone);
  const slug = region ? region.slug : normalize(zone).replace(/\s+/g, "-");
  const postalCode = region ? "" : getPostalCode(zone);
  const seen = new Set<string>();
  const allUrls: string[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const zipPart = postalCode ? `/${postalCode}` : "";
      const searchUrl = `https://www.immoweb.be/fr/recherche/${type}/${transaction}/${slug}${zipPart}?page=${page}&orderBy=newest`;
      const res = await fetchWithTimeout(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "fr-BE,fr;q=0.9",
        },
      }, 15000);

      if (!res.ok) break;

      const html = await res.text();
      const urls = [...html.matchAll(/immoweb\.be\/fr\/annonce\/[^\s"]+/g)]
        .map((m) => `https://www.${m[0]}`)
        .filter((u) => !u.includes("projet-neuf"));

      const newOnPage = urls.filter((u) => !seen.has(u));
      for (const u of urls) seen.add(u);

      if (newOnPage.length === 0) {
        console.log(`[Immoweb] ${type}/${slug} page ${page}: plus de nouvelles annonces, arret`);
        break;
      }

      allUrls.push(...newOnPage);
      console.log(`[Immoweb] ${type}/${slug} page ${page}: ${newOnPage.length} nouvelles`);
    } catch {
      break;
    }
  }

  return allUrls;
}

function extractId(url: string): string {
  const match = url.match(/\/(\d+)(?:\?|$)/);
  return match ? match[1] : `unknown-${Date.now()}`;
}

async function getExistingExternalIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data } = await supabase.from("properties").select("external_id").in("external_id", ids);
  return new Set((data || []).map((d) => d.external_id));
}

export async function saveProperties(properties: Property[]): Promise<void> {
  if (properties.length === 0) return;
  const { error } = await supabase.from("properties").upsert(
    properties.map((p) => ({
      external_id: p.externalId,
      source: p.source,
      url: p.url,
      title: p.title,
      description: p.description,
      price: Math.round(p.price),
      property_type: p.propertyType,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      surface: p.surface != null ? Math.round(p.surface) : null,
      land_surface: p.landSurface != null ? Math.round(p.landSurface) : null,
      peb_score: p.pebScore,
      address: p.address,
      zip_code: p.zipCode,
      city: p.city,
      province: p.province,
      latitude: p.latitude,
      longitude: p.longitude,
      image_urls: p.imageUrls,
      features: p.features,
      raw_data: p.rawData,
      scraped_at: p.scrapedAt,
    })),
    { onConflict: "external_id" }
  );
  if (error) {
    console.error("[Immoweb] Erreur sauvegarde:", error.message);
    throw error;
  }
}
