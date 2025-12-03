import { Button } from '@/components/ui/button';

interface PipelineJsonEditorProps {
  jsonInput: string;
  setJsonInput: (value: string) => void;
  onApply: () => void;
}

export function PipelineJsonEditor({ jsonInput, setJsonInput, onApply }: PipelineJsonEditorProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Edit Pipeline JSON</h3>
          <p className="text-sm text-gray-500">
            Edit the raw JSON configuration. Changes apply when you save or switch to visual mode.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onApply}>
          Apply Changes
        </Button>
      </div>
      <textarea
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
        className="w-full h-[500px] px-4 py-3 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
        spellCheck={false}
      />
      <p className="mt-2 text-xs text-gray-400">
        Tip: Edit steps, costLimits, qualityGate, and notes. Slug cannot be changed.
      </p>
    </div>
  );
}

