import { useNavigate } from 'react-router-dom';
import { BookOpen, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStoriesStateProps {
  onShowImportModal: () => void;
}

export function EmptyStoriesState({ onShowImportModal }: EmptyStoriesStateProps) {
  const navigate = useNavigate();

  return (
    <div className="text-center py-16">
      <BookOpen size={64} className="mx-auto text-gray-300 mb-4" />
      <h3 className="text-xl font-semibold text-gray-600 mb-2">No stories yet</h3>
      <p className="text-gray-500 mb-6">Create your first story to get started</p>
      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={onShowImportModal}
          className="gap-2"
        >
          <Upload size={18} />
          Import from JSON
        </Button>
        <button 
          onClick={() => navigate("/stories/new/edit")}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-medium"
        >
          Create Story
        </button>
      </div>
    </div>
  );
}

