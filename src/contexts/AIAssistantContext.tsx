/**
 * AI Assistant Context
 * Manages global state for the floating AI assistant panel
 * Settings and system files are stored in the backend database
 */

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAPI } from './APIContext';

// Default system prompt (fallback if backend doesn't have one)
export const DEFAULT_SYSTEM_PROMPT = `You are 小明 (Xiǎo Míng), an expert Chinese curriculum designer and tutor at HanziMaster. You have deep knowledge of:

1. **Chinese Language**: Native-level understanding of Mandarin, including HSK levels 1-9, grammar patterns, character etymology, and cultural context.

2. **Curriculum Design**: Expert in creating engaging, pedagogically sound Chinese lessons following the i+1 comprehensible input methodology.

3. **HanziMaster Platform**: You know the lesson structure (hero blocks, vocabulary blocks, grammar blocks, reading blocks, quiz blocks), story format, and how content is organized into units and HSK levels.

**Your Personality:**
- Helpful, encouraging, and constructive
- Give specific, actionable feedback
- Use Chinese examples when helpful (with pinyin and translation)
- Be concise but thorough
- Make sure to always answer in the language you have been spoken to.

**When Analyzing Content:**
- Check vocabulary appropriateness for HSK level
- Evaluate grammar progression
- Suggest improvements with specific examples
- Note any errors in pinyin, characters, or translations

**When Generating Content:**
- Follow HSK level vocabulary constraints
- Use natural, idiomatic Chinese
- Include pinyin for all Chinese text
- Keep cultural context in mind
- HSK 3.0 has been launched and is the new standard, use it.

**Response Format:**
- Use markdown for clarity
- Use Chinese characters with pinyin when demonstrating
- Be direct and helpful`;

// Types for context files (session-based, temporary)
export interface ContextFile {
  id: string;
  type: 'lesson' | 'story' | 'vocabulary' | 'unit';
  title: string;
  hskLevel?: number;
  content?: string;
}

// Current draft being edited (auto-attached to AI context)
export interface CurrentDraft {
  type: 'lesson' | 'story';
  id: string;
  title: string;
  content: string; // JSON stringified
}

// System files (persistent, stored in DB)
export interface SystemFile {
  id: string;
  name: string;
  description?: string;
  content: string;
  fileType: 'text' | 'markdown' | 'json';
  isActive: boolean;
  orderIndex: number;
  createdAt?: Date;
}

// Chat message type
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Cost summary from backend
export interface CostSummary {
  last7Days: { totalTokens: number; cost: number; requests: number };
  last30Days: { totalTokens: number; cost: number; requests: number };
}

// Panel mode
export type PanelMode = 'floating' | 'docked';

// Panel position and size
interface PanelState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  mode: PanelMode;
}

interface AIAssistantContextType {
  // Panel visibility
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  
  // Panel state
  panelState: PanelState;
  updatePanelState: (state: Partial<PanelState>) => void;
  minimizePanel: () => void;
  restorePanel: () => void;
  toggleMode: () => void;
  
  // Current draft being edited (auto-attached to AI context)
  currentDraft: CurrentDraft | null;
  setCurrentDraft: (draft: CurrentDraft | null) => void;
  
  // Session context files (temporary)
  contextFiles: ContextFile[];
  addContextFile: (file: ContextFile) => void;
  removeContextFile: (id: string) => void;
  clearContextFiles: () => void;
  
  // System files (persistent in DB)
  systemFiles: SystemFile[];
  loadSystemFiles: () => Promise<void>;
  addSystemFile: (file: Omit<SystemFile, 'id' | 'createdAt'>) => Promise<void>;
  updateSystemFile: (id: string, updates: Partial<SystemFile>) => Promise<void>;
  deleteSystemFile: (id: string) => Promise<void>;
  systemFilesLoading: boolean;
  
  // Chat
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;
  
