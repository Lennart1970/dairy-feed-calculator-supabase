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

type HerdGroup = {
  id: number;
  name: string;
  cowCount: number;
  avgWeightKg: number;
  avgMilkYieldKg: number;
  avgFatPercent: number;
  avgProteinPercent: number;
  avgDaysInMilk: number;
  lifeStage: string;
};

type GroupFormData = Omit<HerdGroup, 'id'>;

const defaultFormData: GroupFormData = {
  name: '',
  cowCount: 20,
  avgWeightKg: 650,
  avgMilkYieldKg: 30,
  avgFatPercent: 4.40,
  avgProteinPercent: 3.50,
  avgDaysInMilk: 150,
  lifeStage: 'lactating',
};

// Calculate requirements for a herd group
function calculateGroupRequirements(group: GroupFormData) {
  if (group.lifeStage === 'dry') {
    const vemMaintenance = 42.4 * Math.pow(group.avgWeightKg, 0.75);
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

export default function HerdGroups() {
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<HerdGroup | null>(null);
  const [formData, setFormData] = useState<GroupFormData>(defaultFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Fetch groups
  const { data: groups, refetch } = trpc.herdGroups.list.useQuery();

  // Mutations
  const createMutation = trpc.herdGroups.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowForm(false);
      setFormData(defaultFormData);
    },
  });

  const updateMutation = trpc.herdGroups.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingGroup(null);
      setShowForm(false);
      setFormData(defaultFormData);
    },
  });

  const deleteMutation = trpc.herdGroups.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDeleteConfirm(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGroup) {
      updateMutation.mutate({
        groupId: editingGroup.id,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (group: HerdGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      cowCount: group.cowCount,
      avgWeightKg: group.avgWeightKg,
      avgMilkYieldKg: group.avgMilkYieldKg,
      avgFatPercent: group.avgFatPercent,
      avgProteinPercent: group.avgProteinPercent,
      avgDaysInMilk: group.avgDaysInMilk,
      lifeStage: group.lifeStage,
    });
    setShowForm(true);
  };

  const handleDelete = (groupId: number) => {
    deleteMutation.mutate({ groupId });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingGroup(null);
    setFormData(defaultFormData);
  };

  // Calculate live preview
  const previewRequirements = calculateGroupRequirements(formData);

  // Calculate totals
  const totals = groups?.reduce((acc, g) => {
    const req = calculateGroupRequirements(g);
    return {
      cows: acc.cows + g.cowCount,
      milk: acc.milk + (g.lifeStage === 'dry' ? 0 : g.cowCount * g.avgMilkYieldKg),
      vem: acc.vem + (req.vem * g.cowCount),
      dve: acc.dve + (req.dve * g.cowCount),
    };
  }, { cows: 0, milk: 0, vem: 0, dve: 0 }) || { cows: 0, milk: 0, vem: 0, dve: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👥</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Koegroepen Beheren</h1>
                <p className="text-sm text-gray-500">Groepen aanmaken en bewerken</p>
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
        {/* Summary Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{totals.cows}</p>
              <p className="text-xs text-gray-500">Totaal Koeien</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{totals.milk.toLocaleString('nl-NL')} kg</p>
              <p className="text-xs text-gray-500">Dagelijkse Melk</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{(totals.vem / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 0 })}k</p>
              <p className="text-xs text-gray-500">VEM/dag</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{(totals.dve / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} kg</p>
              <p className="text-xs text-gray-500">DVE/dag</p>
            </div>
          </div>
        </div>

        {/* Add Group Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
          >
            <span className="text-xl">+</span> Nieuwe Groep Toevoegen
          </button>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingGroup ? `Groep Bewerken: ${editingGroup.name}` : 'Nieuwe Groep Aanmaken'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Group Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Groepsnaam *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="bijv. Hoogproductief"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Life Stage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Levensfase *
                  </label>
                  <select
                    value={formData.lifeStage}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      lifeStage: e.target.value,
                      avgMilkYieldKg: e.target.value === 'dry' ? 0 : formData.avgMilkYieldKg || 30,
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="lactating">🐄 Lacterend</option>
                    <option value="dry">🤰 Droogstaand</option>
                  </select>
                </div>

                {/* Cow Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aantal Koeien *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.cowCount}
                    onChange={(e) => setFormData({ ...formData, cowCount: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Average Weight */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gem. Gewicht (kg)
                  </label>
                  <input
                    type="number"
                    min="400"
                    max="900"
                    value={formData.avgWeightKg}
                    onChange={(e) => setFormData({ ...formData, avgWeightKg: parseInt(e.target.value) || 650 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Milk Yield (only for lactating) */}
                {formData.lifeStage === 'lactating' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gem. Melkgift (kg/dag)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="60"
                        value={formData.avgMilkYieldKg}
                        onChange={(e) => setFormData({ ...formData, avgMilkYieldKg: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gem. Vet (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="2.5"
                        max="6.0"
                        value={formData.avgFatPercent}
                        onChange={(e) => setFormData({ ...formData, avgFatPercent: parseFloat(e.target.value) || 4.4 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gem. Eiwit (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="2.5"
                        max="5.0"
                        value={formData.avgProteinPercent}
                        onChange={(e) => setFormData({ ...formData, avgProteinPercent: parseFloat(e.target.value) || 3.5 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gem. Lactatiedagen (DIM)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={formData.avgDaysInMilk}
                        onChange={(e) => setFormData({ ...formData, avgDaysInMilk: parseInt(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Live Preview */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Berekende Behoefte per Koe:</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-blue-600">{previewRequirements.fpcm > 0 ? previewRequirements.fpcm.toFixed(1) : '-'}</p>
                    <p className="text-xs text-gray-500">FPCM (kg)</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-orange-600">{previewRequirements.vem.toLocaleString('nl-NL')}</p>
                    <p className="text-xs text-gray-500">VEM</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-purple-600">{previewRequirements.dve}g</p>
                    <p className="text-xs text-gray-500">DVE</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Totaal voor groep: {(previewRequirements.vem * formData.cowCount).toLocaleString('nl-NL')} VEM, {((previewRequirements.dve * formData.cowCount) / 1000).toFixed(1)} kg DVE
                </p>
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Opslaan...' : (editingGroup ? 'Wijzigingen Opslaan' : 'Groep Aanmaken')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Groups List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Bestaande Groepen</h2>
          </div>
          
          {groups?.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <span className="text-5xl mb-4 block">👥</span>
              <p>Nog geen groepen aangemaakt.</p>
              <p className="text-sm">Klik op "Nieuwe Groep Toevoegen" om te beginnen.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {groups?.map((group) => {
                const req = calculateGroupRequirements(group);
                return (
                  <div key={group.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">
                          {group.lifeStage === 'dry' ? '🤰' : '🐄'}
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                          <p className="text-sm text-gray-500">
                            {group.cowCount} koeien • {group.lifeStage === 'dry' ? 'Droogstaand' : `${group.avgMilkYieldKg} kg melk/dag`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Link href={`/?groupId=${group.id}`}>
                          <a className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 text-sm">
                            📊 Rantsoen
                          </a>
                        </Link>
                        <button
                          onClick={() => handleEdit(group)}
                          className="text-green-600 hover:text-green-800 px-3 py-1 rounded border border-green-200 hover:bg-green-50 text-sm"
                        >
                          ✏️ Bewerken
                        </button>
                        {deleteConfirm === group.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(group.id)}
                              className="text-red-600 hover:text-red-800 px-2 py-1 rounded bg-red-100 text-sm"
                            >
                              Ja, verwijderen
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-gray-600 hover:text-gray-800 px-2 py-1 rounded bg-gray-100 text-sm"
                            >
                              Nee
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(group.id)}
                            className="text-red-600 hover:text-red-800 px-3 py-1 rounded border border-red-200 hover:bg-red-50 text-sm"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Group Details */}
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-gray-900">{group.avgWeightKg}</p>
                        <p className="text-xs text-gray-500">Gewicht (kg)</p>
                      </div>
                      {group.lifeStage === 'lactating' && (
                        <>
                          <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-blue-600">{req.fpcm.toFixed(1)}</p>
                            <p className="text-xs text-gray-500">FPCM (kg)</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-gray-900">{group.avgFatPercent}%</p>
                            <p className="text-xs text-gray-500">Vet</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-gray-900">{group.avgProteinPercent}%</p>
                            <p className="text-xs text-gray-500">Eiwit</p>
                          </div>
                        </>
                      )}
                      <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-orange-600">{req.vem.toLocaleString('nl-NL')}</p>
                        <p className="text-xs text-gray-500">VEM/koe</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-purple-600">{req.dve}g</p>
                        <p className="text-xs text-gray-500">DVE/koe</p>
                      </div>
                    </div>

                    {/* Group Totals */}
                    <div className="mt-3 text-sm text-gray-500 flex gap-4">
                      <span>📊 Groep totaal: {(req.vem * group.cowCount).toLocaleString('nl-NL')} VEM</span>
                      <span>•</span>
                      <span>{((req.dve * group.cowCount) / 1000).toFixed(1)} kg DVE</span>
                      {group.lifeStage === 'lactating' && (
                        <>
                          <span>•</span>
                          <span>{(group.avgMilkYieldKg * group.cowCount).toLocaleString('nl-NL')} kg melk/dag</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
