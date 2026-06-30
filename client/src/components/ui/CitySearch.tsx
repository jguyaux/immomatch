import { useState, useRef, useEffect } from "react";

const BELGIAN_CITIES = [
  "Aalst", "Aalter", "Aarschot", "Aartselaar", "Andenne", "Anderlecht", "Ans", "Antwerpen",
  "Arlon", "Asse", "Ath", "Aubange", "Auderghem",
  "Bastogne", "Beaumont", "Beauvechain", "Beringen", "Berlare", "Bierbeek", "Bilzen",
  "Binche", "Blankenberge", "Boom", "Borgerhout", "Boussu", "Braine-l'Alleud",
  "Braine-le-Comte", "Brasschaat", "Brugge", "Bruxelles",
  "Charleroi", "Chatelet", "Chaudfontaine", "Chaumont-Gistoux", "Ciney", "Comines-Warneton",
  "Courcelles", "Court-Saint-Etienne", "Couvin",
  "Damme", "Deinze", "Dendermonde", "Diest", "Dilbeek", "Dinant", "Dour", "Drogenbos",
  "Durbuy",
  "Edegem", "Eeklo", "Enghien", "Esneux", "Etterbeek", "Eupen", "Evere",
  "Farciennes", "Fleurus", "Fleron", "Fontaine-l'Eveque", "Foret", "Frameries",
  "Ganshoren", "Geel", "Gembloux", "Genappe", "Genk", "Gent", "Geraardsbergen",
  "Grace-Hollogne", "Grez-Doiceau", "Grimbergen",
  "Halle", "Ham-sur-Heure-Nalinnes", "Hamoir", "Hannut", "Hasselt", "Heist-op-den-Berg",
  "Helecine", "Herk-de-Stad", "Herstal", "Heusden-Zolder", "Huy",
  "Ieper", "Incourt", "Ixelles",
  "Jette", "Jodoigne",
  "Koekelberg", "Knokke-Heist", "Kortenberg", "Kortrijk",
  "La Louviere", "Lasne", "Leerbeek", "Lessines", "Leuven", "Libramont",
  "Liege", "Lier", "Lillois", "Louvain-la-Neuve", "Lommel",
  "Machelen", "Malmedy", "Manage", "Marche-en-Famenne", "Mechelen", "Merelbeke",
  "Messancy", "Mettet", "Molenbeek-Saint-Jean", "Mons", "Mont-Saint-Guibert",
  "Mouscron", "Namur", "Nassogne", "Neder-Over-Heembeek", "Nivelles",
  "Ohey", "Ottignies-Louvain-la-Neuve", "Oudenaarde", "Oupeye",
  "Perwez", "Philippeville", "Profondeville",
  "Quaregnon", "Quevy",
  "Rixensart", "Rochefort", "Roeselare", "Ronse",
  "Saint-Gilles", "Saint-Josse-ten-Noode", "Saint-Nicolas", "Sambreville",
  "Schaerbeek", "Seraing", "Silly", "Sint-Niklaas", "Sint-Pieters-Leeuw",
  "Soignies", "Spa", "Stavelot",
  "Tamines", "Tervuren", "Thuin", "Tienen", "Tongeren", "Tournai", "Tubize", "Turnhout",
  "Uccle",
  "Verviers", "Veurne", "Villers-la-Ville", "Vilvoorde", "Vise",
  "Waremme", "Waterloo", "Watermael-Boitsfort", "Wavre", "Wemmel",
  "Woluwe-Saint-Lambert", "Woluwe-Saint-Pierre",
  "Zaventem", "Zele", "Zottegem",
];

interface CitySearchProps {
  selected: string[];
  onChange: (cities: string[]) => void;
}

export function CitySearch({ selected, onChange }: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = query.length >= 2
    ? BELGIAN_CITIES.filter(
        (city) =>
          city.toLowerCase().includes(query.toLowerCase()) &&
          !selected.includes(city)
      ).slice(0, 8)
    : [];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addCity = (city: string) => {
    if (!selected.includes(city)) {
      onChange([...selected, city]);
    }
    setQuery("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const addCustomCity = () => {
    const trimmed = query.trim();
    if (trimmed.length >= 2 && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
      setQuery("");
    }
  };

  const removeCity = (city: string) => {
    onChange(selected.filter((c) => c !== city));
  };

  return (
    <div ref={containerRef} className="relative">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map((city) => (
            <span
              key={city}
              className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
            >
              {city}
              <button
                type="button"
                onClick={() => removeCity(city)}
                className="text-primary-500 hover:text-primary-800 font-bold"
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (suggestions.length > 0) {
              addCity(suggestions[0]);
            } else {
              addCustomCity();
            }
          }
        }}
        placeholder="Tapez une ville ou commune (ex: Namur, Wavre, Ixelles...)"
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((city) => (
            <li key={city}>
              <button
                type="button"
                onClick={() => addCity(city)}
                className="w-full text-left px-4 py-2 hover:bg-primary-50 text-sm"
              >
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
