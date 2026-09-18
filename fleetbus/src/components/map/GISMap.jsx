import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { CHENNAI_CENTER, CHENNAI_DEFAULT_ZOOM } from '../../utils/geoUtils';
import { createBusIcon, createDefectIcon } from './CustomMarkerIcons';
import { CONGESTION_ZONES } from '../../data/edgeNodesData';
import { useUrbanPulse } from '../../context/UrbanPulseContext';
import { StatusBadge, SeverityBadge } from '../common/StatusBadge';
import {
  ExternalLink,
  Bus,
  MapPin,
  ArrowRight,
  Layers,
  Navigation,
  Flame,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';

export function GISMap({ height = '520px' }) {
  const {
    buses,
    detections,
    activeFilter,
    setSelectedReport,
    setSelectedBus,
    setActiveRoute
  } = useUrbanPulse();

  // Google Maps Layer State
  const [mapLayer, setMapLayer] = useState('google_roads');
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Heatmap View State
  const [isHeatmapMode, setIsHeatmapMode] = useState(false);
  const [heatmapType, setHeatmapType] = useState('ALL'); // 'ALL', 'POTHOLES', 'WATERLOGGING', 'CONGESTION', 'INCIDENTS'
  const [heatRadius, setHeatRadius] = useState(750); // meters
  const [showHeatmapControls, setShowHeatmapControls] = useState(false);

  const MAP_LAYERS = {
    google_roads: {
      name: 'Google Maps (Standard Roads)',
      url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      attribution: '&copy; <a href="https://maps.google.com">Google Maps</a> contributors',
      icon: '🗺️'
    },
    google_traffic: {
      name: 'Google Maps (Live Traffic Flow)',
      url: 'https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
      attribution: '&copy; <a href="https://maps.google.com">Google Maps Traffic</a>',
      icon: '🚦'
    },
    google_hybrid: {
      name: 'Google Satellite (Hybrid Imagery)',
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attribution: '&copy; <a href="https://maps.google.com">Google Satellite</a> Imagery',
      icon: '🛰️'
    },
    google_terrain: {
      name: 'Google Maps (Terrain / Topo)',
      url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
      attribution: '&copy; <a href="https://maps.google.com">Google Terrain</a>',
      icon: '⛰️'
    },
    carto: {
      name: 'CartoDB Light Minimal',
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; CARTO &copy; OpenStreetMap',
      icon: '📐'
    }
  };

  const currentLayer = MAP_LAYERS[mapLayer] || MAP_LAYERS.google_roads;

  const showBuses = activeFilter === 'ALL' || activeFilter === 'BUSES';
  const showPotholes = activeFilter === 'ALL' || activeFilter === 'POTHOLES';
  const showWaterlogging = activeFilter === 'ALL' || activeFilter === 'WATERLOGGING';
  const showTrafficSignals = activeFilter === 'ALL' || activeFilter === 'TRAFFIC_SIGNALS';
  const showSchoolViolations = activeFilter === 'ALL' || activeFilter === 'SCHOOL_VIOLATIONS';
  const showIncidents = activeFilter === 'ALL' || activeFilter === 'INCIDENTS';
  const showCongestion = activeFilter === 'ALL' || activeFilter === 'CONGESTION';

  const visibleDetections = detections.filter(d => {
    if (!Number.isFinite(d.lat) || !Number.isFinite(d.lng)) return false;
    if (showCongestion && d.type === 'traffic_congestion') return true;
    if (activeFilter === 'ALL') return true;
    if (showPotholes && (d.type === 'pothole' || d.type === 'road_damage')) return true;
    if (showWaterlogging && d.type === 'waterlogging') return true;
    if (showTrafficSignals && (d.type === 'damaged_signal' || d.type === 'damaged_signboard' || d.type === 'missing_zebra_crossing')) return true;
    if (showSchoolViolations && d.type === 'school_zone_violation') return true;
    if (showIncidents && ['hit_and_run', 'rash_driving', 'dangerous_overtaking', 'pedestrian_risk', 'red_light_violation', 'wrong_way_driving'].includes(d.type)) return true;
    return false;
  });

  // Filter items for Heatmap Layer
  const heatmapPoints = detections.filter(d => {
    if (heatmapType === 'ALL') return true;
    if (heatmapType === 'POTHOLES' && (d.type === 'pothole' || d.type === 'road_damage')) return true;
    if (heatmapType === 'WATERLOGGING' && d.type === 'waterlogging') return true;
    if (heatmapType === 'INCIDENTS' && ['hit_and_run', 'rash_driving', 'dangerous_overtaking', 'school_zone_violation'].includes(d.type)) return true;
    return false;
  });

  const openInGoogleMaps = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const getHeatmapColor = (item) => {
    if (item.severity === 'EMERGENCY' || item.severity === 'CRITICAL') {
      return { core: '#DC2626', outer: '#EA580C', opacity: 0.45 };
    }
    if (item.severity === 'HIGH') {
      return { core: '#EA580C', outer: '#F59E0B', opacity: 0.38 };
    }
    if (item.type === 'waterlogging') {
      return { core: '#0284C7', outer: '#38BDF8', opacity: 0.40 };
    }
    return { core: '#F59E0B', outer: '#FBBF24', opacity: 0.32 };
  };

  return (
    <div style={{ height }} className="relative w-full rounded-card overflow-hidden border border-slate-200 shadow-subtle z-0 bg-white">
      {/* Top Map Action Toolbar */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        {/* Heatmap Mode Toggle Button */}
        <button
          onClick={() => {
            setIsHeatmapMode(!isHeatmapMode);
            if (!isHeatmapMode) setShowHeatmapControls(true);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md border font-bold text-xs shadow-card transition-all ${
            isHeatmapMode
              ? 'bg-red-600 text-white border-red-700 shadow-red-500/20'
              : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-slate-50'
          }`}
          title="Toggle Urban Density Heat Map"
        >
          <Flame className={`w-4 h-4 ${isHeatmapMode ? 'text-yellow-300 animate-pulse' : 'text-red-500'}`} />
          <span>{isHeatmapMode ? 'HEATMAP ACTIVE' : 'HEATMAP VIEW'}</span>
        </button>

        {/* Google Maps Layer Dropdown Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/95 backdrop-blur-md text-blue-700 hover:bg-white transition-colors border border-slate-200 shadow-card font-bold text-xs"
          >
            <span className="text-sm">{currentLayer.icon}</span>
            <span>{currentLayer.name.split(' ')[0]}</span>
            <Layers className="w-3.5 h-3.5 text-blue-600 ml-0.5" />
          </button>

          {showLayerMenu && (
            <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl border border-slate-200 shadow-modal p-1.5 space-y-1 animate-in fade-in zoom-in-95 z-50">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Select Google Map Layer
              </div>
              {Object.entries(MAP_LAYERS).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => {
                    setMapLayer(key);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                    mapLayer === key
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{config.icon}</span>
                    <span className="truncate">{config.name}</span>
                  </div>
                  {mapLayer === key && (
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Heatmap Control & Legend Panel (When Heatmap Active) */}
      {isHeatmapMode && (
        <div className="absolute bottom-6 right-3 z-[1000] bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-modal w-72 space-y-2.5 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-600" />
              <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                Defect Density Heatmap
              </span>
            </div>
            <button
              onClick={() => setShowHeatmapControls(!showHeatmapControls)}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Heatmap Category Filter */}
          <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
            {[
              { id: 'ALL', label: 'All Anomalies' },
              { id: 'POTHOLES', label: 'Potholes' },
              { id: 'WATERLOGGING', label: 'Waterlogging' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setHeatmapType(tab.id)}
                className={`py-1 px-1.5 rounded-md text-center transition-all ${
                  heatmapType === tab.id
                    ? 'bg-red-600 text-white font-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Density Color Gradient Bar Legend */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-500">
              <span>Low Density</span>
              <span>Moderate</span>
              <span>Critical Cluster</span>
            </div>
            <div className="h-2.5 rounded-full w-full bg-gradient-to-r from-sky-400 via-amber-400 via-orange-500 to-red-600 shadow-inner" />
            <div className="flex justify-between text-[9px] font-mono text-slate-400">
              <span>1-2 defects</span>
              <span>3-5 defects</span>
              <span>6+ high hazards</span>
            </div>
          </div>

          {/* Dynamic Radius Slider */}
          {showHeatmapControls && (
            <div className="pt-2 border-t border-slate-200 space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                <span>Cluster Radius:</span>
                <span className="font-mono text-blue-600">{heatRadius}m</span>
              </div>
              <input
                type="range"
                min="350"
                max="1500"
                step="50"
                value={heatRadius}
                onChange={(e) => setHeatRadius(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </div>
          )}

          <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5 border-t border-slate-100">
            <Info className="w-3 h-3 text-blue-500 shrink-0" />
            <span>Density computed from {heatmapPoints.length} active detections</span>
          </div>
        </div>
      )}

      {/* Google Maps Attribution Badge */}
      <div className="absolute bottom-6 left-3 z-[1000] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md border border-slate-200 text-[11px] font-bold text-slate-700 shadow-xs flex items-center gap-1.5 select-none pointer-events-none">
        <span className="text-blue-600 font-black tracking-tight">Google</span>
        <span>Maps Live Integration</span>
      </div>

      <MapContainer
        center={CHENNAI_CENTER}
        zoom={CHENNAI_DEFAULT_ZOOM}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          key={mapLayer}
          attribution={currentLayer.attribution}
          url={currentLayer.url}
          maxZoom={20}
        />

        {/* 1. HEATMAP DENSITY CLUSTERS (Active in Heatmap Mode) */}
        {isHeatmapMode && heatmapPoints.map((item, idx) => {
          const colors = getHeatmapColor(item);
          return (
            <React.Fragment key={`heat-${item.id}-${idx}`}>
              {/* Outer Low-Intensity Dispersion Ring */}
              <Circle
                center={[item.lat, item.lng]}
                radius={heatRadius * 1.3}
                pathOptions={{
                  color: colors.outer,
                  fillColor: colors.outer,
                  fillOpacity: colors.opacity * 0.4,
                  weight: 0
                }}
              />
              {/* Mid-Intensity Density Gradient Ring */}
              <Circle
                center={[item.lat, item.lng]}
                radius={heatRadius * 0.8}
                pathOptions={{
                  color: colors.core,
                  fillColor: colors.core,
                  fillOpacity: colors.opacity * 0.7,
                  weight: 0
                }}
              />
              {/* High-Intensity Core Epicenter */}
              <Circle
                center={[item.lat, item.lng]}
                radius={heatRadius * 0.35}
                pathOptions={{
                  color: '#FFFFFF',
                  fillColor: colors.core,
                  fillOpacity: 0.85,
                  weight: 1.5
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1 font-sans">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                      HIGH DENSITY HEAT CLUSTER
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 mt-1">{item.title}</h4>
                    <p className="text-xs text-slate-600">{item.location}</p>
                    <div className="text-[11px] font-bold text-slate-900">
                      Severity: <span className="text-red-600">{item.severity}</span>
                    </div>
                    <button
                      onClick={() => setSelectedReport(item)}
                      className="w-full py-1 px-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 shadow-xs mt-1"
                    >
                      <span>Examine Ticket</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </Popup>
              </Circle>
            </React.Fragment>
          );
        })}

        {/* 2. Congestion Zone Overlays */}
        {showCongestion && CONGESTION_ZONES.map(zone => (
          <Circle
            key={zone.id}
            center={[zone.lat, zone.lng]}
            radius={650}
            pathOptions={{
              color: zone.color,
              fillColor: zone.color,
              fillOpacity: isHeatmapMode ? 0.35 : 0.22,
              weight: 2,
              dashArray: '4, 6'
            }}
          >
            <Popup>
              <div className="p-1 space-y-1 font-sans">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  SAMPLE CONGESTION ZONE
                </span>
                <h4 className="font-bold text-xs text-slate-900 mt-1">{zone.zone}</h4>
                <p className="text-xs text-slate-600">Avg Corridor Speed: <strong className="text-slate-900">{zone.avgSpeedKmh} km/h</strong></p>
                <p className="text-[11px] text-slate-500">{zone.bottleneckCause}</p>
                <div className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  {zone.busCountActive} Fleet Buses Active
                </div>
                <div className="pt-1">
                  <button
                    onClick={() => openInGoogleMaps(zone.lat, zone.lng)}
                    className="w-full py-1 px-2 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1"
                  >
                    <Navigation className="w-3 h-3 text-blue-600" />
                    <span>View in Google Maps</span>
                  </button>
                </div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* 3. Fleet Bus Live GPS Pins (Always visible) */}
        {showBuses && buses.map(bus => (
          <Marker
            key={bus.id}
            position={[bus.lat, bus.lng]}
            icon={createBusIcon(bus.heading, bus.speed)}
          >
            <Popup>
              <div className="p-1.5 space-y-2 font-sans min-w-[240px]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200">
                      {bus.id}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{bus.regNo}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {bus.speed} km/h
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <p className="text-slate-600 flex items-start gap-1">
                    <Bus className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span><strong>Route:</strong> {bus.route}</span>
                  </p>
                  <p className="text-slate-600 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span><strong>Location:</strong> {bus.currentLocation}</span>
                  </p>
                </div>

                <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-[11px] font-mono flex items-center justify-between">
                  <span className="text-slate-500">Edge YOLO AI:</span>
                  <span className="text-blue-600 font-bold">Sample bus · FPS not measured</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      setSelectedBus(bus);
                      setActiveRoute('fleet');
                    }}
                    className="py-1.5 px-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 shadow-xs"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => openInGoogleMaps(bus.lat, bus.lng)}
                    className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-slate-200"
                    title="Open exact bus coordinate in Google Maps"
                  >
                    <Navigation className="w-3 h-3 text-blue-600" />
                    <span>Google Map</span>
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 4. Discrete Detection Vector Markers (Visible in normal mode or when toggled) */}
        {!isHeatmapMode && visibleDetections.map(det => (
          <Marker
            key={det.id}
            position={[det.lat, det.lng]}
            icon={createDefectIcon(det.type, det.severity)}
          >
            <Popup>
              <div className="p-2 space-y-2 font-sans min-w-[260px]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      {det.id}
                    </span>
                    <SeverityBadge severity={det.severity} />
                  </div>
                  <StatusBadge status={det.status} size="xs" />
                </div>

                <div>
                  <h4 className="font-bold text-xs text-slate-900 leading-snug">
                    {det.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {det.location}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Confidence</span>
                    <strong className="text-blue-700">{Number.isFinite(det.confidence) ? `${Math.round(det.confidence * 100)}%` : 'Rule-based'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Detected By</span>
                    <strong className="font-mono text-slate-900">{det.busId}</strong>
                  </div>
                </div>

                {det.edgeEvent && <div className="text-xs text-slate-700 space-y-1">
                  <p>{det.cameraId} · {det.timestamp}</p>
                  <p>{det.gpsSource} · {det.lat.toFixed(5)}, {det.lng.toFixed(5)}</p>
                  {det.vehicleCount != null && <p>{det.congestionLevel} · Vehicles: {det.vehicleCount}</p>}
                  {det.trackId != null && <p>Track #{det.trackId}</p>}
                </div>}
                <div className="pt-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Authority:</span>
                  <p className="text-xs font-semibold text-slate-800">{det.department}</p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => setSelectedReport(det)}
                    className="py-1.5 px-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 shadow-xs"
                  >
                    <span>Full Dossier</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => openInGoogleMaps(det.lat, det.lng)}
                    className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-slate-200"
                    title="Open location in Google Maps"
                  >
                    <Navigation className="w-3 h-3 text-blue-600" />
                    <span>Google Map</span>
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
