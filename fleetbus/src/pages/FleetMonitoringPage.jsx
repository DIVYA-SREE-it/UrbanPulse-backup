import React, { useState } from 'react';
import {
  Bus,
  MapPin,
  Video,
  Search,
  Camera
} from 'lucide-react';
import { useUrbanPulse } from '../context/UrbanPulseContext';
import { exportToCSV } from '../utils/exportUtils';

export function FleetMonitoringPage() {
  const { buses, selectedBus, setSelectedBus, setActiveRoute } = useUrbanPulse();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepot, setFilterDepot] = useState('ALL');

  const filteredBuses = buses.filter(bus => {
    const matchSearch = bus.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.currentLocation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDepot = filterDepot === 'ALL' || bus.depot.toLowerCase().includes(filterDepot.toLowerCase());
    return matchSearch && matchDepot;
  });

  const activeBusDetail = selectedBus || buses[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Public Transport Fleet Monitoring</span>
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 font-mono px-2 py-0.5 rounded">
              {buses.length} Mobile Sensing Units
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Continuous onboard Edge AI telemetry, GPS positioning, and 5-camera array health
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(buses, 'chennai-fleet-telemetry.csv')}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold hover:bg-slate-50 text-slate-700 shadow-subtle transition-all"
          >
            EXPORT FLEET CSV
          </button>
        </div>
      </div>

      {/* Main Split: Selected Bus Inspection Card & Fleet Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Selected Bus Inspection Dossier */}
        {activeBusDetail && (
          <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle flex flex-col justify-between space-y-4">
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white font-mono font-bold text-sm shadow-xs">
                    {activeBusDetail.id}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{activeBusDetail.regNo}</h3>
                    <p className="text-xs text-slate-500">{activeBusDetail.depot}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {activeBusDetail.speed} km/h
                </span>
              </div>

              {/* Specs */}
              <div className="space-y-2 text-xs pt-3">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Route</span>
                  <span className="font-semibold text-slate-800 max-w-[180px] text-right truncate">
                    {activeBusDetail.route}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Current Location</span>
                  <span className="font-semibold text-slate-800 max-w-[180px] text-right truncate">
                    {activeBusDetail.currentLocation}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Driver in Shift</span>
                  <span className="font-medium text-slate-800">{activeBusDetail.driverName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Edge Model</span>
                  <span className="font-mono text-blue-600 font-semibold">{activeBusDetail.edgeModel}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Inference Latency</span>
                  <span className="font-mono font-bold text-slate-900">{activeBusDetail.latencyMs} ms ({activeBusDetail.fps} FPS)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Detections Today</span>
                  <span className="font-bold text-blue-600">{activeBusDetail.detectionsCount} events</span>
                </div>
              </div>

              {/* 5-Camera Array Status Grid */}
              <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  Onboard 5-Camera Matrix
                </h4>
                <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px]">
                  {['FRONT', 'REAR', 'LEFT', 'RIGHT', 'CABIN'].map(cam => (
                    <div key={cam} className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-700">
                      <span className="block font-bold text-blue-600">{cam}</span>
                      <span className="text-[8px] uppercase text-emerald-600 font-bold">ONLINE</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveRoute('live-camera')}
                className="w-full py-2 px-3 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Video className="w-4 h-4" />
                <span>Stream {activeBusDetail.id} Live Cameras</span>
              </button>
            </div>
          </div>
        )}

        {/* Right 2 Cols: Fleet Master Table */}
        <div className="lg:col-span-2 bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter by Bus ID, Route..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filterDepot}
                onChange={(e) => setFilterDepot(e.target.value)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
              >
                <option value="ALL">All Depots</option>
                <option value="Adyar">Adyar Depot</option>
                <option value="Guindy">Guindy Depot</option>
                <option value="Saidapet">Saidapet Depot</option>
                <option value="T Nagar">T Nagar Depot</option>
                <option value="Tambaram">Tambaram Depot</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">BUS ID</th>
                  <th className="py-2.5 px-3">ROUTE & CORRIDOR</th>
                  <th className="py-2.5 px-3">CURRENT LOCATION</th>
                  <th className="py-2.5 px-3">SPEED</th>
                  <th className="py-2.5 px-3">CAMERAS</th>
                  <th className="py-2.5 px-3">EDGE AI</th>
                  <th className="py-2.5 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBuses.map(bus => {
                  const isSelected = activeBusDetail?.id === bus.id;
                  return (
                    <tr
                      key={bus.id}
                      onClick={() => setSelectedBus(bus)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/50 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {bus.id}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-[160px] truncate text-slate-900">
                        {bus.route}
                      </td>
                      <td className="py-3 px-3 max-w-[140px] truncate text-slate-500">
                        {bus.currentLocation}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {bus.speed} km/h
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          5 / 5 ONLINE
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-mono text-slate-600">
                          {bus.latencyMs}ms ({bus.fps} FPS)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBus(bus);
                            setActiveRoute('live-camera');
                          }}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-blue-600 transition-colors shadow-xs"
                          title="Stream Cameras"
                        >
                          <Video className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
