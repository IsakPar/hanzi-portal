import { useState, useCallback, useMemo } from 'react';

export function useSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(item => item.id)));
  }, [items]);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const selectedItems = useMemo(
    () => items.filter(item => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    toggle,
    selectAll,
    clear,
    isSelected,
    setSelectedIds,
  };
}

