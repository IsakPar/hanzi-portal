/**
 * PipelineImporter Component
 * Import pipeline configurations from JSON
 */

import { useState } from 'react';
import { X, Upload, Copy, FileJson, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/useToast';
import {
  importPipeline,
  getPipelineTemplate,
  type PipelineImportInput,
} from '@/services/promptsAPI';

interface PipelineImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ValidationError {
  path: string;
  message: string;
}

export function PipelineImporter({ isOpen, onClose, onSuccess }: PipelineImporterProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [parsed, setParsed] = useState<PipelineImportInput | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  if (!isOpen) return null;

  async function handleLoadTemplate() {
    setLoadingTemplate(true);
    try {
      const template = await getPipelineTemplate();
      const json = JSON.stringify(template, null, 2);
      setJsonInput(json);
      setParsed(template);
      setErrors([]);
      toast.success('Template loaded', 'Edit the values and import');
    } catch (err) {
      toast.error('Failed to load template');
    } finally {
      setLoadingTemplate(false);
    }
  }

  function handleJsonChange(value: string) {
    setJsonInput(value);
    setErrors([]);
    setParsed(null);

    if (!value.trim()) return;

    try {
      const data = JSON.parse(value);
      
      // Basic validation
      const validationErrors: ValidationError[] = [];
      
      if (!data.slug || typeof data.slug !== 'string') {
        validationErrors.push({ path: 'slug', message: 'Required string' });
      } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
        validationErrors.push({ path: 'slug', message: 'Must be lowercase alphanumeric with hyphens' });
      }

      if (!Array.isArray(data.steps) || data.steps.length === 0) {
        validationErrors.push({ path: 'steps', message: 'At least one step required' });
      } else {
        data.steps.forEach((step: any, i: number) => {
          if (!step.order) validationErrors.push({ path: `steps[${i}].order`, message: 'Required' });
          if (!step.name) validationErrors.push({ path: `steps[${i}].name`, message: 'Required' });
          if (!step.modelId) validationErrors.push({ path: `steps[${i}].modelId`, message: 'Required' });
          if (!step.promptBody) validationErrors.push({ path: `steps[${i}].promptBody`, message: 'Required' });
        });
      }

      if (!data.costLimits) {
        validationErrors.push({ path: 'costLimits', message: 'Required object' });
      }

      if (!data.qualityGate) {
        validationErrors.push({ path: 'qualityGate', message: 'Required object' });
      }

      setErrors(validationErrors);
      
      if (validationErrors.length === 0) {
        setParsed(data as PipelineImportInput);
      }
    } catch (e) {
      setErrors([{ path: 'json', message: 'Invalid JSON syntax' }]);
    }
  }

  async function handleImport() {
    if (!parsed) return;

    setImporting(true);
    try {
      const result = await importPipeline(parsed);
      
      if (result.success) {
        toast.success(
          'Pipeline imported!',
          `${parsed.slug} v${result.pipeline?.version} created as draft`
        );
        onSuccess();
        onClose();
      } else {
        toast.error('Import failed', result.error || result.details);
      }
    } catch (err) {
      toast.error('Import failed', (err as Error).message);
    } finally {
      setImporting(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleJsonChange(content);
    };
    reader.readAsText(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileJson className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Import Pipeline</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleLoadTemplate}
              disabled={loadingTemplate}
            >
              {loadingTemplate ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Load Template
            </Button>
            <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-4 h-4 mr-2" />
              Upload JSON
            </label>
          </div>

          {/* JSON Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pipeline JSON
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder="Paste your pipeline JSON here..."
              className="w-full h-64 px-4 py-3 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              spellCheck={false}
            />
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                <AlertCircle className="w-5 h-5" />
                Validation Errors
              </div>
              <ul className="space-y-1 text-sm text-red-600">
                {errors.map((err, i) => (
                  <li key={i}>
                    <code className="bg-red-100 px-1 rounded">{err.path}</code>: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview */}
          {parsed && errors.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 font-medium mb-3">
                <Check className="w-5 h-5" />
                Valid Pipeline
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Slug:</span>{' '}
                  <span className="font-medium text-gray-900">{parsed.slug}</span>
                </div>
                <div>
                  <span className="text-gray-500">Steps:</span>{' '}
                  <span className="font-medium text-gray-900">{parsed.steps.length}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Pipeline:</span>
                  <div className="mt-1 space-y-1">
                    {parsed.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-medium">
                          {step.order}
                        </span>
                        <span>{step.name}</span>
                        <span className="text-gray-400">→</span>
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{step.modelId}</code>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Max Cost:</span>{' '}
                  <span className="font-medium text-gray-900">${parsed.costLimits.maxCostPerRun}</span>
                </div>
                <div>
                  <span className="text-gray-500">Quality Gate:</span>{' '}
                  <span className="font-medium text-gray-900">{parsed.qualityGate.minValidationScore}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Imports as draft. Promote to activate.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!parsed || errors.length > 0 || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FileJson className="w-4 h-4 mr-2" />
                  Import Pipeline
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