  // Tuning prompt (synced with backend)
  tuningPrompt: string;
  setTuningPrompt: (prompt: string) => void;
  saveTuningPrompt: () => Promise<void>;
  resetTuningPrompt: () => void;
  tuningPromptLoading: boolean;
  tuningPromptDirty: boolean;
  isTuningExpanded: boolean;
  setIsTuningExpanded: (expanded: boolean) => void;
  
  // Cost tracking
  sessionTokens: number;
  sessionCost: number;
  costSummary: CostSummary | null;
  updateSessionCost: (tokens: number, cost: number) => void;
  loadCostSummary: () => Promise<void>;
  
  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | null>(null);

// Default panel position (centered)
const getDefaultPanelState = (): PanelState => ({
  x: Math.max(20, (window.innerWidth - 480) / 2),
  y: Math.max(20, (window.innerHeight - 600) / 2),
  width: 480,
  height: 600,
  isMinimized: false,
  mode: 'floating',
});

// Load saved panel state from localStorage
const loadPanelState = (): Partial<PanelState> => {
  try {
    const saved = localStorage.getItem('ai-assistant-panel');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

// Save panel state to localStorage
const savePanelState = (state: PanelState) => {
  try {
    localStorage.setItem('ai-assistant-panel', JSON.stringify(state));
  } catch {
    // Ignore
  }
};

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelState, setPanelState] = useState<PanelState>(() => ({
    ...getDefaultPanelState(),
    ...loadPanelState(),
  }));
  
  // Session state
  const [contextFiles, setContextFiles] = useState<ContextFile[]>([]);
  const [currentDraft, setCurrentDraft] = useState<CurrentDraft | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [sessionCost, setSessionCost] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isTuningExpanded, setIsTuningExpanded] = useState(false);
  
