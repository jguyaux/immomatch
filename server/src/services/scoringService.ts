import { env } from "../config/env.js";
import type { Property, UserPreferences, ScoringResult } from "../../../shared/types.js";

export async function scoreProperty(
  property: Property,
  preferences: UserPreferences
): Promise<ScoringResult> {
  if (env.anthropicApiKey && env.anthropicApiKey.length > 0) {
    return scoreWithClaude(property, preferences);
  }
  return scoreWithAlgorithm(property, preferences);
}

function scoreWithAlgorithm(property: Property, prefs: UserPreferences): ScoringResult {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  let totalPoints = 0;
  let maxPoints = 0;

  // Budget (30 points) — favorise les prix bas dans la fourchette
  maxPoints += 30;
  if (property.price >= prefs.budgetMin && property.price <= prefs.budgetMax) {
    const range = prefs.budgetMax - prefs.budgetMin;
    const positionInRange = range > 0 ? (prefs.budgetMax - property.price) / range : 0.5;
    const budgetScore = 22 + Math.round(positionInRange * 8);
    totalPoints += budgetScore;
    const pctBudget = Math.round(((prefs.budgetMax - property.price) / prefs.budgetMax) * 100);
    strengths.push(`Prix ${property.price.toLocaleString("fr-BE")} € (${pctBudget}% sous le max)`);
  } else if (property.price < prefs.budgetMin) {
    totalPoints += 28;
    strengths.push(`Prix tres attractif (${property.price.toLocaleString("fr-BE")} €)`);
  } else {
    const overBudget = ((property.price - prefs.budgetMax) / prefs.budgetMax) * 100;
    if (overBudget <= 5) {
      totalPoints += 15;
      weaknesses.push(`Prix legerement au-dessus (+${overBudget.toFixed(0)}%)`);
    } else if (overBudget <= 15) {
      totalPoints += 5;
      weaknesses.push(`Prix au-dessus du budget (+${overBudget.toFixed(0)}%)`);
    } else {
      weaknesses.push(`Prix hors budget (+${overBudget.toFixed(0)}%)`);
    }
  }

  // Type de bien (10 points)
  maxPoints += 10;
  if (prefs.propertyTypes.length === 0 || prefs.propertyTypes.includes(property.propertyType)) {
    totalPoints += 10;
    if (prefs.propertyTypes.length > 0) strengths.push(`Type recherche (${property.propertyType})`);
  } else {
    weaknesses.push(`Type non recherche (${property.propertyType})`);
  }

  // Chambres (15 points)
  if (property.bedrooms != null) {
    maxPoints += 15;
    const meetsMin = property.bedrooms >= prefs.bedroomsMin;
    const meetsMax = !prefs.bedroomsMax || property.bedrooms <= prefs.bedroomsMax;
    if (meetsMin && meetsMax) {
      totalPoints += 15;
      strengths.push(`${property.bedrooms} chambres`);
    } else if (!meetsMin) {
      const diff = prefs.bedroomsMin - property.bedrooms;
      totalPoints += diff === 1 ? 5 : 0;
      weaknesses.push(`Seulement ${property.bedrooms} ch. (min: ${prefs.bedroomsMin})`);
    } else {
      totalPoints += 10;
    }
  }

  // Surface habitable (15 points) — favorise les grandes surfaces
  if (property.surface != null) {
    maxPoints += 15;
    const meetsMin = !prefs.surfaceMin || property.surface >= prefs.surfaceMin;
    const meetsMax = !prefs.surfaceMax || property.surface <= prefs.surfaceMax;
    if (meetsMin && meetsMax) {
      let surfaceBonus = 12;
      if (prefs.surfaceMin && property.surface > prefs.surfaceMin) {
        const extra = Math.min((property.surface - prefs.surfaceMin) / prefs.surfaceMin, 0.3);
        surfaceBonus += Math.round(extra * 10);
      }
      totalPoints += Math.min(15, surfaceBonus);
      strengths.push(`${property.surface} m² habitables`);
    } else if (!meetsMin) {
      const ratio = property.surface / prefs.surfaceMin!;
      totalPoints += ratio > 0.9 ? 8 : ratio > 0.75 ? 4 : 0;
      weaknesses.push(`${property.surface} m² (min: ${prefs.surfaceMin} m²)`);
    } else {
      totalPoints += 10;
    }
  }

  // PEB (10 points) — favorise les bons scores
  if (property.pebScore) {
    maxPoints += 10;
    const pebOrder = ["A", "B", "C", "D", "E", "F", "G"];
    const propertyIdx = pebOrder.indexOf(property.pebScore);

    if (prefs.pebScores.length === 0 || prefs.pebScores.includes(property.pebScore as any)) {
      const pebBonus = propertyIdx <= 1 ? 10 : propertyIdx <= 3 ? 8 : 6;
      totalPoints += pebBonus;
      strengths.push(`PEB ${property.pebScore}`);
    } else {
      const bestAccepted = Math.min(...prefs.pebScores.map((s) => pebOrder.indexOf(s)));
      const diff = propertyIdx - bestAccepted;
      totalPoints += diff === 1 ? 4 : 0;
      weaknesses.push(`PEB ${property.pebScore} (accepte: ${prefs.pebScores.join(", ")})`);
    }
  }

  // Zone (10 points)
  if (property.city || property.url) {
    maxPoints += 10;
    if (prefs.zones.length === 0) {
      totalPoints += 10;
    } else {
      const fields = [property.city, property.address, property.zipCode, property.url]
        .filter(Boolean)
        .map((s) => normalize(s!));
      const matchesZone = prefs.zones.some((z) => {
        const zoneNorm = normalize(z);
        return fields.some((f) => f === zoneNorm || f.includes(zoneNorm) || zoneNorm.includes(f));
      });
      if (matchesZone) {
        totalPoints += 10;
        strengths.push(`Localisation: ${property.city}`);
      } else {
        weaknesses.push(`Hors zone (${property.city})`);
      }
    }
  }

  // Features (10 points)
  if (prefs.features.length > 0) {
    maxPoints += 10;
    const matched = prefs.features.filter((f) =>
      property.features.some((pf) => normalize(pf).includes(normalize(f)))
    );
    const ratio = matched.length / prefs.features.length;
    totalPoints += Math.round(ratio * 10);
    if (matched.length > 0) strengths.push(`Souhaits: ${matched.join(", ")}`);
    const missing = prefs.features.filter((f) => !matched.includes(f));
    if (missing.length > 0 && missing.length <= 3) weaknesses.push(`Manque: ${missing.join(", ")}`);
  }

  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 50;

  const reasoning =
    score >= 85 ? "Excellent match avec vos criteres."
    : score >= 70 ? "Tres bon match avec vos criteres."
    : score >= 55 ? "Correspond a la plupart de vos criteres avec quelques compromis."
    : score >= 40 ? "Correspond partiellement a vos criteres."
    : "Ne correspond pas bien a vos criteres.";

  return { score, reasoning, strengths, weaknesses };
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/-/g, " ")
    .trim();
}

