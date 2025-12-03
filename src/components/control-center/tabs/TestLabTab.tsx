import { FlaskConical, Play, Clock, Eye, Code, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TestResult, CacheStats, TestStep, TutorUsageSummary } from '../types';

interface TestLabTabProps {
  hskLevel: number;
  setHskLevel: (v: number) => void;
  position: number;
  setPosition: (v: number) => void;
  focusWords: string;
  setFocusWords: (v: string) => void;
  bypassCache: boolean;
  setBypassCache: (v: boolean) => void;
  running: boolean;
  result: TestResult | null;
  cacheStats: CacheStats | null;
  suggestedWords: string[][];
  onRunTest: () => void;
  onCancel: () => void;
  loading: boolean;
  elapsedMs: number;
  tutorSummary: TutorUsageSummary | null;
  streamingSteps: TestStep[];
  runningCost: number;
}

export function TestLabTab({
  hskLevel,
  setHskLevel,
  position,
  setPosition,
  focusWords,
  setFocusWords,
  bypassCache,
  setBypassCache,
  running,
  result,
  cacheStats,
  suggestedWords,
  onRunTest,
  onCancel,
  loading,
  elapsedMs,
  tutorSummary,
  streamingSteps,
  runningCost,
}: TestLabTabProps) {
  const getStepIcon = (status: TestStep['status']) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'skipped': return <Clock className="w-4 h-4 text-gray-400" />;
      default: return <Clock className="w-4 h-4 text-gray-300" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Cache Stats + AI Cost */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">Cached Lessons</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {loading ? '...' : cacheStats?.totalEntries || 0}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">Total Hits</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {loading ? '...' : cacheStats?.totalHits || 0}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">Hit Rate</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {loading ? '...' : `${((cacheStats?.hitRate || 0) * 100).toFixed(1)}%`}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">Cache Savings</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            ${loading ? '...' : (cacheStats?.estimatedSavings || 0).toFixed(4)}
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="text-sm font-medium text-purple-600">AI Tutor Cost (All Time)</div>
          <div className="text-2xl font-bold text-purple-700 mt-1">
            ${loading ? '...' : (tutorSummary?.totalCost || 0).toFixed(4)}
          </div>
          <div className="text-xs text-purple-500 mt-1">
            {tutorSummary?.totalLessons || 0} lessons · ${((tutorSummary?.totalCost || 0) / Math.max(tutorSummary?.totalLessons || 1, 1)).toFixed(5)}/lesson
          </div>
        </div>
      </div>

      {/* Test Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Test Configuration</h3>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <Label>HSK Level</Label>
            <select
              value={hskLevel}
              onChange={(e) => setHskLevel(Number(e.target.value))}
              className="w-full h-10 border rounded-lg px-3"
              disabled={running}
            >
              {[1, 2, 3, 4, 5, 6].map(level => (
                <option key={level} value={level}>HSK {level}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Lesson Position</Label>
            <Input
              type="number"
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              min={1}
              max={500}
              disabled={running}
            />
          </div>
          <div>
            <Label>Focus Words (comma-separated)</Label>
            <Input
              value={focusWords}
              onChange={(e) => setFocusWords(e.target.value)}
              placeholder="学习,中文"
              disabled={running}
            />
          </div>
        </div>

        {/* Suggested Words */}
        {suggestedWords.length > 0 && (
          <div className="mb-4">
            <Label className="mb-2 block">Quick Select:</Label>
            <div className="flex flex-wrap gap-2">
              {suggestedWords.map((words, idx) => (
                <button
                  key={idx}
                  onClick={() => setFocusWords(words.join(','))}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  disabled={running}
                >
                  {words.join(', ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bypassCache}
              onChange={(e) => setBypassCache(e.target.checked)}
              disabled={running}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm">Bypass cache (force generation)</span>
          </label>
        </div>

        {/* Run/Cancel Button with Timer and Cost */}
        <div className="flex gap-4">
          {running ? (
            <Button
              onClick={onCancel}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel Test
            </Button>
          ) : (
            <Button
              onClick={onRunTest}
              disabled={!focusWords.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Test
            </Button>
          )}
          
          {/* Live Timer */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg min-w-[100px] justify-center">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="font-mono font-bold text-lg">
              {(elapsedMs / 1000).toFixed(1)}s
            </span>
          </div>
          
          {/* Running Cost */}
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg min-w-[120px] justify-center">
            <span className="text-amber-600 font-medium">Cost:</span>
            <span className="font-mono font-bold text-amber-700">
              ${(running ? runningCost : (result?.summary.totalCost || 0)).toFixed(5)}
            </span>
          </div>
        </div>
      </div>

      {/* Results - Show when running OR when we have result */}
      {(running || result || streamingSteps.length > 0) && (
        <div className="grid grid-cols-2 gap-6">
          {/* Live Logs */}
          <div className="bg-gray-900 rounded-xl p-4 text-sm font-mono">
            <div className="text-gray-400 mb-3 flex items-center gap-2">
              <Code className="w-4 h-4" />
              Live Logs
              {running && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {streamingSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  {getStepIcon(step.status)}
                  <div className="flex-1">
                    <div className="text-gray-300">
                      <span className="text-gray-500">[{((step.durationMs || 0) / 1000).toFixed(1)}s]</span>{' '}
                      {step.message}
                      {step.cost !== undefined && step.cost > 0 && (
                        <span className="text-amber-400 ml-2">(+${step.cost.toFixed(5)})</span>
                      )}
                    </div>
                    {step.details && (
                      <div className="text-gray-500 text-xs mt-0.5">
                        {JSON.stringify(step.details)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {running && streamingSteps.length === 0 && (
                <div className="text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting to test server...
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Result</h4>
              {result ? (
                result.success ? (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Success
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> Failed
                  </span>
                )
              ) : (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin" /> Running...
                </span>
              )}
            </div>

            {result?.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {result.error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-500">Duration</div>
                <div className="font-bold text-lg">{((result?.summary.totalDurationMs || elapsedMs) / 1000).toFixed(2)}s</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-500">Cost</div>
                <div className="font-bold text-lg">${(result?.summary.totalCost || runningCost).toFixed(5)}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-500">Cache</div>
                <div className="font-bold text-lg">{result ? (result.summary.cacheHit ? '✅ HIT' : '❌ MISS') : '...'}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-500">Pre-Filter</div>
                <div className="font-bold text-lg">
                  {result?.summary.preFilterScore !== undefined 
                    ? `${result.summary.preFilterScore}/100 ${result.summary.preFilterPassed ? '✅' : '❌'}`
                    : result ? 'N/A' : '...'}
                </div>
              </div>
            </div>

            {result?.summary.cacheKey && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <div className="text-blue-600 font-medium">Cache Key</div>
                <code className="text-blue-800">{result.summary.cacheKey}</code>
              </div>
            )}

            {result && !result.summary.cacheHit && result.success && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="text-gray-600 mb-2">Attempts</div>
                <div className="flex gap-4">
                  <span>Reading: {result.summary.attemptsReading}</span>
                  <span>Practice: {result.summary.attemptsPractice}</span>
                  <span>Grammar: {result.summary.attemptsGrammar}</span>
                </div>
              </div>
            )}

            {result?.lesson !== undefined && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    if (result?.lesson) {
                      const blob = new Blob([JSON.stringify(result.lesson, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank');
                    }
                  }}
                  className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Full Lesson JSON
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

