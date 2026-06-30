import { useState, useEffect } from "react";
import { PropertyCard } from "../components/properties/PropertyCard";
import { PropertyMap } from "../components/properties/PropertyMap";
import { ImportProperty } from "../components/properties/ImportProperty";
import { api } from "../services/api";
import type { PropertyMatch } from "../../../shared/types";

export function DashboardPage() {
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("score");
  const [view, setView] = useState<"list" | "map">("list");

  useEffect(() => {
    loadMatches();
  }, [sortBy]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = (await api.getMatches(1, sortBy)) as { matches: PropertyMatch[] };
      setMatches(data.matches || []);
    } catch (err) {
      console.error("Erreur chargement matchs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async (id: string, isFavorite: boolean) => {
    await api.updateMatch(id, { isFavorite });
    setMatches((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isFavorite } : m))
    );
  };

  const handleDismiss = async (id: string) => {
    await api.updateMatch(id, { isDismissed: true });
    setMatches((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div>
      <ImportProperty onImported={loadMatches} />

      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">
          Mes matchs
          {matches.length > 0 && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({matches.length})
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm font-medium transition ${
                view === "list" ? "bg-primary-600 text-white" : "bg-white text-gray-600"
              }`}
            >
              Liste
            </button>
            <button
              onClick={() => setView("map")}
              className={`px-3 py-1.5 text-sm font-medium transition ${
                view === "map" ? "bg-primary-600 text-white" : "bg-white text-gray-600"
              }`}
            >
              Carte
            </button>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="score">Score</option>
            <option value="recent">Plus recents</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Aucun match pour le moment</p>
          <p className="text-gray-400 mt-2">
            Collez un lien Immoweb ci-dessus ou validez des biens depuis l'onglet Decouvertes.
          </p>
        </div>
      ) : view === "map" ? (
        <PropertyMap matches={matches} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <PropertyCard
              key={match.id}
              match={match}
              onFavorite={handleFavorite}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}
