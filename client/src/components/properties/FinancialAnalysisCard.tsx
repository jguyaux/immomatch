import { useState, useMemo } from "react";
import type { PropertyMatch, Property } from "../../../../shared/types";

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const COMMUNE_PRICES_2025: Record<string, { maison: number; appart: number }> = {
  // Namur province
  namur: { maison: 2100, appart: 2400 },
  jambes: { maison: 2000, appart: 2300 },
  gembloux: { maison: 2300, appart: 2600 },
  floreffe: { maison: 2150, appart: 2350 },
  profondeville: { maison: 2050, appart: 2200 },
  andenne: { maison: 1850, appart: 2100 },
  eghezee: { maison: 2200, appart: 2400 },
  ciney: { maison: 1700, appart: 1900 },
  dinant: { maison: 1750, appart: 1950 },
  rochefort: { maison: 1650, appart: 1850 },
  "fosses-la-ville": { maison: 1900, appart: 2100 },
  sambreville: { maison: 1650, appart: 1850 },
  jemeppe: { maison: 1700, appart: 1900 },
  // Brabant Wallon
  wavre: { maison: 2950, appart: 3200 },
  ottignies: { maison: 3100, appart: 3400 },
  "louvain-la-neuve": { maison: 3200, appart: 3500 },
  waterloo: { maison: 3300, appart: 3500 },
  "braine-l-alleud": { maison: 2900, appart: 3100 },
  "court-saint-etienne": { maison: 2700, appart: 2900 },
  nivelles: { maison: 2400, appart: 2700 },
  genappe: { maison: 2300, appart: 2500 },
  lasne: { maison: 3100, appart: 3300 },
  "la hulpe": { maison: 3400, appart: 3600 },
  rixensart: { maison: 2900, appart: 3100 },
  tubize: { maison: 2200, appart: 2400 },
  // Liège
  liege: { maison: 1950, appart: 2200 },
  seraing: { maison: 1400, appart: 1600 },
  herstal: { maison: 1500, appart: 1700 },
  huy: { maison: 1750, appart: 1950 },
  // Hainaut
  mons: { maison: 1850, appart: 2100 },
  charleroi: { maison: 1300, appart: 1500 },
  // Brussels
  bruxelles: { maison: 4500, appart: 4200 },
  ixelles: { maison: 5200, appart: 4800 },
  "saint-gilles": { maison: 4800, appart: 4500 },
  etterbeek: { maison: 4600, appart: 4300 },
  anderlecht: { maison: 3200, appart: 3000 },
  schaerbeek: { maison: 3500, appart: 3200 },
  uccle: { maison: 5500, appart: 5000 },
  woluwe: { maison: 4800, appart: 4500 },
};

const PEB_KWH: Record<string, number> = {
  A: 15,
  B: 50,
  C: 100,
  D: 175,
  E: 250,
  F: 350,
  G: 450,
};

const ENERGY_PRICE_EUR_PER_KWH = 0.11;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s]+/g, "-");
}

function lookupCommunePrice(
  city: string | null
): { maison: number; appart: number } | null {
  if (!city) return null;
  const normalized = normalizeCity(city);

  // Exact match first
  if (COMMUNE_PRICES_2025[normalized]) return COMMUNE_PRICES_2025[normalized];

  // Partial match: check if any key includes or is included by normalized
  for (const key of Object.keys(COMMUNE_PRICES_2025)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return COMMUNE_PRICES_2025[key];
    }
  }

  return null;
}

function isAppartType(propertyType: string): boolean {
  const t = propertyType.toLowerCase();
  return t === "appartement" || t === "studio" || t === "duplex";
}

// ---------------------------------------------------------------------------
// Analysis computation
// ---------------------------------------------------------------------------

interface PriceValuation {
  pricePerSqm: number | null;
  communeAvg: number | null;
  diff: number | null; // percentage
  label: string;
  labelColor: string;
  description: string | null;
}

interface HeatingCost {
  annualCost: number | null;
  sufficient: boolean;
  colorClass: string;
}

interface BuyVsRentResult {
  monthlyPayment: number;
  monthlyRent: number;
  totalPaidBuy: number;
  totalPaidRent: number;
  netWealthBuy: number;
  netWealthRent: number;
  buyBetter: boolean;
  differencePercent: number;
  acquisitionCosts: number;
}

