import { useState } from 'react';
import { 
  Play, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle,
  Zap, Clock, Timer, DollarSign 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PromptTemplate, AIModel, TestPromptResult } from '@/services/promptsAPI';

interface PromptTestPanelProps {
  versions: PromptTemplate[];
  models: AIModel[];
  activeModelId: string | null;
  onTest: (params: {
    versionToTest?: number;
    modelId?: string;
    targets: string[];
    grammar?: string[];
  }) => Promise<TestPromptResult>;
}

export function PromptTestPanel({ 
  versions, 
  models, 
  activeModelId,
  onTest,
}: PromptTestPanelProps) {
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>(activeModelId || models[0]?.id || '');
  const [selectedVersionForTest, setSelectedVersionForTest] = useState<number | 'active'>('active');
  const [testTargets, setTestTargets] = useState('');
  const [testGrammar, setTestGrammar] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestPromptResult | null>(null);
  const [showFullOutput, setShowFullOutput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTestPrompt = async () => {
    const targets = testTargets
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    if (targets.length === 0) {
      setError('Please enter at least one target word');
      return;
    }

    const grammar = testGrammar
      .split(',')
      .map(g => g.trim())
      .filter(g => g.length > 0);

    try {
      setTesting(true);
      setError(null);
      setTestResult(null);

      const result = await onTest({
        versionToTest: selectedVersionForTest === 'active' ? undefined : selectedVersionForTest,
        modelId: selectedModelId || undefined,
        targets,
        grammar: grammar.length > 0 ? grammar : undefined,
      });

      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => setShowTestPanel(!showTestPanel)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-gray-900">Test Prompt</span>
        </div>
        {showTestPanel ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {showTestPanel && (
        <div className="p-6 pt-0 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-4">
            Test your prompt with sample data before promoting to production.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Version Selection */}
            <div>
              <Label htmlFor="testVersion">Version to Test</Label>
              <select
                id="testVersion"
                value={selectedVersionForTest}
                onChange={(e) =>
                  setSelectedVersionForTest(
                    e.target.value === 'active' ? 'active' : parseInt(e.target.value)
                  )
                }
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="active">Active Version (Production)</option>
                {versions
                  .filter(v => v.status === 'draft')
                  .map(v => (
                    <option key={v.version} value={v.version}>
                      v{v.version} (Draft)
                    </option>
                  ))}
                {versions
                  .filter(v => v.status === 'active')
                  .map(v => (
                    <option key={v.version} value={v.version}>
                      v{v.version} (Active)
                    </option>
                  ))}
              </select>
            </div>

            {/* Model Selection */}
            <div>
              <Label htmlFor="testModel">AI Model</Label>
              <select
                id="testModel"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                    {model.id === activeModelId ? ' ★ Active' : ''}
                  </option>
                ))}
              </select>
              {models.length === 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  No models configured. Add models in Settings.
                </p>
              )}
            </div>

            {/* Test Input */}
            <div>
              <Label htmlFor="testTargets">Target Words *</Label>
              <Input
                id="testTargets"
                value={testTargets}
                onChange={(e) => setTestTargets(e.target.value)}
                placeholder="你好, 再见, 谢谢"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated Chinese words
              </p>
            </div>

            <div>
              <Label htmlFor="testGrammar">Grammar Points (Optional)</Label>
              <Input
                id="testGrammar"
                value={testGrammar}
                onChange={(e) => setTestGrammar(e.target.value)}
                placeholder="greetings, basic_sentence_structure"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated grammar tags
              </p>
            </div>

            <Button
              onClick={handleTestPrompt}
              disabled={testing || !testTargets.trim()}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Test
                </>
              )}
            </Button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className="mt-6 space-y-4">
              {/* Debug Info */}
              {testResult.debug && (
                <div className={`p-4 rounded-lg border ${
                  testResult.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {testResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-semibold ${
                      testResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {testResult.success ? 'Test Passed' : 'Test Failed'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-600">Model:</span>
                      <span className="font-medium">{testResult.debug.model_used}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span className="text-gray-600">Version:</span>
                      <span className="font-medium">
                        v{testResult.debug.prompt_version} ({testResult.debug.prompt_status})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-orange-500" />
                      <span className="text-gray-600">Latency:</span>
                      <span className="font-medium">{testResult.debug.latency_ms}ms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-gray-600">Cost:</span>
                      <span className="font-medium">
                        ${(testResult.debug.estimated_cost ?? testResult.debug.total_cost ?? 0).toFixed(4)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tokens:</span>
                      <span className="font-mono">
                        {testResult.debug.tokens 
                          ? `${testResult.debug.tokens.input} in / ${testResult.debug.tokens.output} out = ${testResult.debug.tokens.total} total`
                          : `${testResult.debug.total_tokens ?? 0} total`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {!testResult.success && testResult.message && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{testResult.message}</p>
                </div>
              )}

              {/* Output Preview */}
              {testResult.success && testResult.output && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowFullOutput(!showFullOutput)}
                    className="w-full p-3 bg-gray-50 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <span>Generated Output</span>
                    {showFullOutput ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {showFullOutput && (
                    <div className="p-4 bg-gray-900 overflow-x-auto">
                      <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                        {JSON.stringify(testResult.output, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Prompt Used Preview */}
              {testResult.prompt_used && (
                <div className="text-xs text-gray-500">
                  <p>Prompt length: {testResult.prompt_used.full_length} characters</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

