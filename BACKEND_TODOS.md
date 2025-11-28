# 🔧 **Backend TODOs Implementation**

## **✅ GOOD NEWS: Audio Upload API Already Exists!**

The audio upload endpoint is already implemented in the backend:
- **Endpoint**: `POST /v1/stories/:id/sentences/:sentenceId/audio`
- **Location**: `hanzimaster-backend-v2/src/routes/stories.ts` (lines 352-389)
- **Features**:
  - Accepts `multipart/form-data`
  - Validates file type (audio/mpeg, audio/mp3, audio/x-m4a, audio/wav)
  - Validates file size (max 10MB)
  - Uploads to R2: `stories/sentences/{storyId}/{sentenceId}.{ext}`
  - Updates database with R2 key

---

## **📋 REMAINING TODOs**

### **✅ TODO 1: Connect Audio Upload to Backend**
**File**: `hanzimaster-portal-v2/src/components/story-editor/StorySentencesTab.tsx`
**Status**: ✅ COMPLETED

**Changes**:
- Replace mock upload with real API call
- Use `uploadSentenceAudio` from `storiesAPI.ts`
- Handle loading states and errors

---

### **⚠️ TODO 2: Add HSK 1-9 Support to Backend**
**Files**: 
- `hanzimaster-backend-v2/src/routes/stories.ts` (lines 25, 37, 76)
- `hanzimaster-backend-v2/src/routes/admin.ts` (line 19)

**Current**: `.max(6)` 
**Change To**: `.max(9)`

**3 locations to update**:
1. Line 25: `createStorySchema`
2. Line 37: `updateStorySchema`  
3. Line 76: `searchSchema`

---

### **⚠️ TODO 3: Add Access Tier Support to Backend**
**File**: `hanzimaster-backend-v2/src/routes/stories.ts`

**Changes**:
1. Add `accessTier` to `createStorySchema` (line 18-28)
2. Add `accessTier` to `updateStorySchema` (line 30-41)
3. Add `accessTier` to `searchSchema` (line 75-83)

---

## **🚀 IMPLEMENTATION**

### **Step 1: Frontend Audio Upload (DONE)**

Already connected in the implementation above. The frontend now:
- Accepts MP3 files via file input
- Shows upload progress with loading spinner
- Calls `uploadSentenceAudio(storyId, sentenceId, file)`
- Displays success state with audio URL
- Handles errors gracefully

---

### **Step 2: Backend HSK 1-9 Support**

Update 3 schemas in `stories.ts`:

```typescript
// Line 25
const createStorySchema = z.object({
  // ...
  hskLevel: z.number().int().min(1).max(9), // Changed from 6 to 9
  // ...
});

// Line 37
const updateStorySchema = z.object({
  // ...
  hskLevel: z.number().int().min(1).max(9).optional(), // Changed from 6 to 9
  // ...
});

// Line 76
const searchSchema = z.object({
  hsk_level: z.coerce.number().int().min(1).max(9).optional(), // Changed from 6 to 9
  // ...
});
```

Also update `admin.ts` line 19:
```typescript
// Line 19
const createLessonSchema = z.object({
  title: z.string().min(3),
  hskLevel: z.number().min(1).max(9), // Changed from 6 to 9
  // ...
});
```

---

### **Step 3: Backend Access Tier Support**

Add to `stories.ts`:

```typescript
// Line 18-28: createStorySchema
const createStorySchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  contentLibraryId: z.string().optional(),
  description: z.string().optional(),
  topic: z.string().optional(),
  hskLevel: z.number().int().min(1).max(9),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  accessTier: z.enum(['free', 'premium']).optional(), // ADD THIS LINE
});

// Line 30-41: updateStorySchema
const updateStorySchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  contentLibraryId: z.string().optional(),
  description: z.string().optional(),
  topic: z.string().optional(),
  hskLevel: z.number().int().min(1).max(9).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  isPublished: z.boolean().optional(),
  accessTier: z.enum(['free', 'premium']).optional(), // ADD THIS LINE
});

// Line 75-83: searchSchema (optional filter)
const searchSchema = z.object({
  hsk_level: z.coerce.number().int().min(1).max(9).optional(),
  difficulty: z.string().optional(),
  topic: z.string().optional(),
  query: z.string().optional(),
  published: z.coerce.boolean().optional(),
  access_tier: z.enum(['free', 'premium']).optional(), // ADD THIS LINE
  limit: z.coerce.number().int().max(100).optional(),
  offset: z.coerce.number().int().optional(),
});
```

---

## **📝 SUMMARY**

### **Frontend (DONE)**
✅ Audio upload UI integrated
✅ Access tier selector added
✅ HSK 1-9 in all dropdowns
✅ Lesson order index input added

### **Backend (NEEDS UPDATE)**
⚠️ Update 4 schemas in `stories.ts` (HSK 1-9 + accessTier)
⚠️ Update 1 schema in `admin.ts` (HSK 1-9)

### **Database (ALREADY DONE)**
✅ Migration created (HSK 1-9 + accessTier)
✅ Schema updated
✅ Indexes added

---

## **🎯 NEXT STEPS**

1. Apply backend schema changes (5 lines to update)
2. Test audio upload in portal
3. Test HSK 1-9 story creation
4. Test free/premium story creation
5. Verify all endpoints work

---

**All frontend work is complete! Just need to update backend validation schemas.** 🎊

