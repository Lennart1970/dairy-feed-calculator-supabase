import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '../lib/trpc';
import { 
  calculateFPCM, 
  calculateVemMaintenance, 
  calculateVemProduction,
  calculateDveMaintenance,
  calculateDveProduction
} from '../lib/cvbConstants';

// Calculate VEM/DVE requirements for a group
function calculateGroupRequirements(group: { lifeStage: string; avgWeightKg: number; avgMilkYieldKg: number; avgFatPercent: number; avgProteinPercent: number }) {
  if (group.lifeStage === 'dry') {
    const vemMaintenance = 42.4 * Math.pow(group.avgWeightKg, 0.75);
    const dveMaintenance = 54 + 0.1 * group.avgWeightKg;
    return { fpcm: 0, vem: Math.round(vemMaintenance), dve: Math.round(dveMaintenance) };
  }

  const fpcm = calculateFPCM(group.avgMilkYieldKg, group.avgFatPercent, group.avgProteinPercent);
  const vemMaintenance = calculateVemMaintenance(group.avgWeightKg, true);
  const vemProduction = calculateVemProduction(fpcm);
  const dveMaintenance = calculateDveMaintenance(group.avgWeightKg);
  const proteinYield = group.avgMilkYieldKg * (group.avgProteinPercent / 100) * 1000;
  const dveProduction = calculateDveProduction(proteinYield);

  return {
    fpcm: Math.round(fpcm * 10) / 10,
    vem: Math.round(vemMaintenance + vemProduction),
    dve: Math.round(dveMaintenance + dveProduction),
  };
}

