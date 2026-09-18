export const CENTRAL_URL = (import.meta.env.VITE_CENTRAL_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
export const EDGE_URL = (import.meta.env.VITE_EDGE_URL || 'http://127.0.0.1:8001').replace(/\/$/, '');

export async function readJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response.json();
}

export function eventToDetection(event) {
  const m = event.metadata || {};
  const road = event.camera_id === 'FRONT_CAMERA';
  const type = road ? (m.class_name === 'pothole' ? 'pothole' : 'road_damage') : event.event_type.toLowerCase();
  const title = road ? `Road observation: ${(m.class_name || 'unknown').replaceAll('_', ' ')}` : event.event_type.replaceAll('_', ' ');
  return {
    id: event.event_id, eventType: event.event_type, type, title,
    confidence: event.confidence, severity: event.severity, status: event.status,
    lat: event.latitude, lng: event.longitude, busId: event.bus_id, cameraId: event.camera_id,
    gpsSource: event.gps_source, detectionSource: event.source, edgeEvent: true,
    location: event.gps_source === 'SIMULATED_ROUTE' ? 'Prototype route · simulated GPS' : 'Bus GPS observation',
    area: 'Bus camera observation', timestamp: event.timestamp, detectedAt: event.timestamp,
    timeAgo: new Date(event.timestamp).toLocaleTimeString(), trackId: event.track_id,
    vehicleType: event.vehicle_type, vehicleCount: event.vehicle_count,
    congestionLevel: m.congestion_level, metadata: m,
    evidenceImg: event.evidence_path ? `${CENTRAL_URL}${event.evidence_path}` : null,
    statusHistory: event.status_history || [],
    department: m.assigned_department?.department || (road ? 'Greater Chennai Corporation' : 'Greater Chennai Traffic Police'),
    division: m.assigned_department?.division || (road ? 'Roads & Infrastructure' : 'Traffic Review'),
    deptId: m.assigned_department?.deptId || (road ? 'GCC-ROADS' : 'GCTP-ENFORCE'),
    observationCount: 1, observations: [],
  };
}
