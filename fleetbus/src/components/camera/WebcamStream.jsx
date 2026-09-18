import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  Video,
  Upload,
  Play,
  Square,
  CameraOff,
  CheckCircle2,
  RefreshCw,
  ScanSearch,
  Loader2
} from 'lucide-react';

import { predictImage } from '../../services/detectionApi';


export function WebcamStream({
  activeScenario = 'POTHOLE',
  onSnapshotTaken = () => {},
  onDetection = () => {},
  selectedBusId = 'BUS-104',
  selectedCam = 'FRONT-CAM-01'
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const autoDetectionRef = useRef(false);
  const onDetectionRef = useRef(onDetection);
  const recentDetectionsRef = useRef(new Map());
  const pendingDetectionsRef = useRef(new Map());
  const simCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const resetDetectionMemory = () => {
  pendingDetectionsRef.current.clear();
  recentDetectionsRef.current.clear();
  setActiveBoxes([]);
  setLastDetectionCount(0);
};

  const [streamActive, setStreamActive] = useState(true);
  const [sourceType, setSourceType] = useState('simulated');
  const [videoError, setVideoError] = useState(false);
  const [isMuted] = useState(true);
  const [fps] = useState(25.4);

  // REAL YOLO DETECTIONS
  const [activeBoxes, setActiveBoxes] = useState([]);

  // API STATUS
  const [isDetecting, setIsDetecting] = useState(false);
  const [apiStatus, setApiStatus] = useState('READY');
  const [lastDetectionCount, setLastDetectionCount] = useState(0);

  const [snapshotAlert, setSnapshotAlert] = useState(false);

  useEffect(() => {
  onDetectionRef.current = onDetection;
}, [onDetection]);


  // --------------------------------------------------
  // SCENARIO IMAGES
  // --------------------------------------------------

  const scenarioImages = useRef({
    POTHOLE: new Image(),
    ROAD_DAMAGE: new Image(),
    CRACK: new Image(),
    SPEED_BREAKER: new Image(),
    WATERLOGGING: new Image(),
    WATER_HIGHWAY: new Image(),
    WATER_NIGHT: new Image(),
    WATER_CRATERS: new Image()
  }).current;


  useEffect(() => {
    scenarioImages.POTHOLE.src =
      '/evidence/pothole_asphalt_main.jpg';

    scenarioImages.ROAD_DAMAGE.src =
      '/evidence/edge_shoulder_damage.jpg';

    scenarioImages.CRACK.src =
      '/evidence/longitudinal_road_crack.jpg';

    scenarioImages.SPEED_BREAKER.src =
      '/evidence/speed_breaker_marking.jpg';

    scenarioImages.WATERLOGGING.src =
      '/evidence/waterlogging_metro_junction.jpg';

    scenarioImages.WATER_HIGHWAY.src =
      '/evidence/waterlogging_highway_car.jpg';

    scenarioImages.WATER_NIGHT.src =
      '/evidence/waterlogging_night_inundation.jpg';

    scenarioImages.WATER_CRATERS.src =
      '/evidence/waterlogging_craters_puddle.jpg';
  }, [scenarioImages]);


  // --------------------------------------------------
  // STOP STREAM
  // --------------------------------------------------

  const stopStream = () => {
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();

        tracks.forEach(track => track.stop());

        videoRef.current.srcObject = null;
      } else {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    }

    setStreamActive(false);
  };


  // --------------------------------------------------
  // START WEBCAM
  // --------------------------------------------------

  const startWebcam = async () => {
    stopStream();

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.play().catch(console.warn);

        setStreamActive(true);
        setSourceType('webcam');
        setVideoError(false);

        // Clear old detections
        resetDetectionMemory();
      }

    } catch (error) {
      console.warn(
        'Webcam not permitted. Falling back to simulation.',
        error
      );

      startSimulationMode();
    }
  };


  // --------------------------------------------------
  // START SIMULATION
  // --------------------------------------------------

  const startSimulationMode = () => {
    stopStream();

    setStreamActive(true);
    setSourceType('simulated');
    setVideoError(false);

    resetDetectionMemory();
  };


  // --------------------------------------------------
  // VIDEO UPLOAD
  // --------------------------------------------------

  const handleVideoUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    stopStream();

    const url = URL.createObjectURL(file);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.loop = true;

      videoRef.current
        .play()
        .catch(console.warn);

      setStreamActive(true);
      setSourceType('upload');
      setVideoError(false);

      resetDetectionMemory();
    }
  };


  // --------------------------------------------------
  // INITIALIZE SIMULATION
  // --------------------------------------------------

  useEffect(() => {
    startSimulationMode();

    return () => {
      stopStream();
    };
  }, []);


  // --------------------------------------------------
  // RENDER SIMULATED ROAD
  // --------------------------------------------------

  useEffect(() => {
    let animId;
    let frameCount = 0;


    const renderSimulatedRoad = () => {
      if (
        simCanvasRef.current &&
        streamActive &&
        (
          sourceType === 'simulated' ||
          videoError
        )
      ) {
        const canvas = simCanvasRef.current;
        const ctx = canvas.getContext('2d');

        const width = canvas.width;
        const height = canvas.height;

        frameCount++;

        const activeImg =
          scenarioImages[activeScenario];


        // REAL ROAD IMAGE
        if (
          activeImg &&
          activeImg.complete &&
          activeImg.naturalWidth > 0
        ) {

          ctx.drawImage(
            activeImg,
            0,
            0,
            width,
            height
          );


          // Camera scanline effect
          ctx.fillStyle =
            'rgba(0, 0, 0, 0.04)';

          for (
            let y = 0;
            y < height;
            y += 4
          ) {
            ctx.fillRect(
              0,
              y,
              width,
              1
            );
          }

        } else {

          // FALLBACK ROAD
          const speedOffset =
            (frameCount * 6) % 120;


          const skyGrad =
            ctx.createLinearGradient(
              0,
              0,
              0,
              height * 0.45
            );

          skyGrad.addColorStop(
            0,
            '#0F172A'
          );

          skyGrad.addColorStop(
            1,
            '#334155'
          );

          ctx.fillStyle = skyGrad;

          ctx.fillRect(
            0,
            0,
            width,
            height * 0.45
          );


          const roadGrad =
            ctx.createLinearGradient(
              0,
              height * 0.45,
              0,
              height
            );

          roadGrad.addColorStop(
            0,
            '#1E293B'
          );

          roadGrad.addColorStop(
            1,
            '#0F172A'
          );

          ctx.fillStyle =
            roadGrad;

          ctx.fillRect(
            0,
            height * 0.45,
            width,
            height * 0.55
          );


          ctx.strokeStyle =
            '#F59E0B';

          ctx.lineWidth = 5;


          for (
            let y = height * 0.45;
            y < height;
            y += 45
          ) {

            const p =
              (
                y -
                height * 0.45
              ) /
              (
                height * 0.55
              );


            const currentY =
              y +
              speedOffset * p;


            if (
              currentY < height
            ) {

              const dashH =
                20 *
                (
                  1 +
                  p * 2
                );


              ctx.beginPath();

              ctx.moveTo(
                width * 0.5,
                currentY
              );

              ctx.lineTo(
                width * 0.5,
                currentY +
                dashH
              );

              ctx.stroke();
            }
          }
        }


        // TIMESTAMP
        const now =
          new Date();


        ctx.fillStyle =
          '#60A5FA';

        ctx.font =
          'bold 12px monospace';


        ctx.fillText(
          `CAM-01 [1080p] ${now.toLocaleTimeString()}`,
          width - 260,
          24
        );
      }


      animId =
        requestAnimationFrame(
          renderSimulatedRoad
        );
    };


    if (streamActive) {
      animId =
        requestAnimationFrame(
          renderSimulatedRoad
        );
    }


    return () =>
      cancelAnimationFrame(
        animId
      );

  }, [
    streamActive,
    sourceType,
    videoError,
    activeScenario,
    scenarioImages
  ]);


  // --------------------------------------------------
  // DRAW REAL YOLO BOXES
  // --------------------------------------------------

  useEffect(() => {
    let animationFrameId;


    const renderOverlay = () => {

      if (
        canvasRef.current &&
        streamActive
      ) {

        const canvas =
          canvasRef.current;

        const ctx =
          canvas.getContext('2d');


        const video = videoRef.current;
        const width = video?.videoWidth || canvas.width || 1280;
        const height = video?.videoHeight || canvas.height || 720;

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }


        ctx.clearRect(
          0,
          0,
          width,
          height
        );


        activeBoxes.forEach(
          box => {

            const boxColor =
              '#EF4444';


            const x =
              box.x1;

            const y =
              box.y1;

            const w =
              box.x2 -
              box.x1;

            const h =
              box.y2 -
              box.y1;


            // BOX
            ctx.strokeStyle =
              boxColor;

            ctx.lineWidth = 3;

            ctx.strokeRect(
              x,
              y,
              w,
              h
            );


            // LABEL
            const labelText =
              `${box.class_name} ${(box.confidence * 100).toFixed(0)}%`;


            ctx.font =
              'bold 14px Arial';


            const textWidth =
              ctx.measureText(
                labelText
              ).width;


            ctx.fillStyle =
              boxColor;


            ctx.fillRect(
              x,
              y - 24,
              textWidth + 12,
              24
            );


            ctx.fillStyle =
              '#FFFFFF';


            ctx.fillText(
              labelText,
              x + 6,
              y - 7
            );
          }
        );
      }


      animationFrameId =
        requestAnimationFrame(
          renderOverlay
        );
    };


    if (streamActive) {
      animationFrameId =
        requestAnimationFrame(
          renderOverlay
        );
    }


    return () =>
      cancelAnimationFrame(
        animationFrameId
      );

  }, [
    streamActive,
    activeBoxes
  ]);


  // --------------------------------------------------
  // GET CURRENT FRAME AS IMAGE
  // --------------------------------------------------

  const captureCurrentFrame = () => {

    return new Promise(
      resolve => {

        const canvas =
          document.createElement(
            'canvas'
          );


        const video = videoRef.current;
        canvas.width = video?.videoWidth || 1280;
        canvas.height = video?.videoHeight || 720;


        const ctx =
          canvas.getContext('2d');


        if (
          sourceType === 'simulated' &&
          simCanvasRef.current
        ) {

          ctx.drawImage(
            simCanvasRef.current,
            0,
            0,
            canvas.width,
            canvas.height
          );

        } else if (
          videoRef.current
        ) {

          ctx.drawImage(
            videoRef.current,
            0,
            0,
            canvas.width,
            canvas.height
          );
        }


        canvas.toBlob(
          blob => resolve(blob),
          'image/jpeg',
          0.9
        );
      }
    );
  };


  // --------------------------------------------------
  // REAL BACKEND DETECTION
  // --------------------------------------------------

  const runRealDetection =
    async () => {

      if (!streamActive) {
        return;
      }


      try {

        setIsDetecting(true);

        setApiStatus(
          'DETECTING'
        );


        const imageBlob =
          await captureCurrentFrame();


        if (!imageBlob) {
          throw new Error(
            'Unable to capture camera frame'
          );
        }


        const response =
          await predictImage(
            imageBlob
          );


        const detections =
          response.detections || [];


        const formattedBoxes =
          detections.map(
            detection => ({
              class_id:
                detection.class_id,

              class_name:
                detection.class_name,

              confidence:
                detection.confidence,

              x1:
                detection.bounding_box.x1,

              y1:
                detection.bounding_box.y1,

              x2:
                detection.bounding_box.x2,

              y2:
                detection.bounding_box.y2
            })
          );


        setActiveBoxes(
          formattedBoxes
        );


        setLastDetectionCount(
          response.total_detections ||
          formattedBoxes.length
        );


        setApiStatus(
          'SUCCESS'
        );


      } catch (error) {

        console.error(
          'Detection failed:',
          error
        );


        setApiStatus(
          'ERROR'
        );


      } finally {

        setIsDetecting(
          false
        );
      }
    };

  // --------------------------------------------------
  // EVIDENCE + DUPLICATE FILTER
  // --------------------------------------------------

  const captureEvidenceFrame = (boxes) => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    boxes.forEach(box => {
      const x = box.x1;
      const y = box.y1;
      const w = box.x2 - box.x1;
      const h = box.y2 - box.y1;
      const label = `${box.class_name} ${(box.confidence * 100).toFixed(0)}%`;

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = Math.max(3, canvas.width / 500);
      ctx.strokeRect(x, y, w, h);

      ctx.font = `bold ${Math.max(14, canvas.width / 90)}px Arial`;
      const textWidth = ctx.measureText(label).width;
      const labelY = Math.max(0, y - 30);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(x, labelY, textWidth + 14, 28);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, x + 7, labelY + 20);
    });

    return canvas.toDataURL('image/jpeg', 0.82);
  };

  const emitDetectionEvents = (boxes) => {
  const now = Date.now();

  const EVENT_COOLDOWN_MS = 6000;
  const CONFIRM_WINDOW_MS = 3000;

  // Slightly more tolerant because this is a live video stream.
  const MIN_CONFIDENCE = 0.45;

  const typeMap = {
    pothole: 'pothole',
    speed_bump: 'speed_bump',
    unpaved_road: 'unpaved_road'
  };

  const validBoxes = boxes
  .map(box => ({
    ...box,
    normalizedClassName: String(box.class_name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
  }))
  .filter(
    box =>
      typeMap[box.normalizedClassName] &&
      Number(box.confidence) >= MIN_CONFIDENCE
  );

  if (validBoxes.length === 0) {
    return;
  }

  validBoxes.forEach(box => {
    const centerX = (box.x1 + box.x2) / 2;
    const centerY = (box.y1 + box.y2) / 2;

    /*
     * Spatial bucket prevents the same object from producing
     * multiple events while the camera is observing it.
     */
    const className = box.normalizedClassName;

const key =
  `${className}:` +
  `${Math.round(centerX / 100)}:` +
  `${Math.round(centerY / 100)}`;

    const previous =
      pendingDetectionsRef.current.get(key);

    // ---------------------------------------------
    // FIRST FRAME
    // ---------------------------------------------

    if (!previous) {
      pendingDetectionsRef.current.set(key, {
        timestamp: now,
        count: 1,
        bestBox: box
      });

      return;
    }

    // ---------------------------------------------
    // CONFIRMATION WINDOW EXPIRED
    // ---------------------------------------------

    if (
      now - previous.timestamp >
      CONFIRM_WINDOW_MS
    ) {
      pendingDetectionsRef.current.set(key, {
        timestamp: now,
        count: 1,
        bestBox: box
      });

      return;
    }

    // ---------------------------------------------
    // SECOND / SUBSEQUENT FRAME
    // ---------------------------------------------

    const bestBox =
      box.confidence >
      previous.bestBox.confidence
        ? box
        : previous.bestBox;

    const confirmedCount =
      previous.count + 1;

    pendingDetectionsRef.current.set(key, {
      timestamp: previous.timestamp,
      count: confirmedCount,
      bestBox
    });

    // Require two consecutive observations.
    if (confirmedCount < 2) {
      return;
    }

    // ---------------------------------------------
    // COOLDOWN
    // ---------------------------------------------

    const lastEmitted =
      recentDetectionsRef.current.get(key) || 0;

    if (
      now - lastEmitted <
      EVENT_COOLDOWN_MS
    ) {
      return;
    }

    recentDetectionsRef.current.set(
      key,
      now
    );

    // ---------------------------------------------
    // CREATE EVIDENCE
    // ---------------------------------------------

    const evidenceImg =
      captureEvidenceFrame([bestBox]);

    const type =
  typeMap[
    bestBox.normalizedClassName
  ];

    const detectionEvent = {
      type,

      title:
  `Live AI Detected: ${bestBox.normalizedClassName
    .replace(/_/g, ' ')
    .toUpperCase()}`,

      confidence:
        Number(bestBox.confidence),

      evidenceImg,

      boundingBox: {
        x1: bestBox.x1,
        y1: bestBox.y1,
        x2: bestBox.x2,
        y2: bestBox.y2
      },

      detectionSource:
        sourceType === 'upload'
          ? 'UPLOADED_VIDEO_AI'
          : sourceType === 'webcam'
          ? 'WEBCAM_AI'
          : 'LIVE_AI',

      busId: selectedBusId,

      cameraId: selectedCam,

      detectedAt:
        new Date().toISOString()
    };

    // ---------------------------------------------
    // IMPORTANT:
    // SEND REAL AI EVENT TO PARENT
    // ---------------------------------------------

    console.log(
      '🚨 LIVE AI INCIDENT CONFIRMED:',
      detectionEvent
    );

    onDetectionRef.current(
      detectionEvent
    );

    /*
     * Remove pending confirmation.
     *
     * recentDetectionsRef still remembers the event
     * so the same object cannot spam incidents.
     */
    pendingDetectionsRef.current.delete(key);
  });

  // ---------------------------------------------
  // CACHE CLEANUP
  // ---------------------------------------------

  for (
    const [key, value]
    of pendingDetectionsRef.current
  ) {
    if (
      now - value.timestamp >
      CONFIRM_WINDOW_MS * 2
    ) {
      pendingDetectionsRef.current.delete(key);
    }
  }

  for (
    const [key, timestamp]
    of recentDetectionsRef.current
  ) {
    if (
      now - timestamp >
      EVENT_COOLDOWN_MS * 3
    ) {
      recentDetectionsRef.current.delete(key);
    }
  }
};

  // --------------------------------------------------
  // AUTOMATIC LIVE AI DETECTION
  // --------------------------------------------------

  useEffect(() => {
    if (
      !streamActive ||
      !['webcam', 'upload'].includes(sourceType)
    ) {
      autoDetectionRef.current = false;
      return;
    }

    let cancelled = false;

    const detectContinuously = async () => {
      if (
        cancelled ||
        autoDetectionRef.current ||
        !videoRef.current
      ) {
        return;
      }

      if (
        videoRef.current.readyState < 2 ||
        videoRef.current.paused ||
        videoRef.current.ended
      ) {
        return;
      }

      autoDetectionRef.current = true;

      try {
        setIsDetecting(true);
        setApiStatus('DETECTING');

        const imageBlob =
          await captureCurrentFrame();

        if (!imageBlob || cancelled) {
          return;
        }

        const response =
          await predictImage(imageBlob);

        if (cancelled) {
          return;
        }

        const detections =
          response.detections || [];

        const formattedBoxes =
          detections.map(detection => ({
            class_id:
              detection.class_id,

            class_name:
              detection.class_name,

            confidence:
              detection.confidence,

            x1:
              detection.bounding_box.x1,

            y1:
              detection.bounding_box.y1,

            x2:
              detection.bounding_box.x2,

            y2:
              detection.bounding_box.y2
          }));

        setActiveBoxes(
          formattedBoxes
        );

        setLastDetectionCount(
          response.total_detections ||
          formattedBoxes.length
        );

        if (formattedBoxes.length > 0) {
          emitDetectionEvents(formattedBoxes);
        }

        setApiStatus('LIVE');
      } catch (error) {
        if (!cancelled) {
          console.error(
            'Automatic detection failed:',
            error
          );

          setApiStatus('ERROR');
        }
      } finally {
        setIsDetecting(false);
        autoDetectionRef.current = false;
      }
    };

    const intervalId =
      setInterval(
        detectContinuously,
        800
      );

    // Run immediately when the stream starts.
    detectContinuously();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      autoDetectionRef.current = false;
    };
  }, [
    streamActive,
    sourceType
  ]);

  // --------------------------------------------------
  // SNAPSHOT
  // --------------------------------------------------

  const takeSnapshot = () => {

    const canvas =
      document.createElement(
        'canvas'
      );


    canvas.width = 1280;
    canvas.height = 720;


    const ctx =
      canvas.getContext('2d');


    try {

      if (
        sourceType === 'simulated' &&
        simCanvasRef.current
      ) {

        ctx.drawImage(
          simCanvasRef.current,
          0,
          0,
          canvas.width,
          canvas.height
        );

      } else if (
        videoRef.current
      ) {

        ctx.drawImage(
          videoRef.current,
          0,
          0,
          canvas.width,
          canvas.height
        );
      }


      if (
        canvasRef.current
      ) {

        ctx.drawImage(
          canvasRef.current,
          0,
          0
        );
      }


      const dataUrl =
        canvas.toDataURL(
          'image/jpeg'
        );


      setSnapshotAlert(
        true
      );


      setTimeout(
        () =>
          setSnapshotAlert(
            false
          ),
        2500
      );


      onSnapshotTaken(
        dataUrl,
        activeScenario
      );

    } catch (error) {

      setSnapshotAlert(
        true
      );


      setTimeout(
        () =>
          setSnapshotAlert(
            false
          ),
        2500
      );


      onSnapshotTaken(
        null,
        activeScenario
      );
    }
  };


  return (

    <div className="bg-white rounded-card border border-slate-200 overflow-hidden shadow-subtle flex flex-col">


      {/* HEADER */}

      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">

        <div className="flex items-center gap-3">

          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">

            <Video className="w-4 h-4" />

          </div>


          <div>

            <div className="flex items-center gap-2">

              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">

                LIVE CAMERA FEED

              </h3>


              <span className="font-mono text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">

                {selectedBusId} / {selectedCam}

              </span>

            </div>


            <p className="text-[10px] text-slate-500 font-mono">

              Source: {sourceType.toUpperCase()} •
              1280×720 @ {fps} FPS

            </p>

          </div>

        </div>


        <div className="flex items-center gap-2">

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700">

            <span
              className={`w-2 h-2 rounded-full ${
                streamActive
                  ? 'bg-emerald-500 animate-ping'
                  : 'bg-red-500'
              }`}
            />


            <span>

              {streamActive
                ? 'LIVE'
                : 'STOPPED'}

            </span>

          </div>


          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            apiStatus === 'ERROR'
              ? 'bg-red-50 text-red-700 border-red-200'
              : apiStatus === 'SUCCESS'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}>

            AI: {apiStatus === 'LIVE' ? 'LIVE AI' : apiStatus}

          </span>

        </div>

      </div>


      {/* VIDEO AREA */}

      <div className="relative bg-slate-950 h-[430px] flex items-center justify-center overflow-hidden">


        <video
          ref={videoRef}
          playsInline
          muted={isMuted}
          onError={() =>
            setVideoError(true)
          }
          className={`w-full h-full object-cover ${
            streamActive &&
            sourceType !== 'simulated' &&
            !videoError
              ? 'block'
              : 'hidden'
          }`}
        />


        <canvas
          ref={simCanvasRef}
          width={1280}
          height={720}
          className={`w-full h-full object-cover ${
            streamActive &&
            (
              sourceType === 'simulated' ||
              videoError
            )
              ? 'block'
              : 'hidden'
          }`}
        />


        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className={`absolute inset-0 w-full h-full pointer-events-none ${
            streamActive
              ? 'block'
              : 'hidden'
          }`}
        />


        {!streamActive && (

          <div className="text-center text-slate-400 space-y-3 p-6">

            <CameraOff className="w-10 h-10 mx-auto" />

            <p className="text-sm font-bold text-slate-200">

              Camera Stream is Inactive

            </p>


            <button
              onClick={
                startSimulationMode
              }
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs"
            >

              Resume Live Feed

            </button>

          </div>

        )}


        {streamActive && (

          <>

            <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-sm border border-slate-700 p-2.5 rounded text-[11px] font-mono text-blue-400">

              <div>

                BUS:
                <span className="text-white font-bold">

                  {' '}
                  {selectedBusId}

                </span>

              </div>


              <div>

                DETECTIONS:
                <span className="text-white">

                  {' '}
                  {lastDetectionCount}

                </span>

              </div>

            </div>


            {snapshotAlert && (

              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">

                <div className="bg-white text-slate-900 px-5 py-3 rounded-xl border border-blue-500 font-bold text-sm flex items-center gap-2">

                  <CheckCircle2 className="w-5 h-5 text-blue-600" />

                  Snapshot Captured

                </div>

              </div>

            )}

          </>

        )}

      </div>


      {/* CONTROLS */}

      <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">


        <div className="flex flex-wrap items-center gap-2">


          {!streamActive ? (

            <button
              onClick={
                startSimulationMode
              }
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5"
            >

              <Play className="w-3.5 h-3.5" />

              START FEED

            </button>

          ) : (

            <button
              onClick={
                stopStream
              }
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs flex items-center gap-1.5"
            >

              <Square className="w-3.5 h-3.5" />

              PAUSE FEED

            </button>

          )}


          <button
            onClick={
              startSimulationMode
            }
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs flex items-center gap-1.5"
          >

            <RefreshCw className="w-3.5 h-3.5" />

            LIVE DASHCAM

          </button>


          <button
            onClick={
              startWebcam
            }
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs flex items-center gap-1.5"
          >

            <Camera className="w-3.5 h-3.5" />

            USE WEBCAM

          </button>


          <button
            onClick={() =>
              fileInputRef.current?.click()
            }
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs flex items-center gap-1.5"
          >

            <Upload className="w-3.5 h-3.5" />

            UPLOAD VIDEO

          </button>


          <input
            type="file"
            ref={fileInputRef}
            onChange={
              handleVideoUpload
            }
            accept="video/*"
            className="hidden"
          />

        </div>


        <div className="flex items-center gap-2">


          {/* REAL DETECT */}

          <button
            onClick={
              runRealDetection
            }
            disabled={
              !streamActive ||
              isDetecting
            }
            className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-extrabold text-xs hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
          >

            {isDetecting ? (

              <Loader2 className="w-4 h-4 animate-spin" />

            ) : (

              <ScanSearch className="w-4 h-4" />

            )}


            {isDetecting
              ? 'DETECTING...'
              : 'REAL DETECT'}

          </button>


          {/* SNAPSHOT */}

          <button
            onClick={
              takeSnapshot
            }
            disabled={
              !streamActive
            }
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-extrabold text-xs hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
          >

            <Camera className="w-3.5 h-3.5" />

            TAKE SNAPSHOT

          </button>

        </div>

      </div>

    </div>
  );
}