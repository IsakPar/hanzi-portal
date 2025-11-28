# 🎨 **UI Integration Plan - Making Phase 1 Features Visible**

## **🔍 AUDIT RESULTS**

After reviewing the codebase, here's what we built vs. what's actually exposed in the UI:

### ✅ **WORKING (Already Integrated)**
1. ✅ **HanziInput** - Integrated in Vocabulary Editor
2. ✅ **Story Sentences Tab** - Enhanced with word segmentation
3. ✅ **Story Vocabulary Tab** - Auto-linking functional (needs integration into StoryEditor)
4. ✅ **Content Export Page** - Fully functional, accessible via sidebar

### ❌ **MISSING (Built but Not Exposed in UI)**
1. ❌ **HSK 1-9 Selector** - StoriesList still shows HSK 1-6 only (line 124)
2. ❌ **Lesson Ordering** - No UI to set `orderIndex` or reorder lessons
3. ❌ **Audio Upload** - Built AudioUploader component, but not integrated in Story Sentences Tab
4. ❌ **Story Access Tier** - No UI to set free/premium status
5. ❌ **Lesson HSK Filter** - LessonList has no HSK filter (unlike StoriesList)
6. ❌ **Story Vocabulary Tab** - Not added to StoryEditor tabs

---

## **📋 UI CHANGES REQUIRED**

### **1. StoriesList.tsx - Update HSK Filter to 1-9**
**File**: `src/pages/StoriesList.tsx`
**Line**: 124-126

**Current**:
```tsx
{[1, 2, 3, 4, 5, 6].map((level) => (
  <option key={level} value={level}>HSK {level}</option>
))}
```

**Change To**:
```tsx
{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
  <option key={level} value={level}>
    HSK {level}{level > 6 ? ' (HSK 3.0)' : ''}
  </option>
))}
```

---

### **2. LessonList.tsx - Add HSK Filter + Lesson Ordering UI**
**File**: `src/pages/LessonList.tsx`

**Changes Needed**:
1. Add HSK filter dropdown (like StoriesList)
2. Add "Sort by Order" button
3. Add lesson numbering display
4. Show orderIndex in lesson cards

**New UI Elements**:
```tsx
{/* Filters Section */}
<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
  <div className="flex items-center gap-4">
    <select
      value={hskFilter || ""}
      onChange={(e) => setHskFilter(e.target.value ? Number(e.target.value) : undefined)}
      className="px-4 h-11 rounded-lg border border-gray-200 bg-gray-50"
    >
      <option value="">All HSK Levels</option>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
        <option key={level} value={level}>
          HSK {level}{level > 6 ? ' (HSK 3.0)' : ''}
        </option>
      ))}
    </select>
    
    <button className="px-4 h-11 border rounded-lg">
      <SortAsc className="w-4 h-4 mr-2" />
      Sort by Order
    </button>
    
    <button className="px-4 h-11 border rounded-lg">
      <Edit className="w-4 h-4 mr-2" />
      Reorder Lessons
    </button>
  </div>
</div>
```

**Lesson Card Updates**:
```tsx
{/* Add lesson number badge */}
<div className="absolute top-4 right-4">
  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/30 text-white backdrop-blur-sm">
    #{lesson.orderIndex || '?'}
  </span>
</div>
```

---

### **3. LessonEditor.tsx - Add Lesson Number Input**
**File**: `src/pages/LessonEditor.tsx`

**Add to Lesson Info Form**:
```tsx
<div>
  <Label htmlFor="orderIndex">Lesson Number (Order)</Label>
  <Input
    id="orderIndex"
    type="number"
    value={lesson.orderIndex || ''}
    onChange={(e) => setLesson({ ...lesson, orderIndex: parseInt(e.target.value) || undefined })}
    placeholder="1, 2, 3..."
  />
  <p className="text-xs text-gray-500 mt-1">
    Order within HSK {lesson.hskLevel} (e.g., Lesson 1, Lesson 2)
  </p>
</div>
```

---

