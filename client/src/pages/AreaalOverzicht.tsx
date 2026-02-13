import { trpc } from "../lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";

export default function AreaalOverzicht() {
  const { data: soil, isLoading } = trpc.areaal.soil.useQuery(
    { farmId: 1 },
    { retry: 1 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!soil || soil.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500">Geen bodemdata beschikbaar</p>
        </div>
      </div>
    );
  }

  const soilCount = soil.length;
  const avgPH = soil.reduce((sum: number, s: any) => sum + (s.ph || 0), 0) / soilCount;
  const avgNLV = soil.reduce((sum: number, s: any) => sum + (s.nlv_kg_n_per_ha || 0), 0) / soilCount;
  const lowKCount = soil.filter((s: any) => (s.k_plantbeschikbaar_kg_per_ha || 0) < 105).length;
  const highPCount = soil.filter((s: any) => (s.p_bodemvoorraad_kg_per_ha || 0) > 500).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <a className="text-gray-500 hover:text-gray-700">
                  <ArrowLeft className="w-5 h-5" />
                </a>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Areaal Overzicht</h1>
                <p className="text-sm text-gray-500 mt-1">Bodemanalyses percelen - Niehof-Velthuis</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Percelen</div>
            <div className="text-3xl font-bold text-gray-900">{soilCount}</div>
            <div className="text-xs text-gray-500 mt-1">Bodemanalyses</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Gem. pH</div>
            <div className={`text-3xl font-bold ${avgPH >= 5.4 && avgPH <= 6.0 ? 'text-green-600' : 'text-red-600'}`}>
              {avgPH.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Streef: 5,4-6,0</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Gem. NLV</div>
            <div className="text-3xl font-bold text-gray-900">{Math.round(avgNLV)}</div>
            <div className="text-xs text-gray-500 mt-1">kg N/ha per jaar</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Aandachtspunten</div>
            <div className="text-3xl font-bold text-red-600">{lowKCount + highPCount}</div>
            <div className="text-xs text-gray-500 mt-1">{lowKCount} K-laag, {highPCount} P-hoog</div>
          </div>
        </div>

        {/* Soil Analyses Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Bodemanalyses per Perceel</h2>
            <p className="text-sm text-gray-500 mt-1">Alle percelen zijn zandgrond</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perceel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OS%</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">pH</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NLV</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">K-pb</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P-pb</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P-bv</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {soil.map((perceel: any) => {
                  const kLow = (perceel.k_plantbeschikbaar_kg_per_ha || 0) < 105;
                  const pHigh = (perceel.p_bodemvoorraad_kg_per_ha || 0) > 500;
                  const pHLow = (perceel.ph || 0) < 5.4;
                  
                  return (
                    <tr key={perceel.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {perceel.perceel_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(perceel.datum_monstername).toLocaleDateString('nl-NL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {perceel.organische_stof_pct?.toFixed(1) || '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${pHLow ? 'text-red-600' : 'text-gray-900'}`}>
                        {perceel.ph?.toFixed(1) || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {perceel.nlv_kg_n_per_ha || '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${kLow ? 'text-red-600' : 'text-gray-900'}`}>
                        {perceel.k_plantbeschikbaar_kg_per_ha || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {perceel.p_plantbeschikbaar_kg_per_ha?.toFixed(1) || '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${pHigh ? 'text-red-600' : 'text-gray-900'}`}>
                        {perceel.p_bodemvoorraad_kg_per_ha || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(kLow || pHigh || pHLow) ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Aandacht
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Goed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">Legenda</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <strong>OS%</strong> = Organische stof (%)<br/>
              <strong>NLV</strong> = N-leverend vermogen (kg N/ha)<br/>
              <strong>K-pb</strong> = Kalium plantbeschikbaar (kg K/ha, streef: 105-165)<br/>
              <strong>P-pb</strong> = Fosfor plantbeschikbaar (kg P/ha, streef: 2,7-4,4)
            </div>
            <div>
              <strong>P-bv</strong> = Fosfor bodemvoorraad (kg P/ha, streef: 225-290)<br/>
              <strong>Aandacht</strong> = K te laag, P te hoog, of pH te laag<br/>
              <strong>Maïsteelt 2026</strong> = Max 3 jaar achtereen maïs toegestaan
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
