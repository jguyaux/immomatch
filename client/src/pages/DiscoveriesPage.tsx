import { useState, useEffect, useMemo } from "react";
import { api } from "../services/api";
import type { PropertyMatch, PropertyType } from "../../../shared/types";
import { PhotoCarousel } from "../components/properties/PhotoCarousel";
import { NeighborhoodCard } from "../components/properties/NeighborhoodCard";

interface DiscoveriesPageProps {
  onCountChange?: (count: number) => void;
}

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "maison", label: "Maison" },
  { value: "appartement", label: "Appartement" },
  { value: "studio", label: "Studio" },
  { value: "duplex", label: "Duplex" },
  { value: "villa", label: "Villa" },
  { value: "terrain", label: "Terrain" },
  { value: "immeuble", label: "Immeuble" },
];

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

function getSourceLabel(source: string): { label: string; color: string } {
  const s = source.toLowerCase();
  if (s.includes("biddit")) return { label: "Biddit", color: "bg-orange-500 text-white" };
  if (s.includes("trevi")) return { label: "Trevi", color: "bg-emerald-600 text-white" };
  return { label: "Immoweb", color: "bg-blue-600 text-white" };
}

export function DiscoveriesPage({ onCountChange }: DiscoveriesPageProps) {
  const [discoveries, setDiscoveries] = useState<PropertyMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<{ step: number; total: number; source: string; message: string } | null>(null);

  // Filter state
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [minBedrooms, setMinBedrooms] = useState<string>("");
  const [minSurface, setMinSurface] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>([]);

  useEffect(() => {
    loadDiscoveries();
  }, []);

  const loadDiscoveries = async () => {
    setLoading(true);
    try {
      const data = (await api.getDiscoveries()) as { discoveries: PropertyMatch[] };
      const list = data.discoveries || [];
      setDiscoveries(list);
      onCountChange?.(list.length);
    } catch (err) {
      console.error("Erreur chargement decouvertes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    setScanProgress(null);
    try {
      await api.scanProperties();
      setScanResult("Scan lance ! Les resultats apparaitront dans les Decouvertes dans 2-5 minutes. Revenez ici pour les voir.");
      setTimeout(() => loadDiscoveries(), 10000);
    } catch (err) {
      setScanResult(err instanceof Error ? err.message : "Erreur lors du lancement du scan");
    } finally {
      setScanning(false);
    }
  };

  const handleValidate = async (id: string) => {
    await api.validateMatch(id);
    setDiscoveries((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      onCountChange?.(updated.length);
      return updated;
    });
  };

  const handleDismiss = async (id: string) => {
    await api.updateMatch(id, { isDismissed: true });
    setDiscoveries((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      onCountChange?.(updated.length);
      return updated;
    });
  };

  const toggleType = (type: PropertyType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const resetFilters = () => {
    setPriceMin("");
    setPriceMax("");
    setMinBedrooms("");
    setMinSurface("");
    setSelectedTypes([]);
  };

  const hasActiveFilters = priceMin || priceMax || minBedrooms || minSurface || selectedTypes.length > 0;

  const filteredDiscoveries = useMemo(() => {
    return discoveries.filter((match) => {
      const p = match.property;
      if (!p) return false;

      if (priceMin && p.price < parseInt(priceMin)) return false;
      if (priceMax && p.price > parseInt(priceMax)) return false;
      if (minBedrooms && (p.bedrooms == null || p.bedrooms < parseInt(minBedrooms))) return false;
      if (minSurface && (p.surface == null || p.surface < parseInt(minSurface))) return false;
      if (selectedTypes.length > 0 && !selectedTypes.includes(p.propertyType)) return false;

      return true;
    });
  }, [discoveries, priceMin, priceMax, minBedrooms, minSurface, selectedTypes]);

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Scanner des biens</h3>
            <p className="text-sm text-gray-500">
              Scanne Immoweb, Biddit et Trevi pour trouver des biens correspondant a vos criteres
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium whitespace-nowrap"
          >
            {scanning ? "Scan en cours..." : "Lancer le scan"}
          </button>
        </div>
        {scanning && (
          <div className="mt-4 bg-blue-50 text-blue-700 p-3 rounded-lg text-sm">
            Lancement du scan en cours...
          </div>
        )}
        {scanResult && !scanning && (
          <div className="mt-4 bg-green-50 text-green-700 p-3 rounded-lg text-sm">
            {scanResult}
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold mb-2">Decouvertes</h2>
      <p className="text-gray-500 mb-4">
        Biens trouves automatiquement. Validez ceux qui vous interessent pour les ajouter a vos matchs.
      </p>

      {/* Quick filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Filtres rapides</h3>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium transition"
            >
              Reinitialiser
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Prix min (EUR)</label>
            <input
              type="number"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Prix max (EUR)</label>
            <input
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="Illimite"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Chambres min</label>
            <select
              value={minBedrooms}
              onChange={(e) => setMinBedrooms(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            >
              <option value="">Toutes</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Surface min (m2)</label>
            <input
              type="number"
              value={minSurface}
              onChange={(e) => setMinSurface(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Type de bien</label>
          <div className="flex flex-wrap gap-2">
            {PROPERTY_TYPES.map((pt) => (
              <button
                key={pt.value}
                onClick={() => toggleType(pt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  selectedTypes.includes(pt.value)
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : filteredDiscoveries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {hasActiveFilters ? "Aucun resultat avec ces filtres" : "Aucune decouverte en attente"}
          </p>
          <p className="text-gray-400 mt-2">
            {hasActiveFilters
              ? "Essayez d'elargir vos criteres de filtrage."
              : "Lancez un scan pour trouver de nouveaux biens."}
          </p>
        </div>
      ) : (
        <>
          {hasActiveFilters && (
            <p className="text-sm text-gray-500 mb-3">
              {filteredDiscoveries.length} resultat{filteredDiscoveries.length > 1 ? "s" : ""} sur {discoveries.length}
            </p>
          )}
          <div className="space-y-4">
            {filteredDiscoveries.map((match) => {
              const property = match.property;
              if (!property) return null;

              const scoreColor =
                match.score >= 80 ? "from-green-400 to-green-600 text-white" :
                match.score >= 60 ? "from-yellow-400 to-amber-500 text-white" :
                "from-orange-400 to-orange-600 text-white";

              const sourceInfo = getSourceLabel(property.source);
              const pricePerSqm = getPricePerSqm(property.price, property.surface);

              return (
                <div key={match.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row">
                    {/* Image avec carousel */}
                    <div className="relative flex-shrink-0">
                      <PhotoCarousel
                        images={property.imageUrls}
                        alt={property.title}
                        className="w-full h-48 sm:w-44 sm:h-44"
                      />
                      {/* Source badge — au-dessus du carousel */}
                      <span className={`absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md text-xs font-semibold shadow-sm pointer-events-none ${sourceInfo.color}`}>
                        {sourceInfo.label}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-3 sm:p-4 min-w-0">
                      {/* Header : titre + prix + score */}
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold leading-tight text-sm sm:text-base line-clamp-2">{property.title}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {property.city}{property.zipCode && ` (${property.zipCode})`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-sm sm:text-base font-bold text-primary-600 whitespace-nowrap">
                              {property.price.toLocaleString("fr-BE")} €
                            </div>
                            {pricePerSqm && (
                              <div className={`text-xs font-medium ${getPricePerSqmColor(pricePerSqm, property.propertyType)}`}>
                                {pricePerSqm.toLocaleString("fr-BE")} €/m²
                              </div>
                            )}
                          </div>
                          {/* Score circle */}
                          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${scoreColor} flex flex-col items-center justify-center shadow-md flex-shrink-0`}>
                            <span className="text-sm font-bold leading-none">{match.score}</span>
                            <span className="text-[8px] opacity-80 leading-none">/100</span>
                          </div>
                        </div>
                      </div>

                      {/* Chips */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {property.bedrooms != null && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded-md text-xs">{property.bedrooms} ch.</span>
                        )}
                        {property.bathrooms != null && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded-md text-xs">{property.bathrooms} sdb</span>
                        )}
                        {property.surface != null && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded-md text-xs">{property.surface} m²</span>
                        )}
                        {property.pebScore && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded-md text-xs">PEB {property.pebScore}</span>
                        )}
                        <span className="bg-gray-100 px-2 py-0.5 rounded-md text-xs capitalize">{property.propertyType}</span>
                      </div>

                      <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">{match.reasoning}</p>

                      <NeighborhoodCard propertyId={match.id} hasCoords={!!(property.latitude && property.longitude)} />

                      {/* Boutons */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          onClick={() => handleValidate(match.id)}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700 transition text-center"
                        >
                          Ajouter aux matchs
                        </button>
                        <a
                          href={property.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-primary-100 transition text-center"
                        >
                          Voir l'annonce
                        </a>
                        <button
                          onClick={() => handleDismiss(match.id)}
                          className="px-3 py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg text-xs sm:text-sm transition whitespace-nowrap"
                          title="Pas interessé"
                        >
                          ✕ Ignorer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
