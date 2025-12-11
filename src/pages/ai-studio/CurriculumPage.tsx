/**
 * AI Studio - Curriculum Page
 * 
 * View existing lessons in the curriculum.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Loader2, RefreshCw, ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/useToast';
import { AIStudioLayout } from '@/layouts/AIStudioLayout';
import { lessonAPI } from '@/services/lessonAPI';
import type { Lesson } from '@/types/lesson';

export function CurriculumPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hskFilter, setHskFilter] = useState<number | 'all'>('all');

  const loadLessons = async () => {
    setLoading(true);
    try {
      const result = await lessonAPI.getAll();
      setLessons(result.lessons || []);
    } catch (err) {
      toast.error('Failed to load lessons', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLessons();
  }, []);

  // Filter lessons
  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = search === '' || 
      lesson.title.toLowerCase().includes(search.toLowerCase()) ||
      (lesson.subtitle?.toLowerCase().includes(search.toLowerCase()));
    const matchesHsk = hskFilter === 'all' || lesson.hskLevel === hskFilter;
    return matchesSearch && matchesHsk;
  });

  // Group by HSK level
  const groupedLessons = filteredLessons.reduce((acc, lesson) => {
    const level = lesson.hskLevel;
    if (!acc[level]) acc[level] = [];
    acc[level].push(lesson);
    return acc;
  }, {} as Record<number, Lesson[]>);

  const getStatusBadge = (lesson: Lesson) => {
    if (lesson.isPublished) {
      return { text: 'Published', style: 'bg-green-100 text-green-700' };
    }
    return { text: 'Draft', style: 'bg-gray-100 text-gray-600' };
  };

  return (
    <AIStudioLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-500" />
              My Lessons
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lessons.length} lessons in your curriculum
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLessons}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search lessons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300"
            />
          </div>
          <select
            value={hskFilter}
            onChange={(e) => setHskFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">All Levels</option>
            {[1, 2, 3, 4, 5, 6].map(level => (
              <option key={level} value={level}>HSK {level}</option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredLessons.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-12 text-center">
            <BookOpen className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <h3 className="font-medium text-gray-600 mb-1">
              {search || hskFilter !== 'all' ? 'No matching lessons' : 'No lessons yet'}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {search || hskFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Generate your first lesson to get started'}
            </p>
            {!search && hskFilter === 'all' && (
              <Link to="/ai-studio">
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                  Generate Lesson
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Lessons by HSK Level */}
        {!loading && Object.keys(groupedLessons).length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedLessons)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([level, levelLessons]) => (
                <div key={level}>
                  <h2 className="text-sm font-medium text-gray-500 mb-3">
                    HSK {level}
                    <span className="ml-2 text-gray-400">({(levelLessons as Lesson[]).length})</span>
                  </h2>
                  <div className="space-y-2">
                    {(levelLessons as Lesson[])
                      .sort((a: Lesson, b: Lesson) => (a.lessonNumber || 0) - (b.lessonNumber || 0))
                      .map((lesson: Lesson) => (
                        <div
                          key={lesson.id}
                          className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors shadow-sm flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {lesson.lessonNumber && (
                                <span className="text-xs text-gray-400 font-mono">
                                  #{lesson.lessonNumber}
                                </span>
                              )}
                              <h3 className="font-medium text-gray-900 truncate text-sm">
                                {lesson.title}
                              </h3>
                              <span className={`px-1.5 py-0.5 text-xs rounded ${getStatusBadge(lesson).style}`}>
                                {getStatusBadge(lesson).text}
                              </span>
                            </div>
                            {lesson.subtitle && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {lesson.subtitle}
                              </p>
                            )}
                          </div>
                          <Link 
                            to={`/lessons/${lesson.id}/edit`}
                            className="text-gray-400 hover:text-violet-600 transition-colors p-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </AIStudioLayout>
  );
}

export default CurriculumPage;

