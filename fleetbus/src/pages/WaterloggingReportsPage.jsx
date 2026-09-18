import React, { useState } from 'react';
import {
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Search,
  ExternalLink
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge, SeverityBadge } from '../components/common/StatusBadge';
import { useUrbanPulse } from '../context/UrbanPulseContext';
import { exportToCSV } from '../utils/exportUtils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export function WaterloggingReportsPage() {
  const { waterlogging, setSelectedReport } = useUrbanPulse();
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const filtered = waterlogging.filter(w => {
    const matchSev = filterSeverity === 'ALL' || w.severity === filterSeverity;
    const matchSearch = w.id.toLowerCase().includes(search.toLowerCase()) ||
      w.location.toLowerCase().includes(search.toLowerCase()) ||
      w.busId.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchSearch;
  });

  const waterChartData = [
    { zone: 'Perungudi (OMR)', events: 38 },
    { zone: 'Velachery Bypass', events: 29 },
    { zone: 'Koyambedu CMBT', events: 18 },
    { zone: 'Porur Junction', events: 16 },
    { zone: 'T Nagar Lowlands', events: 14 },
    { zone: 'Ashok Nagar Subway', events: 11 }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-sky-600" />
            <span>Waterlogging & Monsoon Drainage Reports</span>
          </h1>
          <p className="text-xs text-slate-500">
            AI water depth estimation and automated Storm Water Drain (GCC SWD) pump dispatch
          </p>
        </div>

        <button
          onClick={() => exportToCSV(filtered, 'waterlogging-dossier-report.csv')}
          className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-subtle transition-all"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>EXPORT CSV</span>
        </button>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="TOTAL EVENTS"
          value="87"
          subtitle="Monsoon sensor tagged"
          variant="default"
          icon={Droplets}
        />
        <StatCard
          title="CRITICAL FLOODING"
          value="12"
          subtitle="Depth > 20cm (Pumps active)"
          variant="danger"
          badgeText="EMERGENCY"
          icon={AlertTriangle}
        />
        <StatCard
          title="ACTIVE INUNDATIONS"
          value="21"
          subtitle="Draining underway"
          variant="warning"
          icon={Clock}
        />
        <StatCard
          title="DRAINED & RESOLVED"
          value="66"
          subtitle="Roads cleared"
          variant="success"
          trend="75.8%"
          trendType="up"
          icon={CheckCircle2}
        />
      </div>

      {/* Flood Inundation by Zone Chart */}
      <div className="bg-white rounded-card border border-slate-200 p-4 shadow-subtle">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 mb-3">
          Waterlogging Inundation Frequency by Vulnerable Zone
        </h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="zone" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
              <Tooltip />
              <Bar dataKey="events" fill="#0284C7" radius={[4, 4, 0, 0]} name="Waterlogging Incidents" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Waterlogging Table */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ID, Location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">EVENT ID</th>
                <th className="py-2.5 px-3">LOCATION</th>
                <th className="py-2.5 px-3">DEPTH ESTIMATE</th>
                <th className="py-2.5 px-3">SEVERITY</th>
                <th className="py-2.5 px-3">CONFIDENCE</th>
                <th className="py-2.5 px-3">BUS ID</th>
                <th className="py-2.5 px-3">DETECTED TIME</th>
                <th className="py-2.5 px-3">DEPARTMENT</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map(item => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedReport(item)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-3 font-mono font-bold text-sky-700">
                    {item.id}
                  </td>
                  <td className="py-3 px-3 max-w-[200px] truncate text-slate-900 font-medium">
                    {item.location}
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-sky-700">
                    {item.depthEstimate || `${item.waterDepthCm} cm`}
                  </td>
                  <td className="py-3 px-3">
                    <SeverityBadge severity={item.severity} />
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[11px]">
                      {Math.round((item.confidence || 0.91) * 100)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-blue-600">
                    {item.busId}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                    {item.timestamp?.split(' ')[1] || item.timeAgo}
                  </td>
                  <td className="py-3 px-3 text-slate-600 text-[11px]">
                    {item.department}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={item.status} size="xs" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReport(item);
                      }}
                      className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 ml-auto"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
