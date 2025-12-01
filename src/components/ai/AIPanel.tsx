/**
 * AI Assistant Panel
 * A floating/docked, draggable, resizable chat panel with tuning prompt and system files
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Minus, 
  Maximize2, 
  Minimize2, 
  Send, 
  Trash2, 
  Paperclip,
  FileText,
  BookOpen,
  GraduationCap,
  Sparkles,
  Loader2,
  XCircle,
  PanelRightClose,
  PanelRightOpen,
  Settings2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  GripVertical,
  Save,
  FolderOpen,
  Plus,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAIAssistant, type ContextFile, type ChatMessage, type SystemFile, DEFAULT_SYSTEM_PROMPT } from '@/contexts/AIAssistantContext';
import { useAPI } from '@/contexts/APIContext';
import { AIFilePickerModal } from './AIFilePickerModal';
import { AISystemFileModal } from './AISystemFileModal';

const MIN_WIDTH = 380;
const MIN_HEIGHT = 450;
const MAX_WIDTH = 1000;
const MAX_HEIGHT = 900;
const DOCKED_WIDTH = 440;

export function AIPanel() {
  const {
    isOpen,
    closePanel,
    panelState,
    updatePanelState,
    minimizePanel,
    restorePanel,
    toggleMode,
    currentDraft,
    contextFiles,
    removeContextFile,
    systemFiles,
    updateSystemFile,
    deleteSystemFile,
    systemFilesLoading,
    messages,
    addMessage,
    clearChat,
    tuningPrompt,
    setTuningPrompt,
    saveTuningPrompt,
    resetTuningPrompt,
    tuningPromptLoading,
    tuningPromptDirty,
    isTuningExpanded,
    setIsTuningExpanded,
    sessionTokens,
    sessionCost,
    costSummary,
    loadCostSummary,
    updateSessionCost,
    isLoading,
    setIsLoading,
  } = useAIAssistant();

  const api = useAPI();
  const [input, setInput] = useState('');
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [showSystemFileModal, setShowSystemFileModal] = useState(false);
  const [editingSystemFile, setEditingSystemFile] = useState<SystemFile | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [preMaximizeState, setPreMaximizeState] = useState<typeof panelState | null>(null);
  const [isSystemFilesExpanded, setIsSystemFilesExpanded] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isDragging = useRef(false);
  const isResizing = useRef<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0, panelX: 0, panelY: 0 });

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !panelState.isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, panelState.isMinimized]);

  // Load cost summary when panel opens
  useEffect(() => {
    if (isOpen) {
      loadCostSummary();
    }
  }, [isOpen, loadCostSummary]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    if (isMaximized || panelState.mode === 'docked') return;
    
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - panelState.x,
      y: e.clientY - panelState.y,
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  }, [panelState.x, panelState.y, isMaximized, panelState.mode]);

  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    if (panelState.mode === 'docked') return;
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = direction;
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: panelState.width,
      height: panelState.height,
      panelX: panelState.x,
      panelY: panelState.y,
    };
    document.body.style.userSelect = 'none';
  }, [panelState]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging.current) {
      const newX = Math.max(0, Math.min(window.innerWidth - panelState.width, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.current.y));
      updatePanelState({ x: newX, y: newY });
    }
    
    if (isResizing.current) {
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      const dir = isResizing.current;
      
      let newWidth = resizeStart.current.width;
      let newHeight = resizeStart.current.height;
      let newX = resizeStart.current.panelX;
      let newY = resizeStart.current.panelY;
      
      if (dir.includes('e')) newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStart.current.width + dx));
      if (dir.includes('w')) {
        const widthChange = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStart.current.width - dx)) - resizeStart.current.width;
        newWidth = resizeStart.current.width + widthChange;
        newX = resizeStart.current.panelX - widthChange;
      }
      if (dir.includes('s')) newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeStart.current.height + dy));
      if (dir.includes('n')) {
        const heightChange = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeStart.current.height - dy)) - resizeStart.current.height;
        newHeight = resizeStart.current.height + heightChange;
        newY = resizeStart.current.panelY - heightChange;
      }
      
      updatePanelState({ width: newWidth, height: newHeight, x: Math.max(0, newX), y: Math.max(0, newY) });
    }
  }, [panelState.width, updatePanelState]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    isResizing.current = null;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const toggleMaximize = useCallback(() => {
    if (panelState.mode === 'docked') return;
    
    if (isMaximized) {
      if (preMaximizeState) updatePanelState(preMaximizeState);
      setIsMaximized(false);
    } else {
      setPreMaximizeState({ ...panelState });
      updatePanelState({ x: 20, y: 20, width: window.innerWidth - 40, height: window.innerHeight - 40 });
      setIsMaximized(true);
    }
  }, [isMaximized, panelState, preMaximizeState, updatePanelState]);

  const handleSaveTuningPrompt = async () => {
    try {
      await saveTuningPrompt();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    addMessage({ role: 'user', content: userMessage });
    setIsLoading(true);

    try {
      // Build explicit context from attached files
      const explicitContext = contextFiles.map(f => ({
        type: f.type,
        id: f.id,
        title: f.title,
        content: f.content,
      }));

      // Auto-include current draft if one is being edited
      // This ensures the AI can "see" the lesson you're currently editing
      if (currentDraft) {
        explicitContext.unshift({
          type: currentDraft.type,
          id: currentDraft.id,
          title: `[CURRENT DRAFT] ${currentDraft.title}`,
          content: currentDraft.content,
        });
      }

      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Don't send systemPrompt - let backend use saved one
      const response = await api.post<{
        response: string;
        meta: { intent: string; tokensUsed: number; cost: number; contextUsed: string[] };
      }>('/v1/ai/chat', {
        message: userMessage,
        conversationHistory,
        explicitContext: explicitContext.length > 0 ? explicitContext : undefined,
      });

      addMessage({ role: 'assistant', content: response.response });
      
      if (response.meta) {
        updateSessionCost(response.meta.tokensUsed || 0, response.meta.cost || 0);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      addMessage({ 
        role: 'assistant', 
        content: `⚠️ Error: ${error instanceof Error ? error.message : 'Failed to get response'}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getFileIcon = (type: ContextFile['type']) => {
    switch (type) {
      case 'lesson': return <GraduationCap size={14} />;
      case 'story': return <BookOpen size={14} />;
      case 'vocabulary': return <FileText size={14} />;
      default: return <FileText size={14} />;
    }
  };

  const toggleSystemFileActive = async (file: SystemFile) => {
    await updateSystemFile(file.id, { isActive: !file.isActive });
  };

  if (!isOpen) return null;

  if (panelState.isMinimized) {
    return (
      <button
        onClick={restorePanel}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl shadow-2xl shadow-purple-500/40 hover:scale-110 transition-transform"
        title="Restore AI Assistant"
      >
        <Sparkles size={24} />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 rounded-full text-xs flex items-center justify-center font-medium">
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  const isDocked = panelState.mode === 'docked';
  const isPromptCustomized = tuningPrompt !== DEFAULT_SYSTEM_PROMPT;
  const activeSystemFiles = systemFiles.filter(f => f.isActive);

  const panelStyle: React.CSSProperties = isDocked
    ? { right: 0, top: 0, width: DOCKED_WIDTH, height: '100vh', borderRadius: 0 }
    : { left: panelState.x, top: panelState.y, width: panelState.width, height: panelState.height };

  return (
    <>
      <div
        ref={panelRef}
        className={`fixed z-50 bg-white flex flex-col overflow-hidden ${
          isDocked ? 'border-l border-gray-200' : 'rounded-2xl shadow-2xl shadow-black/20 border border-gray-200'
        }`}
        style={panelStyle}
      >
        {/* Header */}
        <div 
          className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white select-none ${
            !isDocked && !isMaximized ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-2">
            {!isDocked && !isMaximized && <GripVertical size={16} className="text-white/60" />}
            <Sparkles size={20} />
            <span className="font-semibold">AI Assistant</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Qwen</span>
            {activeSystemFiles.length > 0 && (
              <span className="text-xs bg-green-400/30 px-2 py-0.5 rounded-full">{activeSystemFiles.length} files</span>
            )}
          </div>
          <div className="flex items-center gap-1 no-drag">
            <button onClick={toggleMode} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title={isDocked ? 'Pop out' : 'Dock to side'}>
              {isDocked ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
            </button>
            <button onClick={minimizePanel} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Minimize">
              <Minus size={16} />
            </button>
            {!isDocked && (
              <button onClick={toggleMaximize} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title={isMaximized ? 'Restore' : 'Maximize'}>
                {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}
            <button onClick={closePanel} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Collapsible Sections Container */}
        <div className="border-b border-gray-100 no-drag max-h-[40%] overflow-y-auto">
          {/* Tuning Prompt Section */}
          <div className="border-b border-gray-50">
            <button
              onClick={() => setIsTuningExpanded(!isTuningExpanded)}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors text-sm"
            >
              <div className="flex items-center gap-2 text-gray-600">
                <Settings2 size={14} />
                <span>Tuning Prompt</span>
                {tuningPromptDirty && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Unsaved</span>}
              </div>
              {isTuningExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {isTuningExpanded && (
              <div className="px-4 pb-3 space-y-2">
                <textarea
                  value={tuningPrompt}
                  onChange={(e) => setTuningPrompt(e.target.value)}
                  className="w-full h-32 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/30 font-mono"
                  placeholder="System prompt for the AI..."
                />
                <div className="flex justify-between">
                  <button
                    onClick={resetTuningPrompt}
                    disabled={!isPromptCustomized}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw size={12} />
                    Reset Default
                  </button>
                  <button
                    onClick={handleSaveTuningPrompt}
                    disabled={!tuningPromptDirty || tuningPromptLoading}
                    className="flex items-center gap-1 px-3 py-1 text-xs text-white bg-purple-600 hover:bg-purple-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {tuningPromptLoading ? <Loader2 size={12} className="animate-spin" /> : saveSuccess ? <Check size={12} /> : <Save size={12} />}
                    {saveSuccess ? 'Saved!' : 'Save to Server'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* System Files Section */}
          <div>
            <button
              onClick={() => setIsSystemFilesExpanded(!isSystemFilesExpanded)}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors text-sm"
            >
              <div className="flex items-center gap-2 text-gray-600">
                <FolderOpen size={14} />
                <span>System Files</span>
                {activeSystemFiles.length > 0 && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{activeSystemFiles.length} active</span>
                )}
              </div>
              {isSystemFilesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {isSystemFilesExpanded && (
              <div className="px-4 pb-3 space-y-2">
                {systemFilesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={16} className="animate-spin text-gray-400" />
                  </div>
                ) : systemFiles.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">No system files yet</p>
                ) : (
                  <div className="space-y-1">
                    {systemFiles.map(file => (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs ${
                          file.isActive ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <button
                            onClick={() => toggleSystemFileActive(file)}
                            className={`p-0.5 rounded ${file.isActive ? 'text-green-600' : 'text-gray-400'}`}
                          >
                            {file.isActive ? <Check size={12} /> : <AlertCircle size={12} />}
                          </button>
                          <span className="truncate">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingSystemFile(file); setShowSystemFileModal(true); }}
                            className="p-1 hover:bg-white rounded text-gray-400 hover:text-gray-600"
                          >
                            <Settings2 size={12} />
                          </button>
                          <button
                            onClick={() => deleteSystemFile(file.id)}
                            className="p-1 hover:bg-white rounded text-gray-400 hover:text-red-500"
                          >
                            <XCircle size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => { setEditingSystemFile(null); setShowSystemFileModal(true); }}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-purple-600 hover:bg-purple-50 rounded-lg border border-dashed border-purple-300 transition-colors"
                >
                  <Plus size={12} />
                  Add System File
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Session Context Files Bar */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 no-drag">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Current Draft Indicator */}
            {currentDraft && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg text-sm">
                <span className="text-green-600">✏️</span>
                <span className="text-green-700 font-medium max-w-[120px] truncate">
                  {currentDraft.title}
                </span>
                <span className="text-[10px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full font-medium">
                  EDITING
                </span>
              </div>
            )}
            
            <button
              onClick={() => setShowFilePicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-dashed border-gray-300 hover:border-purple-300"
            >
              <Paperclip size={14} />
              <span>Add Context</span>
            </button>
            
            {contextFiles.map(file => (
              <div
                key={`${file.type}-${file.id}`}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-sm group"
              >
                <span className="text-purple-500">{getFileIcon(file.type)}</span>
                <span className="text-gray-700 max-w-[100px] truncate">{file.title}</span>
                <button onClick={() => removeContextFile(file.id)} className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                  <XCircle size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-drag">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-8">
              <Sparkles size={48} className="text-purple-300 mb-4" />
              <p className="text-lg font-medium text-gray-600">How can I help you?</p>
              <p className="text-sm mt-2 max-w-[280px]">
                Ask me about lessons, analyze content, or get suggestions.
              </p>
            </div>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
          )}
          
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}
        </div>

        {/* Footer - Cost Stats */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 no-drag">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-gray-400">Session:</span>{' '}
                <span className="font-medium">{sessionTokens.toLocaleString()} tok</span>{' '}
                <span className="text-green-600">${sessionCost.toFixed(4)}</span>
              </div>
              {costSummary && (
                <div className="border-l border-gray-300 pl-3">
                  <span className="text-gray-400">7 days:</span>{' '}
                  <span className="font-medium">{costSummary.last7Days.totalTokens.toLocaleString()} tok</span>{' '}
                  <span className="text-green-600">${Number(costSummary.last7Days.cost).toFixed(4)}</span>
                </div>
              )}
            </div>
            <button onClick={clearChat} className="flex items-center gap-1 px-2 py-1 hover:bg-red-50 hover:text-red-600 rounded transition-colors" title="Clear conversation">
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100 no-drag">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border-0 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              <Send size={18} />
            </button>
          </div>
        </div>

        {/* Resize Handles */}
        {!isDocked && !isMaximized && (
          <>
            <div className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
            <div className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
            <div className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
            <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize group" onMouseDown={(e) => handleResizeStart(e, 'se')}>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-purple-400 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 22H20V20H22V22ZM22 18H18V22H22V18ZM18 22H14V18H18V22Z" />
              </svg>
            </div>
            <div className="absolute top-0 left-4 right-4 h-2 cursor-n-resize" onMouseDown={(e) => handleResizeStart(e, 'n')} />
            <div className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize" onMouseDown={(e) => handleResizeStart(e, 's')} />
            <div className="absolute left-0 top-4 bottom-4 w-2 cursor-w-resize" onMouseDown={(e) => handleResizeStart(e, 'w')} />
            <div className="absolute right-0 top-4 bottom-4 w-2 cursor-e-resize" onMouseDown={(e) => handleResizeStart(e, 'e')} />
          </>
        )}
      </div>

      {showFilePicker && <AIFilePickerModal onClose={() => setShowFilePicker(false)} />}
      {showSystemFileModal && (
        <AISystemFileModal
          file={editingSystemFile}
          onClose={() => { setShowSystemFileModal(false); setEditingSystemFile(null); }}
        />
      )}
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-800 rounded-bl-md'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        <div className={`text-xs mt-1 ${isUser ? 'text-white/60' : 'text-gray-400'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
