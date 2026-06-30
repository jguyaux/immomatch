import { useState, useEffect } from "react";
import { PreferencesForm } from "../components/questionnaire/PreferencesForm";
import { api } from "../services/api";

interface SupabasePreferences {
  transaction_type: string | null;
  budget_min: number;
  budget_max: number;
  zones: string[];
  property_types: string[];
  bedrooms_min: number;
  bedrooms_max: number | null;
  surface_min: number | null;
  surface_max: number | null;
  peb_scores: string[];
  features: string[];
  deal_breakers: string[];
  notes: string | null;
}

function mapFromSupabase(data: SupabasePreferences) {
  return {
    transactionType: data.transaction_type || "achat",
    budgetMin: data.budget_min,
    budgetMax: data.budget_max,
    zones: data.zones,
    propertyTypes: data.property_types,
    bedroomsMin: data.bedrooms_min,
    bedroomsMax: data.bedrooms_max,
    surfaceMin: data.surface_min,
    surfaceMax: data.surface_max,
    pebScores: data.peb_scores,
    features: data.features,
    dealBreakers: data.deal_breakers,
    notes: data.notes,
  };
}

export function PreferencesPage() {
  const [initialData, setInitialData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .getPreferences()
      .then((data: unknown) => {
        const result = data as { preferences: SupabasePreferences | null };
        if (result.preferences) {
          setInitialData(mapFromSupabase(result.preferences) as unknown as Record<string, unknown>);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (data: unknown) => {
    await api.savePreferences(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Mes criteres de recherche</h2>
      {saved && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-6 text-center">
          Criteres sauvegardes avec succes !
        </div>
      )}
      <PreferencesForm initialData={initialData ?? undefined} onSubmit={handleSubmit} />
    </div>
  );
}
