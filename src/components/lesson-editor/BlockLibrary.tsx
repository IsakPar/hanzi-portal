import type { BlockType } from "@/types/lesson";
import { 
  Type, 
  MessageSquare, 
  BookOpen, 
  Mic, 
  AudioWaveform,
  LayoutList, 
  CheckSquare, 
  Move, 
  AlertCircle, 
  Puzzle, 
  PartyPopper,
  Lightbulb,
  AlignLeft
} from "lucide-react";

interface BlockLibraryProps {
  onAddBlock: (type: BlockType) => void;
}

const BLOCK_CATEGORIES = [
  {
    label: "Content",
    color: "blue",
    gradient: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    hoverColor: "hover:border-blue-500",
    textColor: "text-blue-700",
    blocks: [
      { type: "intro", label: "Intro Card", icon: LayoutList },
      { type: "hero_hanzi", label: "Hero Character", icon: Type },
      { type: "explain", label: "Explanation", icon: AlignLeft },
      { type: "tip", label: "Tip / Note", icon: Lightbulb },
      { type: "pattern", label: "Grammar Pattern", icon: LayoutList },
    ] as const
  },
  {
    label: "Interactive",
    color: "purple",
    gradient: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    hoverColor: "hover:border-purple-500",
    textColor: "text-purple-700",
    blocks: [
      { type: "reading_passage", label: "Reading Passage", icon: BookOpen },
      { type: "dialogue", label: "Dialogue", icon: MessageSquare },
      { type: "speaking_practice", label: "Speaking (Basic)", icon: Mic },
      { type: "speech_practice_v2", label: "Speech V2 (Tones)", icon: AudioWaveform },
    ] as const
  },
  {
    label: "Exercises",
    color: "pink",
    gradient: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    hoverColor: "hover:border-pink-500",
    textColor: "text-pink-700",
    blocks: [
      { type: "exercise_multiple_choice", label: "Multiple Choice", icon: CheckSquare },
      { type: "exercise_drag_sentence", label: "Drag Sentence", icon: Move },
      { type: "exercise_spot_error", label: "Spot Error", icon: AlertCircle },
      { type: "exercise_build_sentence", label: "Build Sentence", icon: Puzzle },
      { type: "reading_comprehension", label: "Reading Comp.", icon: BookOpen },
    ] as const
  },
  {
    label: "Other",
    color: "green",
    gradient: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    hoverColor: "hover:border-green-500",
    textColor: "text-green-700",
    blocks: [
      { type: "celebration", label: "Celebration", icon: PartyPopper },
    ] as const
  }
];

export function BlockLibrary({ onAddBlock }: BlockLibraryProps) {
  return (
    <div className="w-80 border-r border-purple-100 bg-gradient-to-b from-white to-purple-50/30 flex flex-col h-full">
      <div className="p-6 border-b border-purple-100">
        <h3 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Block Library
        </h3>
        <p className="text-sm text-gray-500 mt-1">Click to add blocks to your lesson</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {BLOCK_CATEGORIES.map((category) => (
          <div key={category.label} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`h-1 w-6 rounded-full bg-gradient-to-r ${category.gradient}`} />
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                {category.label}
              </h4>
            </div>
            <div className="space-y-2">
              {category.blocks.map((block) => (
                <button
                  key={block.type}
                  className={`group w-full flex items-center gap-3 p-3 rounded-xl ${category.bgColor} border ${category.borderColor} ${category.hoverColor} hover:shadow-md transition-all hover:scale-[1.02]`}
                  onClick={() => onAddBlock(block.type as BlockType)}
                >
                  <div className={`p-2 bg-white rounded-lg border ${category.borderColor} group-hover:bg-gradient-to-r ${category.gradient} transition-all`}>
                    <block.icon size={18} className={`${category.textColor} group-hover:text-white transition-colors`} />
                  </div>
                  <span className={`font-medium text-sm ${category.textColor}`}>
                    {block.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

