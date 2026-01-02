import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { APIProvider } from "./contexts/APIContext";
import { AIAssistantProvider } from "./contexts/AIAssistantContext";
import { AuthGuard, AdminGuard, GuestGuard, useAuth } from "./contexts/AuthContext";
import { Layout } from "./components/layout/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Auth pages
import { LoginPage } from "./pages/auth/LoginPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";

// Lazy load pages for better initial bundle size
// Critical path pages (loaded eagerly for fast navigation)
import { Dashboard } from "./pages/Dashboard";

// Heavy editors (lazy loaded - they include many sub-components)
const LessonEditor = lazy(() => import("./pages/LessonEditor").then(m => ({ default: m.LessonEditor })));
const LessonReview = lazy(() => import("./pages/LessonReview"));
const LessonReviewPage = lazy(() => import("./pages/LessonReviewPage").then(m => ({ default: m.LessonReviewPage })));
const StoryEditor = lazy(() => import("./pages/StoryEditorV2").then(m => ({ default: m.StoryEditorV2 })));
const VocabularyEditor = lazy(() => import("./pages/VocabularyEditor").then(m => ({ default: m.VocabularyEditor })));
const PromptEditor = lazy(() => import("./pages/PromptEditor").then(m => ({ default: m.PromptEditor })));
const PipelineEditor = lazy(() => import("./pages/PipelineEditor").then(m => ({ default: m.PipelineEditor })));

// List pages (lazy loaded - moderate complexity)
const LessonList = lazy(() => import("./pages/LessonList").then(m => ({ default: m.LessonList })));
const StoriesList = lazy(() => import("./pages/StoriesList").then(m => ({ default: m.StoriesList })));
const PromptsList = lazy(() => import("./pages/PromptsList").then(m => ({ default: m.PromptsList })));
const VocabularyList = lazy(() => import("./pages/VocabularyList").then(m => ({ default: m.VocabularyList })));
const VocabularyImport = lazy(() => import("./pages/VocabularyImport").then(m => ({ default: m.VocabularyImport })));
const MetadataTaggingPage = lazy(() => import("./pages/MetadataTaggingPage").then(m => ({ default: m.MetadataTaggingPage })));
const AudioManager = lazy(() => import("./pages/AudioManager").then(m => ({ default: m.AudioManager })));

// Secondary pages (lazy loaded - less frequently accessed)
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard").then(m => ({ default: m.AnalyticsDashboard })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const ReleaseManager = lazy(() => import("./pages/ReleaseManager").then(m => ({ default: m.ReleaseManager })));
const WaitlistPage = lazy(() => import("./pages/WaitlistPage").then(m => ({ default: m.WaitlistPage })));
const WebhookDebugPage = lazy(() => import("./pages/WebhookDebugPage").then(m => ({ default: m.WebhookDebugPage })));
const LessonCacheManager = lazy(() => import("./pages/LessonCacheManager"));
const UserManagement = lazy(() => import("./pages/UserManagement").then(m => ({ default: m.UserManagement })));
const ControlCenter = lazy(() => import("./pages/ControlCenter"));
const RateLimits = lazy(() => import("./pages/RateLimits"));
const SubscriptionsPage = lazy(() => import("./pages/SubscriptionsPage"));
const PerformancePage = lazy(() => import("./pages/PerformancePage"));

// AI Studio pages (lazy loaded - dedicated workspace)
const AIStudioGenerate = lazy(() => import("./pages/ai-studio/GeneratePage"));
const AIStudioEnhance = lazy(() => import("./pages/ai-studio/EnhancePage"));
const AIStudioDrafts = lazy(() => import("./pages/ai-studio/DraftsPage"));
const AIStudioDraftDetail = lazy(() => import("./pages/ai-studio/DraftDetailPage"));
const AIStudioCurriculum = lazy(() => import("./pages/ai-studio/CurriculumPage"));

