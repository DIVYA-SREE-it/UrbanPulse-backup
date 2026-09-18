import React from 'react';
import { GISMap } from '../components/map/GISMap';
import { MapFilterBar } from '../components/map/MapFilterBar';
import { CHENNAI_ZONES } from '../utils/geoUtils';
import { Navigation, ExternalLink } from 'lucide-react';

export function LiveCityPage() {
  const openChennaiGoogleMaps = () => {
    window.open('https://www.google.com/maps/@13.0827,80.2707,12z', '_blank');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Live City Monitoring GIS</span>
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 font-mono px-2 py-0.5 rounded">
              Google Maps Live Grid
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Continuous road condition and transit fleet telemetry across Chennai metropolitan corridors
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Corridor Jump Pills */}
          <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Corridors:</span>
            {CHENNAI_ZONES.map(z => (
              <button
                key={z.name}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors whitespace-nowrap shadow-xs"
              >
                {z.name}
              </button>
            ))}
          </div>

          <button
            onClick={openChennaiGoogleMaps}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open in Google Maps</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* Layer Filter Toolbar */}
      <MapFilterBar />

      {/* Large Full GIS Map with Google Maps Integration */}
      <div className="relative">
        <GISMap height="720px" />
      </div>
    </div>
  );
}
