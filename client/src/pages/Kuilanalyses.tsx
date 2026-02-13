import { trpc } from "../lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";

export default function Kuilanalyses() {
  const { data: silage, isLoading } = trpc.areaal.silage.useQuery(
    { farmId: 1 },
    { retry: 1 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!silage || silage.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500">Geen kuildata beschikbaar</p>
        </div>
      </div>
    );
  }

  const graskuilen = silage.filter((k: any) => k.type === 'Graskuil');
  const maiskuilen = silage.filter((k: any) => k.type === 'Maiskuil');
  
  const avgVEMGras = graskuilen.length > 0
    ? Math.round(graskuilen.reduce((sum: number, k: any) => sum + (k.vem_per_kg_ds || 0), 0) / graskuilen.length)
    : 0;
  const avgVEMMais = maiskuilen.length > 0
    ? Math.round(maiskuilen.reduce((sum: number, k: any) => sum + (k.vem_per_kg_ds || 0), 0) / maiskuilen.length)
    : 0;

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
                <h1 className="text-2xl font-bold text-gray-900">Kuilanalyses</h1>
                <p className="text-sm text-gray-500 mt-1">Ruwvoerkwaliteit 2025 - Niehof-Velthuis</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Totaal Kuilen</div>
            <div className="text-3xl font-bold text-gray-900">{silage.length}</div>
            <div className="text-xs text-gray-500 mt-1">{graskuilen.length} gras, {maiskuilen.length} maïs</div>
          </div>

          <div className="bg-green-50 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-green-900 mb-2">Graskuil VEM</div>
            <div className="text-3xl font-bold text-green-900">{avgVEMGras}</div>
            <div className="text-xs text-green-700 mt-1">Gemiddeld per kg ds</div>
          </div>

          <div className="bg-yellow-50 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-yellow-900 mb-2">Maïskuil VEM</div>
            <div className="text-3xl font-bold text-yellow-900">{avgVEMMais}</div>
            <div className="text-xs text-yellow-700 mt-1">Gemiddeld per kg ds</div>
          </div>

          <div className="bg-blue-50 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-blue-900 mb-2">Kwaliteit</div>
            <div className="text-3xl font-bold text-blue-900">
              {silage.filter((k: any) => (k.vem_per_kg_ds || 0) > 900).length}/{silage.length}
            </div>
            <div className="text-xs text-blue-700 mt-1">VEM &gt; 900</div>
          </div>
        </div>

        {/* Graskuilen */}
        {graskuilen.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
              <h2 className="text-lg font-semibold text-green-900">Graskuilen ({graskuilen.length})</h2>
              <p className="text-sm text-green-700 mt-1">Gemiddeld VEM: {avgVEMGras}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kuil</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DS (g/kg)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VEM</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DVE</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OEB</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RE</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kwaliteit</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {graskuilen.map((kuil: any) => {
                    const vemGood = (kuil.vem_per_kg_ds || 0) >= 900;
                    return (
                      <tr key={kuil.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {kuil.kuil_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(kuil.datum_monstername).toLocaleDateString('nl-NL')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {kuil.ds_g_per_kg || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${vemGood ? 'text-green-600' : 'text-orange-600'}`}>
                          {kuil.vem_per_kg_ds || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {kuil.dve_g_per_kg_ds || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {kuil.oeb_g_per_kg_ds || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {kuil.re_g_per_kg_ds || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {vemGood ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Goed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Matig
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
        )}

        {/* Maïskuilen */}
        {maiskuilen.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
              <h2 className="text-lg font-semibold text-yellow-900">Maïskuilen ({maiskuilen.length})</h2>
              <p className="text-sm text-yellow-700 mt-1">Gemiddeld VEM: {avgVEMMais}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kuil</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DS (g/kg)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VEM</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DVE</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OEB</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RE</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kwaliteit</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {maiskuilen.map((kuil: any) => {
                    const vemGood = (kuil.vem_per_kg_ds || 0) >= 950;
                    return (
                      <tr key={kuil.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {kuil.kuil_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(kuil.datum_monstername).toLocaleDateString('nl-NL')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {kuil.ds_g_per_kg || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${vemGood ? 'text-green-600' : 'text-orange-600'}`}>
                          {kuil.vem_per_kg_ds || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {kuil.dve_g_per_kg_ds || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {kuil.oeb_g_per_kg_ds || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {kuil.re_g_per_kg_ds || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {vemGood ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Goed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Matig
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
        )}

        {/* Legend */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">Legenda</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <strong>DS</strong> = Droge stof (g/kg product)<br/>
              <strong>VEM</strong> = Voeder Eenheid Melk (per kg ds)<br/>
              <strong>DVE</strong> = Darm Verteerbaar Eiwit (g/kg ds)
            </div>
            <div>
              <strong>OEB</strong> = Onbestendig Eiwit Balans (g/kg ds)<br/>
              <strong>RE</strong> = Ruw Eiwit (g/kg ds)<br/>
              <strong>Streefwaarde VEM</strong>: Gras &gt;900, Maïs &gt;950
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
