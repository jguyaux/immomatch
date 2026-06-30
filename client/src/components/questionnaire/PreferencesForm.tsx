import { useState, FormEvent } from "react";
import type { PropertyType, PebScore } from "../../../../shared/types";
import { CitySearch } from "../ui/CitySearch";

const PROPERTY_TYPES: PropertyType[] = [
  "maison", "appartement", "studio", "duplex", "villa", "terrain", "immeuble",
];

const PEB_SCORES: PebScore[] = ["A", "B", "C", "D", "E", "F", "G"];

const COMMON_FEATURES = [
  "Jardin", "Terrasse", "Balcon", "Garage", "Parking", "Cave",
  "Grenier", "Ascenseur", "Piscine", "Alarme", "Climatisation",
  "Panneaux solaires", "Pompe a chaleur", "Double vitrage",
  "Cheminee", "Dressing", "Buanderie", "Bureau",
  "Proche transports", "Proche ecoles", "Proche commerces",
  "Quartier calme", "Vue degagee", "Nature alentour",
];

const DEAL_BREAKERS = [
  "Travaux importants", "Zone inondable", "Proximite autoroute",
  "Pas de jardin", "Pas de garage", "Rez-de-chaussee",
  "PEB F ou G", "Toiture a refaire", "Problemes d'humidite",
];

const PROPERTY_CONDITIONS = [
  "Neuf", "Excellent", "Bon", "A rafraichir", "A renover",
];

interface PreferencesFormProps {
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
}

type TransactionType = "achat" | "location";

interface FormData {
  transactionType: TransactionType;
  budgetMin: number;
  budgetMax: number;
  zones: string[];
  propertyTypes: PropertyType[];
  bedroomsMin: number;
  bedroomsMax: number | null;
  bathroomsMin: number;
  surfaceMin: number | null;
  surfaceMax: number | null;
  landSurfaceMin: number | null;
  pebScores: PebScore[];
  conditions: string[];
  features: string[];
  dealBreakers: string[];
  notes: string | null;
}

