import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { PropertyMatch } from "../../../../shared/types";
import { PhotoCarousel } from "./PhotoCarousel";
import { NeighborhoodCard } from "./NeighborhoodCard";
import { FinancialAnalysisCard } from "./FinancialAnalysisCard";

interface Props {
  match: PropertyMatch;
  onClose: () => void;
  onFavorite: (id: string, isFavorite: boolean) => void;
  onDismiss: (id: string) => void;
}

function getSourceLabel(source: string): { label: string; color: string } {
  const s = source.toLowerCase();
  if (s.includes("biddit")) return { label: "Biddit", color: "bg-orange-500 text-white" };
  if (s.includes("trevi")) return { label: "Trevi", color: "bg-emerald-600 text-white" };
  return { label: "Immoweb", color: "bg-blue-600 text-white" };
}

function getScoreStyle(score: number): string {
  if (score >= 80) return "from-green-400 to-green-600";
  if (score >= 60) return "from-yellow-400 to-amber-500";
  return "from-orange-400 to-orange-600";
}

function getPebColor(peb: string): string {
  const colors: Record<string, string> = {
    A: "bg-green-600", "A+": "bg-green-700", "A++": "bg-green-800",
    B: "bg-lime-500", C: "bg-yellow-400 text-gray-800",
    D: "bg-orange-400", E: "bg-orange-500", F: "bg-red-500", G: "bg-red-700",
  };
  return colors[peb] ?? "bg-gray-400";
}

export function PropertyDetailModal({ match, onClose, onFavorite, onDismiss }: Props) {
  const navigate = useNavigate();
  const property = match.property;
  if (!property) return null;

  const sourceInfo = getSourceLabel(property.source);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow text-gray-600 hover:text-gray-900 transition"
        >
          ✕
        </button>

        {/* Photos */}
        <div className="relative rounded-t-2xl overflow-hidden">
          <PhotoCarousel images={property.imageUrls} alt={property.title} className="w-full h-64 sm:h-80" />
          <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm ${sourceInfo.color}`}>
            {sourceInfo.label}
          </span>
          <div className={`absolute top-3 right-14 w-14 h-14 rounded-full bg-gradient-to-br ${getScoreStyle(match.score)} text-white flex flex-col items-center justify-center shadow-lg`}>
            <span className="text-lg font-bold leading-none">{match.score}</span>
            <span className="text-[9px] opacity-80">/100</span>
          </div>
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {/* Header */}
          <div>
            <div className="flex justify-between items-start gap-4">
              <h2 className="text-xl font-bold leading-tight">{property.title}</h2>
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-primary-600">{property.price.toLocaleString("fr-BE")} €</p>
                {property.surface && (
                  <p className="text-sm text-gray-500">{Math.round(property.price / property.surface).toLocaleString("fr-BE")} €/m²</p>
                )}
              </div>
            </div>
            <p className="text-gray-500 mt-1">{property.address || property.city}{property.zipCode ? ` — ${property.zipCode}` : ""}</p>
          </div>

          {/* Chips */}
          <div className="flex flex-wrap gap-2">
            {property.bedrooms != null && <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{property.bedrooms} chambre{property.bedrooms > 1 ? "s" : ""}</span>}
            {property.bathrooms != null && <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{property.bathrooms} salle{property.bathrooms > 1 ? "s" : ""} de bain</span>}
            {property.surface != null && <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{property.surface} m² habitables</span>}
            {property.landSurface != null && <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{property.landSurface} m² terrain</span>}
            <span className="bg-gray-100 px-3 py-1 rounded-full text-sm capitalize">{property.propertyType}</span>
            {property.pebScore && (
              <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${getPebColor(property.pebScore)}`}>
                PEB {property.pebScore}
              </span>
            )}
          </div>

          {/* AI Analysis */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">Analyse IA</h3>
            <p className="text-sm text-gray-700">{match.reasoning}</p>
            {match.strengths.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Points forts</p>
                <div className="flex flex-wrap gap-1.5">
                  {match.strengths.map((s, i) => (
                    <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {match.weaknesses.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Points faibles</p>
                <div className="flex flex-wrap gap-1.5">
                  {match.weaknesses.map((w, i) => (
                    <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full">{w}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{property.description}</p>
            </div>
          )}

          {/* Features */}
          {property.features && property.features.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Équipements</h3>
              <div className="flex flex-wrap gap-2">
                {property.features.map((f: string, i: number) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* Neighborhood */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Quartier</h3>
            <NeighborhoodCard propertyId={property.id} hasCoords={!!(property.latitude && property.longitude)} />
          </div>

          {/* Financial */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Analyse financière</h3>
            <FinancialAnalysisCard match={match} />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2 border-t">
            <a
              href={property.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 text-center transition"
            >
              Voir l'annonce originale
            </a>
            <button
              onClick={() => navigate(`/credit?price=${property.price}`)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
            >
              Simuler le crédit
            </button>
            <button
              onClick={() => { onFavorite(match.id, !match.isFavorite); }}
              className={`py-2.5 px-4 rounded-xl text-sm font-medium transition ${match.isFavorite ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600"}`}
            >
              {match.isFavorite ? "Favori" : "Favoris"}
            </button>
            <button
              onClick={() => { onDismiss(match.id); onClose(); }}
              className="py-2.5 px-4 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
            >
              Masquer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
