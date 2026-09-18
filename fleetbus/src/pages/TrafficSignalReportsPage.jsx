import React, { useState } from 'react';
import {
  Radio,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Search,
  ExternalLink
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { useUrbanPulse } from '../context/UrbanPulseContext';
import { exportToCSV } from '../utils/exportUtils';

export function TrafficSignalReportsPage() {
  const { trafficSignals, setSelectedReport } = useUrbanPulse();
  const [search, setSearch] = useState('');

  const filtered = trafficSignals.filter(t => {
    return t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase()) ||
      t.busId.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-600" />
            <span>Traffic Signal & Road Signage Reports</span>
          </h1>
          <p className="text-xs text-slate-500">
            AI optical signal health diagnostics and automated Greater Chennai Traffic Police (GCTP) alert routing
          </p>
        </div>

        <button
          onClick={() => exportToCSV(filtered, 'traffic-signals-report.csv')}
          className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-subtle transition-all"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>EXPORT CSV</span>
        </button>
      </div>

      {/* Top 4 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="DAMAGED SIGNALS"
          value="34"
          subtitle="Identified across city"
          variant="default"
          icon={Radio}
        />
        <StatCard
          title="CRITICAL OUTAGES"
          value="8"
          subtitle="Dark signals at junctions"
          variant="danger"
          badgeText="SLA 4h"
          icon={AlertTriangle}
        />
        <StatCard
          title="UNDER REVIEW"
          value="11"
          subtitle="Technician en-route"
          variant="warning"
          icon={Clock}
        />
        <StatCard
          title="RESOLVED SIGNALS"
          value="15"
          subtitle="Lamp / pole replaced"
          variant="success"
          icon={CheckCircle2}
        />
      </div>

      {/* Signals Registry Table */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Signal ID (TS-042), Junction..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">SIGNAL ID</th>
                <th className="py-2.5 px-3">LOCATION & JUNCTION</th>
                <th className="py-2.5 px-3">TYPE</th>
                <th className="py-2.5 px-3">DAMAGE DEFECT</th>
                <th className="py-2.5 px-3">CONFIDENCE</th>
                <th className="py-2.5 px-3">DETECTED BY</th>
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
                  <td className="py-3 px-3 font-mono font-bold text-red-600">
                    {item.id}
                  </td>
                  <td className="py-3 px-3 max-w-[200px] truncate text-slate-900 font-medium">
                    {item.location}
                  </td>
                  <td className="py-3 px-3 text-slate-600 text-[11px]">
                    {item.signalType || 'Traffic Light'}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] font-bold text-red-600">
                    {item.damageType || 'NON-FUNCTIONAL'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[11px]">
                      {Math.round((item.confidence || 0.88) * 100)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-blue-600">
                    {item.busId}
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
