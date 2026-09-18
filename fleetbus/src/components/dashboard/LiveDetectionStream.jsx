import React from 'react';
import { Activity, ArrowRight, ShieldAlert, Cone, Droplets, Radio, School } from 'lucide-react';
import { useUrbanPulse } from '../../context/UrbanPulseContext';
import { StatusBadge } from '../common/StatusBadge';

export function LiveDetectionStream() {
  const { detections, setSelectedReport, setActiveRoute } = useUrbanPulse();

  const getDefectIcon = (type) => {
    switch (type) {
      case 'pothole':
      case 'road_damage':
        return <Cone className="w-3.5 h-3.5 text-amber-600" />;
      case 'waterlogging':
        return <Droplets className="w-3.5 h-3.5 text-sky-600" />;
      case 'damaged_signal':
      case 'damaged_signboard':
        return <Radio className="w-3.5 h-3.5 text-red-600" />;
      case 'school_zone_violation':
        return <School className="w-3.5 h-3.5 text-purple-600" />;
      case 'hit_and_run':
      case 'rash_driving':
      case 'dangerous_overtaking':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  return (
    <div className="bg-white rounded-card border border-slate-200 p-4 shadow-subtle flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
            Live AI Detections
          </h3>
        </div>
        <button
          onClick={() => setActiveRoute('all-logs')}
          className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
        >
          View All Logs <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Stream Cards */}
      <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1">
        {detections.slice(0, 7).map(det => {
          const isHitAndRun = det.type === 'hit_and_run';

          return (
            <div
              key={det.id}
              onClick={() => setSelectedReport(det)}
              className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                isHitAndRun
                  ? 'bg-red-50/40 border-red-200 hover:border-red-400'
                  : 'bg-white border-slate-200 hover:bg-blue-50/40 hover:border-blue-300 hover:shadow-subtle'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                    {getDefectIcon(det.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-blue-600">
                        {det.id}
                      </span>
                      <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 line-clamp-1">
                        {det.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {det.location} • <strong className="font-mono text-slate-700">{det.busId}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                    {Number.isFinite(det.confidence) ? `${Math.round(det.confidence * 100)}%` : 'Rule-based'}
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {det.timeAgo || 'Recent'}
                  </p>
                </div>
              </div>

              {/* Status and Department footer */}
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 truncate max-w-[170px]">
                  Dept: <strong className="text-slate-700">{det.department}</strong>
                </span>
                <StatusBadge status={det.status} size="xs" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
