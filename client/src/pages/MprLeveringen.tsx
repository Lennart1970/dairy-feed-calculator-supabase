import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'wouter';
import { trpc } from '../lib/trpc';
import { ArrowLeft, Download, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';

// Dutch month names
const MONTH_NAMES: Record<string, string> = {
  '01': 'Januari', '02': 'Februari', '03': 'Maart', '04': 'April',
  '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Augustus',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'December',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('nl-NL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Quality indicator badges
function QualityBadge({ value, min, max, unit = '' }: { value: number; min: number; max: number; unit?: string }) {
  const isGood = value >= min && value <= max;
  const isLow = value < min;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isGood ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
      isLow ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      {isGood ? '✓' : isLow ? '↓' : '↑'} {formatNumber(value, 2)}{unit}
    </span>
  );
}

// Trend arrow
function TrendArrow({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  const pct = previous !== 0 ? (diff / previous) * 100 : 0;
  if (Math.abs(pct) < 0.5) return <Minus className="w-3 h-3 text-slate-400" />;
  if (diff > 0) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  return <TrendingDown className="w-3 h-3 text-red-500" />;
}

// Simple SVG line chart component
function MiniChart({ data, color, height = 200, showLabels = true }: { 
  data: { label: string; value: number }[]; 
  color: string; 
  height?: number;
  showLabels?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 20, bottom: showLabels ? 40 : 10, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    
    const values = data.map(d => d.value);
    const minVal = Math.min(...values) * 0.95;
    const maxVal = Math.max(...values) * 1.05;
    const range = maxVal - minVal || 1;
    
    // Clear
    ctx.clearRect(0, 0, w, h);
    
    // Grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      
      // Y-axis labels
      const val = maxVal - (range / 4) * i;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(formatNumber(val, values[0] > 100 ? 0 : 2), padding.left - 5, y + 3);
    }
    
    // Data points and line
    const points = data.map((d, i) => ({
      x: padding.left + (chartW / (data.length - 1)) * i,
      y: padding.top + chartH - ((d.value - minVal) / range) * chartH,
    }));
    
    // Area fill
    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartH);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, color + '30');
    gradient.addColorStop(1, color + '05');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    
    // Dots
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    
    // X-axis labels
    if (showLabels) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      data.forEach((d, i) => {
        const x = padding.left + (chartW / (data.length - 1)) * i;
        ctx.fillText(d.label, x, h - 5);
      });
    }
  }, [data, color, height, showLabels]);
  
  return <canvas ref={canvasRef} style={{ width: '100%', height: `${height}px` }} />;
}

