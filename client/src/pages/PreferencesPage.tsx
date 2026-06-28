import { useState, useEffect } from "react";
import { PreferencesForm } from "../components/questionnaire/PreferencesForm";
import { api } from "../services/api";

export function PreferencesPage() {
  const [initialData, setInitialData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .getPreferences()
      .then((data: unknown) => {
        const result = data as { preferences: Record<string, unknown> | null };
        if (result.preferences) {
          setInitialData(result.preferences);
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
