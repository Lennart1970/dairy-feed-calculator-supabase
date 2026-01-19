import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { 
  calculateAnnualSupply, 
  calculateAnnualDemand, 
  calculateDeficit,
  calculateEmptyDate,
  recommendPurchase,
  QUALITY_PRESETS,
  type QualityLevel 
} from '../lib/modeBConstants';

interface Farm {
  id: number;
  name: string;
  milk_price_per_kg: number;
  young_stock_junior_count: number;
  young_stock_senior_count: number;
  hectares_maize: number;
  hectares_grass: number;
  yield_maize_ton_ds_ha: number;
  yield_grass_ton_ds_ha: number;
  quality_level: QualityLevel;
}

export default function Ruwvoerbalans() {
  const [mode, setMode] = useState<'current' | 'forecast'>('forecast');
  const [farm, setFarm] = useState<Farm | null>(null);
  const [totalCows, setTotalCows] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form state for Mode B
  const [hectaresMaize, setHectaresMaize] = useState(8.0);
  const [hectaresGrass, setHectaresGrass] = useState(32.0);
  const [yieldMaize, setYieldMaize] = useState(12.0);
  const [yieldGrass, setYieldGrass] = useState(11.0);
  const [qualityLevel, setQualityLevel] = useState<QualityLevel>('topkwaliteit');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch farm data
      const farmRes = await fetch('/api/farms/1');
      const farmData = await farmRes.json();
      setFarm(farmData);
      
      // Initialize form with farm data
      setHectaresMaize(farmData.hectares_maize || 8.0);
      setHectaresGrass(farmData.hectares_grass || 32.0);
      setYieldMaize(farmData.yield_maize_ton_ds_ha || 12.0);
      setYieldGrass(farmData.yield_grass_ton_ds_ha || 11.0);
      setQualityLevel(farmData.quality_level || 'topkwaliteit');

      // Fetch total cow count
      const groupsRes = await fetch('/api/herd-groups?farmId=1');
      const groups = await groupsRes.json();
      const total = groups.reduce((sum: number, g: any) => sum + g.cow_count, 0);
      setTotalCows(total);

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoading(false);
    }
  };

  if (loading || !farm) {
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
    farm.young_stock_junior_count,
    farm.young_stock_senior_count
  );

  const deficit = calculateDeficit(supply.total, demand);
  const dailyDemand = demand / 365;
  const emptyDate = calculateEmptyDate(supply.total, dailyDemand);
  
  const recommendation = deficit.isShortage 
    ? recommendPurchase(deficit.deficit, qualityLevel, supply)
    : null;

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
                  {totalCows} koeien + {farm.young_stock_junior_count + farm.young_stock_senior_count} jongvee
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
