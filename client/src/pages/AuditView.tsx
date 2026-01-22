import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { trpc } from '../lib/trpc';

// CVB 2025 Reference Formulas
const CVB_FORMULAS = {
  vemMaintenance: {
    name: 'VEM Onderhoud',
    formula: 'VEM_onderhoud = 53.0 × LG^0.75',
    description: 'Energiebehoefte voor onderhoud gebaseerd op lichaamsgewicht (LG in kg)',
    source: 'CVB Veevoedertabel 2025',
    example: 'Bij 650 kg: 53.0 × 650^0.75 = 6.847 VEM/dag'
  },
  vemProduction: {
    name: 'VEM Productie',
    formula: 'VEM_productie = Melk_kg × 442 VEM/kg',
    description: 'Energiebehoefte per kg melk (FPCM gecorrigeerd)',
    source: 'CVB Veevoedertabel 2025',
    example: 'Bij 30 kg melk: 30 × 442 = 13.260 VEM/dag'
  },
  vemTotal: {
    name: 'VEM Totaal',
    formula: 'VEM_totaal = VEM_onderhoud + VEM_productie + VEM_dracht + VEM_groei',
    description: 'Totale energiebehoefte per dag',
    source: 'CVB Veevoedertabel 2025'
  },
  dveRequirement: {
    name: 'DVE Behoefte',
    formula: 'DVE = DVE_onderhoud + DVE_productie',
    description: 'Darm Verteerbaar Eiwit behoefte',
    source: 'CVB Veevoedertabel 2025',
    subFormulas: [
      'DVE_onderhoud = 2.75 × LG^0.5 + 0.2 × LG^0.6',
      'DVE_productie = Melk_kg × (1.396 × Eiwit% + 0.000195 × Eiwit%²)'
    ]
  },
  oebBalance: {
    name: 'OEB Balans',
    formula: 'OEB_balans = Σ(OEB_voer × kg_DS) ≥ 0',
    description: 'Onbestendig Eiwit Balans moet minimaal 0 zijn voor optimale penswerking',
    source: 'CVB Veevoedertabel 2025',
    note: 'Negatieve OEB wijst op stikstoftekort in de pens'
  },
  structureValue: {
    name: 'Structuurwaarde (SW)',
    formula: 'SW_rantsoen = Σ(SW_voer × kg_DS) / Totaal_kg_DS',
    description: 'Minimaal 1.0 voor goede penswerking, optimaal 1.2-1.5',
    source: 'CVB Veevoedertabel 2025',
    note: 'Stro heeft hoge SW (4.30), krachtvoer lage SW (0.1-0.3)'
  },
  fpcm: {
    name: 'FPCM Correctie',
    formula: 'FPCM = Melk × (0.337 + 0.116 × Vet% + 0.06 × Eiwit%)',
    description: 'Fat and Protein Corrected Milk naar 4.0% vet en 3.3% eiwit',
    source: 'CVB Veevoedertabel 2025'
  },
  dryMatterIntake: {
    name: 'DS Opname Schatting',
    formula: 'DS_opname = 0.025 × LG + 0.1 × FPCM',
    description: 'Geschatte droge stof opname capaciteit',
    source: 'CVB Veevoedertabel 2025',
    example: 'Bij 650 kg en 30 kg FPCM: 0.025 × 650 + 0.1 × 30 = 19.25 kg DS'
  }
};

// Soil type impact on feed values
const SOIL_IMPACTS = {
  veen: {
    name: 'Veengrond',
    oebAdjustment: '+50 tot +100 OEB/kg DS',
    vemAdjustment: '-50 tot -100 VEM/kg DS',
    mineralNote: 'Verhoogd risico op Cu-deficiëntie door Mo/S antagonisme',
    recommendations: ['Extra Cu-suppletie', 'Sodagrain voor OEB-dilutie', 'Stro voor structuur']
  },
  zand: {
    name: 'Zandgrond',
    oebAdjustment: 'Standaard CVB waarden',
    vemAdjustment: 'Standaard CVB waarden',
    mineralNote: 'Mogelijk lagere Se en Co gehaltes',
    recommendations: ['Standaard mineralenmengsel', 'Let op droogtegevoeligheid']
  },
  klei: {
    name: 'Kleigrond',
    oebAdjustment: '-20 tot +20 OEB/kg DS',
    vemAdjustment: 'Standaard tot +50 VEM/kg DS',
    mineralNote: 'Goede mineralenvoorziening, let op Mn',
    recommendations: ['Standaard mineralenmengsel']
  }
};

