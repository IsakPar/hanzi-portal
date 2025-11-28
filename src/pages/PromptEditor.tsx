/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Save,
  Rocket,
  Copy,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Archive,
  Play,
  Loader2,
  Zap,
  DollarSign,
  Timer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getPromptVersions,
  createPrompt,
  clonePrompt,
  promotePrompt,
  rollbackPrompt,
  testPrompt,
  getAIModels,
  type PromptTemplate,
  type AIModel,
  type TestPromptResult,
} from "@/services/promptsAPI";
import { useGlobalConfirm } from "@/hooks/useConfirm";

export function PromptEditor() {
  const { slug, versionParam } = useParams<{ slug: string; versionParam?: string }>();
  const navigate = useNavigate();
  const confirm = useGlobalConfirm();
  const isNewPrompt = versionParam === "new";

  const [versions, setVersions] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [body, setBody] = useState("");
  const [notes, setNotes] = useState("");
  const [promoteReason, setPromoteReason] = useState("");

  // Test panel state
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedVersionForTest, setSelectedVersionForTest] = useState<number | "active">("active");
  const [testTargets, setTestTargets] = useState("");
  const [testGrammar, setTestGrammar] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestPromptResult | null>(null);
  const [showFullOutput, setShowFullOutput] = useState(false);

  useEffect(() => {
    if (slug) {
      loadVersions();
    }
  }, [slug]);

  useEffect(() => {
    if (versions.length > 0 && !isNewPrompt) {
      const version = versions[0]; // Latest version by default
      setBody(version.body || "");
      setNotes(version.notes || "");
    }
  }, [versions, isNewPrompt]);

  // Load AI models for testing
  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    try {
      const response = await getAIModels();
      setModels(response.models);
      setActiveModelId(response.active_model_id);
      // Default to active model
      if (response.active_model_id) {
        setSelectedModelId(response.active_model_id);
      } else if (response.models.length > 0) {
        setSelectedModelId(response.models[0].id);
      }
    } catch (err) {
      console.error("Failed to load models:", err);
    }
  }

  async function handleTestPrompt() {
    if (!slug) return;
    
    // Parse targets from comma-separated string
    const targets = testTargets
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    
    if (targets.length === 0) {
      setError("Please enter at least one target word");
      return;
    }

    // Parse grammar (optional)
    const grammar = testGrammar
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g.length > 0);

    try {
      setTesting(true);
      setError(null);
      setTestResult(null);

      // Determine which version to test
      let versionToTest: number | undefined;
      if (selectedVersionForTest !== "active") {
        versionToTest = selectedVersionForTest;
      }

      const result = await testPrompt({
        prompt_slug: slug,
        prompt_version: versionToTest,
        model_id: selectedModelId || undefined,
        test_input: {
          targets,
          grammar: grammar.length > 0 ? grammar : undefined,
        },
      });

      setTestResult(result);
      
      if (result.success) {
        setSuccess("Test completed successfully!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  async function loadVersions() {
    if (!slug) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getPromptVersions(slug);
      setVersions(data);
    } catch (err) {
      if (isNewPrompt) {
        // It's okay if no versions exist for new prompt
        setVersions([]);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load versions");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!slug || !body.trim()) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await createPrompt({
        slug,
        body: body.trim(),
        notes: notes.trim() || undefined,
      });

      setSuccess("Draft version created successfully!");
      await loadVersions();
      
      // Reset form
      setBody("");
      setNotes("");
      
      setTimeout(() => {
        navigate(`/prompts/${slug}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prompt");
    } finally {
      setSaving(false);
    }
  }

  async function handleClone(version: number) {
    if (!slug) return;

    try {
      setSaving(true);
      setError(null);
      const cloned = await clonePrompt(slug, { version });
      setSuccess(`Cloned v${version} to v${cloned.version}`);
      await loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clone prompt");
    } finally {
      setSaving(false);
    }
  }

  async function handlePromote(version: number) {
    if (!slug || !promoteReason.trim()) {
      setError("Please provide a reason for promoting this version");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await promotePrompt(slug, { version, reason: promoteReason });
      setSuccess(`Version ${version} promoted to active!`);
      setPromoteReason("");
      await loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to promote prompt");
    } finally {
      setSaving(false);
    }
  }

  async function handleRollback() {
    if (!slug) return;

    const confirmed = await confirm({
      title: "Rollback Prompt?",
      description: "Are you sure you want to rollback to the previous version? This will demote the current active version.",
      confirmLabel: "Rollback",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      setSaving(true);
      setError(null);
      await rollbackPrompt(slug, { reason: "Manual rollback from portal" });
      setSuccess("Rolled back to previous version!");
      await loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rollback");
    } finally {
      setSaving(false);
    }
  }

  const activeVersion = versions.find((v) => v.status === "active");
  const draftVersions = versions.filter((v) => v.status === "draft");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading prompt versions...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="outline"
          onClick={() => navigate("/prompts")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Prompts
        </Button>

        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          {slug?.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
        </h1>
        <p className="text-gray-600 mt-2 font-mono text-sm">{slug}</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor (New Draft) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Save className="w-5 h-5 text-purple-600" />
              Create New Draft
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="body">Prompt Body *</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="You are an expert Chinese language teacher..."
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tip: Use variables like {`{{targets}}`}, {`{{grammar}}`}, {`{{context}}`}
                </p>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What changed in this version? Why?"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving || !body.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Draft"}
              </Button>
            </div>
          </div>

          {/* Test Prompt Panel */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowTestPanel(!showTestPanel)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-900">Test Prompt</span>
              </div>
              {showTestPanel ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showTestPanel && (
              <div className="p-6 pt-0 border-t border-gray-100">
                <p className="text-sm text-gray-600 mb-4">
                  Test your prompt with sample data before promoting to production.
                </p>

                <div className="space-y-4">
                  {/* Version Selection */}
                  <div>
                    <Label htmlFor="testVersion">Version to Test</Label>
                    <select
                      id="testVersion"
                      value={selectedVersionForTest}
                      onChange={(e) =>
                        setSelectedVersionForTest(
                          e.target.value === "active" ? "active" : parseInt(e.target.value)
                        )
                      }
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="active">Active Version (Production)</option>
                      {versions
                        .filter((v) => v.status === "draft")
                        .map((v) => (
                          <option key={v.version} value={v.version}>
                            v{v.version} (Draft)
                          </option>
                        ))}
                      {versions
                        .filter((v) => v.status === "active")
                        .map((v) => (
                          <option key={v.version} value={v.version}>
                            v{v.version} (Active)
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Model Selection */}
                  <div>
                    <Label htmlFor="testModel">AI Model</Label>
                    <select
                      id="testModel"
                      value={selectedModelId}
                      onChange={(e) => setSelectedModelId(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.provider})
                          {model.id === activeModelId ? " ★ Active" : ""}
                        </option>
                      ))}
                    </select>
                    {models.length === 0 && (
                      <p className="text-xs text-yellow-600 mt-1">
                        No models configured. Add models in Settings.
                      </p>
                    )}
                  </div>

                  {/* Test Input */}
                  <div>
                    <Label htmlFor="testTargets">Target Words *</Label>
                    <Input
                      id="testTargets"
                      value={testTargets}
                      onChange={(e) => setTestTargets(e.target.value)}
                      placeholder="你好, 再见, 谢谢"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Comma-separated Chinese words
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="testGrammar">Grammar Points (Optional)</Label>
                    <Input
                      id="testGrammar"
                      value={testGrammar}
                      onChange={(e) => setTestGrammar(e.target.value)}
                      placeholder="greetings, basic_sentence_structure"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Comma-separated grammar tags
                    </p>
                  </div>

                  <Button
                    onClick={handleTestPrompt}
                    disabled={testing || !testTargets.trim()}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running Test...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Test
                      </>
                    )}
                  </Button>
                </div>

                {/* Test Result */}
                {testResult && (
                  <div className="mt-6 space-y-4">
                    {/* Debug Info */}
                    {testResult.debug && (
                      <div className={`p-4 rounded-lg border ${
                        testResult.success 
                          ? "bg-green-50 border-green-200" 
                          : "bg-red-50 border-red-200"
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          {testResult.success ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className={`font-semibold ${
                            testResult.success ? "text-green-700" : "text-red-700"
                          }`}>
                            {testResult.success ? "Test Passed" : "Test Failed"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-blue-500" />
                            <span className="text-gray-600">Model:</span>
                            <span className="font-medium">{testResult.debug.model_used}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-500" />
                            <span className="text-gray-600">Version:</span>
                            <span className="font-medium">
                              v{testResult.debug.prompt_version} ({testResult.debug.prompt_status})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4 text-orange-500" />
                            <span className="text-gray-600">Latency:</span>
                            <span className="font-medium">{testResult.debug.latency_ms}ms</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            <span className="text-gray-600">Cost:</span>
                            <span className="font-medium">
                              ${(testResult.debug.estimated_cost ?? testResult.debug.total_cost ?? 0).toFixed(4)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tokens:</span>
                            <span className="font-mono">
                              {testResult.debug.tokens 
                                ? `${testResult.debug.tokens.input} in / ${testResult.debug.tokens.output} out = ${testResult.debug.tokens.total} total`
                                : `${testResult.debug.total_tokens ?? 0} total`
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {!testResult.success && testResult.message && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">{testResult.message}</p>
                      </div>
                    )}

                    {/* Output Preview */}
                    {testResult.success && testResult.output && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setShowFullOutput(!showFullOutput)}
                          className="w-full p-3 bg-gray-50 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                          <span>Generated Output</span>
                          {showFullOutput ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        {showFullOutput && (
                          <div className="p-4 bg-gray-900 overflow-x-auto">
                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                              {JSON.stringify(testResult.output, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Prompt Used Preview */}
                    {testResult.prompt_used && (
                      <div className="text-xs text-gray-500">
                        <p>Prompt length: {testResult.prompt_used.full_length} characters</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Version Management */}
        <div className="space-y-6">
          {/* Active Version */}
          {activeVersion && (
            <div className="bg-white rounded-xl shadow-sm border border-green-300 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Active Version
                </h3>
                <span className="text-sm font-mono text-green-600">
                  v{activeVersion.version}
                </span>
              </div>

              <div className="text-xs text-gray-600 space-y-1 mb-4">
                <p>Updated: {new Date(activeVersion.updatedAt).toLocaleDateString()}</p>
                <p>Promoted by: {activeVersion.promotedBy || "System"}</p>
              </div>

              <p className="text-sm text-gray-700 mb-4 line-clamp-3 bg-gray-50 p-3 rounded font-mono">
                {activeVersion.steps 
                  ? `Pipeline with ${activeVersion.steps.length} step(s)`
                  : activeVersion.body || "No body defined"
                }
              </p>

              <Button
                onClick={handleRollback}
                variant="outline"
                size="sm"
                className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                disabled={saving}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Rollback
              </Button>
            </div>
          )}

          {/* Draft Versions */}
          {draftVersions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                Draft Versions ({draftVersions.length})
              </h3>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {draftVersions.map((version) => (
                  <div
                    key={version.id}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-semibold">
                        v{version.version}
                      </span>
                      <span className="text-xs text-gray-600">
                        {new Date(version.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {version.notes && (
                      <p className="text-xs text-gray-700 mb-2 italic">
                        "{version.notes}"
                      </p>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={() => handleClone(version.version)}
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        disabled={saving}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Clone
                      </Button>
                      <Button
                        onClick={() => {
                          const reason = window.prompt("Reason for promotion:");
                          if (reason) {
                            setPromoteReason(reason);
                            handlePromote(version.version);
                          }
                        }}
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                        disabled={saving}
                      >
                        <Rocket className="w-3 h-3 mr-1" />
                        Promote
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Archived Count */}
          {versions.filter((v) => v.status === "archived").length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Archive className="w-5 h-5 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {versions.filter((v) => v.status === "archived").length} archived
                version(s)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

