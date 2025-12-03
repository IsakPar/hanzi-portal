import { useNavigate } from 'react-router-dom';
import { Plus, FileJson, Upload, Library, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StoriesHeaderProps {
  onShowTemplateModal: () => void;
  onShowImportModal: () => void;
  onShowSeriesModal: () => void;
  onShowCategoryModal: () => void;
}

export function StoriesHeader({
  onShowTemplateModal,
  onShowImportModal,
  onShowSeriesModal,
  onShowCategoryModal,
}: StoriesHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-800">
          Stories
        </h1>
        <p className="text-gray-600 mt-1">Reading comprehension content with practice exercises</p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onShowCategoryModal}
          className="gap-2"
        >
          <LayoutGrid size={18} />
          Categories
        </Button>
        <Button
          variant="outline"
          onClick={onShowSeriesModal}
          className="gap-2"
        >
          <Library size={18} />
          Series
        </Button>
        <Button
          variant="outline"
          onClick={onShowTemplateModal}
          className="gap-2"
        >
          <FileJson size={18} />
          Template
        </Button>
        <Button
          variant="outline"
          onClick={onShowImportModal}
          className="gap-2"
        >
          <Upload size={18} />
          Import JSON
        </Button>
        <button 
          onClick={() => navigate("/stories/new/edit")}
          className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all hover:scale-105 flex items-center gap-2"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform" />
          Create Story
        </button>
      </div>
    </div>
  );
}

