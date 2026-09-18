import React, { useState } from 'react';
import {
  Building2,
  Check,
  UserPlus,
  Play,
  Wrench,
  Lock,
  Search,
  Eye
} from 'lucide-react';

import {
  StatusBadge,
  SeverityBadge
} from '../components/common/StatusBadge';

import { useUrbanPulse } from '../context/UrbanPulseContext';
import { DEPARTMENTS } from '../data/departmentsData';
import { WORKFLOW_STAGES } from '../utils/workflowEngine';

const WORKFLOW_ACTIONS = {
  DETECTED: {
    label: 'VERIFY',
    nextStatus: 'VERIFIED',
    icon: Check,
    note: 'Incident verified by department review.'
  },

  VERIFIED: {
    label: 'ASSIGN',
    nextStatus: 'ASSIGNED',
    icon: UserPlus,
    note: 'Incident assigned to the responsible field department.'
  },

  ASSIGNED: {
    label: 'START WORK',
    nextStatus: 'IN PROGRESS',
    icon: Play,
    note: 'Field squad has started work on the reported issue.'
  },

  'IN PROGRESS': {
    label: 'RESOLVE',
    nextStatus: 'RESOLVED',
    icon: Wrench,
    note: 'Field inspection confirmed repair completed and road surface restored.'
  },

  RESOLVED: {
    label: 'VERIFY CLOSE',
    nextStatus: 'VERIFIED CLOSED',
    icon: Lock,
    note: 'Subsequent road observation verified that the issue has been resolved.'
  }
};

const WORKFLOW_ORDER = [
  'DETECTED',
  'VERIFIED',
  'ASSIGNED',
  'IN PROGRESS',
  'RESOLVED',
  'VERIFIED CLOSED'
];

function getWorkflowIndex(status) {
  const index = WORKFLOW_ORDER.indexOf(status || 'DETECTED');
  return index === -1 ? 0 : index;
}

