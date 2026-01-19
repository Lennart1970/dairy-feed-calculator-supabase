import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { trpc } from '../lib/trpc';
import { ArrowLeft, Save, Calculator, AlertTriangle, CheckCircle, TrendingUp, Download } from 'lucide-react';
import { 
  calculateFPCM, 
  calculateVemMaintenance, 
  calculateVemProduction,
  calculateDveMaintenance,
  calculateDveProduction
} from '../lib/cvbConstants';
import { calculateGap, formatGapAnalysis, calculateConcentrateCost } from '../lib/gapAnalysis';

// Calculate requirements for a herd group
function calculateGroupRequirements(group: {
  avgWeightKg: number;
  avgMilkYieldKg: number;
  avgFatPercent: number;
  avgProteinPercent: number;
  lifeStage: string;
}) {
  if (group.lifeStage === 'dry') {
    const vemMaintenance = 42.4 * Math.pow(group.avgWeightKg, 0.75);
    const dveMaintenance = 54 + 0.1 * group.avgWeightKg;
    return {
      fpcm: 0,
      vemPerCow: Math.round(vemMaintenance),
      dvePerCow: Math.round(dveMaintenance),
      oebPerCow: 0,
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
    vemPerCow: Math.round(vemMaintenance + vemProduction),
    dvePerCow: Math.round(dveMaintenance + dveProduction),
    oebPerCow: 0, // Simplified for now
  };
}

export default function RationAssignment() {
  const [selectedRationId, setSelectedRationId] = useState<number | null>(null);
  const [groupAssignments, setGroupAssignments] = useState<Record<number, number>>({});

  // Fetch data
  const { data: baseRations } = trpc.baseRations.list.useQuery();
  const { data: groups, refetch: refetchGroups } = trpc.herdGroups.list.useQuery();
  const { data: selectedRation } = trpc.baseRations.get.useQuery(
    { rationId: selectedRationId! },
    { enabled: selectedRationId !== null }
  );
  const { data: rationDensity } = trpc.baseRations.calculateDensity.useQuery(
    { rationId: selectedRationId! },
    { enabled: selectedRationId !== null }
  );

  // Mutation
  const updateGroupMutation = trpc.herdGroups.update.useMutation({
    onSuccess: () => {
      refetchGroups();
    },
  });

  // Calculate gap analysis for each group
  const groupAnalyses = useMemo(() => {
    if (!groups || !rationDensity) return [];

    return groups.map(group => {
      const requirements = calculateGroupRequirements(group);
      const gap = calculateGap(rationDensity, requirements);
      const cost = calculateConcentrateCost(gap.concentrateKgDs, group.cowCount);
      const formatted = formatGapAnalysis(gap);

      return {
        group,
        requirements,
        gap,
        cost,
        formatted,
      };
    });
  }, [groups, rationDensity]);

  // Total concentrate cost
  const totalCost = useMemo(() => {
    return groupAnalyses.reduce((sum, analysis) => sum + analysis.cost.dailyCostTotal, 0);
  }, [groupAnalyses]);

  // Export concentrate settings to CSV
  const handleExportCSV = () => {
    if (groupAnalyses.length === 0) return;

    const csvRows = [
      ['Groep', 'Koeien', 'Krachtvoer (kg DS/koe)', 'Totaal (kg DS/dag)', 'Kosten (€/dag)'],
      ...groupAnalyses.map(({ group, gap, cost }) => [
        group.name,
        group.cowCount.toString(),
        gap.concentrateKgDs.toFixed(1),
        (gap.concentrateKgDs * group.cowCount).toFixed(1),
        cost.dailyCostTotal.toFixed(2),
      ]),
      ['', '', '', 'Totaal:', totalCost.toFixed(2)],
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `krachtvoer-advies-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle assign ration to all groups
  const handleAssignToAll = async () => {
    if (!selectedRationId) {
      alert('Selecteer eerst een basisrantsoen');
      return;
    }

    if (!confirm(`Wilt u "${selectedRation?.name}" toewijzen aan alle groepen?`)) {
      return;
    }

    try {
      for (const analysis of groupAnalyses) {
        await updateGroupMutation.mutateAsync({
          groupId: analysis.group.id,
          baseRationId: selectedRationId,
          concentrateKgPerCow: analysis.gap.concentrateKgDs,
        });
      }
      alert('Basisrantsoen toegewezen aan alle groepen!');
    } catch (error) {
      console.error('Error assigning ration:', error);
      alert('Fout bij toewijzen rantsoen');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard">
            <a className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Terug naar Dashboard
            </a>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rantsoen Toewijzing & Gap Analyse</h1>
              <p className="text-gray-600">Wijs basisrantsoen toe en bereken krachtvoer behoefte</p>
            </div>
          </div>
        </div>

        {/* Base Ration Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Selecteer Basisrantsoen</h2>
          
          {!baseRations || baseRations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Geen basisrantsoen beschikbaar</p>
              <Link href="/basisrantsoen">
                <a className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">
                  → Maak een basisrantsoen aan
                </a>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {baseRations.map(ration => (
                <div
                  key={ration.id}
                  onClick={() => setSelectedRationId(ration.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedRationId === ration.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{ration.name}</h3>
                      {ration.description && (
                        <p className="text-sm text-gray-500">{ration.description}</p>
                      )}
                      {ration.targetMilkKg && (
                        <p className="text-xs text-gray-400 mt-1">
                          Streef: {ration.targetMilkKg} kg melk
                        </p>
                      )}
                    </div>
                    {selectedRationId === ration.id && (
                      <CheckCircle className="w-6 h-6 text-indigo-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedRationId && rationDensity && (
            <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">Mix Samenstelling:</p>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-indigo-600">{rationDensity.vemPerKgDs}</p>
                  <p className="text-xs text-gray-600">VEM/kg DS</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-600">{rationDensity.dvePerKgDs}</p>
                  <p className="text-xs text-gray-600">DVE/kg DS</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{rationDensity.oebPerKgDs}</p>
                  <p className="text-xs text-gray-600">OEB/kg DS</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-purple-600">{rationDensity.swPerKgDs}</p>
                  <p className="text-xs text-gray-600">SW/kg DS</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gap Analysis Results */}
        {selectedRationId && rationDensity && groupAnalyses.length > 0 && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">2. Gap Analyse per Groep</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                  <button
                    onClick={handleAssignToAll}
                    disabled={updateGroupMutation.isPending}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {updateGroupMutation.isPending ? 'Bezig...' : 'Toewijzen aan Alle Groepen'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {groupAnalyses.map(({ group, requirements, gap, cost, formatted }) => (
                  <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                    {/* Group Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          {group.lifeStage === 'dry' ? '🤰' : '🐄'} {group.name}
                          <span className="text-sm text-gray-500">({group.cowCount} koeien)</span>
                        </h3>
                        <p className="text-sm text-gray-600">
                          {group.lifeStage === 'dry' ? 'Droogstaand' : `${group.avgMilkYieldKg} kg melk/dag`}
                        </p>
                      </div>
                      {gap.isDeficit ? (
                        <AlertTriangle className="w-6 h-6 text-yellow-500" />
                      ) : (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      )}
                    </div>

                    {/* Requirements vs Supply */}
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-xs text-gray-500 mb-1">Behoefte</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {requirements.vemPerCow} VEM
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          {requirements.dvePerCow}g DVE
                        </p>
                      </div>
                      <div className="bg-green-50 rounded p-3">
                        <p className="text-xs text-gray-500 mb-1">Basisrantsoen</p>
                        <p className="text-sm font-semibold text-green-700">
                          {gap.baseRationVem} VEM
                        </p>
                        <p className="text-sm font-semibold text-green-700">
                          {gap.baseRationDve}g DVE
                        </p>
                      </div>
                      <div className={`rounded p-3 ${gap.isDeficit ? 'bg-yellow-50' : 'bg-green-50'}`}>
                        <p className="text-xs text-gray-500 mb-1">Tekort</p>
                        <p className={`text-sm font-semibold ${gap.isDeficit ? 'text-yellow-700' : 'text-green-700'}`}>
                          {gap.gapVem} VEM
                        </p>
                        <p className={`text-sm font-semibold ${gap.isDeficit ? 'text-yellow-700' : 'text-green-700'}`}>
                          {gap.gapDve}g DVE
                        </p>
                      </div>
                    </div>

                    {/* Recommendation */}
                    {gap.isDeficit && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-indigo-900">{formatted.recommendation}</p>
                            <p className="text-xs text-indigo-700 mt-1">{formatted.summary}</p>
                            {formatted.warning && (
                              <p className="text-xs text-yellow-700 mt-1">⚠️ {formatted.warning}</p>
                            )}
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-600">Kosten per koe:</span>
                                <span className="font-semibold text-gray-900 ml-1">
                                  €{cost.dailyCostPerCow}/dag
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Groep totaal:</span>
                                <span className="font-semibold text-gray-900 ml-1">
                                  €{cost.dailyCostTotal}/dag
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Total Cost Summary */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-lg p-6 text-white">
              <h2 className="text-xl font-semibold mb-4">Totale Krachtvoer Kosten</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm opacity-90">Per Dag</p>
                  <p className="text-3xl font-bold">€{Math.round(totalCost)}</p>
                </div>
                <div>
                  <p className="text-sm opacity-90">Per Week</p>
                  <p className="text-3xl font-bold">€{Math.round(totalCost * 7)}</p>
                </div>
                <div>
                  <p className="text-sm opacity-90">Per Maand</p>
                  <p className="text-3xl font-bold">€{Math.round(totalCost * 30)}</p>
                </div>
                <div>
                  <p className="text-sm opacity-90">Per Jaar</p>
                  <p className="text-3xl font-bold">€{Math.round(totalCost * 365).toLocaleString('nl-NL')}</p>
                </div>
              </div>
              <p className="text-sm opacity-75 mt-4">
                * Gebaseerd op €350/ton DS krachtvoer
              </p>
            </div>
          </>
        )}

        {/* No Selection State */}
        {!selectedRationId && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Selecteer een basisrantsoen om de gap analyse te zien</p>
          </div>
        )}
      </div>
    </div>
  );
}
