/**
 * 📦 Unit Types
 * Units group lessons together (like mobile app structure)
 */

export interface Unit {
  id: string;
  
  // Identification
  hskLevel: number; // 1-9
  unitNumber: number; // 1, 2, 3...
  title: string; // "Essentials & Greetings"
  description?: string; // "Master the absolute basics..."
  
  // Visual styling (for mobile app)
  gradientStart: string; // "#EEF2FF"
  gradientEnd: string; // "#C7D2FE"
  accentColor: string; // "#4F46E5"
  
  // Organization
  orderIndex?: number;
  
  // Publishing
  isPublished: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Joined data (not in DB)
  lessons?: Lesson[];
  lessonCount?: number;
  completedCount?: number;
  progress?: number; // 0-100
}

export interface UnitWithLessons extends Unit {
  lessons: Lesson[];
}

// Import Lesson type
import type { Lesson } from './lesson';

