import React, { useState } from 'react';
import {
  Cone,
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
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import { OVERALL_ANALYTICS } from '../data/analyticsData';

export function PotholeReportsPage() {
  const { potholes, setSelectedReport } = useUrbanPulse();
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  const filteredPotholes = potholes.filter(p => {
    const matchSev = filterSeverity === 'ALL' || p.severity === filterSeverity;
    const matchStat = filterStatus === 'ALL' || p.status === filterStatus;
    const matchSearch = p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase()) ||
      p.busId.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchStat && matchSearch;
  });

  const criticalCount = potholes.filter(p => p.severity === 'CRITICAL').length;
  const highCount = potholes.filter(p => p.severity === 'HIGH').length;
  const resolvedCount = potholes.filter(p => p.status === 'RESOLVED' || p.status === 'VERIFIED CLOSED').length;
  const pendingCount = potholes.filter(p => p.status === 'PENDING' || p.status === 'ASSIGNED' || p.status === 'IN PROGRESS').length;

  const severityPieData = [
    { name: 'Critical', value: 27, color: '#DC2626' },
    { name: 'High Severity', value: 83, color: '#F59E0B' },
    { name: 'Medium Severity', value: 142, color: '#0284C7' },
    { name: 'Low / Advisory', value: 90, color: '#16A34A' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Cone className="w-5 h-5 text-amber-600" />
            <span>Pothole & Surface Crater Reports</span>
          </h1>
          <p className="text-xs text-slate-500">
            AI optical depth classification and automated GCC Roads & Infrastructure dispatch
          </p>
        </div>

        <button
          onClick={() => exportToCSV(filteredPotholes, 'pothole-registry-report.csv')}
          className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-subtle transition-all"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>EXPORT CSV</span>
        </button>
      </div>

      {/* Top 5 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <StatCard
          title="TOTAL POTHOLES"
          value={potholes.length || 342}
          subtitle="All recorded"
          variant="default"
          icon={Cone}
        />
        <StatCard
          title="CRITICAL"
          value={criticalCount || 27}
          subtitle="Immediate hazard"
          variant="danger"
          badgeText="SLA 12h"
          icon={AlertTriangle}
        />
        <StatCard
          title="HIGH SEVERITY"
          value={highCount || 83}
          subtitle="Depth > 10cm"
          variant="warning"
          icon={Cone}
        />
        <StatCard
          title="RESOLVED"
          value={resolvedCount || 214}
          subtitle="Repaired & verified"
          variant="success"
          trend="74.2%"
          trendType="up"
          icon={CheckCircle2}
        />
        <StatCard
          title="PENDING ACTION"
          value={pendingCount || 128}
          subtitle="In pipeline"
          variant="default"
          icon={Clock}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-card border border-slate-200 p-4 shadow-subtle">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 mb-3">
            Pothole Distribution by Chennai Zone
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={OVERALL_ANALYTICS.defectsByZone}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="zone" tick={{ fontSize: 10, fill: '#64748B' }} interval={0} angle={-15} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip />
                <Bar dataKey="potholes" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Potholes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-card border border-slate-200 p-4 shadow-subtle flex flex-col justify-between">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 mb-2">
            Severity Distribution
          </h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {severityPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> High</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Medium</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Low</span>
          </div>
        </div>
      </div>

      {/* Pothole Registry Table */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID (PH-1042), Location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
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

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">TICKET ID</th>
                <th className="py-2.5 px-3">LOCATION & CORRIDOR</th>
                <th className="py-2.5 px-3">SEVERITY</th>
                <th className="py-2.5 px-3">CONFIDENCE</th>
                <th className="py-2.5 px-3">BUS ID</th>
                <th className="py-2.5 px-3">DETECTED AT</th>
                <th className="py-2.5 px-3">DEPARTMENT</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPotholes.map(item => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedReport(item)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-3 font-mono font-bold text-blue-600">
                    {item.id}
                  </td>
                  <td className="py-3 px-3 max-w-[200px] truncate text-slate-900 font-medium">
                    {item.location}
                  </td>
                  <td className="py-3 px-3">
                    <SeverityBadge severity={item.severity} />
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[11px]">
                      {Math.round((item.confidence || 0.94) * 100)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-700">
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
