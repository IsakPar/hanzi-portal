import { Search } from 'lucide-react';

interface StoriesFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  hskFilter: number | undefined;
  setHskFilter: (value: number | undefined) => void;
  difficultyFilter: string | undefined;
  setDifficultyFilter: (value: string | undefined) => void;
  onSearch: () => void;
}

export function StoriesFilters({
  searchQuery,
  setSearchQuery,
  hskFilter,
  setHskFilter,
  difficultyFilter,
  setDifficultyFilter,
  onSearch,
}: StoriesFiltersProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search stories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
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
              HSK {level}{level > 6 ? ' (HSK 3.0)' : ''}
            </option>
          ))}
        </select>
        <select
          value={difficultyFilter || ""}
          onChange={(e) => setDifficultyFilter(e.target.value || undefined)}
          className="px-4 h-11 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-300"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button
          onClick={onSearch}
          className="px-6 h-11 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          Search
        </button>
      </div>
    </div>
  );
}

