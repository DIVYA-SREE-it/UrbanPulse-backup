import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendType = 'up',
  icon: Icon,
  variant = 'default',
  badgeText,
  onClick
}) {
  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';
  const isSuccess = variant === 'success' || variant === 'brand';

  const getIconStyle = () => {
    if (isDanger) return 'bg-red-50 text-red-600 border border-red-100';
    if (isWarning) return 'bg-amber-50 text-amber-600 border border-amber-100';
    if (isSuccess) return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
    return 'bg-blue-50 text-blue-600 border border-blue-100';
  };

  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-card bg-white border border-slate-200 transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-blue-400 hover:shadow-card' : 'shadow-subtle'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              {value}
            </span>
            {badgeText && (
              <span
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                  isDanger
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {badgeText}
              </span>
            )}
          </div>
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-lg ${getIconStyle()}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
          {subtitle && (
            <span className="text-slate-500 font-medium text-[11px]">
              {subtitle}
            </span>
          )}
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 font-bold text-[11px] ${
                trendType === 'up' ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {trendType === 'up' ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
