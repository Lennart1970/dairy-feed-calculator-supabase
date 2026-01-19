import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { trpc } from '../lib/trpc';
import { 
  calculateAnnualSupply, 
  calculateAnnualDemand, 
  calculateDeficit,
  calculateEmptyDate,
  recommendPurchase,
  calculateAnnualVemDemand,
  calculateAnnualVemSupply,
  calculateAnnualVemGap,
  QUALITY_PRESETS,
  type QualityLevel 
} from '../lib/modeBConstants';

export default function Ruwvoerbalans() {
  const [mode, setMode] = useState<'current' | 'forecast'>('forecast');

  // Fetch data using tRPC
  const { data: farm } = trpc.farm.get.useQuery();
  const { data: groups } = trpc.herdGroups.list.useQuery();

  // Form state for Mode B
  const [hectaresMaize, setHectaresMaize] = useState(8.0);
  const [hectaresGrass, setHectaresGrass] = useState(32.0);
  const [yieldMaize, setYieldMaize] = useState(12.0);
  const [yieldGrass, setYieldGrass] = useState(11.0);
  const [qualityLevel, setQualityLevel] = useState<QualityLevel>('topkwaliteit');

  // Initialize form with farm data when it loads
  useEffect(() => {
    if (farm) {
      setHectaresMaize(farm.hectaresMaize || 8.0);
      setHectaresGrass(farm.hectaresGrass || 32.0);
      setYieldMaize(farm.yieldMaizeTonDsHa || 12.0);
      setYieldGrass(farm.yieldGrassTonDsHa || 11.0);
      setQualityLevel(farm.qualityLevel || 'topkwaliteit');
    }
  }, [farm]);

  // Calculate total cows
  const totalCows = groups?.reduce((sum, g) => sum + g.cowCount, 0) || 0;

  if (!farm || !groups) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  // Calculate supply, demand, and deficit
  const supply = calculateAnnualSupply({
    hectares_maize: hectaresMaize,
    hectares_grass: hectaresGrass,
    yield_maize_ton_ds_ha: yieldMaize,
    yield_grass_ton_ds_ha: yieldGrass,
  });

  const demand = calculateAnnualDemand(
    totalCows,
    farm.youngStockJuniorCount || 0,
    farm.youngStockSeniorCount || 0
  );

  const deficit = calculateDeficit(supply.total, demand);
  const dailyDemand = demand / 365;
  const emptyDate = calculateEmptyDate(supply.total, dailyDemand);
  
  const recommendation = deficit.isShortage 
    ? recommendPurchase(deficit.deficit, qualityLevel, supply)
    : null;

  // VEM-based calculations (Annual Requirement Engine)
  const vemDemand = calculateAnnualVemDemand({
    groups: groups || [],
    youngJuniorCount: farm.youngStockJuniorCount || 0,
    youngSeniorCount: farm.youngStockSeniorCount || 0,
  });

  const vemSupply = calculateAnnualVemSupply({
    hectares_maize: hectaresMaize,
    hectares_grass: hectaresGrass,
    yield_maize_ton_ds_ha: yieldMaize,
    yield_grass_ton_ds_ha: yieldGrass,
    quality_level: qualityLevel,
    // TODO: Add lab results integration
  });

  const vemGap = calculateAnnualVemGap(vemDemand.totalVem, vemSupply.totalVem);

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('nl-NL', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              📊 Ruwvoerbalans
            </h1>
            <p className="text-gray-600">
              Strategische voorraadplanning voor {farm.name}
            </p>
          </div>
          <Link href="/dashboard">
            <a className="text-green-600 hover:text-green-700 font-medium">
              ← Terug naar Dashboard
            </a>
          </Link>
        </div>

        {/* Mode Toggle */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium">Berekeningsmode:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setMode('current')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  mode === 'current'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Mode A: Huidige Voorraad
              </button>
              <button
                onClick={() => setMode('forecast')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  mode === 'forecast'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Mode B: Oogstprognose
              </button>
            </div>
          </div>
          
          {mode === 'current' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                <strong>Mode A</strong> is nog in ontwikkeling. Gebruik Mode B voor oogstprognose.
              </p>
            </div>
          )}
        </div>

        {mode === 'forecast' && (
          <>
            {/* Crop Plan Input */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                🌾 Bouwplan (Crop Plan)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Maize */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hectares Maïs
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={hectaresMaize}
                    onChange={(e) => setHectaresMaize(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opbrengst Maïs (ton DS/ha)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={yieldMaize}
                    onChange={(e) => setYieldMaize(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Grass */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hectares Gras
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={hectaresGrass}
                    onChange={(e) => setHectaresGrass(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opbrengst Gras (ton DS/ha)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={yieldGrass}
                    onChange={(e) => setYieldGrass(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Quality Level */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kwaliteitsaanname (CVB 2025)
                  </label>
                  <select
                    value={qualityLevel}
                    onChange={(e) => setQualityLevel(e.target.value as QualityLevel)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="topkwaliteit">Topkwaliteit (VEM 990/960)</option>
                    <option value="gemiddeld">Gemiddeld (VEM 950/920)</option>
                    <option value="sober">Sober (VEM 900/880)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Rule of Thumb Calculation */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 mb-6 border-2 border-blue-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                📐 Vuistregel Berekening (CVB 2025)
              </h2>
              
              <div className="bg-white rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-700 mb-3">Ruwvoerbehoefte per dier per dag:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <span className="text-3xl">🐄</span>
                    <div>
                      <div className="text-sm text-gray-600">Melkkoe</div>
                      <div className="text-xl font-bold text-orange-600">15 kg DS/dag</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <span className="text-3xl">🐮</span>
                    <div>
                      <div className="text-sm text-gray-600">Jongvee &lt;1 jaar</div>
                      <div className="text-xl font-bold text-green-600">5 kg DS/dag</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-3xl">🐂</span>
                    <div>
                      <div className="text-sm text-gray-600">Jongvee &gt;1 jaar</div>
                      <div className="text-xl font-bold text-blue-600">8 kg DS/dag</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Jaarlijkse Behoefte Berekening:</h3>
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">{totalCows} koeien × 15 kg/dag × 365 dagen</span>
                    <span className="font-bold text-orange-600">= {((totalCows * 15 * 365) / 1000).toFixed(1)} ton DS</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">{farm.youngStockJuniorCount || 0} jongvee (&lt;1j) × 5 kg/dag × 365 dagen</span>
                    <span className="font-bold text-green-600">= {(((farm.youngStockJuniorCount || 0) * 5 * 365) / 1000).toFixed(1)} ton DS</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">{farm.youngStockSeniorCount || 0} jongvee (&gt;1j) × 8 kg/dag × 365 dagen</span>
                    <span className="font-bold text-blue-600">= {(((farm.youngStockSeniorCount || 0) * 8 * 365) / 1000).toFixed(1)} ton DS</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-indigo-100 rounded-lg border-2 border-indigo-300 mt-3">
                    <span className="font-bold text-gray-800">Totale Jaarlijkse Behoefte:</span>
                    <span className="font-bold text-2xl text-indigo-700">{(demand / 1000).toFixed(1)} ton DS</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Bron:</strong> AgruniekRijnvallei Voorraadgids, CVB 2025 Tabellenboek Veevoeding
                </p>
              </div>
            </div>

            {/* Supply & Demand Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <div className="text-sm font-medium mb-1">Jaarlijkse Productie</div>
                <div className="text-3xl font-bold">{(supply.total / 1000).toFixed(1)} ton</div>
                <div className="text-sm mt-2 opacity-90">
                  Maïs: {(supply.maize / 1000).toFixed(1)}t | Gras: {(supply.grass / 1000).toFixed(1)}t
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                <div className="text-sm font-medium mb-1">Jaarlijkse Behoefte</div>
                <div className="text-3xl font-bold">{(demand / 1000).toFixed(1)} ton</div>
                <div className="text-sm mt-2 opacity-90">
                  {totalCows} koeien + {(farm.youngStockJuniorCount || 0) + (farm.youngStockSeniorCount || 0)} jongvee
                </div>
              </div>

              <div className={`bg-gradient-to-br ${deficit.isShortage ? 'from-red-500 to-red-600' : 'from-blue-500 to-blue-600'} rounded-xl shadow-lg p-6 text-white`}>
                <div className="text-sm font-medium mb-1">
                  {deficit.isShortage ? 'Tekort' : 'Overschot'}
                </div>
                <div className="text-3xl font-bold">
                  {Math.abs(deficit.deficitTons).toFixed(1)} ton
                </div>
                <div className="text-sm mt-2 opacity-90">
                  {deficit.percentageCovered}% gedekt
                </div>
              </div>
            </div>

            {/* VEM Jaarbalans (Annual Energy Balance) - NEW! */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-6 mb-6 border-2 border-indigo-300">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                ⚡ VEM Jaarbalans (Energiebalans)
                <span className="text-sm font-normal text-gray-600">CVB 2022 Metabolisch Gewicht</span>
              </h2>

              {/* VEM Demand Breakdown */}
              <div className="bg-white rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-700 mb-3">Jaarlijkse Energiebehoefte (VEM):</h3>
                <div className="space-y-2 font-mono text-sm">
                  {vemDemand.breakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700">
                        {item.name}: {item.count} × {item.dailyVem.toLocaleString('nl-NL')} VEM/dag × 365
                      </span>
                      <span className="font-bold text-indigo-600">
                        = {(item.annualVem / 1000000).toFixed(1)} miljoen VEM
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 bg-indigo-100 rounded-lg border-2 border-indigo-300 mt-3">
                    <span className="font-bold text-gray-800">Totale Jaarlijkse Behoefte:</span>
                    <span className="font-bold text-2xl text-indigo-700">
                      {(vemDemand.totalVem / 1000000).toFixed(1)} miljoen VEM
                    </span>
                  </div>
                </div>
              </div>

              {/* VEM Supply */}
              <div className="bg-white rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-700 mb-3">Jaarlijkse Energievoorraad (VEM):</h3>
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">
                      Maïs: {(vemSupply.maizeKgDs / 1000).toFixed(1)} ton DS × {vemSupply.maizeVemPerKg} VEM/kg
                    </span>
                    <span className="font-bold text-green-600">
                      = {(vemSupply.maizeVem / 1000000).toFixed(1)} miljoen VEM
                    </span>
                  </div>
                  
                  {/* Grass Split Explanation */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-xs text-blue-800 mb-2 font-semibold">
                      🌿 Gras Snede Verdeling (Professionele Methode):
                    </div>
                    <div className="text-xs text-blue-700 space-y-1">
                      <div>• <strong>40%</strong> = Voorjaarskuil (1e Snede, Mei) - Hoge energie, lage structuur</div>
                      <div>• <strong>60%</strong> = Zomer/Najaarskuil (2e+ Snede, Juli-Aug) - Lagere energie, hoge structuur</div>
                      <div className="text-xs text-blue-600 mt-1 italic">Bron: ABZ Diervoeding, CVB Standards, ILVO research</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                    <span className="text-gray-700">
                      Gras Voorjaar (40%): {(vemSupply.grassSpringKgDs / 1000).toFixed(1)} ton DS × {vemSupply.grassSpringVemPerKg} VEM/kg
                    </span>
                    <span className="font-bold text-green-700">
                      = {(vemSupply.grassSpringVem / 1000000).toFixed(1)} miljoen VEM
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                    <span className="text-gray-700">
                      Gras Zomer (60%): {(vemSupply.grassSummerKgDs / 1000).toFixed(1)} ton DS × {vemSupply.grassSummerVemPerKg} VEM/kg
                    </span>
                    <span className="font-bold text-green-700">
                      = {(vemSupply.grassSummerVem / 1000000).toFixed(1)} miljoen VEM
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-green-100 rounded-lg border-2 border-green-300 mt-3">
                    <span className="font-bold text-gray-800">Totale Jaarlijkse Voorraad:</span>
                    <span className="font-bold text-2xl text-green-700">
                      {(vemSupply.totalVem / 1000000).toFixed(1)} miljoen VEM
                    </span>
                  </div>
                </div>
              </div>

              {/* Commercial Output */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`rounded-lg p-4 ${
                  vemGap.isShortage 
                    ? 'bg-red-100 border-2 border-red-300' 
                    : 'bg-blue-100 border-2 border-blue-300'
                }`}>
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    {vemGap.isShortage ? 'VEM Tekort' : 'VEM Overschot'}
                  </div>
                  <div className={`text-2xl font-bold ${
                    vemGap.isShortage ? 'text-red-700' : 'text-blue-700'
                  }`}>
                    {(Math.abs(vemGap.vemDeficit) / 1000000).toFixed(1)} miljoen
                  </div>
                </div>

                <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-700 mb-1">Krachtvoer Nodig</div>
                  <div className="text-2xl font-bold text-orange-700">
                    {vemGap.concentrateTonsNeeded.toLocaleString('nl-NL')} ton
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    ≈ {vemGap.truckloadsNeeded} vrachtwagens
                  </div>
                </div>

                <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-700 mb-1">Zelfvoorzieningsgraad</div>
                  <div className="text-2xl font-bold text-purple-700">
                    {vemGap.selfSufficiencyPercent}%
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {vemGap.selfSufficiencyPercent >= 80 ? '✅ Goed' : vemGap.selfSufficiencyPercent >= 50 ? '⚠️ Matig' : '🔴 Laag'}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-indigo-100 border border-indigo-300 rounded-lg">
                <p className="text-sm text-indigo-800">
                  <strong>Bron:</strong> CVB 2022 Metabolisch Gewicht Formule (42.4 × BW^0.75 + 442 × FPCM)
                </p>
              </div>
            </div>

            {/* Visual Gap Bar */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Voorraadbedekking</h3>
              
              <div className="relative">
                <div className="w-full h-12 bg-gray-200 rounded-lg overflow-hidden">
                  <div 
                    className={`h-full ${deficit.percentageCovered >= 100 ? 'bg-green-500' : deficit.percentageCovered >= 80 ? 'bg-yellow-500' : 'bg-red-500'} transition-all duration-500`}
                    style={{ width: `${Math.min(deficit.percentageCovered, 100)}%` }}
                  ></div>
                </div>
                <div className="mt-2 text-center text-gray-600 font-medium">
                  {deficit.percentageCovered}% van jaarbehoefte gedekt
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Voorraad leeg op:</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {formatDate(emptyDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Dagen resterend:</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {Math.floor(supply.total / dailyDemand)} dagen
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Purchase Recommendation */}
            {recommendation && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 border-2 border-purple-200">
                <h3 className="text-2xl font-bold text-purple-800 mb-4">
                  💡 Aankoopadvies
                </h3>
                
                <div className="bg-white rounded-lg p-6 mb-4">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">📦</div>
                    <div className="flex-1">
                      <div className="text-xl font-bold text-gray-800 mb-2">
                        {recommendation.product}
                      </div>
                      <div className="text-gray-600 mb-4">
                        {recommendation.reason}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-purple-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600">Te bestellen:</div>
                          <div className="text-2xl font-bold text-purple-700">
                            {recommendation.quantityTons} ton
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600">Aantal ladingen:</div>
                          <div className="text-2xl font-bold text-purple-700">
                            {recommendation.quantityLoads} loads
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <strong>Bron:</strong> CVB 2025 Veevoedertabel + AgruniekRijnvallei Voorraadgids
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
