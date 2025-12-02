/**
 * AnalyticsTabs Component
 * Tab navigation for the analytics dashboard
 * 
 * Note: AI tabs have been moved to Control Center → AI Usage
 */

import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Users, BookOpen, DollarSign, Activity, Target, BookMarked } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AnalyticsTab = 'overview' | 'users' | 'content' | 'exercises' | 'stories' | 'revenue' | 'performance';

interface TabConfig {
  id: AnalyticsTab;
  label: string;
  icon: LucideIcon;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: 'overview',
    label: 'Executive',
    icon: LayoutDashboard,
    description: 'High-level business metrics & retention',
  },
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    description: 'Growth, retention & engagement',
  },
  {
    id: 'content',
    label: 'Lessons',
    icon: BookOpen,
    description: 'Lesson analytics & completion rates',
  },
  {
    id: 'stories',
    label: 'Stories',
    icon: BookMarked,
    description: 'Reading depth & engagement',
  },
  {
    id: 'exercises',
    label: 'Exercises',
    icon: Target,
    description: 'Success rates by exercise type',
  },
  {
    id: 'revenue',
    label: 'Revenue',
    icon: DollarSign,
    description: 'Subscriptions & billing',
  },
  {
    id: 'performance',
    label: 'System',
    icon: Activity,
    description: 'API & system health',
  },
];

interface AnalyticsTabsProps {
  activeTab: AnalyticsTab;
  onTabChange: (tab: AnalyticsTab) => void;
  className?: string;
}

export function AnalyticsTabs({ activeTab, onTabChange, className }: AnalyticsTabsProps) {
  return (
    <div className={cn("flex gap-1 p-1 bg-gray-100 rounded-xl", className)}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              isActive
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
            title={tab.description}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { TABS };

