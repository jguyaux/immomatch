import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import type { PropertyMatch } from "../../../shared/types";
import { PhotoCarousel } from "../components/properties/PhotoCarousel";
import { NeighborhoodCard } from "../components/properties/NeighborhoodCard";
import { FinancialAnalysisCard } from "../components/properties/FinancialAnalysisCard";

interface ScanProgress {
  status: "idle" | "running" | "done" | "error";
  step: number;
  total: number;
  source: string;
  message: string;
  imported: number;
  matched: number;
}

const SCAN_STEPS = ["Immoweb", "Biddit", "Trevi", "Matching"];
const STEP_ICONS: Record<string, string> = {
  Immoweb: "🏠", Biddit: "🔨", Trevi: "🏢", Matching: "✨", init: "🚀",
};

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

const SCORE_FILTERS = [
  { label: "Tous", value: 50 },
  { label: "≥ 65", value: 65 },
  { label: "≥ 75", value: 75 },
  { label: "≥ 85", value: 85 },
] as const;

export function DiscoveriesPage({ onCountChange }: DiscoveriesPageProps) {
  const [discoveries, setDiscoveries] = useState<PropertyMatch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [sourceResults, setSourceResults] = useState<Record<string, number>>({});
  const [hasCriteria, setHasCriteria] = useState<boolean | null>(null);
  const [minScore, setMinScore] = useState(50);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadDiscoveries(minScore);
    api.getPreferences()
      .then((data: unknown) => {
        const result = data as { preferences: Record<string, unknown> | null };
        setHasCriteria(!!(result.preferences && result.preferences.budget_max));
      })
      .catch(() => setHasCriteria(false));

    // Reprendre le polling si un scan était déjà en cours (rechargement de page)
    api.getScanProgress()
      .then((p: unknown) => {
        const prog = p as ScanProgress;
        if (prog.status === "running") {
          setScanning(true);
          setScanProgress(prog);
          startPolling();
        }
      })
      .catch(() => {});

    return () => stopPolling();
  }, []);

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const p = (await api.getScanProgress()) as ScanProgress;
        setScanProgress(p);
        // Capturer le nombre de biens par source quand une étape se termine
        if (p.source && ["Immoweb", "Biddit", "Trevi"].includes(p.source)) {
          const countMatch = p.message.match(/^(\d+) biens? trouvés?/);
          if (countMatch) {
            setSourceResults((prev) => ({ ...prev, [p.source]: parseInt(countMatch[1]) }));
          }
        }
        if (p.status === "done" || p.status === "error") {
          stopPolling();
          setScanning(false);
          if (p.status === "done") loadDiscoveries();
        }
      } catch {
        stopPolling();
        setScanning(false);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const loadDiscoveries = async (score = minScore) => {
    setLoading(true);
    setPage(1);
    try {
      const data = (await api.getDiscoveries(1, score)) as { discoveries: PropertyMatch[]; pagination: { total: number } };
      const list = data.discoveries || [];
      setDiscoveries(list);
      setTotal(data.pagination?.total ?? list.length);
      onCountChange?.(data.pagination?.total ?? list.length);
    } catch (err) {
      console.error("Erreur chargement decouvertes:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = (await api.getDiscoveries(nextPage, minScore)) as { discoveries: PropertyMatch[]; pagination: { total: number } };
      const newItems = data.discoveries || [];
      setDiscoveries((prev) => [...prev, ...newItems]);
      setPage(nextPage);
      setTotal(data.pagination?.total ?? 0);
    } catch (err) {
      console.error("Erreur chargement suivant:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScoreFilter = (score: number) => {
    setMinScore(score);
    setDiscoveries([]);
    loadDiscoveries(score);
  };

  const handleScan = async () => {
    setScanning(true);
    setScanProgress(null);
    setSourceResults({});
    try {
      await api.scanProperties();
      startPolling();
    } catch (err) {
      setScanProgress({ status: "error", step: 0, total: 4, source: "", message: err instanceof Error ? err.message : "Erreur lors du lancement du scan", imported: 0, matched: 0 });
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

        {/* Barre de progression */}
        {(scanning || scanProgress?.status === "done" || scanProgress?.status === "error") && scanProgress && (
          <div className="mt-4">
            {/* Étapes */}
            <div className="flex items-center gap-1 mb-3">
              {SCAN_STEPS.map((step, i) => {
                const stepNum = i + 1;
                const isDone = scanProgress.step > stepNum || scanProgress.status === "done";
                const isActive = scanProgress.source === step || (scanProgress.step === stepNum && scanning);
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className={`flex-1 flex flex-col items-center gap-1`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                        isDone ? "bg-green-500 text-white" :
                        isActive ? "bg-blue-500 text-white animate-pulse" :
                        "bg-gray-100 text-gray-400"
                      }`}>
                        {isDone ? "✓" : STEP_ICONS[step] || "•"}
                      </div>
                      <span className={`text-[10px] font-medium ${isActive ? "text-blue-600" : isDone ? "text-green-600" : "text-gray-400"}`}>
                        {step}
                      </span>
                    </div>
                    {i < SCAN_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-4 transition-all ${isDone ? "bg-green-400" : "bg-gray-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Barre de progression globale */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${
                  scanProgress.status === "done" ? "bg-green-500" :
                  scanProgress.status === "error" ? "bg-red-400" : "bg-blue-500"
                }`}
                style={{ width: `${scanProgress.status === "done" ? 100 : (scanProgress.step / scanProgress.total) * 100}%` }}
              />
            </div>

            {/* Message + résultats par source */}
            <p className={`text-xs mt-1 ${
              scanProgress.status === "error" ? "text-red-500" :
              scanProgress.status === "done" ? "text-green-600 font-medium" : "text-gray-500"
            }`}>
              {scanProgress.message}
            </p>
            {Object.keys(sourceResults).length > 0 && (
              <div className="flex gap-3 mt-2">
                {["Immoweb", "Biddit", "Trevi"].filter((s) => s in sourceResults).map((s) => (
                  <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    sourceResults[s] === 0 ? "bg-gray-100 text-gray-400" : "bg-green-50 text-green-700"
                  }`}>
                    {s}: {sourceResults[s]} bien{sourceResults[s] > 1 ? "s" : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold mb-0.5">Découvertes</h2>
          <p className="text-gray-500 text-sm">
            Biens trouvés automatiquement. Validez ceux qui vous intéressent pour les ajouter à vos matchs.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl p-1 self-start sm:self-auto flex-shrink-0">
          {SCORE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleScoreFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                minScore === f.value
                  ? "bg-white shadow text-gray-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

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
          <p className="text-sm text-gray-400 mb-3">{total} bien{total > 1 ? "s" : ""} trouvé{total > 1 ? "s" : ""}</p>
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
          {discoveries.length < total && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-6 w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {loadingMore ? "Chargement..." : `Voir plus (${total - discoveries.length} restants)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
