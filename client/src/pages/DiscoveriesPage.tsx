import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import type { PropertyMatch } from "../../../shared/types";
import { PhotoCarousel } from "../components/properties/PhotoCarousel";
import { NeighborhoodCard } from "../components/properties/NeighborhoodCard";
import { FinancialAnalysisCard } from "../components/properties/FinancialAnalysisCard";

interface DiscoveriesPageProps {
  onCountChange?: (count: number) => void;
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
  const [hasCriteria, setHasCriteria] = useState<boolean | null>(null);

  useEffect(() => {
    loadDiscoveries();
    api.getPreferences()
      .then((data: unknown) => {
        const result = data as { preferences: Record<string, unknown> | null };
        setHasCriteria(!!(result.preferences && result.preferences.budget_max));
      })
      .catch(() => setHasCriteria(false));
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
    try {
      await api.scanProperties();
      setScanResult("Scan lancé ! Les résultats apparaîtront dans les Découvertes dans 2-5 minutes. Revenez ici pour les voir.");
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

  return (
    <div>
      {/* Étape 1 — Critères manquants */}
      {hasCriteria === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="text-3xl">🎯</div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 text-base">Commencez par définir vos critères</h3>
            <p className="text-sm text-amber-700 mt-1">
              ImmoMatch se base sur vos critères pour trouver les biens qui vous correspondent.
              Sans critères, le scan ne peut pas fonctionner.
            </p>
          </div>
          <Link
            to="/preferences"
            className="flex-shrink-0 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition text-sm"
          >
            Définir mes critères →
          </Link>
        </div>
      )}

      {/* Scan */}
      <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold">Scanner des biens</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Immoweb, Biddit et Trevi — filtrés selon vos critères
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning || hasCriteria === false}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium whitespace-nowrap text-sm transition"
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

      <h2 className="text-xl font-bold mb-1">Découvertes</h2>
      <p className="text-gray-500 text-sm mb-4">
        Biens trouvés automatiquement. Validez ceux qui vous intéressent pour les ajouter à vos matchs.
      </p>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : discoveries.length === 0 ? (
        <div className="text-center py-16">
          {hasCriteria === false ? (
            <>
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-gray-700 text-lg font-medium">Aucun résultat pour l'instant</p>
              <p className="text-gray-400 mt-2 text-sm">
                Définissez vos critères, puis lancez un scan.
              </p>
              <Link
                to="/preferences"
                className="inline-block mt-4 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition text-sm"
              >
                Définir mes critères
              </Link>
            </>
          ) : (
            <>
              <p className="text-4xl mb-4">🏠</p>
              <p className="text-gray-700 text-lg font-medium">Aucune découverte en attente</p>
              <p className="text-gray-400 mt-2 text-sm">
                Lancez un scan pour trouver de nouveaux biens.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-3">{discoveries.length} bien{discoveries.length > 1 ? "s" : ""} trouvé{discoveries.length > 1 ? "s" : ""}</p>
          <div className="space-y-4">
            {discoveries.map((match) => {
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

                      <NeighborhoodCard propertyId={property.id} hasCoords={!!(property.latitude && property.longitude)} />

                      <FinancialAnalysisCard match={match} />

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
                          title="Pas intéressé"
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
