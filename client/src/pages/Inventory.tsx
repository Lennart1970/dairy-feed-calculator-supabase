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
  storageType: string | null;
  volumeM3: number | null;
  densityKgM3: number | null;
  siloLengthM: number | null;
  siloWidthM: number | null;
  siloHeightM: number | null;
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

// Get status color and label based on days remaining
function getStockStatus(daysRemaining: number | null): {
  color: string;
  bgColor: string;
  label: string;
  icon: string;
} {
  if (daysRemaining === null) {
    return { color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Onbekend', icon: '❓' };
  }
  if (daysRemaining < 180) {
    return { color: 'text-red-600', bgColor: 'bg-red-100', label: 'Tekort', icon: '🚨' };
  }
  if (daysRemaining < 365) {
    return { color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Adequaat', icon: '⚠️' };
  }
  return { color: 'text-green-600', bgColor: 'bg-green-100', label: 'Overschot', icon: '✅' };
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
  const [showSiloCalculator, setShowSiloCalculator] = useState<number | null>(null);
  
  // Silo calculator state
  const [siloLength, setSiloLength] = useState<string>('');
  const [siloWidth, setSiloWidth] = useState<string>('');
  const [siloHeight, setSiloHeight] = useState<string>('');
  const [siloDensity, setSiloDensity] = useState<string>('240');
  const [siloDsPercent, setSiloDsPercent] = useState<string>('45');

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

  // Calculate stock from silo dimensions
  const calculateStockFromSilo = () => {
    const length = parseFloat(siloLength);
    const width = parseFloat(siloWidth);
    const height = parseFloat(siloHeight);
    const density = parseFloat(siloDensity);
    const dsPercent = parseFloat(siloDsPercent);

    if (isNaN(length) || isNaN(width) || isNaN(height) || isNaN(density) || isNaN(dsPercent)) {
      return null;
    }

    const volumeM3 = length * width * height;
    const totalKg = volumeM3 * density;
    const totalKgDs = totalKg * (dsPercent / 100);

    return {
      volumeM3: volumeM3.toFixed(2),
      totalKg: totalKg.toFixed(0),
      totalKgDs: totalKgDs.toFixed(0),
    };
  };

  const siloCalculation = calculateStockFromSilo();

  // Handle silo calculator save
  const handleSaveSiloCalculation = (feedId: number) => {
    if (siloCalculation) {
      updateStockMutation.mutate({ 
        feedId, 
        currentStockKg: parseFloat(siloCalculation.totalKgDs) 
      });
      setShowSiloCalculator(null);
      setSiloLength('');
      setSiloWidth('');
      setSiloHeight('');
    }
  };

  // Get unique categories
  const categories = [...new Set(inventory?.map(item => item.feed?.category).filter(Boolean))];

  // Filter inventory by category
  const filteredInventory = filterCategory === 'all' 
    ? inventory 
    : inventory?.filter(item => item.feed?.category === filterCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📦</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Voorraad Beheer</h1>
                <p className="text-sm text-gray-500">Ruwvoerpositie & Voorraden</p>
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
        {/* Category Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterCategory === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Alle Producten
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setFilterCategory(category as string)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterCategory === category
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Inventory Items */}
        <div className="space-y-4">
          {filteredInventory?.map((item) => {
            const daysRemaining = calculateDaysRemaining(item.currentStockKg, item.dailyUsageRateKg);
            const status = getStockStatus(daysRemaining);
            const progressPercent = daysRemaining ? Math.min((daysRemaining / 365) * 100, 100) : 0;

            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {item.feed?.displayName || 'Onbekend Product'}
                    </h3>
                    <p className="text-sm text-gray-500">{item.feed?.category}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color} flex items-center gap-1`}>
                    <span>{status.icon}</span>
                    <span>{status.label}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                {daysRemaining !== null && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Dagen Voorraad</span>
                      <span className={`text-lg font-bold ${status.color}`}>
                        {daysRemaining} dagen
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          daysRemaining < 180 ? 'bg-red-500' : 
                          daysRemaining < 365 ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0 dagen</span>
                      <span>180 dagen</span>
                      <span>365 dagen</span>
                    </div>
                  </div>
                )}

                {/* Stock Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Huidige Voorraad</p>
                    {editingStock === item.id ? (
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={stockValue}
                          onChange={(e) => setStockValue(e.target.value)}
                          className="w-20 border rounded px-2 py-1 text-sm"
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
                      <p
                        className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-green-600"
                        onClick={() => {
                          setEditingStock(item.id);
                          setStockValue(item.currentStockKg.toString());
                        }}
                      >
                        {item.currentStockKg.toLocaleString('nl-NL')} kg DS ✏️
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Dagelijks Verbruik</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.dailyUsageRateKg.toLocaleString('nl-NL')} kg/dag
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Laatste Levering</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.lastDeliveryKg ? `${item.lastDeliveryKg.toLocaleString('nl-NL')} kg` : '-'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(item.lastDeliveryDate)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Minimale Voorraad</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.minimumStockKg.toLocaleString('nl-NL')} kg DS
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSiloCalculator(item.id)}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                  >
                    📏 Silo Berekenen
                  </button>
                  <button
                    onClick={() => setShowDeliveryForm(item.id)}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                  >
                    📦 Levering Registreren
                  </button>
                </div>

                {/* Silo Calculator */}
                {showSiloCalculator === item.id && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3">Silo Calculator (m³ → kg DS)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-600">Lengte (m)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={siloLength}
                          onChange={(e) => setSiloLength(e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="bijv. 50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Breedte (m)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={siloWidth}
                          onChange={(e) => setSiloWidth(e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="bijv. 10"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Hoogte (m)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={siloHeight}
                          onChange={(e) => setSiloHeight(e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="bijv. 2.5"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Dichtheid (kg/m³)</label>
                        <input
                          type="number"
                          value={siloDensity}
                          onChange={(e) => setSiloDensity(e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="240 (gras) / 250 (maïs)"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">DS %</label>
                        <input
                          type="number"
                          value={siloDsPercent}
                          onChange={(e) => setSiloDsPercent(e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="bijv. 45"
                        />
                      </div>
                    </div>

                    {siloCalculation && (
                      <div className="bg-white p-3 rounded border border-blue-300 mb-3">
                        <p className="text-xs text-gray-600 mb-1">Berekening:</p>
                        <p className="text-sm font-mono text-gray-700">
                          Volume: {siloCalculation.volumeM3} m³<br />
                          Totaal: {siloCalculation.totalKg} kg product<br />
                          <strong>Droge Stof: {siloCalculation.totalKgDs} kg DS</strong>
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveSiloCalculation(item.feedId)}
                        disabled={!siloCalculation}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={() => setShowSiloCalculator(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}

                {/* Delivery Form */}
                {showDeliveryForm === item.id && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-900 mb-3">Levering Registreren</h4>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={deliveryAmount}
                        onChange={(e) => setDeliveryAmount(e.target.value)}
                        placeholder="Hoeveelheid (kg DS)"
                        className="flex-1 border rounded px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => handleRecordDelivery(item.feedId)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={() => setShowDeliveryForm(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredInventory?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-5xl mb-4 block">📦</span>
            <p>Geen voorraad gevonden voor deze categorie.</p>
          </div>
        )}
      </main>
    </div>
  );
}