### **4. StoryEditor.tsx - Add Vocabulary Tab**
**File**: `src/pages/StoryEditor.tsx`

**Current Tabs**: Info, Sentences, Practice
**Add**: Vocabulary tab

**Change**:
```tsx
// Line 12: Update Tab type
type Tab = 'info' | 'sentences' | 'vocabulary' | 'practice';

// Add tab button in UI
<button
  onClick={() => setActiveTab('vocabulary')}
  className={activeTab === 'vocabulary' ? 'active' : ''}
>
  <Link className="w-5 h-5" />
  Vocabulary
</button>

// Add tab content
{activeTab === 'vocabulary' && story && (
  <StoryVocabularyTab story={story} onUpdate={loadStory} />
)}
```

---

### **5. StoryInfoTab.tsx - Add Access Tier Selector**
**File**: `src/components/story-editor/StoryInfoTab.tsx`

**Add to Story Info Form**:
```tsx
<div>
  <Label htmlFor="accessTier">Access Tier</Label>
  <select
    id="accessTier"
    value={story.accessTier || 'premium'}
    onChange={(e) => onUpdate({ ...story, accessTier: e.target.value })}
    className="w-full px-4 py-2 border rounded-lg"
  >
    <option value="free">Free (5 per month)</option>
    <option value="premium">Premium (Subscription)</option>
  </select>
  <p className="text-xs text-gray-500 mt-1">
    Free stories are part of the monthly quota
  </p>
</div>
```

**Update HSK Level Dropdown to 1-9**:
```tsx
<select
  id="hskLevel"
  value={story.hskLevel}
  onChange={(e) => onUpdate({ ...story, hskLevel: parseInt(e.target.value) })}
>
  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
    <option key={level} value={level}>
      HSK {level}{level > 6 ? ' (Advanced)' : ''}
    </option>
  ))}
</select>
```

---

### **6. StorySentencesTab.tsx - Integrate Audio Upload**
**File**: `src/components/story-editor/StorySentencesTab.tsx`

**Add to Sentence Edit Form** (after English translation):
```tsx
{/* Audio Upload */}
<div>
  <Label>Sentence Audio</Label>
  <AudioUploader
    audioUrl={editedSentence.audioUrl}
    onUploadStart={() => console.log('Upload started')}
    onUploadComplete={(url) => {
      setEditedSentence({ ...editedSentence, audioUrl: url });
    }}
    onUploadError={(error) => console.error('Upload failed:', error)}
    onDelete={() => {
      setEditedSentence({ ...editedSentence, audioUrl: null });
    }}
  />
  <p className="text-xs text-gray-500 mt-1">
    Upload MP3 audio for this sentence (max 10MB)
  </p>
</div>
```

---

### **7. VocabularyList.tsx - Update HSK Filter to 1-9**
**File**: `src/pages/VocabularyList.tsx`

**Find HSK Filter** (should be around line 80-90):
```tsx
// Update from 1-6 to 1-9
{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
  <option key={level} value={level}>
    HSK {level}
  </option>
))}
```

---

### **8. VocabularyEditor.tsx - Update HSK Dropdown to 1-9**
**File**: `src/pages/VocabularyEditor.tsx`

**Already using HSK_LEVELS constant** - This should auto-update since we already changed `vocabularyAPI.ts`!

---

### **9. LessonEditor.tsx - Update HSK Dropdown to 1-9**
**File**: `src/pages/LessonEditor.tsx`

**Find HSK Level Selector** and update:
```tsx
<select
  value={lesson.hskLevel}
  onChange={(e) => setLesson({ ...lesson, hskLevel: parseInt(e.target.value) })}
>
  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
    <option key={level} value={level}>
      HSK {level}{level > 6 ? ' (HSK 3.0)' : ''}
    </option>
  ))}
</select>
```

---

### **10. Create Lesson Reorder Modal**
**New File**: `src/components/lesson-editor/LessonReorderModal.tsx`

**Purpose**: Drag-and-drop interface to reorder lessons within an HSK level

