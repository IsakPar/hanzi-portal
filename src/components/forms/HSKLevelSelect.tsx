/**
 * HSKLevelSelect
 * 
 * Reusable dropdown for selecting HSK level (1-9).
 */

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const HSK_LEVELS = [
  { value: 1, label: 'HSK 1', words: 500, color: 'bg-green-100 text-green-700' },
  { value: 2, label: 'HSK 2', words: 750, color: 'bg-blue-100 text-blue-700' },
  { value: 3, label: 'HSK 3', words: 1000, color: 'bg-yellow-100 text-yellow-700' },
  { value: 4, label: 'HSK 4', words: 1500, color: 'bg-orange-100 text-orange-700' },
  { value: 5, label: 'HSK 5', words: 2000, color: 'bg-red-100 text-red-700' },
  { value: 6, label: 'HSK 6', words: 2500, color: 'bg-purple-100 text-purple-700' },
  { value: 7, label: 'HSK 7+', words: 3000, color: 'bg-pink-100 text-pink-700' },
  { value: 8, label: 'HSK 8+', words: 4000, color: 'bg-indigo-100 text-indigo-700' },
  { value: 9, label: 'HSK 9+', words: 5000, color: 'bg-gray-800 text-white' },
] as const;

export type HSKLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface HSKLevelSelectProps {
  value: HSKLevel;
  onChange: (level: HSKLevel) => void;
  label?: string;
  showWordCount?: boolean;
  showBadge?: boolean;
  disabled?: boolean;
  className?: string;
}

export function HSKLevelSelect({
  value,
  onChange,
  label = 'HSK Level',
  showWordCount = false,
  showBadge = false,
  disabled = false,
  className = '',
}: HSKLevelSelectProps) {
  const currentLevel = HSK_LEVELS.find(l => l.value === value);

  return (
    <div className={className}>
      {label && (
        <Label className="text-gray-700 flex items-center gap-2">
          {label}
          {showBadge && currentLevel && (
            <span className={cn('text-xs px-1.5 py-0.5 rounded', currentLevel.color)}>
              {currentLevel.label}
            </span>
          )}
        </Label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as HSKLevel)}
        disabled={disabled}
        className="w-full px-3 py-2 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
      >
        {HSK_LEVELS.map((level) => (
          <option key={level.value} value={level.value}>
            {level.label}
            {showWordCount && ` (~${level.words} words)`}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Get HSK level badge component
 */
export function HSKBadge({ level }: { level: HSKLevel }) {
  const levelData = HSK_LEVELS.find(l => l.value === level);
  if (!levelData) return null;
  
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', levelData.color)}>
      {levelData.label}
    </span>
  );
}

export default HSKLevelSelect;

