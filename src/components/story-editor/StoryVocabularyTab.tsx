import { useState, useEffect, useCallback } from "react";
import type { StoryWithDetails } from "@/services/storiesAPI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logger } from "@/utils/logger";
import { toast } from "@/hooks/useToast";
import { 
  Sparkles, 
  Unlink,
  Search,
  Plus,
  Check,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { extractUniqueWords, hanziToPinyin } from "@/services/chineseNLP";
import { searchVocabulary, type VocabularyEntry } from "@/services/vocabularyAPI";

interface StoryVocabularyTabProps {
  story: StoryWithDetails;
  onUpdate: () => void;
}

interface VocabularyLink {
  word: string;
  pinyin: string;
  vocabularyId: string | null;
  status: 'linked' | 'unlinked' | 'searching' | 'adding';
  matchedVocab?: VocabularyEntry;
}

export function StoryVocabularyTab({ story, onUpdate }: StoryVocabularyTabProps) {
  const [vocabularyLinks, setVocabularyLinks] = useState<VocabularyLink[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Auto-scan sentences for vocabulary on mount
  const handleAutoScan = useCallback(async () => {
    setIsScanning(true);

    try {
      // Extract all unique words from sentences
      const sentences = story.sentences?.map((s) => s.chinese) || [];
      const uniqueWords = extractUniqueWords(sentences);

      // For each word, try to find it in the vocabulary database
      const links: VocabularyLink[] = [];

      for (const word of uniqueWords) {
        try {
          const results = await searchVocabulary({ query: word, limit: 1 });
          
          if (results.results.length > 0 && results.results[0].hanzi === word) {
            // Exact match found
            links.push({
              word,
              pinyin: results.results[0].pinyin,
              vocabularyId: results.results[0].id,
              status: 'linked',
              matchedVocab: results.results[0],
            });
          } else {
            // No match - unlinked
            const autoPinyin = hanziToPinyin(word);
            links.push({
              word,
              pinyin: autoPinyin,
              vocabularyId: null,
              status: 'unlinked',
            });
          }
        } catch (error) {
          logger.error(`Error searching for word: ${word}`, error);
          const autoPinyin = hanziToPinyin(word);
          links.push({
            word,
            pinyin: autoPinyin,
            vocabularyId: null,
            status: 'unlinked',
          });
        }
      }

      setVocabularyLinks(links);
    } catch (error) {
      logger.error("Error scanning vocabulary:", error);
      toast.error("Scan failed", "Failed to scan vocabulary. Please try again.");
    } finally {
      setIsScanning(false);
    }
  }, [story.sentences]);

  useEffect(() => {
    if (story.sentences && story.sentences.length > 0) {
      handleAutoScan();
    }
  }, [story.sentences, handleAutoScan]);

  const handleManualSearch = async (word: string) => {
    setVocabularyLinks(
      vocabularyLinks.map((link) =>
        link.word === word ? { ...link, status: 'searching' } : link
      )
    );

    try {
      const results = await searchVocabulary({ query: word, limit: 5 });
      
      if (results.results.length > 0) {
        // Show results (for now, just take first exact match)
        const exactMatch = results.results.find((v) => v.hanzi === word);
        
        if (exactMatch) {
          setVocabularyLinks(
            vocabularyLinks.map((link) =>
              link.word === word
                ? {
                    ...link,
                    vocabularyId: exactMatch.id,
                    pinyin: exactMatch.pinyin,
                    status: 'linked',
                    matchedVocab: exactMatch,
                  }
                : link
            )
          );
        } else {
          alert(`No exact match found for "${word}". Try adding it to the vocabulary first.`);
          setVocabularyLinks(
            vocabularyLinks.map((link) =>
              link.word === word ? { ...link, status: 'unlinked' } : link
            )
          );
        }
      } else {
        alert(`No vocabulary entries found for "${word}". Add it to the database first.`);
        setVocabularyLinks(
          vocabularyLinks.map((link) =>
            link.word === word ? { ...link, status: 'unlinked' } : link
          )
        );
      }
    } catch (error) {
      logger.error("Search error:", error);
      setVocabularyLinks(
        vocabularyLinks.map((link) =>
          link.word === word ? { ...link, status: 'unlinked' } : link
        )
      );
    }
  };

  const handleUnlink = (word: string) => {
    setVocabularyLinks(
      vocabularyLinks.map((link) =>
        link.word === word
          ? { ...link, vocabularyId: null, status: 'unlinked', matchedVocab: undefined }
          : link
      )
    );
  };

  const handleAddToVocabulary = (word: string) => {
    // Redirect to vocabulary creation page with pre-filled hanzi
    window.open(`/vocabulary/new?hanzi=${encodeURIComponent(word)}`, '_blank');
  };

  const handleSaveLinks = async () => {
    // TODO: Implement API call to save vocabulary links
    const linkedWords = vocabularyLinks.filter((link) => link.vocabularyId);
    logger.log("Saving vocabulary links:", linkedWords);
    toast.success(`Saved ${linkedWords.length} links!`, "API integration pending");
    onUpdate();
  };

  const filteredLinks = vocabularyLinks.filter((link) =>
    link.word.includes(searchQuery) || link.pinyin.includes(searchQuery)
  );

  const linkedCount = vocabularyLinks.filter((link) => link.status === 'linked').length;
  const unlinkedCount = vocabularyLinks.filter((link) => link.status === 'unlinked').length;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 shadow-lg border border-blue-100">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Vocabulary Linking
              </h2>
              <p className="text-gray-600">
                Auto-detect and link words from your story to the main vocabulary database
              </p>
            </div>
            <Button
              onClick={handleAutoScan}
              disabled={isScanning}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isScanning ? 'Scanning...' : 'Auto-Scan'}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-gray-800">{vocabularyLinks.length}</div>
              <div className="text-sm text-gray-600">Total Words</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 shadow-sm border border-green-200">
              <div className="text-2xl font-bold text-green-700">{linkedCount}</div>
              <div className="text-sm text-green-600">Linked</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 shadow-sm border border-orange-200">
              <div className="text-2xl font-bold text-orange-700">{unlinkedCount}</div>
              <div className="text-sm text-orange-600">Unlinked</div>
            </div>
          </div>
        </div>

        {/* Search */}
        {vocabularyLinks.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search words..."
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Vocabulary Links List */}
        {filteredLinks.length > 0 ? (
          <div className="space-y-3">
            {filteredLinks.map((link) => (
              <div
                key={link.word}
                className={`
                  bg-white rounded-lg p-4 shadow-sm border-2 transition-all
                  ${link.status === 'linked' ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {link.status === 'linked' ? (
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                        </div>
                      )}
                    </div>

                    {/* Word Info */}
                    <div>
                      <div className="text-2xl font-medium text-gray-900">{link.word}</div>
                      <div className="text-sm text-gray-600">{link.pinyin}</div>
                      
                      {link.matchedVocab && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-700">{link.matchedVocab.english}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                            HSK {link.matchedVocab.hskLevel}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                            {link.matchedVocab.category}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {link.status === 'linked' ? (
                      <Button
                        onClick={() => handleUnlink(link.word)}
                        variant="outline"
                        size="sm"
                        className="text-orange-600 hover:bg-orange-50"
                      >
                        <Unlink className="w-4 h-4 mr-1" />
                        Unlink
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleManualSearch(link.word)}
                          disabled={link.status === 'searching'}
                          variant="outline"
                          size="sm"
                        >
                          <Search className="w-4 h-4 mr-1" />
                          Search
                        </Button>
                        <Button
                          onClick={() => handleAddToVocabulary(link.word)}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add to DB
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSaveLinks}
                size="lg"
                disabled={linkedCount === 0}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Check className="w-5 h-5 mr-2" />
                Save {linkedCount} Links
              </Button>
            </div>
          </div>
        ) : vocabularyLinks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-gray-400 mb-4">
              <BookOpen className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              No vocabulary detected
            </h3>
            <p className="text-gray-500 mb-4">
              Add sentences first, then click "Auto-Scan" to detect vocabulary
            </p>
            <Button
              onClick={handleAutoScan}
              disabled={isScanning || !story.sentences || story.sentences.length === 0}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isScanning ? 'Scanning...' : 'Auto-Scan'}
            </Button>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No words match your search
          </div>
        )}
      </div>
    </div>
  );
}