export function DepartmentResponsePage() {
  const {
    detections,
    setSelectedReport,
    updateReportStatus
  } = useUrbanPulse();

  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [resolvingTicketId, setResolvingTicketId] = useState(null);
  const [resolutionNoteInput, setResolutionNoteInput] = useState('');

  const filteredTickets = detections.filter(d => {
    const matchDept =
      selectedDeptFilter === 'ALL' ||
      d.deptId === selectedDeptFilter ||
      d.department
        ?.toLowerCase()
        .includes(selectedDeptFilter.toLowerCase());

    const matchSearch =
      (d.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.location || '').toLowerCase().includes(search.toLowerCase());

    return matchDept && matchSearch;
  });

  const handleWorkflowAction = (item) => {
    const currentStatus = item.status || 'DETECTED';
    const action = WORKFLOW_ACTIONS[currentStatus];

    if (!action) return;

    if (action.nextStatus === 'RESOLVED') {
      setResolvingTicketId(item.id);
      setResolutionNoteInput('');
      return;
    }

    updateReportStatus(
      item.id,
      action.nextStatus,
      action.note
    );
  };

  const confirmResolution = () => {
    if (!resolvingTicketId) return;

    updateReportStatus(
      resolvingTicketId,
      'RESOLVED',
      resolutionNoteInput ||
        'Field inspection confirmed repair completed and road surface restored.'
    );

    setResolvingTicketId(null);
    setResolutionNoteInput('');
  };

  const renderWorkflowProgress = (status) => {
    const currentIndex = getWorkflowIndex(status);

    return (
      <div className="flex items-center gap-1 min-w-[250px]">
        {WORKFLOW_STAGES.map((stage, index) => {
          const completed = index < currentIndex;
          const current = index === currentIndex;

          return (
            <React.Fragment key={stage.key}>
              <div
                title={stage.label}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border ${
                  completed
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : current
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}
              >
                {completed ? '✓' : index + 1}
              </div>

              {index < WORKFLOW_STAGES.length - 1 && (
                <div
                  className={`h-px flex-1 ${
                    index < currentIndex
                      ? 'bg-emerald-400'
                      : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Government Department Response & SLA Work Orders</span>
          </h1>

          <p className="text-xs text-slate-500">
            Autonomous defect routing, inter-agency task queues, and verified closure lifecycle
          </p>
        </div>

        <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
            Workflow Controlled
          </span>
        </div>
      </div>

      {/* DEPARTMENT SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {DEPARTMENTS.slice(0, 4).map(dept => {
          const isSelected = selectedDeptFilter === dept.id;

          const departmentTickets = detections.filter(
            item =>
              item.deptId === dept.id ||
              item.department
                ?.toLowerCase()
                .includes(dept.id.toLowerCase())
          );

          const openCount = departmentTickets.filter(
            item =>
              item.status !== 'VERIFIED CLOSED'
          ).length;

          return (
            <div
              key={dept.id}
              onClick={() =>
                setSelectedDeptFilter(
                  isSelected ? 'ALL' : dept.id
                )
              }
              className={`p-4 rounded-card border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-50/70 border-blue-600 shadow-card'
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-subtle'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isSelected
                      ? 'text-blue-700'
                      : 'text-slate-500'
                  }`}
                >
                  {dept.shortName}
                </span>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  SLA {dept.avgResponseHours}h
                </span>
              </div>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {openCount}
                </span>

                <span className="text-xs text-slate-500">
                  open tickets
                </span>
              </div>

              <p className="text-[11px] mt-2 truncate text-slate-500">
                {dept.contactOfficer}
              </p>
            </div>
          );
        })}
      </div>

      {/* WORKFLOW VISUALIZER */}
      <div className="bg-white rounded-card border border-slate-200 p-4 shadow-subtle space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
              Standard Civic Resolution Lifecycle
            </h3>

            <p className="text-[10px] text-slate-500 mt-1">
              Every incident must pass through each controlled stage before closure.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {WORKFLOW_STAGES.map((wf, idx) => (
            <div
              key={wf.key}
              className={`p-2.5 rounded-xl border text-center ${
                idx === 0
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : idx === 1
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : idx === 2
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                  : idx === 3
                  ? 'bg-violet-50 border-violet-200 text-violet-900'
                  : idx === 4
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span className="font-bold text-xs block">
                {wf.label}
              </span>

              <span className="text-[10px] opacity-80 block leading-tight mt-0.5">
                {wf.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* TASK TABLE */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

            <input
              type="text"
              placeholder="Search Case ID, Location, Issue..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">
              Filter:{' '}
              <strong className="text-slate-800">
                {selectedDeptFilter}
              </strong>{' '}
              ({filteredTickets.length} tasks)
            </span>
          </div>
        </div>

        {/* RESOLUTION PANEL */}
        {resolvingTicketId && (
          <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-500 space-y-3 animate-in fade-in">

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-blue-900 uppercase">
                  Resolve Task: {resolvingTicketId}
                </h4>

                <p className="text-[10px] text-blue-700 mt-0.5">
                  This advances the incident from IN PROGRESS → RESOLVED.
                </p>
              </div>

              <button
                onClick={() => {
                  setResolvingTicketId(null);
                  setResolutionNoteInput('');
                }}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={resolutionNoteInput}
                onChange={e =>
                  setResolutionNoteInput(e.target.value)
                }
                placeholder="Enter field resolution notes..."
                className="flex-1 p-2 text-xs rounded-lg border border-slate-200 bg-white font-medium outline-none focus:border-blue-600"
                autoFocus
              />

              <button
                onClick={confirmResolution}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 flex items-center gap-1 shadow-xs"
              >
                <Check className="w-4 h-4" />
                Confirm Resolve
              </button>
            </div>
          </div>
        )}

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">

            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">CASE ID</th>
                <th className="py-2.5 px-3">ISSUE TITLE</th>
                <th className="py-2.5 px-3">LOCATION</th>
                <th className="py-2.5 px-3">DEPARTMENT</th>
                <th className="py-2.5 px-3">PRIORITY</th>
                <th className="py-2.5 px-3">WORKFLOW</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">
                  ACTIONS
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">

              {filteredTickets.map(item => {
                const currentStatus =
                  item.status || 'DETECTED';

                const action =
                  WORKFLOW_ACTIONS[currentStatus];

                const ActionIcon =
                  action?.icon || Eye;

                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedReport(item)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >

                    {/* CASE ID */}
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">
                      {item.id}
                    </td>

                    {/* ISSUE */}
                    <td className="py-3 px-3 max-w-[180px]">
                      <div className="truncate text-slate-900 font-semibold">
                        {item.title}
                      </div>

                      {item.observationCount > 1 && (
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {item.observationCount} AI observations
                        </div>
                      )}
                    </td>

                    {/* LOCATION */}
                    <td className="py-3 px-3 max-w-[150px] truncate text-slate-500">
                      {item.location}
                    </td>

                    {/* DEPARTMENT */}
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-medium text-slate-800">
                        {item.department || 'Unassigned'}
                      </span>

                      {item.division && (
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {item.division}
                        </div>
                      )}
                    </td>

                    {/* PRIORITY */}
                    <td className="py-3 px-3">
                      <SeverityBadge
                        severity={item.severity}
                      />
                    </td>

                    {/* WORKFLOW */}
                    <td className="py-3 px-3">
                      {renderWorkflowProgress(currentStatus)}
                    </td>

                    {/* STATUS */}
                    <td className="py-3 px-3">
                      <StatusBadge
                        status={currentStatus}
                        size="xs"
                      />
                    </td>

                    {/* ACTIONS */}
                    <td className="py-3 px-3 text-right">

                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={e => e.stopPropagation()}
                      >

                        <button
                          onClick={() =>
                            setSelectedReport(item)
                          }
                          className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 shadow-xs flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          VIEW
                        </button>

                        {action ? (
                          <button
                            onClick={() =>
                              handleWorkflowAction(item)
                            }
                            className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-bold shadow-xs flex items-center gap-1"
                          >
                            <ActionIcon className="w-3 h-3" />
                            {action.label}
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                            CLOSED
                          </span>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredTickets.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    className="py-12 text-center"
                  >
                    <div className="text-sm font-bold text-slate-500">
                      No department tasks found
                    </div>

                    <div className="text-xs text-slate-400 mt-1">
                      Try changing the department filter or search term.
                    </div>
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}