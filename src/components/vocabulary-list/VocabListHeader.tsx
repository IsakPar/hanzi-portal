import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload, Bot } from "lucide-react";

interface VocabListHeaderProps {
  total: number;
  onExport: () => void;
}

export function VocabListHeader({ total, onExport }: VocabListHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Vocabulary Database
          </h1>
          <p className="text-gray-600 mt-2">
            {total} total entries
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate("/vocabulary/tagging")}
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            <Bot className="w-4 h-4 mr-2" />
            AI Tagging
          </Button>
          <Button
            onClick={() => navigate("/vocabulary/import")}
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button
            onClick={onExport}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => navigate("/vocabulary/new")}
            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>
    </div>
  );
}