export default function HerdGroups() {
  // Fetch available MPR sessions
  const { data: sessions } = trpc.mprCows.sessions.useQuery({ farmId: 1 });
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

  // Fetch computed groups from MPR data
  const { data: computed, isLoading } = trpc.mprCows.computedGroups.useQuery({
    farmId: 1,
    mprDate: selectedDate,
  });

  const groups = computed?.groups || [];

  // Calculate totals
  const totals = groups.reduce((acc: { cows: number; milk: number; vem: number; dve: number }, g: any) => {
    const req = calculateGroupRequirements(g);
    return {
      cows: acc.cows + g.cowCount,
      milk: acc.milk + (g.lifeStage === 'dry' ? 0 : g.cowCount * g.avgMilkYieldKg),
      vem: acc.vem + (req.vem * g.cowCount),
      dve: acc.dve + (req.dve * g.cowCount),
    };
  }, { cows: 0, milk: 0, vem: 0, dve: 0 });

  // Group colors and icons
  const groupStyles: Record<string, { icon: string; color: string; bg: string; border: string }> = {
    'Droogstaand': { icon: '🤰', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    'Hoogproductief (Vers)': { icon: '🔥', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
    'Midproductief': { icon: '📊', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    'Laagproductief (Laat)': { icon: '🌙', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👥</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Koegroepen Overzicht</h1>
                <p className="text-sm text-gray-500">
                  Automatisch berekend vanuit MPR Dieroverzicht
                  {computed?.mprDate && (
                    <span className="ml-2 text-green-600 font-medium">
                      (sessie {new Date(computed.mprDate).toLocaleDateString('nl-NL')})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/mpr-dieren">
                <a className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
                  🐄 MPR Dieroverzicht →
                </a>
              </Link>
              <Link href="/">
                <a className="text-green-600 hover:text-green-800 flex items-center gap-1">
                  ← Dashboard
                </a>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* MPR Session Selector */}
        {sessions && sessions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">MPR Sessie:</span>
              <div className="flex flex-wrap gap-2">
                {sessions.map((s: any) => {
                  const isSelected = selectedDate === s.mpr_date || (!selectedDate && s === sessions[0]);
                  return (
                    <button
                      key={s.mpr_date}
                      onClick={() => setSelectedDate(s.mpr_date)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {new Date(s.mpr_date).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <span className="ml-1 opacity-75">({s.cow_count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500">Groepen berekenen vanuit MPR data...</p>
          </div>
        )}

        {!isLoading && groups.length > 0 && (
          <>
            {/* Summary Bar */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totals.cows}</p>
                  <p className="text-xs text-gray-500">Totaal Koeien</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{Math.round(totals.milk).toLocaleString('nl-NL')} kg</p>
                  <p className="text-xs text-gray-500">Dagelijkse Melk</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{(totals.vem / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 0 })}k</p>
                  <p className="text-xs text-gray-500">VEM/dag totaal</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{(totals.dve / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} kg</p>
                  <p className="text-xs text-gray-500">DVE/dag totaal</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-600">{groups.length}</p>
                  <p className="text-xs text-gray-500">Groepen</p>
                </div>
              </div>
              {computed?.unassignedCows > 0 && (
                <p className="text-xs text-amber-600 mt-2 text-center">
                  ⚠️ {computed.unassignedCows} koeien zonder kalfdatum konden niet ingedeeld worden
                </p>
              )}
            </div>

            {/* Data Source Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📡</span>
                <div>
                  <p className="font-semibold text-green-900">
                    Automatisch berekend vanuit MPR data
                  </p>
                  <p className="text-sm text-green-700">
                    Groepen worden ingedeeld op basis van DIM (Dagen in Melk): Hoog (0-120), Midden (120-220), Laag (&gt;220). 
                    Kies een andere MPR sessie hierboven om de historische indeling te bekijken.
                  </p>
                </div>
              </div>
            </div>

            {/* Groups */}
            <div className="space-y-4">
              {groups
                .filter((g: any) => g.cowCount > 0)
                .sort((a: any, b: any) => {
                  // Order: Hoog, Midden, Laag, Droogstaand
                  const order: Record<string, number> = { 'Hoogproductief (Vers)': 1, 'Midproductief': 2, 'Laagproductief (Laat)': 3, 'Droogstaand': 4 };
                  return (order[a.name] || 99) - (order[b.name] || 99);
                })
                .map((group: any) => {
                  const req = calculateGroupRequirements(group);
                  const style = groupStyles[group.name] || { icon: '🐄', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' };

                  return (
                    <div key={group.name} className={`bg-white rounded-xl shadow-sm border ${style.border} overflow-hidden`}>
                      {/* Group Header */}
                      <div className={`${style.bg} px-6 py-4 border-b ${style.border}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{style.icon}</span>
                            <div>
                              <h3 className={`text-lg font-bold ${style.color}`}>{group.name}</h3>
                              <p className="text-sm text-gray-600">
                                {group.cowCount} koeien
                                {group.dimRange && (
                                  <span className="ml-2">• DIM {group.dimRange.min}-{group.dimRange.max} (gem. {group.avgDaysInMilk})</span>
                                )}
                                {group.versCowCount > 0 && (
                                  <span className="ml-2 text-orange-600">• {group.versCowCount} vers</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Aandeel kudde</p>
                            <p className={`text-lg font-bold ${style.color}`}>
                              {computed?.totalCows ? Math.round(group.cowCount / computed.totalCows * 100) : 0}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Group Details */}
                      <div className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                          {/* Productie */}
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-gray-900">
                              {group.lifeStage === 'dry' ? '-' : `${group.avgMilkYieldKg}`}
                            </p>
                            <p className="text-xs text-gray-500">Melk kg/dag</p>
                          </div>

                          {/* FPCM */}
                          <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-blue-600">
                              {group.lifeStage === 'dry' ? '-' : req.fpcm.toFixed(1)}
                            </p>
                            <p className="text-xs text-gray-500">FPCM</p>
                          </div>

                          {/* Vet */}
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-gray-900">
                              {group.lifeStage === 'dry' ? '-' : `${group.avgFatPercent}%`}
                            </p>
                            <p className="text-xs text-gray-500">Vet</p>
                          </div>

                          {/* Eiwit */}
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-gray-900">
                              {group.lifeStage === 'dry' ? '-' : `${group.avgProteinPercent}%`}
                            </p>
                            <p className="text-xs text-gray-500">Eiwit</p>
                          </div>

                          {/* Celgetal */}
                          <div className={`rounded-lg p-3 text-center ${
                            group.avgCelgetal && group.avgCelgetal > 250 ? 'bg-red-50' : 'bg-gray-50'
                          }`}>
                            <p className={`text-lg font-bold ${
                              group.avgCelgetal && group.avgCelgetal > 250 ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {group.avgCelgetal ?? '-'}
                            </p>
                            <p className="text-xs text-gray-500">Celgetal</p>
                            {group.highCelCount > 0 && (
                              <p className="text-xs text-red-500 mt-0.5">{group.highCelCount} hoog</p>
                            )}
                          </div>

                          {/* Ureum */}
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-gray-900">{group.avgUreum ?? '-'}</p>
                            <p className="text-xs text-gray-500">Ureum</p>
                          </div>

                          {/* VEM */}
                          <div className="bg-orange-50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-orange-600">{req.vem.toLocaleString('nl-NL')}</p>
                            <p className="text-xs text-gray-500">VEM/koe</p>
                          </div>

                          {/* DVE */}
                          <div className="bg-purple-50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-purple-600">{req.dve}g</p>
                            <p className="text-xs text-gray-500">DVE/koe</p>
                          </div>
                        </div>

                        {/* Group Totals */}
                        <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500 flex flex-wrap gap-4">
                          <span>📊 Groep totaal: {(req.vem * group.cowCount).toLocaleString('nl-NL')} VEM</span>
                          <span>•</span>
                          <span>{((req.dve * group.cowCount) / 1000).toFixed(1)} kg DVE</span>
                          {group.lifeStage === 'lactating' && (
                            <>
                              <span>•</span>
                              <span>{Math.round(group.avgMilkYieldKg * group.cowCount).toLocaleString('nl-NL')} kg melk/dag</span>
                            </>
                          )}
                          <span>•</span>
                          <span>LG: {group.avgWeightKg} kg (CVB standaard)</span>
                          {group.avgParity && (
                            <>
                              <span>•</span>
                              <span>Gem. lactatie: {group.avgParity}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Audit / Transparency Section */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                🔍 Berekeningsverantwoording
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Groepsindeling (DIM-gebaseerd)</h3>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b">
                        <th className="py-1 pr-4">Groep</th>
                        <th className="py-1 pr-4">DIM range</th>
                        <th className="py-1">LG (CVB)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="py-1">Hoogproductief</td><td>0 - 120 dagen</td><td>650 kg</td></tr>
                      <tr><td className="py-1">Midproductief</td><td>120 - 220 dagen</td><td>675 kg</td></tr>
                      <tr><td className="py-1">Laagproductief</td><td>&gt; 220 dagen</td><td>700 kg</td></tr>
                      <tr><td className="py-1">Droogstaand</td><td>status: drg/onm</td><td>725 kg</td></tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Formules (CVB 2025)</h3>
                  <div className="space-y-1 font-mono text-xs">
                    <p><strong>FPCM</strong> = melk × (0.337 + 0.116 × vet% + 0.06 × eiw%)</p>
                    <p><strong>VEM onderhoud</strong> = 53.0 × LG<sup>0.75</sup></p>
                    <p><strong>VEM productie</strong> = 390 × FPCM</p>
                    <p><strong>DVE onderhoud</strong> = 54 + 0.1 × LG</p>
                    <p><strong>DVE productie</strong> = 1.396 × eiwitopbrengst + 0.000195 × eiwitopbrengst²</p>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">Bron: CVB Veevoedertabel 2025 - Tabel 3.1, 3.2, 4.1, 4.2</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  📡 Data bron: MPR Dieroverzicht sessie {computed?.mprDate ? new Date(computed.mprDate).toLocaleDateString('nl-NL') : '-'} | 
                  Totaal: {computed?.totalCows || 0} koeien ({computed?.activeCows || 0} actief, {computed?.dryCows || 0} droog) |
                  LG (lichaamsgewicht) is CVB standaard per groep — niet uit MPR data
                </p>
              </div>
            </div>

            {/* Future: Goals Section Placeholder */}
            <div className="mt-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
              <span className="text-3xl">🎯</span>
              <h3 className="text-lg font-semibold text-gray-600 mt-2">Doelstellingen (SOLL)</h3>
              <p className="text-sm text-gray-400 mt-1">
                Hier komen later de productiedoelen per groep, zodat je IST vs. SOLL kunt vergelijken.
              </p>
            </div>
          </>
        )}

        {!isLoading && groups.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <span className="text-5xl mb-4 block">📡</span>
            <p className="text-gray-600 text-lg">Geen MPR data beschikbaar</p>
            <p className="text-sm text-gray-400 mt-2">
              Upload eerst MPR Dieroverzicht data om automatisch koegroepen te berekenen.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