// CSV Export Helper Functions
const downloadCSV = (data: string, filename: string) => {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const escapeCSV = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export default function AuditView() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['herd', 'farm', 'bouwplan_details', 'formulas']));

  // Fetch all data
  const { data: farm } = trpc.farm.get.useQuery({ farmId: 1 });
  const { data: herdGroups } = trpc.herdGroups.list.useQuery({ farmId: 1 });
  const { data: feeds } = trpc.feeds.list.useQuery();
  const { data: baseRations } = trpc.baseRations.list.useQuery({ farmId: 1 });
  const { data: inventory } = trpc.inventory.list.useQuery({ farmId: 1 });
  const { data: labResults } = trpc.labReport.list.useQuery({ farmId: 1 });

  // Sort herd groups: lactating by milk yield desc, dry at bottom
  const sortedGroups = useMemo(() => {
    if (!herdGroups) return [];
    return [...herdGroups].sort((a, b) => {
      if (a.lifeStage === 'dry' && b.lifeStage !== 'dry') return 1;
      if (a.lifeStage !== 'dry' && b.lifeStage === 'dry') return -1;
      return b.avgMilkYieldKg - a.avgMilkYieldKg;
    });
  }, [herdGroups]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!herdGroups) return { cows: 0, milkKg: 0, avgYield: 0 };
    const lactating = herdGroups.filter(g => g.lifeStage !== 'dry');
    const totalCows = herdGroups.reduce((sum, g) => sum + g.cowCount, 0);
    const lactatingCows = lactating.reduce((sum, g) => sum + g.cowCount, 0);
    const totalMilk = lactating.reduce((sum, g) => sum + (g.cowCount * g.avgMilkYieldKg), 0);
    return {
      cows: totalCows,
      lactatingCows,
      milkKg: totalMilk,
      avgYield: lactatingCows > 0 ? totalMilk / lactatingCows : 0
    };
  }, [herdGroups]);

  // Calculate VEM requirements per group (sorted)
  const groupRequirements = useMemo(() => {
    if (!sortedGroups || sortedGroups.length === 0) return [];
    return sortedGroups.map(group => {
      const weight = group.avgWeightKg;
      const milkYield = group.avgMilkYieldKg;
      const fatPercent = group.avgFatPercent;
      const proteinPercent = group.avgProteinPercent;
      
      // VEM calculations
      const vemMaintenance = 53.0 * Math.pow(weight, 0.75);
      const vemProduction = milkYield * 442;
      const vemTotal = vemMaintenance + vemProduction;
      
      // DVE calculations
      const dveMaintenance = 2.75 * Math.pow(weight, 0.5) + 0.2 * Math.pow(weight, 0.6);
      const dveProduction = milkYield * (1.396 * proteinPercent + 0.000195 * Math.pow(proteinPercent, 2));
      const dveTotal = dveMaintenance + dveProduction;
      
      // FPCM
      const fpcm = milkYield * (0.337 + 0.116 * fatPercent + 0.06 * proteinPercent);
      
      // Estimated DS intake
      const dsIntake = 0.025 * weight + 0.1 * fpcm;
      
      return {
        ...group,
        vemMaintenance: Math.round(vemMaintenance),
        vemProduction: Math.round(vemProduction),
        vemTotal: Math.round(vemTotal),
        dveMaintenance: Math.round(dveMaintenance),
        dveProduction: Math.round(dveProduction),
        dveTotal: Math.round(dveTotal),
        fpcm: Math.round(fpcm * 10) / 10,
        dsIntake: Math.round(dsIntake * 10) / 10
      };
    });
  }, [sortedGroups]);

  // Roughage balance calculation
  const roughageBalance = useMemo(() => {
    if (!farm || !herdGroups) return null;
    
    const hectaresGrass = farm.hectaresGrass || 32;
    const hectaresMaize = farm.hectaresMaize || 8;
    const yieldGrass = farm.yieldGrassTonDsHa || 11;
    const yieldMaize = farm.yieldMaizeTonDsHa || 12;
    
    const grassSupply = hectaresGrass * yieldGrass * 1000; // kg DS
    const maizeSupply = hectaresMaize * yieldMaize * 1000; // kg DS
    const totalSupply = grassSupply + maizeSupply;
    
    // Estimate demand (simplified)
    const totalCows = herdGroups.reduce((sum, g) => sum + g.cowCount, 0);
    const avgDsIntake = 18; // kg DS per cow per day
    const roughageShare = 0.65; // 65% of diet is roughage
    const dailyDemand = totalCows * avgDsIntake * roughageShare;
    const annualDemand = dailyDemand * 365;
    
    const balance = totalSupply - annualDemand;
    const selfSufficiency = (totalSupply / annualDemand) * 100;
    
    return {
      grassSupply,
      maizeSupply,
      totalSupply,
      dailyDemand,
      annualDemand,
      balance,
      selfSufficiency
    };
  }, [farm, herdGroups]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const SectionHeader = ({ id, title, icon }: { id: string; title: string; icon: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-slate-800 to-slate-700 rounded-t-xl text-white hover:from-slate-700 hover:to-slate-600 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <span className="text-xl">{expandedSections.has(id) ? '▼' : '▶'}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-900 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔬</span>
              <div>
                <h1 className="text-xl font-bold text-white">Audit View — Berekeningsoverzicht</h1>
                <p className="text-sm text-slate-400">Volledige transparantie van alle data en formules</p>
              </div>
            </div>
            <Link href="/">
              <a className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                ← Terug naar Dashboard
              </a>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Disclaimer */}
        <div className="bg-amber-900/30 border border-amber-600 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-amber-200">Audit View — Alleen voor Verificatie</h3>
              <p className="text-sm text-amber-100 mt-1">
                Deze pagina toont alle onderliggende data en berekeningsformules. 
                <strong> Raadpleeg altijd een voerspecialist</strong> voordat u wijzigingen doorvoert in uw voerstrategie.
                Formules zijn gebaseerd op CVB Veevoedertabel 2025.
              </p>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SECTION 1: Farm Overview / Bouwplan */}
        {/* ============================================ */}
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <SectionHeader id="farm" title="Bedrijfsoverzicht & Bouwplan" icon="🏡" />
          {expandedSections.has('farm') && farm && (
            <div className="p-6 space-y-6">
              {/* Farm Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                    <span>🏠</span> Bedrijfsgegevens
                  </h3>
                  <table className="w-full text-sm">
                    <tbody className="text-slate-300">
                      <tr className="border-b border-slate-600">
                        <td className="py-2">Bedrijfsnaam</td>
                        <td className="py-2 text-right font-mono text-white">{farm.name}</td>
                      </tr>
                      <tr className="border-b border-slate-600">
                        <td className="py-2">Ras</td>
                        <td className="py-2 text-right font-mono text-white">Holstein Friesian (HF)</td>
                      </tr>
                      <tr className="border-b border-slate-600">
                        <td className="py-2">Totaal Koeien</td>
                        <td className="py-2 text-right font-mono text-white">{farm.herdSize}</td>
                      </tr>
                      <tr className="border-b border-slate-600">
                        <td className="py-2">Jongvee (0-1 jaar)</td>
                        <td className="py-2 text-right font-mono text-white">{farm.youngStockJuniorCount}</td>
                      </tr>
                      <tr className="border-b border-slate-600">
                        <td className="py-2">Jongvee (1-2 jaar)</td>
                        <td className="py-2 text-right font-mono text-white">{farm.youngStockSeniorCount}</td>
                      </tr>
                      <tr>
                        <td className="py-2">Melkprijs</td>
                        <td className="py-2 text-right font-mono text-emerald-400">€{farm.milkPricePerKg.toFixed(2)}/kg</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                    <span>🌾</span> Bouwplan (Teeltplan)
                  </h3>
                  <table className="w-full text-sm">
                    <tbody className="text-slate-300">
                      <tr className="border-b border-slate-600">
                        <td className="py-2">Hectares Grasland</td>
                        <td className="py-2 text-right font-mono text-white">{farm.hectaresGrass} ha</td>
                      </tr>
                      <tr className="border-b border-slate-600">
                        <td className="py-2">Opbrengst Gras</td>
                        <td className="py-2 text-right font-mono text-white">{farm.yieldGrassTonDsHa} ton DS/ha</td>
                      </tr>
                      <tr className="border-b border-slate-600">
                        <td className="py-2">Hectares Maïs</td>
                        <td className="py-2 text-right font-mono text-white">{farm.hectaresMaize} ha</td>
                      </tr>
                      <tr className="border-b border-slate-600">
                        <td className="py-2">Opbrengst Maïs</td>
                        <td className="py-2 text-right font-mono text-white">{farm.yieldMaizeTonDsHa} ton DS/ha</td>
                      </tr>
                      <tr className="border-b border-slate-600">
                        <td className="py-2">Kwaliteitsniveau</td>
                        <td className="py-2 text-right font-mono text-emerald-400 capitalize">{farm.qualityLevel}</td>
                      </tr>
                      <tr>
                        <td className="py-2">Bodemtype</td>
                        <td className="py-2 text-right font-mono text-white">Veengrond</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Roughage Balance */}
              {roughageBalance && (
                <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 rounded-lg p-4 border border-emerald-700">
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                    <span>📊</span> Ruwvoerbalans Berekening
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400 mb-1">Aanbod (Productie)</div>
                      <div className="space-y-1 font-mono text-white">
                        <div>Gras: {(roughageBalance.grassSupply / 1000).toFixed(0)} ton DS</div>
                        <div>Maïs: {(roughageBalance.maizeSupply / 1000).toFixed(0)} ton DS</div>
                        <div className="text-emerald-400 font-bold">Totaal: {(roughageBalance.totalSupply / 1000).toFixed(0)} ton DS</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Vraag (Verbruik)</div>
                      <div className="space-y-1 font-mono text-white">
                        <div>Dagelijks: {roughageBalance.dailyDemand.toFixed(0)} kg DS</div>
                        <div>Jaarlijks: {(roughageBalance.annualDemand / 1000).toFixed(0)} ton DS</div>
                        <div className="text-amber-400">({totals.cows} koeien × 18 kg DS × 65%)</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Balans</div>
                      <div className="space-y-1 font-mono">
                        <div className={roughageBalance.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {roughageBalance.balance >= 0 ? '+' : ''}{(roughageBalance.balance / 1000).toFixed(0)} ton DS
                        </div>
                        <div className={`font-bold ${roughageBalance.selfSufficiency >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          Zelfvoorzienend: {roughageBalance.selfSufficiency.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* SECTION 1B: Bouwplan Details (VEM Calculations) */}
        {/* ============================================ */}
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <SectionHeader id="bouwplan_details" title="Bouwplan (Details) — VEM Jaarbalans" icon="⚡" />
          {expandedSections.has('bouwplan_details') && farm && roughageBalance && (
            <div className="p-6">
              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-5 border border-blue-600">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-lg">
                  <span>⚡</span> VEM Jaarbalans (Energiebalans) — CVB 2022 Metabolisch Gewicht
                </h3>
                
                <div className="space-y-6">
                  {/* Jaarlijkse Energievoorraad */}
                  <div>
                    <h4 className="text-blue-300 font-semibold mb-3">Jaarlijkse Energievoorraad (VEM):</h4>
                    
                    {/* Maize Calculation */}
                    <div className="bg-slate-800/50 rounded-lg p-4 mb-3">
                      <div className="text-amber-400 font-semibold mb-2">Maïs:</div>
                      <div className="font-mono text-sm space-y-1 text-slate-300">
                        <div>{farm.hectaresMaize} ha × {farm.yieldMaizeTonDsHa} ton DS/ha × 990 VEM/kg</div>
                        <div className="text-emerald-400 font-bold text-base">
                          = {((farm.hectaresMaize * farm.yieldMaizeTonDsHa * 1000 * 990) / 1000000).toFixed(1)} miljoen VEM
                        </div>
                      </div>
                    </div>
                    
                    {/* Grass Calculation with Snede Breakdown */}
                    <div className="bg-slate-800/50 rounded-lg p-4 mb-3">
                      <div className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                        <span>🌱</span> Gras Snede Verdeling (Professionele Methode):
                      </div>
                      
                      <div className="ml-4 space-y-3 text-sm">
                        {/* First Cut - Spring */}
                        <div className="border-l-2 border-green-500 pl-3">
                          <div className="text-blue-300 mb-1">• <strong>40%</strong> = Voorjaarskuil (1e Snede, Mei) – Hoge energie, lage structuur</div>
                          <div className="font-mono text-slate-300 ml-4">
                            Gras Voorjaar (40%): {(farm.hectaresGrass * farm.yieldGrassTonDsHa * 0.4).toFixed(1)} ton DS × 980 VEM/kg
                          </div>
                          <div className="font-mono text-emerald-400 font-bold ml-4">
                            = {((farm.hectaresGrass * farm.yieldGrassTonDsHa * 0.4 * 1000 * 980) / 1000000).toFixed(1)} miljoen VEM
                          </div>
                        </div>
                        
                        {/* Second+ Cut - Summer/Fall */}
                        <div className="border-l-2 border-yellow-500 pl-3">
                          <div className="text-yellow-300 mb-1">• <strong>60%</strong> = Zomer/Najaarskuil (2e+ Snede, Juli-Aug) – Lagere energie, hoge structuur</div>
                          <div className="font-mono text-slate-300 ml-4">
                            Gras Zomer (60%): {(farm.hectaresGrass * farm.yieldGrassTonDsHa * 0.6).toFixed(1)} ton DS × 900 VEM/kg
                          </div>
                          <div className="font-mono text-emerald-400 font-bold ml-4">
                            = {((farm.hectaresGrass * farm.yieldGrassTonDsHa * 0.6 * 1000 * 900) / 1000000).toFixed(1)} miljoen VEM
                          </div>
                        </div>
                        
                        <div className="text-xs text-slate-400 italic mt-2 pl-3">
                          Bron: ABZ Diervoeding, CVB Standards, ILVO research
                        </div>
                      </div>
                    </div>
                    
                    {/* Total VEM Supply */}
                    <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 rounded-lg p-4 border-2 border-emerald-500">
                      <div className="flex justify-between items-center">
                        <div className="text-white font-bold text-lg">Totale Jaarlijkse Voorraad:</div>
                        <div className="text-emerald-300 font-bold text-2xl font-mono">
                          {(
                            (farm.hectaresMaize * farm.yieldMaizeTonDsHa * 1000 * 990 +
                            farm.hectaresGrass * farm.yieldGrassTonDsHa * 0.4 * 1000 * 980 +
                            farm.hectaresGrass * farm.yieldGrassTonDsHa * 0.6 * 1000 * 900) / 1000000
                          ).toFixed(1)} miljoen VEM
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Note about DS vs VEM */}
                  <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700">
                    <div className="text-xs text-blue-200">
                      <strong>💡 Opmerking:</strong> De Ruwvoerbalans hierboven toont DS (Droge Stof) voorraad. 
                      Deze VEM Jaarbalans toont de <strong>energievoorraad</strong> in VEM, wat relevanter is voor voerplanning.
                      VEM waarden variëren per snede door verschillen in groeiomstandigheden en rijpheid.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* SECTION 2: Herd Groups with Calculations */}
        {/* ============================================ */}
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <SectionHeader id="herd" title="Koegroepen & Behoefteberekeningen" icon="🐄" />
          {expandedSections.has('herd') && (
            <div className="p-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{totals.cows}</div>
                  <div className="text-xs text-slate-400">Totaal Koeien</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{totals.lactatingCows}</div>
                  <div className="text-xs text-slate-400">Lacterend</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{totals.milkKg.toFixed(0)}</div>
                  <div className="text-xs text-slate-400">kg Melk/dag</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">{totals.avgYield.toFixed(1)}</div>
                  <div className="text-xs text-slate-400">kg/koe/dag</div>
                </div>
              </div>

              {/* Groups Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-700 text-slate-300">
                      <th className="px-3 py-2 text-left">Groep</th>
                      <th className="px-3 py-2 text-right">Koeien</th>
                      <th className="px-3 py-2 text-right">Gewicht</th>
                      <th className="px-3 py-2 text-right">Melk kg</th>
                      <th className="px-3 py-2 text-right">FPCM</th>
                      <th className="px-3 py-2 text-right">VEM Ond.</th>
                      <th className="px-3 py-2 text-right">VEM Prod.</th>
                      <th className="px-3 py-2 text-right font-bold">VEM Tot.</th>
                      <th className="px-3 py-2 text-right">DVE Tot.</th>
                      <th className="px-3 py-2 text-right">DS Opn.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupRequirements.map((group, idx) => (
                      <tr key={group.id} className={`border-b border-slate-700 ${idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'}`}>
                        <td className="px-3 py-2 text-white font-medium">
                          {group.name}
                          {group.lifeStage === 'dry' && <span className="ml-2 text-xs bg-amber-600 px-1 rounded">Droog</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-300">{group.cowCount}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{group.avgWeightKg} kg</td>
                        <td className="px-3 py-2 text-right text-slate-300">{group.avgMilkYieldKg}</td>
                        <td className="px-3 py-2 text-right text-emerald-400">{group.fpcm}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-400">{group.vemMaintenance}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-400">{group.vemProduction}</td>
                        <td className="px-3 py-2 text-right font-mono text-white font-bold">{group.vemTotal}</td>
                        <td className="px-3 py-2 text-right font-mono text-amber-400">{group.dveTotal}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-300">{group.dsIntake} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculation Legend */}
              <div className="mt-4 p-3 bg-slate-700/30 rounded-lg text-xs text-slate-400">
                <strong>Berekeningslegenda:</strong>
                <span className="ml-2">VEM Ond. = 53.0 × LG^0.75</span>
                <span className="mx-2">|</span>
                <span>VEM Prod. = 390 × FPCM</span>
                <span className="mx-2">|</span>
                <span>FPCM = Melk × (0.337 + 0.116×Vet% + 0.06×Eiwit%)</span>
              </div>

              {/* Detailed Calculation Breakdowns per Group */}
              <div className="mt-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>🔍</span> Berekeningsdetails per Groep (CVB 2025)
                </h3>
                <div className="space-y-4">
                  {groupRequirements.map((group) => {
                    // Recalculate with full precision for display
                    const weight = group.avgWeightKg;
                    const milkYield = group.avgMilkYieldKg;
                    const fatPercent = group.avgFatPercent;
                    const proteinPercent = group.avgProteinPercent;
                    
                    // FPCM calculation
                    const fpcmFactor = 0.337 + 0.116 * fatPercent + 0.06 * proteinPercent;
                    const fpcm = milkYield * fpcmFactor;
                    
                    // VEM calculations (using 390 × FPCM for production)
                    const vemMaintenance = 53.0 * Math.pow(weight, 0.75);
                    const vemProduction = 390 * fpcm;
                    const vemTotal = vemMaintenance + vemProduction;
                    
                    // DVE calculations
                    const dveMaintenance = 54 + 0.1 * weight;
                    const proteinYield = milkYield * (proteinPercent / 100) * 1000; // g eiwit
                    const dveProduction = 1.396 * proteinYield + 0.000195 * Math.pow(proteinYield, 2);
                    const dveTotal = dveMaintenance + dveProduction;
                    
                    // Group totals
                    const groupVemTotal = vemTotal * group.cowCount;
                    const groupDveTotal = dveTotal * group.cowCount;
                    
                    return (
                      <div key={group.id} className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-white flex items-center gap-2">
                            <span>🐄</span> {group.name}
                            {group.lifeStage === 'dry' && <span className="text-xs bg-amber-600 px-2 py-0.5 rounded">Droog</span>}
                          </h4>
                          <div className="text-sm text-slate-400">
                            {group.cowCount} koeien | {weight} kg | {milkYield} kg melk | {fatPercent}% vet | {proteinPercent}% eiwit
                          </div>
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-4">
                          {/* FPCM Calculation */}
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-blue-400 font-semibold mb-2 text-sm">1. FPCM (Vet- en Eiwitgecorrigeerde Melk)</div>
                            <div className="font-mono text-xs space-y-1 text-slate-300">
                              <div className="text-slate-400">FPCM = Melk × (0.337 + 0.116 × Vet% + 0.06 × Eiwit%)</div>
                              <div className="text-yellow-300">FPCM = {milkYield} × (0.337 + 0.116 × {fatPercent} + 0.06 × {proteinPercent})</div>
                              <div>FPCM = {milkYield} × {fpcmFactor.toFixed(3)}</div>
                              <div className="text-emerald-400 font-bold">FPCM = {fpcm.toFixed(1)} kg</div>
                            </div>
                          </div>
                          
                          {/* VEM Calculation */}
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-orange-400 font-semibold mb-2 text-sm">2. VEM (Energie)</div>
                            <div className="font-mono text-xs space-y-1 text-slate-300">
                              <div className="text-slate-400">VEM = VEM_onderhoud + VEM_productie</div>
                              <div className="text-slate-400">VEM_onderhoud = 53.0 × Gewicht^0.75</div>
                              <div>VEM_onderhoud = 53.0 × {weight}^0.75 = {Math.round(vemMaintenance)}</div>
                              <div className="text-slate-400">VEM_productie = 390 × FPCM</div>
                              <div>VEM_productie = 390 × {fpcm.toFixed(1)} = {Math.round(vemProduction)}</div>
                              <div className="text-emerald-400 font-bold">VEM_totaal = {Math.round(vemMaintenance)} + {Math.round(vemProduction)} = {Math.round(vemTotal)}</div>
                            </div>
                          </div>
                          
                          {/* DVE Calculation */}
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-purple-400 font-semibold mb-2 text-sm">3. DVE (Eiwit)</div>
                            <div className="font-mono text-xs space-y-1 text-slate-300">
                              <div className="text-slate-400">DVE = DVE_onderhoud + DVE_productie</div>
                              <div className="text-slate-400">DVE_onderhoud = 54 + 0.1 × Gewicht</div>
                              <div>DVE_onderhoud = 54 + 0.1 × {weight} = {Math.round(dveMaintenance)}g</div>
                              <div className="text-slate-400">Eiwitopbrengst = Melk × Eiwit% × 1000</div>
                              <div>Eiwitopbrengst = {milkYield} × {proteinPercent}% × 1000 = {Math.round(proteinYield)}g</div>
                              <div className="text-slate-400">DVE_productie = 1.396 × Eiwitopbr + 0.000195 × Eiwitopbr²</div>
                              <div>DVE_productie = {Math.round(dveProduction)}g</div>
                              <div className="text-emerald-400 font-bold">DVE_totaal = {Math.round(dveMaintenance)} + {Math.round(dveProduction)} = {Math.round(dveTotal)}g</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Group Totals */}
                        <div className="mt-3 pt-3 border-t border-slate-600 flex justify-end gap-6 text-sm">
                          <div className="text-slate-400">
                            Totaal voor groep ({group.cowCount} koeien):
                          </div>
                          <div className="text-orange-400 font-mono">
                            {(groupVemTotal / 1000).toFixed(0)}k VEM
                          </div>
                          <div className="text-purple-400 font-mono">
                            {(groupDveTotal / 1000).toFixed(1)} kg DVE
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* SECTION 3: Base Rations */}
        {/* ============================================ */}
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <SectionHeader id="rations" title="Basisrantsoenen & Voerwaarden" icon="🌾" />
          {expandedSections.has('rations') && (
            <div className="p-6">
              {baseRations && baseRations.length > 0 ? (
                <div className="space-y-4">
                  {baseRations.map(ration => (
                    <div key={ration.id} className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-white">{ration.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${ration.isActive ? 'bg-emerald-600' : 'bg-slate-600'}`}>
                          {ration.isActive ? 'Actief' : 'Inactief'}
                        </span>
                      </div>
                      {ration.description && (
                        <p className="text-sm text-slate-400 mb-3">{ration.description}</p>
                      )}
                      <div className="text-sm text-slate-300">
                        Doel melkproductie: <span className="font-mono text-white">{ration.targetMilkKg || '-'} kg</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  Geen basisrantsoenen gedefinieerd. Ga naar Basisrantsoen om er een aan te maken.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* SECTION 4: Feed Library */}
        {/* ============================================ */}
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <SectionHeader id="feeds" title="Voerbibliotheek (CVB 2025)" icon="📚" />
          {expandedSections.has('feeds') && feeds && (
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-700 text-slate-300">
                      <th className="px-3 py-2 text-left">Voer</th>
                      <th className="px-3 py-2 text-left">Categorie</th>
                      <th className="px-3 py-2 text-right">VEM</th>
                      <th className="px-3 py-2 text-right">DVE</th>
                      <th className="px-3 py-2 text-right">OEB</th>
                      <th className="px-3 py-2 text-right">SW</th>
                      <th className="px-3 py-2 text-right">DS%</th>
                      <th className="px-3 py-2 text-left">Bron</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeds.slice(0, 20).map((feed, idx) => (
                      <tr key={feed.id} className={`border-b border-slate-700 ${idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'}`}>
                        <td className="px-3 py-2 text-white">{feed.displayName}</td>
                        <td className="px-3 py-2 text-slate-400 capitalize">{feed.category}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-300">{feed.vemPerUnit}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-300">{feed.dvePerUnit}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-300">{feed.oebPerUnit}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-300">{feed.swPerKgDs.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-300">{feed.defaultDsPercent}%</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{feed.source || 'CVB 2025'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {feeds.length > 20 && (
                <div className="mt-3 text-center text-slate-400 text-sm">
                  Toont 20 van {feeds.length} voeders. Ga naar Voerbeheer voor volledige lijst.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* SECTION 5: CVB Formulas Reference */}
        {/* ============================================ */}
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <SectionHeader id="formulas" title="CVB 2025 Berekeningsformules" icon="📐" />
          {expandedSections.has('formulas') && (
            <div className="p-6 space-y-4">
              {Object.entries(CVB_FORMULAS).map(([key, formula]) => {
                // Get example group for calculations (first lactating group)
                const exampleGroup = groupRequirements.find(g => g.lifeStage === 'lactating');
                let calculationExample = null;
                
                if (exampleGroup) {
                  const weight = exampleGroup.avgWeightKg;
                  const milk = exampleGroup.avgMilkYieldKg;
                  const fat = exampleGroup.avgFatPercent;
                  const protein = exampleGroup.avgProteinPercent;
                  
                  // Calculate based on formula type
                  if (key === 'vem_maintenance') {
                    const result = 53.0 * Math.pow(weight, 0.75);
                    calculationExample = `LG = ${weight} kg → VEM_onderhoud = 53.0 × ${weight}^0.75 = ${Math.round(result)} VEM/dag`;
                  } else if (key === 'vem_production') {
                    const result = milk * 442;
                    calculationExample = `Melk = ${milk} kg → VEM_productie = ${milk} × 442 = ${Math.round(result)} VEM/dag`;
                  } else if (key === 'fpcm') {
                    const result = milk * (0.337 + 0.116 * fat + 0.06 * protein);
                    calculationExample = `Melk = ${milk} kg, Vet = ${fat}%, Eiwit = ${protein}% → FPCM = ${milk} × (0.337 + 0.116×${fat} + 0.06×${protein}) = ${result.toFixed(1)} kg`;
                  } else if (key === 'dve_requirement') {
                    const dveMaint = 54 * 0.1 * weight;
                    const fpcm = milk * (0.337 + 0.116 * fat + 0.06 * protein);
                    const eiwitOpbrengst = milk * protein * 1000;
                    const dveProd = 1.396 * eiwitOpbrengst + 0.000195 * Math.pow(eiwitOpbrengst, 2);
                    calculationExample = `DVE_onderhoud = 54 × 0.1 × ${weight} = ${Math.round(dveMaint)}g | DVE_productie = ${Math.round(dveProd)}g | Totaal = ${Math.round(dveMaint + dveProd)}g`;
                  } else if (key === 'ds_intake') {
                    const fpcm = milk * (0.337 + 0.116 * fat + 0.06 * protein);
                    const result = 0.025 * weight + 0.1 * fpcm;
                    calculationExample = `LG = ${weight} kg, FPCM = ${fpcm.toFixed(1)} kg → DS_opname = 0.025×${weight} + 0.1×${fpcm.toFixed(1)} = ${result.toFixed(1)} kg DS/dag`;
                  }
                }
                
                return (
                  <div key={key} className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="font-bold text-white mb-2">{formula.name}</h4>
                    <div className="bg-slate-900 rounded p-3 mb-2">
                      <code className="text-emerald-400 font-mono">{formula.formula}</code>
                    </div>
                    <p className="text-sm text-slate-300">{formula.description}</p>
                    {formula.example && (
                      <p className="text-xs text-slate-400 mt-2 italic">Voorbeeld: {formula.example}</p>
                    )}
                    {calculationExample && exampleGroup && (
                      <div className="mt-3 bg-blue-900/30 border border-blue-600 rounded-lg p-3">
                        <div className="text-xs text-blue-300 font-semibold mb-1">💡 Berekening voor {exampleGroup.name}:</div>
                        <code className="text-sm text-blue-200 font-mono">{calculationExample}</code>
                      </div>
                    )}
                    {formula.subFormulas && (
                      <div className="mt-2 space-y-1">
                        {formula.subFormulas.map((sub, i) => (
                          <code key={i} className="block text-xs text-amber-400 font-mono">{sub}</code>
                        ))}
                      </div>
                    )}
                    {formula.note && (
                      <p className="text-xs text-amber-300 mt-2">⚠️ {formula.note}</p>
                    )}
                    <div className="text-xs text-slate-500 mt-2">Bron: {formula.source}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* SECTION 6: Soil Type Impact */}
        {/* ============================================ */}
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <SectionHeader id="soil" title="Bodemtype Impact op Voerwaarden" icon="🌍" />
          {expandedSections.has('soil') && (
            <div className="p-6">
              <div className="grid md:grid-cols-3 gap-4">
                {Object.entries(SOIL_IMPACTS).map(([key, soil]) => (
                  <div key={key} className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                      {key === 'veen' && '🟤'}
                      {key === 'zand' && '🟡'}
                      {key === 'klei' && '🟠'}
                      {soil.name}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-slate-400">OEB Correctie:</span>
                        <span className="ml-2 text-white font-mono">{soil.oebAdjustment}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">VEM Correctie:</span>
                        <span className="ml-2 text-white font-mono">{soil.vemAdjustment}</span>
                      </div>
                      <div className="text-amber-300 text-xs mt-2">
                        ⚠️ {soil.mineralNote}
                      </div>
                      <div className="mt-3">
                        <div className="text-slate-400 text-xs mb-1">Aanbevelingen:</div>
                        <ul className="text-xs text-slate-300 space-y-1">
                          {soil.recommendations.map((rec, i) => (
                            <li key={i}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* SECTION 7: Lab Results */}
        {/* ============================================ */}
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <SectionHeader id="lab" title="Laboratoriumuitslagen" icon="🔬" />
          {expandedSections.has('lab') && (
            <div className="p-6">
              {labResults && labResults.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-700 text-slate-300">
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-right">VEM</th>
                        <th className="px-3 py-2 text-right">DVE</th>
                        <th className="px-3 py-2 text-right">OEB</th>
                        <th className="px-3 py-2 text-right">SW</th>
                        <th className="px-3 py-2 text-right">DS%</th>
                        <th className="px-3 py-2 text-left">Datum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labResults.map((result, idx) => (
                        <tr key={result.id} className={`border-b border-slate-700 ${idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'}`}>
                          <td className="px-3 py-2 text-white">{result.productName}</td>
                          <td className="px-3 py-2 text-slate-400">{result.productType || '-'}</td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-400">{result.vem}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-300">{result.dve}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-300">{result.oeb}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-300">{result.sw.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-300">{result.dsPercent}%</td>
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {result.uploadDate ? new Date(result.uploadDate).toLocaleDateString('nl-NL') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  Geen laboratoriumuitslagen beschikbaar. Upload een kuilanalyse via Lab Rapporten.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm py-4">
          <p>Audit View v1.0 — Gebaseerd op CVB Veevoedertabel 2025</p>
          <p className="mt-1">Laatste update: {new Date().toLocaleDateString('nl-NL')}</p>
        </div>
      </main>
    </div>
  );
}
