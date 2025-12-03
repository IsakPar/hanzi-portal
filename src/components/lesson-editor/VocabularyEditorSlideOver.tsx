/**
 * VocabularyEditorSlideOver
 * 
 * Slide-over panel that wraps the real VocabularyEditor component.
 * This reuses ALL the functionality from the actual vocab editor page.
 */

import { VocabularyEditor } from '@/pages/VocabularyEditor';

interface VocabularyEditorSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  /** Word ID for editing existing vocab, null for new */
  wordId?: string | null;
  /** Initial hanzi for new words */
  initialHanzi?: string;
  /** Called when word is saved successfully */
  onSaved?: () => void;
}

export function VocabularyEditorSlideOver({
  isOpen,
  onClose,
  wordId,
  initialHanzi = '',
  onSaved,
}: VocabularyEditorSlideOverProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-[60] overflow-y-auto">
        <VocabularyEditor
          wordId={wordId}
          initialHanzi={initialHanzi}
          embedded={true}
          onSaved={onSaved}
          onClose={onClose}
        />
      </div>
    </>
  );
}

export default VocabularyEditorSlideOver;
