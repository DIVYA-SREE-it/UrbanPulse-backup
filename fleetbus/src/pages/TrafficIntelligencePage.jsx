import React from 'react';
import { Activity, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { CONGESTION_ZONES } from '../data/edgeNodesData';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { OVERALL_ANALYTICS } from '../data/analyticsData';

export function TrafficIntelligencePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span>Traffic Flow & Congestion Intelligence</span>
          </h1>
          <p className="text-xs text-slate-500">
            Fleet-aggregated vehicle density calculation, bottleneck detection, and corridor travel time estimation
          </p>
        </div>
      </div>

      {/* Top 4 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="BOTTLENECK ZONES"
          value="5 Zones"
          subtitle="OMR, Kathipara, Velachery"
          variant="warning"
          badgeText="SLOW"
          icon={AlertTriangle}
        />
        <StatCard
          title="FLEET AVERAGE SPEED"
          value="26.4 km/h"
          subtitle="Real-time transit velocity"
          icon={TrendingUp}
        />
        <StatCard
          title="CORRIDOR DELAY SURGE"
          value="+18.5 min"
          subtitle="Peak rush hour index"
          variant="warning"
          icon={Clock}
        />
        <StatCard
          title="SIGNAL SYNC STATUS"
          value="148 / 160"
          subtitle="GCTP ITMS Linked"
          variant="success"
          icon={Activity}
        />
      </div>

      {/* Hourly Detection and Traffic Congestion Chart */}
      <div className="bg-white rounded-card border border-slate-200 p-4 shadow-subtle">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 mb-3">
          Hourly Traffic Congestion & Defect Detection Pulse (06:00 - 19:00)
        </h3>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={OVERALL_ANALYTICS.detectionTrendsHourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
              <Tooltip />
              <Line type="monotone" dataKey="potholes" stroke="#F59E0B" strokeWidth={2} name="Pothole Detections" dot={false} />
              <Line type="monotone" dataKey="violations" stroke="#8B5CF6" strokeWidth={2} name="School/Speed Violations" dot={false} />
              <Line type="monotone" dataKey="waterlogging" stroke="#0284C7" strokeWidth={2} name="Waterlogging Alerts" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Congestion Hotspot Cards */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
          Real-time Corridor Bottlenecks Monitored by Bus Fleet
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {CONGESTION_ZONES.map(zone => (
            <div
              key={zone.id}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-subtle transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {zone.id}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  zone.density === 'VERY HIGH'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {zone.density} CONGESTION
                </span>
              </div>

              <h4 className="font-bold text-xs text-slate-900">{zone.zone}</h4>
              <p className="text-[11px] text-slate-500">{zone.bottleneckCause}</p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Corridor Speed:</span>
                <span className="font-mono font-bold text-blue-600">{zone.avgSpeedKmh} km/h</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
