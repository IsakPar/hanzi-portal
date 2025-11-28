import { Search, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAIAssistant } from "@/contexts/AIAssistantContext";

/**
 * Get user initials from name or email
 */
function getUserInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  // Fallback to email
  return email.slice(0, 2).toUpperCase();
}

export function Header() {
  const { user } = useAuth();
  const { togglePanel, isOpen } = useAIAssistant();
  
  const initials = getUserInitials(user?.name, user?.email || 'U');

  return (
    <header className="h-16 border-b border-purple-100/50 bg-white/80 backdrop-blur-xl sticky top-0 z-10 px-8 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1 max-w-2xl">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search lessons, vocabulary, or anything..."
            className="w-full bg-gray-50 pl-12 pr-4 h-12 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white text-sm transition-all"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* AI Assistant Button */}
        <button 
          onClick={togglePanel}
          className={`relative p-2.5 rounded-xl transition-all hover:scale-105 group ${
            isOpen 
              ? 'bg-gradient-to-r from-violet-500 to-purple-600 shadow-lg shadow-purple-500/30' 
              : 'hover:bg-purple-50'
          }`}
          title="AI Assistant"
        >
          <Sparkles 
            size={20} 
            className={`transition-colors ${
              isOpen 
                ? 'text-white' 
                : 'text-gray-600 group-hover:text-purple-600'
            }`} 
          />
          {/* Pulse indicator when active */}
          {isOpen && (
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-purple-500"></span>
            </span>
          )}
        </button>
        
        {/* User Avatar with Initials */}
        <div 
          className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/30 hover:scale-105 transition-transform cursor-pointer"
          title={user?.email || 'User'}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
