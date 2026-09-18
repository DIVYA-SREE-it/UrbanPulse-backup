import React from 'react';
import { DETECTION_CLASSES_LIST } from '../../data/detectionsData';
import { Tag } from 'lucide-react';

export function DetectionClassList() {
  return (
    <div className="bg-white rounded-card border border-slate-200 p-4 shadow-subtle space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-blue-600" />
          Supported YOLOv11 Detection Classes ({DETECTION_CLASSES_LIST.length})
        </h3>
        <span className="text-[11px] text-slate-400 font-mono">COCO + Custom Urban Core</span>
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
        {DETECTION_CLASSES_LIST.map(cls => (
          <span
            key={cls.name}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border bg-slate-50 text-slate-700 border-slate-200"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: cls.color === '#A8E63D' || cls.color === '#55A65B' ? '#16A34A' : cls.color }}
            />
            <span>{cls.label}</span>
            <span className="text-[9px] text-slate-400 font-mono">[{cls.category}]</span>
          </span>
        ))}
      </div>
    </div>
  );
}
