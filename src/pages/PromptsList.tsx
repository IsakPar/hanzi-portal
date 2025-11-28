import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Code, AlertCircle, Workflow, FileJson, FlaskConical } from "lucide-react";
import {
  getPromptVersions,
  KNOWN_PROMPT_SLUGS,
  type PromptTemplate,
} from "@/services/promptsAPI";
import { PipelineImporter } from "@/components/prompts/PipelineImporter";
import { LessonPipelineTest } from "@/components/ai/LessonPipelineTest";

interface PromptGroup {
  slug: string;
  activeVersion: PromptTemplate | null;
  draftVersions: PromptTemplate[];
  archivedVersions: PromptTemplate[];
  totalVersions: number;
}

export function PromptsList() {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<PromptGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImporter, setShowImporter] = useState(false);
  const [showPipelineTest, setShowPipelineTest] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    try {
      setLoading(true);
      setError(null);

      const promptGroups: PromptGroup[] = [];

      for (const slug of KNOWN_PROMPT_SLUGS) {
        try {
          const versions = await getPromptVersions(slug);
          
          promptGroups.push({
            slug,
            activeVersion: versions.find((v) => v.status === "active") || null,
            draftVersions: versions.filter((v) => v.status === "draft"),
            archivedVersions: versions.filter((v) => v.status === "archived"),
            totalVersions: versions.length,
          });
        } catch {
          // If no versions exist yet, create empty group
          promptGroups.push({
            slug,
            activeVersion: null,
            draftVersions: [],
            archivedVersions: [],
            totalVersions: 0,
          });
        }
      }

      setPrompts(promptGroups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prompts");
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-green-100 text-green-700 border-green-200",
      draft: "bg-yellow-100 text-yellow-700 border-yellow-200",
      archived: "bg-gray-100 text-gray-700 border-gray-200",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded border ${
          styles[status as keyof typeof styles] || styles.draft
        }`}
      >
        {status.toUpperCase()}
      </span>
    );
  };

  const formatSlugName = (slug: string) => {
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-500 animate-pulse" />
          <p className="text-gray-600">Loading AI prompts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
          <Button onClick={loadPrompts} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              AI Prompt Templates
            </h1>
            <p className="text-gray-600 mt-2">
              Manage and version your AI generation prompts
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPipelineTest(!showPipelineTest)}
              className={showPipelineTest ? "bg-purple-50 border-purple-300" : ""}
            >
              <FlaskConical className="w-4 h-4 mr-2" />
              Test Pipeline
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowImporter(true)}
            >
              <FileJson className="w-4 h-4 mr-2" />
              Import Pipeline
            </Button>
            <Button
              onClick={() => navigate("/prompts/new")}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Prompt
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline Importer Modal */}
      <PipelineImporter
        isOpen={showImporter}
        onClose={() => setShowImporter(false)}
        onSuccess={loadPrompts}
      />

      {/* Pipeline Test Panel */}
      {showPipelineTest && (
        <div className="mb-8">
          <LessonPipelineTest />
        </div>
      )}

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {prompts.map((group) => (
          <div
            key={group.slug}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="w-5 h-5 text-purple-500" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      {formatSlugName(group.slug)}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 font-mono">{group.slug}</p>
                </div>
                {group.activeVersion && getStatusBadge("active")}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {group.totalVersions}
                  </p>
                  <p className="text-xs text-gray-600">Total Versions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {group.draftVersions.length}
                  </p>
                  <p className="text-xs text-gray-600">Drafts</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {group.activeVersion ? "v" + group.activeVersion.version : "—"}
                  </p>
                  <p className="text-xs text-gray-600">Active</p>
                </div>
              </div>

              {/* Active Version Info */}
              {group.activeVersion ? (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-700 font-medium mb-1">
                    {group.activeVersion.steps ? "PIPELINE" : "CURRENT PRODUCTION"}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {group.activeVersion.steps 
                      ? `${group.activeVersion.steps.length} step pipeline`
                      : group.activeVersion.body 
                        ? `${group.activeVersion.body.substring(0, 100)}${group.activeVersion.body.length > 100 ? "..." : ""}`
                        : "No body defined"
                    }
                  </p>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    ⚠️ No active version - create one to use in production
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate(`/prompts/${group.slug}`)}
                  variant="outline"
                  className="flex-1"
                >
                  View Versions
                </Button>
                <Button
                  onClick={() => navigate(`/prompts/${group.slug}/pipeline`)}
                  variant="outline"
                  className="flex-1 border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  <Workflow className="w-4 h-4 mr-2" />
                  Pipeline
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Help Text */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">
              About Prompt Templates
            </h4>
            <p className="text-sm text-blue-800 leading-relaxed">
              Prompt templates control how the AI generates lessons. Each template has
              multiple versions: <strong>drafts</strong> for testing,{" "}
              <strong>active</strong> for production, and <strong>archived</strong> for
              history. Test drafts thoroughly before promoting to active!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

