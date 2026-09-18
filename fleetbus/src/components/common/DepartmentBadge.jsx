import React from 'react';
import { Building2, ShieldAlert, Radio, Wrench } from 'lucide-react';

export function DepartmentBadge({ department, division }) {
  let icon = <Building2 className="w-3.5 h-3.5 text-blue-600" />;
  let tagColor = 'bg-blue-50 text-blue-900 border-blue-200';

  if (department?.includes('Police') || department?.includes('Traffic')) {
    icon = <ShieldAlert className="w-3.5 h-3.5 text-red-600" />;
    tagColor = 'bg-red-50 text-red-900 border-red-200';
  } else if (department?.includes('Highways')) {
    icon = <Wrench className="w-3.5 h-3.5 text-amber-600" />;
    tagColor = 'bg-amber-50 text-amber-900 border-amber-200';
  } else if (department?.includes('Storm') || department?.includes('Water')) {
    icon = <Radio className="w-3.5 h-3.5 text-sky-600" />;
    tagColor = 'bg-sky-50 text-sky-900 border-sky-200';
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${tagColor}`}>
      {icon}
      <div className="flex flex-col text-left">
        <span className="font-bold leading-tight text-slate-900">{department}</span>
        {division && <span className="text-[10px] text-slate-500 leading-tight">{division}</span>}
      </div>
    </div>
  );
}
