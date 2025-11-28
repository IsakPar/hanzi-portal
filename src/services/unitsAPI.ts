import { api } from './api';
import type { Unit, UnitWithLessons } from '@/types/unit';
import type { Lesson } from '@/types/lesson';

/**
 * Get all units, optionally filtered by HSK level
 */
export async function getUnits(hskLevel?: number): Promise<Unit[]> {
  const params = hskLevel ? `?hsk_level=${hskLevel}` : '';
  const response: any = await api.get(`/v1/units${params}`);
  return response.units;
}

/**
 * Get a single unit by ID
 */
export async function getUnit(id: string): Promise<Unit> {
  const response: any = await api.get(`/v1/units/${id}`);
  return response.unit;
}

/**
 * Get all lessons in a unit
 */
export async function getUnitLessons(id: string): Promise<Lesson[]> {
  const response: any = await api.get(`/v1/units/${id}/lessons`);
  return response.lessons;
}

/**
 * Get unit with its lessons
 */
export async function getUnitWithLessons(id: string): Promise<UnitWithLessons> {
  const [unit, lessons] = await Promise.all([
    getUnit(id),
    getUnitLessons(id),
  ]);
  return { ...unit, lessons };
}

/**
 * Create a new unit
 */
export async function createUnit(data: {
  hskLevel: number;
  unitNumber?: number;
  title: string;
  description?: string;
  gradientStart?: string;
  gradientEnd?: string;
  accentColor?: string;
  orderIndex?: number;
}): Promise<{ id: string; unitNumber: number }> {
  const response: any = await api.post('/v1/units', data);
  return { id: response.id, unitNumber: response.unitNumber };
}

/**
 * Update a unit
 */
export async function updateUnit(
  id: string,
  data: {
    title?: string;
    description?: string;
    gradientStart?: string;
    gradientEnd?: string;
    accentColor?: string;
    orderIndex?: number;
    isPublished?: boolean;
  }
): Promise<void> {
  await api.put(`/v1/units/${id}`, data);
}

/**
 * Delete a unit
 */
export async function deleteUnit(id: string): Promise<void> {
  await api.delete(`/v1/units/${id}`);
}

/**
 * Add a lesson to a unit
 */
export async function addLessonToUnit(unitId: string, lessonId: string): Promise<{ orderInUnit: number }> {
  const response: any = await api.post(`/v1/units/${unitId}/lessons/${lessonId}`, {});
  return { orderInUnit: response.orderInUnit };
}

/**
 * Remove a lesson from a unit
 */
export async function removeLessonFromUnit(unitId: string, lessonId: string): Promise<void> {
  await api.delete(`/v1/units/${unitId}/lessons/${lessonId}`);
}

/**
 * Reorder lessons within a unit
 */
export async function reorderUnitLessons(unitId: string, lessonIds: string[]): Promise<void> {
  await api.put(`/v1/units/${unitId}/lessons/reorder`, { lessonIds });
}

/**
 * Default color schemes for units (matching mobile app)
 */
export const UNIT_COLOR_SCHEMES = [
  { name: 'Indigo', gradientStart: '#EEF2FF', gradientEnd: '#C7D2FE', accent: '#4F46E5' },
  { name: 'Amber', gradientStart: '#FFFBEB', gradientEnd: '#FDE68A', accent: '#D97706' },
  { name: 'Emerald', gradientStart: '#ECFDF5', gradientEnd: '#A7F3D0', accent: '#059669' },
  { name: 'Rose', gradientStart: '#FFF1F2', gradientEnd: '#FECDD3', accent: '#E11D48' },
  { name: 'Sky', gradientStart: '#F0F9FF', gradientEnd: '#BAE6FD', accent: '#0284C7' },
  { name: 'Purple', gradientStart: '#FAF5FF', gradientEnd: '#E9D5FF', accent: '#9333EA' },
  { name: 'Pink', gradientStart: '#FDF2F8', gradientEnd: '#FBCFE8', accent: '#DB2777' },
  { name: 'Teal', gradientStart: '#F0FDFA', gradientEnd: '#99F6E4', accent: '#0D9488' },
] as const;

