import { useState, useRef, useEffect } from "react";

const BELGIAN_REGIONS = [
  "Bruxelles-Capitale",
  "Brabant Wallon",
  "Province de Namur",
  "Province de Liège",
  "Province du Hainaut",
  "Province du Luxembourg",
  "Brabant Flamand",
  "Flandre Orientale",
  "Flandre Occidentale",
  "Province d'Anvers",
  "Province de Limbourg",
];

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

  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const matchingRegions = query.length >= 2
    ? BELGIAN_REGIONS.filter(
        (r) => normalize(r).includes(normalize(query)) && !selected.includes(r)
      )
    : [];

  const matchingCities = query.length >= 2
    ? BELGIAN_CITIES.filter(
        (city) => normalize(city).includes(normalize(query)) && !selected.includes(city)
      ).slice(0, 6)
    : [];

  const suggestions = [...matchingRegions, ...matchingCities].slice(0, 10);

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
          {selected.map((city) => {
            const isRegion = BELGIAN_REGIONS.includes(city);
            return (
              <span
                key={city}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                  isRegion
                    ? "bg-blue-100 text-blue-800"
                    : "bg-primary-100 text-primary-700"
                }`}
              >
                {isRegion && <span className="text-xs">📍</span>}
                {city}
                <button
                  type="button"
                  onClick={() => removeCity(city)}
                  className={`font-bold ${isRegion ? "text-blue-500 hover:text-blue-900" : "text-primary-500 hover:text-primary-800"}`}
                >
                  x
                </button>
              </span>
            );
          })}
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
        placeholder="Ville, commune ou région (ex: Brabant Wallon, Wavre...)"
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {suggestions.map((item) => {
            const isRegion = BELGIAN_REGIONS.includes(item);
            return (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => addCity(item)}
                  className="w-full text-left px-4 py-2 hover:bg-primary-50 text-sm flex items-center justify-between gap-2"
                >
                  <span>{item}</span>
                  {isRegion && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full shrink-0">
                      Région
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
