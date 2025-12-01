/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Block Editor Component
 * Dynamically renders the appropriate editor based on block type
 * 
 * Note: Using 'any' for content updates as blocks have different structures
 */

import type { ContentBlock } from "@/types/lesson";
import { IntroEditor } from "./block-editors/IntroEditor";
import { HeroHanziEditor } from "./block-editors/HeroHanziEditor";
import { ExplainEditor } from "./block-editors/ExplainEditor";
import { TipEditor } from "./block-editors/TipEditor";
import { PatternEditor } from "./block-editors/PatternEditor";
import { DialogueEditor } from "./block-editors/DialogueEditor";
import { ReadingPassageEditor } from "./block-editors/ReadingPassageEditor";
import { ReadingComprehensionEditor } from "./block-editors/ReadingComprehensionEditor";
import { SpeakingPracticeEditor } from "./block-editors/SpeakingPracticeEditor";
import { SpeechPracticeV2Editor } from "./block-editors/SpeechPracticeV2Editor";
import { MultipleChoiceEditor } from "./block-editors/MultipleChoiceEditor";
import { DragSentenceEditor } from "./block-editors/DragSentenceEditor";
import { SpotTheErrorEditor } from "./block-editors/SpotTheErrorEditor";
import { BuildSentenceEditor } from "./block-editors/BuildSentenceEditor";
import { CelebrationEditor } from "./block-editors/CelebrationEditor";

interface BlockEditorProps {
  block: ContentBlock;
  onChange: (block: ContentBlock) => void;
  lessonId?: string;
  hskLevel?: number;
}

export function BlockEditor({ block, onChange, lessonId, hskLevel = 1 }: BlockEditorProps) {
  // Handler for individual field changes (used by block editors)
  const handleFieldChange = (field: string, value: any) => {
    onChange({ ...block, [field]: value });
  };

  switch (block.type) {
    case "intro":
      return <IntroEditor block={block} onChange={handleFieldChange} lessonId={lessonId} />;
    
    case "hero_hanzi":
      return <HeroHanziEditor block={block} onChange={handleFieldChange} lessonId={lessonId} />;
    
    case "explain":
      return <ExplainEditor block={block} onChange={handleFieldChange} />;
    
    case "tip":
      return <TipEditor block={block} onChange={handleFieldChange} />;
    
    case "pattern":
      return <PatternEditor block={block} onChange={handleFieldChange} lessonId={lessonId} hskLevel={hskLevel} />;
    
    case "dialogue":
      return <DialogueEditor block={block} onChange={handleFieldChange} lessonId={lessonId} />;
    
    case "reading_passage":
      return <ReadingPassageEditor block={block} onChange={handleFieldChange} lessonId={lessonId} />;
    
    case "reading_comprehension":
      return <ReadingComprehensionEditor block={block} onChange={handleFieldChange} lessonId={lessonId} hskLevel={hskLevel} />;
    
    case "speaking_practice":
      return <SpeakingPracticeEditor block={block} onChange={handleFieldChange} lessonId={lessonId} />;
    
    case "speech_practice_v2":
      return <SpeechPracticeV2Editor block={block} onChange={handleFieldChange} lessonId={lessonId} />;
    
    case "exercise_multiple_choice":
      return <MultipleChoiceEditor block={block} onChange={handleFieldChange} lessonId={lessonId} hskLevel={hskLevel} />;
    
    case "exercise_drag_sentence":
      return <DragSentenceEditor block={block} onChange={handleFieldChange} lessonId={lessonId} hskLevel={hskLevel} />;
    
    case "exercise_spot_error":
      return <SpotTheErrorEditor block={block} onChange={handleFieldChange} lessonId={lessonId} />;
    
    case "exercise_build_sentence":
      return <BuildSentenceEditor block={block} onChange={handleFieldChange} lessonId={lessonId} hskLevel={hskLevel} />;
    
    case "celebration":
      return <CelebrationEditor block={block} onChange={handleFieldChange} />;
    
    default:
      // TypeScript ensures this never happens with proper typing
      return (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <p className="text-red-700">
            Unknown block type: <code>{(block as any).type}</code>
          </p>
        </div>
      );
  }
}
