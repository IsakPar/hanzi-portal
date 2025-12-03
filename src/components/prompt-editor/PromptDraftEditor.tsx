import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface PromptDraftEditorProps {
  body: string;
  setBody: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  saving: boolean;
  onSave: () => void;
}

export function PromptDraftEditor({
  body,
  setBody,
  notes,
  setNotes,
  saving,
  onSave,
}: PromptDraftEditorProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Save className="w-5 h-5 text-purple-600" />
        Create New Draft
      </h2>

      <div className="space-y-4">
        <div>
          <Label htmlFor="body">Prompt Body *</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="You are an expert Chinese language teacher..."
            rows={15}
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Tip: Use variables like {`{{targets}}`}, {`{{grammar}}`}, {`{{context}}`}
          </p>
        </div>

        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What changed in this version? Why?"
            rows={3}
          />
        </div>

        <Button
          onClick={onSave}
          disabled={saving || !body.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Draft'}
        </Button>
      </div>
    </div>
  );
}

