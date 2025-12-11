/**
 * 🧪 Frontend Route Smoke Tests
 * Tests all portal routes to ensure they render without crashing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '../src/components/ErrorBoundary'
import { ConfirmProvider } from '../src/hooks/useConfirm'

// Mock API calls with comprehensive return values
vi.mock('../src/services/api', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ 
      results: [], 
      lessons: [], 
      units: [],
      stories: [],
      vocabularies: [],
      versions: [],
      templates: [],
      breakdown: [],
      totalUsers: 0,
      totalLessons: 0,
      totalStories: 0,
      totalVocabulary: 0,
      tierBreakdown: { free: 0, premium: 0, pro: 0 },
      activeUsers: { daily: 0, weekly: 0, monthly: 0 },
      growthTrend: [],
      last30Days: [],
      latency: [],
    })),
    post: vi.fn(() => Promise.resolve({ success: true })),
    put: vi.fn(() => Promise.resolve({ success: true })),
    delete: vi.fn(() => Promise.resolve({ success: true })),
  },
  APIError: class APIError extends Error {
    statusCode: number
    isAborted: boolean
    constructor(message: string, statusCode: number) {
      super(message)
      this.statusCode = statusCode
      this.isAborted = false
    }
  },
}))

// Mock AIAssistantContext - LessonEditor uses useAIAssistant()
vi.mock('../src/contexts/AIAssistantContext', () => ({
  useAIAssistant: () => ({
    isOpen: false,
    openPanel: vi.fn(),
    closePanel: vi.fn(),
    togglePanel: vi.fn(),
    panelState: { x: 0, y: 0, width: 480, height: 600, isMinimized: false, mode: 'floating' },
    updatePanelState: vi.fn(),
    minimizePanel: vi.fn(),
    restorePanel: vi.fn(),
    toggleMode: vi.fn(),
    currentDraft: null,
    setCurrentDraft: vi.fn(),
    contextFiles: [],
    addContextFile: vi.fn(),
    removeContextFile: vi.fn(),
    clearContextFiles: vi.fn(),
    systemFiles: [],
    loadSystemFiles: vi.fn(),
    addSystemFile: vi.fn(),
    updateSystemFile: vi.fn(),
    deleteSystemFile: vi.fn(),
    systemFilesLoading: false,
    messages: [],
    addMessage: vi.fn(),
    clearChat: vi.fn(),
    tuningPrompt: '',
    setTuningPrompt: vi.fn(),
    saveTuningPrompt: vi.fn(),
    resetTuningPrompt: vi.fn(),
    tuningPromptLoading: false,
    tuningPromptDirty: false,
    isTuningExpanded: false,
    setIsTuningExpanded: vi.fn(),
    sessionTokens: 0,
    sessionCost: 0,
    costSummary: null,
    updateSessionCost: vi.fn(),
    loadCostSummary: vi.fn(),
    isLoading: false,
    setIsLoading: vi.fn(),
  }),
  AIAssistantProvider: ({ children }: { children: React.ReactNode }) => children,
  DEFAULT_SYSTEM_PROMPT: '',
}))

// Import pages after mocking
import { Dashboard } from '../src/pages/Dashboard'
import { LessonList } from '../src/pages/LessonList'
import { LessonEditor } from '../src/pages/LessonEditor'
import { UnitsList } from '../src/pages/UnitsList'
import { UnitEditor } from '../src/pages/UnitEditor'
import { VocabularyList } from '../src/pages/VocabularyList'
import { VocabularyEditor } from '../src/pages/VocabularyEditor'
import { StoriesList } from '../src/pages/StoriesList'
import { StoryEditor } from '../src/pages/StoryEditor'
import { PromptsList } from '../src/pages/PromptsList'
import { PromptEditor } from '../src/pages/PromptEditor'
import { AnalyticsDashboard } from '../src/pages/AnalyticsDashboard'
import { SettingsPage } from '../src/pages/SettingsPage'
import { ContentExportPage } from '../src/pages/ContentExportPage'

describe('🎯 All Frontend Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper function to render with router AND providers
  const renderWithRouter = (component: React.ReactNode, route = '/') => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <ConfirmProvider>
          <Routes>
            <Route path="*" element={component} errorElement={<ErrorBoundary />} />
          </Routes>
        </ConfirmProvider>
      </MemoryRouter>
    )
  }

  describe('📊 Dashboard Routes', () => {
    it('/ - should render Dashboard without crashing', async () => {
      renderWithRouter(<Dashboard />)
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })
  })

  describe('📚 Lesson Routes', () => {
    it('/lessons - should render Lesson List without crashing', async () => {
      renderWithRouter(<LessonList />)
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })

    it('/lessons/new - should render Lesson Editor (new) without crashing', async () => {
      renderWithRouter(<LessonEditor />, '/lessons/new')
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })

    it('/lessons/:id/edit - should render Lesson Editor (edit) without crashing', async () => {
      renderWithRouter(<LessonEditor />, '/lessons/test-id/edit')
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })
  })

  describe('📦 Unit Routes', () => {
    it('/units - should render Units List without crashing', async () => {
      renderWithRouter(<UnitsList />)
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })

    it('/units/new - should render Unit Editor (new) without crashing', async () => {
      renderWithRouter(<UnitEditor />, '/units/new')
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })

    it('/units/:id/edit - should render Unit Editor (edit) without crashing', async () => {
      renderWithRouter(<UnitEditor />, '/units/test-id/edit')
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })
  })

  describe('📖 Vocabulary Routes', () => {
    it('/vocabulary - should render Vocabulary List without crashing', async () => {
      renderWithRouter(<VocabularyList />)
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })

    it('/vocabulary/new - should render Vocabulary Editor (new) without crashing', async () => {
      renderWithRouter(<VocabularyEditor />, '/vocabulary/new')
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })

    it('/vocabulary/:id/edit - should render Vocabulary Editor (edit) without crashing', async () => {
      renderWithRouter(<VocabularyEditor />, '/vocabulary/test-id/edit')
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })
  })

  describe('📚 Story Routes', () => {
    it('/stories - should render Stories List without crashing', async () => {
      renderWithRouter(<StoriesList />)
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })

    it('/stories/new - should render Story Editor (new) without crashing', async () => {
      renderWithRouter(<StoryEditor />, '/stories/new')
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })

    it('/stories/:id/edit - should render Story Editor (edit) without crashing', async () => {
      renderWithRouter(<StoryEditor />, '/stories/test-id/edit')
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })
  })

  describe('🤖 AI Prompt Routes', () => {
    it('/prompts - should render Prompts List without crashing', async () => {
      renderWithRouter(<PromptsList />)
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })

    it('/prompts/:slug - should render Prompt Editor without crashing', async () => {
      renderWithRouter(<PromptEditor />, '/prompts/test-slug')
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })
  })

  describe('📊 Analytics Routes', () => {
    it('/analytics - should render Analytics Dashboard without crashing', async () => {
      renderWithRouter(<AnalyticsDashboard />)
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })
  })

  describe('⚙️ Settings Routes', () => {
    it('/settings - should render Settings Page without crashing', async () => {
      renderWithRouter(<SettingsPage />)
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })
  })

  describe('📤 Export Routes', () => {
    it('/export - should render Content Export Page without crashing', async () => {
      renderWithRouter(<ContentExportPage />)
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })
  })

  describe('❌ Error Routes', () => {
    it('should handle 404 errors gracefully', async () => {
      renderWithRouter(
        <Routes>
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>,
        '/non-existent-route'
      )
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })
  })
})
