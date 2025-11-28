/**
 * DateRangePicker Component
 * Provides preset date ranges and custom range selection
 * 
 * 142 LOC
 */

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DateRangePreset = '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  from: string; // ISO date (YYYY-MM-DD)
  to: string;
  preset: DateRangePreset;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const PRESET_LABELS: Record<DateRangePreset, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  'custom': 'Custom range',
};

function getPresetDates(preset: DateRangePreset): { from: string; to: string } {
  const to = new Date();
  const from = new Date();

  switch (preset) {
    case '7d':
      from.setDate(from.getDate() - 7);
      break;
    case '30d':
      from.setDate(from.getDate() - 30);
      break;
    case '90d':
      from.setDate(from.getDate() - 90);
      break;
    case 'custom':
      // Keep current values for custom
      break;
  }

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(value.preset === 'custom');

  const handlePresetClick = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      const dates = getPresetDates(preset);
      onChange({ ...dates, preset });
      setIsOpen(false);
    }
  };

  const handleCustomDateChange = (field: 'from' | 'to', date: string) => {
    onChange({
      ...value,
      [field]: date,
      preset: 'custom',
    });
  };

  const formatDisplayLabel = (): string => {
    if (value.preset !== 'custom') {
      return PRESET_LABELS[value.preset];
    }
    return `${value.from} → ${value.to}`;
  };

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-purple-500 focus:border-transparent"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">{formatDisplayLabel()}</span>
        <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Presets */}
          <div className="p-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase px-2 mb-2">Quick select</p>
            <div className="space-y-1">
              {(['7d', '30d', '90d'] as DateRangePreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                    value.preset === preset
                      ? "bg-purple-100 text-purple-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  {PRESET_LABELS[preset]}
                </button>
              ))}
              <button
                onClick={() => handlePresetClick('custom')}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                  value.preset === 'custom'
                    ? "bg-purple-100 text-purple-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                Custom range
              </button>
            </div>
          </div>

          {/* Custom Date Inputs */}
          {showCustom && (
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={value.from}
                  onChange={(e) => handleCustomDateChange('from', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={value.to}
                  onChange={(e) => handleCustomDateChange('to', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Helper: Get default date range (last 30 days)
 */
export function getDefaultDateRange(): DateRange {
  const dates = getPresetDates('30d');
  return { ...dates, preset: '30d' };
}

