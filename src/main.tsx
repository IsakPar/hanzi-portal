import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary'
import { Toaster } from './components/ui/toaster'
import { ConfirmProvider } from './hooks/useConfirm'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <AuthProvider>
        <ConfirmProvider>
          <App />
          <Toaster />
        </ConfirmProvider>
      </AuthProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
)
