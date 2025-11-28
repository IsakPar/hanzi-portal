/**
 * VocabularyImport Page
 * Bulk import vocabulary from CSV or JSON files
 * 
 * Supports:
 * - CSV format: hanzi,pinyin,english,category,hskLevel,tags
 * - JSON format: array of vocabulary objects
 * - Preview before import
 * - Validation with error highlighting
 * - Progress tracking
 * 
 * 380 LOC
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  X,
} from 'lucide-react';
import { bulkImportVocabulary, type CreateVocabularyInput } from '@/services/vocabularyAPI';
import { toast } from '@/hooks/useToast';

interface ParsedEntry extends CreateVocabularyInput {
  _rowNum?: number;
  _errors?: string[];
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

// Category abbreviation mappings
const CATEGORY_MAP: Record<string, string> = {
  // Full words
  'noun': 'noun',
  'verb': 'verb',
  'adjective': 'adjective',
  'adverb': 'adverb',
  'pronoun': 'pronoun',
  'preposition': 'preposition',
  'conjunction': 'conjunction',
  'particle': 'particle',
  'number': 'number',
  'expression': 'expression',
  'interjection': 'interjection',
  // Abbreviations
  'prep': 'preposition',
  'adv': 'adverb',
  'part': 'particle',
  'expr': 'expression',
  'int': 'interjection',
  'n': 'noun',
  'v': 'verb',
  'adj': 'adjective',
  'conj': 'conjunction',
  'num': 'number',
  'mw': 'measure_word',
  'pn': 'pronoun',
  'pron': 'pronoun',
  'phr': 'phrase',
  'aux': 'auxiliary',
  'prefix': 'prefix',
  // Compound categories (take first)
  'prep/conj': 'preposition',
  'aux/verb': 'verb',
  'mw/adv': 'measure_word',
  'adj/adv': 'adjective',
};

export function VocabularyImport() {
  const navigate = useNavigate();
  
  const [step, setStep] = useState<ImportStep>('upload');
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [validEntries, setValidEntries] = useState<ParsedEntry[]>([]);
  const [invalidEntries, setInvalidEntries] = useState<ParsedEntry[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [defaultHskLevel, setDefaultHskLevel] = useState(1);

  // Map category abbreviation to full name
  const mapCategory = useCallback((abbrev: string): string => {
    const lower = abbrev.toLowerCase().trim();
    return CATEGORY_MAP[lower] || lower;
  }, []);

  // Parse CSV content - supports both header-based and positional formats
  const parseCSV = useCallback((content: string): ParsedEntry[] => {
    const lines = content.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const entries: ParsedEntry[] = [];
    const firstLine = lines[0].toLowerCase();
    
    // Check if first line looks like a header (contains common header words)
    const hasHeader = firstLine.includes('hanzi') || 
                      firstLine.includes('pinyin') || 
                      firstLine.includes('english') ||
                      firstLine.includes('chinese');

    if (hasHeader) {
      // Header-based parsing (original logic)
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const entry: ParsedEntry = {
          hanzi: '',
          pinyin: '',
          english: '',
          category: '',
          hskLevel: defaultHskLevel,
          _rowNum: i + 1,
          _errors: [],
        };

        headers.forEach((header, idx) => {
          const value = values[idx] || '';
          switch (header) {
            case 'hanzi':
            case 'chinese':
            case 'character':
              entry.hanzi = value;
              break;
            case 'pinyin':
              entry.pinyin = value;
              break;
            case 'english':
            case 'meaning':
            case 'definition':
              entry.english = value;
              break;
            case 'category':
            case 'type':
            case 'pos':
              entry.category = mapCategory(value);
              break;
            case 'hsk':
            case 'hsklevel':
            case 'hsk_level':
            case 'level':
              entry.hskLevel = parseInt(value) || defaultHskLevel;
              break;
            case 'tags':
              entry.tags = value.split(';').map(t => t.trim()).filter(Boolean);
              break;
          }
        });

        entries.push(entry);
      }
    } else {
      // Positional parsing for format: ID,hanzi,pinyin,category,english
      // Also supports: hanzi,pinyin,english,category,hskLevel
      for (let i = 0; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        
        // Detect format by checking first column
        const firstCol = values[0] || '';
        const isIdFormat = /^[A-Z]-?\d+$/.test(firstCol) || /^\d+$/.test(firstCol);
        
        let entry: ParsedEntry;
        
        if (isIdFormat && values.length >= 5) {
          // Format: ID,hanzi,pinyin,category,english (skip ID)
          entry = {
            hanzi: values[1] || '',
            pinyin: values[2] || '',
            category: mapCategory(values[3] || ''),
            english: values[4] || '',
            hskLevel: defaultHskLevel,
            _rowNum: i + 1,
            _errors: [],
          };
        } else if (values.length >= 4) {
          // Format: hanzi,pinyin,english,category (or similar)
          entry = {
            hanzi: values[0] || '',
            pinyin: values[1] || '',
            english: values[2] || '',
            category: mapCategory(values[3] || ''),
            hskLevel: values[4] ? (parseInt(values[4]) || defaultHskLevel) : defaultHskLevel,
            _rowNum: i + 1,
            _errors: [],
          };
        } else {
          // Skip malformed lines
          continue;
        }
        
        entries.push(entry);
      }
    }

    return entries;
  }, [defaultHskLevel, mapCategory]);

  // Parse JSON content
  const parseJSON = useCallback((content: string): ParsedEntry[] => {
    try {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : data.entries || data.vocabulary || [];
      
      return items.map((item: Record<string, unknown>, idx: number) => ({
        hanzi: String(item.hanzi || item.chinese || item.character || ''),
        pinyin: String(item.pinyin || ''),
        english: String(item.english || item.meaning || item.definition || ''),
        category: String(item.category || item.type || item.pos || '').toLowerCase(),
        hskLevel: Number(item.hskLevel || item.hsk_level || item.hsk || item.level) || 1,
        tags: Array.isArray(item.tags) ? item.tags : undefined,
        exampleChinese: item.exampleChinese ? String(item.exampleChinese) : undefined,
        examplePinyin: item.examplePinyin ? String(item.examplePinyin) : undefined,
        exampleEnglish: item.exampleEnglish ? String(item.exampleEnglish) : undefined,
        _rowNum: idx + 1,
        _errors: [],
      }));
    } catch {
      return [];
    }
  }, []);

  // Validate entries
  const validateEntries = useCallback((entries: ParsedEntry[]): { valid: ParsedEntry[]; invalid: ParsedEntry[] } => {
    const valid: ParsedEntry[] = [];
    const invalid: ParsedEntry[] = [];

    entries.forEach(entry => {
      const errors: string[] = [];

      if (!entry.hanzi) errors.push('Missing hanzi');
      if (!entry.pinyin) errors.push('Missing pinyin');
      if (!entry.english) errors.push('Missing english');
      if (!entry.category) errors.push('Missing category');
      if (entry.hskLevel < 1 || entry.hskLevel > 9) errors.push('Invalid HSK level (1-9)');

      if (errors.length > 0) {
        invalid.push({ ...entry, _errors: errors });
      } else {
        valid.push(entry);
      }
    });

    return { valid, invalid };
  }, []);

  // Handle file upload
  const handleFile = useCallback(async (file: File) => {
    const content = await file.text();
    let parsed: ParsedEntry[];

    if (file.name.endsWith('.json')) {
      parsed = parseJSON(content);
    } else if (file.name.endsWith('.csv')) {
      parsed = parseCSV(content);
    } else {
      toast.error('Invalid file', 'Please upload a CSV or JSON file');
      return;
    }

    if (parsed.length === 0) {
      toast.error('No entries found', 'The file appears to be empty or incorrectly formatted');
      return;
    }

    setEntries(parsed);
    const { valid, invalid } = validateEntries(parsed);
    setValidEntries(valid);
    setInvalidEntries(invalid);
    setStep('preview');
  }, [parseCSV, parseJSON, validateEntries]);

  // Handle drag and drop
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
    if (file) handleFile(file);
  }, [handleFile]);

  // Handle import
  const handleImport = async () => {
    if (validEntries.length === 0) return;

    setStep('importing');
    setImportProgress(0);

    // Import in batches of 100
    const batchSize = 100;
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    console.log(`[Import] Starting import of ${validEntries.length} entries...`);

    for (let i = 0; i < validEntries.length; i += batchSize) {
      const batchNum = Math.floor(i / batchSize) + 1;
      const batch = validEntries.slice(i, i + batchSize).map(({ _rowNum, _errors, ...entry }) => entry);
      
      console.log(`[Import] Batch ${batchNum}: Sending ${batch.length} entries...`);
      console.log('[Import] Sample entry:', JSON.stringify(batch[0], null, 2));
      
      try {
        const result = await bulkImportVocabulary({ entries: batch });
        console.log(`[Import] Batch ${batchNum} result:`, result);
        
        if (result.success) {
          imported += result.imported || batch.length;
        } else {
          failed += batch.length;
          const errMsg = `Batch ${batchNum}: Server returned success=false`;
          errors.push(errMsg);
          console.error(`[Import] ${errMsg}`);
        }
      } catch (err) {
        failed += batch.length;
        const errMsg = err instanceof Error ? err.message : String(err);
        const fullErr = `Batch ${batchNum} (rows ${i + 1}-${i + batch.length}): ${errMsg}`;
        errors.push(fullErr);
        console.error(`[Import] ${fullErr}`, err);
      }

      setImportProgress(Math.round(((i + batch.length) / validEntries.length) * 100));
    }

    console.log(`[Import] Complete: ${imported} imported, ${failed} failed`);
    
    setImportResult({ success: imported, failed, errors });
    setStep('complete');
    
    if (imported > 0) {
      toast.success('Import complete', `${imported} entries imported${failed > 0 ? `, ${failed} failed` : ''}`);
    } else {
      toast.error('Import failed', `All ${failed} entries failed to import`);
    }
  };

  // Download template
  const downloadTemplate = (format: 'csv' | 'json') => {
    if (format === 'csv') {
      const content = `hanzi,pinyin,english,category,hskLevel,tags
你好,nǐ hǎo,hello,greeting,1,common;formal
谢谢,xiè xiè,thank you,verb,1,common
学习,xué xí,to study,verb,1,education`;
      const blob = new Blob([content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vocabulary-template.csv';
      a.click();
    } else {
      const content = JSON.stringify([
        { hanzi: '你好', pinyin: 'nǐ hǎo', english: 'hello', category: 'greeting', hskLevel: 1, tags: ['common', 'formal'] },
        { hanzi: '谢谢', pinyin: 'xiè xiè', english: 'thank you', category: 'verb', hskLevel: 1, tags: ['common'] },
        { hanzi: '学习', pinyin: 'xué xí', english: 'to study', category: 'verb', hskLevel: 1, tags: ['education'] },
      ], null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vocabulary-template.json';
      a.click();
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="outline"
          onClick={() => navigate('/vocabulary')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Vocabulary
        </Button>

        <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
          Import Vocabulary
        </h1>
        <p className="text-gray-600 mt-2">
          Bulk import vocabulary entries from CSV or JSON files
        </p>
      </div>

      {/* Upload Step */}
      {step === 'upload' && (
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
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
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
              <Button variant="outline" onClick={() => downloadTemplate('csv')}>
                <Download className="w-4 h-4 mr-2" />
                CSV Template
              </Button>
              <Button variant="outline" onClick={() => downloadTemplate('json')}>
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
      )}

      {/* Preview Step */}
      {step === 'preview' && (
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
            <Button
              variant="outline"
              onClick={() => {
                setStep('upload');
                setEntries([]);
                setValidEntries([]);
                setInvalidEntries([]);
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={validEntries.length === 0}
              className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import {validEntries.length} Entries
            </Button>
          </div>
        </div>
      )}

      {/* Importing Step */}
      {step === 'importing' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Importing...</h3>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="bg-purple-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">{importProgress}% complete</p>
        </div>
      )}

      {/* Complete Step */}
      {step === 'complete' && importResult && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            {importResult.success > 0 ? (
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
            ) : (
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
            )}
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              {importResult.success > 0 ? 'Import Complete!' : 'Import Failed'}
            </h3>
            <p className="text-gray-600 mb-6">
              {importResult.success > 0 ? (
                <>
                  Successfully imported <strong className="text-green-600">{importResult.success}</strong> entries
                  {importResult.failed > 0 && (
                    <span className="text-red-600"> ({importResult.failed} failed)</span>
                  )}
                </>
              ) : (
                <span className="text-red-600">All {importResult.failed} entries failed to import</span>
              )}
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('upload');
                  setEntries([]);
                  setValidEntries([]);
                  setInvalidEntries([]);
                  setImportResult(null);
                }}
              >
                Import More
              </Button>
              <Button
                onClick={() => navigate('/vocabulary')}
                className="bg-gradient-to-r from-pink-600 to-purple-600"
              >
                View Vocabulary
              </Button>
            </div>
          </div>

          {/* Error Details */}
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-6">
              <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Error Details ({importResult.errors.length})
              </h4>
              <p className="text-sm text-red-700 mb-3">
                Check the browser console (F12 → Console) for more details
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {importResult.errors.map((error, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 text-sm text-red-800 font-mono">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

