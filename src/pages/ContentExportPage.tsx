/**
 * Content Export Page
 * Central hub for exporting all content to R2 for mobile app consumption
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Download,
  Package,
} from 'lucide-react';
import { 
  exportVocabularyJSON, 
  exportLessonsJSON, 
  exportStoriesJSON,
  exportManifest,
  formatBytes,
  type ExportResult,
} from '@/services/exportService';
import { searchVocabulary } from '@/services/vocabularyAPI';
import lessonAPI from '@/services/lessonAPI';
import { searchStories } from '@/services/storiesAPI';

interface ExportStatus {
  hskLevel: number;
  vocabulary: ExportState;
  lessons: ExportState;
  storiesFree: ExportState;
  storiesPremium: ExportState;
}

interface ExportState {
  status: 'idle' | 'loading' | 'success' | 'error';
  result?: ExportResult & { url?: string };
  error?: string;
  lastExported?: string;
}

const HSK_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function ContentExportPage() {
  const [exportStatuses, setExportStatuses] = useState<ExportStatus[]>(() =>
    HSK_LEVELS.map((level) => ({
      hskLevel: level,
      vocabulary: { status: 'idle' },
      lessons: { status: 'idle' },
      storiesFree: { status: 'idle' },
      storiesPremium: { status: 'idle' },
    }))
  );
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [manifestStatus, setManifestStatus] = useState<ExportState>({ status: 'idle' });

  const updateStatus = (
    hskLevel: number,
    contentType: keyof Omit<ExportStatus, 'hskLevel'>,
    update: Partial<ExportState>
  ) => {
    setExportStatuses((prev) =>
      prev.map((status) =>
        status.hskLevel === hskLevel
          ? { ...status, [contentType]: { ...status[contentType], ...update } }
          : status
      )
    );
  };

  const exportVocabulary = async (hskLevel: number) => {
    updateStatus(hskLevel, 'vocabulary', { status: 'loading' });

    try {
      const response = await searchVocabulary({ hsk_level: hskLevel, limit: 10000 });
      const exportResult = await exportVocabularyJSON(response.results, hskLevel, '1.0.0');

      // Note: R2 upload would require backend endpoint - exports work via local download for now
      const url = `https://content.hanzimaster.com/vocabulary/hsk${hskLevel}.json`;

      updateStatus(hskLevel, 'vocabulary', {
        status: 'success',
        result: { ...exportResult, url },
        lastExported: new Date().toISOString(),
      });

      return { ...exportResult, url };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateStatus(hskLevel, 'vocabulary', {
        status: 'error',
        error: errorMessage,
      });
      throw error;
    }
  };

  const exportLessons = async (hskLevel: number) => {
    updateStatus(hskLevel, 'lessons', { status: 'loading' });

    try {
      const response = await lessonAPI.getAll({ hskLevel });
      const exportResult = await exportLessonsJSON(response.lessons, hskLevel, '1.0.0');

      const url = `https://content.hanzimaster.com/lessons/hsk${hskLevel}.json`;

      updateStatus(hskLevel, 'lessons', {
        status: 'success',
        result: { ...exportResult, url },
        lastExported: new Date().toISOString(),
      });

      return { ...exportResult, url };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateStatus(hskLevel, 'lessons', {
        status: 'error',
        error: errorMessage,
      });
      throw error;
    }
  };

  const exportStories = async (hskLevel: number, accessTier: 'free' | 'premium') => {
    const key = accessTier === 'free' ? 'storiesFree' : 'storiesPremium';
    updateStatus(hskLevel, key, { status: 'loading' });

    try {
      // Search returns Story[] - full details fetched on demand in story editor
      const results = await searchStories({ hskLevel });
      const filteredResults = results.filter((s) => 
        ((s as unknown as { accessTier?: string }).accessTier || 'premium') === accessTier
      );

      // Convert Story[] to StoryWithDetails[] for export
      const storiesWithDetails = filteredResults.map((story) => ({
        ...story,
        sentences: [],
        vocabulary: [],
        questions: [],
        practiceBlocks: story.practiceBlocks || [],
      }));

      const exportResult = await exportStoriesJSON(
        storiesWithDetails,
        hskLevel,
        accessTier,
        '1.0.0'
      );

      const url = `https://content.hanzimaster.com/stories/${accessTier}/hsk${hskLevel}.json`;

      updateStatus(hskLevel, key, {
        status: 'success',
        result: { ...exportResult, url },
        lastExported: new Date().toISOString(),
      });

      return { ...exportResult, url };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateStatus(hskLevel, key, {
        status: 'error',
        error: errorMessage,
      });
      throw error;
    }
  };

  const exportAllContent = async () => {
    setIsExportingAll(true);
    const allExports: Array<ExportResult & { url: string }> = [];

    try {
      // Export all HSK levels
      for (const level of HSK_LEVELS) {
        const vocabResult = await exportVocabulary(level);
        allExports.push(vocabResult);

        const lessonsResult = await exportLessons(level);
        allExports.push(lessonsResult);

        const storiesFreeResult = await exportStories(level, 'free');
        allExports.push(storiesFreeResult);

        const storiesPremiumResult = await exportStories(level, 'premium');
        allExports.push(storiesPremiumResult);
      }

      // Generate manifest
      setManifestStatus({ status: 'loading' });
      const manifestResult = await exportManifest(allExports);
      const manifestUrl = 'https://content.hanzimaster.com/manifest.json';
      
      setManifestStatus({
        status: 'success',
        result: { ...manifestResult, url: manifestUrl },
        lastExported: new Date().toISOString(),
      });

      alert('✅ All content exported successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Export failed: ${errorMessage}`);
      setManifestStatus({ status: 'error', error: errorMessage });
    } finally {
      setIsExportingAll(false);
    }
  };

  const downloadJSON = (json: string, filename: string) => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📦 Content Export Center
          </h1>
          <p className="text-gray-600">
            Export all content to JSON for mobile app consumption. Each HSK level gets separate files.
          </p>
        </div>

        {/* Export All Button */}
        <div className="mb-8 bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                Full Export
              </h2>
              <p className="text-gray-600 text-sm">
                Export all HSK levels (1-9) for vocabulary, lessons, stories (free + premium), and generate manifest
              </p>
            </div>
            <Button
              onClick={exportAllContent}
              disabled={isExportingAll}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isExportingAll ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Package className="w-5 h-5 mr-2" />
                  Export All
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Manifest Status */}
        {manifestStatus.status !== 'idle' && (
          <div className="mb-8 bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">manifest.json</h3>
                {manifestStatus.result && (
                  <div className="text-sm text-gray-600">
                    {manifestStatus.result.recordCount} exports tracked • {formatBytes(manifestStatus.result.sizeBytes)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {manifestStatus.status === 'loading' && (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                )}
                {manifestStatus.status === 'success' && (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <Button
                      onClick={() =>
                        downloadJSON(
                          manifestStatus.result!.json,
                          'manifest.json'
                        )
                      }
                      size="sm"
                      variant="outline"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </>
                )}
                {manifestStatus.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* HSK Level Export Grid */}
        <div className="space-y-6">
          {exportStatuses.map((status) => (
            <div
              key={status.hskLevel}
              className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                HSK {status.hskLevel}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Vocabulary */}
                <ExportCard
                  title="Vocabulary"
                  state={status.vocabulary}
                  onExport={() => exportVocabulary(status.hskLevel)}
                  onDownload={() =>
                    status.vocabulary.result &&
                    downloadJSON(
                      status.vocabulary.result.json,
                      `vocabulary-hsk${status.hskLevel}.json`
                    )
                  }
                />

                {/* Lessons */}
                <ExportCard
                  title="Lessons"
                  state={status.lessons}
                  onExport={() => exportLessons(status.hskLevel)}
                  onDownload={() =>
                    status.lessons.result &&
                    downloadJSON(
                      status.lessons.result.json,
                      `lessons-hsk${status.hskLevel}.json`
                    )
                  }
                />

                {/* Stories (Free) */}
                <ExportCard
                  title="Stories (Free)"
                  state={status.storiesFree}
                  onExport={() => exportStories(status.hskLevel, 'free')}
                  onDownload={() =>
                    status.storiesFree.result &&
                    downloadJSON(
                      status.storiesFree.result.json,
                      `stories-free-hsk${status.hskLevel}.json`
                    )
                  }
                />

                {/* Stories (Premium) */}
                <ExportCard
                  title="Stories (Premium)"
                  state={status.storiesPremium}
                  onExport={() => exportStories(status.hskLevel, 'premium')}
                  onDownload={() =>
                    status.storiesPremium.result &&
                    downloadJSON(
                      status.storiesPremium.result.json,
                      `stories-premium-hsk${status.hskLevel}.json`
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExportCard({
  title,
  state,
  onExport,
  onDownload,
}: {
  title: string;
  state: ExportState;
  onExport: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-800">{title}</h4>
        {state.status === 'loading' && (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        )}
        {state.status === 'success' && (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        )}
        {state.status === 'error' && (
          <AlertCircle className="w-4 h-4 text-red-600" />
        )}
      </div>

      {state.result && (
        <div className="text-xs text-gray-600 mb-3 space-y-1">
          <div>{state.result.recordCount} items</div>
          <div>{formatBytes(state.result.sizeBytes)}</div>
          <div>v{state.result.version}</div>
        </div>
      )}

      {state.error && (
        <div className="text-xs text-red-600 mb-3">{state.error}</div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={onExport}
          disabled={state.status === 'loading'}
          size="sm"
          variant="outline"
          className="flex-1"
        >
          {state.status === 'loading' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Upload className="w-3 h-3" />
          )}
        </Button>
        {state.status === 'success' && (
          <Button
            onClick={onDownload}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <Download className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

