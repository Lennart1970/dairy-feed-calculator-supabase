import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { trpc } from '../lib/trpc';
import { ArrowLeft, Save, Calculator, AlertTriangle, CheckCircle, TrendingUp, Download, AlertCircle, Info, Zap, Scale, Beef } from 'lucide-react';
import { 
  calculateFPCM, 
  calculateVemMaintenance, 
  calculateVemProduction,
  calculateDveMaintenance,
  calculateDveProduction
} from '../lib/cvbConstants';
import { 
  calculateGap, 
  formatGapAnalysis, 
  calculateConcentrateCost,
  calculateBaseMilkSupport,
  calculateStrawNeeded,
  CVB_CONSTANTS,
  type GapAnalysisResult
} from '../lib/gapAnalysis';

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

// SW Status Badge Component
function SwStatusBadge({ gap }: { gap: GapAnalysisResult }) {
  const statusConfig = {
    safe: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', icon: CheckCircle },
    warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: AlertTriangle },
    danger: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: AlertCircle },
  };
  
  const config = statusConfig[gap.swStatus];
  const Icon = config.icon;
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}>
      <Icon className="w-3 h-3" />
      <span>SW {gap.finalSwPerKgDs}</span>
    </div>
  );
}

export default function RationAssignment() {
  const [selectedRationId, setSelectedRationId] = useState<number | null>(null);
  const [roughageIntake, setRoughageIntake] = useState<number>(15); // Default 15 kg DS

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

  // Calculate base milk support
  const baseMilkSupport = useMemo(() => {
    if (!rationDensity) return null;
    return calculateBaseMilkSupport(rationDensity, roughageIntake);
  }, [rationDensity, roughageIntake]);

  // Calculate gap analysis for each group
  const groupAnalyses = useMemo(() => {
    if (!groups || !rationDensity) return [];

    return groups.map(group => {
      const requirements = calculateGroupRequirements(group);
      const gap = calculateGap(
        rationDensity, 
        requirements, 
        roughageIntake,
        undefined, // Use default concentrate
        group.avgMilkYieldKg // Target milk from group
      );
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
  }, [groups, rationDensity, roughageIntake]);

  // Total concentrate cost
  const totalCost = useMemo(() => {
    return groupAnalyses.reduce((sum, analysis) => sum + analysis.cost.dailyCostTotal, 0);
  }, [groupAnalyses]);

  // Check for any acidosis risks
  const hasAcidosisRisk = useMemo(() => {
    return groupAnalyses.some(a => a.gap.acidosisRisk);
  }, [groupAnalyses]);

  // Export concentrate settings to CSV
  const handleExportCSV = () => {
    if (groupAnalyses.length === 0) return;

    const csvRows = [
      ['Groep', 'Koeien', 'Doel (kg melk)', 'Basis Support (kg)', 'Gap (kg)', 'Krachtvoer (kg DS)', 'Verdringing (kg)', 'SW na subst.', 'Kosten (€/dag)'],
      ...groupAnalyses.map(({ group, gap, cost }) => [
        group.name,
        group.cowCount.toString(),
        gap.targetMilkKg.toString(),
        gap.baseMilkSupportKg.toString(),
        gap.gapMilkKg.toString(),
        gap.concentrateKgDs.toFixed(1),
        gap.roughageDisplacementKgDs.toFixed(1),
        gap.finalSwPerKgDs.toFixed(2),
        cost.dailyCostTotal.toFixed(2),
      ]),
      ['', '', '', '', '', '', '', 'Totaal:', totalCost.toFixed(2)],
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pmr-gap-analyse-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle assign ration to all groups
  const handleAssignToAll = async () => {
    if (!selectedRationId) {
      alert('Selecteer eerst een basisrantsoen');
      return;
    }

    if (hasAcidosisRisk) {
      if (!confirm('⚠️ WAARSCHUWING: Er zijn groepen met acidose risico!\n\nWilt u toch doorgaan?')) {
        return;
      }
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
          <Link href="/">
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
              <h1 className="text-3xl font-bold text-gray-900">Two-Tier PMR System</h1>
              <p className="text-gray-600">Basisrantsoen → Gap Analyse → Krachtvoer per Groep</p>
            </div>
          </div>
        </div>

        {/* PMR Methodology Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">PMR Methodologie (CVB 2025)</h3>
              <p className="text-sm text-blue-800 mt-1">
                <strong>Stap 1:</strong> Basisrantsoen ondersteunt Onderhoud + ~{baseMilkSupport?.milkSupportKg || '?'} kg melk<br/>
                <strong>Stap 2:</strong> Gap = Groepsdoel − Basis Support<br/>
                <strong>Stap 3:</strong> Krachtvoer vult gap aan, met verdringing ({CVB_CONSTANTS.SUBSTITUTION_RATE} kg ruwvoer per kg krachtvoer)
              </p>
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

          {selectedRationId && rationDensity && baseMilkSupport && (
            <>
              {/* Roughage Intake Slider */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Ruwvoeropname (kg DS/koe/dag)
                  </label>
                  <span className="text-lg font-bold text-indigo-600">{roughageIntake} kg DS</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="22"
                  step="0.5"
                  value={roughageIntake}
                  onChange={(e) => setRoughageIntake(parseFloat(e.target.value))}
                  className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10 kg</span>
                  <span>16 kg (gemiddeld)</span>
                  <span>22 kg</span>
                </div>
              </div>

              {/* Base Ration Density */}
              <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Mix Samenstelling (per kg DS):</p>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-amber-600">{rationDensity.vemPerKgDs}</p>
                    <p className="text-xs text-gray-600">VEM</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600">{rationDensity.dvePerKgDs}</p>
                    <p className="text-xs text-gray-600">DVE (g)</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{rationDensity.oebPerKgDs}</p>
                    <p className="text-xs text-gray-600">OEB (g)</p>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${baseMilkSupport.swStatus === 'safe' ? 'text-green-600' : baseMilkSupport.swStatus === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {rationDensity.swPerKgDs}
                    </p>
                    <p className="text-xs text-gray-600">SW</p>
                  </div>
                </div>
              </div>

              {/* Base Milk Support - THE KEY OUTPUT */}
              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-800">🥛 Basis Melk Support</p>
                    <p className="text-xs text-green-700 mt-1">
                      Dit basisrantsoen ondersteunt onderhoud + productie
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-700">{baseMilkSupport.milkSupportKg} kg</p>
                    <p className="text-xs text-green-600">melk per koe per dag</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <p className="font-semibold text-gray-700">{baseMilkSupport.totalVem}</p>
                    <p className="text-gray-500">Totaal VEM</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-700">{baseMilkSupport.maintenanceVem}</p>
                    <p className="text-gray-500">Onderhoud VEM</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-700">{baseMilkSupport.productionVem}</p>
                    <p className="text-gray-500">Productie VEM</p>
                  </div>
                </div>
              </div>
              
              {/* SW Safety Status */}
              {baseMilkSupport.swStatus !== 'safe' && (
                <div className={`mt-3 p-3 rounded-lg border ${baseMilkSupport.swStatus === 'danger' ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-300'}`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-5 h-5 ${baseMilkSupport.swStatus === 'danger' ? 'text-red-600' : 'text-yellow-600'}`} />
                    <div>
                      <p className={`text-sm font-semibold ${baseMilkSupport.swStatus === 'danger' ? 'text-red-800' : 'text-yellow-800'}`}>
                        {baseMilkSupport.swStatus === 'danger' 
                          ? `Acidose Risico! SW ${baseMilkSupport.swPerKgDs} < ${CVB_CONSTANTS.MIN_SW_THRESHOLD}`
                          : `Let op structuur: SW ${baseMilkSupport.swPerKgDs} < ${CVB_CONSTANTS.SAFE_SW_THRESHOLD}`
                        }
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Overweeg meer structuurrijk ruwvoer (gras, stro) in de basismix
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Data Quality Indicator */}
              {selectedRation?.feeds && selectedRation.feeds.length > 0 && (() => {
                const labVerifiedCount = selectedRation.feeds.filter(f => f.feed?.sourceType === 'lab_verified').length;
                const totalCount = selectedRation.feeds.length;
                const labPercentage = Math.round((labVerifiedCount / totalCount) * 100);
                const qualityBg = labPercentage >= 80 ? 'bg-green-50 border-green-200' : labPercentage >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-orange-50 border-orange-200';
                const qualityText = labPercentage >= 80 ? 'text-green-800' : labPercentage >= 50 ? 'text-yellow-800' : 'text-orange-800';
                
                return (
                  <div className={`mt-3 p-3 rounded-lg border ${qualityBg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🧪</span>
                        <div>
                          <p className={`text-sm font-semibold ${qualityText}`}>
                            Data Kwaliteit: {labPercentage}% Lab-geverifieerd
                          </p>
                          <p className="text-xs text-gray-600">
                            {labVerifiedCount} van {totalCount} voeders hebben laboratorium analyse
                          </p>
                        </div>
                      </div>
                      {labPercentage < 80 && (
                        <Link href="/lab-rapporten">
                          <a className="text-xs text-blue-600 hover:text-blue-800 underline">
                            Upload lab rapporten →
                          </a>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Gap Analysis Results */}
        {selectedRationId && rationDensity && groupAnalyses.length > 0 && (
          <>
            {/* Acidosis Warning Banner */}
            {hasAcidosisRisk && (
              <div className="bg-red-100 border-2 border-red-400 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <h3 className="font-bold text-red-800 text-lg">⚠️ ACIDOSE RISICO GEDETECTEERD</h3>
                    <p className="text-red-700 text-sm mt-1">
                      Een of meer groepen hebben een SW onder {CVB_CONSTANTS.MIN_SW_THRESHOLD} na krachtvoer toevoeging.
                      Dit kan leiden tot pensverzuring (acidose) en gezondheidsproblemen.
                    </p>
                    <p className="text-red-600 text-xs mt-2 font-semibold">
                      Aanbeveling: Verminder krachtvoer, voeg stro toe, of verhoog gras in basismix
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                    className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${
                      hasAcidosisRisk 
                        ? 'bg-orange-500 hover:bg-orange-600' 
                        : 'bg-green-500 hover:bg-green-600'
                    } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                  >
                    <Save className="w-4 h-4" />
                    {updateGroupMutation.isPending ? 'Bezig...' : 'Toewijzen aan Alle Groepen'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {groupAnalyses.map(({ group, requirements, gap, cost, formatted }) => (
                  <div 
                    key={group.id} 
                    className={`border rounded-lg p-4 ${
                      gap.acidosisRisk 
                        ? 'border-red-300 bg-red-50' 
                        : gap.swStatus === 'warning'
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-gray-200'
                    }`}
                  >
                    {/* Group Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          {group.lifeStage === 'dry' ? '🤰' : '🐄'} {group.name}
                          <span className="text-sm text-gray-500">({group.cowCount} koeien)</span>
                          <SwStatusBadge gap={gap} />
                        </h3>
                        <p className="text-sm text-gray-600">
                          {group.lifeStage === 'dry' 
                            ? 'Droogstaand' 
                            : `Doel: ${group.avgMilkYieldKg} kg melk/dag`
                          }
                        </p>
                      </div>
                      {gap.acidosisRisk ? (
                        <AlertCircle className="w-6 h-6 text-red-500" />
                      ) : gap.isDeficit ? (
                        <AlertTriangle className="w-6 h-6 text-yellow-500" />
                      ) : (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      )}
                    </div>

                    {/* PMR Flow Visualization */}
                    <div className="grid grid-cols-5 gap-2 mb-3 text-center">
                      {/* Base Support */}
                      <div className="bg-green-100 rounded p-2 border border-green-200">
                        <p className="text-xs text-gray-500 mb-1">Basis Support</p>
                        <p className="text-lg font-bold text-green-700">{gap.baseMilkSupportKg}</p>
                        <p className="text-xs text-green-600">kg melk</p>
                      </div>
                      
                      {/* Arrow */}
                      <div className="flex items-center justify-center">
                        <span className="text-2xl text-gray-400">→</span>
                      </div>
                      
                      {/* Gap */}
                      <div className={`rounded p-2 border ${gap.isDeficit ? 'bg-yellow-100 border-yellow-200' : 'bg-green-100 border-green-200'}`}>
                        <p className="text-xs text-gray-500 mb-1">Gap</p>
                        <p className={`text-lg font-bold ${gap.isDeficit ? 'text-yellow-700' : 'text-green-700'}`}>
                          {gap.gapMilkKg}
                        </p>
                        <p className={`text-xs ${gap.isDeficit ? 'text-yellow-600' : 'text-green-600'}`}>kg melk</p>
                      </div>
                      
                      {/* Arrow */}
                      <div className="flex items-center justify-center">
                        <span className="text-2xl text-gray-400">→</span>
                      </div>
                      
                      {/* Concentrate */}
                      <div className={`rounded p-2 border ${gap.acidosisRisk ? 'bg-red-100 border-red-200' : 'bg-indigo-100 border-indigo-200'}`}>
                        <p className="text-xs text-gray-500 mb-1">Krachtvoer</p>
                        <p className={`text-lg font-bold ${gap.acidosisRisk ? 'text-red-700' : 'text-indigo-700'}`}>
                          {gap.concentrateKgDs}
                        </p>
                        <p className={`text-xs ${gap.acidosisRisk ? 'text-red-600' : 'text-indigo-600'}`}>kg DS</p>
                      </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-gray-500">Behoefte</p>
                        <p className="font-semibold">{requirements.vemPerCow} VEM</p>
                        <p className="font-semibold">{requirements.dvePerCow}g DVE</p>
                      </div>
                      <div className="bg-green-50 rounded p-2">
                        <p className="text-gray-500">Basis Rantsoen</p>
                        <p className="font-semibold text-green-700">{gap.baseRationVem} VEM</p>
                        <p className="font-semibold text-green-700">{gap.baseRationDve}g DVE</p>
                      </div>
                      <div className="bg-orange-50 rounded p-2">
                        <p className="text-gray-500">Verdringing</p>
                        <p className="font-semibold text-orange-700">-{gap.roughageDisplacementKgDs} kg DS</p>
                        <p className="font-semibold text-orange-700">-{Math.round(gap.roughageDisplacementKgDs * rationDensity.vemPerKgDs)} VEM</p>
                      </div>
                      <div className={`rounded p-2 ${gap.acidosisRisk ? 'bg-red-50' : 'bg-blue-50'}`}>
                        <p className="text-gray-500">Na Substitutie</p>
                        <p className={`font-semibold ${gap.acidosisRisk ? 'text-red-700' : 'text-blue-700'}`}>
                          {gap.finalTotalVem} VEM
                        </p>
                        <p className={`font-semibold ${gap.acidosisRisk ? 'text-red-700' : 'text-blue-700'}`}>
                          SW: {gap.finalSwPerKgDs}
                        </p>
                      </div>
                    </div>

                    {/* Acidosis Warning for this group */}
                    {gap.acidosisRisk && (
                      <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-red-900">{gap.acidosisWarning}</p>
                            {gap.adjustmentSuggestion && (
                              <p className="text-xs text-red-700 mt-1">💡 {gap.adjustmentSuggestion}</p>
                            )}
                            {gap.swDeficit > 0 && (
                              <p className="text-xs text-red-600 mt-1">
                                Stro nodig: ~{calculateStrawNeeded(gap.swDeficit, gap.finalTotalIntakeKgDs)} kg DS om SW te herstellen
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recommendation */}
                    {gap.isDeficit && !gap.acidosisRisk && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-indigo-900">{formatted.recommendation}</p>
                            <p className="text-xs text-indigo-700 mt-1">{formatted.summary}</p>
                            {formatted.substitutionNote && (
                              <p className="text-xs text-orange-700 mt-1">⚠️ {formatted.substitutionNote}</p>
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
                * Gebaseerd op €{CVB_CONSTANTS.DEFAULT_ROUGHAGE_INTAKE > 0 ? '350' : '350'}/ton DS krachtvoer
              </p>
            </div>

            {/* CVB 2025 Reference */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">CVB 2025 Referentie</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                <div>
                  <p className="font-medium">VEM per kg melk</p>
                  <p>{CVB_CONSTANTS.VEM_PER_KG_MILK}</p>
                </div>
                <div>
                  <p className="font-medium">Verdringing</p>
                  <p>{CVB_CONSTANTS.SUBSTITUTION_RATE} kg/kg</p>
                </div>
                <div>
                  <p className="font-medium">Min. SW</p>
                  <p>{CVB_CONSTANTS.MIN_SW_THRESHOLD}</p>
                </div>
                <div>
                  <p className="font-medium">Aanbevolen SW</p>
                  <p>≥{CVB_CONSTANTS.SAFE_SW_THRESHOLD}</p>
                </div>
              </div>
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
