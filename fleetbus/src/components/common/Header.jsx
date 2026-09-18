import React from 'react';
import {
  Search,
  Bell,
  Calendar,
  Camera,
  Activity,
  Play,
  Pause
} from 'lucide-react';
import { useUrbanPulse } from '../../context/UrbanPulseContext';

export function Header() {
  const {
    centralConnection,
    activeRoute,
    setActiveRoute,
    unreadNotifCount,
    setIsSearchOpen,
    setIsNotificationOpen,
    simulationRunning,
    setSimulationRunning
  } = useUrbanPulse();

  const getBreadcrumb = () => {
    switch (activeRoute) {
      case 'dashboard':
        return 'Overview / Dashboard';
      case 'live-city':
        return 'Overview / Live City Map';
      case 'fleet':
        return 'Overview / Fleet Monitoring';
      case 'road-intel':
        return 'Intelligence / Road Intelligence';
      case 'traffic-intel':
        return 'Intelligence / Traffic Intelligence';
      case 'incident-center':
        return 'Intelligence / Incident Center';
      case 'potholes':
        return 'Reports / Pothole Reports';
      case 'waterlogging':
        return 'Reports / Waterlogging Reports';
      case 'traffic-signals':
        return 'Reports / Traffic Signal Reports';
      case 'school-violations':
        return 'Reports / School Zone Violations';
      case 'all-logs':
        return 'Reports / All Detection Logs';
      case 'department-response':
        return 'Operations / Department Response';
      case 'maintenance-tracking':
        return 'Operations / Maintenance Tracking';
      case 'analytics':
        return 'Operations / Analytics';
      case 'live-camera':
        return 'System / Live Camera (YOLO)';
      case 'edge-network':
        return 'System / Edge AI Network';
      case 'camera-monitoring':
        return 'System / Camera Monitoring';
      case 'settings':
        return 'System / System Settings';
      default:
        return 'Overview / Dashboard';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-subtle">
      {/* Left Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
          <span className="text-slate-900 font-bold">{getBreadcrumb()}</span>
        </div>

        {/* Live Simulation Indicator */}
        <div
          onClick={() => setSimulationRunning(!simulationRunning)}
          className="cursor-pointer group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 transition-all hover:bg-slate-100 hover:border-slate-300"
          title="Click to pause/resume real-time simulator"
        >
          <span className={`w-2 h-2 rounded-full ${simulationRunning ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
          <span>{simulationRunning ? 'SIMULATION ON' : 'SIMULATION PAUSED'}</span>
          {simulationRunning ? (
            <Pause className="w-3 h-3 ml-0.5 text-slate-400 group-hover:text-slate-600" />
          ) : (
            <Play className="w-3 h-3 ml-0.5 text-slate-400 group-hover:text-slate-600" />
          )}
        </div>
      </div>

      <span className="text-xs text-slate-500 hidden xl:block">Central events: {centralConnection}</span>
      {/* Right Action Tools */}
      <div className="flex items-center gap-3">
        {/* Quick Live Camera Demo Button */}
        <button
          onClick={() => setActiveRoute('live-camera')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Live Camera</span>
        </button>

        {/* Global Search Bar */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 hover:border-blue-500 hover:bg-white transition-all w-48 justify-between"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search city assets...</span>
          </div>
          <kbd className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-400 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Date Stamp */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-xs font-medium text-slate-600 border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{new Date().toLocaleDateString()}</span>
        </div>

        {/* Notifications Bell */}
        <button
          onClick={() => setIsNotificationOpen(true)}
          className="relative p-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-500 hover:bg-white text-slate-600 hover:text-slate-900 transition-all"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold px-1">
              {unreadNotifCount}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            TA
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-tight">Transport Authority</p>
            <p className="text-[10px] text-slate-500 leading-tight">Operations Center</p>
          </div>
        </div>
      </div>
    </header>
  );
}
