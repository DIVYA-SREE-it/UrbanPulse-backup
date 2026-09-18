import React, { useState } from 'react';
import { Wrench, CheckCircle2, Clock, Building2, Download, Search, ExternalLink } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge, SeverityBadge } from '../components/common/StatusBadge';
import { useUrbanPulse } from '../context/UrbanPulseContext';
import { exportToCSV } from '../utils/exportUtils';

export function MaintenanceTrackingPage() {
  const { detections, setSelectedReport } = useUrbanPulse();
  const [search, setSearch] = useState('');

  const workOrders = detections.filter(d => ['pothole', 'road_damage', 'damaged_signal', 'waterlogging'].includes(d.type));

  const filteredOrders = workOrders.filter(o =>
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.location.toLowerCase().includes(search.toLowerCase()) ||
    o.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            <span>Civic Maintenance Tracking & Contractor Work Orders</span>
          </h1>
          <p className="text-xs text-slate-500">
            Field repair squad tracking, asphalt compaction verification, and closed-loop municipal audit
          </p>
        </div>

        <button
          onClick={() => exportToCSV(filteredOrders, 'maintenance-work-orders.csv')}
          className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-subtle transition-all"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>EXPORT WORK ORDERS</span>
        </button>
      </div>

      {/* Top 4 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="ACTIVE WORK ORDERS"
          value={filteredOrders.length}
          subtitle="Civil infrastructure repairs"
          variant="default"
          icon={Wrench}
        />
        <StatCard
          title="FIELD SQUADS DEPLOYED"
          value="18 Teams"
          subtitle="GCC & Highways squads"
          variant="default"
          icon={Building2}
        />
        <StatCard
          title="AVERAGE REPAIR SLA"
          value="18.2 Hours"
          subtitle="From detection to asphalt roll"
          variant="warning"
          icon={Clock}
        />
        <StatCard
          title="VERIFIED RESOLUTIONS"
          value="84.2%"
          subtitle="Confirmed on next bus pass"
          variant="success"
          trend="+5.4%"
          trendType="up"
          icon={CheckCircle2}
        />
      </div>

      {/* Work Orders Table */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Work Order ID, Location..."
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
                <th className="py-2.5 px-3">WORK ORDER ID</th>
                <th className="py-2.5 px-3">CORRIDOR LOCATION</th>
                <th className="py-2.5 px-3">ESTIMATED COST</th>
                <th className="py-2.5 px-3">RESPONSIBLE SQUAD</th>
                <th className="py-2.5 px-3">PRIORITY</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredOrders.map(item => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedReport(item)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-3 font-mono font-bold text-blue-600">
                    {item.id}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-900 max-w-[200px] truncate">
                    {item.location}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    {item.estimatedRepairCost || '₹ 12,500'}
                  </td>
                  <td className="py-3 px-3 text-slate-600 text-[11px]">
                    {item.assignedOfficer || item.department}
                  </td>
                  <td className="py-3 px-3">
                    <SeverityBadge severity={item.severity} />
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
