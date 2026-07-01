import { supabase } from "../config/supabase.js";
import { parseImmowebUrl } from "./immowebParser.js";
import type { Property } from "../../../shared/types.js";

const BATCH_SIZE = 10;
const MAX_PAGES = 25;

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

// Postal code ranges [min, max] for Belgian cities/zones
const ZONE_ZIP_RANGES: Record<string, [number, number][]> = {
  namur: [[5000, 5024], [5100, 5110]],
  bruxelles: [[1000, 1299]],
  "bruxelles capitale": [[1000, 1299]],
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

  const allUrls: string[] = [];

  for (const zone of zones) {
    for (const type of types) {
      const urls = await fetchSearchResults(type, transaction, zone);
      allUrls.push(...urls);
    }
  }

  const uniqueUrls = [...new Set(allUrls)];
  console.log(`[Immoweb] ${allUrls.length} brutes -> ${uniqueUrls.length} uniques`);

  const existingIds = await getExistingExternalIds(
    uniqueUrls.map((u) => `immoweb-${extractId(u)}`)
  );
  const newUrls = uniqueUrls.filter((u) => !existingIds.has(`immoweb-${extractId(u)}`));
  console.log(`[Immoweb] ${newUrls.length} nouvelles annonces a importer`);

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

    if (i + BATCH_SIZE < newUrls.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (i % 50 === 0 && i > 0) {
      console.log(`[Immoweb] ${i}/${newUrls.length} traitees, ${properties.length} valides`);
    }
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
  namur: "5000", bruxelles: "1000", "bruxelles capitale": "1000",
  "mont saint guibert": "1435", mons: "7000", liege: "4000",
  charleroi: "6000", wavre: "1300", louvain: "3000", leuven: "3000",
  gent: "9000", antwerpen: "2000", ottignies: "1340",
  "louvain la neuve": "1348", nivelles: "1400", waterloo: "1410",
  arlon: "6700", tournai: "7500", verviers: "4800",
};

function getPostalCode(zone: string): string {
  const key = zone.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/-/g, " ").trim();
  for (const [k, v] of Object.entries(ZONE_POSTAL_CODES)) {
    if (key === k || key.includes(k) || k.includes(key)) return v;
  }
  return "";
}

async function fetchSearchResults(type: string, transaction: string, zone: string): Promise<string[]> {
  const zoneLower = zone.toLowerCase().replace(/\s+/g, "-");
  const postalCode = getPostalCode(zone);
  const seen = new Set<string>();
  const allUrls: string[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const zipPart = postalCode ? `/${postalCode}` : "";
      const searchUrl = `https://www.immoweb.be/fr/recherche/${type}/${transaction}/${zoneLower}${zipPart}?page=${page}&orderBy=newest`;
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "fr-BE,fr;q=0.9",
        },
      });

      if (!res.ok) break;

      const html = await res.text();
      const urls = [...html.matchAll(/immoweb\.be\/fr\/annonce\/[^\s"]+/g)]
        .map((m) => `https://www.${m[0]}`)
        .filter((u) => !u.includes("projet-neuf"));

      const newOnPage = urls.filter((u) => !seen.has(u));
      for (const u of urls) seen.add(u);

      if (newOnPage.length === 0) {
        console.log(`[Immoweb] ${type}/${zone} page ${page}: plus de nouvelles annonces, arret`);
        break;
      }

      allUrls.push(...newOnPage);
      console.log(`[Immoweb] ${type}/${zone} page ${page}: ${newOnPage.length} nouvelles`);

      await new Promise((r) => setTimeout(r, 1000));
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
