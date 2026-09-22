import React, { useEffect, useRef, useState } from 'react';
import { LiveEventStream } from './LiveEventStream';
import {
  Activity,
  Cpu,
  Gauge,
  MapPin,
  Radio,
  ShieldCheck,
  TriangleAlert,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { EDGE_URL, readJson } from '../../services/edgeApi';
import { VideoUploadPanel } from './VideoUploadPanel';


const number = (value, digits = 1) =>
  Number.isFinite(Number(value))
    ? Number(value).toFixed(digits)
    : '—';


const percent = value =>
  Number.isFinite(Number(value))
    ? `${(Number(value) * 100).toFixed(0)}%`
    : '—';


const titleCase = value =>
  String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());


const deviceName = value => {
  if (!value) return 'Device pending';

  if (String(value).toLowerCase() === 'cpu') {
    return 'CPU';
  }

  return `CUDA GPU ${value}`;
};


function StatusBadge({ running }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wide ${
        running
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-rose-50 text-rose-700 border border-rose-200'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          running ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
        }`}
      />

      {running ? 'LIVE' : 'OFFLINE'}
    </div>
  );
}


function MetricCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>

      <div className="mt-1 text-lg font-extrabold text-slate-900">
        {value}
      </div>
    </div>
  );
}


function RoadDetections({ detections, running }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold text-slate-900">
            CONFIRMED ROAD HAZARDS
          </p>

          <p className="text-[11px] text-slate-500">
            Multi-frame stabilized detections
          </p>
        </div>

        <ShieldCheck className="h-4 w-4 text-emerald-600" />
      </div>

      {!running ? (
        <p className="text-xs text-slate-500">
          Road intelligence unavailable.
        </p>
      ) : detections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center">
          <p className="text-xs font-semibold text-slate-600">
            No confirmed road hazard in the current frame
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Detections require temporal confirmation before display.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {detections.slice(0, 4).map((detection, index) => (
            <div
              key={`${detection.track_id ?? index}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" />

                  <span className="truncate text-sm font-extrabold text-slate-900">
                    {titleCase(detection.class_name)}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-slate-500">
                  Track #{detection.track_id ?? '—'}
                  {' • '}
                  confirmed {detection.support_frames ?? '—'} frames
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-extrabold text-blue-700">
                  {percent(detection.confidence)}
                </p>

                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  confidence
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function TrafficSummary({ state, running }) {
  const counts = Object.entries(state?.counts || {})
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <MetricCard
          label="Vehicles"
          value={running ? state?.vehicle_count ?? 0 : '—'}
          icon={Activity}
        />

        <MetricCard
          label="Congestion"
          value={running ? state?.congestion_level || 'UNKNOWN' : '—'}
          icon={Gauge}
        />

        <MetricCard
          label="Signal"
          value={running ? state?.signal_state || 'UNKNOWN' : '—'}
          icon={Radio}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-extrabold text-slate-900">
          LIVE OBJECT COUNTS
        </p>

        {counts.length === 0 ? (
          <p className="text-xs text-slate-500">
            No tracked objects in the current frame.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {counts.map(([name, count]) => (
              <span
                key={name}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {titleCase(name)}
                <span className="ml-1 font-extrabold text-slate-950">
                  {count}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function CameraPanel({ kind, state, connected }) {
  const [retry, setRetry] = useState(0);
  const [streamFailed, setStreamFailed] = useState(false);

  const road = kind === 'road';
  const running = connected && state?.status === 'running';

  const detections = Array.isArray(state?.detections)
    ? state.detections
    : [];

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Camera header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-extrabold tracking-wide text-slate-950">
              {road ? 'ROAD INTELLIGENCE' : 'TRAFFIC INTELLIGENCE'}
            </h2>

            <StatusBadge running={running} />
          </div>

          <p className="mt-1 text-xs text-slate-500">
            {state?.bus_id || 'BUS-104'}
            {' • '}
            {state?.camera_id || (road ? 'FRONT_CAMERA' : 'TRAFFIC_CAMERA')}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs font-bold text-slate-700">
            {state?.model || 'Model loading'}
          </p>

          <p className="text-[11px] text-slate-400">
            {deviceName(state?.device)}
            {state?.fp16 ? ' • FP16' : ''}
          </p>
        </div>
      </div>

      {/* Live stream */}
      <div className="relative flex aspect-video items-center justify-center bg-slate-950">
        {running && !streamFailed ? (
          <img
            key={retry}
            src={`${EDGE_URL}/api/live/${kind}?retry=${retry}`}
            alt={`${kind} camera AI stream`}
            className="h-full w-full object-contain"
            onError={() => setStreamFailed(true)}
            onLoad={() => setStreamFailed(false)}
          />
        ) : (
          <div className="max-w-sm p-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
              <WifiOff className="h-5 w-5 text-slate-300" />
            </div>

            <p className="text-sm font-bold text-white">
              {state?.error ||
                (streamFailed
                  ? 'Camera preview disconnected'
                  : connected
                    ? 'Camera is starting'
                    : 'Edge service unavailable')}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Local edge service should be running on port 8001.
            </p>
          </div>
        )}

        {running && (
          <>
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/65 px-3 py-1 text-[10px] font-extrabold tracking-widest text-white backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              LIVE EDGE AI
            </div>

            <div className="absolute right-3 top-3 rounded-full bg-black/65 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">
              {road ? 'ROAD HAZARD MODEL' : 'YOLO + BYTETRACK'}
            </div>
          </>
        )}
      </div>

      <div className="space-y-4 p-4">
        {streamFailed && (
          <button
            type="button"
            onClick={() => {
              setStreamFailed(false);
              setRetry(value => value + 1);
            }}
            className="text-xs font-bold text-blue-700 hover:underline"
          >
            Reconnect preview
          </button>
        )}

        <VideoUploadPanel
          camera={kind}
          sourceFile={state?.source_file}
          inputMode={state?.input_mode}
          onSourceChanged={() => {
            setStreamFailed(false);
            setRetry(value => value + 1);
          }}
        />

        {/* Performance telemetry */}
        <div className="grid grid-cols-3 gap-2">
          <MetricCard
            label="Inference"
            value={`${number(state?.inference_ms)} ms`}
            icon={Cpu}
          />

          <MetricCard
            label="Processed"
            value={`${number(state?.processed_fps)} FPS`}
            icon={Activity}
          />

          <MetricCard
            label="Latency"
            value={`${number(state?.processing_latency_ms)} ms`}
            icon={Gauge}
          />
        </div>

        {road ? (
          <RoadDetections
            detections={detections}
            running={running}
          />
        ) : (
          <TrafficSummary
            state={state}
            running={running}
          />
        )}

        {/* Technical footer */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <span>
            Source{' '}
            <b className="text-slate-700">
              {state?.source_width || '—'}×{state?.source_height || '—'}
            </b>
          </span>

          <span>
            Frame age{' '}
            <b className="text-slate-700">
              {number(state?.frame_age_ms)} ms
            </b>
          </span>

          <span>
            Detections{' '}
            <b className="text-slate-700">
              {state?.detection_count ?? '—'}
            </b>
          </span>
        </div>

        {!road && state?.model_description && (
          <p className="text-[11px] leading-relaxed text-slate-400">
            {state.model_description}
          </p>
        )}
      </div>
    </section>
  );
}


export function EdgeCameraPanels() {
  const [status, setStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);

  const seenRoadTracks = useRef(new Set());
  const lastCongestion = useRef(null);
  const lastSignal = useRef(null);

    function collectEvents(data) {
    const newEvents = [];

    const gps = data?.gps;
    const road = data?.cameras?.road;
    const traffic = data?.cameras?.traffic;


    // Confirmed road hazards
    for (const detection of road?.detections || []) {
      if (!detection?.track_id) continue;

      const key =
        `${detection.track_id}:${detection.class_name}`;

      if (seenRoadTracks.current.has(key)) {
        continue;
      }

      seenRoadTracks.current.add(key);

      newEvents.push({
        id: `road-${key}-${Date.now()}`,
        type: 'road',
        title: `${String(detection.class_name || 'Road hazard')
          .replaceAll('_', ' ')
          .replace(/\b\w/g, c => c.toUpperCase())} detected`,
        timestamp:
          road?.updated_at || new Date().toISOString(),
        busId: road?.bus_id,
        cameraId: road?.camera_id,
        confidence: detection.confidence,
        supportFrames: detection.support_frames,
        latitude: gps?.latitude,
        longitude: gps?.longitude,
      });
    }


    // Congestion transition
    const congestion = traffic?.congestion_level;

    if (
      congestion &&
      congestion !== lastCongestion.current &&
      ['MEDIUM', 'HIGH'].includes(congestion)
    ) {
      newEvents.push({
        id: `traffic-${congestion}-${Date.now()}`,
        type: 'traffic',
        title: `${congestion} traffic congestion detected`,
        timestamp:
          traffic?.updated_at || new Date().toISOString(),
        busId: traffic?.bus_id,
        cameraId: traffic?.camera_id,
        confidence: null,
        vehicleCount: traffic?.vehicle_count,
        latitude: gps?.latitude,
        longitude: gps?.longitude,
      });
    }

    lastCongestion.current = congestion;


    // Traffic signal change
    const signal = traffic?.signal_state;

    if (
      signal &&
      signal !== 'UNKNOWN' &&
      signal !== lastSignal.current
    ) {
      newEvents.push({
        id: `signal-${signal}-${Date.now()}`,
        type: 'signal',
        title: `Traffic signal state: ${signal}`,
        timestamp:
          traffic?.updated_at || new Date().toISOString(),
        busId: traffic?.bus_id,
        cameraId: traffic?.camera_id,
        confidence: null,
        latitude: gps?.latitude,
        longitude: gps?.longitude,
      });
    }

    lastSignal.current = signal;


    if (newEvents.length > 0) {
      setEvents(previous => [
        ...newEvents,
        ...previous,
      ].slice(0, 12));
    }
  }

  useEffect(() => {
    let cancelled = false;
    let timer;

      async function poll() {
      let data;

      try {
        data = await readJson(`${EDGE_URL}/api/status`);
      } catch (error) {
        console.error('Edge status fetch failed:', error);

        if (!cancelled) {
          setConnected(false);
        }

        if (!cancelled) {
          timer = setTimeout(poll, 1000);
        }

        return;
      }

      if (!cancelled) {
        setStatus(data);
        setConnected(true);

        try {
          collectEvents(data);
        } catch (error) {
          console.error('Live event collection failed:', error);
        }
      }

      if (!cancelled) {
        timer = setTimeout(poll, 1000);
      }
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const roadRunning =
    connected && status?.cameras?.road?.status === 'running';

  const trafficRunning =
    connected && status?.cameras?.traffic?.status === 'running';

  const edgeOnline = roadRunning && trafficRunning;

  return (
    <div className="space-y-4">

      {/* Edge node overview */}
      <div className="overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <div className="mb-2 flex items-center gap-2">
              <Radio className="h-5 w-5 text-blue-400" />

              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-300">
                Live Edge Intelligence
              </p>
            </div>

            <h2 className="text-xl font-black tracking-tight">
              {status?.bus_id || 'BUS-104'} Edge Vision Node
            </h2>

            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
              Dual-camera onboard AI processing road hazards and traffic
              conditions locally before structured event synchronization.
            </p>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold ${
              edgeOnline
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
            }`}
          >
            {edgeOnline ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}

            {edgeOnline ? 'EDGE NODE ONLINE' : 'EDGE NODE DEGRADED'}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-800 pt-4 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-slate-400" />

            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Bus GPS
              </p>

              <p className="text-xs font-bold text-slate-200">
                {status?.gps
                  ? `${Number(status.gps.latitude).toFixed(5)}, ${Number(
                      status.gps.longitude
                    ).toFixed(5)}`
                  : 'Unavailable'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Activity className="h-4 w-4 text-slate-400" />

            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Pending Events
              </p>

              <p className="text-xs font-bold text-slate-200">
                {status?.outbox?.pending_events ?? '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ShieldCheck className="h-4 w-4 text-slate-400" />

            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Event Buffer
              </p>

              <p className="text-xs font-bold text-slate-200">
                {status?.outbox?.error ? 'Buffered locally' : 'Synchronized'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two real camera feeds */}
            {/* Two real camera feeds */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CameraPanel
          kind="road"
          state={status?.cameras?.road}
          connected={connected}
        />

        <CameraPanel
          kind="traffic"
          state={status?.cameras?.traffic}
          connected={connected}
        />
      </div>

      {/* Validated edge events */}
      <LiveEventStream events={events} />

      {status?.outbox?.error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

          <p className="text-xs text-amber-800">
            Central synchronization is currently unavailable. Edge events
            remain buffered locally and can synchronize when connectivity
            returns.
          </p>
        </div>
      )}
    </div>
  );
}