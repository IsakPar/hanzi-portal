/**
 * AI Studio - Drafts Page
 * 
 * List and manage generated lesson drafts.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Loader2, Check, X, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/useToast';
import { AIStudioLayout } from '@/layouts/AIStudioLayout';
import { 
  getDrafts, 
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
    <span className={`px-2 py-0.5 text-xs rounded-full border ${styles[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {getStatusText(status as any)}
    </span>
  );
}

export function DraftsPage() {
  const [drafts, setDrafts] = useState<LessonDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadDrafts = async () => {
    setLoading(true);
    try {
      const result = await getDrafts();
      setDrafts(result.drafts);
    } catch (err) {
      toast.error('Failed to load drafts', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const result = await approveDraft(id);
      toast.success('Draft approved!', `Lesson created: ${result.lessonId}`);
      loadDrafts();
    } catch (err) {
      toast.error('Approval failed', (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await rejectDraft(id);
      toast.success('Draft rejected');
      loadDrafts();
    } catch (err) {
      toast.error('Rejection failed', (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AIStudioLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-500" />
              Drafts
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Review and approve AI-generated lessons
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDrafts}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
          </div>
        )}

        {/* Empty State */}
        {!loading && drafts.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-12 text-center">
            <FileText className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <h3 className="font-medium text-gray-600 mb-1">No drafts yet</h3>
            <p className="text-sm text-gray-400 mb-4">
              Generate your first lesson to see it here
            </p>
            <Link to="/ai-studio">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                Generate Lesson
              </Button>
            </Link>
          </div>
        )}

        {/* Drafts List */}
        {!loading && drafts.length > 0 && (
          <div className="space-y-3">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {draft.title}
                      </h3>
                      <StatusBadge status={draft.status} />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>HSK {draft.hskLevel}</span>
                      {draft.lessonNumber && <span>Lesson {draft.lessonNumber}</span>}
                      <span className="capitalize">{draft.lessonType}</span>
                      {draft.qualityScore && (
                        <span className={`font-medium ${
                          draft.qualityScore >= 80 ? 'text-green-600' :
                          draft.qualityScore >= 60 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          Score: {draft.qualityScore}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(draft.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link to={`/ai-studio/drafts/${draft.id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                    {(draft.status === 'ready' || draft.status === 'needs_review') && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleReject(draft.id)}
                          disabled={actionLoading === draft.id}
                        >
                          {actionLoading === draft.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(draft.id)}
                          disabled={actionLoading === draft.id}
                        >
                          {actionLoading === draft.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AIStudioLayout>
  );
}

export default DraftsPage;
