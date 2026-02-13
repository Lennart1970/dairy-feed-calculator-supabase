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

// Calculate requirements for a herd group
function calculateGroupRequirements(group: {
  avgWeightKg: number;
  avgMilkYieldKg: number;
  avgFatPercent: number;
  avgProteinPercent: number;
  lifeStage: string;
}) {
  if (group.lifeStage === 'dry') {
    // Dry cow requirements
    const vemMaintenance = 42.4 * Math.pow(group.avgWeightKg, 0.75); // Lower for dry cows
    const dveMaintenance = 54 + 0.1 * group.avgWeightKg;
    return {
      fpcm: 0,
      vem: Math.round(vemMaintenance),
      dve: Math.round(dveMaintenance),
    };
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

export default function FarmDashboard() {
  const [editingFarm, setEditingFarm] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [milkPrice, setMilkPrice] = useState(0.42);
  const [youngStockJunior, setYoungStockJunior] = useState(0);
  const [youngStockSenior, setYoungStockSenior] = useState(0);

  // Fetch farm data
  const { data: farm, refetch: refetchFarm } = trpc.farm.get.useQuery();
  const { data: groups, refetch: refetchGroups } = trpc.herdGroups.list.useQuery();
  const { data: inventory } = trpc.inventory.list.useQuery();

  const updateFarmMutation = trpc.farm.update.useMutation({
    onSuccess: () => {
      refetchFarm();
      setEditingFarm(false);
    },
  });

  // Calculate totals
  const totalCows = groups?.reduce((sum, g) => sum + g.cowCount, 0) || 0;
  const totalMilk = groups?.reduce((sum, g) => sum + (g.cowCount * g.avgMilkYieldKg), 0) || 0;
  
  // Calculate total VEM/DVE requirements
  const totalRequirements = groups?.reduce((acc, g) => {
    const req = calculateGroupRequirements(g);
    return {
      vem: acc.vem + (req.vem * g.cowCount),
      dve: acc.dve + (req.dve * g.cowCount),
    };
  }, { vem: 0, dve: 0 }) || { vem: 0, dve: 0 };

  // Sort groups: production groups first (by milk yield descending), dry cows last
  const sortedGroups = [...(groups || [])].sort((a, b) => {
    if (a.lifeStage === 'dry' && b.lifeStage !== 'dry') return 1;
    if (a.lifeStage !== 'dry' && b.lifeStage === 'dry') return -1;
    return b.avgMilkYieldKg - a.avgMilkYieldKg;
  });

  // Calculate inventory alerts
  const lowStockItems = inventory?.filter(item => {
    if (!item.dailyUsageRateKg || item.dailyUsageRateKg === 0) return false;
    const daysRemaining = item.currentStockKg / item.dailyUsageRateKg;
    return daysRemaining < 14; // Alert if less than 2 weeks
  }) || [];

  const handleSaveFarm = () => {
    if (farm) {
      updateFarmMutation.mutate({
        farmId: farm.id,
        name: farmName,
        milkPricePerKg: milkPrice,
        youngStockJuniorCount: youngStockJunior,
        youngStockSeniorCount: youngStockSenior,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏠</span>
              <div>
                {editingFarm ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={farmName}
                      onChange={(e) => setFarmName(e.target.value)}
                      className="text-xl font-bold border rounded px-2 py-1"
                    />
                    <button
                      onClick={handleSaveFarm}
                      className="text-green-600 hover:text-green-800"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingFarm(false)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <h1 
                    className="text-xl font-bold text-gray-900 cursor-pointer hover:text-green-700"
                    onClick={() => {
                      setFarmName(farm?.name || '');
                      setMilkPrice(farm?.milkPricePerKg || 0.42);
                      setYoungStockJunior(farm?.youngStockJuniorCount || 0);
                      setYoungStockSenior(farm?.youngStockSeniorCount || 0);
                      setEditingFarm(true);
                    }}
                  >
                    {farm?.name || 'Mijn Bedrijf'} ✏️
                  </h1>
                )}
                <p className="text-sm text-gray-500">Farm Management Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Inventory Alerts - Days Remaining */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🚨</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 mb-2">Voorraad Waarschuwing</h3>
                <p className="text-sm text-red-700 mb-3">
                  {lowStockItems.length} product(en) met minder dan 14 dagen voorraad:
                </p>
                <div className="space-y-2">
                  {lowStockItems.map(item => {
                    const daysRemaining = Math.floor(item.currentStockKg / item.dailyUsageRateKg);
                    return (
                      <div key={item.id} className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{item.feed?.displayName}</p>
                            <p className="text-xs text-gray-500">
                              {item.currentStockKg.toLocaleString('nl-NL')} kg DS voorraad
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${
                              daysRemaining < 7 ? 'text-red-600' : 'text-yellow-600'
                            }`}>
                              {daysRemaining}
                            </p>
                            <p className="text-xs text-gray-500">dagen</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Link href="/voorraad">
                  <a className="mt-3 inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                    → Naar Voorraad Beheer
                  </a>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Totaal Koeien</p>
                <p className="text-3xl font-bold text-gray-900">{totalCows}</p>
              </div>
              <span className="text-4xl">🐄</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">{groups?.length || 0} groepen</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Dagelijkse Melk</p>
                <p className="text-3xl font-bold text-blue-600">{totalMilk.toLocaleString('nl-NL')} kg</p>
              </div>
              <span className="text-4xl">🥛</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              €{((totalMilk * (farm?.milkPricePerKg || 0.42))).toLocaleString('nl-NL', { minimumFractionDigits: 0 })} /dag
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">VEM Behoefte</p>
                <p className="text-3xl font-bold text-orange-600">{(totalRequirements.vem / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 0 })}k</p>
              </div>
              <span className="text-4xl">⚡</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Totaal per dag</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">DVE Behoefte</p>
                <p className="text-3xl font-bold text-purple-600">{(totalRequirements.dve / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}kg</p>
              </div>
              <span className="text-4xl">🥩</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Totaal per dag</p>
          </div>
        </div>

        {/* Herd Groups Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                👥 Koegroepen Overzicht
              </h2>
              <Link href="/groepen">
                <a className="text-green-600 hover:text-green-800 text-sm">
                  Beheren →
                </a>
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Groep</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Koeien</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Melk (kg)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">FPCM</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">VEM/koe</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">DVE/koe</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">DIM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedGroups.map((group) => {
                  const req = calculateGroupRequirements(group);
                  return (
                    <tr key={group.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {group.lifeStage === 'dry' ? '🤰' : '🐄'}
                          </span>
                          <span className="font-medium text-gray-900">{group.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900">{group.cowCount}</td>
                      <td className="px-6 py-4 text-right text-gray-900">
                        {group.lifeStage === 'dry' ? '-' : group.avgMilkYieldKg.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900">
                        {req.fpcm > 0 ? req.fpcm.toFixed(1) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-orange-600 font-medium">
                        {req.vem.toLocaleString('nl-NL')}
                      </td>
                      <td className="px-6 py-4 text-right text-purple-600 font-medium">
                        {req.dve}g
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">
                        {group.lifeStage === 'dry' ? '-' : group.avgDaysInMilk}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/ruwvoerbalans">
            <a className="bg-purple-100 rounded-xl shadow-lg p-6 hover:bg-purple-200 transition-all transform hover:scale-105 border-2 border-purple-300">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🌾</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Ruwvoerbalans</h3>
                  <p className="text-gray-600 text-sm font-medium">Oogst & voorraad planning</p>
                </div>
              </div>
            </a>
          </Link>
          <Link href="/lab-rapporten">
            <a className="bg-cyan-100 rounded-xl shadow-lg p-6 hover:bg-cyan-200 transition-all transform hover:scale-105 border-2 border-cyan-300">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🧪</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Lab Rapporten</h3>
                  <p className="text-gray-600 text-sm font-medium">Upload kuilanalyse resultaten</p>
                </div>
              </div>
            </a>
          </Link>
          <Link href="/basisrantsoen">
            <a className="bg-orange-100 rounded-xl shadow-lg p-6 hover:bg-orange-200 transition-all transform hover:scale-105 border-2 border-orange-300">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🌾</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Basisrantsoen</h3>
                  <p className="text-gray-600 text-sm font-medium">Ontwerp & beheer basisrantsoenen</p>
                </div>
              </div>
            </a>
          </Link>
          <Link href="/rantsoen-toewijzing">
            <a className="bg-indigo-100 rounded-xl shadow-lg p-6 hover:bg-indigo-200 transition-all transform hover:scale-105 border-2 border-indigo-300">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🎯</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Rantsoen Toewijzing</h3>
                  <p className="text-gray-600 text-sm font-medium">Gap analyse & krachtvoer</p>
                </div>
              </div>
            </a>
          </Link>
          <Link href="/voorraad">
            <a className="bg-blue-100 rounded-xl shadow-lg p-6 hover:bg-blue-200 transition-all transform hover:scale-105 border-2 border-blue-300 relative">
              <div className="flex items-center gap-4">
                <span className="text-5xl">📦</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-800">Voorraad Beheren</h3>
                    <span className="bg-gray-400 text-white text-xs font-normal px-2 py-0.5 rounded shadow-sm opacity-70">
                      In ontwikkeling
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm font-medium">Voorraden bijwerken</p>
                </div>
              </div>
            </a>
          </Link>
          <Link href="/laadlijst">
            <a className="bg-orange-100 rounded-xl shadow-lg p-6 hover:bg-orange-200 transition-all transform hover:scale-105 border-2 border-orange-300 relative">
              <div className="flex items-center gap-4">
                <span className="text-5xl">📋</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-800">Laadlijst</h3>
                    <span className="bg-gray-400 text-white text-xs font-normal px-2 py-0.5 rounded shadow-sm opacity-70">
                      In ontwikkeling
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm font-medium">Voermengwagen laden</p>
                </div>
              </div>
            </a>
          </Link>
          <Link href="/calculator">
            <a className="bg-teal-100 rounded-xl shadow-lg p-6 hover:bg-teal-200 transition-all transform hover:scale-105 border-2 border-teal-300">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🧮</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Rantsoen Calculator</h3>
                  <p className="text-gray-600 text-sm font-medium">Bereken rantsoen voor individuele koe</p>
                </div>
              </div>
            </a>
          </Link>
          <Link href="/audit">
            <a className="bg-slate-100 rounded-xl shadow-lg p-6 hover:bg-slate-200 transition-all transform hover:scale-105 border-2 border-slate-300">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🔬</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Audit View</h3>
                  <p className="text-gray-600 text-sm font-medium">Alle formules & berekeningen</p>
                </div>
              </div>
            </a>
          </Link>
          <Link href="/rapport">
            <a className="bg-green-50 rounded-xl shadow-lg p-6 hover:bg-green-100 transition-all transform hover:scale-105 border-2 border-green-300">
              <div className="flex items-center gap-4">
                <span className="text-5xl">📄</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Voeradvies Rapport</h3>
                  <p className="text-gray-600 text-sm font-medium">Print/deel rapport met boer</p>
                </div>
              </div>
            </a>
          </Link>
          <Link href="/mpr">
            <a className="bg-indigo-50 rounded-xl shadow-lg p-6 hover:bg-indigo-100 transition-all transform hover:scale-105 border-2 border-indigo-300">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🥛</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">MPR Leveringen</h3>
                  <p className="text-gray-600 text-sm font-medium">Melkkwaliteit & productietrends</p>
                </div>
              </div>
            </a>
          </Link>
          <Link href="/mpr-dieren">
            <a className="bg-teal-50 rounded-xl shadow-lg p-6 hover:bg-teal-100 transition-all transform hover:scale-105 border-2 border-teal-300">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🐄</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">MPR Dieroverzicht</h3>
                  <p className="text-gray-600 text-sm font-medium">Individuele koedata & celgetal</p>
                </div>
              </div>
            </a>
          </Link>
          <Link href="/areaal">
            <a className="bg-amber-50 rounded-xl shadow-lg p-6 hover:bg-amber-100 transition-all transform hover:scale-105 border-2 border-amber-300">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🌾</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Areaal Overzicht</h3>
                  <p className="text-gray-600 text-sm font-medium">Bodem- en kuilanalyses</p>
                </div>
              </div>
            </a>
          </Link>
        </div>

        {/* Inventory Alerts */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2 mb-4">
              ⚠️ Voorraad Waarschuwingen
            </h3>
            <div className="space-y-2">
              {lowStockItems.map((item) => {
                const daysRemaining = Math.floor(item.currentStockKg / item.dailyUsageRateKg);
                return (
                  <div key={item.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                    <span className="font-medium text-gray-900">{item.feed?.displayName}</span>
                    <span className="text-red-600 font-medium">
                      {daysRemaining} dagen resterend
                    </span>
                  </div>
                );
              })}
            </div>
            <Link href="/voorraad">
              <a className="mt-4 inline-block text-red-700 hover:text-red-900 font-medium">
                Voorraad bijwerken →
              </a>
            </Link>
          </div>
        )}

        {/* Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Instellingen</h3>
          
          <div className="space-y-4">
            {/* Milk Price */}
            <div className="flex items-center gap-4">
              <label className="text-gray-600 w-40">Melkprijs:</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">€</span>
                <input
                  type="number"
                  step="0.01"
                  value={farm?.milkPricePerKg || 0.42}
                  onChange={(e) => {
                    const newPrice = parseFloat(e.target.value);
                    if (farm && !isNaN(newPrice)) {
                      updateFarmMutation.mutate({
                        farmId: farm.id,
                        milkPricePerKg: newPrice,
                      });
                    }
                  }}
                  className="w-24 border rounded px-2 py-1 text-right"
                />
                <span className="text-gray-500">per kg</span>
              </div>
            </div>

            {/* Young Stock Junior */}
            <div className="flex items-center gap-4">
              <label className="text-gray-600 w-40">Jongvee &lt; 1 jaar:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={farm?.youngStockJuniorCount || 0}
                  onChange={(e) => {
                    const count = parseInt(e.target.value);
                    if (farm && !isNaN(count)) {
                      updateFarmMutation.mutate({
                        farmId: farm.id,
                        youngStockJuniorCount: count,
                      });
                    }
                  }}
                  className="w-24 border rounded px-2 py-1 text-right"
                />
                <span className="text-gray-500">dieren</span>
                <span className="text-xs text-gray-400">(5 kg DS/dag)</span>
              </div>
            </div>

            {/* Young Stock Senior */}
            <div className="flex items-center gap-4">
              <label className="text-gray-600 w-40">Jongvee &gt; 1 jaar:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={farm?.youngStockSeniorCount || 0}
                  onChange={(e) => {
                    const count = parseInt(e.target.value);
                    if (farm && !isNaN(count)) {
                      updateFarmMutation.mutate({
                        farmId: farm.id,
                        youngStockSeniorCount: count,
                      });
                    }
                  }}
                  className="w-24 border rounded px-2 py-1 text-right"
                />
                <span className="text-gray-500">dieren</span>
                <span className="text-xs text-gray-400">(8 kg DS/dag)</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
