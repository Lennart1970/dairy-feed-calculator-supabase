import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";

export default function Report() {
  const { data: farm } = trpc.farm.get.useQuery();
  const { data: herdGroups } = trpc.herdGroups.list.useQuery();

  // Calculate totals
  const totals = herdGroups?.reduce(
    (acc, group) => {
      const count = group.cowCount || 0;
      const weight = group.avgWeightKg || 0;
      const milkYield = group.avgMilkYieldKg || 0;
      const fatPercent = group.avgFatPercent || 0;
      const proteinPercent = group.avgProteinPercent || 0;

      // FPCM calculation
      const fpcm = milkYield * (0.337 + 0.116 * fatPercent + 0.06 * proteinPercent);

      // VEM calculations
      const vemMaintenance = 53.0 * Math.pow(weight, 0.75);
      const vemProduction = 390 * fpcm;
      const vemTotal = vemMaintenance + vemProduction;

      // DVE calculations
      const dveMaintenance = 54 * 0.1 * weight;
      const dveProduction = milkYield * (1.396 * (proteinPercent / 100) + 0.000195 * Math.pow(milkYield, 2));
      const dveTotal = dveMaintenance + dveProduction;

      // DS intake estimation
      const dsIntake = 3.0 + 0.33 * milkYield + 0.4 * (weight - 600) / 100;

      return {
        totalCows: acc.totalCows + count,
        totalMilk: acc.totalMilk + count * milkYield,
        totalVEM: acc.totalVEM + count * vemTotal,
        totalDVE: acc.totalDVE + count * dveTotal,
        totalDS: acc.totalDS + count * dsIntake,
      };
    },
    { totalCows: 0, totalMilk: 0, totalVEM: 0, totalDVE: 0, totalDS: 0 }
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-2xl p-12 print:shadow-none">
        {/* Header */}
        <div className="border-b-4 border-green-600 pb-6 mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Voeradvies Rapport
          </h1>
          <div className="flex justify-between items-center text-sm text-slate-600">
            <div>
              <p className="font-semibold text-lg">{farm?.name || "Melkveebedrijf"}</p>
              <p>Datum: {new Date().toLocaleDateString("nl-NL")}</p>
            </div>
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 print:hidden"
            >
              🖨️ Afdrukken / PDF
            </button>
          </div>
        </div>

        {/* Bedrijfsoverzicht */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
            <span className="text-3xl mr-3">🏡</span>
            Bedrijfsoverzicht
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600">Totaal Koeien</p>
              <p className="text-3xl font-bold text-blue-700">{totals?.totalCows || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600">Melk per Dag</p>
              <p className="text-3xl font-bold text-green-700">
                {totals?.totalMilk.toFixed(0) || 0} kg
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600">Gemiddeld per Koe</p>
              <p className="text-3xl font-bold text-orange-700">
                {totals?.totalCows > 0
                  ? (totals.totalMilk / totals.totalCows).toFixed(1)
                  : 0}{" "}
                kg
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600">Hectares</p>
              <p className="text-3xl font-bold text-purple-700">
                {((farm?.hectaresGrass || 0) + (farm?.hectaresMaize || 0)).toFixed(1)} ha
              </p>
            </div>
          </div>
        </section>

        {/* Koegroepen */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
            <span className="text-3xl mr-3">🐄</span>
            Koegroepen
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-4 py-3 text-left">Groep</th>
                  <th className="border border-slate-300 px-4 py-3 text-right">Aantal</th>
                  <th className="border border-slate-300 px-4 py-3 text-right">Gewicht</th>
                  <th className="border border-slate-300 px-4 py-3 text-right">Melk/dag</th>
                  <th className="border border-slate-300 px-4 py-3 text-right">Vet %</th>
                  <th className="border border-slate-300 px-4 py-3 text-right">Eiwit %</th>
                </tr>
              </thead>
              <tbody>
                {herdGroups?.map((group) => (
                  <tr key={group.id} className="hover:bg-slate-50">
                    <td className="border border-slate-300 px-4 py-3 font-semibold">
                      {group.name}
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-right">
                      {group.cowCount}
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-right">
                      {group.avgWeightKg} kg
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-right">
                      {group.avgMilkYieldKg} kg
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-right">
                      {group.avgFatPercent}%
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-right">
                      {group.avgProteinPercent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Voerbehoeften */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
            <span className="text-3xl mr-3">📊</span>
            Dagelijkse Voerbehoeften
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-4 py-3 text-left">Groep</th>
                  <th className="border border-slate-300 px-4 py-3 text-right">VEM/koe</th>
                  <th className="border border-slate-300 px-4 py-3 text-right">DVE/koe</th>
                  <th className="border border-slate-300 px-4 py-3 text-right">DS/koe</th>
                  <th className="border border-slate-300 px-4 py-3 text-right">Totaal VEM</th>
                  <th className="border border-slate-300 px-4 py-3 text-right">Totaal DVE</th>
                </tr>
              </thead>
              <tbody>
                {herdGroups?.map((group) => {
                  const count = group.cowCount || 0;
                  const weight = group.avgWeightKg || 0;
                  const milkYield = group.avgMilkYieldKg || 0;
                  const fatPercent = group.avgFatPercent || 0;
                  const proteinPercent = group.avgProteinPercent || 0;

                  const fpcm = milkYield * (0.337 + 0.116 * fatPercent + 0.06 * proteinPercent);
                  const vemMaintenance = 53.0 * Math.pow(weight, 0.75);
                  const vemProduction = 390 * fpcm;
                  const vemTotal = vemMaintenance + vemProduction;
                  const dveMaintenance = 54 * 0.1 * weight;
                  const dveProduction =
                    milkYield * (1.396 * (proteinPercent / 100) + 0.000195 * Math.pow(milkYield, 2));
                  const dveTotal = dveMaintenance + dveProduction;
                  const dsIntake = 3.0 + 0.33 * milkYield + 0.4 * (weight - 600) / 100;

                  return (
                    <tr key={group.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-4 py-3 font-semibold">
                        {group.name}
                      </td>
                      <td className="border border-slate-300 px-4 py-3 text-right">
                        {vemTotal.toFixed(0)}
                      </td>
                      <td className="border border-slate-300 px-4 py-3 text-right">
                        {dveTotal.toFixed(0)} g
                      </td>
                      <td className="border border-slate-300 px-4 py-3 text-right">
                        {dsIntake.toFixed(1)} kg
                      </td>
                      <td className="border border-slate-300 px-4 py-3 text-right font-semibold">
                        {(count * vemTotal).toFixed(0)}
                      </td>
                      <td className="border border-slate-300 px-4 py-3 text-right font-semibold">
                        {(count * dveTotal / 1000).toFixed(1)} kg
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-green-50 font-bold">
                  <td className="border border-slate-300 px-4 py-3">TOTAAL</td>
                  <td className="border border-slate-300 px-4 py-3 text-right">-</td>
                  <td className="border border-slate-300 px-4 py-3 text-right">-</td>
                  <td className="border border-slate-300 px-4 py-3 text-right">
                    {totals?.totalDS.toFixed(0)} kg
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-right text-green-700">
                    {totals?.totalVEM.toFixed(0)}
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-right text-green-700">
                    {(totals?.totalDVE / 1000).toFixed(1)} kg
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Aanbevelingen */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
            <span className="text-3xl mr-3">💡</span>
            Aanbevelingen
          </h2>
          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
            <ul className="space-y-3 text-slate-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>
                  <strong>Totale dagelijkse energiebehoefte:</strong>{" "}
                  {totals?.totalVEM.toFixed(0)} VEM voor {totals?.totalCows} koeien
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>
                  <strong>Totale dagelijkse eiwitbehoefte:</strong>{" "}
                  {(totals?.totalDVE / 1000).toFixed(1)} kg DVE
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>
                  <strong>Gemiddelde DS-opname:</strong>{" "}
                  {totals?.totalCows > 0 ? (totals.totalDS / totals.totalCows).toFixed(1) : 0} kg per koe
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>
                  Controleer regelmatig de kuilkwaliteit via laboratoriumanalyses om de voerwaarden actueel te houden.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>
                  Stem het rantsoen af op de specifieke behoeften van elke koegroep voor optimale melkproductie en diergezondheid.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t-2 border-slate-200 pt-6 mt-10 text-center text-sm text-slate-500">
          <p>
            Dit rapport is gegenereerd op basis van CVB 2025 normen en uw bedrijfsgegevens.
          </p>
          <p className="mt-2">
            Voor vragen of advies, neem contact op met uw voeringsadviseur.
          </p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
