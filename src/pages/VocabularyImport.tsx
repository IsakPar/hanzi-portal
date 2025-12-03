/**
 * VocabularyImport Page
 * Bulk import vocabulary from CSV or JSON files
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { bulkImportVocabulary, type CreateVocabularyInput } from '@/services/vocabularyAPI';
import { toast } from '@/hooks/useToast';
import {
  ImportUploadStep,
  ImportPreviewStep,
  ImportProgressStep,
  ImportCompleteStep,
} from '@/components/vocabulary-import';

interface ParsedEntry extends CreateVocabularyInput {
  _rowNum?: number;
  _errors?: string[];
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

// Category abbreviation mappings
const CATEGORY_MAP: Record<string, string> = {
  'noun': 'noun', 'verb': 'verb', 'adjective': 'adjective', 'adverb': 'adverb',
  'pronoun': 'pronoun', 'preposition': 'preposition', 'conjunction': 'conjunction',
  'particle': 'particle', 'number': 'number', 'expression': 'expression',
  'interjection': 'interjection', 'prep': 'preposition', 'adv': 'adverb',
  'part': 'particle', 'expr': 'expression', 'int': 'interjection', 'n': 'noun',
  'v': 'verb', 'adj': 'adjective', 'conj': 'conjunction', 'num': 'number',
  'mw': 'measure_word', 'pn': 'pronoun', 'pron': 'pronoun', 'phr': 'phrase',
  'aux': 'auxiliary', 'prefix': 'prefix', 'prep/conj': 'preposition',
  'aux/verb': 'verb', 'mw/adv': 'measure_word', 'adj/adv': 'adjective',
};

export function VocabularyImport() {
  const navigate = useNavigate();
  
  const [step, setStep] = useState<ImportStep>('upload');
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [validEntries, setValidEntries] = useState<ParsedEntry[]>([]);
  const [invalidEntries, setInvalidEntries] = useState<ParsedEntry[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [defaultHskLevel, setDefaultHskLevel] = useState(1);

  const mapCategory = useCallback((abbrev: string): string => {
    const lower = abbrev.toLowerCase().trim();
    return CATEGORY_MAP[lower] || lower;
  }, []);

  const parseCSV = useCallback((content: string): ParsedEntry[] => {
    const lines = content.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const entries: ParsedEntry[] = [];
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('hanzi') || firstLine.includes('pinyin') || 
                      firstLine.includes('english') || firstLine.includes('chinese');

    if (hasHeader) {
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const entry: ParsedEntry = {
          hanzi: '', pinyin: '', english: '', category: '',
          hskLevel: defaultHskLevel, _rowNum: i + 1, _errors: [],
        };

        headers.forEach((header, idx) => {
          const value = values[idx] || '';
          switch (header) {
            case 'hanzi': case 'chinese': case 'character':
              entry.hanzi = value; break;
            case 'pinyin':
              entry.pinyin = value; break;
            case 'english': case 'meaning': case 'definition':
              entry.english = value; break;
            case 'category': case 'type': case 'pos':
              entry.category = mapCategory(value); break;
            case 'hsk': case 'hsklevel': case 'hsk_level': case 'level':
              entry.hskLevel = parseInt(value) || defaultHskLevel; break;
            case 'tags':
              entry.tags = value.split(';').map(t => t.trim()).filter(Boolean); break;
          }
        });
        entries.push(entry);
      }
    } else {
      for (let i = 0; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const firstCol = values[0] || '';
        const isIdFormat = /^[A-Z]-?\d+$/.test(firstCol) || /^\d+$/.test(firstCol);
        
        let entry: ParsedEntry;
        
        if (isIdFormat && values.length >= 5) {
          entry = {
            hanzi: values[1] || '', pinyin: values[2] || '',
            category: mapCategory(values[3] || ''), english: values[4] || '',
            hskLevel: defaultHskLevel, _rowNum: i + 1, _errors: [],
          };
        } else if (values.length >= 4) {
          entry = {
            hanzi: values[0] || '', pinyin: values[1] || '',
            english: values[2] || '', category: mapCategory(values[3] || ''),
            hskLevel: values[4] ? (parseInt(values[4]) || defaultHskLevel) : defaultHskLevel,
            _rowNum: i + 1, _errors: [],
          };
        } else {
          continue;
        }
        entries.push(entry);
      }
    }
    return entries;
  }, [defaultHskLevel, mapCategory]);

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
        _rowNum: idx + 1, _errors: [],
      }));
    } catch {
      return [];
    }
  }, []);

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

  const handleImport = async () => {
    if (validEntries.length === 0) return;

    setStep('importing');
    setImportProgress(0);

    const batchSize = 100;
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < validEntries.length; i += batchSize) {
      const batch = validEntries.slice(i, i + batchSize).map(({ _rowNum, _errors, ...entry }) => entry);
      
      try {
        const result = await bulkImportVocabulary({ entries: batch });
        if (result.success) {
          imported += result.imported || batch.length;
        } else {
          failed += batch.length;
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: Server returned success=false`);
        }
      } catch (err) {
        failed += batch.length;
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${err instanceof Error ? err.message : String(err)}`);
      }

      setImportProgress(Math.round(((i + batch.length) / validEntries.length) * 100));
    }

    setImportResult({ success: imported, failed, errors });
    setStep('complete');
    
    if (imported > 0) {
      toast.success('Import complete', `${imported} entries imported${failed > 0 ? `, ${failed} failed` : ''}`);
    } else {
      toast.error('Import failed', `All ${failed} entries failed to import`);
    }
  };

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

  const resetImport = () => {
    setStep('upload');
    setEntries([]);
    setValidEntries([]);
    setInvalidEntries([]);
    setImportResult(null);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button variant="outline" onClick={() => navigate('/vocabulary')} className="mb-4">
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

      {step === 'upload' && (
        <ImportUploadStep
          defaultHskLevel={defaultHskLevel}
          setDefaultHskLevel={setDefaultHskLevel}
          onFileSelect={handleFile}
          onDownloadTemplate={downloadTemplate}
        />
      )}

      {step === 'preview' && (
        <ImportPreviewStep
          entries={entries}
          validEntries={validEntries}
          invalidEntries={invalidEntries}
          onCancel={resetImport}
          onImport={handleImport}
        />
      )}

      {step === 'importing' && (
        <ImportProgressStep progress={importProgress} />
      )}

      {step === 'complete' && importResult && (
        <ImportCompleteStep
          result={importResult}
          onReset={resetImport}
        />
      )}
    </div>
  );
}
