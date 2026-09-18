import React, { useState } from 'react';
import {
  X,
  MapPin,
  Bus,
  Camera,
  Cpu,
  Calendar,
  Clock,
  ShieldCheck,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Download,
  FileCheck,
  Send,
  Navigation
} from 'lucide-react';
import { useUrbanPulse } from '../../context/UrbanPulseContext';
import { StatusBadge, SeverityBadge } from './StatusBadge';
import { DepartmentBadge } from './DepartmentBadge';
import { printCurrentReport, exportToCSV } from '../../utils/exportUtils';
import { DEPARTMENTS } from '../../data/departmentsData';

export function ReportModal() {
  const { selectedReport, setSelectedReport, updateReportStatus } = useUrbanPulse();
  const [newStatus, setNewStatus] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [showStatusChanger, setShowStatusChanger] = useState(false);

  if (!selectedReport) return null;

  const currentStatus = selectedReport.status || 'PENDING';
  const history = selectedReport.statusHistory || [
    { status: 'DETECTED', time: selectedReport.timestamp, note: 'AI Edge model identified defect' }
  ];

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!newStatus) return;

    let targetDept = null;
    if (selectedDeptId) {
      const d = DEPARTMENTS.find(dept => dept.id === selectedDeptId);
      if (d) {
        targetDept = {
          department: d.name,
          division: d.division,
          deptId: d.id
        };
      }
    }

    const saved = await updateReportStatus(selectedReport.id, newStatus, resolutionNote, targetDept);
    if (selectedReport.edgeEvent && !saved) return;
    setShowStatusChanger(false);
    setResolutionNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-card shadow-modal border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white font-mono font-bold text-sm shadow-xs">
              {selectedReport.id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  {selectedReport.title}
                </h2>
                <SeverityBadge severity={selectedReport.severity} />
                <StatusBadge status={selectedReport.status} />
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {selectedReport.location} ({selectedReport.lat?.toFixed(4)}°N, {selectedReport.lng?.toFixed(4)}°E)
              </p>
            </div>
          </div>

          {/* Action buttons & close */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${selectedReport.lat || 12.9016},${selectedReport.lng || 80.2279}`;
                window.open(url, '_blank');
              }}
              className="p-2 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1 text-xs font-bold"
              title="Open Location in Google Maps"
            >
              <Navigation className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Google Map</span>
            </button>
            <button
              onClick={() => printCurrentReport()}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Print Formal Report"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => exportToCSV([selectedReport], `${selectedReport.id}-dossier.csv`)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedReport(null)}
              className="p-2 rounded-lg bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 text-slate-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {selectedReport.edgeEvent && <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-slate-700 space-y-1">
            <p>{selectedReport.cameraId} · {selectedReport.gpsSource} · {selectedReport.timestamp}</p>
            {selectedReport.vehicleCount != null && <p>Vehicles: {selectedReport.vehicleCount} · Congestion: {selectedReport.congestionLevel || '—'}</p>}
            {selectedReport.trackId != null && <p>Track #{selectedReport.trackId} · {selectedReport.vehicleType}</p>}
            <p>{selectedReport.metadata?.method || selectedReport.metadata?.severity_basis}</p>
          </div>}
          {/* Grid of Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Detection Telemetry */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-600" />
                Edge AI Telemetry
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Confidence Score</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {Number.isFinite(selectedReport.confidence) ? `${Math.round(selectedReport.confidence * 100)}%` : 'Not calibrated (rule-based)'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Detecting Bus</span>
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                    {selectedReport.busId}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Camera Sensor</span>
                  <span className="font-mono font-medium text-slate-800">
                    {selectedReport.cameraId || 'FRONT-CAM-01'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Timestamp</span>
                  <span className="font-mono text-[11px] text-slate-800">
                    {selectedReport.timestamp}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Edge Inference</span>
                  <span className="font-medium text-slate-800">{selectedReport.edgeEvent ? `${selectedReport.metadata?.model || 'Unknown model'} · ${selectedReport.metadata?.inference_ms?.toFixed(1) ?? '—'} ms` : 'Legacy / sample telemetry'}</span>
                </div>
              </div>
            </div>

            {/* 2. Responsible Authority */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Government Nodal Agency
              </h4>
              <div className="space-y-2.5">
                <div>
                  <DepartmentBadge
                    department={selectedReport.department}
                    division={selectedReport.division}
                  />
                </div>
                <div className="text-xs space-y-1.5 pt-1">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Assigned Officer</span>
                    <span className="font-medium text-slate-800">
                      {selectedReport.assignedOfficer || 'Junior Engineer (Roads)'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Target SLA</span>
                    <span className="font-bold text-amber-600">Within 24 Hours</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Action Status</span>
                    <StatusBadge status={selectedReport.status} size="xs" />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Physical Diagnostics */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Impact & Diagnostics
              </h4>
              <div className="space-y-2 text-xs">
                {selectedReport.depthCm && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Estimated Depth</span>
                    <span className="font-bold text-red-600">{selectedReport.depthCm} cm</span>
                  </div>
                )}
                {selectedReport.waterDepthCm && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Water Depth</span>
                    <span className="font-bold text-sky-600">{selectedReport.waterDepthCm} cm</span>
                  </div>
                )}
                {selectedReport.numberPlate && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">ANPR Plate Detected</span>
                    <span className="font-mono font-black text-slate-900 bg-yellow-300 px-2 py-0.5 rounded border border-yellow-500">
                      {selectedReport.numberPlate}
                    </span>
                  </div>
                )}
                {selectedReport.vehicleDetails && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Suspect Vehicle</span>
                    <span className="font-medium text-slate-800">
                      {selectedReport.vehicleDetails.vehicleType}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Public Hazard Score</span>
                  <span className="font-bold text-slate-900">
                    {selectedReport.impactScore || 85} / 100
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Frame */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              Sensor Camera Evidence Frame (Bus Edge Captured)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 h-56 group">
                <img
                  src={selectedReport.evidenceImg || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'}
                  alt="Detection Evidence"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 bg-slate-900/80 text-blue-400 text-[10px] font-mono px-2 py-1 rounded backdrop-blur-sm border border-blue-500/30">
                  {selectedReport.busId} • {selectedReport.cameraId || 'FRONT-CAM-01'} • 1080p
                </div>
                <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-mono px-2 py-1 rounded">
                  CONFIDENCE: {Number.isFinite(selectedReport.confidence) ? `${Math.round(selectedReport.confidence * 100)}%` : 'Not calibrated (rule-based)'}
                </div>
              </div>

              {/* Resolution Note */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-900 mb-1.5">
                    Resolution Status & Field Notes
                  </h5>
                  {selectedReport.resolutionNote ? (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                      <div className="flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Resolved by: {selectedReport.resolvedBy || selectedReport.department}
                      </div>
                      <p>{selectedReport.resolutionNote}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Date: {selectedReport.resolutionDate}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Ticket is currently active in the municipal resolution pipeline. Field engineering squad will update completion photos upon asphalt leveling or repair.
                    </p>
                  )}
                </div>

                {/* Status Changer Button */}
                <div className="pt-4 mt-4 border-t border-slate-200">
                  <button
                    onClick={() => setShowStatusChanger(!showStatusChanger)}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>Update Resolution Status ({currentStatus})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Status Changer Form */}
          {showStatusChanger && (
            <form onSubmit={handleUpdateStatus} className="p-4 rounded-xl bg-white border-2 border-blue-500 space-y-4 shadow-subtle animate-in fade-in">
              <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Progress Workflow Lifecycle (Demonstration Mode)
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    required
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white font-medium outline-none focus:border-blue-600 text-slate-800"
                  >
                    <option value="">Select Status...</option>
                    <option value="DETECTED">1. DETECTED</option>
                    <option value="VERIFIED">2. VERIFIED</option>
                    <option value="ASSIGNED">3. ASSIGNED</option>
                    <option value="IN PROGRESS">4. IN PROGRESS</option>
                    <option value="RESOLVED">5. RESOLVED</option>
                    <option value="VERIFIED CLOSED">6. VERIFIED CLOSED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Reassign Department (Optional)</label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white font-medium outline-none focus:border-blue-600 text-slate-800"
                  >
                    <option value="">Keep current department</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.id}>{d.name} — {d.division}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Field Resolution Note</label>
                  <input
                    type="text"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="e.g. Surface patched and inspected"
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white font-medium outline-none focus:border-blue-600 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStatusChanger(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Save Transition
                </button>
              </div>
            </form>
          )}

          {/* Action History Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Action History & Audit Trail
            </h4>
            <div className="relative pl-6 border-l-2 border-blue-200 space-y-4">
              {history.map((step, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-600">
                      {step.status}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {step.time}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {step.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
