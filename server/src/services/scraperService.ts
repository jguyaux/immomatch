import { supabase } from "../config/supabase.js";
import type { Property } from "../../../shared/types.js";

export async function scrapeImmoweb(): Promise<Property[]> {
  // TODO: Implémenter le scraping Immoweb
  // Options : API Immoweb (si disponible), ou scraping HTML avec cheerio/puppeteer
  console.log("[Scraper] Démarrage du scan Immoweb...");

  const properties: Property[] = [];

  // Placeholder — à remplacer par le vrai scraping
  // 1. Récupérer les annonces récentes depuis Immoweb
  // 2. Parser les données (prix, localisation, caractéristiques...)
  // 3. Dédupliquer par externalId
  // 4. Sauvegarder en base

  console.log(`[Scraper] ${properties.length} nouveaux biens trouvés`);
  return properties;
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
      price: p.price,
      property_type: p.propertyType,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      surface: p.surface,
      land_surface: p.landSurface,
      peb_score: p.pebScore,
      address: p.address,
      zip_code: p.zipCode,
      city: p.city,
      province: p.province,
      image_urls: p.imageUrls,
      features: p.features,
      raw_data: p.rawData,
      scraped_at: p.scrapedAt,
    })),
    { onConflict: "external_id" }
  );

  if (error) {
    console.error("[Scraper] Erreur sauvegarde:", error.message);
    throw error;
  }
}
