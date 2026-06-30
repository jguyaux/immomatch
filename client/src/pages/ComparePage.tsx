import { useCompare } from "../App";

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

function getScoreStyle(score: number): string {
  if (score >= 80) return "from-green-400 to-green-600";
  if (score >= 60) return "from-yellow-400 to-amber-500";
  if (score >= 40) return "from-orange-400 to-orange-600";
  return "from-red-400 to-red-600";
}

export function ComparePage() {
  const { compareList, removeFromCompare, clearCompare } = useCompare();

  if (compareList.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-2">Comparateur</h2>
        <p className="text-gray-500 mb-6">
          Comparez jusqu'a 3 biens cote a cote pour faire le meilleur choix.
        </p>
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg mb-2">Aucun bien a comparer</p>
          <p className="text-gray-400">
            Cliquez sur "Comparer" sur une fiche bien depuis vos matchs pour l'ajouter ici.
          </p>
        </div>
      </div>
    );
  }

  const rows: { label: string; getValue: (index: number) => React.ReactNode }[] = [
    {
      label: "Image",
      getValue: (i) => {
        const p = compareList[i]?.property;
        if (!p) return null;
        return p.imageUrls[0] ? (
          <img src={p.imageUrls[0]} alt={p.title} className="w-full h-32 object-cover rounded-lg" />
        ) : (
          <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-sm">
            Pas d'image
          </div>
        );
      },
    },
    {
      label: "Score",
      getValue: (i) => {
        const m = compareList[i];
        if (!m) return null;
        return (
          <div className={`inline-flex w-12 h-12 rounded-full bg-gradient-to-br ${getScoreStyle(m.score)} items-center justify-center`}>
            <span className="text-white font-bold text-lg">{m.score}</span>
          </div>
        );
      },
    },
    {
      label: "Prix",
      getValue: (i) => {
        const p = compareList[i]?.property;
        if (!p) return null;
        return <span className="font-bold text-primary-600">{p.price.toLocaleString("fr-BE")} EUR</span>;
      },
    },
    {
      label: "Prix/m2",
      getValue: (i) => {
        const p = compareList[i]?.property;
        if (!p) return null;
        const ppsm = getPricePerSqm(p.price, p.surface);
        if (!ppsm) return <span className="text-gray-400">-</span>;
        return (
          <span className={`font-medium ${getPricePerSqmColor(ppsm, p.propertyType)}`}>
            {ppsm.toLocaleString("fr-BE")} EUR/m2
          </span>
        );
      },
    },
    {
      label: "Surface",
      getValue: (i) => {
        const p = compareList[i]?.property;
        if (!p || !p.surface) return <span className="text-gray-400">-</span>;
        return <span>{p.surface} m2</span>;
      },
    },
    {
      label: "Chambres",
      getValue: (i) => {
        const p = compareList[i]?.property;
        if (!p || p.bedrooms == null) return <span className="text-gray-400">-</span>;
        return <span>{p.bedrooms}</span>;
      },
    },
    {
      label: "Salles de bain",
      getValue: (i) => {
        const p = compareList[i]?.property;
        if (!p || p.bathrooms == null) return <span className="text-gray-400">-</span>;
        return <span>{p.bathrooms}</span>;
      },
    },
    {
      label: "PEB",
      getValue: (i) => {
        const p = compareList[i]?.property;
        if (!p || !p.pebScore) return <span className="text-gray-400">-</span>;
        return <span className="font-medium">{p.pebScore}</span>;
      },
    },
    {
      label: "Ville",
      getValue: (i) => {
        const p = compareList[i]?.property;
        if (!p) return null;
        return <span>{p.city || "-"}</span>;
      },
    },
    {
      label: "Type",
      getValue: (i) => {
        const p = compareList[i]?.property;
        if (!p) return null;
        return <span className="capitalize">{p.propertyType}</span>;
      },
    },
    {
      label: "Points forts",
      getValue: (i) => {
        const m = compareList[i];
        if (!m || m.strengths.length === 0) return <span className="text-gray-400">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {m.strengths.map((s: string, j: number) => (
              <span key={j} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                {s}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      label: "Points faibles",
      getValue: (i) => {
        const m = compareList[i];
        if (!m || m.weaknesses.length === 0) return <span className="text-gray-400">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {m.weaknesses.map((w: string, j: number) => (
              <span key={j} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                {w}
              </span>
            ))}
          </div>
        );
      },
    },
  ];

  // Find best values for highlighting
  const bestScore = Math.max(...compareList.map((m) => m.score));
  const bestPrice = Math.min(...compareList.map((m) => m.property?.price ?? Infinity));
  const bestSurface = Math.max(...compareList.map((m) => m.property?.surface ?? 0));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Comparateur</h2>
          <p className="text-gray-500">
            {compareList.length} bien{compareList.length > 1 ? "s" : ""} selectionne{compareList.length > 1 ? "s" : ""} (max. 3)
          </p>
        </div>
        <button
          onClick={clearCompare}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
        >
          Tout retirer
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 w-36"></th>
                {compareList.map((m) => (
                  <th key={m.id} className="px-4 py-3 text-center min-w-[200px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold text-sm line-clamp-2">{m.property?.title}</span>
                      <button
                        onClick={() => removeFromCompare(m.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition"
                      >
                        Retirer
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-600 whitespace-nowrap">
                    {row.label}
                  </td>
                  {compareList.map((_, ci) => {
                    const isBest =
                      (row.label === "Score" && compareList[ci]?.score === bestScore && compareList.length > 1) ||
                      (row.label === "Prix" && compareList[ci]?.property?.price === bestPrice && compareList.length > 1) ||
                      (row.label === "Surface" && compareList[ci]?.property?.surface === bestSurface && bestSurface > 0 && compareList.length > 1);
                    return (
                      <td
                        key={ci}
                        className={`px-4 py-3 text-sm text-center ${isBest ? "bg-green-50/50 ring-1 ring-inset ring-green-200" : ""}`}
                      >
                        {row.getValue(ci)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Links to property pages */}
      <div className="flex gap-4 mt-6">
        {compareList.map((m) => (
          <a
            key={m.id}
            href={m.property?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-3 bg-primary-50 text-primary-600 rounded-xl font-medium hover:bg-primary-100 transition text-sm"
          >
            Voir l'annonce - {m.property?.city || "Bien"}
          </a>
        ))}
      </div>
    </div>
  );
}
