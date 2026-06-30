import { supabase } from "../config/supabase.js";
import type { Property } from "../../../shared/types.js";

const SITEMAP_URL = "https://www.trevi.be/sitemaps/estate-sitemap.xml";

export async function scanTrevi(userZones: string[] = [], transactionType: string = "achat"): Promise<Property[]> {
  console.log("[Trevi] Demarrage du scan...");

  const urls = await fetchPropertyUrls();
  console.log(`[Trevi] ${urls.length} biens dans le sitemap`);

  const normalizedZones = userZones.map(normalize);

  const excludedTypes = ["commerce", "bureaux", "parking", "garage", "entrepot", "industrie", "terrain"];

  const rentalWords = ["louer", "huur", "rent"];
  const saleWords = ["vendre", "koop", "sale"];

  let filteredUrls = urls.filter((url) => {
    const typeMatch = url.match(/\/bien\/\d+\/\d+\/([^/]+)\//);
    if (!typeMatch) return false;
    const type = normalize(decodeURIComponent(typeMatch[1]));
    if (excludedTypes.some((ex) => type.includes(ex))) return false;

    const urlLower = url.toLowerCase();
    if (transactionType === "achat" && rentalWords.some((w) => urlLower.includes(w))) return false;
    if (transactionType === "location" && saleWords.some((w) => urlLower.includes(w)) && !rentalWords.some((w) => urlLower.includes(w))) return false;

    return true;
  });

  if (normalizedZones.length > 0) {
    filteredUrls = filteredUrls.filter((url) => {
      const cityMatch = url.match(/\/bien\/\d+\/\d+\/[^/]+\/([^/?]+)/);
      if (!cityMatch) return false;
      const city = normalize(decodeURIComponent(cityMatch[1]));
      return normalizedZones.some((zone) => city === zone || city.includes(zone) || zone.includes(city));
    });
    console.log(`[Trevi] ${filteredUrls.length} biens residentiels dans les zones`);
  }

  const existingIds = await getExistingExternalIds(
    filteredUrls.map((u) => `trevi-${extractTreviId(u)}`)
  );
  const newUrls = filteredUrls.filter((u) => !existingIds.has(`trevi-${extractTreviId(u)}`));
  console.log(`[Trevi] ${newUrls.length} nouveaux biens a importer`);

  const properties: Property[] = [];
  const batchSize = 5;

  for (let i = 0; i < newUrls.length; i += batchSize) {
    const batch = newUrls.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(fetchPropertyDetails));

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        properties.push(result.value);
      }
    }

    if (i + batchSize < newUrls.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`[Trevi] ${properties.length} biens importes`);
  return properties;
}

function normalize(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/-/g, " ").trim();
}

async function fetchPropertyUrls(): Promise<string[]> {
  const res = await fetch(SITEMAP_URL);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+\/bien\/[^<]+)<\/loc>/g)].map((m) => m[1]);
  return urls;
}

function extractTreviId(url: string): string {
  const match = url.match(/\/bien\/(\d+)\//);
  return match ? match[1] : `unknown-${Date.now()}`;
}

async function fetchPropertyDetails(url: string): Promise<Property | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ImmoMatch/1.0)" },
    });
    if (!res.ok) return null;

    const html = await res.text();
    return parsePropertyPage(html, url);
  } catch {
    return null;
  }
}

function parsePropertyPage(html: string, url: string): Property | null {
  const id = extractTreviId(url);

  const title = extractMeta(html, "og:title") || extractTag(html, "h1") || "Bien Trevi";
  const description = extractMeta(html, "og:description") || null;
  const image = extractMeta(html, "og:image") || null;

  const price = extractNumber(html, /(\d[\d\s.,]*)\s*€/);
  if (!price) return null;

  const cityMatch = url.match(/\/bien\/\d+\/\d+\/[^/]+\/([^/?]+)/);
  const city = cityMatch ? decodeURIComponent(cityMatch[1]).replace(/-/g, " ") : null;

  const zipMatch = html.match(/(\d{4})\s+[A-ZÀ-Ü]/);
  const zipCode = zipMatch ? zipMatch[1] : null;

  const bedrooms = extractNumber(html, /(\d+)\s*(?:chambre|slaapkamer|bedroom)/i);
  const bathrooms = extractNumber(html, /(\d+)\s*(?:salle de bain|badkamer|bathroom)/i);
  const surface = extractNumber(html, /(\d+)\s*m²\s*(?:habitabl|bewoonb|living)/i)
    || extractNumber(html, /surface\s*(?:habitable)?\s*:?\s*(\d+)/i);

  const pebMatch = html.match(/PEB\s*:?\s*([A-G])\b/i) || html.match(/EPC\s*:?\s*([A-G])\b/i);
  const pebScore = (pebMatch ? pebMatch[1].toUpperCase() : null) as Property["pebScore"];

  const typeFromUrl = url.match(/\/bien\/\d+\/\d+\/([^/]+)\//);
  const propertyType = mapTreviType(typeFromUrl ? decodeURIComponent(typeFromUrl[1]) : "");

  const imageUrls: string[] = [];
  if (image) imageUrls.push(image);
  const extraImages = [...html.matchAll(/src=["']([^"']*(?:estate|property|bien)[^"']*\.(?:jpg|jpeg|png|webp))['"]/gi)];
  for (const m of extraImages) {
    const imgUrl = m[1].startsWith("http") ? m[1] : `https://www.trevi.be${m[1]}`;
    if (!imageUrls.includes(imgUrl)) imageUrls.push(imgUrl);
  }

  return {
    id: "",
    externalId: `trevi-${id}`,
    source: "trevi" as any,
    url,
    title: title.replace(/ \| .*$/, "").trim(),
    description,
    price,
    propertyType,
    bedrooms: bedrooms ?? null,
    bathrooms: bathrooms ?? null,
    surface: surface ?? null,
    landSurface: null,
    pebScore,
    address: null,
    zipCode,
    city: city ? city.charAt(0).toUpperCase() + city.slice(1).toLowerCase() : null,
    province: null,
    latitude: null,
    longitude: null,
    imageUrls: imageUrls.slice(0, 10),
    features: [],
    rawData: null,
    scrapedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function mapTreviType(type: string): Property["propertyType"] {
  const t = type.toLowerCase();
  if (t.includes("maison") || t.includes("huis")) return "maison";
  if (t.includes("appartement") || t.includes("apartment")) return "appartement";
  if (t.includes("studio")) return "studio";
  if (t.includes("duplex")) return "duplex";
  if (t.includes("villa")) return "villa";
  if (t.includes("terrain")) return "terrain";
  if (t.includes("immeuble") || t.includes("building")) return "immeuble";
  return "maison";
}

function extractMeta(html: string, property: string): string | null {
  const match = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"))
    || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, "i"));
  return match ? match[1] : null;
}

function extractTag(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i"));
  return match ? match[1].trim() : null;
}

function extractNumber(html: string, regex: RegExp): number | null {
  const match = html.match(regex);
  if (!match) return null;
  const num = parseFloat(match[1].replace(/[\s.]/g, "").replace(",", "."));
  return isNaN(num) ? null : Math.round(num);
}

async function getExistingExternalIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data } = await supabase
    .from("properties")
    .select("external_id")
    .in("external_id", ids);
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
    console.error("[Trevi] Erreur sauvegarde:", error.message);
    throw error;
  }
}
