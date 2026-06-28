import { useState, useEffect } from "react";
import { PropertyCard } from "../components/properties/PropertyCard";
import { api } from "../services/api";
import type { PropertyMatch } from "../../../../shared/types";

export function DashboardPage() {
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("score");

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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Vos matchs</h2>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="score">Score</option>
          <option value="price">Plus recents</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Aucun match pour le moment</p>
          <p className="text-gray-400 mt-2">
            Les biens seront analyses quotidiennement selon vos criteres.
          </p>
        </div>
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