  // Backend-synced state
  const [tuningPrompt, setTuningPromptState] = useState<string>(DEFAULT_SYSTEM_PROMPT);
  const [savedTuningPrompt, setSavedTuningPrompt] = useState<string | null>(null);
  const [tuningPromptLoading, setTuningPromptLoading] = useState(false);
  const [systemFiles, setSystemFiles] = useState<SystemFile[]>([]);
  const [systemFilesLoading, setSystemFilesLoading] = useState(false);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);

  // Check if prompt is dirty (changed from saved)
  const tuningPromptDirty = savedTuningPrompt !== null 
    ? tuningPrompt !== savedTuningPrompt 
    : tuningPrompt !== DEFAULT_SYSTEM_PROMPT;

  // We need api but it might not be available immediately
  // Use a ref pattern to avoid re-renders
  const [apiReady, setApiReady] = useState(false);
  
  // Load settings from backend on mount
  useEffect(() => {
    // Small delay to ensure API context is ready
    const timer = setTimeout(() => setApiReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const updatePanelState = useCallback((newState: Partial<PanelState>) => {
    setPanelState(prev => {
      const updated = { ...prev, ...newState };
      savePanelState(updated);
      return updated;
    });
  }, []);

  const openPanel = useCallback(() => {
    setIsOpen(true);
    setPanelState(prev => {
      if (prev.x < 0 || prev.x > window.innerWidth - 100 ||
          prev.y < 0 || prev.y > window.innerHeight - 100) {
        return { ...prev, ...getDefaultPanelState() };
      }
      return prev;
    });
  }, []);
  
  const closePanel = useCallback(() => setIsOpen(false), []);
  
  const togglePanel = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) {
        setPanelState(state => {
          if (state.x < 0 || state.x > window.innerWidth - 100 ||
              state.y < 0 || state.y > window.innerHeight - 100) {
            return { ...state, ...getDefaultPanelState() };
          }
          return state;
        });
      }
      return !prev;
    });
  }, []);

  const minimizePanel = useCallback(() => updatePanelState({ isMinimized: true }), [updatePanelState]);
  const restorePanel = useCallback(() => updatePanelState({ isMinimized: false }), [updatePanelState]);

  const toggleMode = useCallback(() => {
    setPanelState(prev => {
      const newMode: PanelMode = prev.mode === 'floating' ? 'docked' : 'floating';
      const updated = {
        ...prev,
        mode: newMode,
        ...(newMode === 'floating' ? {
          x: Math.max(20, (window.innerWidth - prev.width) / 2),
          y: Math.max(20, (window.innerHeight - prev.height) / 2),
        } : {}),
      };
      savePanelState(updated);
      return updated;
    });
  }, []);

  // Context files (session)
  const addContextFile = useCallback((file: ContextFile) => {
    setContextFiles(prev => {
      if (prev.some(f => f.id === file.id && f.type === file.type)) return prev;
      return [...prev, file];
    });
  }, []);

  const removeContextFile = useCallback((id: string) => {
    setContextFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const clearContextFiles = useCallback(() => setContextFiles([]), []);

  // Chat
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }]);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionTokens(0);
    setSessionCost(0);
  }, []);

  // Tuning prompt
  const setTuningPrompt = useCallback((prompt: string) => {
    setTuningPromptState(prompt);
  }, []);

  const resetTuningPrompt = useCallback(() => {
    setTuningPromptState(DEFAULT_SYSTEM_PROMPT);
  }, []);

  // Session cost
  const updateSessionCost = useCallback((tokens: number, cost: number) => {
    setSessionTokens(prev => prev + tokens);
    setSessionCost(prev => prev + cost);
  }, []);

  // Create wrapper functions that will use API when called
  const contextValue: AIAssistantContextType = {
    isOpen,
    openPanel,
    closePanel,
    togglePanel,
    panelState,
    updatePanelState,
    minimizePanel,
    restorePanel,
    toggleMode,
    currentDraft,
    setCurrentDraft,
    contextFiles,
    addContextFile,
    removeContextFile,
    clearContextFiles,
    systemFiles,
    systemFilesLoading,
    loadSystemFiles: async () => {
      // Will be overridden by AIAssistantAPIWrapper
    },
    addSystemFile: async () => {
      // Will be overridden
    },
    updateSystemFile: async () => {
      // Will be overridden
    },
    deleteSystemFile: async () => {
      // Will be overridden
    },
    messages,
    addMessage,
    clearChat,
    tuningPrompt,
    setTuningPrompt,
    saveTuningPrompt: async () => {
      // Will be overridden
    },
    resetTuningPrompt,
    tuningPromptLoading,
    tuningPromptDirty,
    isTuningExpanded,
    setIsTuningExpanded,
    sessionTokens,
    sessionCost,
    costSummary,
    updateSessionCost,
    loadCostSummary: async () => {
      // Will be overridden
    },
    isLoading,
    setIsLoading,
  };

  return (
    <AIAssistantContext.Provider value={contextValue}>
      <AIAssistantAPIWrapper
        setTuningPromptState={setTuningPromptState}
        setSavedTuningPrompt={setSavedTuningPrompt}
        setTuningPromptLoading={setTuningPromptLoading}
        setSystemFiles={setSystemFiles}
        setSystemFilesLoading={setSystemFilesLoading}
        setCostSummary={setCostSummary}
        tuningPrompt={tuningPrompt}
        apiReady={apiReady}
      >
        {children}
      </AIAssistantAPIWrapper>
    </AIAssistantContext.Provider>
  );
}

