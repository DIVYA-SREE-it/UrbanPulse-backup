import React from 'react';

export function StatusBadge({ status, size = 'sm' }) {
  const getStyle = () => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'ASSIGNED':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'IN PROGRESS':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'RESOLVED':
      case 'VERIFIED CLOSED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DETECTED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'VERIFIED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getDotColor = () => {
    switch (status?.toUpperCase()) {
      case 'RESOLVED':
      case 'VERIFIED CLOSED':
        return 'bg-emerald-500';
      case 'IN PROGRESS':
        return 'bg-sky-500 animate-pulse';
      case 'ASSIGNED':
        return 'bg-blue-500';
      case 'PENDING':
        return 'bg-amber-500';
      default:
        return 'bg-slate-400';
    }
  };

  const sizeClass = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${getStyle()} ${sizeClass} tracking-wide uppercase`}>
      <span className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`} />
      {status || 'PENDING'}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  const getSeverityStyle = () => {
    switch (severity?.toUpperCase()) {
      case 'EMERGENCY':
      case 'CRITICAL':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityStyle()}`}>
      {severity || 'LOW'}
    </span>
  );
}
