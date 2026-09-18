// Chennai Center Coordinates
export const CHENNAI_CENTER = [13.0827, 80.2707];
export const CHENNAI_DEFAULT_ZOOM = 12;

// Popular Chennai zones with approximate centers
export const CHENNAI_ZONES = [
  { name: 'OMR / IT Corridor', lat: 12.9350, lng: 80.2310, zoom: 13 },
  { name: 'Guindy / Kathipara', lat: 13.0067, lng: 80.2025, zoom: 14 },
  { name: 'Velachery', lat: 12.9790, lng: 80.2185, zoom: 14 },
  { name: 'Sholinganallur', lat: 12.9010, lng: 80.2279, zoom: 14 },
  { name: 'T Nagar / Central', lat: 13.0405, lng: 80.2337, zoom: 14 },
  { name: 'Koyambedu CMBT', lat: 13.0694, lng: 80.1948, zoom: 14 },
  { name: 'Tambaram GST', lat: 12.9348, lng: 80.1245, zoom: 13 },
  { name: 'Anna Nagar', lat: 13.0850, lng: 80.2100, zoom: 14 }
];

// Helper to jitter or simulate vehicle movement along roads
export function updateBusCoordinate(lat, lng, heading = 180, speed = 30) {
  // Rough distance delta in meters per update step
  const distanceMeters = (speed * 1000 / 3600) * 3; // 3 seconds movement
  const earthRadius = 6378137;
  
  // Calculate new lat/lon with slight drift along heading
  const dLat = (distanceMeters * Math.cos(heading * Math.PI / 180)) / earthRadius;
  const dLng = (distanceMeters * Math.sin(heading * Math.PI / 180)) / (earthRadius * Math.cos(lat * Math.PI / 180));
  
  const newLat = lat + (dLat * (180 / Math.PI));
  const newLng = lng + (dLng * (180 / Math.PI));
  
  // Keep within bounds of Chennai
  const clampedLat = Math.min(Math.max(newLat, 12.80), 13.20);
  const clampedLng = Math.min(Math.max(newLng, 80.05), 80.32);
  
  return { lat: Number(clampedLat.toFixed(6)), lng: Number(clampedLng.toFixed(6)) };
}
