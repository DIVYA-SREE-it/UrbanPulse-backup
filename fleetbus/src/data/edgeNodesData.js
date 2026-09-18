export const EDGE_NETWORK_METRICS = {
  activeEdgeNodes: 119,
  totalBusesOnline: 127,
  framesProcessedToday: '2,482,109',
  eventsDetectedToday: 583,
  bandwidthSavedPercent: 87.4,
  avgInferenceLatencyMs: 36.8,
  modelName: 'YOLOv11-UrbanCore-TensorRT',
  modelPrecision: 'FP16',
  inferencePlatform: 'NVIDIA Jetson Orin Nano / AGX on Fleet Buses',
  status: 'OPERATIONAL',
  lastModelSync: '2026-08-27 04:00:00 UTC',
  syncVersion: 'v2.4.11',
  edgeTopology: [
    { step: 'CAMERA SENSORS', desc: '5x High-Def 1080p 60fps automotive grade cameras (Front, Rear, Left, Right, Cabin)' },
    { step: 'EDGE AI PROCESSOR', desc: 'On-bus NVIDIA Jetson running YOLOv11 & DeepSORT at 25+ FPS real-time' },
    { step: 'EVENT FILTERING & ROI', desc: 'Discards normal road frames (>98% compression); captures only defect/risk ROIs' },
    { step: 'GPS & TELEMETRY TAGGING', desc: 'Attaches RTK GNSS coordinates (±0.5m), IMU accelerometer shock, bus ID, timestamp' },
    { step: 'SECURE 5G/MQTT UPLINK', desc: 'Transmits JSON telemetry + compressed evidence crops over encrypted 5G slice' },
    { step: 'GIS AGGREGATION & SLA', desc: 'Central UrbanPulse Command Server auto-correlates duplicates and maps to Govt Depts' },
    { step: 'ACTION & RESOLUTION', desc: 'Automated e-challans, GCC road work tickets, and real-time transit alerts' }
  ]
};

export const CONGESTION_ZONES = [
  {
    id: 'CZ-01',
    zone: 'OMR - Tidel Park to Perungudi Toll',
    density: 'VERY HIGH',
    avgSpeedKmh: 14,
    bottleneckCause: 'Metro Phase-2 Construction + Signal Delay',
    busCountActive: 18,
    lat: 12.9860,
    lng: 80.2480,
    color: '#E35D5D'
  },
  {
    id: 'CZ-02',
    zone: 'Kathipara Interchange (Guindy)',
    density: 'HIGH',
    avgSpeedKmh: 19,
    bottleneckCause: 'Merge conflict from Poonamallee Road',
    busCountActive: 24,
    lat: 13.0067,
    lng: 80.2025,
    color: '#E3B341'
  },
  {
    id: 'CZ-03',
    zone: 'Velachery Vijayanagar 5-Road Junction',
    density: 'HIGH',
    avgSpeedKmh: 16,
    bottleneckCause: 'Waterlogging lane narrowing + Peak office rush',
    busCountActive: 14,
    lat: 12.9790,
    lng: 80.2185,
    color: '#E3B341'
  },
  {
    id: 'CZ-04',
    zone: 'Koyambedu Roundabout to CMBT Entrance',
    density: 'HIGH',
    avgSpeedKmh: 12,
    bottleneckCause: 'Heavy inter-city bus ingress',
    busCountActive: 22,
    lat: 13.0694,
    lng: 80.1948,
    color: '#E35D5D'
  },
  {
    id: 'CZ-05',
    zone: 'Anna Salai - Gemini Flyover Stretch',
    density: 'MODERATE',
    avgSpeedKmh: 28,
    bottleneckCause: 'Synchronized corridor movement',
    busCountActive: 19,
    lat: 13.0560,
    lng: 80.2520,
    color: '#8BCF32'
  }
];
