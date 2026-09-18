/**
 * YOLO PROTOTYPE DETECTION SERVICE
 * 
 * Simulated YOLO bounding boxes and real-time object classification counters
 * matched to real-world Indian road condition scenarios (Potholes, Edge Cracking, 
 * Road Shoulder Damage, Speed Breakers, Waterlogging Inundations, School Zones, and Hit-and-Run).
 */

export class YoloPrototypeDetector {
  constructor(options = {}) {
    this.fps = options.fps || 25;
    this.confidenceThreshold = options.confidenceThreshold || 0.85;
    this.activeDetections = [];
    this.isRunning = false;
  }

  generateSimulatedBoxes(videoWidth = 1280, videoHeight = 720, activeScenario = 'POTHOLE') {
    const time = Date.now() / 1000;
    const jitterX = Math.sin(time * 2) * 4;
    const jitterY = Math.cos(time * 1.5) * 2;

    switch (activeScenario) {
      case 'POTHOLE':
        return [
          {
            id: 'det-pothole-center',
            label: 'POTHOLE (DEPTH: 16cm)',
            category: 'pothole',
            confidence: 0.96,
            x: videoWidth * 0.35 + jitterX * 0.2,
            y: videoHeight * 0.52 + jitterY * 0.2,
            w: videoWidth * 0.28,
            h: videoHeight * 0.16,
            color: '#F59E0B',
            severity: 'HIGH',
            isHazard: true,
            extra: 'VOL: 0.04m³ | GCC ROADS'
          },
          {
            id: 'det-pothole-right',
            label: 'POTHOLE (DEPTH: 14cm)',
            category: 'pothole',
            confidence: 0.93,
            x: videoWidth * 0.62 + jitterX * 0.3,
            y: videoHeight * 0.58 + jitterY * 0.2,
            w: videoWidth * 0.25,
            h: videoHeight * 0.19,
            color: '#F59E0B',
            severity: 'HIGH',
            isHazard: true,
            extra: 'SEV: HIGH'
          },
          {
            id: 'det-pothole-left',
            label: 'POTHOLE (DEPTH: 9cm)',
            category: 'pothole',
            confidence: 0.89,
            x: videoWidth * 0.08 + jitterX * 0.2,
            y: videoHeight * 0.56,
            w: videoWidth * 0.20,
            h: videoHeight * 0.12,
            color: '#F59E0B',
            severity: 'MEDIUM',
            isHazard: true
          },
          {
            id: 'det-sign-1',
            label: 'TRAFFIC SIGNBOARD',
            category: 'sign',
            confidence: 0.97,
            x: videoWidth * 0.21,
            y: videoHeight * 0.00,
            w: videoWidth * 0.12,
            h: videoHeight * 0.12,
            color: '#0284C7',
            extra: 'OCR: Village - Wazidpur'
          },
          {
            id: 'det-auto-1',
            label: 'AUTO-RICKSHAW',
            category: 'vehicle',
            confidence: 0.94,
            x: videoWidth * 0.86 + jitterX * 0.5,
            y: videoHeight * 0.08,
            w: videoWidth * 0.13,
            h: videoHeight * 0.28,
            color: '#2563EB'
          },
          {
            id: 'det-moto-1',
            label: 'MOTORCYCLE',
            category: 'vehicle',
            confidence: 0.92,
            x: videoWidth * 0.66 + jitterX * 0.6,
            y: videoHeight * 0.18,
            w: videoWidth * 0.05,
            h: videoHeight * 0.12,
            color: '#2563EB'
          }
        ];

      case 'ROAD_DAMAGE':
        return [
          {
            id: 'det-edge-crumble',
            label: 'EDGE SHOULDER DAMAGE',
            category: 'road_damage',
            confidence: 0.94,
            x: videoWidth * 0.32 + jitterX * 0.3,
            y: videoHeight * 0.20,
            w: videoWidth * 0.38,
            h: videoHeight * 0.75,
            color: '#DC2626',
            severity: 'CRITICAL',
            isHazard: true,
            extra: 'EDGE RAVELING: 18.5m'
          },
          {
            id: 'det-surface-fracture',
            label: 'ASPHALT FATIGUE CRACKING',
            category: 'road_damage',
            confidence: 0.91,
            x: videoWidth * 0.65,
            y: videoHeight * 0.35,
            w: videoWidth * 0.28,
            h: videoHeight * 0.45,
            color: '#F59E0B',
            severity: 'HIGH',
            isHazard: true,
            extra: 'ALLIGATOR CRACK'
          }
        ];

      case 'CRACK':
        return [
          {
            id: 'det-long-crack',
            label: 'LONGITUDINAL ASPHALT CRACK',
            category: 'road_damage',
            confidence: 0.95,
            x: videoWidth * 0.36 + jitterX * 0.2,
            y: videoHeight * 0.42,
            w: videoWidth * 0.24,
            h: videoHeight * 0.55,
            color: '#F59E0B',
            severity: 'HIGH',
            isHazard: true,
            extra: 'CRACK LENGTH: 24m'
          },
          {
            id: 'det-rumble-strip',
            label: 'SPEED RUMBLE STRIP',
            category: 'marking',
            confidence: 0.98,
            x: videoWidth * 0.52,
            y: videoHeight * 0.43,
            w: videoWidth * 0.38,
            h: videoHeight * 0.22,
            color: '#0284C7',
            extra: 'WHITE BARS (10 COUNT)'
          }
        ];

      case 'SPEED_BREAKER':
        return [
          {
            id: 'det-speed-bump',
            label: 'MODULAR SPEED BREAKER',
            category: 'traffic_calming',
            confidence: 0.97,
            x: videoWidth * 0.01,
            y: videoHeight * 0.19,
            w: videoWidth * 0.98,
            h: videoHeight * 0.08,
            color: '#F59E0B',
            isHazard: false,
            extra: 'YELLOW-BLACK REFLECTIVE'
          }
        ];

      case 'WATERLOGGING':
        // Real-world Metro Flyover Waterlogging (under elevated pillar with pedestrians & scooters)
        return [
          {
            id: 'det-water-metro-main',
            label: 'WATER INUNDATION (DEPTH: 22cm)',
            category: 'waterlogging',
            confidence: 0.96,
            x: videoWidth * 0.08 + jitterX * 0.3,
            y: videoHeight * 0.72,
            w: videoWidth * 0.52,
            h: videoHeight * 0.26,
            color: '#0284C7',
            severity: 'CRITICAL',
            isHazard: true,
            extra: 'DEPTH: 22cm | 50HP PUMP REQ'
          },
          {
            id: 'det-pedestrian-1',
            label: 'PEDESTRIANS IN WATER',
            category: 'person',
            confidence: 0.94,
            x: videoWidth * 0.16,
            y: videoHeight * 0.40,
            w: videoWidth * 0.12,
            h: videoHeight * 0.40,
            color: '#8B5CF6',
            extra: 'FOOT TRAFFIC RISK'
          },
          {
            id: 'det-scooter-1',
            label: 'SCOOTER (SUBMERGED WHEEL)',
            category: 'vehicle',
            confidence: 0.95,
            x: videoWidth * 0.43 + jitterX * 0.4,
            y: videoHeight * 0.45,
            w: videoWidth * 0.18,
            h: videoHeight * 0.40,
            color: '#2563EB',
            extra: 'WHEEL SUBMERGED 40%'
          },
          {
            id: 'det-scooter-2',
            label: 'MOTORCYCLE',
            category: 'vehicle',
            confidence: 0.93,
            x: videoWidth * 0.63,
            y: videoHeight * 0.48,
            w: videoWidth * 0.18,
            h: videoHeight * 0.35,
            color: '#2563EB'
          },
          {
            id: 'det-scooter-3',
            label: 'SCOOTER (RIGHT)',
            category: 'vehicle',
            confidence: 0.94,
            x: videoWidth * 0.82,
            y: videoHeight * 0.38,
            w: videoWidth * 0.16,
            h: videoHeight * 0.50,
            color: '#2563EB'
          },
          {
            id: 'det-metro-pillar',
            label: 'METRO ELEVATED PILLAR #14',
            category: 'infrastructure',
            confidence: 0.98,
            x: videoWidth * 0.37,
            y: videoHeight * 0.00,
            w: videoWidth * 0.18,
            h: videoHeight * 0.45,
            color: '#64748B'
          }
        ];

      case 'WATER_HIGHWAY':
        // Real-world Highway with Car Navigating Deep Puddle
        return [
          {
            id: 'det-water-hwy-pool',
            label: 'WATERLOGGED POOL (DEPTH: 18cm)',
            category: 'waterlogging',
            confidence: 0.95,
            x: videoWidth * 0.12 + jitterX * 0.3,
            y: videoHeight * 0.70,
            w: videoWidth * 0.62,
            h: videoHeight * 0.28,
            color: '#0284C7',
            severity: 'HIGH',
            isHazard: true,
            extra: 'SURFACE INUNDATION: 220m²'
          },
          {
            id: 'det-car-swift',
            label: 'CAR: SWIFT DZIRE (WHITE)',
            category: 'vehicle',
            confidence: 0.97,
            x: videoWidth * 0.52 + jitterX * 0.2,
            y: videoHeight * 0.38,
            w: videoWidth * 0.42,
            h: videoHeight * 0.32,
            color: '#2563EB',
            extra: 'COMMERCIAL CAB | SPEED 18 km/h'
          },
          {
            id: 'det-moto-hwy',
            label: 'MOTORCYCLE',
            category: 'vehicle',
            confidence: 0.91,
            x: videoWidth * 0.33,
            y: videoHeight * 0.42,
            w: videoWidth * 0.04,
            h: videoHeight * 0.12,
            color: '#2563EB'
          }
        ];

      case 'WATER_NIGHT':
        // Night Monsoon Road Flooding & Construction Barricades
        return [
          {
            id: 'det-water-night-pool',
            label: 'NIGHT ROAD INUNDATION (16cm)',
            category: 'waterlogging',
            confidence: 0.94,
            x: videoWidth * 0.18 + jitterX * 0.3,
            y: videoHeight * 0.42,
            w: videoWidth * 0.72,
            h: videoHeight * 0.55,
            color: '#0284C7',
            severity: 'HIGH',
            isHazard: true,
            extra: 'NIGHT OPTICAL SENSOR 94%'
          },
          {
            id: 'det-barricade-night',
            label: 'METRO WORK BARRICADE',
            category: 'infrastructure',
            confidence: 0.97,
            x: videoWidth * 0.00,
            y: videoHeight * 0.02,
            w: videoWidth * 0.30,
            h: videoHeight * 0.40,
            color: '#F59E0B',
            extra: 'DRAIN BLOCKED BY SILT'
          }
        ];

      case 'WATER_CRATERS':
        // Muddy Water-filled Craters & Potholes
        return [
          {
            id: 'det-crater-water-1',
            label: 'WATER-FILLED CRATER #1 (15cm)',
            category: 'pothole',
            confidence: 0.96,
            x: videoWidth * 0.26 + jitterX * 0.3,
            y: videoHeight * 0.46,
            w: videoWidth * 0.56,
            h: videoHeight * 0.45,
            color: '#DC2626',
            severity: 'CRITICAL',
            isHazard: true,
            extra: 'MUDDY WATER TRAP: 15cm'
          },
          {
            id: 'det-crater-water-2',
            label: 'WATER-FILLED CRATER #2 (12cm)',
            category: 'pothole',
            confidence: 0.93,
            x: videoWidth * 0.36,
            y: videoHeight * 0.08,
            w: videoWidth * 0.36,
            h: videoHeight * 0.24,
            color: '#F59E0B',
            severity: 'HIGH',
            isHazard: true
          },
          {
            id: 'det-crater-water-3',
            label: 'WATER-FILLED CRATER #3 (9cm)',
            category: 'pothole',
            confidence: 0.89,
            x: videoWidth * 0.08,
            y: videoHeight * 0.12,
            w: videoWidth * 0.24,
            h: videoHeight * 0.18,
            color: '#F59E0B',
            severity: 'MEDIUM',
            isHazard: true
          }
        ];

      case 'SIGNAL':
        return [
          {
            id: 'det-signal-damage',
            label: 'DAMAGED TRAFFIC LIGHT (RED DARK)',
            category: 'signal',
            confidence: 0.91,
            x: videoWidth * 0.68,
            y: videoHeight * 0.05,
            w: videoWidth * 0.14,
            h: videoHeight * 0.32,
            color: '#DC2626',
            severity: 'CRITICAL',
            isHazard: true,
            extra: 'HOUSING SHATTERED'
          }
        ];

      case 'SCHOOL_ZONE':
        return [
          {
            id: 'det-speed-violation',
            label: 'SCHOOL ZONE SPEEDING (62 km/h)',
            category: 'violation',
            confidence: 0.95,
            x: videoWidth * 0.42 + jitterX * 0.5,
            y: videoHeight * 0.35,
            w: videoWidth * 0.22,
            h: videoHeight * 0.30,
            color: '#8B5CF6',
            severity: 'HIGH',
            isHazard: true,
            extra: 'PLATE: TN-07-BP-9921'
          }
        ];

      case 'HIT_AND_RUN':
        return [
          {
            id: 'det-hit-run',
            label: 'HIT-AND-RUN (FLEEING VEHICLE)',
            category: 'crime',
            confidence: 0.96,
            x: videoWidth * 0.48 + jitterX * 0.8,
            y: videoHeight * 0.34,
            w: videoWidth * 0.26,
            h: videoHeight * 0.38,
            color: '#DC2626',
            severity: 'EMERGENCY',
            isHazard: true,
            extra: 'PLATE: TN-09-CB-4491 (94%)'
          }
        ];

      default:
        return [
          {
            id: 'det-car-1',
            label: 'CAR',
            category: 'vehicle',
            confidence: 0.94,
            x: videoWidth * 0.58 + jitterX,
            y: videoHeight * 0.46,
            w: videoWidth * 0.18,
            h: videoHeight * 0.22,
            color: '#2563EB'
          }
        ];
    }
  }
}
