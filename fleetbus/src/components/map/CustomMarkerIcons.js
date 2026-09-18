import L from 'leaflet';

// Leaflet custom HTML DivIcons for modern, crisp vector pins in clean blue/white style
export function createBusIcon(heading = 0, speed = 30) {
  return L.divIcon({
    className: 'custom-bus-icon',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(37, 99, 235, 0.2); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 26px; height: 26px; border-radius: 50%; background: #2563EB; border: 2.5px solid #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(15,23,42,0.25);">
          <svg style="width: 13px; height: 13px; color: #FFFFFF; fill: currentColor;" viewBox="0 0 24 24">
            <rect width="16" height="16" x="4" y="3" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M4 11h16" stroke="currentColor" stroke-width="2"/>
            <path d="M12 3v8" stroke="currentColor" stroke-width="2"/>
            <circle cx="8" cy="15" r="1.5" fill="currentColor"/>
            <circle cx="16" cy="15" r="1.5" fill="currentColor"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

export function createDefectIcon(type, severity = 'HIGH') {
  let bgColor = '#F59E0B'; // yellow/orange
  let borderColor = '#FFFFFF';
  let symbol = '!';

  switch (type) {
    case 'traffic_congestion':
      bgColor = severity === 'HIGH' ? '#DC2626' : '#F59E0B';
      symbol = 'TC';
      break;
    case 'pothole':
    case 'road_damage':
      bgColor = severity === 'CRITICAL' ? '#DC2626' : '#F59E0B';
      symbol = 'PH';
      break;
    case 'waterlogging':
      bgColor = '#0284C7';
      symbol = 'WL';
      break;
    case 'damaged_signal':
    case 'traffic_light':
      bgColor = '#DC2626';
      symbol = 'TS';
      break;
    case 'school_zone_violation':
      bgColor = '#8B5CF6';
      symbol = 'SZ';
      break;
    case 'hit_and_run':
    case 'rash_driving':
    case 'dangerous_overtaking':
    case 'pedestrian_risk':
      bgColor = '#DC2626';
      symbol = 'INC';
      break;
    default:
      bgColor = '#2563EB';
      symbol = 'UP';
  }

  return L.divIcon({
    className: 'custom-marker-icon',
    html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
        ${severity === 'CRITICAL' || severity === 'EMERGENCY' ? '<div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: ' + bgColor + '; opacity: 0.35; animation: ping 1.5s infinite;"></div>' : ''}
        <div style="width: 24px; height: 24px; border-radius: 50%; background: ${bgColor}; border: 2px solid ${borderColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(15,23,42,0.25);">
          <span style="color: #FFFFFF; font-size: 9px; font-weight: 800; font-family: monospace;">${symbol}</span>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}
