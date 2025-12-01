/**
 * LessonList Page
 * Displays lessons organized by Lesson Groups (formerly Units)
 * 
 * Features:
 * - Lesson groups with gradient cards
 * - Ungrouped lessons section
 * - Inline group management (create, edit, delete)
 * - Move lessons between groups
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, BookOpen, Star, Clock, Search, ChevronDown, ChevronRight,
  FolderPlus, Loader2, AlertCircle, Edit, FileJson
} from "lucide-react";
import type { Lesson, LessonType } from "@/types/lesson";
import type { Unit } from "@/types/unit";
import { LESSON_TYPE_CONFIG } from "@/types/lesson";
import { LessonTypeModal } from "@/components/lesson-editor/LessonTypeModal";
import { LessonImportListModal } from "@/components/lesson-editor/LessonImportListModal";
import { LessonGroupCard } from "@/components/lessons/LessonGroupCard";
import { LessonGroupModal, type GroupFormData } from "@/components/lessons/LessonGroupModal";
import { lessonAPI } from "@/services/lessonAPI";
import { 
  getUnits, createUnit, updateUnit, deleteUnit,
  getUnitLessons, removeLessonFromUnit, addLessonToUnit 
} from "@/services/unitsAPI";
import { toast } from "@/hooks/useToast";

interface GroupWithLessons extends Unit {
  lessons: Lesson[];
}

export function LessonList() {
  // Data state
  const [groups, setGroups] = useState<GroupWithLessons[]>([]);
  const [ungroupedLessons, setUngroupedLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [hskFilter, setHskFilter] = useState<number | undefined>();
  const [typeFilter, setTypeFilter] = useState<LessonType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expandedUngrouped, setExpandedUngrouped] = useState(true);

  // Group modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Unit | null>(null);


  // Fetch data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch groups (units) and all lessons in parallel
      const [unitsData, lessonsResponse] = await Promise.all([
        getUnits(hskFilter),
        lessonAPI.getAll({ hskLevel: hskFilter }),
      ]);

      // Fetch lessons for each unit
      const groupsWithLessons = await Promise.all(
        unitsData.map(async (unit) => {
          try {
            const lessons = await getUnitLessons(unit.id);
            return { ...unit, lessons };
          } catch {
            return { ...unit, lessons: [] };
          }
        })
      );

      // Find ungrouped lessons (lessons not in any unit)
      const groupedLessonIds = new Set(
        groupsWithLessons.flatMap(g => g.lessons.map(l => l.id))
      );
      const ungrouped = lessonsResponse.lessons.filter(l => !groupedLessonIds.has(l.id));

      setGroups(groupsWithLessons);
      setUngroupedLessons(ungrouped);
    } catch (err) {
      setError('Failed to load lessons. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [hskFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter lessons
  const filterLessons = (lessons: Lesson[]) => {
    return lessons.filter(lesson => {
      if (typeFilter !== "all" && lesson.lessonType !== typeFilter) return false;
      if (searchQuery && !lesson.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  };

  // Group actions
  const handleCreateGroup = async (data: GroupFormData) => {
    try {
      await createUnit(data);
      toast.success('Lesson group created');
      loadData();
    } catch (err) {
      toast.error('Failed to create group');
    }
  };

  const handleEditGroup = async (data: GroupFormData) => {
    if (!editingGroup) return;
    try {
      await updateUnit(editingGroup.id, data);
      toast.success('Group updated');
      setEditingGroup(null);
      loadData();
    } catch (err) {
      toast.error('Failed to update group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Delete this group? Lessons will be moved to "Ungrouped".')) return;
    try {
      await deleteUnit(groupId);
      toast.success('Group deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete group');
    }
  };

  const handleRemoveLessonFromGroup = async (groupId: string, lessonId: string) => {
    try {
      await removeLessonFromUnit(groupId, lessonId);
      toast.success('Lesson removed from group');
      loadData();
    } catch (err) {
      toast.error('Failed to remove lesson');
    }
  };

  const handleMoveToGroup = async (lessonId: string, groupId: string) => {
    try {
      // First remove from current group if any
      const currentGroup = groups.find(g => g.lessons.some(l => l.id === lessonId));
      if (currentGroup) {
        await removeLessonFromUnit(currentGroup.id, lessonId);
      }
      // Add to new group
      await addLessonToUnit(groupId, lessonId);
      toast.success('Lesson moved to group');
      loadData();
    } catch (err) {
      toast.error('Failed to move lesson');
    }
  };

  // Stats
  const allLessons = [...groups.flatMap(g => g.lessons), ...ungroupedLessons];
  const filteredAllLessons = filterLessons(allLessons);
  const stats = {
    total: filteredAllLessons.length,
    published: filteredAllLessons.filter(l => l.isPublished).length,
    drafts: filteredAllLessons.filter(l => !l.isPublished).length,
    groups: groups.length,
  };

  // Filter groups by HSK level
  const filteredGroups = hskFilter 
    ? groups.filter(g => g.hskLevel === hskFilter)
    : groups;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            📚 Lessons
          </h1>
          <p className="text-gray-600 mt-1">Organize lessons into groups for your curriculum</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-amber-200 text-amber-700 rounded-xl font-medium hover:bg-amber-50 hover:border-amber-300 transition-all"
            title="Import lesson from JSON"
          >
            <FileJson size={18} />
            Import JSON
          </button>
          <button 
            onClick={() => { setEditingGroup(null); setShowGroupModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-indigo-200 text-indigo-700 rounded-xl font-medium hover:bg-indigo-50 hover:border-indigo-300 transition-all"
          >
            <FolderPlus size={18} />
            New Group
          </button>
          <button 
            onClick={() => setShowTypeModal(true)}
            className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all hover:scale-105 flex items-center gap-2"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
            Create Lesson
          </button>
        </div>
      </div>

      {/* Lesson Type Modal */}
      <LessonTypeModal
        isOpen={showTypeModal}
        onClose={() => setShowTypeModal(false)}
      />

      {/* Import JSON Modal */}
      <LessonImportListModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        defaultHskLevel={hskFilter || 1}
      />

      {/* Group Modal */}
      <LessonGroupModal
        isOpen={showGroupModal}
        onClose={() => { setShowGroupModal(false); setEditingGroup(null); }}
        onSave={editingGroup ? handleEditGroup : handleCreateGroup}
        group={editingGroup}
        defaultHskLevel={hskFilter || 1}
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Total Lessons" value={stats.total} color="blue" />
        <StatCard icon={Star} label="Published" value={stats.published} color="green" />
        <StatCard icon={Clock} label="Drafts" value={stats.drafts} color="purple" />
        <StatCard icon={FolderPlus} label="Groups" value={stats.groups} color="orange" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search lessons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 pl-10 pr-4 h-11 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          <select
            value={hskFilter || ""}
            onChange={(e) => setHskFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="px-4 h-11 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="">All HSK Levels</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
              <option key={level} value={level}>
                HSK {level}{level > 6 ? ' (3.0)' : ''}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as LessonType | "all")}
            className="px-4 h-11 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="all">All Types</option>
            <option value="lesson">📘 Lessons</option>
            <option value="speaking">🎤 Speaking</option>
            <option value="mini_test">✏️ Mini Tests</option>
            <option value="hsk_test">🎯 HSK Tests</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <div>
            <p className="text-red-800 font-medium">{error}</p>
            <button 
              onClick={loadData}
              className="text-red-600 hover:text-red-700 text-sm font-medium mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Lesson Groups */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {/* Groups */}
          {filteredGroups.map((group) => {
            const filteredGroupLessons = filterLessons(group.lessons);
            if (searchQuery && filteredGroupLessons.length === 0) return null;

            return (
              <LessonGroupCard
                key={group.id}
                group={group}
                lessons={filteredGroupLessons}
                defaultExpanded={filteredGroups.length <= 3}
                onEdit={(g) => { setEditingGroup(g); setShowGroupModal(true); }}
                onDelete={handleDeleteGroup}
                onRemoveLesson={(lessonId) => handleRemoveLessonFromGroup(group.id, lessonId)}
              />
            );
          })}

          {/* Ungrouped Lessons Section */}
          {filterLessons(ungroupedLessons).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedUngrouped(!expandedUngrouped)}
                className="w-full px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedUngrouped ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Ungrouped Lessons</h3>
                    <p className="text-sm text-gray-500">
                      {filterLessons(ungroupedLessons).length} lessons not assigned to any group
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-gray-200 rounded-full text-sm font-medium text-gray-700">
                  {filterLessons(ungroupedLessons).length}
                </span>
              </button>

              {expandedUngrouped && (
                <div className="divide-y divide-gray-100">
                  {filterLessons(ungroupedLessons).map((lesson) => (
                    <UngroupedLessonRow
                      key={lesson.id}
                      lesson={lesson}
                      groups={groups}
                      onMoveToGroup={(groupId) => handleMoveToGroup(lesson.id, groupId)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {filteredGroups.length === 0 && filterLessons(ungroupedLessons).length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <BookOpen size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                {searchQuery ? 'No lessons found' : 'No lessons yet'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {searchQuery 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first lesson group and start building your curriculum'
                }
              </p>
              <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={() => setShowGroupModal(true)}
                  className="px-5 py-2.5 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-colors font-medium"
                >
                  <FolderPlus size={16} className="inline mr-2" />
                  Create Group
                </button>
                <button 
                  onClick={() => setShowTypeModal(true)}
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
                >
                  <Plus size={16} className="inline mr-2" />
                  Create Lesson
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: typeof BookOpen;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colors = {
    blue: 'from-blue-50 to-cyan-50 border-blue-200 bg-blue-500 text-blue-900 text-blue-600',
    green: 'from-green-50 to-emerald-50 border-green-200 bg-green-500 text-green-900 text-green-600',
    purple: 'from-purple-50 to-pink-50 border-purple-200 bg-purple-500 text-purple-900 text-purple-600',
    orange: 'from-orange-50 to-amber-50 border-orange-200 bg-orange-500 text-orange-900 text-orange-600',
  };
  const c = colors[color].split(' ');

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${c[0]} ${c[1]} border ${c[2]}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 ${c[3]} rounded-lg`}>
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <div className={`text-2xl font-bold ${c[4]}`}>{value}</div>
          <div className={`text-xs ${c[5]}`}>{label}</div>
        </div>
      </div>
    </div>
  );
}

// Ungrouped Lesson Row with Move Menu
function UngroupedLessonRow({ 
  lesson, 
  groups,
  onMoveToGroup,
}: { 
  lesson: Lesson;
  groups: GroupWithLessons[];
  onMoveToGroup: (groupId: string) => void;
}) {
  const navigate = useNavigate();
  const config = LESSON_TYPE_CONFIG[lesson.lessonType];
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
      {/* Type icon */}
      <span className="text-xl">{config.icon}</span>

      {/* Lesson info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 truncate">{lesson.title}</h4>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            HSK {lesson.hskLevel}
          </span>
          {lesson.isPublished ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
              Live
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">
              Draft
            </span>
          )}
        </div>
        {lesson.subtitle && (
          <p className="text-xs text-gray-500 truncate">{lesson.subtitle}</p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {lesson.estimatedMinutes || 10}m
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate(`/lessons/${lesson.id}/edit`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-purple-600"
        >
          <Edit size={14} />
        </button>
        
        {/* Move to group menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            title="Move to group"
          >
            <FolderPlus size={14} />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 max-h-64 overflow-y-auto">
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
                  Move to group
                </div>
                {groups.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No groups yet
                  </div>
                ) : (
                  groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => { onMoveToGroup(group.id); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <div 
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: group.accentColor || '#4F46E5' }}
                      />
                      <span className="truncate">{group.title}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        HSK {group.hskLevel}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LessonList;
