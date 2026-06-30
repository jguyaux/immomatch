import * as cheerio from "cheerio";
import type { Property } from "../../../shared/types.js";

export async function parseImmowebUrl(url: string): Promise<Property> {
  if (!url.includes("immoweb.be")) {
    throw new Error("URL invalide : seuls les liens Immoweb sont acceptes");
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "fr-BE,fr;q=0.9",
    },
  });

  if (!res.ok) {
    throw new Error(`Impossible de charger la page Immoweb (status ${res.status})`);
  }

  const html = await res.text();
  const classified = extractClassifiedData(html);

  if (!classified) {
    throw new Error("Impossible d'extraire les donnees de l'annonce");
  }

  const rawId = String(classified.id || extractIdFromUrl(url));
  const externalId = rawId.startsWith("immoweb-") ? rawId : `immoweb-${rawId}`;

  return {
    id: "",
    externalId,
    source: "immoweb",
    url,
    title: classified.title || buildTitle(classified),
    description: classified.description || null,
    price: classified.price?.mainValue || classified.transaction?.sale?.price || 0,
    propertyType: mapPropertyType(classified.property?.type || ""),
    bedrooms: classified.property?.bedroomCount ?? null,
    bathrooms: classified.property?.bathroomCount ?? null,
    surface: classified.property?.netHabitableSurface ?? null,
    landSurface: classified.property?.land?.surface ?? null,
    pebScore: classified.transaction?.certificates?.epcScore ?? null,
    address: buildAddress(classified),
    zipCode: classified.property?.location?.postalCode || null,
    city: classified.property?.location?.locality || null,
    province: classified.property?.location?.province || null,
    latitude: classified.property?.location?.latitude ?? null,
    longitude: classified.property?.location?.longitude ?? null,
    imageUrls: extractImages(classified),
    features: extractFeatures(classified),
    rawData: classified,
    scrapedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function extractClassifiedData(html: string): Record<string, any> | null {
  const match = html.match(/window\.classified\s*=\s*(\{[\s\S]*?\});/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {}
  }

  const $ = cheerio.load(html);
  const scriptTags = $("script");
  for (let i = 0; i < scriptTags.length; i++) {
    const content = $(scriptTags[i]).html() || "";
    const m = content.match(/window\.classified\s*=\s*(\{[\s\S]*?\});/);
    if (m) {
      try {
        return JSON.parse(m[1]);
      } catch {}
    }
  }

  return null;
}

function extractIdFromUrl(url: string): string {
  const match = url.match(/\/(\d+)(?:\?|$)/);
  return match ? match[1] : `unknown-${Date.now()}`;
}

function buildTitle(data: Record<string, any>): string {
  const type = data.property?.type || "";
  const subtype = data.property?.subtype || "";
  const city = data.property?.location?.locality || "";
  const bedrooms = data.property?.bedroomCount;
  const typeName = subtype || type || "Bien";
  const parts = [typeName.charAt(0).toUpperCase() + typeName.slice(1).toLowerCase()];
  if (bedrooms) parts.push(`${bedrooms} ch.`);
  if (city) parts.push(`a ${city}`);
  return parts.join(" - ");
}

function mapPropertyType(type: string): Property["propertyType"] {
  const mapping: Record<string, Property["propertyType"]> = {
    HOUSE: "maison",
    APARTMENT: "appartement",
    STUDIO: "studio",
    DUPLEX: "duplex",
    VILLA: "villa",
    LAND: "terrain",
    BUILDING: "immeuble",
  };
  return mapping[type.toUpperCase()] || "maison";
}

function buildAddress(data: Record<string, any>): string | null {
  const loc = data.property?.location;
  if (!loc) return null;
  const parts = [loc.street, loc.number, loc.postalCode, loc.locality].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function extractImages(data: Record<string, any>): string[] {
  const media = data.media?.pictures;
  if (!Array.isArray(media)) return [];
  return media.map((p: any) => p.largeUrl || p.mediumUrl || p.smallUrl).filter(Boolean);
}

function extractFeatures(data: Record<string, any>): string[] {
  const features: string[] = [];
  const prop = data.property;
  if (!prop) return features;

  if (prop.hasGarden) features.push("Jardin");
  if (prop.hasTerrace) features.push("Terrasse");
  if (prop.hasBalcony) features.push("Balcon");
  if (prop.parkingCountIndoor || prop.parkingCountOutdoor) features.push("Parking");
  if (prop.hasBasement) features.push("Cave");
  if (prop.hasLift) features.push("Ascenseur");
  if (prop.hasSwimmingPool) features.push("Piscine");
  if (prop.hasAirConditioning) features.push("Climatisation");
  if (prop.fireplaceExists) features.push("Cheminee");

  return features;
}
