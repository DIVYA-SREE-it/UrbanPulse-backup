export const OVERALL_ANALYTICS = {
  totalDetectionsAllTime: 12842,
  roadDefectsCount: 4321,
  trafficEventsCount: 5127,
  incidentsCount: 842,
  waterloggingCount: 421,
  schoolViolationsCount: 631,
  
  detectionTrendsHourly: [
    { time: '06:00', potholes: 12, waterlogging: 4, signals: 2, violations: 5, incidents: 1 },
    { time: '07:00', potholes: 28, waterlogging: 8, signals: 3, violations: 18, incidents: 2 },
    { time: '08:00', potholes: 54, waterlogging: 15, signals: 6, violations: 42, incidents: 4 },
    { time: '09:00', potholes: 72, waterlogging: 22, signals: 9, violations: 65, incidents: 7 },
    { time: '10:00', potholes: 64, waterlogging: 18, signals: 7, violations: 38, incidents: 5 },
    { time: '11:00', potholes: 41, waterlogging: 12, signals: 4, violations: 22, incidents: 3 },
    { time: '12:00', potholes: 33, waterlogging: 9, signals: 3, violations: 15, incidents: 2 },
    { time: '13:00', potholes: 29, waterlogging: 7, signals: 2, violations: 14, incidents: 1 },
    { time: '14:00', potholes: 35, waterlogging: 8, signals: 4, violations: 20, incidents: 3 },
    { time: '15:00', potholes: 48, waterlogging: 11, signals: 5, violations: 35, incidents: 4 },
    { time: '16:00', potholes: 61, waterlogging: 16, signals: 8, violations: 48, incidents: 6 },
    { time: '17:00', potholes: 78, waterlogging: 25, signals: 11, violations: 72, incidents: 8 },
    { time: '18:00', potholes: 84, waterlogging: 28, signals: 12, violations: 80, incidents: 9 },
    { time: '19:00', potholes: 69, waterlogging: 19, signals: 9, violations: 54, incidents: 6 }
  ],

  defectsByZone: [
    { zone: 'Zone 14 (Perungudi / OMR)', potholes: 94, waterlogging: 38, signals: 8, total: 140 },
    { zone: 'Zone 15 (Sholinganallur)', potholes: 78, waterlogging: 29, signals: 6, total: 113 },
    { zone: 'Zone 13 (Adyar & Guindy)', potholes: 62, waterlogging: 18, signals: 11, total: 91 },
    { zone: 'Zone 10 (Kodambakkam/T Nagar)', potholes: 55, waterlogging: 14, signals: 9, total: 78 },
    { zone: 'Zone 8 (Anna Nagar)', potholes: 42, waterlogging: 11, signals: 5, total: 58 },
    { zone: 'Zone 11 (Valasaravakkam/Porur)', potholes: 39, waterlogging: 16, signals: 4, total: 59 },
    { zone: 'Zone 12 (Alandur/Airport)', potholes: 31, waterlogging: 9, signals: 3, total: 43 }
  ],

  departmentPerformance: [
    { name: 'GCC Roads', assigned: 226, resolved: 184, rate: 81.4, avgHours: 18.5 },
    { name: 'GCTP Enforcement', assigned: 273, resolved: 245, rate: 89.7, avgHours: 3.2 },
    { name: 'GCTP Signals', assigned: 133, resolved: 118, rate: 88.7, avgHours: 6.4 },
    { name: 'GCC SWD Cell', assigned: 111, resolved: 92, rate: 82.8, avgHours: 12.2 },
    { name: 'TN Highways', assigned: 65, resolved: 56, rate: 86.1, avgHours: 24.0 },
    { name: 'Metro Water', assigned: 55, resolved: 48, rate: 87.2, avgHours: 14.8 }
  ],

  severityDistribution: [
    { name: 'Emergency / Critical', value: 72, color: '#E35D5D' },
    { name: 'High Severity', value: 168, color: '#E3B341' },
    { name: 'Medium Severity', value: 245, color: '#5B8DEF' },
    { name: 'Low / Advisory', value: 98, color: '#55A65B' }
  ],

  resolutionTrendWeekly: [
    { week: 'Week 31', detected: 480, resolved: 450 },
    { week: 'Week 32', detected: 520, resolved: 495 },
    { week: 'Week 33', detected: 560, resolved: 530 },
    { week: 'Week 34', detected: 610, resolved: 585 },
    { week: 'Week 35', detected: 583, resolved: 560 }
  ]
};
