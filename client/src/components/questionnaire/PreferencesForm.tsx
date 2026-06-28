import { useState, FormEvent } from "react";
import type { PropertyType, PebScore } from "../../../../shared/types";

const PROPERTY_TYPES: PropertyType[] = [
  "maison", "appartement", "studio", "duplex", "villa", "terrain", "immeuble",
];

const PEB_SCORES: PebScore[] = ["A", "B", "C", "D", "E", "F", "G"];

const BELGIAN_PROVINCES = [
  "Bruxelles-Capitale",
  "Brabant wallon",
  "Brabant flamand",
  "Hainaut",
  "Liege",
  "Luxembourg",
  "Namur",
  "Anvers",
  "Flandre occidentale",
  "Flandre orientale",
  "Limbourg",
];

const COMMON_FEATURES = [
  "Jardin", "Terrasse", "Garage", "Parking", "Cave",
  "Grenier", "Ascenseur", "Piscine", "Alarme",
  "Panneaux solaires", "Proche transports", "Proche ecoles",
];

interface PreferencesFormProps {
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
}

interface FormData {
  budgetMin: number;
  budgetMax: number;
  zones: string[];
  propertyTypes: PropertyType[];
  bedroomsMin: number;
  bedroomsMax: number | null;
  surfaceMin: number | null;
  surfaceMax: number | null;
  pebScores: PebScore[];
  features: string[];
  dealBreakers: string[];
  notes: string | null;
}

export function PreferencesForm({ initialData, onSubmit }: PreferencesFormProps) {
  const [form, setForm] = useState<FormData>({
    budgetMin: initialData?.budgetMin ?? 100000,
    budgetMax: initialData?.budgetMax ?? 400000,
    zones: initialData?.zones ?? [],
    propertyTypes: initialData?.propertyTypes ?? [],
    bedroomsMin: initialData?.bedroomsMin ?? 1,
    bedroomsMax: initialData?.bedroomsMax ?? null,
    surfaceMin: initialData?.surfaceMin ?? null,
    surfaceMax: initialData?.surfaceMax ?? null,
    pebScores: initialData?.pebScores ?? [],
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
        <h3 className="text-lg font-semibold mb-3">Budget</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Minimum</label>
            <input
              type="number"
              value={form.budgetMin}
              onChange={(e) => setForm({ ...form, budgetMin: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg"
              step={10000}
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Maximum</label>
            <input
              type="number"
              value={form.budgetMax}
              onChange={(e) => setForm({ ...form, budgetMax: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg"
              step={10000}
              min={0}
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Zones</h3>
        <div className="flex flex-wrap gap-2">
          {BELGIAN_PROVINCES.map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => setForm({ ...form, zones: toggleArrayItem(form.zones, zone) })}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                form.zones.includes(zone)
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-primary-400"
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
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
        <h3 className="text-lg font-semibold mb-3">Chambres</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Minimum</label>
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
            <label className="block text-sm font-medium mb-1">Maximum (optionnel)</label>
            <input
              type="number"
              value={form.bedroomsMax ?? ""}
              onChange={(e) =>
                setForm({ ...form, bedroomsMax: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-3 py-2 border rounded-lg"
              min={0}
              max={10}
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Surface (m2)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Minimum</label>
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
            <label className="block text-sm font-medium mb-1">Maximum</label>
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
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Score PEB accepte</h3>
        <div className="flex gap-2">
          {PEB_SCORES.map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => setForm({ ...form, pebScores: toggleArrayItem(form.pebScores, score) })}
              className={`w-10 h-10 rounded-lg text-sm font-bold border transition ${
                form.pebScores.includes(score)
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-primary-400"
              }`}
            >
              {score}
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
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-primary-400"
              }`}
            >
              {feature}
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
          placeholder="Precisez vos criteres importants, ce que vous recherchez en priorite..."
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
