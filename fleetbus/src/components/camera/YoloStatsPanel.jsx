import React from 'react';
import {
  Cpu,
  CheckCircle2,
  Sparkles,
  Zap
} from 'lucide-react';

export function YoloStatsPanel({
  activeScenario = 'POTHOLE',
  onSelectScenario = () => {},
  onSimulateDetection = () => {}
}) {
  const scenarioCounts = {
    POTHOLE: { objects: 8, people: 1, cars: 2, buses: 1, vehicles: 3, hazards: 3, confidence: '96%' },
    ROAD_DAMAGE: { objects: 4, people: 0, cars: 1, buses: 0, vehicles: 1, hazards: 2, confidence: '94%' },
    CRACK: { objects: 5, people: 0, cars: 1, buses: 0, vehicles: 1, hazards: 2, confidence: '95%' },
    SPEED_BREAKER: { objects: 6, people: 0, cars: 2, buses: 1, vehicles: 3, hazards: 1, confidence: '97%' },
    WATERLOGGING: { objects: 12, people: 3, cars: 1, buses: 0, vehicles: 4, hazards: 2, confidence: '96%' },
    WATER_HIGHWAY: { objects: 7, people: 0, cars: 2, buses: 1, vehicles: 3, hazards: 1, confidence: '95%' },
    WATER_NIGHT: { objects: 6, people: 1, cars: 1, buses: 0, vehicles: 1, hazards: 2, confidence: '94%' },
    WATER_CRATERS: { objects: 5, people: 0, cars: 0, buses: 0, vehicles: 0, hazards: 3, confidence: '96%' },
    SIGNAL: { objects: 9, people: 3, cars: 4, buses: 1, vehicles: 5, hazards: 1, confidence: '89%' },
    SCHOOL_ZONE: { objects: 18, people: 11, cars: 4, buses: 1, vehicles: 5, hazards: 1, confidence: '95%' },
    HIT_AND_RUN: { objects: 14, people: 2, cars: 8, buses: 1, vehicles: 9, hazards: 1, confidence: '96%' }
  }[activeScenario] || { objects: 8, people: 1, cars: 2, buses: 1, vehicles: 3, hazards: 3, confidence: '96%' };

  return (
    <div className="bg-white rounded-card border border-slate-200 p-4 shadow-subtle flex flex-col space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
              AI DETECTION
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              Inference: Jetson Orin Edge (FP16)
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          READY
        </span>
      </div>

      {/* Model Spec Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Model Architecture</span>
          <span className="font-mono font-bold text-slate-900">YOLOv11-UrbanCore</span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">FPS / Latency</span>
          <span className="font-mono font-bold text-blue-600">25.4 FPS (36ms)</span>
        </div>
      </div>

      {/* Real-time Object Counters */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Objects Detected in View
        </h4>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block">TOTAL</span>
            <span className="text-base font-extrabold text-slate-900 font-mono">{scenarioCounts.objects}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block">PEOPLE</span>
            <span className="text-base font-extrabold text-purple-700 font-mono">{scenarioCounts.people}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block">CARS</span>
            <span className="text-base font-extrabold text-blue-600 font-mono">{scenarioCounts.cars}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block">BUSES</span>
            <span className="text-base font-extrabold text-sky-700 font-mono">{scenarioCounts.buses}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block">VEHICLES</span>
            <span className="text-base font-extrabold text-amber-600 font-mono">{scenarioCounts.vehicles}</span>
          </div>
          <div className="p-2 rounded-lg bg-red-50 border border-red-200">
            <span className="text-[10px] text-red-600 font-bold block">HAZARDS</span>
            <span className="text-base font-extrabold text-red-600 font-mono">{scenarioCounts.hazards}</span>
          </div>
        </div>
      </div>

      {/* Confidence Meter */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-600 font-medium">Detection Confidence</span>
          <span className="font-bold text-blue-700">{scenarioCounts.confidence}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: scenarioCounts.confidence }}
          />
        </div>
      </div>

      {/* Live AI Test Scenario Switcher */}
      <div className="space-y-2 pt-1 border-t border-slate-200">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-blue-600" />
          Test Road & Waterlogging Scenarios
        </h4>
        <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-1">
          {[
            { id: 'WATERLOGGING', label: '1. Metro Flyover Inundation', desc: 'Water depth 22cm + pedestrians', color: 'hover:border-sky-400' },
            { id: 'WATER_HIGHWAY', label: '2. Highway Waterlogging Pool', desc: 'Car splash + surface pool (18cm)', color: 'hover:border-sky-400' },
            { id: 'WATER_NIGHT', label: '3. Night Flood Inundation', desc: 'Monsoon hollows & barricades (16cm)', color: 'hover:border-sky-400' },
            { id: 'WATER_CRATERS', label: '4. Water-Filled Craters', desc: 'Muddy water traps in asphalt', color: 'hover:border-amber-400' },
            { id: 'POTHOLE', label: '5. Potholes & Road Craters', desc: 'Asphalt craters (16cm) + signboards', color: 'hover:border-amber-400' },
            { id: 'ROAD_DAMAGE', label: '6. Edge Shoulder Raveling', desc: 'Asphalt edge crumbling & fatigue', color: 'hover:border-red-400' },
            { id: 'CRACK', label: '7. Longitudinal Road Crack', desc: 'Structural fracture + rumble strip', color: 'hover:border-amber-400' },
            { id: 'SPEED_BREAKER', label: '8. Speed Breaker & Markings', desc: 'Modular speed bump & yellow strip', color: 'hover:border-blue-400' },
            { id: 'SIGNAL', label: '9. Traffic Signal Outage', desc: 'Non-functional red aspect', color: 'hover:border-red-400' },
            { id: 'SCHOOL_ZONE', label: '10. School Zone Speeding', desc: 'Speed limit breach + OCR', color: 'hover:border-purple-400' },
            { id: 'HIT_AND_RUN', label: '11. Hit-and-Run Incident', desc: 'Autonomous tracking TN-09-CB-4491', color: 'hover:border-red-500' }
          ].map(scen => (
            <button
              key={scen.id}
              onClick={() => onSelectScenario(scen.id)}
              className={`p-2 rounded-lg border text-left transition-all text-xs flex items-center justify-between ${
                activeScenario === scen.id
                  ? 'bg-blue-50 border-blue-600 font-bold text-blue-700 shadow-xs'
                  : `bg-white border-slate-200 text-slate-600 ${scen.color} hover:bg-slate-50`
              }`}
            >
              <div>
                <p className="font-semibold text-slate-900">{scen.label}</p>
                <p className="text-[10px] text-slate-500">{scen.desc}</p>
              </div>
              {activeScenario === scen.id && (
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Trigger Live Report Button */}
      <button
        onClick={onSimulateDetection}
        className="w-full py-2.5 px-3 rounded-xl bg-blue-600 text-white font-extrabold text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-xs"
      >
        <Zap className="w-4 h-4" />
        <span>SIMULATE & DISPATCH TICKET</span>
      </button>
    </div>
  );
}
