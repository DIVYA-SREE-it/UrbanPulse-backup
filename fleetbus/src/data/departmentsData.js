export const DEPARTMENTS = [
  {
    id: 'GCC-ROADS',
    name: 'Greater Chennai Corporation',
    division: 'Roads & Infrastructure Department',
    shortName: 'GCC Roads',
    category: 'Infrastructure',
    openTickets: 42,
    resolvedTickets: 184,
    avgResponseHours: 18.5,
    contactOfficer: 'Er. S. Narayanan, Chief Engineer',
    email: 'roads.ce@chennaicorporation.gov.in',
    phone: '+91 44 2538 4520',
    color: '#1C261B',
    bgColor: '#F0F3EE',
    supportedTypes: ['pothole', 'road_damage', 'missing_divider', 'debris', 'manhole_damage']
  },
  {
    id: 'GCC-SWD',
    name: 'Greater Chennai Corporation',
    division: 'Storm Water Drain (SWD) Cell',
    shortName: 'GCC SWD',
    category: 'Drainage & Floods',
    openTickets: 19,
    resolvedTickets: 92,
    avgResponseHours: 12.2,
    contactOfficer: 'Dr. M. K. Anandan, SE SWD',
    email: 'swd.monitoring@chennaicorporation.gov.in',
    phone: '+91 44 2561 9300',
    color: '#1E40AF',
    bgColor: '#EFF6FF',
    supportedTypes: ['waterlogging', 'blocked_drain', 'canal_overflow']
  },
  {
    id: 'GCTP-SIGNALS',
    name: 'Greater Chennai Traffic Police',
    division: 'Traffic Signal & Automation Wing',
    shortName: 'GCTP Signals',
    category: 'Traffic Management',
    openTickets: 15,
    resolvedTickets: 118,
    avgResponseHours: 6.4,
    contactOfficer: 'ACP V. Balasubramanian, Traffic Planning',
    email: 'signals.gctp@tn.gov.in',
    phone: '+91 44 2345 2588',
    color: '#991B1B',
    bgColor: '#FEF2F2',
    supportedTypes: ['damaged_signal', 'signal_outage', 'damaged_signboard', 'missing_zebra_crossing']
  },
  {
    id: 'GCTP-ENFORCEMENT',
    name: 'Greater Chennai Traffic Police',
    division: 'Road Safety & Enforcement Wing',
    shortName: 'GCTP Enforcement',
    category: 'Law Enforcement',
    openTickets: 28,
    resolvedTickets: 245,
    avgResponseHours: 3.2,
    contactOfficer: 'DCP K. Radhakrishnan, Traffic Enforcement',
    email: 'enforcement.gctp@tn.gov.in',
    phone: '+91 44 2345 2590',
    color: '#7F1D1D',
    bgColor: '#FEE2E2',
    supportedTypes: ['hit_and_run', 'rash_driving', 'school_zone_speeding', 'dangerous_overtaking', 'illegal_parking', 'pedestrian_risk']
  },
  {
    id: 'TN-HIGHWAYS',
    name: 'Tamil Nadu Highways & Minor Ports',
    division: 'Chennai Metropolitan Development Circle',
    shortName: 'TN Highways',
    category: 'Highways & Expressways',
    openTickets: 9,
    resolvedTickets: 56,
    avgResponseHours: 24.0,
    contactOfficer: 'Er. R. Sundaram, Divisional Engineer (OMR/GST)',
    email: 'de.metro.highways@tn.gov.in',
    phone: '+91 44 2235 1100',
    color: '#854D0E',
    bgColor: '#FEFCE8',
    supportedTypes: ['highway_defect', 'flyover_damage', 'expressway_blockage', 'pothole_nh']
  },
  {
    id: 'CMWSSB',
    name: 'Chennai Metro Water & Sewerage Board',
    division: 'Pipeline & Overflow Response Unit',
    shortName: 'Metro Water',
    category: 'Water & Sewerage',
    openTickets: 7,
    resolvedTickets: 48,
    avgResponseHours: 14.8,
    contactOfficer: 'Er. P. Jayakumar, Area Engineer',
    email: 'complaints@cmwssb.tn.gov.in',
    phone: '+91 44 4567 4567',
    color: '#0369A1',
    bgColor: '#E0F2FE',
    supportedTypes: ['water_pipe_burst', 'sewer_overflow', 'chamber_lid_missing']
  }
];

export const DEPARTMENT_MAPPING = {
  pothole: {
    deptId: 'GCC-ROADS',
    authority: 'Greater Chennai Corporation',
    division: 'Roads & Infrastructure',
    autoPriority: 'HIGH',
    slaHours: 24
  },
  road_damage: {
    deptId: 'GCC-ROADS',
    authority: 'Greater Chennai Corporation',
    division: 'Roads & Infrastructure',
    autoPriority: 'HIGH',
    slaHours: 48
  },
  missing_divider: {
    deptId: 'GCC-ROADS',
    authority: 'Greater Chennai Corporation',
    division: 'Road Safety Engineering',
    autoPriority: 'CRITICAL',
    slaHours: 12
  },
  missing_zebra_crossing: {
    deptId: 'GCTP-SIGNALS',
    authority: 'Traffic Police / GCC',
    division: 'Road Safety Markings',
    autoPriority: 'MEDIUM',
    slaHours: 72
  },
  waterlogging: {
    deptId: 'GCC-SWD',
    authority: 'Greater Chennai Corporation',
    division: 'Storm Water Drain Cell',
    autoPriority: 'CRITICAL',
    slaHours: 6
  },
  damaged_signal: {
    deptId: 'GCTP-SIGNALS',
    authority: 'Greater Chennai Traffic Police',
    division: 'Traffic Signal Maintenance',
    autoPriority: 'CRITICAL',
    slaHours: 4
  },
  damaged_signboard: {
    deptId: 'GCTP-SIGNALS',
    authority: 'Traffic Police / Corporation',
    division: 'Road Signage Wing',
    autoPriority: 'MEDIUM',
    slaHours: 48
  },
  school_zone_violation: {
    deptId: 'GCTP-ENFORCEMENT',
    authority: 'Greater Chennai Traffic Police',
    division: 'School Zone Enforcement Wing',
    autoPriority: 'CRITICAL',
    slaHours: 2
  },
  hit_and_run: {
    deptId: 'GCTP-ENFORCEMENT',
    authority: 'Greater Chennai Traffic Police',
    division: 'Special Crime & Accident Investigation',
    autoPriority: 'EMERGENCY',
    slaHours: 1
  },
  rash_driving: {
    deptId: 'GCTP-ENFORCEMENT',
    authority: 'Greater Chennai Traffic Police',
    division: 'Traffic Enforcement Wing',
    autoPriority: 'HIGH',
    slaHours: 4
  },
  dangerous_overtaking: {
    deptId: 'GCTP-ENFORCEMENT',
    authority: 'Greater Chennai Traffic Police',
    division: 'Traffic Enforcement Wing',
    autoPriority: 'HIGH',
    slaHours: 6
  },
  traffic_congestion: {
    deptId: 'GCTP-SIGNALS',
    authority: 'Greater Chennai Traffic Police',
    division: 'Real-time Signal Sync Cell',
    autoPriority: 'MEDIUM',
    slaHours: 1
  }
};