/**
 * Page loading fallback component
 */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="text-sm text-slate-500">Loading...</span>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg mx-auto">
          <span className="text-white font-bold text-3xl">汉</span>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            HanziMaster Portal
          </div>
          <div className="text-sm text-gray-500">Loading your workspace...</div>
        </div>
        <div className="flex gap-2 justify-center">
          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <APIProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Public auth routes - NO AIAssistantProvider here */}
        <Route path="/login" element={<GuestGuard><LoginPage /></GuestGuard>} />
        <Route path="/forgot-password" element={<GuestGuard><ForgotPasswordPage /></GuestGuard>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes with Layout - AIAssistantProvider ONLY here */}
        <Route path="/" element={<AuthGuard><AIAssistantProvider><Layout /></AIAssistantProvider></AuthGuard>} errorElement={<ErrorBoundary />}>
          <Route index element={<Dashboard />} />
          <Route path="waitlist" element={<AdminGuard><Suspense fallback={<PageLoader />}><WaitlistPage /></Suspense></AdminGuard>} errorElement={<ErrorBoundary />} />
          <Route path="lessons" element={<Suspense fallback={<PageLoader />}><LessonList /></Suspense>} />
          <Route path="stories" element={<Suspense fallback={<PageLoader />}><StoriesList /></Suspense>} errorElement={<ErrorBoundary />} />
          <Route path="prompts" element={<Suspense fallback={<PageLoader />}><PromptsList /></Suspense>} errorElement={<ErrorBoundary />} />
          <Route path="prompts/:slug" element={<Suspense fallback={<PageLoader />}><PromptEditor /></Suspense>} errorElement={<ErrorBoundary />} />
          <Route path="prompts/:slug/:versionParam" element={<Suspense fallback={<PageLoader />}><PromptEditor /></Suspense>} errorElement={<ErrorBoundary />} />
          <Route path="prompts/:slug/pipeline" element={<Suspense fallback={<PageLoader />}><PipelineEditor /></Suspense>} errorElement={<ErrorBoundary />} />
          <Route path="vocabulary" element={<Suspense fallback={<PageLoader />}><VocabularyList /></Suspense>} errorElement={<ErrorBoundary />} />
          <Route path="vocabulary/import" element={<Suspense fallback={<PageLoader />}><VocabularyImport /></Suspense>} errorElement={<ErrorBoundary />} />
          <Route path="vocabulary/tagging" element={<Suspense fallback={<PageLoader />}><MetadataTaggingPage /></Suspense>} errorElement={<ErrorBoundary />} />
          <Route path="audio" element={<Suspense fallback={<PageLoader />}><AudioManager /></Suspense>} errorElement={<ErrorBoundary />} />
          <Route path="vocabulary/new" element={<Suspense fallback={<PageLoader />}><VocabularyEditor /></Suspense>} errorElement={<ErrorBoundary />} />
          <Route path="vocabulary/:id/edit" element={<Suspense fallback={<PageLoader />}><VocabularyEditor /></Suspense>} errorElement={<ErrorBoundary />} />
          <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsDashboard /></Suspense>} errorElement={<ErrorBoundary />} />
          <Route path="settings" element={<AdminGuard><Suspense fallback={<PageLoader />}><SettingsPage /></Suspense></AdminGuard>} errorElement={<ErrorBoundary />} />
          <Route path="export" element={<AdminGuard><Suspense fallback={<PageLoader />}><ReleaseManager /></Suspense></AdminGuard>} errorElement={<ErrorBoundary />} />
          <Route path="webhooks" element={<AdminGuard><Suspense fallback={<PageLoader />}><WebhookDebugPage /></Suspense></AdminGuard>} errorElement={<ErrorBoundary />} />
          <Route path="lesson-cache" element={<Suspense fallback={<PageLoader />}><LessonCacheManager /></Suspense>} errorElement={<ErrorBoundary />} />
          <Route path="users" element={<AdminGuard><Suspense fallback={<PageLoader />}><UserManagement /></Suspense></AdminGuard>} errorElement={<ErrorBoundary />} />
          <Route path="control-center" element={<AdminGuard><Suspense fallback={<PageLoader />}><ControlCenter /></Suspense></AdminGuard>} errorElement={<ErrorBoundary />} />
          <Route path="rate-limits" element={<AdminGuard><Suspense fallback={<PageLoader />}><RateLimits /></Suspense></AdminGuard>} errorElement={<ErrorBoundary />} />
          <Route path="subscriptions" element={<AdminGuard><Suspense fallback={<PageLoader />}><SubscriptionsPage /></Suspense></AdminGuard>} errorElement={<ErrorBoundary />} />
          <Route path="performance" element={<AdminGuard><Suspense fallback={<PageLoader />}><PerformancePage /></Suspense></AdminGuard>} errorElement={<ErrorBoundary />} />
        </Route>

        {/* Standalone routes (Full screen editors) - PROTECTED with AIAssistantProvider */}
        <Route path="lessons/:lessonId/edit" element={<AuthGuard><AIAssistantProvider><Suspense fallback={<PageLoader />}><LessonEditor /></Suspense></AIAssistantProvider></AuthGuard>} errorElement={<ErrorBoundary />} />
        <Route path="lessons/review" element={<AuthGuard><Suspense fallback={<PageLoader />}><LessonReview /></Suspense></AuthGuard>} errorElement={<ErrorBoundary />} />
        <Route path="lessons/:lessonId/connected-words" element={<AuthGuard><Suspense fallback={<PageLoader />}><LessonReviewPage /></Suspense></AuthGuard>} errorElement={<ErrorBoundary />} />
        <Route path="stories/:id/edit" element={<AuthGuard><AIAssistantProvider><Suspense fallback={<PageLoader />}><StoryEditor /></Suspense></AIAssistantProvider></AuthGuard>} errorElement={<ErrorBoundary />} />

        {/* AI Studio - Dedicated workspace for AI lesson generation */}
        <Route path="ai-studio" element={<AuthGuard><AdminGuard><Suspense fallback={<PageLoader />}><AIStudioGenerate /></Suspense></AdminGuard></AuthGuard>} errorElement={<ErrorBoundary />} />
        <Route path="ai-studio/enhance" element={<AuthGuard><AdminGuard><Suspense fallback={<PageLoader />}><AIStudioEnhance /></Suspense></AdminGuard></AuthGuard>} errorElement={<ErrorBoundary />} />
        <Route path="ai-studio/drafts" element={<AuthGuard><AdminGuard><Suspense fallback={<PageLoader />}><AIStudioDrafts /></Suspense></AdminGuard></AuthGuard>} errorElement={<ErrorBoundary />} />
        <Route path="ai-studio/drafts/:id" element={<AuthGuard><AdminGuard><Suspense fallback={<PageLoader />}><AIStudioDraftDetail /></Suspense></AdminGuard></AuthGuard>} errorElement={<ErrorBoundary />} />
        <Route path="ai-studio/curriculum" element={<AuthGuard><AdminGuard><Suspense fallback={<PageLoader />}><AIStudioCurriculum /></Suspense></AdminGuard></AuthGuard>} errorElement={<ErrorBoundary />} />

        {/* Catch-all - redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </APIProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
