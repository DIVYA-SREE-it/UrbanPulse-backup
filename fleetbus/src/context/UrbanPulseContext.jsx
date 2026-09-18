import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CHENNAI_FLEET } from '../data/busesData';
import { INITIAL_ALL_DETECTIONS } from '../data/detectionsData';
import { DEPARTMENTS } from '../data/departmentsData';
import { updateBusCoordinate } from '../utils/geoUtils';
import { getAutoAssignedDepartment, generateReportId } from '../utils/workflowEngine';

import { CENTRAL_URL, readJson, eventToDetection } from '../services/edgeApi';

const UrbanPulseContext = createContext(null);

// Calculate approximate distance between two GPS coordinates in meters
function distanceInMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;

  const toRadians = degrees => degrees * Math.PI / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) ** 2;

  const c =
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function UrbanPulseProvider({ children }) {
  const [buses, setBuses] = useState(CHENNAI_FLEET);
  const [detections, setDetections] = useState(INITIAL_ALL_DETECTIONS.map(d => ({ ...d, title: `[SAMPLE] ${d.title}`, detectionSource: 'SEEDED_DEMO' })));
  const [departments, setDepartments] = useState(DEPARTMENTS);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedBus, setSelectedBus] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Real-time notification queue
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: '[SAMPLE] Hit-and-Run Incident Alert',
      message: 'Bus-104 detected vehicle collision on OMR Sholinganallur. ANPR identified TN-09-CB-4491.',
      category: 'CRITICAL',
      time: 'Just now',
      timestamp: Date.now(),
      unread: true,
      reportId: 'INC-901'
    },
    {
      id: 'notif-2',
      title: '[SAMPLE] Critical Pothole Detected',
      message: 'Bus-118 identified 18cm deep crater at Guindy Kathipara underpass.',
      category: 'WARNING',
      time: '9 min ago',
      timestamp: Date.now() - 9 * 60000,
      unread: true,
      reportId: 'PH-1043'
    },
    {
      id: 'notif-3',
      title: '[SAMPLE] School Zone Speed Violation',
      message: 'Bus-205 recorded vehicle speeding at 58 km/h outside DAV Public School.',
      category: 'WARNING',
      time: '8 min ago',
      timestamp: Date.now() - 8 * 60000,
      unread: true,
      reportId: 'SZV-701'
    },
    {
      id: 'notif-4',
      title: '[SAMPLE] Waterlogging Inundation Alert',
      message: 'Perungudi Toll plaza left lanes submerged (22cm depth). GCC SWD dispatched.',
      category: 'CRITICAL',
      time: '4 min ago',
      timestamp: Date.now() - 4 * 60000,
      unread: true,
      reportId: 'WL-3012'
    },
    {
      id: 'notif-5',
      title: '[SAMPLE] Department Action Resolved',
      message: 'Anna Salai Nandanam trench repair completed by GCC Rapid Squad.',
      category: 'INFO',
      time: '25 min ago',
      timestamp: Date.now() - 25 * 60000,
      unread: false,
      reportId: 'PH-1046'
    }
  ]);

  const [centralConnection, setCentralConnection] = useState('connecting');
  const eventCursor = useRef(Number(localStorage.getItem('up_event_cursor') || 0));
  const seenEdgeEvents = useRef(
    new Set(JSON.parse(localStorage.getItem('up_seen_events') || '[]'))
  );

  // Central events are already deduplicated and geolocated at the edge.
  // Do not pass them through the legacy random-bus/fallback-confidence builder.
  useEffect(() => {
    let cancelled = false, timer;

    // Throttle: remember last time we created notifications from a poll cycle
    let lastNotifTime = 0;
    const NOTIF_COOLDOWN_MS = 5000;   // at most one batch of notif per 5s
    const MAX_NOTIFS_PER_CYCLE = 3;    // at most 3 notifications per poll

    async function pollEvents() {
      try {
        const page = await readJson(
          `${CENTRAL_URL}/api/events?after=${eventCursor.current}&limit=200`
        );
        if (cancelled) return;

        const fresh = page.events.filter(
          (e) => !seenEdgeEvents.current.has(e.event_id)
        );
        fresh.forEach((e) => seenEdgeEvents.current.add(e.event_id));
        eventCursor.current = page.next_cursor;

        // Persist dedup state across reloads
        try {
          localStorage.setItem('up_event_cursor', String(eventCursor.current));
          // Keep the seen set bounded (last 2000 ids)
          const seenArr = Array.from(seenEdgeEvents.current).slice(-2000);
          localStorage.setItem('up_seen_events', JSON.stringify(seenArr));
        } catch { }

        if (fresh.length) {
          const records = fresh.map(eventToDetection).reverse();
          setDetections((prev) => [...records, ...prev]);

          // Only push notifications under strict conditions
          const now = Date.now();
          const cooldownOk = now - lastNotifTime >= NOTIF_COOLDOWN_MS;
          if (cooldownOk) {
            lastNotifTime = now;
            const notifsToAdd = records.slice(0, MAX_NOTIFS_PER_CYCLE).map((d) => ({
              id: `edge-${d.id}`,
              reportId: d.id,
              title: d.title,
              message:
                `${d.busId} / ${d.cameraId} · ${d.timestamp} · ${d.location}` +
                (d.vehicleCount != null ? ` · Vehicles: ${d.vehicleCount}` : '') +
                (d.trackId != null ? ` · Track #${d.trackId}` : ''),
              category: d.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
              time: new Date(d.timestamp).toLocaleTimeString(),
              timestamp: Date.parse(d.timestamp),
              unread: true,
            }));
            setNotifications((prev) =>
              [...notifsToAdd, ...prev].slice(0, 15)
            );
          }
        }

        setCentralConnection('connected');
        if (!cancelled) {
          timer = setTimeout(
            pollEvents,
            page.events.length === 200 ? 200 : 3000
          );
        }
      } catch {
        if (!cancelled) {
          setCentralConnection('offline');
          timer = setTimeout(pollEvents, 5000);
        }
      }
    }

    pollEvents();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  // Derived category lists
  const potholes = detections.filter(d => d.type === 'pothole' || d.type === 'road_damage');
  const waterlogging = detections.filter(d => d.type === 'waterlogging');
  const trafficSignals = detections.filter(d => d.type === 'damaged_signal' || d.type === 'damaged_signboard' || d.type === 'missing_zebra_crossing');
  const schoolViolations = detections.filter(d => d.type === 'school_zone_violation');
  const incidents = detections.filter(d => ['hit_and_run', 'rash_driving', 'dangerous_overtaking', 'pedestrian_risk', 'traffic_congestion', 'red_light_violation', 'wrong_way_driving'].includes(d.type));

  // Live simulation tick every 6 seconds
  useEffect(() => {
    if (!simulationRunning) return;

    const interval = setInterval(() => {
      // 1. Move buses slightly along their route
      setBuses(prevBuses =>
        prevBuses.map(bus => {
          const newCoords = updateBusCoordinate(bus.lat, bus.lng, bus.heading, bus.speed);
          const jitterSpeed = Math.max(10, Math.min(55, bus.speed + Math.floor(Math.random() * 5 - 2)));
          return {
            ...bus,
            lat: newCoords.lat,
            lng: newCoords.lng,
            speed: jitterSpeed,
            lastUpdate: 'Just now'
          };
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [simulationRunning]);

  // Add a new detection from Live Camera / Edge AI
  const addNewDetection = (customData = {}) => {
    const type = customData.type || 'pothole';
    const deptInfo = getAutoAssignedDepartment(type);

    const selectedBus =
      customData.busId
        ? buses.find(bus => bus.id === customData.busId)
        : null;

    const randomBus =
      selectedBus ||
      buses[Math.floor(Math.random() * buses.length)];

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = now.toISOString().split('T')[0];

    const confidence =
      typeof customData.confidence === 'number'
        ? customData.confidence
        : 0.92;

    const severity =
      customData.severity ||
      (confidence >= 0.90 ? 'CRITICAL' : 'HIGH');

    const lat =
      customData.lat ??
      randomBus?.lat ??
      12.9016;

    const lng =
      customData.lng ??
      randomBus?.lng ??
      80.2279;

    /*
     * ---------------------------------------------------------
     * DUPLICATE / SAME-LOCATION INCIDENT DETECTION
     * ---------------------------------------------------------
     *
     * If the same type of road problem is already within
     * approximately 50 meters, treat this as another
     * observation of the same incident.
     */

    const existingIncident = detections.find(item => {
      if (item.type !== type) return false;

      /*
       * IMPORTANT:
       * Only cluster against incidents that were created
       * by the live AI pipeline.
       *
       * This prevents an old/static demo record from
       * swallowing a brand-new YOLO incident and preventing
       * its notification.
       */

      const source = item.detectionSource || '';

      const isLiveAiIncident =
        source === 'LIVE_AI' ||
        source === 'UPLOADED_VIDEO_AI' ||
        source === 'WEBCAM_AI';

      if (!isLiveAiIncident) {
        return false;
      }

      if (
        typeof item.lat !== 'number' ||
        typeof item.lng !== 'number'
      ) {
        return false;
      }

      const distance = distanceInMeters(
        lat,
        lng,
        item.lat,
        item.lng
      );

      return distance <= 50;
    });

    // ---------------------------------------------------------
    // EXISTING INCIDENT FOUND
    // ---------------------------------------------------------

    if (existingIncident) {
      const observation = {
        id: `obs-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,

        busId:
          customData.busId ||
          randomBus?.id ||
          'UNKNOWN-BUS',

        cameraId:
          customData.cameraId ||
          'FRONT-CAM-01',

        confidence,

        detectionSource:
          customData.detectionSource ||
          'LIVE_AI',

        evidenceImg:
          customData.evidenceImg ||
          null,

        boundingBox:
          customData.boundingBox ||
          null,

        detectedAt:
          customData.detectedAt ||
          now.toISOString(),

        timestamp:
          `${dateStr} ${timeStr}`
      };

      let updatedIncident = null;

      setDetections(prev =>
        prev.map(item => {
          if (item.id !== existingIncident.id) {
            return item;
          }

          const observations = [
            ...(item.observations || []),
            observation
          ];

          const highestConfidence = Math.max(
            item.confidence || 0,
            confidence
          );

          updatedIncident = {
            ...item,

            // Keep one incident ID
            id: item.id,

            // Increase number of independent observations
            observationCount: observations.length,

            observations,

            // Keep strongest AI confidence
            confidence: highestConfidence,

            // Remember latest detection
            lastDetectedAt:
              customData.detectedAt ||
              now.toISOString(),

            lastDetectedBy:
              customData.busId ||
              randomBus?.id ||
              'UNKNOWN-BUS',

            // Evidence can be updated with newer/better evidence
            evidenceImg:
              customData.evidenceImg ||
              item.evidenceImg,

            // Make the incident stronger when repeatedly confirmed
            severity:
              item.severity === 'CRITICAL' ||
                severity === 'CRITICAL'
                ? 'CRITICAL'
                : item.severity,

            statusHistory: [
              ...(item.statusHistory || []),
              {
                status: item.status,
                time: `${dateStr} ${timeStr}`,
                note:
                  `Additional AI observation received from ${customData.busId ||
                  randomBus?.id ||
                  'road camera'
                  }`
              }
            ]
          };

          return updatedIncident;
        })
      );

      /*
       * IMPORTANT:
       * Do NOT create another notification.
       *
       * The existing incident already generated an alert.
       * Repeated observations are simply attached to it.
       */

      return updatedIncident || existingIncident;
    }

    // ---------------------------------------------------------
    // NEW INCIDENT
    // ---------------------------------------------------------

    const newId =
      customData.id ||
      generateReportId(type);

    const newDetection = {
      id: newId,

      type,

      title:
        customData.title ||
        `Live AI Detected: ${type
          .replace(/_/g, ' ')
          .toUpperCase()}`,

      location:
        customData.location ||
        randomBus?.currentLocation ||
        'Live Road Monitoring',

      area:
        customData.area ||
        'OMR Corridor',

      lat,
      lng,

      severity,

      confidence,

      detectionSource:
        customData.detectionSource ||
        'LIVE_AI',

      boundingBox:
        customData.boundingBox ||
        null,

      detectedAt:
        customData.detectedAt ||
        now.toISOString(),

      lastDetectedAt:
        customData.detectedAt ||
        now.toISOString(),

      busId:
        customData.busId ||
        randomBus?.id ||
        'UNKNOWN-BUS',

      cameraId:
        customData.cameraId ||
        'FRONT-CAM-01',

      timestamp:
        customData.timestamp ||
        `${dateStr} ${timeStr}`,

      timeAgo: 'Just now',

      department:
        customData.department ||
        deptInfo.department,

      division:
        customData.division ||
        deptInfo.division,

      deptId:
        customData.deptId ||
        deptInfo.deptId,

      assignedOfficer:
        customData.assignedOfficer ||
        deptInfo.officer,

      // IMPORTANT:
      // New incidents begin at DETECTED.
      status:
        customData.status ||
        'DETECTED',

      statusHistory: [
        {
          status: 'DETECTED',
          time: `${dateStr} ${timeStr}`,
          note:
            customData.detectionSource === 'LIVE_AI'
              ? `YOLO AI detected ${type.replace(/_/g, ' ')} from live camera`
              : 'AI Edge inference tagged live detection'
        }
      ],

      // First observation
      observationCount: 1,

      observations: [
        {
          id: `obs-${Date.now()}`,

          busId:
            customData.busId ||
            randomBus?.id ||
            'UNKNOWN-BUS',

          cameraId:
            customData.cameraId ||
            'FRONT-CAM-01',

          confidence,

          detectionSource:
            customData.detectionSource ||
            'LIVE_AI',

          evidenceImg:
            customData.evidenceImg ||
            null,

          boundingBox:
            customData.boundingBox ||
            null,

          detectedAt:
            customData.detectedAt ||
            now.toISOString(),

          timestamp:
            `${dateStr} ${timeStr}`
        }
      ],

      evidenceImg:
        customData.evidenceImg ||
        null,

      evidenceCaptured:
        Boolean(customData.evidenceImg),

      ...customData
    };

    // Add the new incident
    setDetections(prev => [
      newDetection,
      ...prev
    ]);

    // ---------------------------------------------------------
    // ONLY NEW INCIDENTS CREATE NOTIFICATIONS
    // ---------------------------------------------------------

    const newNotif = {
      id:
        `notif-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,

      title:
        `LIVE AI: ${type
          .replace(/_/g, ' ')
          .toUpperCase()} DETECTED`,

      message:
        `${newDetection.busId} / ${newDetection.cameraId} detected ` +
        `${type.replace(/_/g, ' ')} with ` +
        `${Math.round(confidence * 100)}% confidence. ` +
        `Incident ${newId} created and assigned to ` +
        `${newDetection.department}.`,

      category:
        severity === 'CRITICAL' ||
          severity === 'EMERGENCY'
          ? 'CRITICAL'
          : 'WARNING',

      time: 'Just now',

      timestamp: Date.now(),

      unread: true,

      reportId: newId,
      type: type,
      busId: newDetection.busId,
      lat: newDetection.lat,
      lng: newDetection.lng

    };

    console.log(
      'LIVE AI → NEW INCIDENT → NOTIFICATION',
      {
        type,
        confidence,
        incidentId: newId,
        busId: newDetection.busId,
        cameraId: newDetection.cameraId,
        notification: newNotif
      }
    );

    // ============================================================
    // ULTRA-STRICT GLOBAL NOTIFICATION GATE
    // Only allow 1 notification every 5 seconds across the ENTIRE app.
    // Nothing can bypass this — no per-type, no per-bus, just time.
    // ============================================================
    if (typeof window !== 'undefined') {
      window.__UP_NOTIF_LAST = window.__UP_NOTIF_LAST || 0;
      const __t = Date.now();
      if (__t - window.__UP_NOTIF_LAST >= 5000) {
        window.__UP_NOTIF_LAST = __t;
        setNotifications(prev => [newNotif, ...prev].slice(0, 15));
      }
      // else: silently drop
    }

    return newDetection;
  };

  // ---------------------------------------------------------
  // STRICT INCIDENT WORKFLOW
  // ---------------------------------------------------------

  const WORKFLOW_TRANSITIONS = {
    DETECTED: 'VERIFIED',
    VERIFIED: 'ASSIGNED',
    ASSIGNED: 'IN PROGRESS',
    'IN PROGRESS': 'RESOLVED',
    RESOLVED: 'VERIFIED CLOSED'
  };

  const updateReportStatus = async (
    reportId,
    newStatus,
    note = '',
    assignedDept = null
  ) => {
    const edgeRecord = detections.find(d => d.id === reportId && d.edgeEvent);
    if (edgeRecord) {
      try {
        const event = await readJson(`${CENTRAL_URL}/api/events/${reportId}/status`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, note, department: assignedDept }),
        });
        const updated = eventToDetection(event);
        setDetections(prev => prev.map(d => d.id === reportId ? updated : d));
        setSelectedReport(prev => prev?.id === reportId ? updated : prev);
        return true;
      } catch (error) {
        window.alert(`Status was not saved: ${error.message}`);
        return false;
      }
    }

    const now = new Date();

    const timeStr =
      now.toTimeString().split(' ')[0];

    const dateStr =
      now.toISOString().split('T')[0];

    let transitionAccepted = false;
    let updatedIncident = null;

    setDetections(prev =>
      prev.map(item => {
        if (item.id !== reportId) {
          return item;
        }

        const currentStatus =
          item.status || 'DETECTED';

        const expectedNextStatus =
          WORKFLOW_TRANSITIONS[currentStatus];

        // ---------------------------------------------------
        // STRICT WORKFLOW TRANSITION
        // ---------------------------------------------------

        if (newStatus !== expectedNextStatus) {
          console.warn(
            `Invalid workflow transition: ${currentStatus} → ${newStatus}`
          );

          return item;
        }

        transitionAccepted = true;

        const updatedHistory = [
          ...(item.statusHistory || []),
          {
            status: newStatus,
            time: `${dateStr} ${timeStr}`,
            note:
              note ||
              `Incident moved from ${currentStatus} to ${newStatus}`
          }
        ];

        updatedIncident = {
          ...item,

          status: newStatus,

          statusHistory: updatedHistory
        };

        // ---------------------------------------------------
        // DEPARTMENT ASSIGNMENT
        // ---------------------------------------------------

        if (assignedDept) {
          updatedIncident.department =
            assignedDept.department ||
            item.department;

          updatedIncident.division =
            assignedDept.division ||
            item.division;

          updatedIncident.deptId =
            assignedDept.deptId ||
            item.deptId;
        }

        // ---------------------------------------------------
        // RESOLUTION DATA
        // ---------------------------------------------------

        if (newStatus === 'RESOLVED') {
          updatedIncident.resolutionDate =
            `${dateStr} ${timeStr}`;

          updatedIncident.resolvedBy =
            item.department ||
            'Field Action Team';

          updatedIncident.resolutionNote =
            note ||
            'Issue rectified by field team.';
        }

        // ---------------------------------------------------
        // FINAL VERIFICATION
        // ---------------------------------------------------

        if (newStatus === 'VERIFIED CLOSED') {
          updatedIncident.closedDate =
            `${dateStr} ${timeStr}`;

          updatedIncident.closedBy =
            item.department ||
            'Verification Team';

          updatedIncident.closureNote =
            note ||
            'Subsequent road observation verified that the issue has been resolved.';

          updatedIncident.resolutionDate =
            item.resolutionDate ||
            `${dateStr} ${timeStr}`;

          updatedIncident.resolutionNote =
            item.resolutionNote ||
            'Issue rectified and verified.';
        }

        // ---------------------------------------------------
        // UPDATE SELECTED REPORT
        // ---------------------------------------------------

        if (
          selectedReport &&
          selectedReport.id === reportId
        ) {
          setSelectedReport(updatedIncident);
        }

        return updatedIncident;
      })
    );

    // IMPORTANT:
    // Status changes do NOT create notifications.
    //
    // Notifications are created only when a NEW detection
    // becomes a NEW incident inside addNewDetection().
    //
    // This prevents:
    // DETECTED → VERIFIED
    // VERIFIED → ASSIGNED
    // ASSIGNED → IN PROGRESS
    // etc.
    // from flooding the notification panel.

    return transitionAccepted;
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const unreadNotifCount = notifications.filter(n => n.unread).length;

  return (
    <UrbanPulseContext.Provider
      value={{
        centralConnection,
        buses,
        detections,
        potholes,
        waterlogging,
        trafficSignals,
        schoolViolations,
        incidents,
        departments,
        notifications,
        unreadNotifCount,
        simulationRunning,
        setSimulationRunning,
        selectedReport,
        setSelectedReport,
        selectedBus,
        setSelectedBus,
        isSearchOpen,
        setIsSearchOpen,
        isNotificationOpen,
        setIsNotificationOpen,
        activeRoute,
        setActiveRoute,
        activeFilter,
        setActiveFilter,
        addNewDetection,
        updateReportStatus,
        markAllNotificationsRead
      }}
    >
      {children}
    </UrbanPulseContext.Provider>
  );
}

export function useUrbanPulse() {
  const context = useContext(UrbanPulseContext);
  if (!context) {
    throw new Error('useUrbanPulse must be used within an UrbanPulseProvider');
  }
  return context;
}
