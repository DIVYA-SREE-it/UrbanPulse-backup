import React, { useState } from 'react';
import {
  ListFilter,
  Download,
  Search,
  ExternalLink
} from 'lucide-react';
import { StatusBadge, SeverityBadge } from '../components/common/StatusBadge';
import { useUrbanPulse } from '../context/UrbanPulseContext';
import { exportToCSV } from '../utils/exportUtils';

export function AllDetectionLogsPage() {
  const { detections, setSelectedReport } = useUrbanPulse();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filteredLogs = detections.filter(d => {
    const matchSearch = d.id.toLowerCase().includes(search.toLowerCase()) ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.location.toLowerCase().includes(search.toLowerCase()) ||
      d.busId.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'ALL' || d.type === filterType;
    const matchSeverity = filterSeverity === 'ALL' || d.severity === filterSeverity;
    const matchDept = filterDept === 'ALL' || d.department?.toLowerCase().includes(filterDept.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || d.status === filterStatus;

    return matchSearch && matchType && matchSeverity && matchDept && matchStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <ListFilter className="w-5 h-5 text-blue-600" />
            <span>All Edge AI Detection Logs & Audit Archive</span>
          </h1>
          <p className="text-xs text-slate-500">
            Master multi-sensor detection log aggregated from 127 fleet buses in real-time
          </p>
        </div>

        <button
          onClick={() => exportToCSV(filteredLogs, 'urbanpulse-master-detection-log.csv')}
          className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-subtle transition-all"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>EXPORT AUDIT CSV</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-card border border-slate-200 p-4 shadow-subtle space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Ticket, Location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
            >
              <option value="ALL">All Detection Types</option>
              <option value="pothole">Potholes</option>
              <option value="waterlogging">Waterlogging</option>
              <option value="damaged_signal">Traffic Signals</option>
              <option value="school_zone_violation">School Violations</option>
              <option value="hit_and_run">Hit-and-Run</option>
              <option value="rash_driving">Rash Driving</option>
            </select>
          </div>

          <div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
            </select>
          </div>

          <div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
            >
              <option value="ALL">All Responsible Depts</option>
              <option value="Corporation">Greater Chennai Corporation</option>
              <option value="Police">Traffic Police</option>
              <option value="Highways">TN Highways</option>
              <option value="Water">Metro Water</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
            >
              <option value="ALL">All Workflow Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="VERIFIED CLOSED">Verified Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Master Log Table */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">
            Showing <strong className="text-slate-900">{filteredLogs.length}</strong> detections
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">TICKET ID</th>
                <th className="py-2.5 px-3">DETECTION TYPE</th>
                <th className="py-2.5 px-3">LOCATION & GPS</th>
                <th className="py-2.5 px-3">BUS & CAM</th>
                <th className="py-2.5 px-3">CONFIDENCE</th>
                <th className="py-2.5 px-3">SEVERITY</th>
                <th className="py-2.5 px-3">DEPARTMENT</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.map(item => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedReport(item)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {item.timestamp?.split(' ')[1] || item.timeAgo}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-blue-600">
                    {item.id}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900 uppercase text-[11px]">
                      {item.type?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-3 max-w-[170px] truncate text-slate-800">
                    {item.location}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-blue-600 font-bold">
                    {item.busId} • {item.cameraId || 'FRONT-01'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[11px]">
                      {Number.isFinite(item.confidence) ? `${Math.round(item.confidence * 100)}%` : 'Rule-based'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <SeverityBadge severity={item.severity} />
                  </td>
                  <td className="py-3 px-3 text-slate-600 text-[11px] max-w-[140px] truncate">
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
