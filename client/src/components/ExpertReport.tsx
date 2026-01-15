import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Calculator, Milk, TrendingUp } from "lucide-react";
import { type CalculationResult, type FeedData } from "@/lib/calculator";
import { type MprData } from "./MprInput";

interface FeedInput {
  feedId: string;
  amountKg: number;
  dsPercent: number;
}

interface ExpertReportProps {
  result: CalculationResult;
  feeds: FeedData[];
  feedInputs: FeedInput[];
  mprData?: MprData | null;
  animalProfile: {
    name: string;
    weight: number;
    vemRequirement: number;
    dveRequirement: number;
  };
}

// Feed source mapping
const feedSources: Record<string, string> = {
  kuil_1_gras: "basisrantsoen",
  kuil_2_gras: "basisrantsoen",
  mais_2025: "basisrantsoen",
  bierborstel: "basisrantsoen",
  gerstmeel: "basisrantsoen",
  raapzaadschroot: "basisrantsoen",
  stalbrok: "automaat",
  startbrok: "automaat",
};

export default function ExpertReport({
  result,
  feeds,
  feedInputs,
  mprData,
  animalProfile,
}: ExpertReportProps) {
  // Calculate FCM if MPR data available
  const fcm = useMemo(() => {
    if (!mprData || mprData.milkProduction <= 0) return null;
    return (0.337 + 0.116 * mprData.fatPercent + 0.06 * mprData.proteinPercent) * mprData.milkProduction;
  }, [mprData]);

  // Calculate VEM/DVE requirements from MPR
  const mprRequirements = useMemo(() => {
    if (!fcm || !mprData) return null;
    const vemBehoefte = 442 * fcm + 5000;
    const dveBehoefte = 1.396 * (mprData.milkProduction * mprData.proteinPercent * 10) + 350;
    const vemDekking = (result.totalSupply.vem / vemBehoefte) * 100;
    const dveDekking = (result.totalSupply.dveGrams / dveBehoefte) * 100;
    return { vemBehoefte, dveBehoefte, vemDekking, dveDekking };
  }, [fcm, mprData, result]);

  // Build feed table data
  const feedTableData = useMemo(() => {
    return feedInputs
      .filter((input) => input.amountKg > 0)
      .map((input) => {
        const feed = feeds.find((f) => f.name === input.feedId);
        if (!feed) return null;

        const isPerProduct = feed.basis === "per kg product";
        const dsAanbod = isPerProduct
          ? input.amountKg * (input.dsPercent / 100)
          : input.amountKg;
        const kgProduct = isPerProduct
          ? input.amountKg
          : input.amountKg / (input.dsPercent / 100);
        const totKVEM = (dsAanbod * feed.vemPerUnit) / 1000;

        return {
          component: feed.displayName || feed.name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          bron: feedSources[feed.name] || "basisrantsoen",
          berekeningsWijze: isPerProduct ? "Product" : "DS aanbod",
          eenheid: isPerProduct ? "kg product" : "kg DS aanbod",
          hoeveelheid: input.amountKg,
          dsPercent: input.dsPercent,
          vem: feed.vemPerUnit,
          dve: feed.dvePerUnit,
          oeb: feed.oebPerUnit,
          dsAanbod: dsAanbod,
          kgProduct: kgProduct,
          basisVoorBerekening: input.amountKg,
          totKVEM: totKVEM,
        };
      })
      .filter(Boolean);
  }, [feedInputs, feeds]);

  // Calculate totals
  const totals = useMemo(() => {
    return feedTableData.reduce(
      (acc, row) => {
        if (!row) return acc;
        return {
          dsAanbod: acc.dsAanbod + row.dsAanbod,
          totKVEM: acc.totKVEM + row.totKVEM,
        };
      },
      { dsAanbod: 0, totKVEM: 0 }
    );
  }, [feedTableData]);

  return (
    <div className="space-y-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Expert Rapport
          </h2>
          <p className="text-sm text-muted-foreground">
            Gedetailleerde KPI berekeningen - {animalProfile.name}
          </p>
        </div>
      </div>

      {/* Table 1: Feed Breakdown */}
      <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
        <CardHeader className="py-3 px-4 bg-slate-100 dark:bg-slate-800">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Rantsoen Samenstelling
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-200 dark:bg-slate-700">
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-left font-semibold">component</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-left font-semibold">Bron</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-left font-semibold">berekenings-wijze</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-left font-semibold">eenheid</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right font-semibold">hoeveelheid van eenheid</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right font-semibold">ds%</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right font-semibold">VEM</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right font-semibold">DVE</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right font-semibold">OEB</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right font-semibold">DS aabod</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right font-semibold">kg product</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right font-semibold">Basis voor berekening</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right font-semibold">totKVEM</th>
                </tr>
              </thead>
              <tbody>
                {feedTableData.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="border border-slate-300 dark:border-slate-600 px-2 py-1">{row?.component}</td>
                    <td className="border border-slate-300 dark:border-slate-600 px-2 py-1">{row?.bron}</td>
                    <td className="border border-slate-300 dark:border-slate-600 px-2 py-1">{row?.berekeningsWijze}</td>
                    <td className="border border-slate-300 dark:border-slate-600 px-2 py-1">{row?.eenheid}</td>
                    <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">{row?.hoeveelheid.toFixed(1)}</td>
                    <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">{row?.dsPercent}%</td>
                    <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">{row?.vem}</td>
                    <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">{row?.dve}</td>
                    <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">{row?.oeb}</td>
                    <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">{row?.dsAanbod.toFixed(1)}</td>
                    <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">{row?.kgProduct.toFixed(1)}</td>
                    <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">{row?.basisVoorBerekening.toFixed(1)}</td>
                    <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right font-medium">{row?.totKVEM.toFixed(1)}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-slate-100 dark:bg-slate-800 font-semibold">
                  <td colSpan={9} className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right">Totaal:</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right">{totals.dsAanbod.toFixed(1)}</td>
                  <td colSpan={2} className="border border-slate-300 dark:border-slate-600 px-2 py-1.5"></td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right text-emerald-600 dark:text-emerald-400">{totals.totKVEM.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Table 2: MPR Data (only for lactating cows) */}
      {mprData && mprData.milkProduction > 0 && (
        <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="py-3 px-4 bg-slate-100 dark:bg-slate-800">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Milk className="w-4 h-4" />
              MPR uitslagen
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-medium w-48">melkproductie (kg/d)</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right w-24">{mprData.milkProduction}</td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-medium">Vet%</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right">{mprData.fatPercent.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-medium">Eiwit%</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right">{mprData.proteinPercent.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-medium">Ureum</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right">{mprData.ureum}</td>
                </tr>
                <tr className="bg-emerald-50 dark:bg-emerald-900/20">
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-semibold text-emerald-700 dark:text-emerald-400">FCM (kg)</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right font-bold text-emerald-700 dark:text-emerald-400">{fcm?.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Table 3: VEM/DVE Coverage (only for lactating cows with MPR) */}
      {mprRequirements && (
        <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="py-3 px-4 bg-slate-100 dark:bg-slate-800">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Eindresultaat — Na Krachtvoer
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-medium w-48">VEM behoefte (KVEM)</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right w-24">{(mprRequirements.vemBehoefte / 1000).toFixed(1)}</td>
                </tr>
                <tr className={`${mprRequirements.vemDekking >= 95 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-medium">VEM dekking</td>
                  <td className={`border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right font-bold ${mprRequirements.vemDekking >= 95 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {mprRequirements.vemDekking.toFixed(0)}%
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-medium">DVE behoefte (g)</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right">{Math.round(mprRequirements.dveBehoefte)}</td>
                </tr>
                <tr className={`${mprRequirements.dveDekking >= 95 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-medium">DVE dekking</td>
                  <td className={`border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right font-bold ${mprRequirements.dveDekking >= 95 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {mprRequirements.dveDekking.toFixed(0)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
        <CardHeader className="py-3 px-4 bg-slate-100 dark:bg-slate-800">
          <CardTitle className="text-sm font-semibold">Samenvatting Nutriënten Aanbod</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-200 dark:bg-slate-700">
                <th className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-left font-semibold">Parameter</th>
                <th className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right font-semibold">Behoefte</th>
                <th className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right font-semibold">Aanbod</th>
                <th className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right font-semibold">Balans</th>
                <th className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.balances.map((balance, index) => (
                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-medium">{balance.parameter}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right">{balance.requirement.toLocaleString()} {balance.unit}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right">{balance.supply.toLocaleString()} {balance.unit}</td>
                  <td className={`border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right font-medium ${balance.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {balance.balance >= 0 ? '+' : ''}{balance.balance.toLocaleString()} {balance.unit}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-center">
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] ${
                        balance.status === 'ok' 
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400' 
                          : balance.status === 'warning'
                          ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {balance.status === 'ok' ? 'OK' : balance.status === 'warning' ? 'Let op' : 'Tekort'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Structure Value */}
      {result.structureValue && (
        <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="py-3 px-4 bg-slate-100 dark:bg-slate-800">
            <CardTitle className="text-sm font-semibold">Structuurwaarde (SW)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-medium w-48">SW per kg DS</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right w-24">{result.structureValue.swPerKgDs.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-medium">Minimale eis</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right">≥ {result.structureValue.requirement.toFixed(2)}</td>
                </tr>
                <tr className={`${result.structureValue.status === 'ok' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-medium">Status</td>
                  <td className={`border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-right font-bold ${result.structureValue.status === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {result.structureValue.status === 'ok' ? 'Voldoende' : result.structureValue.status === 'warning' ? 'Marginaal' : 'Onvoldoende'}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Standard Rations Reference */}
      <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
        <CardHeader className="py-3 px-4 bg-slate-100 dark:bg-slate-800">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Standaard Rantsoenen Referentie
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-200 dark:bg-slate-700">
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-left font-semibold">Dierprofiel</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-center font-semibold">Componenten</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right font-semibold">VEM verwacht</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right font-semibold">VEM doel</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right font-semibold">DVE verwacht</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right font-semibold">DVE doel</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right font-semibold">OEB</th>
                </tr>
              </thead>
              <tbody>
                <tr className={animalProfile.name === "Vaars 12 maanden" ? "bg-primary/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 font-medium">Vaars 12 maanden</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-center">2</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-emerald-600">7,388</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">6,110</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-emerald-600">573g</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">355g</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-emerald-600">+162g</td>
                </tr>
                <tr className={animalProfile.name === "Melkkoe (30kg melk)" ? "bg-primary/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 font-medium">Melkkoe (30kg melk)</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-center">8</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-emerald-600">24,659</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">18,945</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-emerald-600">2,174g</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">1,742g</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-emerald-600">+177g</td>
                </tr>
                <tr className={animalProfile.name === "Droge koe 9e maand" ? "bg-primary/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 font-medium">Droge koe 9e maand</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-center">3</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-emerald-600">11,653</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">9,408</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-emerald-600">865g</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">402g</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-emerald-600">+215g</td>
                </tr>
                <tr className={animalProfile.name === "Vaars 1e lactatie (30kg melk)" ? "bg-primary/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 font-medium">Vaars 1e lactatie (30kg)</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-center">6</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-emerald-600">21,447</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">19,575</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-emerald-600">1,876g</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">1,806g</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-emerald-600">+168g</td>
                </tr>
                <tr className={animalProfile.name === "Hoogproductieve koe (41kg melk)" ? "bg-primary/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 font-medium">Hoogproductieve koe (41kg)</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-center">8</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-amber-600">24,659</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">26,561</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-amber-600">2,174g</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right">2,607g</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-emerald-600">+177g</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-3 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
            <strong>Let op:</strong> Standaard rantsoenen zijn gebaseerd op de Rantsoenanalyse tool en CVB 2025 normen. 
            Het huidige profiel ({animalProfile.name}) is gemarkeerd.
          </div>
        </CardContent>
      </Card>

      {/* Formulas Section */}
      <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
        <CardHeader className="py-3 px-4 bg-slate-100 dark:bg-slate-800">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Gebruikte Formules (CVB 2025)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-6 text-sm">
          {/* FCM Formula */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-1">
              1. FCM (Fat Corrected Milk) - Vetgecorrigeerde Melk
            </h4>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-xs">
              <p className="text-emerald-600 dark:text-emerald-400">FCM = (0.337 + 0.116 × Vet% + 0.06 × Eiwit%) × Melkproductie (kg/d)</p>
            </div>
            <p className="text-muted-foreground text-xs">
              Standaardiseert melkproductie naar 4% vet equivalent voor vergelijking tussen koeien.
              {fcm && <span className="ml-2 font-medium text-foreground">Huidige FCM: {fcm.toFixed(1)} kg</span>}
            </p>
          </div>

          {/* VEM Requirement */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-1">
              2. VEM Behoefte (Energie)
            </h4>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Bij MPR data beschikbaar:</p>
                <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  VEM behoefte = 442 × FCM + 5.000 (onderhoud)
                </p>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-600 pt-2">
                <p className="text-xs text-muted-foreground mb-1">Standaard berekening (CVB 2025):</p>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400">
                  VEM onderhoud = 42.4 × LG<sup>0.75</sup> (LG = lichaamsgewicht kg)
                </p>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-1">
                  VEM melk = 442 × FCM
                </p>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-1">
                  VEM dracht (9e maand) = +2.850 VEM
                </p>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-1">
                  VEM groei (1e lactatie) = +630 VEM
                </p>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-1">
                  VEM beweiding = +1.175 VEM (10% toeslag loopstallen)
                </p>
              </div>
            </div>
            {mprRequirements && (
              <p className="text-muted-foreground text-xs">
                Huidige VEM behoefte: <span className="font-medium text-foreground">{Math.round(mprRequirements.vemBehoefte).toLocaleString()} VEM</span>
              </p>
            )}
          </div>

          {/* DVE Requirement */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-1">
              3. DVE Behoefte (Darm Verteerbaar Eiwit)
            </h4>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Bij MPR data beschikbaar:</p>
                <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  DVE behoefte = 1.396 × (Melk × Eiwit% × 10) + 350 (onderhoud)
                </p>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-600 pt-2">
                <p className="text-xs text-muted-foreground mb-1">Standaard berekening (CVB 2025):</p>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400">
                  DVE onderhoud = 2.75 × LG<sup>0.5</sup> (gram/dag)
                </p>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-1">
                  DVE melk = 1.396 × melkeiwit (gram/dag)
                </p>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-1">
                  DVE dracht (9e maand) = +280g DVE
                </p>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-1">
                  DVE groei (1e lactatie) = +64g DVE
                </p>
              </div>
            </div>
            {mprRequirements && (
              <p className="text-muted-foreground text-xs">
                Huidige DVE behoefte: <span className="font-medium text-foreground">{Math.round(mprRequirements.dveBehoefte).toLocaleString()}g</span>
              </p>
            )}
          </div>

          {/* OEB Calculation */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-1">
              4. OEB (Onbestendig Eiwit Balans)
            </h4>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
              <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                OEB rantsoen = Σ (OEB per voer × kg DS)
              </p>
              <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-2">
                Eis: OEB ≥ 0 g/dag
              </p>
            </div>
            <p className="text-muted-foreground text-xs">
              OEB meet de balans tussen pensafbreekbaar eiwit en beschikbare energie in de pens. 
              Negatieve OEB duidt op eiwittekort voor microbiële eiwitsynthese.
            </p>
          </div>

          {/* Structure Value */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-1">
              5. Structuurwaarde (SW)
            </h4>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
              <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                SW rantsoen = Σ (SW per kg DS × kg DS) / Totaal kg DS
              </p>
              <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-2">
                Eis: SW ≥ 1.00 per kg DS
              </p>
            </div>
            <p className="text-muted-foreground text-xs">
              Structuurwaarde geeft aan of het rantsoen voldoende vezels bevat voor gezonde penswerking.
              Te lage SW verhoogt risico op pensacidose.
            </p>
          </div>

          {/* Mineral Requirements */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-1">
              6. Mineralen (Ca en P)
            </h4>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Calcium behoefte:</p>
                <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  Ca onderhoud = 0.0154 × lichaamsgewicht (kg)
                </p>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Ca melk = 1.22 × melkproductie (kg/dag)
                </p>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-600 pt-2">
                <p className="text-xs text-muted-foreground mb-1">Fosfor behoefte:</p>
                <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  P onderhoud = 0.0143 × lichaamsgewicht (kg)
                </p>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-1">
                  P melk = 0.9 × melkproductie (kg/dag)
                </p>
              </div>
            </div>
            <p className="text-muted-foreground text-xs italic">
              * Ca/P waarden zijn gebaseerd op standaard CVB-tabelwaarden, niet op individuele voeranalyse.
            </p>
          </div>

          {/* Dry Matter Intake */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-1">
              7. Droge Stof Opname (DS)
            </h4>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
              <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                DS opname = Σ (voerhoeveelheid × DS%)
              </p>
              <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-2">
                Maximum DS capaciteit ≈ 3.5% van lichaamsgewicht
              </p>
            </div>
            <p className="text-muted-foreground text-xs">
              De maximale droge stof opname wordt bepaald door het lichaamsgewicht en de pensinhoud.
              Overschrijding kan leiden tot verminderde vertering.
            </p>
          </div>

          {/* Nutrient Supply Calculation */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-1">
              8. Nutriëntenaanbod Berekening
            </h4>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Voor ruwvoer (per kg DS):</p>
                <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  Nutriënt aanbod = kg DS × nutriëntwaarde per kg DS
                </p>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-600 pt-2">
                <p className="text-xs text-muted-foreground mb-1">Voor krachtvoer (per kg product):</p>
                <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  Nutriënt aanbod = kg product × nutriëntwaarde per kg product
                </p>
              </div>
            </div>
          </div>

          {/* Source Reference */}
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              <strong>Bronvermelding:</strong> Alle formules zijn gebaseerd op CVB 2025 "Voedernormen Herkauwers" 
              (Centraal Veevoederbureau). De FCM formule volgt de internationale standaard voor vetgecorrigeerde melk.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t border-slate-200 dark:border-slate-700">
        Gegenereerd door Dairy Feed Calculator • CVB 2025 Dutch Ruminant Nutrition Standards
      </div>
    </div>
  );
}
