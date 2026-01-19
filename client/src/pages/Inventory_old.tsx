import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '../lib/trpc';

type InventoryItem = {
  id: number;
  farmId: number;
  feedId: number;
  currentStockKg: number;
  siloCapacityKg: number | null;
  minimumStockKg: number;
  dailyUsageRateKg: number;
  lastDeliveryDate: string | null;
  lastDeliveryKg: number | null;
  updatedAt: string;
  feed: {
    id: number;
    name: string;
    displayName: string;
    category: string;
    vemPerUnit: number;
    dvePerUnit: number;
  } | null;
};

// Calculate days remaining
function calculateDaysRemaining(stock: number, dailyUsage: number): number | null {
  if (!dailyUsage || dailyUsage <= 0) return null;
  return Math.floor(stock / dailyUsage);
}

// Get status color based on days remaining
function getStockStatus(daysRemaining: number | null, minimumStockKg: number, currentStockKg: number): 'critical' | 'warning' | 'ok' {
  if (currentStockKg <= minimumStockKg) return 'critical';
  if (daysRemaining === null) return 'ok';
  if (daysRemaining < 7) return 'critical';
  if (daysRemaining < 14) return 'warning';
  return 'ok';
}

// Format date for display
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Inventory() {
  const [editingStock, setEditingStock] = useState<number | null>(null);
  const [stockValue, setStockValue] = useState<string>('');
  const [showDeliveryForm, setShowDeliveryForm] = useState<number | null>(null);
  const [deliveryAmount, setDeliveryAmount] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Fetch inventory data
  const { data: inventory, refetch } = trpc.inventory.list.useQuery();

  // Mutations
  const updateStockMutation = trpc.inventory.updateStock.useMutation({
    onSuccess: () => {
      refetch();
      setEditingStock(null);
      setStockValue('');
    },
  });

  const recordDeliveryMutation = trpc.inventory.recordDelivery.useMutation({
    onSuccess: () => {
      refetch();
      setShowDeliveryForm(null);
      setDeliveryAmount('');
    },
  });

  // Handle stock update
  const handleSaveStock = (feedId: number) => {
    const newStock = parseFloat(stockValue);
    if (!isNaN(newStock) && newStock >= 0) {
      updateStockMutation.mutate({ feedId, currentStockKg: newStock });
    }
  };

  // Handle delivery recording
  const handleRecordDelivery = (feedId: number) => {
    const amount = parseFloat(deliveryAmount);
    if (!isNaN(amount) && amount > 0) {
      recordDeliveryMutation.mutate({ feedId, deliveryKg: amount });
    }
  };

  // Get unique categories
  const categories = [...new Set(inventory?.map(item => item.feed?.category).filter(Boolean))];

  // Filter inventory by category
  const filteredInventory = filterCategory === 'all' 
    ? inventory 
    : inventory?.filter(item => item.feed?.category === filterCategory);

  // Calculate totals
  const totals = {
    totalItems: filteredInventory?.length || 0,
    criticalItems: filteredInventory?.filter(item => {
      const days = calculateDaysRemaining(item.currentStockKg, item.dailyUsageRateKg);
      return getStockStatus(days, item.minimumStockKg, item.currentStockKg) === 'critical';
    }).length || 0,
    warningItems: filteredInventory?.filter(item => {
      const days = calculateDaysRemaining(item.currentStockKg, item.dailyUsageRateKg);
      return getStockStatus(days, item.minimumStockKg, item.currentStockKg) === 'warning';
    }).length || 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📦</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Voorraad Beheer</h1>
                <p className="text-sm text-gray-500">Voorraden bijhouden en leveringen registreren</p>
              </div>
            </div>
            <Link href="/dashboard">
              <a className="text-green-600 hover:text-green-800 flex items-center gap-1">
                ← Terug naar Dashboard
              </a>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Totaal Producten</p>
                <p className="text-3xl font-bold text-gray-900">{totals.totalItems}</p>
              </div>
              <span className="text-4xl">📦</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-red-200 bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Kritiek (&lt;7 dagen)</p>
                <p className="text-3xl font-bold text-red-600">{totals.criticalItems}</p>
              </div>
              <span className="text-4xl">🚨</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-yellow-200 bg-yellow-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700">Waarschuwing (&lt;14 dagen)</p>
                <p className="text-3xl font-bold text-yellow-600">{totals.warningItems}</p>
              </div>
              <span className="text-4xl">⚠️</span>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter op categorie:</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Alle categorieën</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Voorraad (kg)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Verbruik/dag</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dagen Resterend</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Laatste Levering</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInventory?.map((item) => {
                  const daysRemaining = calculateDaysRemaining(item.currentStockKg, item.dailyUsageRateKg);
                  const status = getStockStatus(daysRemaining, item.minimumStockKg, item.currentStockKg);
                  
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 ${status === 'critical' ? 'bg-red-50' : status === 'warning' ? 'bg-yellow-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {item.feed?.category === 'ruwvoer' ? '🌾' : 
                             item.feed?.category === 'krachtvoer' ? '🌽' : '📦'}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900">{item.feed?.displayName || 'Onbekend'}</div>
                            <div className="text-xs text-gray-500">{item.feed?.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingStock === item.feedId ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              value={stockValue}
                              onChange={(e) => setStockValue(e.target.value)}
                              className="w-24 border rounded px-2 py-1 text-right"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveStock(item.feedId)}
                              className="text-green-600 hover:text-green-800"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingStock(null)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span 
                            className="cursor-pointer hover:text-blue-600"
                            onClick={() => {
                              setEditingStock(item.feedId);
                              setStockValue(item.currentStockKg.toString());
                            }}
                          >
                            {item.currentStockKg.toLocaleString('nl-NL')} kg
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {item.dailyUsageRateKg > 0 ? `${item.dailyUsageRateKg.toLocaleString('nl-NL')} kg` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {daysRemaining !== null ? (
                          <span className={`font-medium ${
                            status === 'critical' ? 'text-red-600' :
                            status === 'warning' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {daysRemaining} dagen
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">
                        <div>{formatDate(item.lastDeliveryDate)}</div>
                        {item.lastDeliveryKg && (
                          <div className="text-xs">{item.lastDeliveryKg.toLocaleString('nl-NL')} kg</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {showDeliveryForm === item.feedId ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="kg"
                                value={deliveryAmount}
                                onChange={(e) => setDeliveryAmount(e.target.value)}
                                className="w-20 border rounded px-2 py-1 text-right text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => handleRecordDelivery(item.feedId)}
                                className="text-green-600 hover:text-green-800 text-sm px-2 py-1 bg-green-100 rounded"
                              >
                                Opslaan
                              </button>
                              <button
                                onClick={() => setShowDeliveryForm(null)}
                                className="text-gray-600 hover:text-gray-800 text-sm"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setShowDeliveryForm(item.feedId);
                                setDeliveryAmount('');
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 border border-blue-200 rounded hover:bg-blue-50"
                            >
                              + Levering
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Legenda</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
              <span className="text-gray-600">Kritiek: &lt;7 dagen voorraad</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
              <span className="text-gray-600">Waarschuwing: &lt;14 dagen voorraad</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-white border border-gray-300"></div>
              <span className="text-gray-600">OK: ≥14 dagen voorraad</span>
            </div>
          </div>
        </div>

        {/* Order Advice Section */}
        {(totals.criticalItems > 0 || totals.warningItems > 0) && (
          <div className="mt-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl shadow-sm p-6 border border-orange-200">
            <h3 className="text-lg font-semibold text-orange-800 flex items-center gap-2 mb-4">
              📋 Besteladvies
            </h3>
            <div className="space-y-3">
              {filteredInventory?.filter(item => {
                const days = calculateDaysRemaining(item.currentStockKg, item.dailyUsageRateKg);
                const status = getStockStatus(days, item.minimumStockKg, item.currentStockKg);
                return status === 'critical' || status === 'warning';
              }).map(item => {
                const daysRemaining = calculateDaysRemaining(item.currentStockKg, item.dailyUsageRateKg);
                // Calculate suggested order: enough for 30 days
                const suggestedOrder = item.dailyUsageRateKg > 0 
                  ? Math.ceil((30 * item.dailyUsageRateKg) - item.currentStockKg)
                  : 0;
                
                return (
                  <div key={item.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-orange-100">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg ${daysRemaining !== null && daysRemaining < 7 ? '🚨' : '⚠️'}`}></span>
                      <div>
                        <span className="font-medium text-gray-900">{item.feed?.displayName}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({daysRemaining !== null ? `${daysRemaining} dagen` : 'onbekend verbruik'})
                        </span>
                      </div>
                    </div>
                    {suggestedOrder > 0 && (
                      <div className="text-right">
                        <span className="text-orange-700 font-medium">
                          Bestel: {suggestedOrder.toLocaleString('nl-NL')} kg
                        </span>
                        <span className="text-xs text-gray-500 block">voor 30 dagen voorraad</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
