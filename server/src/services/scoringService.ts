import { anthropic } from "../config/claude.js";
import type { Property, UserPreferences, ScoringResult } from "../../../shared/types.js";

export async function scoreProperty(
  property: Property,
  preferences: UserPreferences
): Promise<ScoringResult> {
  const prompt = buildScoringPrompt(property, preferences);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
    system:
      "Tu es un expert immobilier belge. Tu analyses des biens immobiliers et les scores de 0 à 100 selon les critères de l'acheteur. Réponds uniquement en JSON valide.",
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

function buildScoringPrompt(property: Property, prefs: UserPreferences): string {
  return `Analyse ce bien immobilier belge et score-le de 0 à 100 selon les critères de l'acheteur.

## Bien immobilier
- Titre: ${property.title}
- Prix: ${property.price}€
- Type: ${property.propertyType}
- Chambres: ${property.bedrooms ?? "non spécifié"}
- Surface: ${property.surface ?? "non spécifié"} m²
- Terrain: ${property.landSurface ?? "non spécifié"} m²
- PEB: ${property.pebScore ?? "non spécifié"}
- Localisation: ${property.city}, ${property.zipCode}
- Description: ${property.description ?? "non disponible"}
- Caractéristiques: ${property.features.join(", ") || "aucune"}

## Critères de l'acheteur
- Budget: ${prefs.budgetMin}€ - ${prefs.budgetMax}€
- Zones souhaitées: ${prefs.zones.join(", ")}
- Types recherchés: ${prefs.propertyTypes.join(", ")}
- Chambres: ${prefs.bedroomsMin}${prefs.bedroomsMax ? ` - ${prefs.bedroomsMax}` : "+"}
- Surface: ${prefs.surfaceMin ?? "pas de min"} - ${prefs.surfaceMax ?? "pas de max"} m²
- PEB acceptés: ${prefs.pebScores.join(", ")}
- Souhaits: ${prefs.features.join(", ") || "aucun"}
- Critères éliminatoires: ${prefs.dealBreakers.join(", ") || "aucun"}
- Notes: ${prefs.notes ?? "aucune"}

Réponds en JSON avec cette structure exacte:
{
  "score": <number 0-100>,
  "reasoning": "<explication courte du score>",
  "strengths": ["<point fort 1>", "<point fort 2>"],
  "weaknesses": ["<point faible 1>", "<point faible 2>"]
}`;
}
