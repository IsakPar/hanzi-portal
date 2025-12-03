import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StoryTemplate } from '@/services/storiesAPI';

interface StoryImportModalProps {
  importJson: string;
  setImportJson: (v: string) => void;
  template: StoryTemplate | null;
  importing: boolean;
  onImport: () => void;
  onClose: () => void;
}

export function StoryImportModal({
  importJson,
  setImportJson,
  template,
  importing,
  onImport,
  onClose,
}: StoryImportModalProps) {
  // Try to parse JSON and show preview
  const preview = (() => {
    if (!importJson.trim()) return null;
    try {
      const parsed = JSON.parse(importJson) as StoryTemplate;
      const errors: string[] = [];
      
      if (!parsed.title) errors.push('❌ Missing title');
      if (!parsed.hskLevel || parsed.hskLevel < 1 || parsed.hskLevel > 9) errors.push('❌ Invalid hskLevel (1-9)');
      if (!parsed.segments || !Array.isArray(parsed.segments)) errors.push('❌ Missing segments array');
      else if (parsed.segments.length === 0) errors.push('❌ No segments');
      else {
        const invalidSegs = parsed.segments.filter((s) => !s.chinese);
        if (invalidSegs.length > 0) errors.push(`❌ ${invalidSegs.length} segments missing Chinese text`);
      }
      
      if (parsed.difficulty && !['easy', 'medium', 'hard'].includes(parsed.difficulty)) {
        errors.push(`❌ Invalid difficulty: ${parsed.difficulty}`);
      }
      
      return { parsed, errors };
    } catch {
      return { parseError: true };
    }
  })();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Import Story from JSON</h2>
            <p className="text-sm text-gray-500 mt-1">Paste your story JSON below</p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
        
        <div className="flex-1 overflow-auto p-6 grid grid-cols-2 gap-6">
          {/* JSON Input */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">JSON Input</label>
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='{"title": "My Story", "hskLevel": 1, "segments": [...]}'
              className="flex-1 font-mono text-sm p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[300px]"
            />
          </div>
          
          {/* Preview */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">Preview</label>
            <div className="flex-1 border border-gray-300 rounded-lg p-4 overflow-auto bg-gray-50 min-h-[300px]">
              {!importJson.trim() ? (
                <div className="text-gray-400 text-center py-8">
                  Paste JSON to see preview
                </div>
              ) : preview?.parseError ? (
                <div className="text-red-600 bg-red-50 p-4 rounded-lg">
                  <div className="font-medium mb-2">❌ Invalid JSON syntax</div>
                  <p className="text-sm">Check for missing commas, brackets, or quotes</p>
                </div>
              ) : preview?.parsed ? (
                <div className="space-y-4">
                  {/* Validation Status */}
                  {preview.errors.length > 0 ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-red-700 font-medium mb-1">Validation Errors</div>
                      {preview.errors.map((err, i) => (
                        <div key={i} className="text-sm text-red-600">{err}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-green-700 font-medium">✅ Valid - Ready to import</div>
                    </div>
                  )}
                  
                  {/* Story Info */}
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      {preview.parsed.title || '(No title)'}
                    </h3>
                    <div className="flex gap-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        HSK {preview.parsed.hskLevel || '?'}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded capitalize">
                        {preview.parsed.difficulty || 'medium'}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                        {preview.parsed.segments?.length || 0} segments
                      </span>
                    </div>
                    {preview.parsed.description && (
                      <p className="mt-2 text-sm text-gray-600">{preview.parsed.description}</p>
                    )}
                  </div>
                  
                  {/* Segments Preview */}
                  {preview.parsed.segments && preview.parsed.segments.length > 0 && (
                    <div className="bg-white border rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Segments Preview</div>
                      <div className="space-y-2 max-h-40 overflow-auto">
                        {preview.parsed.segments.slice(0, 5).map((seg, i) => (
                          <div key={i} className="text-sm p-2 bg-gray-50 rounded">
                            <span className="text-gray-400 mr-2">{i + 1}.</span>
                            <span className="font-medium">{seg.chinese || '(empty)'}</span>
                            {seg.pinyin && <span className="text-gray-500 ml-2">{seg.pinyin}</span>}
                          </div>
                        ))}
                        {preview.parsed.segments.length > 5 && (
                          <div className="text-sm text-gray-500 italic">
                            ...and {preview.parsed.segments.length - 5} more segments
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Practice Blocks */}
                  {preview.parsed.practiceBlocks && preview.parsed.practiceBlocks.length > 0 && (
                    <div className="text-sm text-gray-600">
                      📝 {preview.parsed.practiceBlocks.length} practice blocks included
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center p-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (template) {
                setImportJson(JSON.stringify(template, null, 2));
              }
            }}
          >
            Load Example Template
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={onImport} 
              disabled={importing || !preview?.parsed || (preview?.errors?.length || 0) > 0}
            >
              {importing ? 'Importing...' : 'Import Story'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

