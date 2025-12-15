/**
 * AI Studio - Draft Detail Page
 * 
 * View a single draft with full content, approve or reject.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Loader2, 
  Check, 
  X, 
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/useToast';
import { AIStudioLayout } from '@/layouts/AIStudioLayout';
import { 
  getDraft, 
  approveDraft,
  rejectDraft,
  type LessonDraft,
  getStatusText,
} from '@/services/aiStudioAPI';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    generating: 'bg-amber-50 text-amber-700 border-amber-200',
    validating: 'bg-amber-50 text-amber-700 border-amber-200',
    checking: 'bg-amber-50 text-amber-700 border-amber-200',
    ready: 'bg-green-50 text-green-700 border-green-200',
    needs_review: 'bg-orange-50 text-orange-700 border-orange-200',
    approved: 'bg-blue-50 text-blue-700 border-blue-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full border ${styles[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {getStatusText(status as any)}
    </span>
  );
}

function BlockPreview({ block, index }: { block: any; index: number }) {
  const [expanded, setExpanded] = useState(false);

  // Handle undefined or malformed blocks
  if (!block || typeof block !== 'object') {
    return (
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <span className="text-sm text-gray-500">Block {index + 1}: Invalid block data</span>
      </div>
    );
  }

  // Try to extract block type from various possible locations
  const blockType = block.type || block.blockType || block.content?.type || 'content';
  
  // Get content - might be nested or at root
  const content = block.content || block;

  const getBlockIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('intro')) return '👋';
    if (t.includes('hero') || t.includes('hanzi')) return '🀄';
    if (t.includes('tip')) return '💡';
    if (t.includes('pattern') || t.includes('grammar')) return '📐';
    if (t.includes('multiple') || t.includes('mcq') || t.includes('choice')) return '❓';
    if (t.includes('drag') || t.includes('sentence') || t.includes('build')) return '🔤';
    if (t.includes('speak') || t.includes('audio')) return '🎤';
    if (t.includes('celebrat') || t.includes('complete')) return '🎉';
    if (t.includes('vocab')) return '📚';
    if (t.includes('dialog') || t.includes('conversation')) return '💬';
    return '📦';
  };

  // Extract a preview snippet from the content
  const getPreviewText = () => {
    if (content.question) return content.question;
    if (content.hanzi) return content.hanzi;
    if (content.title) return content.title;
    if (content.sentence) return content.sentence;
    if (content.text) return content.text;
    if (content.chinese) return content.chinese;
    if (content.prompt) return content.prompt;
    if (typeof content === 'string') return content.slice(0, 50);
    return null;
  };

  const previewText = getPreviewText();

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-lg">{getBlockIcon(blockType)}</span>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-gray-900 text-sm capitalize">
            Block {index + 1}: {blockType.replace(/_/g, ' ')}
          </span>
          {previewText && (
            <p className="text-xs text-gray-500 truncate">{previewText}</p>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      
      {expanded && (
        <div className="p-3 bg-white border-t border-gray-100">
          <pre className="text-xs text-gray-600 overflow-auto max-h-64 bg-gray-50 p-2 rounded whitespace-pre-wrap">
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function DraftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [draft, setDraft] = useState<LessonDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');
  const [aiImproving, setAiImproving] = useState(false);

  useEffect(() => {
    if (id) {
      loadDraft();
    }
  }, [id]);

  const loadDraft = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await getDraft(id);
      setDraft(result.draft);
    } catch (err) {
      toast.error('Failed to load draft', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const result = await approveDraft(id, reviewNotes);
      toast.success('Draft approved!', `Lesson created: ${result.lessonId}`);
      navigate('/ai-studio/drafts');
    } catch (err) {
      toast.error('Approval failed', (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await rejectDraft(id, reviewNotes);
      toast.success('Draft rejected');
      navigate('/ai-studio/drafts');
    } catch (err) {
      toast.error('Rejection failed', (err as Error).message);
    } finally {
      setActionLoading(false);
      setShowRejectModal(false);
    }
  };

  const handleRestore = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/v1/ai-studio/drafts/${id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to restore');
      toast.success('Draft restored!', 'You can now review and approve it');
      loadDraft(); // Reload to get updated status
    } catch (err) {
      toast.error('Restore failed', (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAIImprove = async () => {
    if (!id || !aiFeedback.trim() || !draft) return;
    setAiImproving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/v1/ai-studio/drafts/${id}/improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ feedback: aiFeedback }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to improve');
      }
      const result = await response.json();
      toast.success('AI is improving your draft!', 'A new version is being generated');
      // Navigate to the new draft
      if (result.newDraftId) {
        navigate(`/ai-studio/drafts/${result.newDraftId}`);
      } else {
        navigate('/ai-studio/drafts');
      }
    } catch (err) {
      toast.error('Improvement failed', (err as Error).message);
    } finally {
      setAiImproving(false);
      setShowAIFeedback(false);
      setAiFeedback('');
    }
  };

  // Safely parse blocks - handle both array and JSON string
  const blocks = (() => {
    if (!draft) return [];
    if (Array.isArray(draft.blocks)) return draft.blocks.filter(Boolean);
    if (typeof draft.blocksJson === 'string') {
      try {
        const parsed = JSON.parse(draft.blocksJson);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return [];
  })();
  
  const qualityReport = draft?.qualityReport;

  return (
    <AIStudioLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/ai-studio/drafts')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Drafts
        </button>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
          </div>
        )}

        {/* Draft Not Found */}
        {!loading && !draft && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
            <FileText className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <h3 className="font-medium text-gray-600 mb-1">Draft not found</h3>
            <p className="text-sm text-gray-400">This draft may have been deleted</p>
          </div>
        )}

        {/* Draft Content */}
        {!loading && draft && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl font-semibold text-gray-900">{draft.title}</h1>
                    <StatusBadge status={draft.status} />
                  </div>
                  {draft.subtitle && (
                    <p className="text-gray-500">{draft.subtitle}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>HSK {draft.hskLevel}</span>
                    {draft.lessonNumber && <span>Lesson {draft.lessonNumber}</span>}
                    <span className="capitalize">{draft.lessonType}</span>
                    {draft.qualityScore && (
                      <span className={`font-medium ${
                        draft.qualityScore >= 80 ? 'text-green-600' :
                        draft.qualityScore >= 60 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        Quality: {draft.qualityScore}/100
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quality Report */}
            {qualityReport && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <h2 className="font-medium text-gray-900 mb-3">Quality Report</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Chinese Accuracy</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {qualityReport.chineseAccuracy?.score || 0}/40
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Pedagogy Quality</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {qualityReport.pedagogyQuality?.score || 0}/40
                    </div>
                  </div>
                </div>

                {qualityReport.chineseAccuracy?.issues?.length > 0 && (
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Issues Found</h3>
                    <div className="space-y-2">
                      {qualityReport.chineseAccuracy.issues.map((issue: any, i: number) => (
                        <div 
                          key={i} 
                          className={`p-2 rounded text-sm ${
                            issue.severity === 'error' 
                              ? 'bg-red-50 text-red-700' 
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          <span className="font-medium">{issue.text}</span>: {issue.issue}
                          {issue.suggestion && (
                            <span className="block text-xs mt-1">
                              💡 {issue.suggestion}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qualityReport.suggestions?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Suggestions</h3>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {qualityReport.suggestions.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Blocks */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h2 className="font-medium text-gray-900 mb-3">
                Lesson Blocks ({blocks.length})
              </h2>
              <div className="space-y-2">
                {blocks.map((block: any, i: number) => (
                  <BlockPreview key={i} block={block} index={i} />
                ))}
              </div>
            </div>

            {/* Prompt Used */}
            {draft.prompt && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <h2 className="font-medium text-gray-900 mb-2">Original Prompt</h2>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{draft.prompt}</p>
              </div>
            )}

            {/* Actions */}
            {(draft.status === 'ready' || draft.status === 'needs_review' || draft.status === 'validating' || draft.status === 'checking') && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <h2 className="font-medium text-gray-900 mb-3">Review Notes (optional)</h2>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about this draft..."
                  rows={2}
                  className="mb-4"
                />
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Approve & Create Lesson
                  </Button>
                </div>
              </div>
            )}

            {/* AI Improvement - Available for ready/needs_review/rejected drafts */}
            {(draft.status === 'ready' || draft.status === 'needs_review' || draft.status === 'rejected') && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h2 className="font-medium text-purple-900">Improve with AI</h2>
                  </div>
                  {!showAIFeedback && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-100"
                      onClick={() => setShowAIFeedback(true)}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Give Feedback
                    </Button>
                  )}
                </div>

                {showAIFeedback ? (
                  <div className="space-y-3">
                    <Textarea
                      value={aiFeedback}
                      onChange={(e) => setAiFeedback(e.target.value)}
                      placeholder="Tell the AI what to improve...

Examples:
• This is good but make it longer with more exercises
• Add more speaking practice blocks
• The vocabulary is too advanced, simplify it
• Add distractor words to the MCQ exercises
• Include a grammar explanation block"
                      rows={5}
                      className="bg-white border-purple-200"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowAIFeedback(false);
                          setAiFeedback('');
                        }}
                        disabled={aiImproving}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={handleAIImprove}
                        disabled={aiImproving || !aiFeedback.trim()}
                      >
                        {aiImproving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Improving...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-1" />
                            Generate Improved Version
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-purple-700">
                    Not quite right? Tell the AI what to change and it'll create an improved version.
                  </p>
                )}
              </div>
            )}

            {/* Already Approved */}
            {draft.status === 'approved' && draft.approvedLessonId && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">This draft was approved</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Lesson created: {draft.approvedLessonId}
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-green-600 hover:bg-green-700"
                  onClick={() => navigate(`/lessons/${draft.approvedLessonId}/edit`)}
                >
                  Open in Lesson Editor →
                </Button>
              </div>
            )}

            {/* Quick Action: Open in Editor after Approval */}
            {(draft.status === 'ready' || draft.status === 'needs_review') && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">Approve & Edit</span>
                </div>
                <p className="text-sm text-blue-600 mb-3">
                  Approve this draft and immediately open it in the full Lesson Editor for fine-tuning.
                </p>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={async () => {
                    if (!id) return;
                    setActionLoading(true);
                    try {
                      const result = await approveDraft(id, 'Quick approve for editing');
                      toast.success('Draft approved!');
                      navigate(`/lessons/${result.lessonId}/edit`);
                    } catch (err) {
                      toast.error('Approval failed', (err as Error).message);
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <>Approve & Open Editor →</>
                  )}
                </Button>
              </div>
            )}

            {/* Rejected */}
            {draft.status === 'rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-700">
                    <X className="w-5 h-5" />
                    <span className="font-medium">This draft was rejected</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRestore}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Restore
                      </>
                    )}
                  </Button>
                </div>
                {draft.reviewNotes && (
                  <p className="text-sm text-red-600 mt-2">{draft.reviewNotes}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-2 text-red-600 mb-4">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold">Reject Draft?</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                This will mark the draft as rejected. You can still view it later.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRejectModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleReject}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Reject'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AIStudioLayout>
  );
}

export default DraftDetailPage;

