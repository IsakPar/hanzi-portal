import { Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/useToast';
import type { StoryTemplate } from '@/services/storiesAPI';

interface StoryTemplateModalProps {
  template: StoryTemplate;
  onClose: () => void;
}

export function StoryTemplateModal({ template, onClose }: StoryTemplateModalProps) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(template, null, 2));
    toast.success("Template copied!", "Paste and edit in your favorite editor");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Story JSON Template</h2>
            <p className="text-sm text-gray-500 mt-1">Copy this template and fill in your content</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleCopy} className="gap-2">
              <Copy size={16} />
              Copy Template
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-auto font-mono">
            {JSON.stringify(template, null, 2)}
          </pre>
        </div>
        <div className="p-4 border-t bg-blue-50">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Edit the template in your favorite editor, then use "Import JSON" to create the story.
            You can import the template as-is to create an example story.
          </p>
        </div>
      </div>
    </div>
  );
}

