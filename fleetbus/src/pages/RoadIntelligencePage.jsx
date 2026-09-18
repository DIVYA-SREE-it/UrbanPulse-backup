import React from 'react';
import { Cone, AlertTriangle, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
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
import { OVERALL_ANALYTICS } from '../data/analyticsData';

export function RoadIntelligencePage() {
  const { potholes, setSelectedReport } = useUrbanPulse();

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Cone className="w-5 h-5 text-amber-600" />
            <span>Road Condition & Surface Intelligence</span>
          </h1>
          <p className="text-xs text-slate-500">
            Continuous pavement roughness sensing, crater volume measurement, and divider integrity tracking
          </p>
        </div>

        <button
          onClick={() => exportToCSV(potholes, 'chennai-road-defects.csv')}
          className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-subtle transition-all"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>EXPORT ROAD CSV</span>
        </button>
      </div>

      {/* Top 4 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="PAVEMENT HEALTH INDEX"
          value="74.2 / 100"
          subtitle="Chennai Average"
          variant="default"
          icon={ShieldCheck}
        />
        <StatCard
          title="ACTIVE CRATERS"
          value={potholes.length}
          subtitle="Identified across corridors"
          variant="warning"
          icon={Cone}
        />
        <StatCard
          title="MISSING DIVIDERS / SIGNS"
          value="19"
          subtitle="Pedestrian & lane hazards"
          variant="danger"
          icon={AlertTriangle}
        />
        <StatCard
          title="RESTORED THIS MONTH"
          value="4,820 m²"
          subtitle="GCC Roads repair teams"
          variant="success"
          icon={CheckCircle2}
        />
      </div>

      {/* Defect Distribution Bar Chart */}
      <div className="bg-white rounded-card border border-slate-200 p-4 shadow-subtle">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 mb-3">
          Road Surface Defect Volume by Zone
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={OVERALL_ANALYTICS.defectsByZone}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="zone" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
              <Tooltip />
              <Bar dataKey="potholes" fill="#F59E0B" name="Potholes" radius={[4, 4, 0, 0]} />
              <Bar dataKey="waterlogging" fill="#0284C7" name="Waterlogging" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Surface Defects List */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
          Active Surface Anomalies & Work Orders
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">DEFECT ID</th>
                <th className="py-2.5 px-3">CORRIDOR & LOCATION</th>
                <th className="py-2.5 px-3">ESTIMATED DIMENSIONS</th>
                <th className="py-2.5 px-3">CONFIDENCE</th>
                <th className="py-2.5 px-3">BUS SENSOR</th>
                <th className="py-2.5 px-3">ASSIGNED AUTHORITY</th>
                <th className="py-2.5 px-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {potholes.map(item => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedReport(item)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-3 font-mono font-bold text-blue-600">
                    {item.id}
                  </td>
                  <td className="py-3 px-3 text-slate-900 font-medium">
                    {item.location}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                    {item.depthCm ? `Depth: ${item.depthCm}cm | Width: ${item.widthCm}cm` : 'Surface Fracture'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[11px]">
                      {Math.round((item.confidence || 0.94) * 100)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-blue-600 font-bold">
                    {item.busId}
                  </td>
                  <td className="py-3 px-3 text-slate-600 text-[11px]">
                    {item.department}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={item.status} size="xs" />
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
