import type { Property } from "../../../shared/types";

const TYPE_FR: Record<string, string> = {
  maison: "Maison",
  appartement: "Appartement",
  studio: "Studio",
  duplex: "Duplex",
  villa: "Villa",
  terrain: "Terrain",
  immeuble: "Immeuble de rapport",
  loft: "Loft",
  penthouse: "Penthouse",
  chalet: "Chalet",
  bungalow: "Bungalow",
  fermette: "Fermette",
  ferme: "Ferme",
  chateau: "Château",
};

// Titres auto-générés par Immoweb/Biddit : "House - 4 ch. - à Namur",
// "Appartement 2 chambres", "Maison - Namur", etc.
const AUTO_TITLE_RE = new RegExp(
  [
    /^(house|apartment|flat|villa|studio|duplex)/i,
    /^(maison|appartement|villa|studio|duplex|terrain|immeuble)\s*[-·—,]/i,
    /^(maison|appartement|villa|studio|duplex|terrain)\s+\d/i,
    /^[\w\s]+ - \d+ (ch|bed|kamer|slaapkamer)/i,
    /^[\w\s]+ à (vendre|louer)/i,
  ]
    .map((r) => r.source)
    .join("|")
);

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateTitle(property: Property): string {
  const parts: string[] = [];

  const type = TYPE_FR[property.propertyType?.toLowerCase()] ?? capitalize(property.propertyType ?? "Bien");
  parts.push(type);

  if (property.bedrooms != null && property.bedrooms > 0) {
    parts.push(`${property.bedrooms} ch.`);
  }

  if (property.surface != null && property.surface > 0) {
    parts.push(`${Math.round(property.surface)} m²`);
  }

  if (property.city) {
    parts.push(property.city);
  } else if (property.zipCode) {
    parts.push(property.zipCode);
  }

  return parts.join(" · ");
}

export function getDisplayTitle(property: Property): string {
  const raw = (property.title ?? "").trim();
  if (!raw || AUTO_TITLE_RE.test(raw)) {
    return generateTitle(property);
  }
  return raw;
}
