import React from 'react';
import { Layers, Bus, Cone, Droplets, Radio, School, ShieldAlert, Activity } from 'lucide-react';
import { useUrbanPulse } from '../../context/UrbanPulseContext';

export function MapFilterBar() {
  const { activeFilter, setActiveFilter, detections, buses } = useUrbanPulse();

  const filters = [
    { id: 'ALL', label: 'All Layers', icon: Layers, count: detections.length + buses.length },
    { id: 'BUSES', label: 'Buses', icon: Bus, count: buses.length, color: 'text-blue-600' },
    { id: 'POTHOLES', label: 'Potholes', icon: Cone, count: detections.filter(d => d.type === 'pothole' || d.type === 'road_damage').length, color: 'text-amber-600' },
    { id: 'WATERLOGGING', label: 'Waterlogging', icon: Droplets, count: detections.filter(d => d.type === 'waterlogging').length, color: 'text-sky-600' },
    { id: 'TRAFFIC_SIGNALS', label: 'Traffic Signals', icon: Radio, count: detections.filter(d => d.type === 'damaged_signal' || d.type === 'damaged_signboard' || d.type === 'missing_zebra_crossing').length, color: 'text-red-600' },
    { id: 'SCHOOL_VIOLATIONS', label: 'School Violations', icon: School, count: detections.filter(d => d.type === 'school_zone_violation').length, color: 'text-purple-600' },
    { id: 'INCIDENTS', label: 'Incidents', icon: ShieldAlert, count: detections.filter(d => ['hit_and_run', 'rash_driving', 'dangerous_overtaking', 'pedestrian_risk'].includes(d.type)).length, color: 'text-red-600' },
    { id: 'CONGESTION', label: 'Congestion Events', icon: Activity, count: detections.filter(d => d.type === 'traffic_congestion').length, color: 'text-amber-600' }
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
      {filters.map(item => {
        const Icon = item.icon;
        const isActive = activeFilter === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveFilter(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
              isActive
                ? 'bg-blue-50 text-blue-600 border-blue-600 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : item.color || 'text-slate-400'}`} />
            <span>{item.label}</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
              isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
