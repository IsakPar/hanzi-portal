/**
 * AI Studio Layout
 * 
 * Clean, light-themed layout for the AI Lesson Generation Studio.
 */

import { Link, useLocation } from 'react-router-dom';
import { 
  Sparkles, 
  FileText, 
  BookOpen, 
  BarChart3,
  ArrowLeft,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIStudioLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/ai-studio', label: 'Generate', icon: Sparkles, exact: true },
  { path: '/ai-studio/enhance', label: 'Enhance', icon: Wand2 },
  { path: '/ai-studio/drafts', label: 'Drafts', icon: FileText },
  { path: '/ai-studio/curriculum', label: 'My Lessons', icon: BookOpen },
  { path: '/ai-studio/stats', label: 'Stats', icon: BarChart3 },
];

export function AIStudioLayout({ children }: AIStudioLayoutProps) {
  const location = useLocation();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">AI Studio</h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-sm",
                      active 
                        ? "bg-violet-50 text-violet-700 font-medium" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Back to Portal */}
        <div className="p-2 border-t border-gray-100">
          <Link
            to="/lessons"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portal
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

export default AIStudioLayout;

