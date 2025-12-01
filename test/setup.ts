import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables
process.env.VITE_API_URL = 'https://hanzimaster-backend-v2.isak-parild.workers.dev'
process.env.VITE_CDN_URL = 'https://content.polymasterlabs.com'

// Mock localStorage
const localStorageMock = {
  getItem: (key: string) => {
    return key === 'admin_token' ? 'mock-token' : null
  },
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
}

global.localStorage = localStorageMock as Storage

// Mock ResizeObserver for virtualization and dnd-kit tests
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  constructor(callback: ResizeObserverCallback) {
    // Store callback for potential use in tests
  }
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

// Mock scrollTo for virtualization
Element.prototype.scrollTo = vi.fn()

// Mock getBoundingClientRect for virtualization
Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
  width: 800,
  height: 600,
  top: 0,
  left: 0,
  bottom: 600,
  right: 800,
  x: 0,
  y: 0,
  toJSON: () => {},
})

