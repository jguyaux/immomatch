import { useState, FormEvent } from "react";
import { api } from "../../services/api";

interface ImportResult {
  property: {
    title: string;
    price: number;
    city: string | null;
    propertyType: string;
    bedrooms: number | null;
    surface: number | null;
    pebScore: string | null;
  };
  match: {
    score: number;
    reasoning: string;
    strengths: string[];
    weaknesses: string[];
  } | null;
  alreadyScored: boolean;
}

export function ImportProperty({ onImported }: { onImported: () => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const data = (await api.importProperty(url)) as ImportResult;
      setResult(data);
      setUrl("");
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <h3 className="text-lg font-semibold mb-4">Importer un bien Immoweb</h3>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.immoweb.be/fr/annonce/..."
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium whitespace-nowrap"
        >
          {loading ? "Import en cours..." : "Importer"}
        </button>
      </form>

      {error && (
        <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
      )}

      {result && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-green-800">{result.property.title}</p>
              <p className="text-sm text-green-700 mt-1">
                {result.property.price.toLocaleString("fr-BE")} € — {result.property.city}
                {result.property.bedrooms != null && ` — ${result.property.bedrooms} ch.`}
                {result.property.surface != null && ` — ${result.property.surface} m²`}
              </p>
            </div>
            {result.match && (
              <span className="text-2xl font-bold text-green-700">
                {result.match.score}/100
              </span>
            )}
          </div>
          {result.match && (
            <p className="text-sm text-green-700 mt-2">{result.match.reasoning}</p>
          )}
          {!result.match && (
            <p className="text-sm text-green-700 mt-2">
              Bien importe. Remplissez vos criteres pour obtenir un score IA.
            </p>
          )}
          {result.alreadyScored && (
            <p className="text-sm text-green-600 mt-1 italic">Ce bien avait deja ete score.</p>
          )}
        </div>
      )}
    </div>
  );
}
