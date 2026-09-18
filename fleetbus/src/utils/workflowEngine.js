import { DEPARTMENT_MAPPING, DEPARTMENTS } from '../data/departmentsData';

export const WORKFLOW_STAGES = [
  { key: 'DETECTED', label: '1. Detected', desc: 'Identified by Edge AI on Bus' },
  { key: 'VERIFIED', label: '2. Verified', desc: 'Validated & Confidence Scored' },
  { key: 'ASSIGNED', label: '3. Assigned', desc: 'Routed to Nodal Department' },
  { key: 'IN PROGRESS', label: '4. In Progress', desc: 'Field Squad on Site' },
  { key: 'RESOLVED', label: '5. Resolved', desc: 'Rectification Completed' },
  { key: 'VERIFIED CLOSED', label: '6. Verified Closed', desc: 'Subsequent Bus Pass Verified Fix' }
];

export function getAutoAssignedDepartment(defectType) {
  const mapping = DEPARTMENT_MAPPING[defectType] || {
    deptId: 'GCC-ROADS',
    authority: 'Greater Chennai Corporation',
    division: 'Roads & Infrastructure',
    autoPriority: 'HIGH',
    slaHours: 24
  };

  const fullDept = DEPARTMENTS.find(d => d.id === mapping.deptId) || DEPARTMENTS[0];
  
  return {
    deptId: mapping.deptId,
    department: mapping.authority,
    division: mapping.division,
    priority: mapping.autoPriority,
    slaHours: mapping.slaHours,
    officer: fullDept.contactOfficer,
    contact: fullDept.phone
  };
}

export function generateReportId(type = 'pothole') {
  const prefix = {
    pothole: 'PH',
    road_damage: 'RD',
    waterlogging: 'WL',
    damaged_signal: 'TS',
    damaged_signboard: 'SB',
    missing_zebra_crossing: 'ZC',
    missing_divider: 'MD',
    school_zone_violation: 'SZV',
    hit_and_run: 'HR',
    rash_driving: 'RD',
    dangerous_overtaking: 'DO',
    pedestrian_risk: 'PR'
  }[type] || 'UP';

  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}
