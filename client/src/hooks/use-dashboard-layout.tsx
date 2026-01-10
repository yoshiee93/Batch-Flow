import { useState, useEffect, useCallback } from 'react';

export interface DashboardLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

const LAYOUT_STORAGE_KEY = 'batchmaster-dashboard-layout';
const EDIT_MODE_STORAGE_KEY = 'batchmaster-dashboard-edit-mode';

export const DEFAULT_LAYOUT: DashboardLayoutItem[] = [
  { i: 'stats-orders', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  { i: 'stats-batches', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  { i: 'stats-alerts', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  { i: 'stats-products', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  { i: 'current-orders', x: 0, y: 2, w: 8, h: 6, minW: 4, minH: 3 },
  { i: 'material-alerts', x: 8, y: 2, w: 4, h: 3, minW: 3, minH: 2 },
  { i: 'current-production', x: 8, y: 5, w: 4, h: 3, minW: 3, minH: 2 },
];

const cloneLayout = (items: DashboardLayoutItem[]): DashboardLayoutItem[] => 
  items.map(item => ({ ...item }));

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayoutItem[]>(() => {
    if (typeof window === 'undefined') return cloneLayout(DEFAULT_LAYOUT);
    try {
      const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : cloneLayout(DEFAULT_LAYOUT);
    } catch {
      return cloneLayout(DEFAULT_LAYOUT);
    }
  });

  const [editMode, setEditMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(EDIT_MODE_STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // Ignore storage errors
    }
  }, [layout]);

  useEffect(() => {
    try {
      localStorage.setItem(EDIT_MODE_STORAGE_KEY, String(editMode));
    } catch {
      // Ignore storage errors
    }
  }, [editMode]);

  const onLayoutChange = useCallback((newLayout: DashboardLayoutItem[]) => {
    setLayout(cloneLayout(newLayout));
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(cloneLayout(DEFAULT_LAYOUT));
  }, []);

  const toggleEditMode = useCallback(() => {
    setEditMode(prev => !prev);
  }, []);

  return {
    layout,
    editMode,
    onLayoutChange,
    resetLayout,
    toggleEditMode,
    setEditMode,
  };
}
