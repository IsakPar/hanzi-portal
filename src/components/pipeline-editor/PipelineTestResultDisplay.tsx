import { useState } from 'react';
import { CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import type { TestPromptResult, StepResult } from '@/services/promptsAPI';

interface PipelineTestResultDisplayProps {
  result: TestPromptResult;
}

export function PipelineTestResultDisplay({ result }: PipelineTestResultDisplayProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [showOutput, setShowOutput] = useState(false);

  return (
    <div className="mt-6 space-y-4">
      {/* Summary */}
      <div className={`p-4 rounded-lg border ${
        result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {result.success ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <span className={`font-semibold ${
            result.success ? 'text-green-700' : 'text-red-700'
          }`}>
            {result.success ? 'Pipeline Passed' : 'Pipeline Failed'}
          </span>
        </div>

        {result.debug && (
          <div className="grid grid-cols-3 gap-4 text-sm mt-3">
            <div>
              <span className="text-gray-600">Total Cost:</span>
              <span className="font-medium ml-2">
                ${(result.debug.total_cost ?? result.debug.estimated_cost ?? 0).toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Total Tokens:</span>
              <span className="font-medium ml-2">
                {result.debug.total_tokens ?? result.debug.tokens?.total ?? 0}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Latency:</span>
              <span className="font-medium ml-2">
                {result.debug.total_latency_ms ?? result.debug.latency_ms ?? 0}ms
              </span>
            </div>
          </div>
        )}

        {result.debug?.quality_score !== undefined && (
          <div className="mt-2 text-sm">
            <span className="text-gray-600">Quality Score:</span>
            <span className={`font-medium ml-2 ${
              result.debug.quality_score >= 70 ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {result.debug.quality_score}/100
            </span>
          </div>
        )}

        {result.debug?.abort_reason && (
          <p className="mt-2 text-sm text-red-600">{result.debug.abort_reason}</p>
        )}
      </div>

      {/* Step-by-Step Results */}
      {result.steps && result.steps.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Step Results</h4>
          {result.steps.map((step: StepResult) => (
            <StepResultCard
              key={step.order}
              step={step}
              isExpanded={expandedStep === step.order}
              onToggle={() => setExpandedStep(expandedStep === step.order ? null : step.order)}
            />
          ))}
        </div>
      )}

      {/* Final Output */}
      {result.success && result.output && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowOutput(!showOutput)}
            className="w-full p-3 bg-gray-50 flex items-center justify-between text-sm font-medium"
          >
            <span>Final Output</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showOutput ? 'rotate-180' : ''}`} />
          </button>
          {showOutput && (
            <pre className="p-4 bg-gray-900 text-xs text-green-400 overflow-x-auto max-h-64">
              {JSON.stringify(result.output, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function StepResultCard({ 
  step, 
  isExpanded, 
  onToggle 
}: { 
  step: StepResult; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const [showOutput, setShowOutput] = useState(false);

  return (
    <div className={`border rounded-lg overflow-hidden ${
      step.status === 'success' ? 'border-green-200' : 'border-red-200'
    }`}>
      <button
        onClick={onToggle}
        className={`w-full p-3 flex items-center justify-between text-left ${
          step.status === 'success' ? 'bg-green-50' : 'bg-red-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            step.status === 'success' 
              ? 'bg-green-200 text-green-700' 
              : 'bg-red-200 text-red-700'
          }`}>
            {step.order}
          </span>
          <div>
            <span className="font-medium">{step.name}</span>
            <span className="text-xs text-gray-500 ml-2">
              {step.model_used} • {step.latency_ms}ms • ${step.cost.toFixed(4)}
            </span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="p-4 bg-white border-t">
          <div className="grid grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-500">Input Tokens:</span>
              <span className="ml-1 font-medium">{step.tokens.input}</span>
            </div>
            <div>
              <span className="text-gray-500">Output Tokens:</span>
              <span className="ml-1 font-medium">{step.tokens.output}</span>
            </div>
            <div>
              <span className="text-gray-500">Retries:</span>
              <span className="ml-1 font-medium">{step.retry_count}</span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <span className={`ml-1 font-medium ${
                step.status === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {step.status}
              </span>
            </div>
          </div>

          {step.error && (
            <div className="p-3 bg-red-50 rounded text-sm text-red-700 mb-4">
              {step.error}
            </div>
          )}

          {step.output !== undefined && step.output !== null && (
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOutput(!showOutput);
                }}
                className="text-sm text-purple-600 hover:underline mb-2"
              >
                {showOutput ? 'Hide Output' : 'Show Output'}
              </button>
              {showOutput && (
                <pre className="p-3 bg-gray-900 rounded text-xs text-green-400 overflow-x-auto max-h-48">
                  {JSON.stringify(step.output, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

