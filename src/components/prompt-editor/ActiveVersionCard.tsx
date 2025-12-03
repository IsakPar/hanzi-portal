import { CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PromptTemplate } from '@/services/promptsAPI';

interface ActiveVersionCardProps {
  version: PromptTemplate;
  saving: boolean;
  onRollback: () => void;
}

export function ActiveVersionCard({ version, saving, onRollback }: ActiveVersionCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-green-300 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-green-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Active Version
        </h3>
        <span className="text-sm font-mono text-green-600">
          v{version.version}
        </span>
      </div>

      <div className="text-xs text-gray-600 space-y-1 mb-4">
        <p>Updated: {new Date(version.updatedAt).toLocaleDateString()}</p>
        <p>Promoted by: {version.promotedBy || 'System'}</p>
      </div>

      <p className="text-sm text-gray-700 mb-4 line-clamp-3 bg-gray-50 p-3 rounded font-mono">
        {version.steps 
          ? `Pipeline with ${version.steps.length} step(s)`
          : version.body || 'No body defined'
        }
      </p>

      <Button
        onClick={onRollback}
        variant="outline"
        size="sm"
        className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
        disabled={saving}
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Rollback
      </Button>
    </div>
  );
}

