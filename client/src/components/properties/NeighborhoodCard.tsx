import { useState } from "react";
import { api } from "../../services/api";

interface Station {
  name: string;
  distanceKm: number;
  drivingMinutes: number;
}

interface Highway {
  label: string;
  access: string;
  distanceKm: number;
  drivingMinutes: number;
}

interface School {
  name: string;
  type: string;
  distanceKm: number;
}

interface NeighborhoodInfo {
  stations: Station[];
  highways: Highway[];
  schools: School[];
  floodRisk: "none" | "low" | "medium" | "high" | "unknown";
  priceEvolution5y: number | null;
  potentialScore: number | null;
  commune: string | null;
}

interface NeighborhoodCardProps {
  propertyId: string;
  hasCoords: boolean;
}

function getPriceEvolutionColor(pct: number): string {
  if (pct > 25) return "text-green-800";
  if (pct >= 20) return "text-green-600";
  if (pct >= 15) return "text-blue-600";
  return "text-gray-500";
}

function getScoreBadgeColor(score: number): string {
  if (score >= 75) return "bg-green-100 text-green-800";
  if (score >= 55) return "bg-blue-100 text-blue-800";
  if (score >= 35) return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-600";
}

function FloodBadge({ risk }: { risk: NeighborhoodInfo["floodRisk"] }) {
  const config: Record<string, { color: string; label: string }> = {
    none: { color: "bg-green-100 text-green-800", label: "Hors zone inondable" },
    low: { color: "bg-yellow-100 text-yellow-800", label: "Risque faible" },
    medium: { color: "bg-orange-100 text-orange-800", label: "Risque modéré" },
    high: { color: "bg-red-100 text-red-800", label: "Zone inondable" },
    unknown: { color: "bg-gray-100 text-gray-500", label: "Données indisponibles" },
  };
  const c = config[risk] ?? config.unknown;
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${c.color}`}>
      {c.label}
    </span>
  );
}

export function NeighborhoodCard({ propertyId, hasCoords }: NeighborhoodCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NeighborhoodInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!hasCoords) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 italic">
          Coordonnées GPS non disponibles pour ce bien
        </p>
      </div>
    );
  }

  const handleToggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (data) return; // already fetched
    setLoading(true);
    setError(null);
    try {
      const result = await api.getNeighborhood(propertyId) as NeighborhoodInfo;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-800 transition w-full text-left"
      >
        <span>{expanded ? "Masquer le quartier" : "Voir le quartier"}</span>
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {loading && (
            <p className="text-xs text-gray-400 animate-pulse">Chargement des données du quartier...</p>
          )}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
          {data && !loading && (
            <>
              {/* Transports */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Transports</h4>
                <div className="space-y-1">
                  {data.stations.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                      <span>🚂</span>
                      <span className="font-medium">{s.name}</span>
                      <span className="text-gray-400">—</span>
                      <span>{s.distanceKm} km — {s.drivingMinutes} min</span>
                    </div>
                  ))}
                  {data.highways.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                      <span>🛣️</span>
                      <span className="font-medium">{h.label}</span>
                      <span className="text-gray-500">{h.access}</span>
                      <span className="text-gray-400">—</span>
                      <span>{h.distanceKm} km — {h.drivingMinutes} min</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schools */}
              {data.schools.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Écoles (5km)</h4>
                  <div className="space-y-1">
                    {data.schools.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                        <span>🏫</span>
                        <span className="font-medium">{s.name}</span>
                        <span className="text-gray-400 capitalize">{s.type}</span>
                        <span className="text-gray-400">—</span>
                        <span>{Math.round(s.distanceKm * 10) / 10} km</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Marché immobilier */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Marché immobilier</h4>
                <div className="space-y-2">
                  {data.commune && (
                    <div className="text-xs text-gray-700">
                      <span className="font-medium">{data.commune}</span>
                      {data.priceEvolution5y != null && (
                        <span className={`ml-2 font-semibold ${getPriceEvolutionColor(data.priceEvolution5y)}`}>
                          Évolution des prix 2020-2025: +{data.priceEvolution5y}%
                        </span>
                      )}
                      {data.priceEvolution5y == null && (
                        <span className="ml-2 text-gray-400">Évolution des prix: données non disponibles</span>
                      )}
                    </div>
                  )}
                  {!data.commune && data.priceEvolution5y == null && (
                    <p className="text-xs text-gray-400">Évolution des prix: données non disponibles</p>
                  )}
                  {data.potentialScore != null && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Score de plus-value :</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getScoreBadgeColor(data.potentialScore)}`}>
                        {data.potentialScore}/100
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Flood zone */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Zone inondable</h4>
                <FloodBadge risk={data.floodRisk} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
