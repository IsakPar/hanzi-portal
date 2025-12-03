import { Loader2 } from 'lucide-react';

interface ImportProgressStepProps {
  progress: number;
}

export function ImportProgressStep({ progress }: ImportProgressStepProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
      <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-600" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Importing...</h3>
      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
        <div
          className="bg-purple-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-gray-500">{progress}% complete</p>
    </div>
  );
}

