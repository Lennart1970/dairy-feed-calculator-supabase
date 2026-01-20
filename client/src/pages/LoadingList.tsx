import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { trpc } from '../lib/trpc';

type HerdGroup = {
  id: number;
  name: string;
  cowCount: number;
  lifeStage: string;
  avgMilkYieldKg: number;
};

type GroupRation = {
  id: number;
  groupId: number;
  feedId: number;
  amountKgDs: number;
  feedingMethod: string;
  loadOrder: number;
  feed: {
    id: number;
    name: string;
    displayName: string;
    category: string;
    vemPerUnit: number;
    dvePerUnit: number;
    oebPerUnit: number;
    swPerKgDs: number;
    vwPerKgDs: number | null;
  } | null;
};

type LoadingItem = {
  feedId: number;
  feedName: string;
  displayName: string;
  category: string;
  totalKgDs: number;
  groups: { groupId: number; groupName: string; kgDs: number; cowCount: number }[];
  loadOrder: number;
};

export default function LoadingList() {
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [mixerCapacityKg, setMixerCapacityKg] = useState<number>(12000);

  // Fetch data
  const { data: groups } = trpc.herdGroups.list.useQuery();
  
  // Fetch rations for all selected groups
  const rationQueries = selectedGroups.map(groupId => 
    trpc.groupRations.get.useQuery({ groupId }, { enabled: selectedGroups.includes(groupId) })
  );

  // Combine all rations into loading list
  const loadingList = useMemo(() => {
    const feedMap = new Map<number, LoadingItem>();
    
    rationQueries.forEach((query, index) => {
      if (!query.data) return;
      const groupId = selectedGroups[index];
      const group = groups?.find(g => g.id === groupId);
      if (!group) return;

      query.data.forEach(ration => {
        if (!ration.feed) return;
        
        const totalForGroup = ration.amountKgDs * group.cowCount;
        
        if (feedMap.has(ration.feedId)) {
          const existing = feedMap.get(ration.feedId)!;
          existing.totalKgDs += totalForGroup;
          existing.groups.push({
            groupId: group.id,
            groupName: group.name,
            kgDs: totalForGroup,
            cowCount: group.cowCount,
          });
        } else {
          feedMap.set(ration.feedId, {
            feedId: ration.feedId,
            feedName: ration.feed.name,
            displayName: ration.feed.displayName,
            category: ration.feed.category,
            totalKgDs: totalForGroup,
            groups: [{
              groupId: group.id,
              groupName: group.name,
              kgDs: totalForGroup,
              cowCount: group.cowCount,
            }],
            loadOrder: ration.loadOrder || 0,
          });
        }
      });
    });

    // Sort by load order, then by category (roughage first)
    return Array.from(feedMap.values()).sort((a, b) => {
      if (a.loadOrder !== b.loadOrder) return a.loadOrder - b.loadOrder;
      if (a.category === 'ruwvoer' && b.category !== 'ruwvoer') return -1;
      if (a.category !== 'ruwvoer' && b.category === 'ruwvoer') return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [rationQueries, selectedGroups, groups]);

  // Calculate totals
  const totalKgDs = loadingList.reduce((sum, item) => sum + item.totalKgDs, 0);
  const totalCows = selectedGroups.reduce((sum, groupId) => {
    const group = groups?.find(g => g.id === groupId);
    return sum + (group?.cowCount || 0);
  }, 0);

  // Check if load exceeds mixer capacity
  const loadExceedsCapacity = totalKgDs > mixerCapacityKg;
  const loadPercentage = mixerCapacityKg > 0 ? (totalKgDs / mixerCapacityKg) * 100 : 0;

  // Toggle group selection
  const toggleGroup = (groupId: number) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Select all lactating groups
  const selectAllLactating = () => {
    const lactatingIds = groups?.filter(g => g.lifeStage === 'lactating').map(g => g.id) || [];
    setSelectedGroups(lactatingIds);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📋</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Laadlijst Voermengwagen</h1>
                <p className="text-sm text-gray-500">Voer laden per groep</p>
              </div>
            </div>
            <Link href="/">
              <a className="text-green-600 hover:text-green-800 flex items-center gap-1">
                ← Terug naar Dashboard
              </a>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Group Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                👥 Selecteer Groepen
              </h2>
              
              <div className="space-y-3 mb-4">
                {groups?.map(group => (
                  <label 
                    key={group.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedGroups.includes(group.id)
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() => toggleGroup(group.id)}
                      className="w-5 h-5 text-green-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{group.name}</div>
                      <div className="text-sm text-gray-500">
                        {group.cowCount} koeien • {group.lifeStage === 'dry' ? 'Droog' : `${group.avgMilkYieldKg} kg melk`}
                      </div>
                    </div>
                    <span className="text-xl">
                      {group.lifeStage === 'dry' ? '🤰' : '🐄'}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={selectAllLactating}
                  className="flex-1 text-sm px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  Alle Lacterend
                </button>
                <button
                  onClick={() => setSelectedGroups([])}
                  className="flex-1 text-sm px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Wissen
                </button>
              </div>

              {/* Mixer Capacity */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mengwagen Capaciteit (kg)
                </label>
                <input
                  type="number"
                  value={mixerCapacityKg}
                  onChange={(e) => setMixerCapacityKg(parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              {/* Load Summary */}
              {selectedGroups.length > 0 && (
                <div className={`mt-4 p-4 rounded-lg ${loadExceedsCapacity ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <div className="text-sm font-medium text-gray-700 mb-2">Lading Samenvatting</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Totaal koeien:</span>
                      <span className="font-medium">{totalCows}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Totaal voer:</span>
                      <span className={`font-medium ${loadExceedsCapacity ? 'text-red-600' : 'text-green-600'}`}>
                        {totalKgDs.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} kg DS
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Capaciteit:</span>
                      <span className="font-medium">{loadPercentage.toFixed(0)}%</span>
                    </div>
                  </div>
                  {loadExceedsCapacity && (
                    <div className="mt-2 text-red-600 text-sm font-medium">
                      ⚠️ Lading overschrijdt capaciteit!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Loading List */}
          <div className="lg:col-span-2">
            {selectedGroups.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <span className="text-6xl mb-4 block">📋</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecteer groepen om te laden</h3>
                <p className="text-gray-500">Kies één of meer koegroepen aan de linkerkant</p>
              </div>
            ) : loadingList.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <span className="text-6xl mb-4 block">🍽️</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Geen rantsoenen gevonden</h3>
                <p className="text-gray-500">De geselecteerde groepen hebben nog geen rantsoen toegewezen.</p>
                <Link href="/groepen">
                  <a className="mt-4 inline-block text-green-600 hover:text-green-800">
                    Ga naar Groepen Beheren →
                  </a>
                </Link>
              </div>
            ) : (
              <>
                {/* Loading Order Header */}
                <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl shadow-lg p-6 text-white mb-6">
                  <h2 className="text-2xl font-bold mb-2">🚜 Laadvolgorde</h2>
                  <p className="opacity-90">
                    {loadingList.length} producten voor {totalCows} koeien • {totalKgDs.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} kg DS totaal
                  </p>
                </div>

                {/* Loading Items */}
                <div className="space-y-4">
                  {loadingList.map((item, index) => (
                    <div 
                      key={item.feedId}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                    >
                      <div className="flex items-center gap-4 p-4 bg-gray-50 border-b border-gray-100">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-xl font-bold text-orange-600">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{item.displayName}</div>
                          <div className="text-sm text-gray-500">{item.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-orange-600">
                            {item.totalKgDs.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} kg
                          </div>
                          <div className="text-xs text-gray-500">DS</div>
                        </div>
                      </div>
                      
                      {/* Breakdown by group */}
                      <div className="p-4">
                        <div className="text-xs text-gray-500 uppercase mb-2">Verdeling per groep:</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {item.groups.map(g => (
                            <div key={g.groupId} className="bg-gray-50 rounded-lg p-2 text-sm">
                              <div className="font-medium text-gray-900">{g.groupName}</div>
                              <div className="text-gray-600">
                                {g.kgDs.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} kg ({g.cowCount} koeien)
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Print Button */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => window.print()}
                    className="bg-orange-600 text-white px-8 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 font-medium"
                  >
                    🖨️ Laadlijst Printen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
