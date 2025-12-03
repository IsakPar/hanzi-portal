import { Clock, Copy, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PromptTemplate } from '@/services/promptsAPI';

interface DraftVersionsListProps {
  versions: PromptTemplate[];
  saving: boolean;
  onClone: (version: number) => void;
  onPromote: (version: number, reason: string) => void;
}

export function DraftVersionsList({ versions, saving, onClone, onPromote }: DraftVersionsListProps) {
  if (versions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-yellow-600" />
        Draft Versions ({versions.length})
      </h3>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {versions.map((version) => (
          <div
            key={version.id}
            className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm font-semibold">
                v{version.version}
              </span>
              <span className="text-xs text-gray-600">
                {new Date(version.createdAt).toLocaleDateString()}
              </span>
            </div>

            {version.notes && (
              <p className="text-xs text-gray-700 mb-2 italic">
                "{version.notes}"
              </p>
            )}

            <div className="flex gap-2 mt-3">
              <Button
                onClick={() => onClone(version.version)}
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                disabled={saving}
              >
                <Copy className="w-3 h-3 mr-1" />
                Clone
              </Button>
              <Button
                onClick={() => {
                  const reason = window.prompt('Reason for promotion:');
                  if (reason) {
                    onPromote(version.version, reason);
                  }
                }}
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                disabled={saving}
              >
                <Rocket className="w-3 h-3 mr-1" />
                Promote
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

