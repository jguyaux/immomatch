import { useState, useMemo } from "react";

const REGIONS = [
  { id: "bxl", label: "BXL 12.5%", rate: 0.125 },
  { id: "wal", label: "WAL 12.5%", rate: 0.125 },
  { id: "wal1", label: "WAL 1er 3%", rate: 0.03 },
  { id: "fla", label: "FLA 3%", rate: 0.03 },
];

const NOTARY_RATE = 0.015;
const BANK_FEE_RATE = 0.01;

function calculateMonthly(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  if (annualRate <= 0) return principal / (years * 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function CreditPage() {
  const [price, setPrice] = useState(350000);
  const [region, setRegion] = useState("wal1");
  const [downPayment, setDownPayment] = useState(150000);
  const [duration, setDuration] = useState(25);
  const [rate, setRate] = useState(3.4);
  const [netIncome, setNetIncome] = useState(6000);

  const simulation = useMemo(() => {
    const regionData = REGIONS.find((r) => r.id === region)!;
    const registrationFees = Math.round(price * regionData.rate);
    const notaryFees = Math.round(price * NOTARY_RATE);
    const bankFees = Math.round(price * BANK_FEE_RATE);
    const totalToFinance = price + registrationFees + notaryFees + bankFees;
    const borrowed = Math.max(0, totalToFinance - downPayment);
    const monthly = calculateMonthly(borrowed, rate, duration);
    const totalInterest = monthly * duration * 12 - borrowed;
    const totalCost = borrowed + totalInterest;
    const debtRatio = netIncome > 0 ? (monthly / netIncome) * 100 : 0;
    const maxCapacity = netIncome * 0.33;
    const maxLoan = maxCapacity > 0
      ? (maxCapacity * (Math.pow(1 + rate / 100 / 12, duration * 12) - 1)) /
        ((rate / 100 / 12) * Math.pow(1 + rate / 100 / 12, duration * 12))
      : 0;

    return {
      registrationFees,
      registrationRate: regionData.rate * 100,
      notaryFees,
      bankFees,
      totalToFinance,
      borrowed,
      monthly: Math.round(monthly),
      totalInterest: Math.round(totalInterest),
      totalCost: Math.round(totalCost),
      debtRatio,
      maxLoan: Math.round(maxLoan),
    };
  }, [price, region, downPayment, duration, rate, netIncome]);

  const debtColor =
    simulation.debtRatio <= 33 ? "text-green-600" :
    simulation.debtRatio <= 40 ? "text-orange-500" :
    "text-red-600";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold">Simulateur de credit</h2>

      {/* Prix & Region */}
      <section className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Prix & Region</h3>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Prix (EUR)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-32 px-3 py-1.5 border rounded-lg text-right text-sm"
                step={5000}
                min={0}
              />
            </div>
            <input
              type="range"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              min={50000}
              max={1000000}
              step={5000}
              className="w-full accent-primary-600"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Region</label>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRegion(r.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                    region === r.id
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-primary-400"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Parametres */}
      <section className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Parametres</h3>

        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Apport (EUR)</label>
              <input
                type="number"
                value={downPayment}
                onChange={(e) => setDownPayment(Number(e.target.value))}
                className="w-32 px-3 py-1.5 border rounded-lg text-right text-sm"
                step={5000}
                min={0}
              />
            </div>
            <input
              type="range"
              value={downPayment}
              onChange={(e) => setDownPayment(Number(e.target.value))}
              min={0}
              max={price}
              step={5000}
              className="w-full accent-primary-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Duree</label>
              <span className="text-sm font-semibold">{duration} ans</span>
            </div>
            <input
              type="range"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min={5}
              max={30}
              step={1}
              className="w-full accent-primary-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Taux fixe</label>
              <span className="text-sm font-semibold">{rate.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              min={1}
              max={7}
              step={0.05}
              className="w-full accent-primary-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Revenus nets</label>
              <input
                type="number"
                value={netIncome}
                onChange={(e) => setNetIncome(Number(e.target.value))}
                className="w-32 px-3 py-1.5 border rounded-lg text-right text-sm"
                step={100}
                min={0}
              />
            </div>
            <input
              type="range"
              value={netIncome}
              onChange={(e) => setNetIncome(Number(e.target.value))}
              min={1000}
              max={15000}
              step={100}
              className="w-full accent-primary-600"
            />
          </div>
        </div>
      </section>

      {/* Frais totaux */}
      <section className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Frais totaux</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Prix du bien</span>
            <span className="font-medium">{price.toLocaleString("fr-BE")} EUR</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">
              Droits d'enreg.
              <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
                ~{simulation.registrationRate}%
              </span>
            </span>
            <span className="font-medium">{simulation.registrationFees.toLocaleString("fr-BE")} EUR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Frais de notaire (~1.5%)</span>
            <span className="font-medium">{simulation.notaryFees.toLocaleString("fr-BE")} EUR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Dossier banque (~1%)</span>
            <span className="font-medium">{simulation.bankFees.toLocaleString("fr-BE")} EUR</span>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="text-gray-600">Total a financer</span>
            <span className="font-semibold">{simulation.totalToFinance.toLocaleString("fr-BE")} EUR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Apport personnel</span>
            <span className="font-medium">- {downPayment.toLocaleString("fr-BE")} EUR</span>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="font-semibold">Montant emprunte</span>
            <span className="font-bold text-lg">{simulation.borrowed.toLocaleString("fr-BE")} EUR</span>
          </div>
        </div>
      </section>

      {/* Resultat */}
      <section className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Resultat</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Mensualite</p>
            <p className="text-2xl font-bold text-primary-600">
              {simulation.monthly.toLocaleString("fr-BE")} EUR/mois
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Taux endettement</p>
            <p className={`text-2xl font-bold ${debtColor}`}>
              {simulation.debtRatio.toFixed(1)}%
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Interets totaux</p>
            <p className="text-2xl font-bold text-orange-500">
              {simulation.totalInterest.toLocaleString("fr-BE")} EUR
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Cout total credit</p>
            <p className="text-2xl font-bold text-gray-800">
              {simulation.totalCost.toLocaleString("fr-BE")} EUR
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Capacite max (regle 33%)</span>
            <span className="text-sm font-semibold">Max: {simulation.maxLoan.toLocaleString("fr-BE")} EUR</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                simulation.debtRatio <= 33 ? "bg-green-500" :
                simulation.debtRatio <= 40 ? "bg-orange-500" :
                "bg-red-500"
              }`}
              style={{ width: `${Math.min(100, (simulation.debtRatio / 50) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0%</span>
            <span>33% max</span>
            <span>50%</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Simulation non contractuelle - Taux indicatif juin 2026
        </p>
      </section>
    </div>
  );
}
