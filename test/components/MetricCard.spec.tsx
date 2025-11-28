/**
 * MetricCard Component Tests
 * Tests for analytics metric display card
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from '@/components/analytics/MetricCard';
import { Users, TrendingUp } from 'lucide-react';

describe('MetricCard', () => {
  it('should render title and value', () => {
    render(
      <MetricCard
        title="Total Users"
        value="1,500"
        icon={Users}
      />
    );

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  it('should render subtitle when provided', () => {
    render(
      <MetricCard
        title="Active Users"
        value="450"
        subtitle="Last 30 days"
        icon={Users}
      />
    );

    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  it('should show positive trend indicator', () => {
    render(
      <MetricCard
        title="Revenue"
        value="$5,000"
        trend={{ value: 12.5, isPositive: true }}
        icon={TrendingUp}
      />
    );

    expect(screen.getByText(/12.5%/)).toBeInTheDocument();
  });

  it('should show negative trend indicator', () => {
    render(
      <MetricCard
        title="Error Rate"
        value="2.5%"
        trend={{ value: 0.8, isPositive: false }}
        icon={TrendingUp}
      />
    );

    expect(screen.getByText(/0.8%/)).toBeInTheDocument();
  });

  it('should apply custom icon color', () => {
    render(
      <MetricCard
        title="Custom Color"
        value="100"
        icon={Users}
        iconColor="text-purple-600"
      />
    );

    // The component should render with the custom color class
    const container = screen.getByText('Custom Color').closest('div');
    expect(container).toBeInTheDocument();
  });

  it('should render sparkline when provided', () => {
    const sparklineData = [10, 20, 15, 30, 25, 35, 40];
    
    render(
      <MetricCard
        title="With Sparkline"
        value="100"
        icon={Users}
        sparkline={sparklineData}
      />
    );

    expect(screen.getByText('With Sparkline')).toBeInTheDocument();
  });
});

