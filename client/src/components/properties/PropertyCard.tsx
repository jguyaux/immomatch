import type { PropertyMatch } from "../../../../shared/types";

interface PropertyCardProps {
  match: PropertyMatch;
  onFavorite: (id: string, isFavorite: boolean) => void;
  onDismiss: (id: string) => void;
}

export function PropertyCard({ match, onFavorite, onDismiss }: PropertyCardProps) {
  const property = match.property!;

  const scoreColor =
    match.score >= 80 ? "text-green-600 bg-green-50" :
    match.score >= 60 ? "text-yellow-600 bg-yellow-50" :
    match.score >= 40 ? "text-orange-600 bg-orange-50" :
    "text-red-600 bg-red-50";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
      <div className="relative">
        {property.imageUrls[0] ? (
          <img
            src={property.imageUrls[0]}
            alt={property.title}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">
            Pas d'image
          </div>
        )}
        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full font-bold text-lg ${scoreColor}`}>
          {match.score}/100
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg leading-tight">{property.title}</h3>
          <span className="text-lg font-bold text-primary-600 whitespace-nowrap ml-2">
            {property.price.toLocaleString("fr-BE")} €
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-3">
          {property.city} {property.zipCode && `(${property.zipCode})`}
        </p>

        <div className="flex gap-3 text-sm text-gray-600 mb-3">
          {property.bedrooms != null && <span>{property.bedrooms} ch.</span>}
          {property.surface != null && <span>{property.surface} m2</span>}
          {property.pebScore && <span>PEB {property.pebScore}</span>}
          <span className="capitalize">{property.propertyType}</span>
        </div>

        <p className="text-sm text-gray-700 mb-3">{match.reasoning}</p>

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

        <div className="flex gap-2 pt-2 border-t">
          <button
            onClick={() => onFavorite(match.id, !match.isFavorite)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
              match.isFavorite
                ? "bg-red-50 text-red-600"
                : "bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600"
            }`}
          >
            {match.isFavorite ? "Favori" : "Ajouter aux favoris"}
          </button>
          <a
            href={property.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-1.5 rounded-lg text-sm font-medium bg-primary-50 text-primary-600 hover:bg-primary-100 text-center transition"
          >
            Voir sur Immoweb
          </a>
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
