/**
 * i+1 Lesson Pipeline Test Component
 * 
 * Full test flow with terminal-style logging:
 * 1. Fetch vocabulary from backend
 * 2. Assign fake lesson IDs (10 words per lesson)
 * 3. Seed Sevalla with test curriculum
 * 4. Pick focus words from seeded curriculum
 * 5. Run generate-lesson through Qwen3 → Sevalla → DeepSeek R1 (OpenRouter)
 * 6. Verify results
 */

import { useState, useRef, useEffect } from 'react';
import { 
  Play, CheckCircle, XCircle, Loader2, Zap, Clock, 
  DollarSign, Database, AlertTriangle, RefreshCw, Terminal 
} from 'lucide-react';
import { authStorage } from '@/services/authAPI';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface GenerationResult {
  success: boolean;
  lesson?: {
    chinese: string;
    pinyin: string;
    english: string;
    focusWordsUsed: string[];
  };
  error?: string;
  generation?: {
    attempts: number;
    validatorPassed: boolean;
    finalModel: string;
    cost: number;
    latencyMs: number;
    provider?: string;
  };
}

interface TestStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  detail?: string;
}

interface SeededWord {
  hanzi: string;
  position: string;
  lessonNumber: number;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error' | 'debug';
  message: string;
  data?: unknown;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

import { API_BASE_URL } from '@/services/api';
const SEVALLA_URL = 'https://hanzi-vocab-val-u53gq.sevalla.app';
const WORDS_PER_LESSON = 10;

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export function LessonPipelineTest() {
  const logEndRef = useRef<HTMLDivElement>(null);
  
  // Test state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [selectedLesson, setSelectedLesson] = useState(5);
  const [focusWords, setFocusWords] = useState<string[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(true);

  // Auto-scroll logs
  useEffect(() => {
    if (logEndRef.current && showLogs) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showLogs]);

  // Logger function
  const log = (level: LogEntry['level'], message: string, data?: unknown) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [...prev, { timestamp, level, message, data }]);
    
    // Also log to browser console
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${timestamp}] ${message}`, data || '');
  };

  // Clear logs
  const clearLogs = () => setLogs([]);

  // Update a step's status
  const updateStep = (index: number, status: TestStep['status'], detail?: string) => {
    setSteps(prev => prev.map((s, i) => 
      i === index ? { ...s, status, detail } : s
    ));
  };

  // Assign lesson IDs to words
  const assignLessonIds = (words: string[]): SeededWord[] => {
    return words.map((hanzi, index) => {
      const lessonNumber = Math.floor(index / WORDS_PER_LESSON) + 1;
      const hskLevel = Math.floor((lessonNumber - 1) / 10) + 1;
      const lessonInHsk = ((lessonNumber - 1) % 10) + 1;
      const position = `hsk${hskLevel}-l${lessonInHsk}`;
      
      return { hanzi, position, lessonNumber };
    });
  };

  // Get focus words for a lesson
  const getFocusWordsForLesson = (seeded: SeededWord[], lesson: number): string[] => {
    const lessonWords = seeded.filter(w => w.lessonNumber === lesson);
    return lessonWords.slice(0, 2).map(w => w.hanzi);
  };

  // Cancel the test
  const cancelTest = () => {
    log('warn', '⏹️ Test cancelled by user');
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setLoading(false);
    setSteps(prev => prev.map(s => 
      s.status === 'running' ? { ...s, status: 'error', detail: 'Cancelled' } : s
    ));
  };

  // Run the full test
  const runTest = async () => {
    clearLogs();
    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);
    setResult(null);
    
    log('info', '🚀 Starting i+1 Lesson Pipeline Test');
    log('info', `📍 API: ${API_BASE_URL}`);
    log('info', `📍 Sevalla: ${SEVALLA_URL}`);
    log('info', `📍 Target Lesson: ${selectedLesson}`);
    log('info', `📍 Provider: OpenRouter`);
    
    setSteps([
      { name: 'Fetch vocabulary from backend', status: 'pending' },
      { name: 'Assign lesson IDs', status: 'pending' },
      { name: 'Seed Sevalla with test curriculum', status: 'pending' },
      { name: 'Select focus words', status: 'pending' },
      { name: 'Generate lesson (Qwen Coder → Sevalla → Qwen Coder)', status: 'pending' },
      { name: 'Verify results', status: 'pending' },
    ]);

    const startTime = Date.now();

    try {
      log('debug', '🔑 Getting auth token...');
      const token = authStorage.getToken();
      log('success', '✓ Auth token obtained');

      // ═══════════════════════════════════════════════════════════
      // STEP 1: Fetch vocabulary
      // ═══════════════════════════════════════════════════════════
      updateStep(0, 'running');
      log('info', '📚 STEP 1: Fetching vocabulary from backend...');
      
      const words: string[] = [];
      const batchSize = 100;
      const maxBatches = 5;
      
      for (let batch = 0; batch < maxBatches; batch++) {
        const offset = batch * batchSize;
        log('debug', `  Fetching batch ${batch + 1}/${maxBatches} (offset=${offset})...`);
        
        const vocabResponse = await fetch(
          `${API_BASE_URL}/v1/vocabulary?limit=${batchSize}&offset=${offset}`, 
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        log('debug', `  Response: ${vocabResponse.status} ${vocabResponse.statusText}`);
        
        if (!vocabResponse.ok) {
          if (batch === 0) {
            throw new Error(`Failed to fetch vocab: ${vocabResponse.status}`);
          }
          log('warn', `  Batch ${batch + 1} failed, stopping fetch`);
          break;
        }
        
        const vocabData = await vocabResponse.json();
        const batchWords = (vocabData.results || vocabData.vocabulary || []).map((v: any) => v.hanzi);
        
        log('debug', `  Got ${batchWords.length} words in batch`);
        
        if (batchWords.length === 0) break;
        words.push(...batchWords);
        
        if (batchWords.length < batchSize) break;
      }
      
      if (words.length < 50) {
        throw new Error(`Not enough words: got ${words.length}, need at least 50`);
      }
      
      log('success', `✓ Fetched ${words.length} vocabulary words`);
      log('debug', `  Sample: ${words.slice(0, 5).join(', ')}...`);
      updateStep(0, 'success', `${words.length} words fetched`);

      // ═══════════════════════════════════════════════════════════
      // STEP 2: Assign lesson IDs
      // ═══════════════════════════════════════════════════════════
      updateStep(1, 'running');
      log('info', '🏷️ STEP 2: Assigning lesson IDs...');
      
      const seeded = assignLessonIds(words);
      const maxLesson = Math.ceil(words.length / WORDS_PER_LESSON);
      
      log('debug', `  ${WORDS_PER_LESSON} words per lesson`);
      log('debug', `  Created ${maxLesson} lessons`);
      log('debug', `  Sample mapping: ${seeded[0].hanzi} → ${seeded[0].position}`);
      
      log('success', `✓ Assigned IDs to ${words.length} words across ${maxLesson} lessons`);
      updateStep(1, 'success', `${maxLesson} lessons created`);

      // ═══════════════════════════════════════════════════════════
      // STEP 3: Seed Sevalla
      // ═══════════════════════════════════════════════════════════
      updateStep(2, 'running');
      log('info', '🌱 STEP 3: Seeding Sevalla with test curriculum...');
      
      const curriculumDict: Record<string, string> = {};
      seeded.forEach(w => {
        curriculumDict[w.hanzi] = w.position;
      });
      
      log('debug', `  Posting ${Object.keys(curriculumDict).length} words to Sevalla`);
      log('debug', `  URL: ${SEVALLA_URL}/seed-test-curriculum`);
      
      const seedResponse = await fetch(`${SEVALLA_URL}/seed-test-curriculum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: curriculumDict })
      });
      
      log('debug', `  Response: ${seedResponse.status} ${seedResponse.statusText}`);
      
      if (!seedResponse.ok) {
        const err = await seedResponse.text();
        log('error', `  Sevalla error: ${err}`);
        throw new Error(`Sevalla seed failed: ${err}`);
      }
      
      const seedResult = await seedResponse.json();
      log('success', `✓ Sevalla seeded with ${seedResult.word_count} words`);
      log('debug', `  Response:`, seedResult);
      updateStep(2, 'success', `${seedResult.word_count} words seeded`);

      // ═══════════════════════════════════════════════════════════
      // STEP 4: Select focus words
      // ═══════════════════════════════════════════════════════════
      updateStep(3, 'running');
      log('info', '🎯 STEP 4: Selecting focus words...');
      
      const testFocusWords = getFocusWordsForLesson(seeded, selectedLesson);
      setFocusWords(testFocusWords);
      
      log('debug', `  Lesson ${selectedLesson} words: ${seeded.filter(w => w.lessonNumber === selectedLesson).map(w => w.hanzi).join(', ')}`);
      
      if (testFocusWords.length === 0) {
        throw new Error(`No words found for lesson ${selectedLesson}`);
      }
      
      log('success', `✓ Selected focus words: ${testFocusWords.join(', ')}`);
      updateStep(3, 'success', `Focus: ${testFocusWords.join(', ')}`);

      // ═══════════════════════════════════════════════════════════
      // STEP 5: Generate lesson
      // ═══════════════════════════════════════════════════════════
      updateStep(4, 'running');
      log('info', '🤖 STEP 5: Generating lesson via OpenRouter...');
      
      const hskLevel = Math.floor((selectedLesson - 1) / 10) + 1;
      
      const requestBody = {
        lessonNumber: selectedLesson,
        focusWords: testFocusWords,
        hskLevel: hskLevel,
        textLength: 150,
      };
      
      log('debug', `  Request body:`, requestBody);
      log('debug', `  URL: ${API_BASE_URL}/v1/ai/generate-lesson`);
      log('info', `  🔄 Calling Qwen Coder 32B (generation)...`);
      
      const genStartTime = Date.now();
      const genResponse = await fetch(`${API_BASE_URL}/v1/ai/generate-lesson`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      log('debug', `  Response: ${genResponse.status} ${genResponse.statusText}`);
      
      const genResult = await genResponse.json();
      const genDuration = Date.now() - genStartTime;
      
      log('debug', `  Full response:`, genResult);
      
      if (!genResult.success) {
        log('error', `  Generation failed: ${genResult.error}`);
        updateStep(4, 'error', genResult.error);
        throw new Error(genResult.error);
      }
      
      log('success', `✓ Lesson generated in ${genDuration}ms`);
      log('info', `  📊 Attempts: ${genResult.generation?.attempts}`);
      log('info', `  📊 Validator: ${genResult.generation?.validatorPassed ? 'PASSED' : 'FAILED (used retries)'}`);
      log('info', `  📊 Final Model: ${genResult.generation?.finalModel}`);
      log('info', `  📊 Cost: $${genResult.generation?.cost?.toFixed(4)}`);
      log('info', `  📊 Provider: ${genResult.generation?.provider || 'openrouter'}`);
      
      updateStep(4, 'success', `${genResult.generation?.attempts} attempt(s), ${genResult.generation?.latencyMs}ms`);
      setResult(genResult);

      // ═══════════════════════════════════════════════════════════
      // STEP 6: Verify results
      // ═══════════════════════════════════════════════════════════
      updateStep(5, 'running');
      log('info', '✅ STEP 6: Verifying results...');
      
      const verification: string[] = [];
      const generatedChinese = genResult.lesson?.chinese || '';
      
      log('debug', `  Generated Chinese: ${generatedChinese}`);
      log('debug', `  Generated Pinyin: ${genResult.lesson?.pinyin}`);
      log('debug', `  Generated English: ${genResult.lesson?.english}`);
      
      // Check focus words
      const missingFocus = testFocusWords.filter(w => !generatedChinese.includes(w));
      if (missingFocus.length > 0) {
        log('warn', `  ⚠️ Missing focus words: ${missingFocus.join(', ')}`);
        verification.push(`⚠️ Missing focus: ${missingFocus.join(', ')}`);
      } else {
        log('success', `  ✓ All focus words present in generated text`);
        verification.push(`✓ All focus words present`);
      }
      
      // Check validator
      if (genResult.generation?.validatorPassed) {
        log('success', `  ✓ Validator passed on first try`);
        verification.push(`✓ Validator passed`);
      } else {
        log('warn', `  ⚠️ Validator required retries`);
        verification.push(`⚠️ Validator did not pass (used retries)`);
      }
      
      verification.push(`✓ Final model: ${genResult.generation?.finalModel}`);
      
      updateStep(5, 'success', verification.join(' | '));

      // Final summary
      const totalDuration = Date.now() - startTime;
      log('success', '═══════════════════════════════════════════════════════════');
      log('success', '🎉 PIPELINE TEST COMPLETE');
      log('success', `   Total time: ${totalDuration}ms`);
      log('success', `   Total cost: $${genResult.generation?.cost?.toFixed(4)}`);
      log('success', `   Lessons per $1: ~${Math.floor(1 / (genResult.generation?.cost || 0.001)).toLocaleString()}`);
      log('success', '═══════════════════════════════════════════════════════════');

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      log('error', `❌ PIPELINE FAILED: ${errorMsg}`);
      
      setSteps(prev => prev.map(s => 
        s.status === 'running' ? { ...s, status: 'error', detail: errorMsg } : s
      ));
      
      setResult({
        success: false,
        error: errorMsg,
      });
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  // Get log color class
  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      case 'debug': return 'text-gray-500';
      default: return 'text-blue-300';
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">i+1 Lesson Pipeline Test</h2>
            <p className="text-sm text-gray-500">Qwen Coder 32B → Sevalla → Qwen Coder (OpenRouter)</p>
          </div>
        </div>
        <button
          onClick={() => setShowLogs(!showLogs)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showLogs 
              ? 'bg-gray-900 text-green-400' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          {showLogs ? 'Hide Logs' : 'Show Logs'}
        </button>
      </div>

      {/* Lesson Selector */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Test Lesson Number
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={50}
            value={selectedLesson}
            onChange={(e) => setSelectedLesson(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-lg font-bold text-purple-600 w-12 text-center">
            {selectedLesson}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          HSK {Math.floor((selectedLesson - 1) / 10) + 1}, 
          Lesson {((selectedLesson - 1) % 10) + 1} — 
          Focus words will be picked from this lesson
        </p>
      </div>

      {/* Run/Cancel Button */}
      {loading ? (
        <button
          onClick={cancelTest}
          className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <XCircle className="w-5 h-5" />
          Cancel Test
        </button>
      ) : (
        <button
          onClick={runTest}
          className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Play className="w-5 h-5" />
          Run Full Pipeline Test
        </button>
      )}

      {/* Terminal Log Panel */}
      {showLogs && logs.length > 0 && (
        <div className="mt-6 bg-gray-900 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-gray-300">Pipeline Logs</span>
            </div>
            <button
              onClick={clearLogs}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto font-mono text-xs leading-relaxed">
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-gray-600 select-none">[{log.timestamp}]</span>
                <span className={getLogColor(log.level)}>
                  {log.message}
                  {log.data !== undefined && (
                    <span className="text-gray-500 ml-2">
                      {typeof log.data === 'object' ? JSON.stringify(log.data) : String(log.data)}
                    </span>
                  )}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Steps Progress */}
      {steps.length > 0 && (
        <div className="mt-6 space-y-2">
          {steps.map((step, idx) => (
            <div 
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                step.status === 'running' ? 'bg-blue-50' :
                step.status === 'success' ? 'bg-green-50' :
                step.status === 'error' ? 'bg-red-50' :
                'bg-gray-50'
              }`}
            >
              {step.status === 'pending' && (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              )}
              {step.status === 'running' && (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              )}
              {step.status === 'success' && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {step.status === 'error' && (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              
              <div className="flex-1">
                <span className={`text-sm font-medium ${
                  step.status === 'error' ? 'text-red-700' :
                  step.status === 'success' ? 'text-green-700' :
                  step.status === 'running' ? 'text-blue-700' :
                  'text-gray-600'
                }`}>
                  {step.name}
                </span>
                {step.detail && (
                  <span className="ml-2 text-xs text-gray-500">
                    — {step.detail}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {result && result.success && result.lesson && (
        <div className="mt-6 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {result.generation?.attempts}
              </div>
              <div className="text-xs text-gray-500">Attempts</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                {result.generation?.validatorPassed ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              <div className="text-xs text-gray-500">Validator</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-gray-900">
                <Clock className="w-4 h-4" />
                <span className="font-bold">{result.generation?.latencyMs}ms</span>
              </div>
              <div className="text-xs text-gray-500">Latency</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-gray-900">
                <DollarSign className="w-4 h-4" />
                <span className="font-bold">${result.generation?.cost?.toFixed(4)}</span>
              </div>
              <div className="text-xs text-gray-500">Cost</div>
            </div>
          </div>

          {/* Generated Lesson */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="font-medium text-sm text-gray-700">Generated Lesson</span>
              <span className="text-xs text-gray-500">
                via {result.generation?.finalModel}
              </span>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Chinese</div>
                <div className="text-xl text-gray-900">{result.lesson.chinese}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Pinyin</div>
                <div className="text-gray-700">{result.lesson.pinyin}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">English</div>
                <div className="text-gray-600">{result.lesson.english}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Focus Words</div>
                <div className="flex gap-2">
                  {focusWords.map((word, i) => {
                    const found = result.lesson?.chinese.includes(word);
                    return (
                      <span 
                        key={i} 
                        className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                          found 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {found ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {word}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {result && !result.success && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Test Failed</span>
          </div>
          <p className="mt-2 text-sm text-red-600">{result.error}</p>
        </div>
      )}

      {/* Cost Summary */}
      {result && result.success && result.generation && (
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">Test Cost Summary</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-700">
                ${result.generation.cost?.toFixed(4)}
              </div>
              <div className="text-xs text-green-600">
                {result.generation.attempts} attempt{result.generation.attempts > 1 ? 's' : ''} • {result.generation.latencyMs}ms
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-green-600">Generation</div>
              <div className="font-medium text-green-800">Qwen Coder 32B</div>
            </div>
            <div>
              <div className="text-green-600">Validator</div>
              <div className="font-medium text-green-800">Sevalla (free)</div>
            </div>
            <div>
              <div className="text-green-600">Polish</div>
              <div className="font-medium text-green-800">Qwen Coder 32B</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-green-600 text-center">
            Total: ~$0.07-0.16 per 1M tokens
          </div>
          <div className="mt-3 text-xs text-green-600 text-center">
            💡 At this rate: <strong>~{Math.floor(1 / (result.generation.cost || 0.001)).toLocaleString()} lessons per $1</strong>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Database className="w-4 h-4 text-blue-600 mt-0.5" />
          <div className="text-xs text-blue-700">
            <strong>How this test works:</strong> Fetches your 500 vocabulary words, 
            assigns fake lesson IDs (10 words per lesson), seeds Sevalla with this 
            test curriculum, then runs the full generation pipeline via OpenRouter. 
            Focus words are automatically picked from the selected lesson.
          </div>
        </div>
      </div>
    </div>
  );
}