interface AgeIndicator {
  daysOnPlatform: number;
  label: string;
  badgeColor: string;
  pulse: boolean;
}

interface FinancialAnalysis {
  valuation: PriceValuation;
  heating: HeatingCost;
  buyVsRent: BuyVsRentResult;
  age: AgeIndicator;
}

function computeValuation(property: Property): PriceValuation {
  const { price, surface, city, propertyType } = property;

  const pricePerSqm =
    surface && surface > 0 ? Math.round(price / surface) : null;

  const communeData = lookupCommunePrice(city);
  const communeAvg = communeData
    ? isAppartType(propertyType)
      ? communeData.appart
      : communeData.maison
    : null;

  if (pricePerSqm === null) {
    return {
      pricePerSqm: null,
      communeAvg,
      diff: null,
      label: "Surface inconnue",
      labelColor: "bg-gray-100 text-gray-500",
      description: null,
    };
  }

  if (communeAvg === null) {
    return {
      pricePerSqm,
      communeAvg: null,
      diff: null,
      label: "Commune non repertoriee",
      labelColor: "bg-gray-100 text-gray-500",
      description: null,
    };
  }

  const diff = ((pricePerSqm - communeAvg) / communeAvg) * 100;
  const absDiff = Math.abs(Math.round(diff));

  if (diff < -10) {
    return {
      pricePerSqm,
      communeAvg,
      diff,
      label: "Sous-coté",
      labelColor: "bg-green-100 text-green-700",
      description: `Ce bien est ${absDiff}% sous la médiane communale`,
    };
  } else if (diff > 25) {
    return {
      pricePerSqm,
      communeAvg,
      diff,
      label: "Très surévalué",
      labelColor: "bg-red-100 text-red-700",
      description: `Ce bien est ${absDiff}% au-dessus de la médiane`,
    };
  } else if (diff > 10) {
    return {
      pricePerSqm,
      communeAvg,
      diff,
      label: "Surévalué",
      labelColor: "bg-orange-100 text-orange-700",
      description: `Ce bien est ${absDiff}% au-dessus de la médiane`,
    };
  } else {
    return {
      pricePerSqm,
      communeAvg,
      diff,
      label: "Au prix du marché",
      labelColor: "bg-blue-100 text-blue-700",
      description: null,
    };
  }
}

function computeHeating(property: Property): HeatingCost {
  const { surface, pebScore } = property;
  if (!surface || !pebScore || !(pebScore in PEB_KWH)) {
    return { annualCost: null, sufficient: false, colorClass: "text-gray-400" };
  }
  const annualCost = Math.round(surface * PEB_KWH[pebScore] * ENERGY_PRICE_EUR_PER_KWH);
  let colorClass = "text-green-600";
  if (annualCost > 3000) colorClass = "text-red-600";
  else if (annualCost > 1500) colorClass = "text-orange-500";
  else if (annualCost > 600) colorClass = "text-blue-600";
  return { annualCost, sufficient: true, colorClass };
}