async function scoreWithClaude(property: Property, preferences: UserPreferences): Promise<ScoringResult> {
  const { anthropic } = await import("../config/claude.js");
  const prompt = `Analyse ce bien immobilier belge et score-le de 0 a 100 selon les criteres de l'acheteur. Favorise les prix bas et les bons PEB.

## Bien immobilier
- Titre: ${property.title}
- Prix: ${property.price}€
- Type: ${property.propertyType}
- Chambres: ${property.bedrooms ?? "non specifie"}
- Surface: ${property.surface ?? "non specifie"} m²
- Terrain: ${property.landSurface ?? "non specifie"} m²
- PEB: ${property.pebScore ?? "non specifie"}
- Localisation: ${property.city}, ${property.zipCode}
- Description: ${property.description ?? "non disponible"}
- Caracteristiques: ${property.features.join(", ") || "aucune"}

## Criteres de l'acheteur
- Budget: ${preferences.budgetMin}€ - ${preferences.budgetMax}€ (prefere les prix bas)
- Zones souhaitees: ${preferences.zones.join(", ")}
- Types recherches: ${preferences.propertyTypes.join(", ")}
- Chambres: ${preferences.bedroomsMin}${preferences.bedroomsMax ? ` - ${preferences.bedroomsMax}` : "+"}
- Surface: ${preferences.surfaceMin ?? "pas de min"} - ${preferences.surfaceMax ?? "pas de max"} m²
- PEB acceptes: ${preferences.pebScores.join(", ")} (prefere les meilleurs scores)
- Souhaits: ${preferences.features.join(", ") || "aucun"}
- Criteres eliminatoires: ${preferences.dealBreakers.join(", ") || "aucun"}
- Notes: ${preferences.notes ?? "aucune"}

Reponds en JSON:
{"score":<0-100>,"reasoning":"<explication>","strengths":["..."],"weaknesses":["..."]}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
    system: "Tu es un expert immobilier belge. Reponds uniquement en JSON valide.",
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(text);

  return {
    score: Math.max(0, Math.min(100, parsed.score)),
    reasoning: parsed.reasoning,
    strengths: parsed.strengths || [],
    weaknesses: parsed.weaknesses || [],
  };
}
