import { useNavigate } from "react-router-dom";
import type { PropertyMatch } from "../../../../shared/types";
import { PhotoCarousel } from "./PhotoCarousel";
import { useCompare } from "../../App";
import { getDisplayTitle } from "../../utils/formatters";
import { NeighborhoodCard } from "./NeighborhoodCard";
import { FinancialAnalysisCard } from "./FinancialAnalysisCard";

interface PropertyCardProps {
  match: PropertyMatch;
  onFavorite: (id: string, isFavorite: boolean) => void;
  onDismiss: (id: string) => void;
  onDetail?: (match: PropertyMatch) => void;
}

function getSourceLabel(source: string): { label: string; color: string } {
  const s = source.toLowerCase();
  if (s.includes("biddit")) return { label: "Biddit", color: "bg-orange-500 text-white" };
  if (s.includes("trevi")) return { label: "Trevi", color: "bg-emerald-600 text-white" };
  return { label: "Immoweb", color: "bg-blue-600 text-white" };
}

function getSourceLink(source: string): string {
  const s = source.toLowerCase();
  if (s.includes("biddit")) return "Voir sur Biddit";
  if (s.includes("trevi")) return "Voir sur Trevi";
  return "Voir sur Immoweb";
}

function getPricePerSqm(price: number, surface: number | null): number | null {
  if (!surface || surface === 0) return null;
  return Math.round(price / surface);
}

function getPricePerSqmColor(pricePerSqm: number, propertyType: string): string {
  const avg = propertyType === "appartement" || propertyType === "studio" || propertyType === "duplex"
    ? 3000
    : 2500;
  if (pricePerSqm <= avg * 0.85) return "text-green-600";
  if (pricePerSqm <= avg * 1.15) return "text-gray-600";
  return "text-red-600";
}

function getScoreStyle(score: number): string {
  if (score >= 80) return "from-green-400 to-green-600 text-white";
  if (score >= 60) return "from-yellow-400 to-amber-500 text-white";
  if (score >= 40) return "from-orange-400 to-orange-600 text-white";
  return "from-red-400 to-red-600 text-white";
}

export function PropertyCard({ match, onFavorite, onDismiss, onDetail }: PropertyCardProps) {
  if (!match.property) return null;
  const property = match.property;
  const navigate = useNavigate();
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();

  const sourceInfo = getSourceLabel(property.source);
  const pricePerSqm = getPricePerSqm(property.price, property.surface);
  const scoreStyle = getScoreStyle(match.score);
  const inCompare = isInCompare(match.id);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <div className="relative">
        <PhotoCarousel images={property.imageUrls} alt={property.title} />

        {/* Score badge - larger and gradient */}
        <div className={`absolute top-3 right-3 w-14 h-14 rounded-full bg-gradient-to-br ${scoreStyle} flex flex-col items-center justify-center shadow-lg`}>
          <span className="text-lg font-bold leading-none">{match.score}</span>
          <span className="text-[9px] opacity-80 leading-none">/100</span>
        </div>

        {/* Source badge */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm ${sourceInfo.color}`}>
          {sourceInfo.label}
        </span>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 flex-1">{getDisplayTitle(property)}</h3>
          <div className="text-right ml-3 flex-shrink-0">
            <span className="text-lg font-bold text-primary-600 whitespace-nowrap">
              {property.price.toLocaleString("fr-BE")} €
            </span>
            {pricePerSqm && (
              <div className={`text-xs font-medium ${getPricePerSqmColor(pricePerSqm, property.propertyType)}`}>
                {pricePerSqm.toLocaleString("fr-BE")} €/m²
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-3">
          {property.city} {property.zipCode && `(${property.zipCode})`}
        </p>

        <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-3">
          {property.bedrooms != null && (
            <span className="bg-gray-100 px-2 py-0.5 rounded-md">{property.bedrooms} ch.</span>
          )}
          {property.bathrooms != null && (
            <span className="bg-gray-100 px-2 py-0.5 rounded-md">{property.bathrooms} sdb</span>
          )}
          {property.surface != null && (
            <span className="bg-gray-100 px-2 py-0.5 rounded-md">{property.surface} m²</span>
          )}
          {property.pebScore && (
            <span className="bg-gray-100 px-2 py-0.5 rounded-md">PEB {property.pebScore}</span>
          )}
          <span className="bg-gray-100 px-2 py-0.5 rounded-md capitalize">{property.propertyType}</span>
        </div>

        <p className="text-sm text-gray-700 mb-3 line-clamp-2">{match.reasoning}</p>

        {match.strengths.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {match.strengths.map((s, i) => (
              <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                {s}
              </span>
            ))}
          </div>
        )}

        {match.weaknesses.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {match.weaknesses.map((w, i) => (
              <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                {w}
              </span>
            ))}
          </div>
        )}

        <NeighborhoodCard propertyId={property.id} hasCoords={!!(property.latitude && property.longitude)} />

        <FinancialAnalysisCard match={match} />

        <div className="flex flex-wrap gap-2 pt-3 border-t">
          {onDetail && (
            <button
              onClick={() => onDetail(match)}
              className="w-full py-1.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition mb-1"
            >
              Voir le détail complet
            </button>
          )}
          <button
            onClick={() => onFavorite(match.id, !match.isFavorite)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
              match.isFavorite
                ? "bg-red-50 text-red-600"
                : "bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600"
            }`}
          >
            {match.isFavorite ? "Favori" : "Favoris"}
          </button>
          <a
            href={property.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-1.5 rounded-lg text-sm font-medium bg-primary-50 text-primary-600 hover:bg-primary-100 text-center transition"
          >
            {getSourceLink(property.source)}
          </a>
          <button
            onClick={() => navigate(`/credit?price=${property.price}`)}
            className="py-1.5 px-3 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
            title="Simuler le crédit"
          >
            Crédit
          </button>
          <button
            onClick={() => inCompare ? removeFromCompare(match.id) : addToCompare(match)}
            className={`py-1.5 px-3 rounded-lg text-sm font-medium transition ${
              inCompare ? "bg-primary-100 text-primary-700" : "bg-gray-50 text-gray-500 hover:bg-primary-50 hover:text-primary-600"
            }`}
          >
            {inCompare ? "Comparer -" : "Comparer"}
          </button>
          <button
            onClick={() => onDismiss(match.id)}
            className="py-1.5 px-3 rounded-lg text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
          >
            Masquer
          </button>
        </div>
      </div>
    </div>
  );
}
