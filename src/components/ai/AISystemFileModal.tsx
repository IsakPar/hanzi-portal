/**
 * AI System File Modal
 * For creating and editing persistent system files
 */

import { useState } from 'react';
import { X, Save, Loader2, FileText, FileCode, FileJson } from 'lucide-react';
import { useAIAssistant, type SystemFile } from '@/contexts/AIAssistantContext';

interface AISystemFileModalProps {
  file: SystemFile | null; // null = create new
  onClose: () => void;
}

export function AISystemFileModal({ file, onClose }: AISystemFileModalProps) {
  const { addSystemFile, updateSystemFile } = useAIAssistant();
  
  const [name, setName] = useState(file?.name || '');
  const [description, setDescription] = useState(file?.description || '');
  const [content, setContent] = useState(file?.content || '');
  const [fileType, setFileType] = useState<'text' | 'markdown' | 'json'>(file?.fileType || 'text');
  const [isActive, setIsActive] = useState(file?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!file;

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) {
      setError('Name and content are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditing) {
        await updateSystemFile(file.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          content: content.trim(),
          fileType,
          isActive,
        });
      } else {
        await addSystemFile({
          name: name.trim(),
          description: description.trim() || undefined,
          content: content.trim(),
          fileType,
          isActive,
          orderIndex: 0,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const fileTypeOptions = [
    { value: 'text', label: 'Plain Text', icon: FileText },
    { value: 'markdown', label: 'Markdown', icon: FileCode },
    { value: 'json', label: 'JSON', icon: FileJson },
  ] as const;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit System File' : 'Add System File'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., HSK 1 Vocabulary List"
              className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this file's purpose"
              className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm"
            />
          </div>

          {/* File Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">File Type</label>
            <div className="flex gap-2">
              {fileTypeOptions.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFileType(opt.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                      fileType === opt.value
                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                        : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={16} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                fileType === 'json' 
                  ? '{\n  "key": "value"\n}' 
                  : fileType === 'markdown'
                  ? '# Title\n\nContent here...'
                  : 'Enter your reference content...'
              }
              className="w-full h-64 px-4 py-3 bg-gray-50 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm font-mono resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              This content will be included in every AI conversation as reference material.
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Active</p>
              <p className="text-xs text-gray-500">Include this file in AI conversations</p>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${
                  isActive ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !content.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

