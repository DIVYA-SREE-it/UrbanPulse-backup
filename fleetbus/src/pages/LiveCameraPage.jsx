import React from 'react';
import {
  Camera,
  Cpu,
  Database,
  Radio,
  Route,
} from 'lucide-react';

import { EdgeCameraPanels } from '../components/camera/EdgeCameraPanels';

export function LiveCameraPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">

      {/* Page heading */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
              <Camera className="h-5 w-5 text-blue-600" />
            </div>

            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-950">
                Live Bus Edge Intelligence
              </h1>

              <p className="text-xs text-slate-500">
                Real-time AI inference from independent road and traffic camera feeds
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600">
            <Cpu className="h-3.5 w-3.5 text-blue-600" />
            Edge AI
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600">
            <Radio className="h-3.5 w-3.5 text-blue-600" />
            Dual Camera
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600">
            <Route className="h-3.5 w-3.5 text-blue-600" />
            Geo-tagged Events
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600">
            <Database className="h-3.5 w-3.5 text-blue-600" />
            Offline Buffer
          </span>
        </div>
      </div>

      {/* Pipeline explanation */}
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">

          <span className="rounded-lg bg-slate-100 px-3 py-1.5">
            Camera Feed
          </span>

          <span className="text-slate-300">→</span>

          <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-blue-700">
            Edge AI Detection
          </span>

          <span className="text-slate-300">→</span>

          <span className="rounded-lg bg-violet-50 px-3 py-1.5 text-violet-700">
            Temporal Validation
          </span>

          <span className="text-slate-300">→</span>

          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-700">
            Geo-tagged Event
          </span>

          <span className="text-slate-300">→</span>

          <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-700">
            Central Platform
          </span>

        </div>
      </div>

      {/* Road + Traffic live AI panels */}
      <EdgeCameraPanels />

      {/* Prototype note */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
        <p className="text-xs leading-relaxed text-slate-600">
          <span className="font-extrabold text-blue-700">
            Prototype mode:
          </span>{' '}
          prerecorded videos simulate independent onboard bus cameras while all
          detection, tracking, temporal validation, telemetry and event generation
          run through the local edge pipeline.
        </p>
      </div>

    </div>
  );
}