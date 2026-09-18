import { INITIAL_POTHOLES } from './potholesData';
import { INITIAL_WATERLOGGING } from './waterloggingData';
import { INITIAL_TRAFFIC_SIGNALS } from './trafficSignalsData';
import { INITIAL_SCHOOL_VIOLATIONS } from './schoolZonesData';
import { INITIAL_INCIDENTS } from './incidentsData';

export const INITIAL_ALL_DETECTIONS = [
  ...INITIAL_POTHOLES,
  ...INITIAL_WATERLOGGING,
  ...INITIAL_TRAFFIC_SIGNALS,
  ...INITIAL_SCHOOL_VIOLATIONS,
  ...INITIAL_INCIDENTS
];

export const DETECTION_CATEGORIES = [
  { id: 'all', label: 'All Detections' },
  { id: 'pothole', label: 'Potholes & Road Defect' },
  { id: 'waterlogging', label: 'Waterlogging' },
  { id: 'damaged_signal', label: 'Traffic Signals' },
  { id: 'damaged_signboard', label: 'Signboards' },
  { id: 'missing_zebra_crossing', label: 'Crosswalks / Dividers' },
  { id: 'school_zone_violation', label: 'School Zone Violations' },
  { id: 'hit_and_run', label: 'Hit-and-Run' },
  { id: 'rash_driving', label: 'Rash Driving' },
  { id: 'dangerous_overtaking', label: 'Dangerous Overtaking' },
  { id: 'pedestrian_risk', label: 'Pedestrian Hazards' }
];

export const DETECTION_CLASSES_LIST = [
  { name: 'pothole', label: 'Pothole', category: 'Road Defect', color: '#F59E0B', defaultSeverity: 'HIGH' },
  { name: 'road_damage', label: 'Damaged Road', category: 'Road Defect', color: '#F59E0B', defaultSeverity: 'HIGH' },
  { name: 'missing_divider', label: 'Missing Road Divider', category: 'Road Safety', color: '#DC2626', defaultSeverity: 'CRITICAL' },
  { name: 'missing_zebra_crossing', label: 'Missing Zebra Crossing', category: 'Road Safety', color: '#2563EB', defaultSeverity: 'MEDIUM' },
  { name: 'damaged_signal', label: 'Damaged Traffic Light', category: 'Traffic Infra', color: '#DC2626', defaultSeverity: 'CRITICAL' },
  { name: 'damaged_signboard', label: 'Damaged Signboard', category: 'Traffic Infra', color: '#0284C7', defaultSeverity: 'MEDIUM' },
  { name: 'waterlogging', label: 'Waterlogging', category: 'Environmental', color: '#0284C7', defaultSeverity: 'HIGH' },
  { name: 'vehicle_density', label: 'Vehicle Density (Congestion)', category: 'Traffic Flow', color: '#F59E0B', defaultSeverity: 'MEDIUM' },
  { name: 'pedestrian_risk', label: 'Pedestrian Risk', category: 'Safety Hazard', color: '#DC2626', defaultSeverity: 'CRITICAL' },
  { name: 'school_zone_violation', label: 'School-zone Violation', category: 'Enforcement', color: '#8B5CF6', defaultSeverity: 'CRITICAL' },
  { name: 'rash_driving', label: 'Rash Driving', category: 'Enforcement', color: '#DC2626', defaultSeverity: 'HIGH' },
  { name: 'dangerous_overtaking', label: 'Dangerous Overtaking', category: 'Enforcement', color: '#DC2626', defaultSeverity: 'HIGH' },
  { name: 'hit_and_run', label: 'Hit-and-Run', category: 'Emergency Crime', color: '#DC2626', defaultSeverity: 'EMERGENCY' },
  { name: 'car', label: 'Car', category: 'Object', color: '#2563EB', defaultSeverity: 'LOW' },
  { name: 'bus', label: 'Bus', category: 'Object', color: '#1D4ED8', defaultSeverity: 'LOW' },
  { name: 'truck', label: 'Truck', category: 'Object', color: '#2563EB', defaultSeverity: 'LOW' },
  { name: 'motorcycle', label: 'Motorcycle', category: 'Object', color: '#2563EB', defaultSeverity: 'LOW' },
  { name: 'person', label: 'Person', category: 'Object', color: '#2563EB', defaultSeverity: 'LOW' },
  { name: 'school_child', label: 'School Child', category: 'Object', color: '#8B5CF6', defaultSeverity: 'LOW' },
  { name: 'traffic_sign', label: 'Traffic Sign', category: 'Object', color: '#0284C7', defaultSeverity: 'LOW' },
  { name: 'traffic_light', label: 'Traffic Light', category: 'Object', color: '#DC2626', defaultSeverity: 'LOW' }
];