export default function MprLeveringen() {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('deliveryDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showAllColumns, setShowAllColumns] = useState(false);
  
  // Fetch data
  const { data: deliveries, isLoading } = trpc.mpr.list.useQuery({ farmId: 1 });
  const { data: monthlySummary } = trpc.mpr.monthlySummary.useQuery({ farmId: 1 });
  const { data: farm } = trpc.farm.get.useQuery();
  
  // Filter by month
  const filteredDeliveries = useMemo(() => {
    if (!deliveries) return [];
    let filtered = [...deliveries];
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(d => d.deliveryDate.substring(0, 7) === selectedMonth);
    }
    // Sort
    filtered.sort((a: any, b: any) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal - bVal) : (bVal - aVal);
    });
    return filtered;
  }, [deliveries, selectedMonth, sortField, sortDir]);
  
  // Available months
  const months = useMemo(() => {
    if (!deliveries) return [];
    const monthSet = new Set(deliveries.map(d => d.deliveryDate.substring(0, 7)));
    return Array.from(monthSet).sort();
  }, [deliveries]);
  
  // Yearly totals
  const yearlyTotals = useMemo(() => {
    if (!deliveries) return null;
    const totalKg = deliveries.reduce((s, d) => s + d.kgMelk, 0);
    const totalVet = deliveries.reduce((s, d) => s + d.kgVet, 0);
    const totalEiwit = deliveries.reduce((s, d) => s + d.kgEiwit, 0);
    const avgVet = deliveries.reduce((s, d) => s + d.vetProcent, 0) / deliveries.length;
    const avgEiwit = deliveries.reduce((s, d) => s + d.eiwitProcent, 0) / deliveries.length;
    const avgUreum = deliveries.filter(d => d.ureum != null).reduce((s, d) => s + (d.ureum || 0), 0) / deliveries.filter(d => d.ureum != null).length;
    return { totalKg, totalVet, totalEiwit, avgVet, avgEiwit, avgUreum, count: deliveries.length };
  }, [deliveries]);
  
  // CSV export
  const exportCSV = () => {
    if (!filteredDeliveries.length) return;
    const headers = [
      'Datum', 'Tijd', 'Kg Melk', 'Ltr Melk', 'Temp', 'Vet%', 'Eiwit%', 'Lactose%',
      'Ureum', 'Vet/Eiwit', 'Antibiotica', 'Fosfor', 'Kg Vet', 'Kg Eiwit',
      'Myristinezuur C14', 'Palmitinezuur C16', 'Stearinezuur C18', 'Oliezuur C18:1'
    ];
    const rows = filteredDeliveries.map(d => [
      d.deliveryDate, d.deliveryTime, d.kgMelk, d.ltrMelk, d.temp,
      d.vetProcent, d.eiwitProcent, d.lactoseProcent, d.ureum,
      d.vetEiwitRatio, d.antibiotica, d.fosfor, d.kgVet, d.kgEiwit,
      d.myristinezuurC14, d.palmitinezuurC16, d.stearinezuurC18, d.oliezuurC181
    ]);
    
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mpr_leveringen_${selectedMonth === 'all' ? '2025' : selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Toggle sort
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };
  
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-slate-500">MPR data laden...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">MPR Leveringen</h1>
            <p className="text-sm text-slate-500">
              {farm?.name || 'Maatschap Niehof-Velthuis'} &middot; Bedrijf 400093 &middot; {yearlyTotals?.count || 0} leveringen
            </p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      {yearlyTotals && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Totaal Melk</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {formatNumber(yearlyTotals.totalKg)} kg
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {formatNumber(yearlyTotals.totalKg / 365)} kg/dag
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Totaal Vet</div>
            <div className="text-xl font-bold text-amber-600 mt-1">
              {formatNumber(yearlyTotals.totalVet, 0)} kg
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Gem. {formatNumber(yearlyTotals.avgVet, 2)}%
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Totaal Eiwit</div>
            <div className="text-xl font-bold text-blue-600 mt-1">
              {formatNumber(yearlyTotals.totalEiwit, 0)} kg
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Gem. {formatNumber(yearlyTotals.avgEiwit, 2)}%
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Gem. Levering</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {formatNumber(yearlyTotals.totalKg / yearlyTotals.count)} kg
            </div>
            <div className="text-xs text-slate-400 mt-1">
              per 3 dagen
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Gem. Ureum</div>
            <div className="text-xl font-bold text-purple-600 mt-1">
              {formatNumber(yearlyTotals.avgUreum, 1)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              mg/100gr (doel: 15-25)
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Vet/Eiwit Ratio</div>
            <div className="text-xl font-bold text-emerald-600 mt-1">
              {formatNumber(yearlyTotals.avgVet / yearlyTotals.avgEiwit, 2)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              doel: 1.20-1.40
            </div>
          </div>
        </div>
      )}

      {/* Trend Charts */}
      {monthlySummary && monthlySummary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Melkproductie (kg/levering)</h3>
            <MiniChart
              data={monthlySummary.map(m => ({
                label: MONTH_NAMES[m.month.split('-')[1]]?.substring(0, 3) || m.month,
                value: m.avgKgMelk,
              }))}
              color="#3b82f6"
            />
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Vet% &amp; Eiwit%</h3>
            <div className="relative">
              <MiniChart
                data={monthlySummary.map(m => ({
                  label: MONTH_NAMES[m.month.split('-')[1]]?.substring(0, 3) || m.month,
                  value: m.avgVetProcent,
                }))}
                color="#f59e0b"
              />
              <div className="absolute top-0 right-0 flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block"></span> Vet%</span>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Ureum (mg/100gr)</h3>
            <MiniChart
              data={monthlySummary.map(m => ({
                label: MONTH_NAMES[m.month.split('-')[1]]?.substring(0, 3) || m.month,
                value: m.avgUreum,
              }))}
              color="#8b5cf6"
            />
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Eiwit% per maand</h3>
            <MiniChart
              data={monthlySummary.map(m => ({
                label: MONTH_NAMES[m.month.split('-')[1]]?.substring(0, 3) || m.month,
                value: m.avgEiwitProcent,
              }))}
              color="#3b82f6"
            />
          </div>
        </div>
      )}

      {/* Monthly Summary Table */}
      {monthlySummary && monthlySummary.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">Maandoverzicht 2025</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-400">Maand</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600 dark:text-slate-400">#Lev</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600 dark:text-slate-400">Gem. kg</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600 dark:text-slate-400">Totaal kg</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600 dark:text-slate-400">Vet%</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600 dark:text-slate-400">Eiwit%</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600 dark:text-slate-400">Lactose%</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600 dark:text-slate-400">Ureum</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600 dark:text-slate-400">Kg Vet</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600 dark:text-slate-400">Kg Eiwit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {monthlySummary.map((m, idx) => (
                  <tr key={m.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">
                      {MONTH_NAMES[m.month.split('-')[1]] || m.month}
                    </td>
                    <td className="text-right px-4 py-2 text-slate-600 dark:text-slate-400">{m.deliveryCount}</td>
                    <td className="text-right px-4 py-2 text-slate-900 dark:text-white font-medium">
                      <div className="flex items-center justify-end gap-1">
                        {formatNumber(m.avgKgMelk)}
                        {idx > 0 && <TrendArrow current={m.avgKgMelk} previous={monthlySummary[idx-1].avgKgMelk} />}
                      </div>
                    </td>
                    <td className="text-right px-4 py-2 text-slate-600 dark:text-slate-400">{formatNumber(m.totalKgMelk)}</td>
                    <td className="text-right px-4 py-2">
                      <QualityBadge value={m.avgVetProcent} min={4.2} max={5.2} />
                    </td>
                    <td className="text-right px-4 py-2">
                      <QualityBadge value={m.avgEiwitProcent} min={3.5} max={4.0} />
                    </td>
                    <td className="text-right px-4 py-2 text-slate-600 dark:text-slate-400">{formatNumber(m.avgLactoseProcent, 2)}</td>
                    <td className="text-right px-4 py-2">
                      <QualityBadge value={m.avgUreum} min={15} max={25} />
                    </td>
                    <td className="text-right px-4 py-2 text-amber-600 font-medium">{formatNumber(m.totalKgVet, 0)}</td>
                    <td className="text-right px-4 py-2 text-blue-600 font-medium">{formatNumber(m.totalKgEiwit, 0)}</td>
                  </tr>
                ))}
                {/* Totals row */}
                {yearlyTotals && (
                  <tr className="bg-slate-50 dark:bg-slate-900/50 font-bold">
                    <td className="px-4 py-2 text-slate-900 dark:text-white">TOTAAL</td>
                    <td className="text-right px-4 py-2 text-slate-900 dark:text-white">{yearlyTotals.count}</td>
                    <td className="text-right px-4 py-2 text-slate-900 dark:text-white">{formatNumber(yearlyTotals.totalKg / yearlyTotals.count)}</td>
                    <td className="text-right px-4 py-2 text-slate-900 dark:text-white">{formatNumber(yearlyTotals.totalKg)}</td>
                    <td className="text-right px-4 py-2 text-slate-900 dark:text-white">{formatNumber(yearlyTotals.avgVet, 2)}%</td>
                    <td className="text-right px-4 py-2 text-slate-900 dark:text-white">{formatNumber(yearlyTotals.avgEiwit, 2)}%</td>
                    <td className="text-right px-4 py-2 text-slate-900 dark:text-white">-</td>
                    <td className="text-right px-4 py-2 text-slate-900 dark:text-white">{formatNumber(yearlyTotals.avgUreum, 1)}</td>
                    <td className="text-right px-4 py-2 text-amber-600">{formatNumber(yearlyTotals.totalVet, 0)}</td>
                    <td className="text-right px-4 py-2 text-blue-600">{formatNumber(yearlyTotals.totalEiwit, 0)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filter & Delivery Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-white">Alle Leveringen</h3>
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="all">Alle maanden ({deliveries?.length || 0})</option>
              {months.map(m => (
                <option key={m} value={m}>
                  {MONTH_NAMES[m.split('-')[1]] || m} ({deliveries?.filter(d => d.deliveryDate.substring(0, 7) === m).length})
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAllColumns(!showAllColumns)}
              className="text-sm px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {showAllColumns ? 'Minder kolommen' : 'Alle kolommen'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('deliveryDate')}>
                  <span className="flex items-center gap-1">Datum <SortIcon field="deliveryDate" /></span>
                </th>
                <th className="text-right px-3 py-2 font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('kgMelk')}>
                  <span className="flex items-center justify-end gap-1">Kg Melk <SortIcon field="kgMelk" /></span>
                </th>
                <th className="text-right px-3 py-2 font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('vetProcent')}>
                  <span className="flex items-center justify-end gap-1">Vet% <SortIcon field="vetProcent" /></span>
                </th>
                <th className="text-right px-3 py-2 font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('eiwitProcent')}>
                  <span className="flex items-center justify-end gap-1">Eiwit% <SortIcon field="eiwitProcent" /></span>
                </th>
                <th className="text-right px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Lactose%</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('ureum')}>
                  <span className="flex items-center justify-end gap-1">Ureum <SortIcon field="ureum" /></span>
                </th>
                <th className="text-right px-3 py-2 font-medium text-slate-600 dark:text-slate-400">V/E</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Kg Vet</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Kg Eiwit</th>
                {showAllColumns && (
                  <>
                    <th className="text-right px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Temp</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Fosfor</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-600 dark:text-slate-400">C14</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-600 dark:text-slate-400">C16</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-600 dark:text-slate-400">C18</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-600 dark:text-slate-400">C18:1</th>
                    <th className="text-center px-3 py-2 font-medium text-slate-600 dark:text-slate-400">AB</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDeliveries.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-3 py-2 text-slate-900 dark:text-white whitespace-nowrap">
                    <div className="font-medium">{formatDate(d.deliveryDate)}</div>
                    <div className="text-xs text-slate-400">{d.deliveryTime?.substring(0, 5)}</div>
                  </td>
                  <td className="text-right px-3 py-2 font-medium text-slate-900 dark:text-white">{formatNumber(d.kgMelk)}</td>
                  <td className="text-right px-3 py-2">
                    <QualityBadge value={d.vetProcent} min={4.0} max={5.5} />
                  </td>
                  <td className="text-right px-3 py-2">
                    <QualityBadge value={d.eiwitProcent} min={3.4} max={4.1} />
                  </td>
                  <td className="text-right px-3 py-2 text-slate-600 dark:text-slate-400">{formatNumber(d.lactoseProcent, 2)}</td>
                  <td className="text-right px-3 py-2">
                    <QualityBadge value={d.ureum || 0} min={15} max={25} />
                  </td>
                  <td className="text-right px-3 py-2 text-slate-600 dark:text-slate-400">
                    {d.vetEiwitRatio ? formatNumber(d.vetEiwitRatio, 2) : '-'}
                  </td>
                  <td className="text-right px-3 py-2 text-amber-600 font-medium">{formatNumber(d.kgVet, 1)}</td>
                  <td className="text-right px-3 py-2 text-blue-600 font-medium">{formatNumber(d.kgEiwit, 1)}</td>
                  {showAllColumns && (
                    <>
                      <td className="text-right px-3 py-2 text-slate-500">{d.temp != null ? formatNumber(d.temp, 1) : '-'}</td>
                      <td className="text-right px-3 py-2 text-slate-500">{d.fosfor || '-'}</td>
                      <td className="text-right px-3 py-2 text-slate-500">{d.myristinezuurC14 ? formatNumber(d.myristinezuurC14, 1) : '-'}</td>
                      <td className="text-right px-3 py-2 text-slate-500">{d.palmitinezuurC16 ? formatNumber(d.palmitinezuurC16, 1) : '-'}</td>
                      <td className="text-right px-3 py-2 text-slate-500">{d.stearinezuurC18 ? formatNumber(d.stearinezuurC18, 1) : '-'}</td>
                      <td className="text-right px-3 py-2 text-slate-500">{d.oliezuurC181 ? formatNumber(d.oliezuurC181, 1) : '-'}</td>
                      <td className="text-center px-3 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          d.antibiotica === '-' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {d.antibiotica === '-' ? 'Vrij' : d.antibiotica}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-200 dark:border-slate-700">
          {filteredDeliveries.length} leveringen weergegeven &middot; Bron: FrieslandCampina MPR
        </div>
      </div>
    </div>
  );
}
