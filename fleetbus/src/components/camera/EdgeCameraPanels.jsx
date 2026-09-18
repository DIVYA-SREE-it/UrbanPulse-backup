import React, { useEffect, useState } from 'react';
import { EDGE_URL, readJson } from '../../services/edgeApi';

const metric = value => Number.isFinite(value) ? value.toFixed(1) : '—';

function CameraPanel({ kind, state, connected }) {
  const [retry, setRetry] = useState(0);
  const [streamFailed, setStreamFailed] = useState(false);
  const road = kind === 'road';
  const running = connected && state?.status === 'running';
  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-subtle min-w-0">
      <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">{road ? 'ROAD INTELLIGENCE' : 'TRAFFIC INTELLIGENCE'}</h2>
          <p className="text-xs text-slate-500">{state?.bus_id || 'BUS-104'} · {road ? 'FRONT_CAMERA' : 'TRAFFIC_CAMERA'}</p>
        </div>
        <span className="text-xs font-semibold text-blue-700">{connected ? state?.status || 'starting' : 'offline'}</span>
      </div>
      <div className="aspect-video bg-slate-950 flex items-center justify-center relative">
        {running && !streamFailed ? (
          <img key={retry} src={`${EDGE_URL}/api/live/${kind}?retry=${retry}`} alt={`${kind} camera with model annotations`}
            className="w-full h-full object-contain" onError={() => setStreamFailed(true)} />
        ) : (
          <div className="p-5 text-center text-sm text-slate-200 break-words">
            {state?.error || (streamFailed ? 'Preview disconnected.' : connected ? 'Camera is starting…' : 'Start the local edge service on port 8001.')}
          </div>
        )}
      </div>
      <div className="p-4 space-y-3 text-sm">
        {streamFailed && <button className="text-blue-700 underline" onClick={() => { setStreamFailed(false); setRetry(n => n + 1); }}>Reconnect preview</button>}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-slate-600">
          <span>Inference <b>{metric(state?.inference_ms)} ms</b></span>
          <span>Processed <b>{metric(state?.processed_fps)} FPS</b></span>
          <span>Frame age <b>{metric(state?.frame_age_ms)} ms</b></span>
        </div>
        {!road && <>
          <div className="flex flex-wrap gap-4 font-semibold text-slate-900">
            <span>Vehicles: {state?.vehicle_count ?? '—'}</span>
            <span>Congestion: {state?.congestion_level || 'UNKNOWN'}</span>
            <span>Signal: {state?.signal_state || 'UNKNOWN'}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
            {['car', 'motorcycle', 'bus', 'truck', 'bicycle', 'person', 'rider', 'train', 'traffic sign', 'stop sign'].filter(name => ['car', 'motorcycle', 'bus', 'truck', 'bicycle', 'person'].includes(name) || (state?.counts?.[name] ?? 0) > 0).map(name => <span key={name}>{name}: {running ? state?.counts?.[name] ?? 0 : '—'}</span>)}
          </div>
          <p className="text-xs text-slate-500">{state?.model_description || 'Waiting for model identity'}.</p>
          <p className="text-xs text-slate-500">Congestion uses configurable vehicle-count thresholds. Signal color uses an HSV heuristic. Moving-bus violations are disabled. Riders, people and trains are excluded from road-vehicle counts.</p>
        </>}
        {road && <p className="text-xs text-slate-600">Model classes: {Object.values(state?.classes || {}).join(', ') || 'Available after the road weights load.'}</p>}
        <p className="text-xs text-slate-500">{state?.model || 'Model pending'} · {state?.device || 'Device pending'}{state?.fp16 ? ' · FP16' : ''} · prerecorded camera simulation</p>
      </div>
    </section>
  );
}

export function EdgeCameraPanels() {
  const [status, setStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let cancelled = false, timer;
    async function poll() {
      try {
        const data = await readJson(`${EDGE_URL}/api/status`);
        if (!cancelled) { setStatus(data); setConnected(true); }
      } catch { if (!cancelled) setConnected(false); }
      if (!cancelled) timer = setTimeout(poll, 1000);
    }
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CameraPanel kind="road" state={status?.cameras?.road} connected={connected} />
        <CameraPanel kind="traffic" state={status?.cameras?.traffic} connected={connected} />
      </div>
      <p className="text-xs text-slate-500">
        Local edge previews · GPS: {status?.gps ? `${status.gps.latitude.toFixed(5)}, ${status.gps.longitude.toFixed(5)} (simulated route)` : 'unavailable'}
        {' · '}Unsent events: {status?.outbox?.pending_events ?? '—'}
        {status?.outbox?.error && ' · Central sync unavailable; events remain buffered locally.'}
      </p>
    </div>
  );
}
