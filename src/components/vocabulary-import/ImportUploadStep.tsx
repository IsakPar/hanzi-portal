import { useCallback, useState } from 'react';
import { Upload, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImportUploadStepProps {
  defaultHskLevel: number;
  setDefaultHskLevel: (level: number) => void;
  onFileSelect: (file: File) => void;
  onDownloadTemplate: (format: 'csv' | 'json') => void;
}

export function ImportUploadStep({
  defaultHskLevel,
  setDefaultHskLevel,
  onFileSelect,
  onDownloadTemplate,
}: ImportUploadStepProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  return (
    <div className="space-y-6">
      {/* Default HSK Level Selector */}
      <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
        <label className="block text-sm font-medium text-purple-900 mb-2">
          Default HSK Level for Import
        </label>
        <p className="text-xs text-purple-600 mb-3">
          This level will be applied to all entries that don't have an HSK level specified
        </p>
        <select
          value={defaultHskLevel}
          onChange={(e) => setDefaultHskLevel(Number(e.target.value))}
          className="w-full max-w-xs px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
            <option key={level} value={level}>HSK {level}</option>
          ))}
        </select>
      </div>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center transition-colors
          ${dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-white'}
        `}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-purple-500' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Drag & drop your file here
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to browse
        </p>
        <input
          type="file"
          accept=".csv,.json"
          onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button asChild className="cursor-pointer">
            <span>
              <FileText className="w-4 h-4 mr-2" />
              Choose File
            </span>
          </Button>
        </label>
        <p className="text-xs text-gray-400 mt-4">
          Supports CSV and JSON formats
        </p>
      </div>

      {/* Templates */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Download Templates</h3>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onDownloadTemplate('csv')}>
            <Download className="w-4 h-4 mr-2" />
            CSV Template
          </Button>
          <Button variant="outline" onClick={() => onDownloadTemplate('json')}>
            <Download className="w-4 h-4 mr-2" />
            JSON Template
          </Button>
        </div>
      </div>

      {/* Format Guide */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Required Fields</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">hanzi</p>
            <p className="text-gray-500">Chinese characters (你好)</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">pinyin</p>
            <p className="text-gray-500">Pronunciation with tones (nǐ hǎo)</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">english</p>
            <p className="text-gray-500">English meaning (hello)</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">category</p>
            <p className="text-gray-500">Part of speech (noun, verb, etc.)</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">hskLevel</p>
            <p className="text-gray-500">HSK level 1-9</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">tags (optional)</p>
            <p className="text-gray-500">Comma or semicolon separated</p>
          </div>
        </div>
      </div>
    </div>
  );
}

