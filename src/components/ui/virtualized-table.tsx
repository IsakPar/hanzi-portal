/**
 * Virtualized Table Component
 * 
 * Efficiently renders large lists by only rendering visible rows.
 * Uses @tanstack/react-virtual for virtualization.
 */

import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

export interface VirtualizedTableColumn<T> {
  key: string;
  header: string;
  width?: string;
  className?: string;
  headerClassName?: string;
  render: (item: T, index: number) => React.ReactNode;
}

export interface VirtualizedTableProps<T> {
  data: T[];
  columns: VirtualizedTableColumn<T>[];
  rowHeight?: number;
  maxHeight?: number;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
  rowClassName?: string | ((item: T, index: number) => string);
  estimateSize?: (index: number) => number;
  overscan?: number;
  getRowKey: (item: T, index: number) => string | number;
}

/**
 * VirtualizedTable - Renders only visible rows for performance
 * 
 * @example
 * ```tsx
 * <VirtualizedTable
 *   data={vocabulary}
 *   columns={[
 *     { key: 'hanzi', header: 'Hanzi', render: (item) => item.hanzi },
 *     { key: 'pinyin', header: 'Pinyin', render: (item) => item.pinyin },
 *   ]}
 *   getRowKey={(item) => item.id}
 *   maxHeight={600}
 * />
 * ```
 */
export function VirtualizedTable<T>({
  data,
  columns,
  rowHeight = 56,
  maxHeight = 600,
  className,
  onRowClick,
  rowClassName,
  estimateSize,
  overscan = 5,
  getRowKey,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: estimateSize || (() => rowHeight),
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  const getRowClassName = useCallback(
    (item: T, index: number) => {
      if (typeof rowClassName === 'function') {
        return rowClassName(item, index);
      }
      return rowClassName || '';
    },
    [rowClassName]
  );

  if (data.length === 0) {
    return null;
  }

  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden', className)}>
      {/* Fixed Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="flex">
          {columns.map((column) => (
            <div
              key={column.key}
              className={cn(
                'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                column.width || 'flex-1',
                column.headerClassName
              )}
              style={column.width ? { width: column.width, flexShrink: 0 } : undefined}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const item = data[virtualRow.index];
            const rowKey = getRowKey(item, virtualRow.index);

            return (
              <div
                key={rowKey}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className={cn(
                  'absolute top-0 left-0 w-full flex border-b border-gray-100 hover:bg-gray-50 transition-colors',
                  onRowClick && 'cursor-pointer',
                  getRowClassName(item, virtualRow.index)
                )}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${rowHeight}px`,
                }}
                onClick={() => onRowClick?.(item, virtualRow.index)}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className={cn(
                      'px-6 py-4 flex items-center',
                      column.width || 'flex-1',
                      column.className
                    )}
                    style={column.width ? { width: column.width, flexShrink: 0 } : undefined}
                  >
                    {column.render(item, virtualRow.index)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Row count indicator */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
        {data.length.toLocaleString()} items
      </div>
    </div>
  );
}

/**
 * Simple virtualized list (non-table layout)
 */
export interface VirtualizedListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  maxHeight?: number;
  className?: string;
  overscan?: number;
  getItemKey: (item: T, index: number) => string | number;
}

export function VirtualizedList<T>({
  data,
  renderItem,
  itemHeight = 48,
  maxHeight = 400,
  className,
  overscan = 5,
  getItemKey,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ maxHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const item = data[virtualRow.index];
          const itemKey = getItemKey(item, virtualRow.index);

          return (
            <div
              key={itemKey}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

