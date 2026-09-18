import React from 'react';
import {
  LayoutDashboard,
  Map,
  Bus,
  Cone,
  Activity,
  ShieldAlert,
  FileText,
  Droplets,
  Radio,
  School,
  ListFilter,
  Building2,
  Wrench,
  BarChart3,
  Cpu,
  Video,
  Camera,
  Settings
} from 'lucide-react';
import { useUrbanPulse } from '../../context/UrbanPulseContext';

export function Sidebar() {
  const { activeRoute, setActiveRoute, buses } = useUrbanPulse();

  const navGroups = [
    {
      label: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'live-city', label: 'Live City Map', icon: Map },
        { id: 'fleet', label: 'Fleet Monitoring', icon: Bus }
      ]
    },
    {
      label: 'INTELLIGENCE',
      items: [
        { id: 'road-intel', label: 'Road Intelligence', icon: Cone },
        { id: 'traffic-intel', label: 'Traffic Intelligence', icon: Activity },
        { id: 'incident-center', label: 'Incident Center', icon: ShieldAlert, badge: 'ALERT' }
      ]
    },
    {
      label: 'REPORTS',
      items: [
        { id: 'potholes', label: 'Pothole Reports', icon: FileText },
        { id: 'waterlogging', label: 'Waterlogging Reports', icon: Droplets },
        { id: 'traffic-signals', label: 'Traffic Signal Reports', icon: Radio },
        { id: 'school-violations', label: 'School Zone Violations', icon: School },
        { id: 'all-logs', label: 'All Detection Logs', icon: ListFilter }
      ]
    },
    {
      label: 'OPERATIONS',
      items: [
        { id: 'department-response', label: 'Department Response', icon: Building2 },
        { id: 'maintenance-tracking', label: 'Maintenance Tracking', icon: Wrench },
        { id: 'analytics', label: 'City Analytics', icon: BarChart3 }
      ]
    },
    {
      label: 'SYSTEM',
      items: [
        { id: 'live-camera', label: 'Live Camera (YOLO)', icon: Camera, highlight: true },
        { id: 'edge-network', label: 'Edge AI Network', icon: Cpu },
        { id: 'camera-monitoring', label: 'Camera Monitoring', icon: Video },
        { id: 'settings', label: 'System Settings', icon: Settings }
      ]
    }
  ];

  return (
    <aside className="w-60 bg-white text-slate-800 flex flex-col h-screen shrink-0 select-none border-r border-slate-200 shadow-subtle z-20">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
            UP
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold tracking-tight text-slate-900 text-base leading-tight">
                URBANPULSE
              </h1>
              <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                AI
              </span>
            </div>
            <p className="text-[10px] tracking-wider uppercase font-bold text-slate-500 mt-0.5">
              Urban Intelligence Platform
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {navGroups.map(group => (
          <div key={group.label} className="space-y-1">
            <h3 className="text-[11px] font-bold tracking-[0.08em] text-slate-500 uppercase px-3 mb-1.5">
              {group.label}
            </h3>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveRoute(item.id)}
                    className={`relative w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {/* 3px Active Indicator on Left */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r" />
                    )}

                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? 'text-blue-600' : 'text-slate-500'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-600 text-white">
                        {item.badge}
                      </span>
                    )}
                    {item.highlight && !isActive && (
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Status & Authority */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50/60 space-y-3">
        <div className="space-y-1.5 text-[11px]">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block">
            Fleet Status
          </span>
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              FLEET ACTIVE
            </span>
            <span className="text-slate-900 font-bold">{buses.length || 127} Buses</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              EDGE AI
            </span>
            <span className="text-emerald-700 font-bold">OPERATIONAL</span>
          </div>
        </div>

        <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              TA
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">Transport Authority</p>
              <p className="text-[10px] text-slate-500 leading-tight">Operations Command</p>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500" title="Connected to Central GIS" />
        </div>
      </div>
    </aside>
  );
}
