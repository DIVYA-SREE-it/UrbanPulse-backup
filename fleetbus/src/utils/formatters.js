export function formatConfidence(score) {
  if (typeof score !== 'number') return '90%';
  const pct = score <= 1 ? Math.round(score * 100) : Math.round(score);
  return `${pct}%`;
}

export function formatSeverityColor(severity) {
  switch (severity?.toUpperCase()) {
    case 'EMERGENCY':
    case 'CRITICAL':
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        badge: 'bg-red-600 text-white',
        dot: 'bg-red-500'
      };
    case 'HIGH':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        badge: 'bg-amber-500 text-white',
        dot: 'bg-amber-500'
      };
    case 'MEDIUM':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-200',
        badge: 'bg-blue-600 text-white',
        dot: 'bg-blue-500'
      };
    case 'LOW':
    default:
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        badge: 'bg-emerald-600 text-white',
        dot: 'bg-emerald-500'
      };
  }
}

export function formatStatusColor(status) {
  switch (status?.toUpperCase()) {
    case 'DETECTED':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'VERIFIED':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'ASSIGNED':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'IN PROGRESS':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'RESOLVED':
    case 'VERIFIED CLOSED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'PENDING':
    default:
      return 'bg-orange-100 text-orange-800 border-orange-200';
  }
}

export function getIconForType(type) {
  switch (type?.toLowerCase()) {
    case 'pothole':
    case 'road_damage':
      return 'Cone';
    case 'waterlogging':
      return 'Droplets';
    case 'damaged_signal':
    case 'traffic_light':
      return 'Radio';
    case 'school_zone_violation':
      return 'School';
    case 'hit_and_run':
    case 'rash_driving':
    case 'dangerous_overtaking':
      return 'AlertTriangle';
    case 'bus':
      return 'Bus';
    default:
      return 'MapPin';
  }
}
