# 🚀 Missing Features Implementation Plan

**Created**: November 24, 2025  
**Priority**: HIGH  
**Status**: Planning Phase

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Feature 1: Audio Management System](#feature-1-audio-management-system)
3. [Feature 2: Stories Management](#feature-2-stories-management)
4. [Feature 3: AI Prompt Configuration](#feature-3-ai-prompt-configuration)
5. [Implementation Timeline](#implementation-timeline)
6. [Technical Architecture](#technical-architecture)

---

## 🎯 Executive Summary

### What's Missing

The current portal has a beautiful UI but lacks three critical content management features:

1. **📢 Audio Management** - Centralized system for uploading, organizing, and managing audio files
2. **📖 Stories Management** - CRUD interface for AI-generated reading stories
3. **🤖 AI Prompt Configuration** - Fine-tune prompts that generate lessons and stories

### Why It Matters

- **Audio**: Every lesson block needs audio (Hero Hanzi, Dialogue, Reading Passage, etc.)
- **Stories**: Core content type for reading comprehension practice
- **AI Prompts**: Quality control for AI-generated content

### Current State

✅ AudioUploader component exists but needs integration  
❌ No Stories management page  
❌ No AI Prompt configuration UI  
❌ No Media Library for centralized asset management

---

## Feature 1: Audio Management System

### 1.1 Overview

**Goal**: Create a centralized media library for managing all audio files used across lessons, vocabulary, and stories.

**User Story**: 
> "As a content creator, I want to upload, organize, search, and reuse audio files so that I don't have to re-upload the same audio multiple times."

### 1.2 UI Design

#### Media Library Page (`/media`)

```
┌──────────────────────────────────────────────────────────────┐
│ Media Library                             [⬆️ Upload Files]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  📁 Filters                                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Type: [All ▼]  Category: [All ▼]  HSK: [All ▼]      │    │
│  │ Search: [_________________________] 🔍               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  📊 Stats:  Total: 2,345 files  •  Size: 1.2 GB             │
│                                                               │
│  Audio Files (2,345)                                          │
│  ┌──────────────┬──────────────┬──────────────┬─────────┐  │
│  │              │              │              │         │  │
│  │  🔊 你好     │  🔊 是       │  🔊 学生     │  🔊 ...  │  │
│  │  nihao.mp3   │  shi.mp3     │  xuesheng... │         │  │
│  │  0.8s • 45KB │  0.5s • 32KB │  1.2s • 67KB │         │  │
│  │  HSK 1       │  HSK 1       │  HSK 2       │         │  │
│  │  [▶️] [📝] [🗑️] [▶️] [📝] [🗑️] [▶️] [📝] [🗑️]      │  │
│  └──────────────┴──────────────┴──────────────┴─────────┘  │
│                                                               │
│  [Load More]                                    Showing 1-50  │
└──────────────────────────────────────────────────────────────┘
```

#### Upload Modal

```
┌─────────────────────────────────────────────┐
│ Upload Audio Files                    [❌]  │
├─────────────────────────────────────────────┤
│                                             │
│  📤 Drag & drop files here                  │
│     or click to browse                      │
│                                             │
│  Supported: MP3, WAV, M4A (Max 10MB each)   │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ ✅ nihao.mp3 (45KB) - Processing... │  │
│  │ ✅ shi.mp3 (32KB) - Done!           │  │
│  │ ⏳ xuesheng.mp3 (67KB) - Uploading...│  │
│  └─────────────────────────────────────┘  │
│                                             │
│  Metadata (Auto-fill for selected):         │
│  • Category: [Vocabulary ▼]                 │
│  • HSK Level: [1 ▼]                         │
│  • Tags: [pronunciation, greeting]          │
│                                             │
│  [Cancel] [Upload All (3)]                  │
└─────────────────────────────────────────────┘
```

#### Edit Audio Modal

```
┌─────────────────────────────────────────────┐
│ Edit Audio: nihao.mp3               [❌]    │
├─────────────────────────────────────────────┤
│                                             │
│  🔊 [▶️ Play] [⏸️ Pause]  Duration: 0.8s    │
│                                             │
│  File Info:                                  │
│  • Filename: nihao.mp3                      │
│  • Size: 45 KB                              │
│  • Uploaded: Nov 20, 2025                   │
│  • CDN URL: https://cdn.../nihao.mp3        │
│                                             │
│  Metadata:                                   │
│  • Display Name: [你好 (nǐ hǎo)]            │
│  • Category: [Vocabulary ▼]                 │
│  • HSK Level: [1 ▼]                         │
│  • Tags: [pronunciation, greeting]          │
│  • Description: [Greeting: Hello]           │
│                                             │
│  Usage: (3 places)                          │
│  • Lesson: "Introduction to Greetings"      │
│  • Vocabulary: "你好"                       │
│  • Story: "Meeting New Friends"             │
│                                             │
│  [Delete] [Save Changes]                    │
└─────────────────────────────────────────────┘
```

### 1.3 Features

#### Core Features:
- [x] Drag-and-drop file upload
- [x] Multi-file batch upload
- [x] Progress indicators for uploads
- [x] Audio preview player
- [x] Metadata editing (name, category, HSK, tags)
- [x] Search and filter
- [x] CDN URL display for manual use
- [x] Usage tracking (where audio is used)
- [x] Bulk operations (delete, tag, categorize)
- [x] Grid and list view toggle

#### Advanced Features (Phase 2):
- [ ] Audio waveform visualization
- [ ] Trim/crop audio in browser
- [ ] Auto-transcription (speech-to-text)
- [ ] Auto-tag based on filename
- [ ] Duplicate detection
- [ ] Bulk download as ZIP
- [ ] Audio quality analysis
- [ ] Replace audio (keep same URL)

### 1.4 Data Model

```typescript
interface AudioFile {
  id: string;
  filename: string;              // Original filename
  displayName?: string;          // User-friendly name
  url: string;                   // CDN URL (Cloudflare R2)
  key: string;                   // R2 object key
  size: number;                  // Bytes
  duration?: number;             // Seconds
  mimeType: string;              // audio/mpeg, audio/wav
  
  // Metadata
  category: 'vocabulary' | 'dialogue' | 'lesson' | 'other';
  hskLevel?: number;
  tags: string[];
  description?: string;
  
  // Tracking
  uploadedBy: string;            // Admin user ID
  usageCount: number;            // How many places use this
  lastUsedAt?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

interface AudioUsage {
  audioId: string;
  resourceType: 'lesson' | 'vocabulary' | 'story';
  resourceId: string;
  fieldPath: string;             // e.g., "blocks[2].content.audioUrl"
}
```

### 1.5 Backend API Endpoints

```typescript
// Audio Management Endpoints
POST   /api/admin/media/upload          // Upload audio file(s)
GET    /api/admin/media                 // List all audio files (with filters)
GET    /api/admin/media/:id             // Get single audio file details
PUT    /api/admin/media/:id             // Update audio metadata
DELETE /api/admin/media/:id             // Delete audio file
GET    /api/admin/media/:id/usage       // Get usage locations
POST   /api/admin/media/batch           // Batch operations (tag, delete)

// Cloudflare R2 specific
POST   /api/admin/media/presigned-url   // Get presigned upload URL
```

### 1.6 Implementation Steps

#### Step 1: Backend Setup (2 days)
- [ ] Create `media` table in D1
- [ ] Implement audio upload endpoint with R2
- [ ] Add metadata CRUD endpoints
- [ ] Implement usage tracking
- [ ] Add search and filter logic

#### Step 2: Frontend - Media Library Page (3 days)
- [ ] Create `/media` route
- [ ] Build Media Library page layout
- [ ] Implement grid view with cards
- [ ] Add filters and search
- [ ] Build upload modal with drag-and-drop
- [ ] Add audio player component
- [ ] Implement edit modal
- [ ] Add delete confirmation

#### Step 3: Integration (2 days)
- [ ] Update AudioUploader to use media library
- [ ] Add "Browse Media Library" option in block editors
- [ ] Implement audio picker modal
- [ ] Update all block editors to track audio usage
- [ ] Test audio replacement flow

#### Step 4: Polish (1 day)
- [ ] Add loading states and skeletons
- [ ] Implement error handling
- [ ] Add success/error toasts
- [ ] Optimize for mobile
- [ ] Performance testing

**Total: 8 days**

---

## Feature 2: Stories Management

### 2.1 Overview

**Goal**: Create, edit, and manage AI-generated reading stories for HSK practice.

**User Story**:
> "As a content creator, I want to create reading comprehension stories with targeted vocabulary and grammar so students can practice in context."

### 2.2 Stories Data Model

```typescript
interface Story {
  id: string;
  title: string;
  hskLevel: number;              // 1-6
  
  // Content
  sentences: StorySentence[];    // The story text
  glossary: GlossaryItem[];      // Vocabulary used
  questions: ComprehensionQuestion[];
  
  // Generation parameters (for regeneration)
  targetWords: string[];         // Must use these words
  grammarPatterns: string[];     // Must demonstrate these
  topic?: string;                // Theme (e.g., "restaurant", "travel")
  
  // Status
  status: 'draft' | 'published';
  aiGenerated: boolean;
  generatedBy?: string;          // Which prompt version
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  createdBy: string;
}

interface StorySentence {
  hanzi: string;
  pinyin: string;
  english: string;
  audioUrl?: string;
  order: number;
}

interface GlossaryItem {
  hanzi: string;
  pinyin: string;
  english: string;
  hskLevel: number;
  partOfSpeech?: string;
  audioUrl?: string;
}

interface ComprehensionQuestion {
  question: string;
  options: string[];
  correctAnswer: number;         // Index of correct option
  explanation?: string;
}
```

### 2.3 UI Design

#### Stories List Page (`/stories`)

```
┌──────────────────────────────────────────────────────────────┐
│ Stories                          [🤖 Generate New] [➕ Create]│
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ HSK: [All ▼]  Status: [All ▼]  Search: [_____] 🔍   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  📊 Stats: 45 Stories (32 Published, 13 Drafts)              │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  📖 At the Restaurant                        [HSK 2]│     │
│  │  ───────────────────────────────────────────────────│     │
│  │  Target Words: 点菜、服务员、好吃               │     │
│  │  8 sentences • 5 questions • Published         │     │
│  │  Last updated: 2 days ago                          │     │
│  │  [▶️ Preview] [📝 Edit] [🗑️ Delete]                │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  📖 Going to School                          [HSK 1]│     │
│  │  ───────────────────────────────────────────────────│     │
│  │  Target Words: 学校、老师、学生                │     │
│  │  6 sentences • 4 questions • Draft             │     │
│  │  Last updated: 5 hours ago                         │     │
│  │  [▶️ Preview] [📝 Edit] [🗑️ Delete]                │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### AI Story Generation Modal

```
┌─────────────────────────────────────────────┐
│ 🤖 Generate Story with AI           [❌]    │
├─────────────────────────────────────────────┤
│                                             │
│  Story Parameters:                           │
│                                             │
│  HSK Level: [2 ▼]                           │
│                                             │
│  Target Words (must appear): *               │
│  [点菜] [服务员] [好吃] [+ Add]             │
│                                             │
│  Grammar Patterns (optional):                │
│  [想 + verb] [太...了] [+ Add]              │
│                                             │
│  Topic/Theme:                                │
│  [Restaurant / Ordering food]               │
│                                             │
│  Story Length:                               │
│  ○ Short (6-8 sentences)                    │
│  ● Medium (10-12 sentences)                 │
│  ○ Long (15-20 sentences)                   │
│                                             │
│  Number of Questions: [5]                    │
│                                             │
│  Advanced Options: [▼ Show]                  │
│  • Prompt Template: [Default ▼]             │
│  • Model: [GPT-4 ▼]                         │
│  • Temperature: [0.7]                       │
│                                             │
│  [Cancel] [Generate Story] 🚀               │
└─────────────────────────────────────────────┘
```

#### Story Editor

```
┌──────────────────────────────────────────────────────────────┐
│ [← Back] Edit Story: At the Restaurant              [Save]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Metadata                                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Title: [At the Restaurant]                          │    │
│  │ HSK Level: [2 ▼]  Status: [Draft ▼]                │    │
│  │ Topic: [Restaurant]                                 │    │
│  │ Target Words: [点菜] [服务员] [+ Add]              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Story Content (8 sentences)                    [+ Add]       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 1. [⋮] 今天我和朋友去饭店。                        │    │
│  │    Jīntiān wǒ hé péngyǒu qù fàndiàn.               │    │
│  │    Today I went to a restaurant with friends.      │    │
│  │    🔊 [Upload Audio] [📝 Edit] [🗑️]                 │    │
│  │                                                     │    │
│  │ 2. [⋮] 服务员很热情。                              │    │
│  │    Fúwùyuán hěn rèqíng.                            │    │
│  │    The waiter was very warm.                       │    │
│  │    🔊 sentence2.mp3 [▶️] [📝 Edit] [🗑️]            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Glossary (12 words)                            [+ Add]       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 点菜 (diǎncài) - to order food [HSK 2]             │    │
│  │ 🔊 diancai.mp3 [▶️] [📝] [🗑️]                       │    │
│  │                                                     │    │
│  │ 服务员 (fúwùyuán) - waiter [HSK 2]                 │    │
│  │ 🔊 [Upload Audio] [📝] [🗑️]                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Comprehension Questions (5)                    [+ Add]       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Q1: 他们去了哪里？                                  │    │
│  │     Where did they go?                              │    │
│  │     ○ 学校 (school)                                 │    │
│  │     ● 饭店 (restaurant) ✓ Correct                  │    │
│  │     ○ 家 (home)                                     │    │
│  │     ○ 公园 (park)                                   │    │
│  │     [📝 Edit] [🗑️]                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Cancel] [Save Draft] [Publish]                             │
└──────────────────────────────────────────────────────────────┘
```

### 2.4 Backend API Endpoints

```typescript
// Stories Management
GET    /api/admin/stories              // List all stories
POST   /api/admin/stories              // Create story manually
GET    /api/admin/stories/:id          // Get story details
PUT    /api/admin/stories/:id          // Update story
DELETE /api/admin/stories/:id          // Delete story
POST   /api/admin/stories/:id/publish  // Publish story

// AI Generation
POST   /api/admin/stories/generate     // Generate story with AI
POST   /api/admin/stories/:id/regenerate // Regenerate existing story
```

### 2.5 Implementation Steps

#### Step 1: Backend Setup (2 days)
- [ ] Verify `stories` table in D1
- [ ] Implement story CRUD endpoints
- [ ] Add AI generation endpoint
- [ ] Implement publish/unpublish logic
- [ ] Add filters and search

#### Step 2: Frontend - Stories List (2 days)
- [ ] Create `/stories` route
- [ ] Build stories list page
- [ ] Add filters and search
- [ ] Implement story card component
- [ ] Add status badges

#### Step 3: Frontend - Story Editor (3 days)
- [ ] Build story editor page
- [ ] Implement sentence editor with drag-and-drop
- [ ] Build glossary management
- [ ] Create question editor
- [ ] Integrate audio uploader
- [ ] Add validation

#### Step 4: AI Generation UI (2 days)
- [ ] Build generation modal
- [ ] Implement parameter form
- [ ] Add generation progress indicator
- [ ] Handle AI response and populate editor
- [ ] Add error handling

#### Step 5: Polish (1 day)
- [ ] Add preview mode
- [ ] Implement auto-save
- [ ] Add keyboard shortcuts
- [ ] Mobile optimization
- [ ] Testing

**Total: 10 days**

---

## Feature 3: AI Prompt Configuration

### 3.1 Overview

**Goal**: Allow admins to view, edit, test, and version control AI prompts used for generating lessons and stories.

**User Story**:
> "As a content manager, I want to fine-tune the AI prompts to improve the quality and consistency of generated content."

### 3.2 Prompt Data Model

```typescript
interface AIPrompt {
  id: string;
  name: string;                  // e.g., "lesson_generation_v1"
  displayName: string;           // User-friendly name
  purpose: string;               // Description of what it does
  
  // Prompt content
  systemPrompt: string;          // The actual prompt text
  userPromptTemplate: string;    // Template with variables
  
  // Configuration
  model: string;                 // "gpt-4", "gpt-3.5-turbo"
  temperature: number;           // 0.0 - 2.0
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  
  // Usage
  usedFor: 'lesson' | 'story' | 'vocabulary' | 'other';
  isActive: boolean;
  
  // Versioning
  version: number;
  parentPromptId?: string;       // For version history
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastTestedAt?: string;
  successRate?: number;          // Percentage of successful generations
}

interface PromptTestResult {
  id: string;
  promptId: string;
  
  // Input
  testInput: any;                // Parameters used
  
  // Output
  generatedContent: any;
  success: boolean;
  errorMessage?: string;
  
  // Performance
  executionTime: number;         // ms
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;                  // USD
  
  // Metadata
  testedAt: string;
  testedBy: string;
  notes?: string;
}
```

### 3.3 UI Design

#### Prompts List Page (`/prompts`)

```
┌──────────────────────────────────────────────────────────────┐
│ AI Prompts                                   [➕ Create New]  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Type: [All ▼]  Status: [Active ▼]  Search: [____] 🔍│    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Active Prompts (4)                                           │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  🤖 Lesson Generation                          ✅    │     │
│  │  lesson_generation_v3                               │     │
│  │  ───────────────────────────────────────────────────│     │
│  │  Model: GPT-4 • Temp: 0.7 • v3 (current)           │     │
│  │  Success Rate: 94% (47/50 tests)                   │     │
│  │  Last tested: 2 hours ago                           │     │
│  │                                                     │     │
│  │  [🧪 Test] [📝 Edit] [📊 Analytics] [📋 Clone]     │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  📖 Story Generation                           ✅    │     │
│  │  story_generation_v2                                │     │
│  │  ───────────────────────────────────────────────────│     │
│  │  Model: GPT-4 • Temp: 0.8 • v2 (current)           │     │
│  │  Success Rate: 89% (89/100 tests)                  │     │
│  │  Last tested: 1 day ago                             │     │
│  │                                                     │     │
│  │  [🧪 Test] [📝 Edit] [📊 Analytics] [📋 Clone]     │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  Draft Prompts (2)                                            │
│  • lesson_generation_v4 (testing)                             │
│  • vocabulary_quiz_v1 (draft)                                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Prompt Editor

```
┌──────────────────────────────────────────────────────────────┐
│ [← Back] Edit Prompt: Lesson Generation v3          [Save]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─ Metadata ───────────────────────────────────────────┐   │
│  │ Display Name: [Lesson Generation]                    │   │
│  │ Internal Name: lesson_generation_v3                  │   │
│  │ Purpose: Generate complete grammar lessons...        │   │
│  │ Used For: [Lesson ▼]  Status: [Active ▼]            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─ Model Configuration ────────────────────────────────┐   │
│  │ Model: [GPT-4 ▼]                                     │   │
│  │ Temperature: [0.7] ━━━━━●─── (0.0 - 2.0)            │   │
│  │ Max Tokens: [2000]                                   │   │
│  │ Top P: [1.0]                                         │   │
│  │ Frequency Penalty: [0.0]                             │   │
│  │ Presence Penalty: [0.0]                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─ System Prompt ──────────────────────────────────────┐   │
│  │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │   │
│  │ ┃ You are an expert Chinese language tutor.      ┃ │   │
│  │ ┃ Generate a complete grammar lesson following   ┃ │   │
│  │ ┃ the schema below.                              ┃ │   │
│  │ ┃                                                 ┃ │   │
│  │ ┃ CONSTRAINTS:                                    ┃ │   │
│  │ ┃ 1. Use only HSK {{hsk_level}} vocabulary       ┃ │   │
│  │ ┃ 2. Must include target words: {{target_words}} ┃ │   │
│  │ ┃ 3. Grammar pattern: {{grammar_pattern}}        ┃ │   │
│  │ ┃ 4. Return ONLY valid JSON                      ┃ │   │
│  │ ┃                                                 ┃ │   │
│  │ ┃ SCHEMA:                                         ┃ │   │
│  │ ┃ {                                               ┃ │   │
│  │ ┃   "title": "...",                               ┃ │   │
│  │ ┃   "blocks": [...]                               ┃ │   │
│  │ ┃ }                                               ┃ │   │
│  │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │   │
│  │                                                     │   │
│  │ Variables: {{hsk_level}}, {{target_words}}, ...    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─ Test Playground ────────────────────────────────────┐   │
│  │ Test Input:                                          │   │
│  │ {                                                    │   │
│  │   "hsk_level": 2,                                    │   │
│  │   "target_words": ["点菜", "服务员"],                │   │
│  │   "grammar_pattern": "想 + verb"                    │   │
│  │ }                                                    │   │
│  │                                                      │   │
│  │ [🧪 Run Test]                                        │   │
│  │                                                      │   │
│  │ Result:                                              │   │
│  │ ✅ Success (1.2s, 1,234 tokens, $0.012)             │   │
│  │ {                                                    │   │
│  │   "title": "Ordering at a Restaurant",              │   │
│  │   "blocks": [...]                                   │   │
│  │ }                                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Version History: v1 → v2 → v3 (current) → v4 (draft)        │
│                                                               │
│  [Cancel] [Save as Draft] [Activate] [Save & Test]           │
└──────────────────────────────────────────────────────────────┘
```

#### Prompt Analytics

```
┌──────────────────────────────────────────────────────────────┐
│ Analytics: Lesson Generation v3                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Performance (Last 30 days)                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Success Rate:  94% (47/50)                          │    │
│  │ Avg Time:      1.4s                                 │    │
│  │ Avg Cost:      $0.015                               │    │
│  │ Total Usage:   156 generations                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  📊 Success Rate Over Time                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 100%                                                 │    │
│  │  95% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │    │
│  │  90%                                                 │    │
│  │  85%                                                 │    │
│  │      Week 1  Week 2  Week 3  Week 4                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Recent Test Results (10)                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ✅ Nov 24, 10:30 AM - 1.2s - $0.012 - Success       │    │
│  │ ✅ Nov 24, 09:15 AM - 1.5s - $0.014 - Success       │    │
│  │ ❌ Nov 23, 04:20 PM - 2.1s - $0.018 - Invalid JSON  │    │
│  │ ✅ Nov 23, 02:45 PM - 1.3s - $0.013 - Success       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Common Errors:                                               │
│  • Invalid JSON format: 3 occurrences                         │
│  • Missing required fields: 2 occurrences                     │
│                                                               │
│  [Export Data] [View All Tests]                               │
└──────────────────────────────────────────────────────────────┘
```

### 3.4 Backend API Endpoints

```typescript
// Prompt Management
GET    /api/admin/prompts              // List all prompts
POST   /api/admin/prompts              // Create new prompt
GET    /api/admin/prompts/:id          // Get prompt details
PUT    /api/admin/prompts/:id          // Update prompt
DELETE /api/admin/prompts/:id          // Delete prompt
POST   /api/admin/prompts/:id/activate // Make prompt active
POST   /api/admin/prompts/:id/clone    // Clone prompt for new version

// Testing & Analytics
POST   /api/admin/prompts/:id/test     // Test prompt with parameters
GET    /api/admin/prompts/:id/tests    // Get test history
GET    /api/admin/prompts/:id/analytics// Get analytics data
```

### 3.5 Implementation Steps

#### Step 1: Backend Setup (2 days)
- [ ] Create `prompts` and `prompt_tests` tables
- [ ] Implement prompt CRUD endpoints
- [ ] Add test execution endpoint
- [ ] Implement analytics aggregation
- [ ] Add version control logic

#### Step 2: Frontend - Prompts List (1 day)
- [ ] Create `/prompts` route
- [ ] Build prompts list page
- [ ] Add status badges and metrics
- [ ] Implement filters

#### Step 3: Frontend - Prompt Editor (3 days)
- [ ] Build prompt editor page
- [ ] Implement code editor for prompts (Monaco Editor?)
- [ ] Add variable highlighting
- [ ] Build model configuration panel
- [ ] Create test playground

#### Step 4: Testing & Analytics (2 days)
- [ ] Implement test execution UI
- [ ] Build analytics dashboard
- [ ] Add test history viewer
- [ ] Create success/error visualization

#### Step 5: Polish (1 day)
- [ ] Add validation
- [ ] Implement version diffing
- [ ] Add export/import
- [ ] Documentation
- [ ] Testing

**Total: 9 days**

---

## Implementation Timeline

### Overall Schedule (27 days ≈ 5-6 weeks)

```
Week 1-2: Audio Management (8 days)
├─ Days 1-2: Backend setup
├─ Days 3-5: Media Library page
├─ Days 6-7: Integration with editors
└─ Day 8: Polish & testing

Week 3-4: Stories Management (10 days)
├─ Days 9-10: Backend setup
├─ Days 11-12: Stories list page
├─ Days 13-15: Story editor
├─ Days 16-17: AI generation UI
└─ Day 18: Polish & testing

Week 5: AI Prompts (9 days)
├─ Days 19-20: Backend setup
├─ Day 21: Prompts list page
├─ Days 22-24: Prompt editor
├─ Days 25-26: Testing & analytics
└─ Day 27: Polish & documentation

TOTAL: ~6 weeks for all three features
```

### Parallel Development Strategy

**Can be developed in parallel:**
- Audio Management (Developer A)
- Stories Management (Developer B)
- AI Prompts (Developer C)

**With 3 developers: ~2-3 weeks total**

### Prioritization

**If you can only do one feature at a time:**

1. **Week 1-2: Audio Management** (HIGHEST PRIORITY)
   - Needed by every lesson and story
   - Unblocks other content creation

2. **Week 3-4: Stories Management** (HIGH PRIORITY)
   - Core content type
   - Students need reading practice

3. **Week 5: AI Prompts** (MEDIUM PRIORITY)
   - Improves quality over time
   - Can start with default prompts

---

## Technical Architecture

### 3.6 Shared Components

These components will be reused across all features:

```typescript
// Component Library
components/
├── media/
│   ├── AudioUploader.tsx      // ✅ Already exists
│   ├── AudioPlayer.tsx        // New: Inline player
│   ├── AudioPicker.tsx        // New: Browse & select from library
│   └── WaveformVisualizer.tsx // New: Visual audio preview
│
├── editors/
│   ├── RichTextEditor.tsx     // New: For descriptions
│   ├── CodeEditor.tsx         // New: For prompts (Monaco)
│   └── JsonViewer.tsx         // New: Pretty JSON display
│
├── shared/
│   ├── FileDropzone.tsx       // New: Drag & drop zone
│   ├── ProgressBar.tsx        // New: Upload progress
│   ├── StatusBadge.tsx        // New: Published/Draft badges
│   ├── EmptyState.tsx         // New: "No items yet"
│   ├── ConfirmDialog.tsx      // New: Delete confirmations
│   └── Toast.tsx              // ✅ Already configured (Radix)
```

### 3.7 State Management

```typescript
// Zustand stores
stores/
├── audioStore.ts          // Media library state
├── storyStore.ts          // Current story being edited
├── promptStore.ts         // Prompt editor state
└── uiStore.ts             // Global UI state
```

### 3.8 API Services

```typescript
// API services (add to existing)
services/
├── api.ts                 // ✅ Already exists
├── authAPI.ts             // ✅ Already exists
├── lessonAPI.ts           // ✅ Already exists
├── audioAPI.ts            // ✅ Exists but needs expansion
├── storyAPI.ts            // NEW
├── promptAPI.ts           // NEW
└── analyticsAPI.ts        // NEW
```

---

## Success Metrics

### Audio Management
- [ ] 100% of lessons have audio
- [ ] < 30s to upload and attach audio
- [ ] Zero duplicate audio files
- [ ] Search finds audio in < 1s

### Stories Management
- [ ] 50+ stories created in first month
- [ ] AI generation success rate > 90%
- [ ] < 5 min to create story with AI
- [ ] < 15 min to manually edit story

### AI Prompts
- [ ] All prompts documented
- [ ] Success rate tracked
- [ ] < 2s average generation time
- [ ] Version history for all changes

---

## Next Steps

### Immediate Actions (This Week)

1. **Review this plan** with team
2. **Prioritize features** based on launch timeline
3. **Assign developers** (if working in parallel)
4. **Set up project tracking** (GitHub Issues/Jira)
5. **Start with Audio Management** (highest priority)

### Quick Wins (Can do today)

- [ ] Create route placeholders (`/media`, `/stories`, `/prompts`)
- [ ] Add navigation links in sidebar
- [ ] Create empty state pages
- [ ] Set up API endpoint stubs in backend

---

## Questions to Resolve

1. **Audio Storage**: Confirm Cloudflare R2 is configured and accessible?
2. **AI Model**: Which OpenAI model for generation? (GPT-4, GPT-4-Turbo, GPT-3.5?)
3. **Cost Budget**: What's the monthly budget for AI generations?
4. **Content Team**: How many people will use these features?
5. **Timeline**: When do you need these features in production?

---

**Ready to start? Pick a feature and let's build it! 🚀**

