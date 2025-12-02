/**
 * Analytics Dashboard Page
 * Comprehensive analytics with tabbed navigation
 * 
 * Note: AI usage analytics have been moved to Control Center → AI Usage tab
 */

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AnalyticsTabs,
  DateRangePicker,
  getDefaultDateRange,
  OverviewTab,
  UsersTab,
  ContentTab,
  ExercisesTab,
  StoriesTab,
  RevenueTab,
  PerformanceTab,
} from "@/components/analytics";
import type { AnalyticsTab, DateRange } from "@/components/analytics";

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const renderTabContent = () => {
    const props = { dateRange, key: refreshKey };
    
    switch (activeTab) {
      case 'overview':
        return <OverviewTab {...props} />;
      case 'users':
        return <UsersTab {...props} />;
      case 'content':
        return <ContentTab {...props} />;
      case 'exercises':
        return <ExercisesTab {...props} />;
      case 'stories':
        return <StoriesTab {...props} />;
      case 'revenue':
        return <RevenueTab {...props} />;
      case 'performance':
        return <PerformanceTab {...props} />;
      default:
        return <OverviewTab {...props} />;
    }
  };

  return (
    <div className="p-8 min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor users, content, revenue, and performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <AnalyticsTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-200">
        {renderTabContent()}
      </div>

      {/* Footer Note */}
      <div className="mt-12 text-center text-sm text-gray-400">
        <p>
          Data refreshed on demand • Some metrics use placeholder data pending backend integration
        </p>
      </div>
    </div>
  );
}
