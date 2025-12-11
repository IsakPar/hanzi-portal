/**
 * 🚀 Release Manager Workflow Tests
 * 
 * Tests the complete content shipping lifecycle:
 * 1. Preview release → 2. Select content → 3. Ship to mobile → 4. Verify release
 * 
 * The Release Manager is the final step in the content pipeline,
 * making lessons available to the mobile app via /v1/curriculum/download
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  previewRelease,
  shipRelease,
  getReleaseHistory,
  getAllHskStatus,
} from '@/services/releaseAPI';
import { setupMockFetch, mockRelease, testId } from './test-utils';

describe('🚀 Release Manager Workflow', () => {
  const originalFetch = global.fetch;
  let mockFetch: ReturnType<typeof setupMockFetch>;

  beforeEach(() => {
    mockFetch = setupMockFetch();
    global.fetch = mockFetch.mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    mockFetch.reset();
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 1: PREVIEW RELEASE (GIT-STYLE DIFF)
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 1: Preview Release Changes', () => {
    it('should show diff between staging and live content', async () => {
      mockFetch.respondWith({
        hskLevel: 1,
        currentLive: {
          lessons: [
            { id: 'l1', title: 'Lesson 1', lessonNumber: 1, status: 'live' },
            { id: 'l2', title: 'Lesson 2', lessonNumber: 2, status: 'live' },
          ],
          lessonCount: 2,
          version: '1.0.0',
          lastUpdated: '2024-01-15T10:00:00Z',
        },
        pendingChanges: {
          newLessons: [
            { id: 'l3', title: 'Lesson 3 (NEW)', lessonNumber: 3, status: 'staging' },
          ],
          updatedLessons: [
            { id: 'l1', title: 'Lesson 1 (Updated)', lessonNumber: 1, status: 'staging' },
          ],
          unchangedLessons: [
            { id: 'l2', title: 'Lesson 2', lessonNumber: 2, status: 'live' },
          ],
          stayingLessons: [],
        },
        vocabulary: {
          total: 150,
          withAudio: 145,
          missingAudio: 5,
        },
        suggestedVersion: '1.1.0',
        previewHash: 'abc123',
        hasChanges: true,
        summary: {
          totalNew: 1,
          totalUpdated: 1,
          totalStaying: 1,
        },
      });

      const preview = await previewRelease(1);

      // Verify diff structure
      expect(preview.hasChanges).toBe(true);
      expect(preview.pendingChanges.newLessons).toHaveLength(1);
      expect(preview.pendingChanges.updatedLessons).toHaveLength(1);
      expect(preview.pendingChanges.unchangedLessons).toHaveLength(1);

      // Verify summary counts
      expect(preview.summary.totalNew).toBe(1);
      expect(preview.summary.totalUpdated).toBe(1);

      // Verify suggested version
      expect(preview.suggestedVersion).toBe('1.1.0');

      // Verify vocabulary health
      expect(preview.vocabulary.missingAudio).toBe(5);
    });

    it('should show no changes when content is up to date', async () => {
      mockFetch.respondWith({
        hskLevel: 1,
        currentLive: {
          lessons: [
            { id: 'l1', title: 'Lesson 1', lessonNumber: 1 },
          ],
          lessonCount: 1,
          version: '1.0.0',
          lastUpdated: '2024-01-15T10:00:00Z',
        },
        pendingChanges: {
          newLessons: [],
          updatedLessons: [],
          unchangedLessons: [
            { id: 'l1', title: 'Lesson 1', lessonNumber: 1 },
          ],
          stayingLessons: [],
        },
        vocabulary: {
          total: 50,
          withAudio: 50,
          missingAudio: 0,
        },
        suggestedVersion: '1.0.0',
        previewHash: 'same123',
        hasChanges: false,
        summary: {
          totalNew: 0,
          totalUpdated: 0,
          totalStaying: 1,
        },
      });

      const preview = await previewRelease(1);

      expect(preview.hasChanges).toBe(false);
      expect(preview.pendingChanges.newLessons).toHaveLength(0);
      expect(preview.pendingChanges.updatedLessons).toHaveLength(0);
      expect(preview.vocabulary.missingAudio).toBe(0);
    });

    it('should show first release for empty HSK level', async () => {
      mockFetch.respondWith({
        hskLevel: 2,
        currentLive: {
          lessons: [],
          lessonCount: 0,
          version: '0.0.0',
          lastUpdated: null,
        },
        pendingChanges: {
          newLessons: [
            { id: 'l1', title: 'HSK2 Lesson 1', lessonNumber: 1 },
            { id: 'l2', title: 'HSK2 Lesson 2', lessonNumber: 2 },
          ],
          updatedLessons: [],
          unchangedLessons: [],
          stayingLessons: [],
        },
        vocabulary: {
          total: 100,
          withAudio: 95,
          missingAudio: 5,
        },
        suggestedVersion: '1.0.0',
        previewHash: 'first123',
        hasChanges: true,
        summary: {
          totalNew: 2,
          totalUpdated: 0,
          totalStaying: 0,
        },
      });

      const preview = await previewRelease(2);

      expect(preview.currentLive.version).toBe('0.0.0');
      expect(preview.currentLive.lastUpdated).toBeNull();
      expect(preview.suggestedVersion).toBe('1.0.0'); // First release
      expect(preview.pendingChanges.newLessons).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 2: SHIP CONTENT TO MOBILE
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 2: Ship Content', () => {
    it('should ship selected lessons to mobile', async () => {
      mockFetch.respondWith({
        success: true,
        release: {
          id: testId('release'),
          version: '1.1.0',
          hskLevel: 1,
          lessonsShipped: 3,
          lessonsAdded: 1,
          lessonsUpdated: 2,
        },
      });

      const result = await shipRelease({
        hskLevel: 1,
        lessonIds: ['l1', 'l2', 'l3'],
        version: '1.1.0',
        releaseNotes: 'Added Lesson 3, updated Lessons 1 and 2',
      });

      expect(result.success).toBe(true);
      expect(result.release.version).toBe('1.1.0');
      expect(result.release.lessonsShipped).toBe(3);
      expect(result.release.lessonsAdded).toBe(1);
      expect(result.release.lessonsUpdated).toBe(2);

      const call = mockFetch.getLastCall();
      expect(call?.method).toBe('POST');
      expect(call?.url).toContain('/control-center/ship');
      expect(call?.body).toMatchObject({
        hskLevel: 1,
        lessonIds: ['l1', 'l2', 'l3'],
        version: '1.1.0',
        releaseNotes: expect.stringContaining('Lesson 3'),
      });
    });

    it('should ship first release with initial version', async () => {
      mockFetch.respondWith({
        success: true,
        release: {
          id: testId('release'),
          version: '1.0.0',
          hskLevel: 1,
          lessonsShipped: 5,
          lessonsAdded: 5,
          lessonsUpdated: 0,
        },
      });

      const result = await shipRelease({
        hskLevel: 1,
        lessonIds: ['l1', 'l2', 'l3', 'l4', 'l5'],
        version: '1.0.0',
        releaseNotes: 'Initial HSK 1 release with 5 lessons',
      });

      expect(result.success).toBe(true);
      expect(result.release.lessonsAdded).toBe(5);
      expect(result.release.lessonsUpdated).toBe(0);
    });

    it('should ship partial content (selected lessons only)', async () => {
      mockFetch.respondWith({
        success: true,
        release: {
          id: testId('release'),
          version: '1.0.1',
          hskLevel: 1,
          lessonsShipped: 1,
          lessonsAdded: 0,
          lessonsUpdated: 1,
        },
      });

      // Only ship lesson 1 update, not lesson 2
      const result = await shipRelease({
        hskLevel: 1,
        lessonIds: ['l1'], // Only l1, not l2
        version: '1.0.1',
        releaseNotes: 'Hotfix for Lesson 1 typo',
      });

      expect(result.release.lessonsShipped).toBe(1);
    });

    it('should handle ship errors gracefully', async () => {
      mockFetch.failWith('Cannot ship: 5 vocabulary items missing audio', 400);

      await expect(
        shipRelease({
          hskLevel: 1,
          lessonIds: ['l1'],
          version: '1.0.0',
        })
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 3: RELEASE HISTORY
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 3: Release History', () => {
    it('should fetch release history for HSK level', async () => {
      mockFetch.respondWith({
        hskLevel: 1,
        releases: [
          mockRelease({ version: '1.2.0', releaseNotes: 'Added lesson 8', lessonsAdded: 1, releasedAt: '2024-02-01T10:00:00Z' }),
          mockRelease({ version: '1.1.0', releaseNotes: 'Updated lessons 1-5', lessonsUpdated: 5, releasedAt: '2024-01-20T10:00:00Z' }),
          mockRelease({ version: '1.0.0', releaseNotes: 'Initial release', lessonsAdded: 5, releasedAt: '2024-01-15T10:00:00Z' }),
        ],
        totalReleases: 3,
      });

      const history = await getReleaseHistory(1);

      expect(history.hskLevel).toBe(1);
      expect(history.releases).toHaveLength(3);
      expect(history.totalReleases).toBe(3);

      // Verify chronological order (newest first)
      expect(history.releases[0].version).toBe('1.2.0');
      expect(history.releases[2].version).toBe('1.0.0');
    });

    it('should return empty history for new HSK level', async () => {
      mockFetch.respondWith({
        hskLevel: 5,
        releases: [],
        totalReleases: 0,
      });

      const history = await getReleaseHistory(5);

      expect(history.releases).toHaveLength(0);
      expect(history.totalReleases).toBe(0);
    });

    it('should show release details with lesson IDs', async () => {
      mockFetch.respondWith({
        hskLevel: 1,
        releases: [
          {
            id: 'r1',
            version: '1.0.0',
            releaseNotes: 'Initial release',
            lessonsAdded: 3,
            lessonsUpdated: 0,
            lessonsRemoved: 0,
            lessonIds: ['l1', 'l2', 'l3'],
            releasedAt: '2024-01-15T10:00:00Z',
          },
        ],
        totalReleases: 1,
      });

      const history = await getReleaseHistory(1);

      expect(history.releases[0].lessonIds).toEqual(['l1', 'l2', 'l3']);
      expect(history.releases[0].lessonsAdded).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 4: HSK LEVEL OVERVIEW
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 4: All HSK Status Overview', () => {
    it('should get status for all HSK levels', async () => {
      mockFetch.respondWith({
        hskStatus: {
          1: {
            draft: 2,
            staging: 8,
            live: 5,
            latestVersion: '1.0.0',
            lastRelease: '2024-01-15T10:00:00Z',
            hasUnshippedChanges: true,
          },
          2: {
            draft: 5,
            staging: 3,
            live: 0,
            latestVersion: null,
            lastRelease: null,
            hasUnshippedChanges: true,
          },
          3: {
            draft: 0,
            staging: 0,
            live: 10,
            latestVersion: '2.1.0',
            lastRelease: '2024-02-01T10:00:00Z',
            hasUnshippedChanges: false,
          },
        },
      });

      const status = await getAllHskStatus();

      // HSK 1: Has content, has unshipped changes
      expect(status.hskStatus[1].live).toBe(5);
      expect(status.hskStatus[1].hasUnshippedChanges).toBe(true);

      // HSK 2: No live content yet
      expect(status.hskStatus[2].live).toBe(0);
      expect(status.hskStatus[2].latestVersion).toBeNull();

      // HSK 3: Up to date
      expect(status.hskStatus[3].hasUnshippedChanges).toBe(false);
      expect(status.hskStatus[3].latestVersion).toBe('2.1.0');
    });

    it('should identify levels with pending changes', async () => {
      mockFetch.respondWith({
        hskStatus: {
          1: {
            draft: 0,
            staging: 5,
            live: 5,
            latestVersion: '1.0.0',
            lastRelease: '2024-01-15T10:00:00Z',
            hasUnshippedChanges: true, // staging > 0
          },
        },
      });

      const status = await getAllHskStatus();

      expect(status.hskStatus[1].hasUnshippedChanges).toBe(true);
      expect(status.hskStatus[1].staging).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FULL RELEASE WORKFLOW
  // ═══════════════════════════════════════════════════════════

  describe('Full Release Workflow: Preview → Select → Ship → Verify', () => {
    it('should complete full release cycle', async () => {
      // Step 1: Check HSK status - see there are unshipped changes
      mockFetch.respondWith({
        hskStatus: {
          1: {
            draft: 0,
            staging: 8,
            live: 5,
            latestVersion: '1.0.0',
            lastRelease: '2024-01-15T10:00:00Z',
            hasUnshippedChanges: true,
          },
        },
      });

      const status = await getAllHskStatus();
      expect(status.hskStatus[1].hasUnshippedChanges).toBe(true);

      // Step 2: Preview release for HSK 1
      mockFetch.respondWith({
        hskLevel: 1,
        currentLive: {
          lessons: [{ id: 'l1', title: 'L1' }, { id: 'l2', title: 'L2' }],
          lessonCount: 2,
          version: '1.0.0',
          lastUpdated: '2024-01-15T10:00:00Z',
        },
        pendingChanges: {
          newLessons: [{ id: 'l3', title: 'L3 (NEW)' }],
          updatedLessons: [{ id: 'l1', title: 'L1 (Updated)' }],
          unchangedLessons: [{ id: 'l2', title: 'L2' }],
          stayingLessons: [],
        },
        vocabulary: {
          total: 100,
          withAudio: 100,
          missingAudio: 0, // All audio complete!
        },
        suggestedVersion: '1.1.0',
        previewHash: 'preview123',
        hasChanges: true,
        summary: {
          totalNew: 1,
          totalUpdated: 1,
          totalStaying: 1,
        },
      });

      const preview = await previewRelease(1);
      expect(preview.hasChanges).toBe(true);
      expect(preview.vocabulary.missingAudio).toBe(0); // Ready to ship!

      // Step 3: Ship selected lessons (all of them)
      const lessonIdsToShip = [
        ...preview.pendingChanges.newLessons.map(l => l.id),
        ...preview.pendingChanges.updatedLessons.map(l => l.id),
        ...preview.pendingChanges.unchangedLessons.map(l => l.id),
      ];

      mockFetch.respondWith({
        success: true,
        release: {
          id: 'release-new',
          version: '1.1.0',
          hskLevel: 1,
          lessonsShipped: 3,
          lessonsAdded: 1,
          lessonsUpdated: 1,
        },
      });

      const shipResult = await shipRelease({
        hskLevel: 1,
        lessonIds: lessonIdsToShip,
        version: preview.suggestedVersion,
        releaseNotes: 'Added Lesson 3, updated Lesson 1',
      });

      expect(shipResult.success).toBe(true);
      expect(shipResult.release.version).toBe('1.1.0');

      // Step 4: Verify release history updated
      mockFetch.respondWith({
        hskLevel: 1,
        releases: [
          {
            id: 'release-new',
            version: '1.1.0',
            releaseNotes: 'Added Lesson 3, updated Lesson 1',
            lessonsAdded: 1,
            lessonsUpdated: 1,
            lessonsRemoved: 0,
            lessonIds: ['l1', 'l2', 'l3'],
            releasedAt: new Date().toISOString(),
          },
          {
            id: 'release-old',
            version: '1.0.0',
            releaseNotes: 'Initial release',
            lessonsAdded: 2,
            lessonsUpdated: 0,
            lessonsRemoved: 0,
            lessonIds: ['l1', 'l2'],
            releasedAt: '2024-01-15T10:00:00Z',
          },
        ],
        totalReleases: 2,
      });

      const history = await getReleaseHistory(1);
      expect(history.releases[0].version).toBe('1.1.0');
      expect(history.totalReleases).toBe(2);

      // Step 5: Check HSK status - no more unshipped changes
      mockFetch.respondWith({
        hskStatus: {
          1: {
            draft: 0,
            staging: 0, // All shipped!
            live: 3,
            latestVersion: '1.1.0',
            lastRelease: new Date().toISOString(),
            hasUnshippedChanges: false,
          },
        },
      });

      const finalStatus = await getAllHskStatus();
      expect(finalStatus.hskStatus[1].hasUnshippedChanges).toBe(false);
      expect(finalStatus.hskStatus[1].latestVersion).toBe('1.1.0');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // SEMANTIC VERSIONING
  // ═══════════════════════════════════════════════════════════

  describe('Semantic Versioning', () => {
    it('should suggest patch version for small updates', async () => {
      mockFetch.respondWith({
        hskLevel: 1,
        currentLive: { version: '1.0.0', lessons: [], lessonCount: 5, lastUpdated: null },
        pendingChanges: {
          newLessons: [],
          updatedLessons: [{ id: 'l1', title: 'Fixed typo' }],
          unchangedLessons: [],
          stayingLessons: [],
        },
        vocabulary: { total: 50, withAudio: 50, missingAudio: 0 },
        suggestedVersion: '1.0.1', // Patch for fixes
        previewHash: 'patch',
        hasChanges: true,
        summary: { totalNew: 0, totalUpdated: 1, totalStaying: 4 },
      });

      const preview = await previewRelease(1);
      expect(preview.suggestedVersion).toBe('1.0.1');
    });

    it('should suggest minor version for new content', async () => {
      mockFetch.respondWith({
        hskLevel: 1,
        currentLive: { version: '1.0.0', lessons: [], lessonCount: 5, lastUpdated: null },
        pendingChanges: {
          newLessons: [{ id: 'l6', title: 'New lesson!' }],
          updatedLessons: [],
          unchangedLessons: [],
          stayingLessons: [],
        },
        vocabulary: { total: 60, withAudio: 60, missingAudio: 0 },
        suggestedVersion: '1.1.0', // Minor for new features
        previewHash: 'minor',
        hasChanges: true,
        summary: { totalNew: 1, totalUpdated: 0, totalStaying: 5 },
      });

      const preview = await previewRelease(1);
      expect(preview.suggestedVersion).toBe('1.1.0');
    });

    it('should allow custom version override', async () => {
      mockFetch.respondWith({
        success: true,
        release: {
          id: 'r1',
          version: '2.0.0', // Major version jump
          hskLevel: 1,
          lessonsShipped: 10,
          lessonsAdded: 5,
          lessonsUpdated: 5,
        },
      });

      const result = await shipRelease({
        hskLevel: 1,
        lessonIds: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10'],
        version: '2.0.0', // Custom major version
        releaseNotes: 'Major curriculum overhaul',
      });

      expect(result.release.version).toBe('2.0.0');
    });
  });
});

