/**
 * Empty State Component
 * A reusable component for displaying empty state messages
 */

import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  BookOpen,
  FileText,
  Users,
  Folder,
  Search,
  AlertCircle,
  Plus,
  Inbox,
  type LucideIcon,
} from "lucide-react";

interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
  /** Variant style */
  variant?: "default" | "compact" | "card";
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = "default",
}: EmptyStateProps) {
  const ActionIcon = action?.icon || Plus;

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-3 py-8 px-4 text-center justify-center", className)}>
        <Icon className="h-5 w-5 text-gray-400" />
        <span className="text-sm text-gray-500">{title}</span>
        {action && (
          <Button size="sm" variant="outline" onClick={action.onClick}>
            <ActionIcon className="h-3 w-3 mr-1" />
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn(
        "rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8",
        className
      )}>
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Icon className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>
          )}
          {action && (
            <Button onClick={action.onClick} size="sm">
              <ActionIcon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4 text-center",
      className
    )}>
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-6">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 mb-6 max-w-md">{description}</p>
      )}
      <div className="flex gap-3">
        {action && (
          <Button onClick={action.onClick}>
            <ActionIcon className="h-4 w-4 mr-2" />
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Pre-built empty states for common scenarios
// =============================================================================

interface PresetEmptyStateProps {
  onAction?: () => void;
  className?: string;
}

export function EmptyLessons({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={BookOpen}
      title="No lessons yet"
      description="Create your first lesson to start building your curriculum."
      action={onAction ? { label: "Create Lesson", onClick: onAction } : undefined}
      className={className}
    />
  );
}

export function EmptyVocabulary({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={FileText}
      title="No vocabulary found"
      description="Add vocabulary entries to build your word database."
      action={onAction ? { label: "Add Vocabulary", onClick: onAction } : undefined}
      className={className}
    />
  );
}

export function EmptyUnits({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Folder}
      title="No units found"
      description="Create units to organize your lessons into a structured curriculum."
      action={onAction ? { label: "Create Unit", onClick: onAction } : undefined}
      className={className}
    />
  );
}

export function EmptyStories({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={BookOpen}
      title="No stories yet"
      description="Create reading stories to help students practice comprehension."
      action={onAction ? { label: "Create Story", onClick: onAction } : undefined}
      className={className}
    />
  );
}

export function EmptySearchResults({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search or filters to find what you're looking for."
      variant="compact"
      className={className}
    />
  );
}

export function EmptyActivity({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="No recent activity"
      description="Activity will appear here as you create and update content."
      variant="card"
      className={className}
    />
  );
}

export function EmptyUsers({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Users}
      title="No users found"
      description="Users will appear here once they sign up."
      variant="card"
      className={className}
    />
  );
}

