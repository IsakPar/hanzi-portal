import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface ImportCompleteStepProps {
  result: ImportResult;
  onReset: () => void;
}

export function ImportCompleteStep({ result, onReset }: ImportCompleteStepProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        {result.success > 0 ? (
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
        ) : (
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
        )}
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          {result.success > 0 ? 'Import Complete!' : 'Import Failed'}
        </h3>
        <p className="text-gray-600 mb-6">
          {result.success > 0 ? (
            <>
              Successfully imported <strong className="text-green-600">{result.success}</strong> entries
              {result.failed > 0 && (
                <span className="text-red-600"> ({result.failed} failed)</span>
              )}
            </>
          ) : (
            <span className="text-red-600">All {result.failed} entries failed to import</span>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onReset}>
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
      {result.errors && result.errors.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Error Details ({result.errors.length})
          </h4>
          <p className="text-sm text-red-700 mb-3">
            Check the browser console (F12 → Console) for more details
          </p>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {result.errors.map((error, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 text-sm text-red-800 font-mono">
                {error}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

