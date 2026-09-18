import React from 'react';
import { X, Bell, AlertTriangle, AlertCircle, Info, CheckCheck, ArrowRight } from 'lucide-react';
import { useUrbanPulse } from '../../context/UrbanPulseContext';

export function NotificationDrawer() {
  const {
    isNotificationOpen,
    setIsNotificationOpen,
    notifications,
    markAllNotificationsRead,
    detections,
    setSelectedReport
  } = useUrbanPulse();

  if (!isNotificationOpen) return null;

  const handleNotificationClick = (notif) => {
    if (notif.reportId) {
      const match = detections.find(d => d.id === notif.reportId);
      if (match) {
        setSelectedReport(match);
      }
    }
    setIsNotificationOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]">
      <div className="w-full max-w-md bg-white h-full shadow-modal border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">City Operations Alerts</h3>
              <p className="text-[11px] text-slate-500">Real-time edge notifications</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={markAllNotificationsRead}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Read all</span>
            </button>
            <button
              onClick={() => setIsNotificationOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bell className="w-8 h-8 mx-auto opacity-30 mb-2" />
              <p className="text-sm font-semibold">No active notifications</p>
            </div>
          ) : (
            notifications.map(notif => {
              const isCritical = notif.category === 'CRITICAL';
              const isWarning = notif.category === 'WARNING';
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-subtle ${
                    notif.unread
                      ? 'bg-blue-50/30 border-blue-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isCritical ? (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          isCritical
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : isWarning
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {notif.category}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {notif.time}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 mt-2">
                    {notif.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-blue-600 font-semibold">
                      {notif.reportId}
                    </span>
                    <span className="text-blue-600 font-bold flex items-center gap-1 hover:underline">
                      View Ticket <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
