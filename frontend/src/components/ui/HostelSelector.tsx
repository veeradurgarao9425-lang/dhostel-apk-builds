import React from 'react';
import { Building2 } from 'lucide-react';

export interface Hostel {
  hostel_id: number;
  hostel_name: string;
}

interface HostelSelectorProps {
  hostels: Hostel[];
  selectedHostelId: string;
  onSelect: (hostelId: string) => void;
  label?: string;
  description?: string;
  className?: string;
}

/**
 * Reusable hostel selector for Super Admin views.
 * Displays a Building2 icon + label on the left,
 * and a styled select dropdown on the right.
 */
export const HostelSelector: React.FC<HostelSelectorProps> = ({
  hostels,
  selectedHostelId,
  onSelect,
  label = 'Select Hostel',
  description = 'Choose a hostel to manage',
  className = '',
}) => {
  if (hostels.length === 0) return null;

  return (
    <div
      className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <Building2 className="h-5 w-5 text-cyan-600" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{label}</h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <select
        value={selectedHostelId}
        onChange={(e) => onSelect(e.target.value)}
        aria-label={label}
        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white text-slate-800 font-medium min-w-[280px]"
      >
        {hostels.map((h) => (
          <option key={h.hostel_id} value={h.hostel_id.toString()}>
            {h.hostel_name}
          </option>
        ))}
      </select>
    </div>
  );
};
