/**
 * ValidatorStatus Component
 * Shows vocab-validator health, status, and test interface
 * 
 * 220 LOC
 */

import { useState, useEffect } from 'react';
import { 
  RefreshCw, Check, X, AlertTriangle, Server, 
  Database, Hash, Play, Loader2 
} from 'lucide-react';
import {
  getValidatorHealth,
  triggerSync,
  testValidation,
  type ValidatorHealth,
  type ValidationResult,
} from '@/services/validatorAPI';
import { logger } from '@/utils/logger';

export function ValidatorStatus() {
  const [health, setHealth] = useState<ValidatorHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  // Test form state
  const [testText, setTestText] = useState('你好，我学习中文。');
  const [testHsk, setTestHsk] = useState(1);
  const [testLesson, setTestLesson] = useState(3);
  const [testResult, setTestResult] = useState<ValidationResult | null>(null);

  useEffect(() => {
    loadHealth();
  }, []);

  async function loadHealth() {
    try {
      setLoading(true);
      const data = await getValidatorHealth();
      setHealth(data);
    } catch (err) {
      logger.error('Failed to load validator health:', err);
      setHealth({ 
        status: 'unreachable', 
        curriculum_loaded: false, 
        word_count: 0, 
        version: '', 
        environment: 'unknown',
        error: err instanceof Error ? err.message : 'Connection failed'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    try {
      setSyncing(true);
      setSyncMessage(null);
      const result = await triggerSync();
      
      if (result.success) {
        setSyncMessage(result.changed 
          ? `✅ Synced! ${result.word_count} words, v${result.version.slice(0, 8)}` 
          : '✅ Already up to date'
        );
        loadHealth();
      } else {
        setSyncMessage(`❌ Sync failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      setSyncMessage(`❌ ${err instanceof Error ? err.message : 'Sync failed'}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleTest() {
    try {
      setTesting(true);
      setTestResult(null);
      const result = await testValidation({
        text: testText,
        user_position: { hsk: testHsk, lesson: testLesson },
        target_words: [],
      });
      setTestResult(result);
    } catch (err) {
      logger.error('Validation test failed:', err);
    } finally {
      setTesting(false);
    }
  }

  const isHealthy = health?.status === 'healthy';

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isHealthy ? 'bg-green-100' : 'bg-red-100'}`}>
              <Server className={`w-5 h-5 ${isHealthy ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Vocabulary Validator</h3>
              <p className="text-sm text-gray-500">Chinese text validation service</p>
            </div>
          </div>
          <button
            onClick={loadHealth}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <div className="flex items-center gap-2">
              {isHealthy ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-red-600" />
              )}
              <span className={`font-medium ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                {health?.status || 'Unknown'}
              </span>
            </div>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Database className="w-3 h-3" /> Words
            </p>
            <p className="font-semibold text-gray-900">
              {health?.word_count?.toLocaleString() || '0'}
            </p>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Hash className="w-3 h-3" /> Version
            </p>
            <p className="font-mono text-sm text-gray-700 truncate">
              {health?.version?.slice(0, 12) || '—'}
            </p>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Environment</p>
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
              health?.environment === 'production' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-amber-100 text-amber-700'
            }`}>
              {health?.environment || 'unknown'}
            </span>
          </div>
        </div>

        {/* Sync Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing || !isHealthy}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Sync Curriculum
          </button>
          {syncMessage && (
            <span className="text-sm">{syncMessage}</span>
          )}
        </div>
      </div>

      {/* Test Validation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Play className="w-4 h-4 text-purple-600" />
          Test Validation
        </h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chinese Text
            </label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter Chinese text to validate..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows={2}
            />
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">HSK Level</label>
              <select
                value={testHsk}
                onChange={(e) => setTestHsk(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>HSK {n}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Lesson</label>
              <input
                type="number"
                value={testLesson}
                onChange={(e) => setTestLesson(Number(e.target.value))}
                min={1}
                max={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleTest}
                disabled={testing || !testText.trim() || !isHealthy}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Test
              </button>
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              {testResult.valid ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <span className={`font-semibold ${testResult.valid ? 'text-green-600' : 'text-amber-600'}`}>
                {testResult.valid ? 'Valid' : 'Invalid'}
              </span>
              <span className="text-sm text-gray-500">
                ({testResult.stats.safe_percentage.toFixed(1)}% safe)
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Words Found</p>
                <p className="font-medium">{testResult.words_found.join(', ') || '—'}</p>
              </div>
              <div>
                <p className="text-green-600">Safe</p>
                <p className="font-medium">{testResult.safe_words.join(', ') || '—'}</p>
              </div>
              <div>
                <p className="text-red-600">Forbidden</p>
                <p className="font-medium">{testResult.forbidden_words.join(', ') || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400">Unknown</p>
                <p className="font-medium">{testResult.unknown_words.join(', ') || '—'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

