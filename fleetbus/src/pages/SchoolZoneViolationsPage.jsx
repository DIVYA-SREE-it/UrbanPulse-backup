import React, { useState } from 'react';
import {
  School,
  AlertTriangle,
  CheckCircle2,
  Download,
  Search,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { useUrbanPulse } from '../context/UrbanPulseContext';
import { exportToCSV } from '../utils/exportUtils';

export function SchoolZoneViolationsPage() {
  const { schoolViolations, setSelectedReport } = useUrbanPulse();
  const [search, setSearch] = useState('');

  const filtered = schoolViolations.filter(s => {
    return s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase()) ||
      s.numberPlate?.toLowerCase().includes(search.toLowerCase()) ||
      s.schoolName?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <School className="w-5 h-5 text-purple-600" />
            <span>School Zone Child Safety & Speed Violations</span>
          </h1>
          <p className="text-xs text-slate-500">
            Autonomous radar optical speed calculation, illegal obstruction detection, and automated ANPR e-challan dispatch
          </p>
        </div>

        <button
          onClick={() => exportToCSV(filtered, 'school-zone-violations-report.csv')}
          className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-subtle transition-all"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>EXPORT CSV</span>
        </button>
      </div>

      {/* Top 4 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="DETECTED TODAY"
          value="18"
          subtitle="During active school bell hours"
          variant="default"
          icon={School}
        />
        <StatCard
          title="HIGH RISK"
          value="5"
          subtitle="Speed > 50 km/h near gates"
          variant="danger"
          badgeText="CRITICAL"
          icon={AlertTriangle}
        />
        <StatCard
          title="REPORTED & NOTIFIED"
          value="12"
          subtitle="E-Challan queued to RTO"
          variant="warning"
          icon={ShieldAlert}
        />
        <StatCard
          title="RESOLVED CASES"
          value="7"
          subtitle="Fines paid & verified"
          variant="success"
          icon={CheckCircle2}
        />
      </div>

      {/* Violations Table */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Plate (TN-07), School..."
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
                <th className="py-2.5 px-3">TIME</th>
                <th className="py-2.5 px-3">SCHOOL & LOCATION</th>
                <th className="py-2.5 px-3">VIOLATION TYPE</th>
                <th className="py-2.5 px-3">SUSPECT VEHICLE</th>
                <th className="py-2.5 px-3">NUMBER PLATE</th>
                <th className="py-2.5 px-3">CONFIDENCE</th>
                <th className="py-2.5 px-3">BUS ID</th>
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
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                    {item.timestamp?.split(' ')[1] || item.timeAgo}
                  </td>
                  <td className="py-3 px-3 max-w-[180px] truncate">
                    <span className="font-semibold text-slate-900 block">{item.schoolName || item.location}</span>
                    <span className="text-[10px] text-slate-400">{item.location}</span>
                  </td>
                  <td className="py-3 px-3 font-medium text-purple-900 text-xs">
                    {item.violationType}
                  </td>
                  <td className="py-3 px-3 text-slate-800 text-[11px]">
                    {item.vehicleType}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono font-bold text-slate-900 bg-yellow-300 px-2 py-0.5 rounded text-[11px] border border-yellow-500 shadow-xs">
                      {item.numberPlate}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[11px]">
                      {Math.round((item.confidence || 0.93) * 100)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-blue-600">
                    {item.busId}
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
