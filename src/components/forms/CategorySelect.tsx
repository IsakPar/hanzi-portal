/**
 * CategorySelect
 * 
 * Reusable dropdown for selecting vocabulary category.
 */

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const COMMON_CATEGORIES = [
  'greetings',
  'pronouns', 
  'numbers',
  'time',
  'family',
  'food',
  'clothing',
  'colors',
  'body',
  'animals',
  'nature',
  'weather',
  'places',
  'directions',
  'transportation',
  'verbs',
  'adjectives',
  'adverbs',
  'conjunctions',
  'particles',
  'measure-words',
  'questions',
  'emotions',
  'school',
  'work',
  'sports',
  'hobbies',
  'technology',
  'proper_noun', // Names, places, etc. - excluded from vocab practice & smart layer
  'other',
] as const;

export type VocabCategory = typeof COMMON_CATEGORIES[number];

// Category colors for badges
const CATEGORY_COLORS: Record<string, string> = {
  greetings: 'bg-pink-100 text-pink-700',
  pronouns: 'bg-purple-100 text-purple-700',
  numbers: 'bg-blue-100 text-blue-700',
  time: 'bg-indigo-100 text-indigo-700',
  family: 'bg-red-100 text-red-700',
  food: 'bg-orange-100 text-orange-700',
  verbs: 'bg-green-100 text-green-700',
  adjectives: 'bg-teal-100 text-teal-700',
  proper_noun: 'bg-amber-100 text-amber-700', // Names, places - excluded from practice
  other: 'bg-gray-100 text-gray-700',
};

interface CategorySelectProps {
  value: string;
  onChange: (category: string) => void;
  label?: string;
  placeholder?: string;
  showBadge?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CategorySelect({
  value,
  onChange,
  label = 'Category',
  placeholder = 'Select category...',
  showBadge = false,
  required = false,
  disabled = false,
  className = '',
}: CategorySelectProps) {
  return (
    <div className={className}>
      {label && (
        <Label className="text-gray-700 flex items-center gap-2">
          {label}
          {required && <span className="text-red-500">*</span>}
          {showBadge && value && (
            <CategoryBadge category={value} />
          )}
        </Label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
      >
        <option value="">{placeholder}</option>
        {COMMON_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {formatCategoryName(category)}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Format category name for display (capitalize, replace hyphens)
 */
export function formatCategoryName(category: string): string {
  return category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Category badge component
 */
export function CategoryBadge({ category }: { category: string }) {
  const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', colorClass)}>
      {formatCategoryName(category)}
    </span>
  );
}

export default CategorySelect;

