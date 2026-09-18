import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Cone,
  Droplets,
  School,
  ShieldAlert,
  Download,
  Flame,
  Layers,
  Info
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { OVERALL_ANALYTICS } from '../data/analyticsData';
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

export function AnalyticsPage() {
  const [heatmapMetric, setHeatmapMetric] = useState('ALL'); // 'ALL', 'POTHOLES', 'WATERLOGGING', 'TRAFFIC'

  const corridors = [
    'OMR IT Corridor',
    'GST Expressway',
    'Velachery 100ft Road',
    'Kathipara Junction',
    'Anna Salai Commercial',
    'Koyambedu CMBT Grid',
    'Poonamallee High Rd',
    'T Nagar Retail Hub',
    'Adyar Bus Depot Grid',
    'Sholinganallur SEZ'
  ];

  const timeSlots = [
    '06:00 - 09:00 (AM Peak)',
    '09:00 - 12:00 (Mid-Morning)',
    '12:00 - 16:00 (Afternoon)',
    '16:00 - 20:00 (PM Peak)',
    '20:00 - 00:00 (Evening)',
    '00:00 - 06:00 (Night Fleet)'
  ];

  // 2D Density Heatmap Matrix Data (Defect Intensity Rating 1-100)
  const heatmapMatrix = [
    [92, 88, 64, 98, 76, 32], // OMR
    [86, 74, 58, 94, 70, 28], // GST
    [94, 82, 60, 96, 78, 35], // Velachery
    [89, 79, 52, 91, 68, 22], // Kathipara
    [78, 68, 48, 84, 62, 18], // Anna Salai
    [82, 71, 55, 88, 65, 25], // Koyambedu
    [75, 62, 44, 80, 58, 20], // Poonamallee
    [69, 58, 42, 76, 54, 15], // T Nagar
    [64, 52, 38, 72, 48, 12], // Adyar
    [95, 85, 62, 97, 82, 40]  // Sholinganallur
  ];

  const getHeatmapColorClass = (val) => {
    if (val >= 85) return 'bg-red-500 text-white font-black';
    if (val >= 70) return 'bg-orange-500 text-white font-bold';
    if (val >= 50) return 'bg-amber-400 text-slate-900 font-semibold';
    if (val >= 30) return 'bg-sky-200 text-slate-800 font-medium';
    return 'bg-blue-50 text-slate-600';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>City-Wide Urban Intelligence Analytics</span>
          </h1>
          <p className="text-xs text-slate-500">
            Long-term defect trends, agency SLA compliance, and public transit sensing yield
          </p>
        </div>

        <button
          onClick={() => exportToCSV(OVERALL_ANALYTICS.defectsByZone, 'chennai-analytics-report.csv')}
          className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-subtle transition-all"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>EXPORT ANALYTICS REPORT</span>
        </button>
      </div>

      {/* Top 6 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          title="TOTAL DETECTIONS"
          value="12,842"
          subtitle="All-time Edge yield"
          variant="default"
          icon={BarChart3}
        />
        <StatCard
          title="ROAD DEFECTS"
          value="4,321"
          subtitle="Potholes & cracks"
          variant="warning"
          icon={Cone}
        />
        <StatCard
          title="TRAFFIC EVENTS"
          value="5,127"
          subtitle="Density & signals"
          variant="default"
          icon={TrendingUp}
        />
        <StatCard
          title="INCIDENTS"
          value="842"
          subtitle="Collisions & rash"
          variant="danger"
          icon={ShieldAlert}
        />
        <StatCard
          title="WATERLOGGING"
          value="421"
          subtitle="Inundation cases"
          variant="default"
          icon={Droplets}
        />
        <StatCard
          title="SCHOOL VIOLATIONS"
          value="631"
          subtitle="Speed & crosswalks"
          variant="default"
          icon={School}
        />
      </div>

      {/* 2D Temporal Urban Density Heatmap Matrix */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-200">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                Corridor Defect & Congestion Intensity Heatmap Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Spatial-temporal distribution across 10 major transit corridors vs time of day
              </p>
            </div>
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
            <span>Low (0-30)</span>
            <div className="h-3 w-28 rounded bg-gradient-to-r from-blue-100 via-amber-400 via-orange-500 to-red-600" />
            <span>Severe (85+)</span>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3 text-left">Transit Corridor</th>
                {timeSlots.map(t => (
                  <th key={t} className="py-2.5 px-2 font-mono whitespace-nowrap">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {corridors.map((corridor, rIdx) => (
                <tr key={corridor} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-3 text-left font-bold text-slate-900 whitespace-nowrap text-xs">
                    {corridor}
                  </td>
                  {heatmapMatrix[rIdx].map((val, cIdx) => (
                    <td key={cIdx} className="p-1.5">
                      <div
                        className={`py-2 px-2 rounded-lg text-xs font-mono transition-transform hover:scale-105 shadow-xs flex flex-col items-center justify-center ${getHeatmapColorClass(val)}`}
                        title={`${corridor} @ ${timeSlots[cIdx]}: Intensity ${val}/100`}
                      >
                        <span>{val}</span>
                        <span className="text-[8px] opacity-80 uppercase">
                          {val >= 85 ? 'CRITICAL' : val >= 70 ? 'HIGH' : val >= 50 ? 'MODERATE' : 'LOW'}
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Weekly Detection vs Resolution Trend */}
        <div className="bg-white rounded-card border border-slate-200 p-4 shadow-subtle">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 mb-3">
            Weekly Defect Detection vs Agency Resolution Rate
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={OVERALL_ANALYTICS.resolutionTrendWeekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip />
                <Bar dataKey="detected" fill="#2563EB" name="Detected by Fleet" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" fill="#16A34A" name="Resolved by Depts" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Department SLA Performance */}
        <div className="bg-white rounded-card border border-slate-200 p-4 shadow-subtle">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 mb-3">
            Department Resolution Rate (%) & Average SLA (Hours)
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={OVERALL_ANALYTICS.departmentPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} domain={[0, 100]} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748B' }} width={110} />
                <Tooltip />
                <Bar dataKey="rate" fill="#0284C7" name="Resolution Rate (%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
