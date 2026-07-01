import { supabase } from "../config/supabase.js";
import type { Property } from "../../../shared/types.js";

const SITEMAP_URLS = [
  "https://www.biddit.be/stg/eco/fr_sitemap_1.xml",
  "https://www.biddit.be/stg/eco/fr_sitemap_2.xml",
  "https://www.biddit.be/stg/eco/fr_sitemap_3.xml",
];
const LOT_API_URL = "https://www.biddit.be/api/eco/biddit-bff/lot";
const BATCH_SIZE = 10;

export async function scanBiddit(userZones: string[] = []): Promise<Property[]> {
  console.log("[Biddit] Demarrage du scan...");

  const lotIds = await fetchLotIdsFromSitemap();
  console.log(`[Biddit] ${lotIds.length} lots dans le sitemap`);

  const existingIds = await getExistingExternalIds(lotIds.map((id) => `biddit-${id}`));
  const newIds = lotIds.filter((id) => !existingIds.has(`biddit-${id}`));
  console.log(`[Biddit] ${newIds.length} nouveaux lots a analyser`);

  const normalizedZones = userZones.map(normalize);
  const properties: Property[] = [];

  for (let i = 0; i < newIds.length; i += BATCH_SIZE) {
    const batch = newIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(fetchLotDetails));

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        const prop = result.value;
        if (normalizedZones.length === 0 || matchesZone(prop, normalizedZones)) {
          properties.push(prop);
        }
      }
    }

    if (i + BATCH_SIZE < newIds.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log(`[Biddit] ${newIds.length} lots analyses, ${properties.length} dans les zones`);
  return properties;
}

function matchesZone(prop: Property, normalizedZones: string[]): boolean {
  const fields = [prop.city, prop.address, prop.zipCode]
    .filter(Boolean)
    .map((s) => normalize(s!));
  if (fields.length === 0) return false;
  return normalizedZones.some((zone) =>
    fields.some((f) => f === zone || f.includes(zone) || zone.includes(f))
  );
}

function normalize(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/-/g, " ").trim();
}

function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fetchLotIdsFromSitemap(): Promise<string[]> {
  const allIds: string[] = [];
  for (const url of SITEMAP_URLS) {
    try {
      const res = await fetchWithTimeout(url, {}, 15000);
      const xml = await res.text();
      const ids = [...xml.matchAll(/catalog\/detail\/(\d+)/g)].map((m) => m[1]);
      allIds.push(...ids);
    } catch {
      console.error(`[Biddit] Erreur lecture sitemap: ${url}`);
    }
  }
  return [...new Set(allIds)];
}

async function fetchLotDetails(reference: string): Promise<Property | null> {
  try {
    const res = await fetchWithTimeout(`${LOT_API_URL}/${reference}`, {}, 10000);
    if (!res.ok) return null;

    const data = await res.json();
    const prop = data.properties?.[0];
    if (!prop) return null;

    const excludedTypes = ["COMMERCIAL", "OFFICE", "GARAGE", "PARKING", "INDUSTRY", "OTHER", "LAND"];
    if (excludedTypes.includes(prop.propertyType)) return null;
    const titleLower = (prop.title?.fr || prop.title?.nl || "").toLowerCase();
    const excludedWords = ["parking", "garage", "commerce", "bureau", "entrepot", "hotel", "restaurant", "magasin"];
    if (excludedWords.some((w) => titleLower.includes(w))) return null;

    const price = Math.round(
      data.sellingPrice || data.currentPrice || data.startingPrice || data.initialStartingPrice || 0
    );

    return {
      id: "",
      externalId: `biddit-${reference}`,
      source: "biddit" as any,
      url: `https://www.biddit.be/fr/catalog/detail/${reference}`,
      title: prop.title?.fr || prop.title?.nl || "Bien immobilier",
      description: prop.description?.fr || prop.description?.nl || null,
      price,
      propertyType: mapBidditType(prop.propertyType),
      bedrooms: prop.numberOfBedrooms ?? null,
      bathrooms: prop.numberOfBathrooms ?? null,
      surface: prop.livingSurfaceArea != null ? Math.round(prop.livingSurfaceArea) : null,
      landSurface: prop.terrainSurface != null ? Math.round(prop.terrainSurface) : null,
      pebScore: mapBidditPeb(prop.energeticClassRBC || prop.energeticClassRW || prop.energeticClassRF),
      address: buildAddress(prop),
      zipCode: prop.address?.postalCode || null,
      city: prop.address?.municipality?.fr || null,
      province: null,
      latitude: prop.geoLocation?.lat ?? null,
      longitude: prop.geoLocation?.lng ?? null,
      imageUrls: (prop.pictures || [])
        .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
        .map((p: any) => p.large || p.medium || p.small)
        .filter(Boolean),
      features: extractFeatures(prop),
      rawData: data,
      scrapedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function mapBidditType(type: string): Property["propertyType"] {
  const mapping: Record<string, Property["propertyType"]> = {
    HOUSE: "maison", APARTMENT: "appartement", STUDIO: "studio",
    DUPLEX: "duplex", VILLA: "villa", LAND: "terrain", BUILDING: "immeuble",
  };
  return mapping[type] || "maison";
}

function mapBidditPeb(peb: string | null): Property["pebScore"] {
  if (!peb) return null;
  const match = peb.match(/CLASS_([A-G])/);
  return (match ? match[1] : null) as Property["pebScore"];
}

function buildAddress(prop: any): string | null {
  const addr = prop.address;
  if (!addr) return null;
  const parts = [addr.street?.fr, addr.estateNumber, addr.postalCode, addr.municipality?.fr].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function extractFeatures(prop: any): string[] {
  const features: string[] = [];
  if (prop.numberOfFacades) features.push(`${prop.numberOfFacades} facades`);
  if (prop.constructionYear) features.push(`Construit en ${prop.constructionYear}`);
  if (prop.terrainSurface) features.push(`Terrain ${prop.terrainSurface} m²`);
  return features;
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
      external_id: p.externalId, source: p.source, url: p.url, title: p.title,
      description: p.description, price: Math.round(p.price), property_type: p.propertyType,
      bedrooms: p.bedrooms, bathrooms: p.bathrooms,
      surface: p.surface != null ? Math.round(p.surface) : null,
      land_surface: p.landSurface != null ? Math.round(p.landSurface) : null,
      peb_score: p.pebScore, address: p.address, zip_code: p.zipCode,
      city: p.city, province: p.province,
      latitude: p.latitude, longitude: p.longitude, image_urls: p.imageUrls,
      features: p.features, raw_data: p.rawData, scraped_at: p.scrapedAt,
    })),
    { onConflict: "external_id" }
  );
  if (error) {
    console.error("[Biddit] Erreur sauvegarde:", error.message);
    throw error;
  }
}