// Wrapper component that has access to API
function AIAssistantAPIWrapper({
  children,
  setTuningPromptState,
  setSavedTuningPrompt,
  setTuningPromptLoading,
  setSystemFiles,
  setSystemFilesLoading,
  setCostSummary,
  tuningPrompt,
  apiReady,
}: {
  children: ReactNode;
  setTuningPromptState: (p: string) => void;
  setSavedTuningPrompt: (p: string | null) => void;
  setTuningPromptLoading: (l: boolean) => void;
  setSystemFiles: React.Dispatch<React.SetStateAction<SystemFile[]>>;
  setSystemFilesLoading: (l: boolean) => void;
  setCostSummary: (c: CostSummary | null) => void;
  tuningPrompt: string;
  apiReady: boolean;
}) {
  const api = useAPI();
  const context = useContext(AIAssistantContext);
  
  // Load initial data - AIAssistantProvider is now only rendered for authenticated routes
  useEffect(() => {
    if (!apiReady) return;
    
    // Load tuning prompt
    const loadSettings = async () => {
      setTuningPromptLoading(true);
      try {
        const data = await api.get<{ tuningPrompt: string | null }>('/v1/ai-assistant/settings');
        if (data.tuningPrompt) {
          setTuningPromptState(data.tuningPrompt);
          setSavedTuningPrompt(data.tuningPrompt);
        } else {
          setSavedTuningPrompt(DEFAULT_SYSTEM_PROMPT);
        }
      } catch (err) {
        console.error('Failed to load AI settings:', err);
      } finally {
        setTuningPromptLoading(false);
      }
    };
    
    // Load system files
    const loadFiles = async () => {
      setSystemFilesLoading(true);
      try {
        const data = await api.get<{ files: SystemFile[] }>('/v1/ai-assistant/system-files');
        setSystemFiles(data.files || []);
      } catch (err) {
        console.error('Failed to load system files:', err);
      } finally {
        setSystemFilesLoading(false);
      }
    };
    
    // Load cost summary
    const loadCost = async () => {
      try {
        const data = await api.get<CostSummary>('/v1/ai-assistant/cost-summary');
        setCostSummary(data);
      } catch (err) {
        console.error('Failed to load cost summary:', err);
      }
    };
    
    loadSettings();
    loadFiles();
    loadCost();
  }, [apiReady, api, setTuningPromptState, setSavedTuningPrompt, setTuningPromptLoading, setSystemFiles, setSystemFilesLoading, setCostSummary]);

  // Override context methods with API calls
  if (context) {
    context.saveTuningPrompt = async () => {
      setTuningPromptLoading(true);
      try {
        await api.put('/v1/ai-assistant/settings', { tuningPrompt });
        setSavedTuningPrompt(tuningPrompt);
      } catch (err) {
        console.error('Failed to save tuning prompt:', err);
        throw err;
      } finally {
        setTuningPromptLoading(false);
      }
    };

    context.loadSystemFiles = async () => {
      setSystemFilesLoading(true);
      try {
        const data = await api.get<{ files: SystemFile[] }>('/v1/ai-assistant/system-files');
        setSystemFiles(data.files || []);
      } catch (err) {
        console.error('Failed to load system files:', err);
      } finally {
        setSystemFilesLoading(false);
      }
    };

    context.addSystemFile = async (file) => {
      try {
        const data = await api.post<{ file: SystemFile }>('/v1/ai-assistant/system-files', file);
        setSystemFiles((prev: SystemFile[]) => [...prev, data.file]);
      } catch (err) {
        console.error('Failed to add system file:', err);
        throw err;
      }
    };

    context.updateSystemFile = async (id, updates) => {
      try {
        const data = await api.put<{ file: SystemFile }>(`/v1/ai-assistant/system-files/${id}`, updates);
        setSystemFiles((prev: SystemFile[]) => prev.map((f: SystemFile) => f.id === id ? data.file : f));
      } catch (err) {
        console.error('Failed to update system file:', err);
        throw err;
      }
    };

    context.deleteSystemFile = async (id) => {
      try {
        await api.delete(`/v1/ai-assistant/system-files/${id}`);
        setSystemFiles((prev: SystemFile[]) => prev.filter((f: SystemFile) => f.id !== id));
      } catch (err) {
        console.error('Failed to delete system file:', err);
        throw err;
      }
    };

    context.loadCostSummary = async () => {
      try {
        const data = await api.get<CostSummary>('/v1/ai-assistant/cost-summary');
        setCostSummary(data);
      } catch (err) {
        console.error('Failed to load cost summary:', err);
      }
    };
  }

  return <>{children}</>;
}

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (!context) {
    throw new Error('useAIAssistant must be used within AIAssistantProvider');
  }
  return context;
}
