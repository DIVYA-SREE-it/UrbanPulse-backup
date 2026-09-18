import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { EdgeCameraPanels } from '../components/camera/EdgeCameraPanels';
import { VideoUploadPanel } from '../components/camera/VideoUploadPanel';
import { WebcamStream } from '../components/camera/WebcamStream';
import { YoloStatsPanel } from '../components/camera/YoloStatsPanel';
import { DetectionClassList } from '../components/camera/DetectionClassList';
import { useUrbanPulse } from '../context/UrbanPulseContext';

export function LiveCameraPage() {
  const { buses, addNewDetection, setSelectedReport } = useUrbanPulse();
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState('BUS-104');
  const [selectedCam, setSelectedCam] = useState('FRONT-CAM-01');
  const [activeScenario, setActiveScenario] = useState('WATERLOGGING');

  const handleSimulateScenario = () => {
    const scenarioMap = {
      WATERLOGGING: {
        title: 'Severe Metro Flyover Road Inundation (Water Depth: 22cm)',
        type: 'waterlogging',
        severity: 'CRITICAL',
        department: 'Greater Chennai Corporation',
        division: 'Storm Water Drain (SWD) Cell',
        deptId: 'GCC-SWD',
        location: 'Perungudi - Toll Plaza Underpass (OMR)',
        waterDepthCm: 22,
        confidence: 0.96,
        impactScore: 95,
        evidenceImg: '/evidence/waterlogging_metro_junction.jpg'
      },
      WATER_HIGHWAY: {
        title: 'Highway Inundation & Deep Road Puddle (Depth: 18cm)',
        type: 'waterlogging',
        severity: 'HIGH',
        department: 'Greater Chennai Corporation',
        division: 'Storm Water Drain (SWD) Cell',
        deptId: 'GCC-SWD',
        location: 'Velachery 100ft Bypass Road',
        waterDepthCm: 18,
        confidence: 0.95,
        impactScore: 91,
        evidenceImg: '/evidence/waterlogging_highway_car.jpg'
      },
      WATER_NIGHT: {
        title: 'Night Monsoon Road Inundation & Barricade Flooding',
        type: 'waterlogging',
        severity: 'HIGH',
        department: 'Greater Chennai Corporation',
        division: 'Storm Water Drain (SWD) Cell',
        deptId: 'GCC-SWD',
        location: 'Koyambedu Wholesale Market Entrance',
        waterDepthCm: 16,
        confidence: 0.94,
        impactScore: 88,
        evidenceImg: '/evidence/waterlogging_night_inundation.jpg'
      },
      WATER_CRATERS: {
        title: 'Water-Filled Asphalt Potholes & Muddy Puddles (Depth: 15cm)',
        type: 'pothole',
        severity: 'CRITICAL',
        department: 'Greater Chennai Corporation',
        division: 'Roads & Infrastructure',
        deptId: 'GCC-ROADS',
        location: 'Sholinganallur Junction - Near ELCOT SEZ',
        depthCm: 15,
        widthCm: 85,
        confidence: 0.96,
        impactScore: 94,
        evidenceImg: '/evidence/waterlogging_craters_puddle.jpg'
      },
      POTHOLE: {
        title: 'Severe Asphalt Potholes & Road Craters (Center Lane)',
        type: 'pothole',
        severity: 'HIGH',
        department: 'Greater Chennai Corporation',
        division: 'Roads & Infrastructure',
        deptId: 'GCC-ROADS',
        location: 'OMR - Sholinganallur Corridor',
        depthCm: 16,
        widthCm: 75,
        confidence: 0.96,
        impactScore: 92,
        evidenceImg: '/evidence/pothole_asphalt_main.jpg'
      },
      ROAD_DAMAGE: {
        title: 'Edge Shoulder Damage & Asphalt Crumbling',
        type: 'road_damage',
        severity: 'CRITICAL',
        department: 'Greater Chennai Corporation',
        division: 'Roads & Infrastructure',
        deptId: 'GCC-ROADS',
        location: 'Velachery Vijayanagar 100ft Road',
        depthCm: 12,
        widthCm: 110,
        confidence: 0.94,
        impactScore: 89,
        evidenceImg: '/evidence/edge_shoulder_damage.jpg'
      },
      CRACK: {
        title: 'Longitudinal Road Fracture & Curve Damage',
        type: 'road_damage',
        severity: 'HIGH',
        department: 'Tamil Nadu Highways & Minor Ports',
        division: 'Chennai Metropolitan Circle',
        deptId: 'TN-HIGHWAYS',
        location: 'GST Road Expressway Curve',
        depthCm: 8,
        widthCm: 180,
        confidence: 0.95,
        impactScore: 85,
        evidenceImg: '/evidence/longitudinal_road_crack.jpg'
      },
      SPEED_BREAKER: {
        title: 'Speed Breaker Strip & Road Marking Detection',
        type: 'damaged_signboard',
        severity: 'MEDIUM',
        department: 'Greater Chennai Traffic Police',
        division: 'Traffic Safety & Markings',
        deptId: 'GCTP-SIGNALS',
        location: 'Anna Salai Near Spencers Plaza',
        confidence: 0.97,
        impactScore: 68,
        evidenceImg: '/evidence/speed_breaker_marking.jpg'
      },
      SIGNAL: {
        title: 'Traffic Signal Non-Functional (Red Aspect Dark)',
        type: 'damaged_signal',
        severity: 'CRITICAL',
        department: 'Greater Chennai Traffic Police',
        division: 'Signals & ITMS Wing',
        deptId: 'GCTP-SIGNALS',
        location: 'Kathipara Junction Approach',
        confidence: 0.89,
        impactScore: 88
      },
      SCHOOL_ZONE: {
        title: 'School Zone Speed Violation (62 km/h in 25 zone)',
        type: 'school_zone_violation',
        severity: 'HIGH',
        department: 'Greater Chennai Traffic Police',
        division: 'Traffic Enforcement',
        deptId: 'GCTP-ENFORCE',
        location: 'Chettinad Vidyashram School Gate',
        numberPlate: 'TN-07-BP-9921',
        confidence: 0.95,
        impactScore: 86
      },
      HIT_AND_RUN: {
        title: 'Hit-and-Run Collision with Fleeing Vehicle',
        type: 'hit_and_run',
        severity: 'EMERGENCY',
        department: 'Greater Chennai Traffic Police',
        division: 'Special Crime Unit',
        deptId: 'GCTP-CRIME',
        location: 'OMR Navallur Expressway',
        numberPlate: 'TN-09-CB-4491',
        confidence: 0.96,
        impactScore: 99
      }
    };

    const config = scenarioMap[activeScenario] || scenarioMap.WATERLOGGING;
    const newReport = addNewDetection({
      ...config,
      title: `[SIMULATED] ${config.title}`,
      detectionSource: 'SIMULATED_SCENARIO',
      gpsSource: 'SIMULATED_ROUTE',
      busId: selectedBusId,
      cameraId: selectedCam,
      lat: 12.9016 + (Math.random() - 0.5) * 0.02,
      lng: 80.2279 + (Math.random() - 0.5) * 0.02
    });

    if (newReport) {
      setSelectedReport(newReport);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            <span>Live Camera · Bus Edge Intelligence</span>
          </h1>
          <p className="text-xs text-slate-500">
            Two independent prerecorded bus cameras with local inference and structured event synchronization
          </p>
        </div>

        {/* Selectors apply only to legacy simulator, not the bus edge feeds. */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Simulator:</span>
          <select
            value={selectedBusId}
            onChange={(e) => setSelectedBusId(e.target.value)}
            className="p-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 outline-none focus:border-blue-600 shadow-xs"
          >
            {buses.slice(0, 10).map(b => (
              <option key={b.id} value={b.id}>{b.id} ({b.regNo})</option>
            ))}
          </select>

          <select
            value={selectedCam}
            onChange={(e) => setSelectedCam(e.target.value)}
            className="p-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 outline-none focus:border-blue-600 shadow-xs"
          >
            <option value="FRONT-CAM-01">FRONT-CAM-01 (1080p 60fps)</option>
            <option value="REAR-CAM-02">REAR-CAM-02 (1080p 30fps)</option>
            <option value="LEFT-CAM-03">LEFT-CAM-03 (Pavement/Curb)</option>
            <option value="RIGHT-CAM-04">RIGHT-CAM-04 (Lane Divider)</option>
            <option value="CABIN-CAM-05">CABIN-CAM-05 (Driver Safety)</option>
          </select>
        </div>
      </div>

      {/* Upload panel — feed custom videos to each edge camera */}
      <VideoUploadPanel />

      {/* Two live camera feeds */}
      <EdgeCameraPanels />

      {/* Legacy simulator (collapsed by default) */}
      <details
        onToggle={(e) => setLegacyOpen(e.currentTarget.open)}
        className="rounded-xl border border-slate-200 bg-white p-4"
      >
        <summary className="cursor-pointer text-sm font-bold text-slate-700">
          Existing scenario simulator &amp; legacy upload tools — illustrative data
        </summary>
        <p className="text-xs text-amber-700 my-3">
          Scenario boxes, depth, speed and plate values are simulated. These controls do not operate
          the two edge cameras above. Legacy uploads send frames to /predict.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {legacyOpen && (
              <WebcamStream
                activeScenario={activeScenario}
                selectedBusId={selectedBusId}
                selectedCam={selectedCam}
                onSnapshotTaken={() => {
                  handleSimulateScenario();
                }}
                onDetection={(detection) => {
                  // Throttle: max 1 call per 2 seconds
                  if (typeof window !== 'undefined') {
                    window.__UP_LAST_ON_DET = window.__UP_LAST_ON_DET || 0;
                    const t = Date.now();
                    if (t - window.__UP_LAST_ON_DET < 2000) return;
                    window.__UP_LAST_ON_DET = t;
                  }

                  const report = addNewDetection({
                    ...detection,
                    title: detection.title,
                    severity:
                      detection.confidence >= 0.85
                        ? 'HIGH'
                        : detection.confidence >= 0.65
                          ? 'MEDIUM'
                          : 'LOW',
                    location: `${selectedBusId} • Live camera detection`,
                    area: 'Live Road Monitoring',
                    busId: selectedBusId,
                    cameraId: selectedCam,
                    detectedAt:
                      detection.detectedAt || new Date().toISOString(),
                  });

                  console.log('📝 INCIDENT CREATED/UPDATED:', report);
                }}
              />
            )}

            <DetectionClassList />
          </div>

          <div className="lg:col-span-1">
            <YoloStatsPanel
              activeScenario={activeScenario}
              onSelectScenario={setActiveScenario}
              onSimulateDetection={handleSimulateScenario}
            />
          </div>
        </div>
      </details>
    </div>
  );
}