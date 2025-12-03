import { CheckCircle2, AlertCircle, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CreateVocabularyInput } from '@/services/vocabularyAPI';

interface ParsedEntry extends CreateVocabularyInput {
  _rowNum?: number;
  _errors?: string[];
}

interface ImportPreviewStepProps {
  entries: ParsedEntry[];
  validEntries: ParsedEntry[];
  invalidEntries: ParsedEntry[];
  onCancel: () => void;
  onImport: () => void;
}

export function ImportPreviewStep({
  entries,
  validEntries,
  invalidEntries,
  onCancel,
  onImport,
}: ImportPreviewStepProps) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{entries.length}</p>
          <p className="text-sm text-gray-500">Total Entries</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{validEntries.length}</p>
          <p className="text-sm text-green-600">Valid</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{invalidEntries.length}</p>
          <p className="text-sm text-red-600">Invalid</p>
        </div>
      </div>

      {/* Invalid Entries */}
      {invalidEntries.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Invalid Entries (will be skipped)
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {invalidEntries.slice(0, 10).map((entry, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Row {entry._rowNum}: {entry.hanzi || '(empty)'}</span>
                  <span className="text-red-600">{entry._errors?.join(', ')}</span>
                </div>
              </div>
            ))}
            {invalidEntries.length > 10 && (
              <p className="text-sm text-red-600">...and {invalidEntries.length - 10} more</p>
            )}
          </div>
        </div>
      )}

      {/* Valid Entries Preview */}
      {validEntries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Preview (first 10 entries)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Hanzi</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Pinyin</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">English</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Category</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">HSK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {validEntries.slice(0, 10).map((entry, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-xl">{entry.hanzi}</td>
                    <td className="px-4 py-2">{entry.pinyin}</td>
                    <td className="px-4 py-2">{entry.english}</td>
                    <td className="px-4 py-2">{entry.category}</td>
                    <td className="px-4 py-2">HSK {entry.hskLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={onImport}
          disabled={validEntries.length === 0}
          className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import {validEntries.length} Entries
        </Button>
      </div>
    </div>
  );
}

