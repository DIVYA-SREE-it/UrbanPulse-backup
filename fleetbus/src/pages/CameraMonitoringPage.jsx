import React from 'react';
import { Video, Camera, CheckCircle2, AlertTriangle } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { useUrbanPulse } from '../context/UrbanPulseContext';

export function CameraMonitoringPage() {
  const { buses, setActiveRoute, setSelectedBus } = useUrbanPulse();

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-600" />
            <span>5-Camera Fleet Matrix Health & Sensor Diagnostics</span>
          </h1>
          <p className="text-xs text-slate-500">
            Real-time status of 635 IP cameras deployed across Chennai MTC public bus fleet
          </p>
        </div>
      </div>

      {/* Top 4 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="TOTAL CAMERAS"
          value="635"
          subtitle="127 Buses × 5 Sensors"
          variant="default"
          icon={Camera}
        />
        <StatCard
          title="CAMERAS ONLINE"
          value="628"
          subtitle="98.9% Health"
          variant="success"
          trend="98.9%"
          trendType="up"
          icon={CheckCircle2}
        />
        <StatCard
          title="OPTICAL LENS BLUR"
          value="4"
          subtitle="Rain / mud smear"
          variant="warning"
          icon={AlertTriangle}
        />
        <StatCard
          title="OFFLINE SENSORS"
          value="3"
          subtitle="Scheduled depot inspection"
          variant="danger"
          icon={AlertTriangle}
        />
      </div>

      {/* Camera Matrix per Bus */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
          Fleet Bus 5-Camera Array Diagnostic Grid
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buses.slice(0, 9).map(bus => (
            <div
              key={bus.id}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-subtle transition-all space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                    {bus.id}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{bus.regNo}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  5/5 ONLINE
                </span>
              </div>

              {/* 5 Cameras Grid */}
              <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
                {[
                  { name: 'FRONT', res: '1080p' },
                  { name: 'REAR', res: '1080p' },
                  { name: 'LEFT', res: '720p' },
                  { name: 'RIGHT', res: '720p' },
                  { name: 'CABIN', res: '1080p' }
                ].map(c => (
                  <div key={c.name} className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                    <span className="font-bold text-slate-800 block text-[9px]">{c.name}</span>
                    <span className="text-[8px] text-emerald-600 font-bold block">ONLINE</span>
                    <span className="text-[7px] text-slate-400 font-mono block">{c.res}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setSelectedBus(bus);
                  setActiveRoute('live-camera');
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-blue-200"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Launch Stream</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
