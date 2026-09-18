import React, { useState, useEffect } from 'react';
import { Search, X, MapPin, Bus, FileText, ArrowRight } from 'lucide-react';
import { useUrbanPulse } from '../../context/UrbanPulseContext';
import { StatusBadge } from './StatusBadge';

export function GlobalSearchModal() {
  const { isSearchOpen, setIsSearchOpen, detections, buses, setSelectedReport, setSelectedBus, setActiveRoute } = useUrbanPulse();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  if (!isSearchOpen) return null;

  const trimmed = query.trim().toLowerCase();

  const matchedDetections = query ? detections.filter(d => 
    d.id.toLowerCase().includes(trimmed) ||
    d.title.toLowerCase().includes(trimmed) ||
    d.location.toLowerCase().includes(trimmed) ||
    d.busId.toLowerCase().includes(trimmed) ||
    d.department?.toLowerCase().includes(trimmed) ||
    d.numberPlate?.toLowerCase().includes(trimmed) ||
    d.vehicleDetails?.numberPlate?.toLowerCase().includes(trimmed)
  ).slice(0, 6) : [];

  const matchedBuses = query ? buses.filter(b =>
    b.id.toLowerCase().includes(trimmed) ||
    b.regNo.toLowerCase().includes(trimmed) ||
    b.route.toLowerCase().includes(trimmed) ||
    b.currentLocation.toLowerCase().includes(trimmed) ||
    b.driverName.toLowerCase().includes(trimmed)
  ).slice(0, 4) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-card shadow-modal border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Bus ID (BUS-104), Ticket (PH-1042), Number Plate (TN-09), Location..."
            className="w-full bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-400 font-medium"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-slate-200 rounded text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded font-semibold"
          >
            ESC
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!query && (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <Search className="w-8 h-8 mx-auto opacity-40 text-blue-600" />
              <p className="text-xs font-semibold text-slate-600">Search across 127 fleet buses, 580+ AI detections, GIS coordinates & police cases</p>
              <div className="flex justify-center gap-2 pt-2">
                {['BUS-104', 'PH-1042', 'OMR', 'TN-09-CB-4491', 'GCC SWD'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-md border border-slate-200 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && matchedDetections.length === 0 && matchedBuses.length === 0 && (
            <div className="py-8 text-center text-slate-400">
              <p className="text-sm font-semibold text-slate-700">No results found for "{query}"</p>
              <p className="text-xs mt-1">Try searching by location like "OMR" or report ID like "PH-1042"</p>
            </div>
          )}

          {/* Detections Results */}
          {matchedDetections.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Detection Tickets & Incidents ({matchedDetections.length})
              </h4>
              <div className="space-y-1.5">
                {matchedDetections.map(det => (
                  <div
                    key={det.id}
                    onClick={() => {
                      setSelectedReport(det);
                      setIsSearchOpen(false);
                    }}
                    className="p-3 rounded-lg border border-slate-200 bg-white hover:bg-blue-50/50 hover:border-blue-300 cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          {det.id}
                        </span>
                        <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600">
                          {det.title}
                        </span>
                        <StatusBadge status={det.status} size="xs" />
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {det.location} • Bus: {det.busId} • Dept: {det.department}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buses Results */}
          {matchedBuses.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Bus className="w-3.5 h-3.5 text-blue-600" />
                Fleet Buses ({matchedBuses.length})
              </h4>
              <div className="space-y-1.5">
                {matchedBuses.map(bus => (
                  <div
                    key={bus.id}
                    onClick={() => {
                      setSelectedBus(bus);
                      setActiveRoute('fleet');
                      setIsSearchOpen(false);
                    }}
                    className="p-3 rounded-lg border border-slate-200 bg-white hover:bg-blue-50/50 hover:border-blue-300 cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          {bus.id}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {bus.regNo} ({bus.route})
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                          {bus.speed} km/h
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {bus.currentLocation} • Driver: {bus.driverName} • AI: {bus.edgeStatus}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
