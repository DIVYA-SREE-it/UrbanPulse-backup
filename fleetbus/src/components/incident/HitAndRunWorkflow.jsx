import React from 'react';
import {
  ShieldAlert,
  Search,
  ScanLine,
  Camera,
  MapPin,
  Building2,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';

export function HitAndRunWorkflow({ incident }) {
  // --- Data-bound values with graceful fallback to demo values ---
  const plate = incident?.plate || 'TN-09-CB-4491';
  const plateConf = incident?.plate_confidence
    ? `${(incident.plate_confidence * 100).toFixed(1)}%`
    : '94.2%';
  const plateRaw = incident?.plate_raw_text || null;
  const vehicle = incident?.vehicle_type
    ? `${incident.metadata?.color || 'Dark'} ${incident.vehicle_type}`
    : 'Dark Grey Tata Harrier';
  const busId = incident?.bus_id || 'BUS-104';
  const cameraId = incident?.camera_id || 'FRONT_CAMERA';
  const lat = incident?.latitude != null ? incident.latitude.toFixed(4) : '12.9010';
  const lon = incident?.longitude != null ? incident.longitude.toFixed(4) : '80.2279';
  const ts = incident?.timestamp
    ? new Date(incident.timestamp).toLocaleString()
    : '27 Aug 10:31:19';
  const trackId = incident?.track_id ?? 47;
  const evidenceCrop = incident?.evidence_crop_path || null;
  const severity = incident?.severity || 'HIGH';

  const steps = [
    {
      id: 'step-1',
      title: '1. Incident Detected',
      desc: `Acoustic collision surge + sudden deceleration sensed by ${busId} ${cameraId.toLowerCase().replace('_', ' ')}`,
      time: '10:31:19 AM',
      icon: AlertOctagon,
      status: 'COMPLETE',
      color: 'border-red-200 bg-red-50/50 text-red-900'
    },
    {
      id: 'step-2',
      title: '2. Vehicle Tracked',
      desc: `ByteTrack locked track #${trackId} on ${vehicle} fleeing scene`,
      time: '10:31:21 AM',
      icon: Search,
      status: 'COMPLETE',
      color: 'border-amber-200 bg-amber-50/50 text-amber-900'
    },
    {
      id: 'step-3',
      title: '3. Number Plate Detected',
      desc: 'High-resolution ANPR cropped region-of-interest at 1080p 60fps',
      time: '10:31:23 AM',
      icon: ScanLine,
      status: 'COMPLETE',
      color: 'border-blue-200 bg-blue-50/50 text-blue-900'
    },
    {
      id: 'step-4',
      title: '4. Optical OCR',
      desc: `Extracted vehicle registration: "${plate}" via EasyOCR`,
      time: '10:31:24 AM',
      icon: Camera,
      status: 'COMPLETE',
      color: 'border-purple-200 bg-purple-50/50 text-purple-900'
    },
    {
      id: 'step-5',
      title: '5. Confidence Tagged',
      desc: `AI validation confidence verified at ${plateConf} with tamper-proof checksum`,
      time: '10:31:24 AM',
      icon: CheckCircle2,
      status: 'COMPLETE',
      color: 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
    },
    {
      id: 'step-6',
      title: '6. GPS & Timestamp Tagged',
      desc: `${lat}° N, ${lon}° E | ${ts}`,
      time: '10:31:25 AM',
      icon: MapPin,
      status: 'COMPLETE',
      color: 'border-blue-200 bg-blue-50 text-blue-900'
    },
    {
      id: 'step-7',
      title: '7. Central Police Broadcast',
      desc: 'Automatic 5G uplink dispatched incident dossier to Police ITMS Control Room',
      time: '10:31:26 AM',
      icon: ShieldAlert,
      status: 'COMPLETE',
      color: 'border-red-300 bg-red-50 text-red-900'
    },
    {
      id: 'step-8',
      title: '8. Police Interception',
      desc: 'Navalur Toll Plaza & Highway Patrol Units deployed for tactical vehicle interception',
      time: '10:32:00 AM',
      icon: Building2,
      status: 'EN-ROUTE',
      color: 'border-blue-600 bg-blue-600 text-white'
    }
  ];

  return (
    <div className="bg-white rounded-card border-l-4 border-l-red-600 border border-slate-200 p-5 shadow-subtle space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-200">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
              Autonomous Hit-and-Run Tracking Pipeline
            </h3>
            <p className="text-xs text-slate-500">
              Edge AI Detection → ANPR OCR → Police Interception Workflow
            </p>
          </div>
        </div>

        <span className="font-mono text-xs font-bold bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full">
          EMERGENCY PROTOCOL ACTIVE
        </span>
      </div>

      {/* Target Suspect Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
            Identified Plate (OCR {plateConf})
          </span>
          <span className="font-mono text-lg font-black text-slate-900 bg-yellow-300 px-2.5 py-1 rounded border border-yellow-500 inline-block mt-0.5 shadow-xs">
            {plate}
          </span>
          {plateRaw && plateRaw !== plate && (
            <span className="block mt-1 text-[10px] text-slate-500 font-mono">
              raw OCR: {plateRaw}
            </span>
          )}
        </div>
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
            Suspect Vehicle
          </span>
          <span className="text-sm font-bold text-slate-900 block mt-0.5">
            {vehicle}
          </span>
          {incident?.track_id != null && (
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
              track #{trackId}
            </span>
          )}
        </div>
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
            Fleeing Velocity
          </span>
          <span className="text-sm font-mono font-bold text-amber-700 block mt-0.5">
            68 km/h (Southbound OMR)
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
            Dispatch Status
          </span>
          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            2 Interceptor Squads Moving
          </span>
        </div>
      </div>

      {/* Severity + evidence crop strip */}
      {(incident?.severity || evidenceCrop) && (
        <div className="flex flex-wrap items-center gap-3">
          {severity && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                severity === 'CRITICAL'
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : severity === 'HIGH'
                  ? 'bg-orange-100 text-orange-800 border-orange-300'
                  : severity === 'MEDIUM'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              Severity: {severity}
            </span>
          )}
          {evidenceCrop && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                ANPR Evidence:
              </span>
              <img
                src={evidenceCrop}
                alt="ANPR evidence crop"
                className="rounded-lg border border-slate-300 max-h-20 object-contain bg-white"
              />
            </div>
          )}
        </div>
      )}

      {/* 8-Step Visual Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {steps.map((st) => {
          const Icon = st.icon;
          return (
            <div
              key={st.id}
              className={`p-3.5 rounded-xl border flex flex-col justify-between ${st.color} shadow-xs transition-all`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="p-1.5 rounded-lg bg-white/90 shadow-xs text-slate-800">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold opacity-80">
                    {st.time}
                  </span>
                </div>
                <h4 className="text-xs font-extrabold leading-tight">
                  {st.title}
                </h4>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {st.desc}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-current/20 flex items-center justify-between text-[10px] font-mono font-bold">
                <span>STATUS:</span>
                <span>{st.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}