function computeBuyVsRent(property: Property, apport: number): BuyVsRentResult {
  const { price } = property;

  // Clamp apport
  const safeApport = Math.max(0, Math.min(apport, price));
  const loan = price - safeApport;

  // Acquisition costs (Wallonie)
  const registrationFees = price * 0.125;
  const notaryFees = price * 0.015;
  const bankFees = price * 0.005;
  const acquisitionCosts = registrationFees + notaryFees + bankFees;

  // Monthly mortgage payment
  const monthlyRate = 0.035 / 12;
  const nMonths = 25 * 12;
  let monthlyPayment = 0;
  if (loan > 0 && monthlyRate > 0) {
    const factor = Math.pow(1 + monthlyRate, nMonths);
    monthlyPayment = (loan * (monthlyRate * factor)) / (factor - 1);
  }

  // After 10 years (120 months)
  const months10 = 120;
  const factor10 = Math.pow(1 + monthlyRate, months10);
  const factorTotal = Math.pow(1 + monthlyRate, nMonths);
  const remainingLoan =
    loan > 0
      ? loan * (1 - (factor10 - 1) / (factorTotal - 1))
      : 0;

  const propertyValueAfter10y = price * Math.pow(1.025, 10);
  const netWealthBuy = propertyValueAfter10y - remainingLoan;
  const totalPaidBuy =
    safeApport + acquisitionCosts + monthlyPayment * months10;

  // Rent scenario
  const monthlyRent = price * 0.004;
  let totalPaidRent = 0;
  for (let year = 0; year < 10; year++) {
    const yearlyRent = monthlyRent * Math.pow(1.025, year) * 12;
    totalPaidRent += yearlyRent;
  }

  const investedApport = safeApport * Math.pow(1.04, 10);
  const netWealthRent = investedApport;

  const buyBetter = netWealthBuy > netWealthRent;
  const differencePercent =
    netWealthRent > 0
      ? Math.abs(Math.round(((netWealthBuy - netWealthRent) / netWealthRent) * 100))
      : 0;

  return {
    monthlyPayment: Math.round(monthlyPayment),
    monthlyRent: Math.round(monthlyRent),
    totalPaidBuy: Math.round(totalPaidBuy),
    totalPaidRent: Math.round(totalPaidRent),
    netWealthBuy: Math.round(netWealthBuy),
    netWealthRent: Math.round(netWealthRent),
    buyBetter,
    differencePercent,
    acquisitionCosts: Math.round(acquisitionCosts),
  };
}

