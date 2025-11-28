/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import type { StoryWithDetails, StorySeries } from "@/services/storiesAPI";
import { getStorySeries } from "@/services/storiesAPI";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertCircle, Library } from "lucide-react";
import { splitIntoSegments, estimateSegmentCount } from "@/utils/textSplitter";
import { hanziToPinyin } from "@/services/chineseNLP";

interface StoryInfoTabProps {
  story: StoryWithDetails;
  onChange: (story: StoryWithDetails) => void;
  onGenerateSegments?: (segments: Array<{ chinese: string; pinyin: string; english: string }>) => void;
}

export function StoryInfoTab({ story, onChange, onGenerateSegments }: StoryInfoTabProps) {
  const [fullText, setFullText] = useState("");
  const [estimatedCount, setEstimatedCount] = useState(0);
  const [series, setSeries] = useState<StorySeries[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(true);

  useEffect(() => {
    getStorySeries()
      .then((data) => setSeries(data.series))
      .catch(() => {})
      .finally(() => setLoadingSeries(false));
  }, []);

  const handleChange = (field: keyof StoryWithDetails, value: any) => {
    onChange({ ...story, [field]: value });
  };

  const handleTextChange = (text: string) => {
    setFullText(text);
    setEstimatedCount(estimateSegmentCount(text));
  };

  const handleSplitText = () => {
    if (!fullText.trim()) return;
    
    const rawSegments = splitIntoSegments(fullText);
    const segments = rawSegments.map((chinese) => ({
      chinese,
      pinyin: hanziToPinyin(chinese),
      english: "", // User fills in translations
    }));
    
    onGenerateSegments?.(segments);
    setFullText(""); // Clear after splitting
    setEstimatedCount(0);
  };

  const pauseOptions = [
    { value: 0, label: "0ms" },
    { value: 250, label: "250ms" },
    { value: 500, label: "500ms" },
    { value: 1000, label: "1s" },
  ];

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Basic Information</h2>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={story.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="A Day in Beijing"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={story.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                placeholder="Daily Life Story"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={story.author || ''}
                onChange={(e) => handleChange('author', e.target.value)}
                placeholder="Teacher Li"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={story.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Learn about daily routines in Beijing..."
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Classification */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Classification</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hskLevel">HSK Level *</Label>
            <select
              id="hskLevel"
              value={story.hskLevel}
              onChange={(e) => handleChange('hskLevel', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                <option key={level} value={level}>
                  HSK {level}{level > 6 ? ' (HSK 3.0)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty *</Label>
            <select
              id="difficulty"
              value={story.difficulty}
              onChange={(e) => handleChange('difficulty', e.target.value as 'easy' | 'medium' | 'hard')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={story.topic || ''}
              onChange={(e) => handleChange('topic', e.target.value)}
              placeholder="daily_life, travel, business"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedMinutes">Duration (minutes)</Label>
            <Input
              id="estimatedMinutes"
              type="number"
              value={story.estimatedMinutes || ''}
              onChange={(e) => handleChange('estimatedMinutes', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="15"
              min="1"
            />
          </div>
        </div>
      </div>

      {/* Series Assignment */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Library className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-800">Series Assignment</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Optionally add this story to a multi-part series collection.
        </p>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seriesId">Story Series</Label>
            <select
              id="seriesId"
              value={story.seriesId || ''}
              onChange={(e) => handleChange('seriesId', e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loadingSeries}
            >
              <option value="">No series (standalone story)</option>
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.storyCount} stories)
                </option>
              ))}
            </select>
          </div>

          {story.seriesId && (
            <div className="flex items-center gap-4 p-3 bg-purple-50 rounded-lg">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: series.find(s => s.id === story.seriesId)?.color || '#4F46E5' }}
              >
                <Library className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {series.find(s => s.id === story.seriesId)?.title}
                </div>
                <div className="text-sm text-gray-500">
                  Part of this series • Order set in Series Manager
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={story.isFeatured || false}
                  onChange={(e) => handleChange('isFeatured', e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span className="text-sm text-gray-700">Featured</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Playback Settings */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Playback Settings</h2>
        <p className="text-sm text-gray-600 mb-4">
          Configure how audio plays between segments in the mobile app.
        </p>
        
        <div className="space-y-2">
          <Label>Pause between segments</Label>
          <div className="flex gap-2">
            {pauseOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange('pauseBetweenSegmentsMs' as any, option.value)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  (story as any).pauseBetweenSegmentsMs === option.value ||
                  ((story as any).pauseBetweenSegmentsMs === undefined && option.value === 500)
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Users can override this in their app settings
          </p>
        </div>
      </div>

      {/* Quick Text Input */}
      {onGenerateSegments && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 shadow-sm border border-purple-200">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Quick Story Input</h2>
          <p className="text-sm text-gray-600 mb-4">
            Paste your full story text here. It will be automatically split into segments 
            at sentence-ending punctuation (。！？ . ! ?).
          </p>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullText">Story Text</Label>
              <Textarea
                id="fullText"
                value={fullText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="今天是星期一。我早上七点起床。我喝咖啡，吃面包。然后我去学校。"
                rows={6}
                className="text-lg"
              />
            </div>

            {estimatedCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <AlertCircle size={16} />
                <span>Will create approximately <strong>{estimatedCount}</strong> segments</span>
              </div>
            )}

            <Button
              onClick={handleSplitText}
              disabled={!fullText.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Split into Segments
            </Button>

            <p className="text-xs text-gray-500">
              After splitting, you'll be taken to the Segments tab where you can 
              add translations and generate audio.
            </p>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Save the story before adding segments and audio. 
          Each segment will have its own audio file for karaoke-style playback.
        </p>
      </div>
    </div>
  );
}