**Features**:
- Filter by HSK level
- Drag-and-drop using `@dnd-kit`
- Show lesson thumbnails
- Batch save new order
- Cancel/Reset functionality

**UI**:
```tsx
// Modal with sortable list
<DndContext onDragEnd={handleDragEnd}>
  <SortableContext items={lessons} strategy={verticalListSortingStrategy}>
    {lessons.map((lesson, index) => (
      <SortableItem key={lesson.id} lesson={lesson} index={index + 1} />
    ))}
  </SortableContext>
</DndContext>
```

---

## **📊 SUMMARY OF REQUIRED CHANGES**

| File | Change | Complexity | Lines |
|------|--------|------------|-------|
| `StoriesList.tsx` | Update HSK filter 1-6 → 1-9 | ⭐ Easy | 1 line |
| `StoryInfoTab.tsx` | Add HSK 1-9 + accessTier | ⭐⭐ Medium | 30 lines |
| `StoryEditor.tsx` | Add Vocabulary tab | ⭐ Easy | 15 lines |
| `StorySentencesTab.tsx` | Integrate AudioUploader | ⭐⭐ Medium | 25 lines |
| `LessonList.tsx` | Add HSK filter + order display | ⭐⭐ Medium | 50 lines |
| `LessonEditor.tsx` | Add orderIndex input + HSK 1-9 | ⭐ Easy | 20 lines |
| `VocabularyList.tsx` | Update HSK filter 1-9 | ⭐ Easy | 1 line |
| `LessonReorderModal.tsx` | **NEW FILE** - Drag-and-drop reorder | ⭐⭐⭐ Hard | 200 lines |

**Total Estimated Changes**: ~342 lines across 8 files

---

## **🎯 PRIORITY ORDER**

### **High Priority (User-Facing)**
1. ✅ **StoriesList** - HSK 1-9 filter (CRITICAL - users can't access HSK 7-9 stories)
2. ✅ **StoryInfoTab** - HSK 1-9 + accessTier (CRITICAL - can't set story tier)
3. ✅ **StoryEditor** - Add Vocabulary tab (HIGH - auto-linking not accessible)
4. ✅ **VocabularyList** - HSK 1-9 filter (HIGH - users can't filter new levels)

### **Medium Priority (Editor Enhancements)**
5. ⚠️ **StorySentencesTab** - Audio upload (MEDIUM - UX improvement)
6. ⚠️ **LessonList** - HSK filter (MEDIUM - consistency with Stories)
7. ⚠️ **LessonEditor** - HSK 1-9 + orderIndex (MEDIUM - data entry)

### **Low Priority (Advanced Features)**
8. 🔵 **LessonReorderModal** - Drag-and-drop (LOW - nice-to-have, can use manual numbers)

---

## **⚡ QUICK WINS (Do These First)**

These are 1-line changes that expose critical functionality:

1. `StoriesList.tsx` line 124: `{[1, 2, 3, 4, 5, 6].map...` → `{[1, 2, 3, 4, 5, 6, 7, 8, 9].map...`
2. `VocabularyList.tsx`: Find similar array and add 7, 8, 9
3. `StoryEditor.tsx` line 12: `type Tab = 'info' | 'sentences' | 'practice';` → add `'vocabulary'`

**Time Estimate**: 5 minutes
**Impact**: Unlocks HSK 7-9 + vocabulary auto-linking

---

## **🚀 NEXT STEPS**

**Option A: Quick Fixes Only (5 min)**
- Fix HSK filters (1-9 everywhere)
- Add Vocabulary tab to StoryEditor
- Ship and test

**Option B: Full Integration (2 hours)**
- All Quick Fixes
- Add accessTier selector
- Integrate AudioUploader
- Add lesson ordering UI
- Full QA testing

**Option C: Phased Rollout**
- **Phase 1** (today): Quick fixes
- **Phase 2** (tomorrow): Audio + accessTier
- **Phase 3** (next week): Lesson reordering modal

---

**Which approach do you prefer?** I can start implementing any of these right away! 🚀

