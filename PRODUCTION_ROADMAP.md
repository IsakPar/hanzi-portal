# 🚀 HanziMaster Portal V2 - Production Deployment Roadmap

**Status**: Development Complete → Ready for Production Prep
**Current Version**: 0.0.0 (MVP)
**Target**: Production v1.0.0

---

## 📋 Table of Contents

1. [Phase 1: Backend Integration](#phase-1-backend-integration)
2. [Phase 2: Authentication & Authorization](#phase-2-authentication--authorization)
3. [Phase 3: API Integration & State Management](#phase-3-api-integration--state-management)
4. [Phase 4: Testing & Quality Assurance](#phase-4-testing--quality-assurance)
5. [Phase 5: Deployment Infrastructure](#phase-5-deployment-infrastructure)
6. [Phase 6: Production Launch](#phase-6-production-launch)
7. [Post-Launch Priorities](#post-launch-priorities)

---

## Phase 1: Backend Integration
**Duration**: 3-5 days
**Priority**: CRITICAL

### 1.1 Connect to Backend V2 API

#### Tasks:
- [ ] **Create API Client Service** (`src/services/api.ts`)
  ```typescript
  // Base configuration for Backend V2 API
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.hanzimaster.com'
  ```

- [ ] **Environment Configuration**
  - Create `.env.example` with all required variables
  - Set up environment-specific configs (.env.development, .env.production)
  - Configure API endpoints:
    - `VITE_API_URL` - Backend V2 API URL
    - `VITE_CDN_URL` - Cloudflare R2 CDN URL
    - `VITE_ENVIRONMENT` - development/staging/production

- [ ] **API Services Implementation**
  - `src/services/lessonAPI.ts` - CRUD operations for lessons
  - `src/services/vocabularyAPI.ts` - Vocabulary management
  - `src/services/audioAPI.ts` - Already exists, connect to real endpoints
  - `src/services/analyticsAPI.ts` - Dashboard metrics
  - `src/services/authAPI.ts` - Login, logout, refresh tokens

#### Backend V2 Endpoints to Integrate:
```
POST   /api/admin/login           - Admin authentication
GET    /api/admin/lessons         - List all lessons
POST   /api/admin/lessons         - Create new lesson
GET    /api/admin/lessons/:id     - Get lesson details
PUT    /api/admin/lessons/:id     - Update lesson
DELETE /api/admin/lessons/:id     - Delete lesson
POST   /api/admin/lessons/:id/publish - Publish lesson
GET    /api/admin/vocabulary      - List vocabulary
POST   /api/admin/audio/upload    - Upload audio to R2
DELETE /api/admin/audio/:key      - Delete audio from R2
GET    /api/admin/analytics       - Dashboard stats
```

### 1.2 Data Model Sync

#### Tasks:
- [ ] Verify `types/lesson.ts` matches Backend V2 schema exactly
- [ ] Verify `types/vocabulary.ts` matches Backend V2 schema
- [ ] Add API response wrapper types:
  ```typescript
  interface APIResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
  }
  ```
- [ ] Handle API error types consistently

---

## Phase 2: Authentication & Authorization
**Duration**: 2-3 days
**Priority**: CRITICAL

### 2.1 JWT Authentication

#### Tasks:
- [ ] **Login Page** (`src/pages/Login.tsx`)
  - Beautiful login form with gradient design
  - Admin secret authentication
  - JWT token storage (httpOnly cookies preferred, localStorage fallback)
  - Remember me functionality
  - Error handling with user-friendly messages

- [ ] **Auth Context/Store** (`src/stores/authStore.ts`)
  ```typescript
  // Using Zustand
  interface AuthStore {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (adminSecret: string) => Promise<void>;
    logout: () => void;
    refreshToken: () => Promise<void>;
  }
  ```

- [ ] **Protected Routes**
  - Create `ProtectedRoute` wrapper component
  - Redirect unauthenticated users to `/login`
  - Implement token refresh logic
  - Handle token expiration gracefully

- [ ] **HTTP Interceptors**
  - Attach JWT token to all API requests
  - Handle 401 responses (token expired)
  - Automatic token refresh
  - Logout on auth failure

### 2.2 Session Management

#### Tasks:
- [ ] Implement token refresh before expiry
- [ ] Handle multiple tab scenarios
- [ ] Add activity timeout (optional)
- [ ] Secure token storage best practices

---

## Phase 3: API Integration & State Management
**Duration**: 5-7 days
**Priority**: HIGH

### 3.1 Replace Mock Data with Real API Calls

#### Dashboard (`src/pages/Dashboard.tsx`)
- [ ] Fetch real analytics data from `/api/admin/analytics`
- [ ] Real-time stats: lessons, users, vocabulary, completion rate
- [ ] Recent activity feed from backend
- [ ] Loading states with skeleton loaders
- [ ] Error handling with retry logic

#### Lesson Management
- [ ] **LessonList** - Fetch from `/api/admin/lessons`
  - Pagination support
  - Search functionality
  - Filters (HSK level, status, difficulty)
  - Sorting options

- [ ] **LessonEditor** - CRUD operations
  - Save lesson (draft)
  - Publish lesson
  - Auto-save functionality (draft every 30s)
  - Conflict resolution (if edited elsewhere)
  - Undo/Redo functionality
  - Block reordering persistence
  - Image/audio upload integration

- [ ] **Block Editors** - All 14 block types
  - Validate data before save
  - Handle audio upload progress
  - Image optimization
  - Character count limits
  - Preview mode

### 3.2 State Management Strategy

#### Tasks:
- [ ] **Global State with Zustand**
  - `authStore` - Authentication state
  - `lessonStore` - Current lesson being edited
  - `uiStore` - UI preferences, sidebar state, theme
  - `notificationStore` - Toast notifications

- [ ] **Server State with React Query** (Optional but Recommended)
  ```bash
  pnpm add @tanstack/react-query
  ```
  - Automatic caching
  - Background refetching
  - Optimistic updates
  - Infinite scroll for lists

- [ ] **Form State Management**
  - Consider React Hook Form for complex forms
  - Validation with Zod

### 3.3 Loading & Error States

#### Tasks:
- [ ] Create reusable loading components
  - Skeleton loaders for cards
  - Spinner for buttons
  - Progress bars for uploads
  
- [ ] Error boundary component
- [ ] Toast notification system (using Radix Toast)
- [ ] Retry mechanisms for failed requests

---

## Phase 4: Testing & Quality Assurance
**Duration**: 3-4 days
**Priority**: HIGH

### 4.1 Testing Setup

#### Tasks:
- [ ] **Install Testing Dependencies**
  ```bash
  pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom
  pnpm add -D @testing-library/user-event msw
  ```

- [ ] Configure Vitest in `vite.config.ts`
- [ ] Set up MSW (Mock Service Worker) for API mocking

### 4.2 Test Coverage

#### Priority Tests:
- [ ] **Unit Tests**
  - Block editor components
  - Utility functions
  - Type validation helpers
  - Form validation logic

- [ ] **Integration Tests**
  - Login flow
  - Create/Edit/Delete lesson
  - Audio upload
  - Block reordering
  - Publish/Unpublish

- [ ] **E2E Tests** (Optional, use Playwright)
  - Complete lesson creation workflow
  - User journey from login to publish

### 4.3 Code Quality

#### Tasks:
- [ ] Fix all ESLint warnings
- [ ] Run type check: `pnpm run build`
- [ ] Code review checklist
- [ ] Performance audit with Lighthouse
- [ ] Accessibility audit (WCAG 2.1 AA)

---

## Phase 5: Deployment Infrastructure
**Duration**: 2-3 days
**Priority**: HIGH

### 5.1 Hosting Setup

#### Recommended: **Cloudflare Pages** (Best fit with your Cloudflare stack)

**Why Cloudflare Pages?**
- ✅ Free SSL/TLS
- ✅ Global CDN
- ✅ Automatic deployments from Git
- ✅ Preview deployments for PRs
- ✅ Integrates seamlessly with Cloudflare Workers (your backend)
- ✅ Unlimited bandwidth
- ✅ Custom domains

#### Alternative Options:
- **Vercel** - Excellent DX, auto-scaling, fast global CDN
- **Netlify** - Similar to Vercel, good for SPA
- **AWS Amplify** - If already using AWS infrastructure

#### Tasks:
- [ ] Create Cloudflare Pages project
- [ ] Connect Git repository
- [ ] Configure build settings:
  ```yaml
  Build command: pnpm run build
  Build output directory: dist
  Node version: 18 or 20
  ```

### 5.2 Environment Configuration

#### Tasks:
- [ ] Set up environment variables in Cloudflare Pages:
  - `VITE_API_URL` → Your Backend V2 production URL
  - `VITE_CDN_URL` → Cloudflare R2 public URL
  - `VITE_ENVIRONMENT=production`

- [ ] Create staging environment
  - `staging-portal.hanzimaster.com`
  - Connect to staging backend

### 5.3 Domain & DNS

#### Tasks:
- [ ] Register/Configure domain: `portal.hanzimaster.com`
- [ ] Set up DNS records in Cloudflare:
  ```
  CNAME  portal  pages.dev (Cloudflare Pages)
  ```
- [ ] Enable SSL/TLS (Full or Full Strict)
- [ ] Configure security headers
- [ ] Enable WAF rules (optional)

### 5.4 CI/CD Pipeline

#### Tasks:
- [ ] Automate deployments via Git push
- [ ] Set up preview deployments for branches
- [ ] Add deployment notifications (Slack/Discord)
- [ ] Configure rollback strategy
- [ ] Set up deployment checks:
  - Build must pass
  - Tests must pass (if implemented)
  - Type check must pass

---

## Phase 6: Production Launch
**Duration**: 1-2 days
**Priority**: CRITICAL

### 6.1 Pre-Launch Checklist

#### Security:
- [ ] All secrets in environment variables (not in code)
- [ ] HTTPS only (redirect HTTP to HTTPS)
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)
- [ ] CORS configured correctly
- [ ] Rate limiting on API (backend)
- [ ] Admin authentication working properly

#### Performance:
- [ ] Assets optimized (images, fonts)
- [ ] Code splitting configured
- [ ] Lazy loading for routes
- [ ] Bundle size < 500KB (gzipped)
- [ ] Lighthouse score > 90

#### Functionality:
- [ ] All CRUD operations working
- [ ] Audio upload/delete working
- [ ] Real-time sync with backend
- [ ] Error handling in place
- [ ] Loading states everywhere
- [ ] Mobile responsive (test on real devices)

#### Monitoring:
- [ ] Set up error tracking (Sentry recommended)
  ```bash
  pnpm add @sentry/react
  ```
- [ ] Set up analytics (Plausible or Google Analytics)
- [ ] Health check endpoint
- [ ] Uptime monitoring (UptimeRobot, Better Uptime)

### 6.2 Launch Day

#### Tasks:
1. **Final Testing**
   - [ ] Test all workflows in staging
   - [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
   - [ ] Test on mobile devices
   - [ ] Load testing (if expecting high traffic)

2. **Deployment**
   - [ ] Merge to main branch
   - [ ] Monitor deployment logs
   - [ ] Verify production environment
   - [ ] Test critical paths in production

3. **Communication**
   - [ ] Announce to team
   - [ ] Update documentation
   - [ ] Share portal URL with content creators

---

## Post-Launch Priorities

### Week 1: Monitoring & Bug Fixes
- [ ] Monitor error rates (Sentry)
- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Fix critical bugs immediately
- [ ] Hot-fix deployment process

### Week 2-4: Iteration
- [ ] Implement user feedback
- [ ] Optimize slow queries
- [ ] Add missing features
- [ ] Improve UX based on usage patterns

### Features Backlog (Nice to Have)
- [ ] **Vocabulary Management Page** - Full CRUD for vocab
- [ ] **AI Prompt Management** - Interface for AI prompt templates
- [ ] **Analytics Dashboard** - Deeper insights (user progress, popular lessons)
- [ ] **Batch Operations** - Bulk edit, bulk publish
- [ ] **Version History** - See lesson changes over time
- [ ] **Collaboration** - Multiple admins, comments, approval workflow
- [ ] **Media Library** - Centralized audio/image management
- [ ] **Keyboard Shortcuts** - Power user features
- [ ] **Dark Mode** - Already themed, just needs toggle
- [ ] **Export/Import** - Lesson backup and migration
- [ ] **Preview Mode** - See lesson as students will
- [ ] **Duplication** - Clone lesson as template
- [ ] **Search** - Global search across all lessons

---

## Development Commands

```bash
# Development
pnpm dev                  # Start dev server (http://localhost:5173)

# Building
pnpm run build           # Type check + production build
pnpm run preview         # Preview production build locally

# Code Quality
pnpm run lint            # Run ESLint
pnpm run type-check      # TypeScript check (add this script)

# Testing (after setup)
pnpm test                # Run unit tests
pnpm test:e2e            # Run E2E tests
pnpm test:coverage       # Test coverage report
```

---

## Environment Variables Template

Create `.env.example`:
```bash
# API Configuration
VITE_API_URL=https://api.hanzimaster.com
VITE_CDN_URL=https://cdn.hanzimaster.com

# Environment
VITE_ENVIRONMENT=production

# Feature Flags (Optional)
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_SENTRY=true

# Sentry (if using)
VITE_SENTRY_DSN=your_sentry_dsn_here
```

---

## Quick Start for New Developers

```bash
# 1. Clone and install
git clone <repo>
cd hanzimaster-portal-v2
pnpm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your local backend URL

# 3. Start development
pnpm dev

# 4. Open browser
# → http://localhost:5173
```

---

## Critical Path Summary

**To get to production, you MUST complete:**

1. ✅ **UI Design** - DONE! (Looks amazing)
2. 🔄 **Backend Integration** - Connect to real API (Phase 1)
3. 🔄 **Authentication** - JWT login system (Phase 2)
4. 🔄 **API Integration** - Replace all mock data (Phase 3)
5. 🔄 **Deployment** - Set up Cloudflare Pages (Phase 5)
6. 🔄 **Testing** - Basic functionality tests (Phase 4)

**Nice to Have** (Post-Launch):
- Comprehensive test coverage
- Advanced features (vocab management, analytics)
- Performance optimizations
- Accessibility improvements

---

## Estimated Timeline

| Phase | Duration | Can Start After |
|-------|----------|----------------|
| Phase 1: Backend Integration | 3-5 days | Immediately |
| Phase 2: Authentication | 2-3 days | Phase 1 |
| Phase 3: API Integration | 5-7 days | Phase 2 |
| Phase 4: Testing | 3-4 days | Phase 3 (or parallel) |
| Phase 5: Deployment Setup | 2-3 days | Phase 1 (parallel) |
| Phase 6: Launch | 1-2 days | All phases complete |

**Total Estimate**: 2-3 weeks to production-ready MVP

---

## Risk Mitigation

### Potential Blockers:
1. **Backend API not ready** → Use MSW to mock API, build frontend independently
2. **Authentication issues** → Start with simple admin secret, improve later
3. **Performance problems** → Use React Query for caching, lazy load routes
4. **Deployment complexity** → Cloudflare Pages is straightforward, follow their docs

### Contingency Plans:
- Keep mock data fallbacks during development
- Implement feature flags for gradual rollout
- Have rollback plan (previous Git commit)
- Monitor errors closely first week

---

## Success Metrics

**Launch Day Goals:**
- ✅ Portal accessible at production URL
- ✅ Admin can log in successfully
- ✅ All 14 block editors working
- ✅ Lessons can be created, edited, published
- ✅ Audio upload working
- ✅ No critical bugs

**Week 1 Goals:**
- < 5% error rate
- < 2s page load time
- 95%+ uptime
- Positive feedback from content creators

**Month 1 Goals:**
- All planned lessons migrated from legacy portal
- Content creators trained and productive
- Feature requests captured for next sprint

---

## Next Immediate Actions

1. **Create `.env.example`** with all required variables
2. **Build API client service** (`src/services/api.ts`)
3. **Implement login page** and authentication flow
4. **Replace Dashboard mock data** with real API call
5. **Set up Cloudflare Pages** project (can do in parallel)

---

**Questions?** Review this document with your team and prioritize based on your timeline and resources.

**Remember**: Ship early, iterate often. Get the MVP to production, then enhance based on real user feedback! 🚀