export function PreferencesForm({ initialData, onSubmit }: PreferencesFormProps) {
  const [form, setForm] = useState<FormData>({
    transactionType: initialData?.transactionType ?? "achat",
    budgetMin: initialData?.budgetMin ?? 100000,
    budgetMax: initialData?.budgetMax ?? 400000,
    zones: initialData?.zones ?? [],
    propertyTypes: initialData?.propertyTypes ?? [],
    bedroomsMin: initialData?.bedroomsMin ?? 1,
    bedroomsMax: initialData?.bedroomsMax ?? null,
    bathroomsMin: initialData?.bathroomsMin ?? 1,
    surfaceMin: initialData?.surfaceMin ?? null,
    surfaceMax: initialData?.surfaceMax ?? null,
    landSurfaceMin: initialData?.landSurfaceMin ?? null,
    pebScores: initialData?.pebScores ?? [],
    conditions: initialData?.conditions ?? [],
    features: initialData?.features ?? [],
    dealBreakers: initialData?.dealBreakers ?? [],
    notes: initialData?.notes ?? null,
  });
  const [loading, setLoading] = useState(false);

  const toggleArrayItem = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">
      <section>
        <h3 className="text-lg font-semibold mb-3">Type de recherche</h3>
        <div className="flex gap-3">
          {(["achat", "location"] as TransactionType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setForm({
                ...form,
                transactionType: type,
                budgetMin: type === "location" ? 500 : 100000,
                budgetMax: type === "location" ? 1500 : 400000,
              })}
              className={`flex-1 py-3 rounded-lg text-sm font-semibold border-2 transition ${
                form.transactionType === type
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-primary-400"
              }`}
            >
              {type === "achat" ? "Acheter" : "Louer"}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">
          {form.transactionType === "location" ? "Loyer mensuel" : "Budget"}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Minimum {form.transactionType === "location" ? "(EUR/mois)" : "(EUR)"}
            </label>
            <input
              type="number"
              value={form.budgetMin}
              onChange={(e) => setForm({ ...form, budgetMin: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg"
              step={form.transactionType === "location" ? 50 : 10000}
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Maximum {form.transactionType === "location" ? "(EUR/mois)" : "(EUR)"}
            </label>
            <input
              type="number"
              value={form.budgetMax}
              onChange={(e) => setForm({ ...form, budgetMax: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg"
              step={form.transactionType === "location" ? 50 : 10000}
              min={0}
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Localisation</h3>
        <p className="text-sm text-gray-500 mb-3">Ajoutez les villes ou communes ou vous cherchez</p>
        <CitySearch
          selected={form.zones}
          onChange={(zones) => setForm({ ...form, zones })}
        />
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Type de bien</h3>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setForm({ ...form, propertyTypes: toggleArrayItem(form.propertyTypes, type) })}
              className={`px-3 py-1.5 rounded-full text-sm border transition capitalize ${
                form.propertyTypes.includes(type)
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-primary-400"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Chambres & Salles de bain</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Chambres min</label>
            <input
              type="number"
              value={form.bedroomsMin}
              onChange={(e) => setForm({ ...form, bedroomsMin: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg"
              min={0}
              max={10}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Chambres max</label>
            <input
              type="number"
              value={form.bedroomsMax ?? ""}
              onChange={(e) =>
                setForm({ ...form, bedroomsMax: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-3 py-2 border rounded-lg"
              min={0}
              max={10}
              placeholder="Illimite"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SDB min</label>
            <input
              type="number"
              value={form.bathroomsMin}
              onChange={(e) => setForm({ ...form, bathroomsMin: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg"
              min={0}
              max={5}
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Superficie</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Habitable min (m2)</label>
            <input
              type="number"
              value={form.surfaceMin ?? ""}
              onChange={(e) =>
                setForm({ ...form, surfaceMin: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-3 py-2 border rounded-lg"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Habitable max (m2)</label>
            <input
              type="number"
              value={form.surfaceMax ?? ""}
              onChange={(e) =>
                setForm({ ...form, surfaceMax: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-3 py-2 border rounded-lg"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Terrain min (m2)</label>
            <input
              type="number"
              value={form.landSurfaceMin ?? ""}
              onChange={(e) =>
                setForm({ ...form, landSurfaceMin: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-3 py-2 border rounded-lg"
              min={0}
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Score PEB accepte</h3>
        <div className="flex gap-2">
          {PEB_SCORES.map((score) => {
            const pebColors: Record<string, string> = {
              A: "bg-green-600", B: "bg-green-500", C: "bg-yellow-500",
              D: "bg-orange-400", E: "bg-orange-500", F: "bg-red-500", G: "bg-red-600",
            };
            return (
              <button
                key={score}
                type="button"
                onClick={() => setForm({ ...form, pebScores: toggleArrayItem(form.pebScores, score) })}
                className={`w-10 h-10 rounded-lg text-sm font-bold border-2 transition ${
                  form.pebScores.includes(score)
                    ? `${pebColors[score]} text-white border-transparent`
                    : "bg-white text-gray-700 border-gray-300 hover:border-primary-400"
                }`}
              >
                {score}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Etat du bien</h3>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_CONDITIONS.map((condition) => (
            <button
              key={condition}
              type="button"
              onClick={() => setForm({ ...form, conditions: toggleArrayItem(form.conditions, condition) })}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                form.conditions.includes(condition)
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-primary-400"
              }`}
            >
              {condition}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Souhaits</h3>
        <div className="flex flex-wrap gap-2">
          {COMMON_FEATURES.map((feature) => (
            <button
              key={feature}
              type="button"
              onClick={() => setForm({ ...form, features: toggleArrayItem(form.features, feature) })}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                form.features.includes(feature)
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
              }`}
            >
              {feature}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Criteres eliminatoires</h3>
        <p className="text-sm text-gray-500 mb-3">Un bien avec ces criteres sera penalise fortement</p>
        <div className="flex flex-wrap gap-2">
          {DEAL_BREAKERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setForm({ ...form, dealBreakers: toggleArrayItem(form.dealBreakers, item) })}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                form.dealBreakers.includes(item)
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-red-400"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Notes supplementaires</h3>
        <textarea
          value={form.notes ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
          className="w-full px-3 py-2 border rounded-lg h-24 resize-none"
          placeholder="Precisez vos criteres importants, votre situation, ce que vous recherchez en priorite..."
        />
      </section>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium text-lg"
      >
        {loading ? "Sauvegarde..." : "Sauvegarder mes criteres"}
      </button>
    </form>
  );
}
