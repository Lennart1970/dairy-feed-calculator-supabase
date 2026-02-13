import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { trpc } from '../lib/trpc';
import { ArrowLeft, Download, ChevronDown, ChevronUp, Search, Filter, Eye } from 'lucide-react';

// ============================================
// Helpers
// ============================================

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n === null || n === undefined) return '-';
  return Number(n).toLocaleString('nl-NL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Celgetal color coding
function CelBadge({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-slate-400">-</span>;
  const v = Number(value);
  const color = v <= 150 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
    v <= 250 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
    v <= 500 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{formatNumber(v)}</span>;
}

// Status badge
function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const colors: Record<string, string> = {
    'vers': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'gust': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'drg': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    'onm': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  const labels: Record<string, string> = {
    'vers': 'Vers', 'gust': 'Gust', 'drg': 'Droog', 'onm': 'Onm.',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-slate-100 text-slate-600'}`}>
      {labels[status] || status}
    </span>
  );
}

// Simple SVG sparkline for cow history
function Sparkline({ data, color = '#3b82f6', width = 80, height = 24 }: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ============================================
// CSV Export
// ============================================

function exportCowRecordsCsv(records: any[], mprDate: string) {
  const headers = [
    'Diernr', 'Naam', 'Levensnr', 'Leeftijd', 'Kg Melk/dag', 'Vet %', 'Eiwit %',
    'Lactose %', 'Ureum', 'KgVE', 'Celgetal', 'Status', 'Lactatienr', 'Kalfdatum',
    'Dgn 305', 'Kg Melk 305', 'Vet% 305', 'Eiw% 305', 'Kg Vet 305', 'Kg Eiw 305', 'LW',
    'Lft Afk', 'Lact Nr (life)', 'Kg Melk (life)', 'Vet% (life)', 'Eiw% (life)',
  ];

  const rows = records.map(r => [
    r.diernr, r.naam || '', r.levensnummer || '', r.leeftijd || '',
    r.kg_melk_dag !== null ? String(r.kg_melk_dag).replace('.', ',') : '',
    r.vet_pct !== null ? String(r.vet_pct).replace('.', ',') : '',
    r.eiw_pct !== null ? String(r.eiw_pct).replace('.', ',') : '',
    r.lac_pct !== null ? String(r.lac_pct).replace('.', ',') : '',
    r.ureum || '', r.kgve !== null ? String(r.kgve).replace('.', ',') : '',
    r.celgetal || '', r.status || '', r.lactatienr || '', r.kalfdatum || '',
    r.dgn_305 || '', r.kg_melk_305 || '',
    r.vet_pct_305 !== null ? String(r.vet_pct_305).replace('.', ',') : '',
    r.eiw_pct_305 !== null ? String(r.eiw_pct_305).replace('.', ',') : '',
    r.kg_vet_305 || '', r.kg_eiw_305 || '', r.lw || '',
    r.lifetime_lft_afk !== null ? String(r.lifetime_lft_afk).replace('.', ',') : '',
    r.lifetime_lact_nr || '', r.lifetime_kg_melk || '',
    r.lifetime_vet_pct !== null ? String(r.lifetime_vet_pct).replace('.', ',') : '',
    r.lifetime_eiw_pct !== null ? String(r.lifetime_eiw_pct).replace('.', ',') : '',
  ]);

  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mpr_dieroverzicht_${mprDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// Cow Detail Modal
// ============================================

function CowDetailModal({ diernr, naam, onClose }: { diernr: number; naam: string | null; onClose: () => void }) {
  const { data: history, isLoading } = trpc.mprCows.cowHistory.useQuery({ diernr });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Koe {diernr} - {naam || 'Onbekend'}
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl">✕</button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Laden...</div>
          ) : history && history.length > 0 ? (
            <>
              {/* Sparklines */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Melk (kg/dag)', data: history.filter((h: any) => h.kg_melk_dag).map((h: any) => Number(h.kg_melk_dag)), color: '#3b82f6' },
                  { label: 'Vet %', data: history.filter((h: any) => h.vet_pct).map((h: any) => Number(h.vet_pct)), color: '#f59e0b' },
                  { label: 'Eiwit %', data: history.filter((h: any) => h.eiw_pct).map((h: any) => Number(h.eiw_pct)), color: '#10b981' },
                  { label: 'Celgetal', data: history.filter((h: any) => h.celgetal).map((h: any) => Number(h.celgetal)), color: '#ef4444' },
                ].map(({ label, data, color }) => (
                  <div key={label} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {data.length > 0 ? formatNumber(data[data.length - 1], label.includes('%') ? 2 : 0) : '-'}
                    </div>
                    <Sparkline data={data} color={color} width={100} height={28} />
                  </div>
                ))}
              </div>

              {/* History table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-600">
                      <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Datum</th>
                      <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Melk</th>
                      <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Vet%</th>
                      <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Eiw%</th>
                      <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Cel</th>
                      <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Ureum</th>
                      <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">LW</th>
                      <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h: any) => (
                      <tr key={h.mpr_date} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="py-2 px-2 text-slate-700 dark:text-slate-300">{formatDate(h.mpr_date)}</td>
                        <td className="py-2 px-2 text-right font-mono">{formatNumber(h.kg_melk_dag, 1)}</td>
                        <td className="py-2 px-2 text-right font-mono">{formatNumber(h.vet_pct, 2)}</td>
                        <td className="py-2 px-2 text-right font-mono">{formatNumber(h.eiw_pct, 2)}</td>
                        <td className="py-2 px-2 text-right"><CelBadge value={h.celgetal} /></td>
                        <td className="py-2 px-2 text-right font-mono">{formatNumber(h.ureum)}</td>
                        <td className="py-2 px-2 text-right font-mono">{formatNumber(h.lw)}</td>
                        <td className="py-2 px-2 text-center"><StatusBadge status={h.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-500">Geen data gevonden</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function MprDieroverzicht() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('diernr');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedCow, setSelectedCow] = useState<{ diernr: number; naam: string | null } | null>(null);
  const [showLifetime, setShowLifetime] = useState(false);

  // Fetch sessions
  const { data: sessions, isLoading: sessionsLoading } = trpc.mprCows.sessions.useQuery({ farmId: 1 });
  
  // Fetch herd summary for trend overview
  const { data: herdSummary } = trpc.mprCows.herdSummary.useQuery({ farmId: 1 });

  // Auto-select latest session
  const activeDate = selectedDate || (sessions && sessions.length > 0 ? sessions[0].mpr_date : null);

  // Fetch cow records for selected session
  const { data: cowRecords, isLoading: cowsLoading } = trpc.mprCows.bySession.useQuery(
    { farmId: 1, mprDate: activeDate || '' },
    { enabled: !!activeDate }
  );

  // Filter and sort
  const filteredCows = useMemo(() => {
    if (!cowRecords) return [];
    let filtered = [...cowRecords];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        String(c.diernr).includes(term) ||
        (c.naam && c.naam.toLowerCase().includes(term)) ||
        (c.levensnummer && c.levensnummer.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(c => c.kg_melk_dag !== null && c.status !== 'drg' && c.status !== 'onm');
    } else if (statusFilter === 'dry') {
      filtered = filtered.filter(c => c.status === 'drg' || c.status === 'onm');
    } else if (statusFilter === 'vers') {
      filtered = filtered.filter(c => c.status === 'vers');
    } else if (statusFilter === 'highcel') {
      filtered = filtered.filter(c => c.celgetal && Number(c.celgetal) > 250);
    }

    // Sort
    filtered.sort((a: any, b: any) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (va === null || va === undefined) va = sortDir === 'asc' ? Infinity : -Infinity;
      if (vb === null || vb === undefined) vb = sortDir === 'asc' ? Infinity : -Infinity;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      const numA = Number(va), numB = Number(vb);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

    return filtered;
  }, [cowRecords, searchTerm, statusFilter, sortField, sortDir]);

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />;
  };

  // Summary stats for current session
  const sessionStats = useMemo(() => {
    if (!cowRecords) return null;
    const active = cowRecords.filter((c: any) => c.kg_melk_dag !== null && c.status !== 'drg' && c.status !== 'onm');
    const dry = cowRecords.filter((c: any) => c.status === 'drg' || c.status === 'onm');
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return {
      total: cowRecords.length,
      active: active.length,
      dry: dry.length,
      vers: active.filter((c: any) => c.status === 'vers').length,
      avgMelk: avg(active.filter((c: any) => c.kg_melk_dag).map((c: any) => Number(c.kg_melk_dag))),
      avgVet: avg(active.filter((c: any) => c.vet_pct).map((c: any) => Number(c.vet_pct))),
      avgEiw: avg(active.filter((c: any) => c.eiw_pct).map((c: any) => Number(c.eiw_pct))),
      avgCel: avg(active.filter((c: any) => c.celgetal).map((c: any) => Number(c.celgetal))),
      avgUreum: avg(active.filter((c: any) => c.ureum).map((c: any) => Number(c.ureum))),
      highCel: active.filter((c: any) => c.celgetal && Number(c.celgetal) > 250).length,
    };
  }, [cowRecords]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <a className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <ArrowLeft className="w-5 h-5" />
            </a>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">MPR Dieroverzicht</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Individuele koedata per 6-wekelijkse MPR sessie</p>
          </div>
          <Link href="/mpr">
            <a className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">← MPR Leveringen</a>
          </Link>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {/* Session selector */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">MPR Sessie:</label>
            {sessionsLoading ? (
              <span className="text-sm text-slate-400">Laden...</span>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {sessions?.map((s: any) => (
                  <button
                    key={s.mpr_date}
                    onClick={() => setSelectedDate(s.mpr_date)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeDate === s.mpr_date
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {formatDate(s.mpr_date)}
                    <span className="ml-1 text-xs opacity-75">({s.cow_count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary cards */}
        {sessionStats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Totaal koeien', value: sessionStats.total, sub: `${sessionStats.active} actief, ${sessionStats.dry} droog` },
              { label: 'Gem. melk/dag', value: formatNumber(sessionStats.avgMelk, 1) + ' kg', sub: `${sessionStats.vers} vers gekalfd` },
              { label: 'Gem. vet / eiwit', value: `${formatNumber(sessionStats.avgVet, 2)}% / ${formatNumber(sessionStats.avgEiw, 2)}%`, sub: `V/E ratio: ${formatNumber(sessionStats.avgVet / sessionStats.avgEiw, 2)}` },
              { label: 'Gem. celgetal', value: formatNumber(sessionStats.avgCel, 0) + ' x1000', sub: `${sessionStats.highCel} koeien > 250` },
              { label: 'Gem. ureum', value: formatNumber(sessionStats.avgUreum, 0), sub: 'mg/100gr' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{value}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Herd trend overview */}
        {herdSummary && herdSummary.length > 1 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Kudde Trend (alle sessies)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-600">
                    <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Datum</th>
                    <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Koeien</th>
                    <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Actief</th>
                    <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Droog</th>
                    <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Gem. Melk</th>
                    <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Vet%</th>
                    <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Eiw%</th>
                    <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Celgetal</th>
                    <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Ureum</th>
                    <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Hoog cel</th>
                    <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Vers</th>
                  </tr>
                </thead>
                <tbody>
                  {herdSummary.map((s: any) => (
                    <tr
                      key={s.mpr_date}
                      className={`border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                        activeDate === s.mpr_date ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => setSelectedDate(s.mpr_date)}
                    >
                      <td className="py-2 px-2 font-medium text-slate-700 dark:text-slate-300">{formatDate(s.mpr_date)}</td>
                      <td className="py-2 px-2 text-right font-mono">{s.total_cows}</td>
                      <td className="py-2 px-2 text-right font-mono">{s.active_cows}</td>
                      <td className="py-2 px-2 text-right font-mono">{s.dry_cows}</td>
                      <td className="py-2 px-2 text-right font-mono font-semibold">{formatNumber(s.avg_kg_melk, 1)}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatNumber(s.avg_vet_pct, 2)}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatNumber(s.avg_eiw_pct, 2)}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatNumber(s.avg_celgetal, 0)}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatNumber(s.avg_ureum, 0)}</td>
                      <td className="py-2 px-2 text-right">
                        <span className={`text-xs font-medium ${s.high_cel_count > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {s.high_cel_count}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono">{s.vers_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filters and actions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Zoek op diernr, naam of levensnr..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              {[
                { key: 'all', label: 'Alle' },
                { key: 'active', label: 'Actief' },
                { key: 'dry', label: 'Droog' },
                { key: 'vers', label: 'Vers' },
                { key: 'highcel', label: 'Hoog cel' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    statusFilter === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Toggle lifetime data */}
            <button
              onClick={() => setShowLifetime(!showLifetime)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                showLifetime ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              }`}
            >
              {showLifetime ? 'Verberg' : 'Toon'} Lifetime
            </button>

            {/* CSV Export */}
            {cowRecords && activeDate && (
              <button
                onClick={() => exportCowRecordsCsv(cowRecords, activeDate)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
            )}

            <span className="text-xs text-slate-400">{filteredCows.length} koeien</span>
          </div>
        </div>

        {/* Cow records table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {cowsLoading ? (
            <div className="text-center py-12 text-slate-500">Laden...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    {[
                      { field: 'diernr', label: 'Nr', align: 'left' },
                      { field: 'naam', label: 'Naam', align: 'left' },
                      { field: 'leeftijd', label: 'Lft', align: 'right' },
                      { field: 'kg_melk_dag', label: 'Melk kg', align: 'right' },
                      { field: 'vet_pct', label: 'Vet%', align: 'right' },
                      { field: 'eiw_pct', label: 'Eiw%', align: 'right' },
                      { field: 'lac_pct', label: 'Lac%', align: 'right' },
                      { field: 'ureum', label: 'Ur', align: 'right' },
                      { field: 'kgve', label: 'VE', align: 'right' },
                      { field: 'celgetal', label: 'Cel', align: 'right' },
                      { field: 'status', label: 'Status', align: 'center' },
                      { field: 'lactatienr', label: 'Lact', align: 'right' },
                      { field: 'kalfdatum', label: 'Kalfdatum', align: 'left' },
                      { field: 'kg_melk_305', label: '305d kg', align: 'right' },
                      { field: 'lw', label: 'LW', align: 'right' },
                      ...(showLifetime ? [
                        { field: 'lifetime_lact_nr', label: 'L.Lact', align: 'right' as const },
                        { field: 'lifetime_kg_melk', label: 'L.Melk', align: 'right' as const },
                        { field: 'lifetime_vet_pct', label: 'L.Vet%', align: 'right' as const },
                        { field: 'lifetime_eiw_pct', label: 'L.Eiw%', align: 'right' as const },
                      ] : []),
                    ].map(({ field, label, align }) => (
                      <th
                        key={field}
                        onClick={() => handleSort(field)}
                        className={`py-2 px-2 font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 whitespace-nowrap text-${align}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label} <SortIcon field={field} />
                        </span>
                      </th>
                    ))}
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCows.map((c: any) => (
                    <tr
                      key={`${c.mpr_date}-${c.diernr}`}
                      className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >
                      <td className="py-1.5 px-2 font-mono font-semibold text-slate-700 dark:text-slate-300">{c.diernr}</td>
                      <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">{c.naam || '-'}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-slate-500">{formatNumber(c.leeftijd)}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-semibold">{formatNumber(c.kg_melk_dag, 1)}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{formatNumber(c.vet_pct, 2)}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{formatNumber(c.eiw_pct, 2)}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-slate-500">{formatNumber(c.lac_pct, 2)}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{formatNumber(c.ureum)}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-slate-500">{formatNumber(c.kgve, 1)}</td>
                      <td className="py-1.5 px-2 text-right"><CelBadge value={c.celgetal} /></td>
                      <td className="py-1.5 px-2 text-center"><StatusBadge status={c.status} /></td>
                      <td className="py-1.5 px-2 text-right font-mono">{formatNumber(c.lactatienr)}</td>
                      <td className="py-1.5 px-2 text-slate-500 font-mono text-xs">{c.kalfdatum || '-'}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{formatNumber(c.kg_melk_305)}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-slate-500">{formatNumber(c.lw)}</td>
                      {showLifetime && (
                        <>
                          <td className="py-1.5 px-2 text-right font-mono text-slate-400">{formatNumber(c.lifetime_lact_nr)}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-slate-400">{formatNumber(c.lifetime_kg_melk)}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-slate-400">{formatNumber(c.lifetime_vet_pct, 2)}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-slate-400">{formatNumber(c.lifetime_eiw_pct, 2)}</td>
                        </>
                      )}
                      <td className="py-1.5 px-2">
                        <button
                          onClick={() => setSelectedCow({ diernr: c.diernr, naam: c.naam })}
                          className="text-blue-500 hover:text-blue-700 dark:text-blue-400"
                          title="Bekijk historie"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Cow detail modal */}
      {selectedCow && (
        <CowDetailModal
          diernr={selectedCow.diernr}
          naam={selectedCow.naam}
          onClose={() => setSelectedCow(null)}
        />
      )}
    </div>
  );
}
