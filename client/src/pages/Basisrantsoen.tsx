import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { trpc } from '../lib/trpc';
import { Wheat, Plus, Trash2, Save, Calculator, ArrowLeft, Info } from 'lucide-react';

type Feed = {
  id: number;
  name: string;
  displayName: string;
  category: string;
  vemPerUnit: number;
  dvePerUnit: number;
  oebPerUnit: number;
  swPerKgDs: number;
  vwPerKgDs: number | null;
  dsPercent: number;
};

type RationFeed = {
  feed: Feed;
  percentage: number;
};

export default function Basisrantsoen() {
  const [rationName, setRationName] = useState<string>('');
  const [rationDescription, setRationDescription] = useState<string>('');
  const [targetMilkKg, setTargetMilkKg] = useState<number>(24);
  const [selectedFeeds, setSelectedFeeds] = useState<RationFeed[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);

  // Fetch available feeds (roughage only)
  const { data: allFeeds } = trpc.feeds.list.useQuery();
  const roughageFeeds = useMemo(() => {
    if (!allFeeds) return [];
    return allFeeds.filter(f => f.category === 'roughage' || f.category === 'ruwvoer');
  }, [allFeeds]);

  // Mutations
  const createMutation = trpc.baseRations.create.useMutation();
  const setFeedsMutation = trpc.baseRations.setFeeds.useMutation();

  // Calculate mix density
  const mixDensity = useMemo(() => {
    if (selectedFeeds.length === 0) {
      return { vem: 0, dve: 0, oeb: 0, sw: 0, vw: 0, totalPercentage: 0 };
    }

    let totalVem = 0;
    let totalDve = 0;
    let totalOeb = 0;
    let totalSw = 0;
    let totalVw = 0;
    let totalPercentage = 0;

    selectedFeeds.forEach(({ feed, percentage }) => {
      const weight = percentage / 100;
      totalPercentage += percentage;
      totalVem += feed.vemPerUnit * weight;
      totalDve += feed.dvePerUnit * weight;
      totalOeb += feed.oebPerUnit * weight;
      totalSw += feed.swPerKgDs * weight;
      totalVw += (feed.vwPerKgDs || 0) * weight;
    });

    return {
      vem: Math.round(totalVem),
      dve: Math.round(totalDve),
      oeb: Math.round(totalOeb),
      sw: Math.round(totalSw * 100) / 100,
      vw: Math.round(totalVw * 100) / 100,
      totalPercentage: Math.round(totalPercentage * 10) / 10,
    };
  }, [selectedFeeds]);

  // Calculate milk support (simplified)
  const milkSupport = useMemo(() => {
    if (mixDensity.vem === 0) return 0;
    const intakeKgDs = 15; // Assume 15 kg DS intake
    const totalVem = mixDensity.vem * intakeKgDs;
    const maintenanceVem = 53.0 * Math.pow(650, 0.75); // Assume 650 kg cow
    const productionVem = totalVem - maintenanceVem;
    const milkKg = productionVem / 442; // VEM per kg FPCM
    return Math.max(0, Math.round(milkKg * 10) / 10);
  }, [mixDensity]);

  // Add feed to ration
  const handleAddFeed = (feedId: number) => {
    const feed = roughageFeeds.find(f => f.id === feedId);
    if (!feed) return;

    // Check if already added
    if (selectedFeeds.some(rf => rf.feed.id === feedId)) {
      alert('Dit voer is al toegevoegd');
      return;
    }

    setSelectedFeeds([...selectedFeeds, { feed, percentage: 0 }]);
  };

  // Remove feed from ration
  const handleRemoveFeed = (feedId: number) => {
    setSelectedFeeds(selectedFeeds.filter(rf => rf.feed.id !== feedId));
  };

  // Update feed percentage
  const handleUpdatePercentage = (feedId: number, percentage: number) => {
    setSelectedFeeds(
      selectedFeeds.map(rf =>
        rf.feed.id === feedId ? { ...rf, percentage } : rf
      )
    );
  };

  // Auto-distribute percentages
  const handleAutoDistribute = () => {
    if (selectedFeeds.length === 0) return;
    const equalPercentage = 100 / selectedFeeds.length;
    setSelectedFeeds(
      selectedFeeds.map(rf => ({ ...rf, percentage: Math.round(equalPercentage * 10) / 10 }))
    );
  };

  // Save ration
  const handleSave = async () => {
    if (!rationName.trim()) {
      alert('Voer een naam in voor het rantsoen');
      return;
    }

    if (selectedFeeds.length === 0) {
      alert('Voeg minimaal één voer toe');
      return;
    }

    if (Math.abs(mixDensity.totalPercentage - 100) > 0.1) {
      alert(`Percentages moeten optellen tot 100% (nu: ${mixDensity.totalPercentage}%)`);
      return;
    }

    try {
      // Create base ration
      const result = await createMutation.mutateAsync({
        farmId: 1,
        name: rationName,
        description: rationDescription || undefined,
        targetMilkKg: targetMilkKg,
        isActive: true,
      });

      if (!result.success || !result.rationId) {
        alert('Fout bij opslaan rantsoen');
        return;
      }

      // Add feeds to ration
      await setFeedsMutation.mutateAsync({
        rationId: result.rationId,
        feeds: selectedFeeds.map((rf, index) => ({
          feedId: rf.feed.id,
          percentage: rf.percentage,
          loadOrder: index,
        })),
      });

      alert(`Basisrantsoen "${rationName}" succesvol opgeslagen!`);
      
      // Reset form
      setRationName('');
      setRationDescription('');
      setTargetMilkKg(24);
      setSelectedFeeds([]);
      setShowSaveForm(false);
    } catch (error) {
      console.error('Error saving ration:', error);
      alert('Fout bij opslaan rantsoen');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard">
            <a className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-800 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Terug naar Dashboard
            </a>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <Wheat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Basisrantsoen Designer</h1>
              <p className="text-gray-600">Ontwerp het basisrantsoen voor de voermengwagen</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Wat is een basisrantsoen?</p>
              <p>
                Het basisrantsoen is de mix van ruwvoer die in de voermengwagen gaat en aan <strong>alle koeien</strong> wordt gevoerd.
                Dit rantsoen is ontworpen voor de "gemiddelde" of "laagproductieve" koe (bijv. onderhoud + 24 kg melk).
                Hoogproductieve koeien krijgen extra krachtvoer via de robot om het verschil te overbruggen.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Feed Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Selecteer Ruwvoer</h2>
            
            {/* Available Feeds */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschikbaar Ruwvoer
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddFeed(parseInt(e.target.value));
                    e.target.value = '';
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Kies een voer om toe te voegen...</option>
                {roughageFeeds.map(feed => (
                  <option key={feed.id} value={feed.id}>
                    {feed.displayName} ({feed.vemPerUnit} VEM, {feed.dvePerUnit} DVE)
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Feeds */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Geselecteerd Voer
                </label>
                {selectedFeeds.length > 0 && (
                  <button
                    onClick={handleAutoDistribute}
                    className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                  >
                    Gelijk verdelen
                  </button>
                )}
              </div>
              
              {selectedFeeds.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Wheat className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Geen voer geselecteerd</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedFeeds.map(({ feed, percentage }) => (
                    <div key={feed.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{feed.displayName}</p>
                        <p className="text-xs text-gray-500">
                          {feed.vemPerUnit} VEM | {feed.dvePerUnit} DVE | SW {feed.swPerKgDs}
                        </p>
                      </div>
                      <input
                        type="number"
                        value={percentage}
                        onChange={(e) => handleUpdatePercentage(feed.id, parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="text-sm text-gray-600">%</span>
                      <button
                        onClick={() => handleRemoveFeed(feed.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Percentage Check */}
            {selectedFeeds.length > 0 && (
              <div className={`p-3 rounded-lg ${
                Math.abs(mixDensity.totalPercentage - 100) < 0.1
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <p className="text-sm font-medium">
                  Totaal: <span className="text-lg">{mixDensity.totalPercentage}%</span>
                  {Math.abs(mixDensity.totalPercentage - 100) < 0.1 ? (
                    <span className="text-green-600 ml-2">✓ Correct</span>
                  ) : (
                    <span className="text-yellow-600 ml-2">⚠ Moet 100% zijn</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Mix Analysis */}
          <div className="space-y-6">
            {/* Mix Density */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-semibold text-gray-900">2. Mix Samenstelling</h2>
              </div>

              {selectedFeeds.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">Voeg voer toe om de samenstelling te zien</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Nutritional Density */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-orange-600">{mixDensity.vem}</p>
                      <p className="text-xs text-gray-600">VEM per kg DS</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{mixDensity.dve}</p>
                      <p className="text-xs text-gray-600">DVE per kg DS</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{mixDensity.oeb}</p>
                      <p className="text-xs text-gray-600">OEB per kg DS</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">{mixDensity.sw}</p>
                      <p className="text-xs text-gray-600">SW per kg DS</p>
                    </div>
                  </div>

                  {/* Structure Warning */}
                  {mixDensity.sw < 1.0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">
                        ⚠️ <strong>Waarschuwing:</strong> Structuurwaarde te laag (SW &lt; 1.0). Risico op pensacidose!
                      </p>
                    </div>
                  )}

                  {/* Milk Support Calculation */}
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 border border-orange-200">
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Melkondersteuning:</strong>
                    </p>
                    <p className="text-lg text-gray-900">
                      Bij 15 kg DS opname ondersteunt deze mix:
                    </p>
                    <p className="text-3xl font-bold text-orange-600 mt-2">
                      Onderhoud + {milkSupport} kg melk
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      (Gebaseerd op 650 kg koe, 53 VEM/kg^0.75 onderhoud, 442 VEM/kg FPCM)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Save Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Opslaan</h2>
              
              {!showSaveForm ? (
                <button
                  onClick={() => setShowSaveForm(true)}
                  disabled={selectedFeeds.length === 0 || Math.abs(mixDensity.totalPercentage - 100) > 0.1}
                  className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Rantsoen Opslaan
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rantsoen Naam *
                    </label>
                    <input
                      type="text"
                      value={rationName}
                      onChange={(e) => setRationName(e.target.value)}
                      placeholder="bijv. Winter Mix 2026"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Beschrijving (optioneel)
                    </label>
                    <textarea
                      value={rationDescription}
                      onChange={(e) => setRationDescription(e.target.value)}
                      placeholder="bijv. Standaard winterrantsoen voor laagproductieve koeien"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Streef Melkproductie (kg)
                    </label>
                    <input
                      type="number"
                      value={targetMilkKg}
                      onChange={(e) => setTargetMilkKg(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      min="0"
                      step="0.1"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={!rationName.trim() || createMutation.isPending}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {createMutation.isPending ? 'Bezig...' : 'Opslaan'}
                    </button>
                    <button
                      onClick={() => setShowSaveForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