function computeAge(property: Property): AgeIndicator {
  const scrapedAt = new Date(property.scrapedAt);
  const daysOnPlatform = Math.floor(
    (Date.now() - scrapedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysOnPlatform < 7) {
    return {
      daysOnPlatform,
      label: "Récemment importé",
      badgeColor: "bg-gray-100 text-gray-600",
      pulse: false,
    };
  } else if (daysOnPlatform < 30) {
    return {
      daysOnPlatform,
      label: `Importé il y a ${daysOnPlatform} jours`,
      badgeColor: "bg-gray-100 text-gray-600",
      pulse: false,
    };
  } else if (daysOnPlatform < 60) {
    return {
      daysOnPlatform,
      label: `Annonce ancienne (${daysOnPlatform} jours) — Négociation possible`,
      badgeColor: "bg-orange-100 text-orange-700",
      pulse: false,
    };
  } else {
    return {
      daysOnPlatform,
      label: `Annonce longue durée (${daysOnPlatform} jours) — Fort potentiel de négociation`,
      badgeColor: "bg-red-100 text-red-700",
      pulse: true,
    };
  }
}

function computeAnalysis(property: Property, apport: number): FinancialAnalysis {
  return {
    valuation: computeValuation(property),
    heating: computeHeating(property),
    buyVsRent: computeBuyVsRent(property, apport),
    age: computeAge(property),
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
      {children}
    </h4>
  );
}

function ValuationSection({ valuation, property }: { valuation: PriceValuation; property: Property }) {
  return (
    <div>
      <SectionTitle>Prix au m² et valorisation</SectionTitle>
      <div className="space-y-1.5">
        {valuation.pricePerSqm !== null ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-800">
              {valuation.pricePerSqm.toLocaleString("fr-BE")} €/m²
            </span>
            {valuation.communeAvg !== null && (
              <span className="text-xs text-gray-400">
                (médiane {property.city}: {valuation.communeAvg.toLocaleString("fr-BE")} €/m²)
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-400 italic">Surface inconnue</span>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${valuation.labelColor}`}>
            {valuation.label}
          </span>
          {valuation.description && (
            <span className="text-xs text-gray-500">{valuation.description}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function HeatingSection({ heating, property }: { heating: HeatingCost; property: Property }) {
  return (
    <div>
      <SectionTitle>Coût de chauffage estimé</SectionTitle>
      {heating.sufficient && heating.annualCost !== null ? (
        <p className={`text-sm font-medium ${heating.colorClass}`}>
          Estimation chauffage annuel : ~{heating.annualCost.toLocaleString("fr-BE")} €/an
          <span className="text-xs text-gray-400 font-normal ml-1">
            (PEB {property.pebScore}, {property.surface} m²)
          </span>
        </p>
      ) : (
        <p className="text-sm text-gray-400 italic">Données insuffisantes</p>
      )}
    </div>
  );
}

function BuyVsRentSection({
  result,
  apport,
  onApportChange,
  price,
}: {
  result: BuyVsRentResult;
  apport: number;
  onApportChange: (v: number) => void;
  price: number;
}) {
  return (
    <div>
      <SectionTitle>Simulation acheter vs louer (10 ans)</SectionTitle>

      {/* Apport input */}
      <div className="mb-3 flex items-center gap-3 flex-wrap">
        <label className="text-xs text-gray-600 font-medium whitespace-nowrap">
          Apport personnel :
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={apport}
            min={0}
            max={price}
            onChange={(e) => {
              const v = parseInt(e.target.value) || 0;
              onApportChange(Math.max(0, Math.min(v, price)));
            }}
            className="w-32 px-2 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <span className="text-xs text-gray-400">€</span>
        </div>
        <span className="text-xs text-gray-400">
          ({Math.round((apport / price) * 100)}% du prix)
        </span>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left py-1.5 pr-3 text-gray-500 font-medium w-1/2"></th>
              <th className="text-right py-1.5 px-2 bg-blue-50 text-blue-700 font-semibold rounded-tl-lg">
                Acheter
              </th>
              <th className="text-right py-1.5 px-2 bg-gray-50 text-gray-600 font-semibold rounded-tr-lg">
                Louer
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="py-1.5 pr-3 text-gray-600">Mensualité / Loyer</td>
              <td className="py-1.5 px-2 text-right font-medium bg-blue-50 text-blue-800">
                {result.monthlyPayment.toLocaleString("fr-BE")} €/mois
              </td>
              <td className="py-1.5 px-2 text-right font-medium bg-gray-50 text-gray-700">
                {result.monthlyRent.toLocaleString("fr-BE")} €/mois
              </td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-1.5 pr-3 text-gray-600">Total décaissé sur 10 ans</td>
              <td className="py-1.5 px-2 text-right font-medium bg-blue-50 text-blue-800">
                {result.totalPaidBuy.toLocaleString("fr-BE")} €
              </td>
              <td className="py-1.5 px-2 text-right font-medium bg-gray-50 text-gray-700">
                {result.totalPaidRent.toLocaleString("fr-BE")} €
              </td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-1.5 pr-3 text-gray-600">Patrimoine net estimé</td>
              <td className="py-1.5 px-2 text-right font-bold bg-blue-50 text-blue-900">
                {result.netWealthBuy.toLocaleString("fr-BE")} €
              </td>
              <td className="py-1.5 px-2 text-right font-bold bg-gray-50 text-gray-800">
                {result.netWealthRent.toLocaleString("fr-BE")} €
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Verdict */}
      <div className="mt-2.5">
        {result.buyBetter ? (
          <p className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg inline-block">
            Acheter est {result.differencePercent}% plus avantageux en patrimoine net
          </p>
        ) : (
          <p className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
            Louer est plus flexible — patrimoine via investissement de l'apport
          </p>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-2 italic">
        Simulation indicative. Hypothèses: taux 3.5%, valorisation +2.5%/an, rendement investissement 4%
      </p>
    </div>
  );
}

function AgeSection({ age }: { age: AgeIndicator }) {
  return (
    <div>
      <SectionTitle>Ancienneté de l'annonce</SectionTitle>
      <div className="flex items-center gap-2">
        {age.pulse && (
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        )}
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${age.badgeColor}`}>
          {age.label}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FinancialAnalysisCard({ match }: { match: PropertyMatch }) {
  const [expanded, setExpanded] = useState(false);
  const [apport, setApport] = useState<number>(
    Math.round((match.property?.price ?? 0) * 0.2)
  );

  const property = match.property;
  if (!property) return null;

  const analysis = useMemo(
    () => computeAnalysis(property, apport),
    [property, apport]
  );

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-800 transition w-full text-left"
      >
        <span>Analyse financière</span>
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 space-y-5">
          <ValuationSection valuation={analysis.valuation} property={property} />
          <HeatingSection heating={analysis.heating} property={property} />
          <BuyVsRentSection
            result={analysis.buyVsRent}
            apport={apport}
            onApportChange={setApport}
            price={property.price}
          />
          <AgeSection age={analysis.age} />
        </div>
      )}
    </div>
  );
}
