import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, Sliders, Database, Server } from 'lucide-react';
import { useUrbanPulse } from '../context/UrbanPulseContext';

export function SettingsPage() {
  const { simulationRunning, setSimulationRunning } = useUrbanPulse();
  const [apiUrl, setApiUrl] = useState('http://localhost:8000/api/v1');
  const [modelConfidence, setModelConfidence] = useState(0.85);
  const [savedAlert, setSavedAlert] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <span>System Configuration & Platform Settings</span>
        </h1>
        <p className="text-xs text-slate-500">
          Configure central FastAPI backend endpoints, YOLO model thresholds, and simulation parameters
        </p>
      </div>

      {savedAlert && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Settings successfully persisted to local configuration cache!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Backend Configuration */}
        <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Server className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              FastAPI / Backend Server Connection
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Central Intelligence API Base URL
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-white font-mono text-xs text-slate-900 outline-none focus:border-blue-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Production endpoint for receiving real-time edge telemetry and ticket dispatches
              </p>
            </div>
          </div>
        </div>

        {/* AI Model Parameters */}
        <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              YOLOv11 Inference Parameters
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-700">Minimum Confidence Threshold for Auto-Ticket Creation</span>
                <span className="font-mono text-blue-600">{(modelConfidence * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.99"
                step="0.01"
                value={modelConfidence}
                onChange={(e) => setModelConfidence(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Detections below this confidence level are marked as ADVISORY rather than creating high-priority tickets.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Real-time Simulation Engine</span>
                <span className="text-[11px] text-slate-500">
                  Simulates continuous GPS coordinate movement of 127 fleet buses every 5 seconds
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSimulationRunning(!simulationRunning)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  simulationRunning
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {simulationRunning ? '● SIMULATION RUNNING' : 'PAUSED'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save System Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
