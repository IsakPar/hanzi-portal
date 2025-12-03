import { useState } from 'react';
import { Play, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TestPromptResult } from '@/services/promptsAPI';
import { PipelineTestResultDisplay } from './PipelineTestResultDisplay';

interface PipelineTestPanelProps {
  hasSteps: boolean;
  onTest: (params: {
    targets: string[];
    grammar?: string[];
    knownVocab?: string[];
  }) => Promise<TestPromptResult>;
}

export function PipelineTestPanel({ hasSteps, onTest }: PipelineTestPanelProps) {
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testTargets, setTestTargets] = useState('');
  const [testGrammar, setTestGrammar] = useState('');
  const [testKnownVocab, setTestKnownVocab] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestPromptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    const targets = testTargets.split(',').map(t => t.trim()).filter(t => t);
    if (targets.length === 0) {
      setError('Please enter at least one target word');
      return;
    }

    const grammar = testGrammar.split(',').map(g => g.trim()).filter(g => g);
    const knownVocab = testKnownVocab.split(',').map(v => v.trim()).filter(v => v);

    try {
      setTesting(true);
      setError(null);
      setTestResult(null);

      const result = await onTest({
        targets,
        grammar: grammar.length > 0 ? grammar : undefined,
        knownVocab: knownVocab.length > 0 ? knownVocab : undefined,
      });

      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setShowTestPanel(!showTestPanel)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-gray-900">Test Pipeline</span>
        </div>
        {showTestPanel ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {showTestPanel && (
        <div className="p-6 pt-0 border-t border-gray-100 space-y-4">
          <p className="text-sm text-gray-600">
            Test your pipeline with sample data. This will run all steps and show results.
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="testTargets">Target Words *</Label>
              <Input
                id="testTargets"
                value={testTargets}
                onChange={(e) => setTestTargets(e.target.value)}
                placeholder="你好, 再见, 谢谢"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="testGrammar">Grammar Points</Label>
              <Input
                id="testGrammar"
                value={testGrammar}
                onChange={(e) => setTestGrammar(e.target.value)}
                placeholder="greetings, basic"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="testKnownVocab">Known Vocabulary</Label>
              <Input
                id="testKnownVocab"
                value={testKnownVocab}
                onChange={(e) => setTestKnownVocab(e.target.value)}
                placeholder="我, 是, 很"
                className="mt-1"
              />
            </div>
          </div>

          <Button
            onClick={handleTest}
            disabled={testing || !testTargets.trim() || !hasSteps}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Pipeline...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Test
              </>
            )}
          </Button>

          {testResult && (
            <PipelineTestResultDisplay result={testResult} />
          )}
        </div>
      )}
    </div>
  );
}

