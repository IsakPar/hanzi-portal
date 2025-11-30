import { LayoutDashboard, BookOpen, PenTool, BarChart3, Settings, LogOut, BookText, Wand2, Users, Webhook, Database, Shield, Package, Gauge, Sliders, CreditCard } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// Content editing items - available to both admin and user roles
const contentItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/", color: "text-slate-600" },
  { icon: BookOpen, label: "Lessons", href: "/lessons", color: "text-slate-600" },
  { icon: Database, label: "Lesson Cache", href: "/lesson-cache", color: "text-indigo-600" },
  { icon: BookText, label: "Stories", href: "/stories", color: "text-slate-600" },
  { icon: Wand2, label: "AI Prompts", href: "/prompts", color: "text-slate-600" },
  { icon: PenTool, label: "Vocabulary", href: "/vocabulary", color: "text-slate-600" },
  { icon: BarChart3, label: "Analytics", href: "/analytics", color: "text-slate-600" },
];

// Admin-only sidebar items
const adminItems = [
  { icon: Gauge, label: "Control Center", href: "/control-center", color: "text-emerald-600" },
  { icon: CreditCard, label: "Subscriptions", href: "/subscriptions", color: "text-amber-600" },
  { icon: Sliders, label: "Rate Limits", href: "/rate-limits", color: "text-orange-600" },
  { icon: Shield, label: "Users", href: "/users", color: "text-purple-600" },
  { icon: Users, label: "Waitlist", href: "/waitlist", color: "text-slate-600" },
  { icon: Settings, label: "Settings", href: "/settings", color: "text-slate-600" },
  { icon: Package, label: "Export", href: "/export", color: "text-slate-600" },
  { icon: Webhook, label: "Webhooks", href: "/webhooks", color: "text-slate-600" },
];

export function Sidebar() {
  const { user, signOut, isLoading } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <aside className="h-screen bg-white border-r border-gray-200 flex flex-col sticky top-0 w-72">
      {/* Logo Section */}
      <div className="h-20 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">汉</span>
          </div>
          <div>
            <div className="font-bold text-lg text-gray-900">
              HanziMaster
            </div>
            <div className="text-xs text-gray-500">Content Portal</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {contentItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => cn(
              "group flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150",
              "hover:bg-slate-50",
              isActive 
                ? "bg-slate-900 text-white" 
                : "text-gray-700 hover:text-gray-900"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  size={20} 
                  className={cn(
                    "transition-colors",
                    isActive ? "text-white" : item.color
                  )} 
                />
                <span className="font-medium text-sm">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="pt-4 mt-4 border-t border-gray-200">
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Admin
              </div>
            </div>
            {adminItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) => cn(
                  "group flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150",
                  "hover:bg-slate-50",
                  isActive 
                    ? "bg-slate-900 text-white" 
                    : "text-gray-700 hover:text-gray-900"
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon 
                      size={20} 
                      className={cn(
                        "transition-colors",
                        isActive ? "text-white" : item.color
                      )} 
                    />
                    <span className="font-medium text-sm">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        {!isLoading && user ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
              {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {user.name || user.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                {user.email}
                {user.role === 'admin' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 ml-1">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-300"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-300 rounded w-3/4"></div>
              <div className="h-2 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        )}

        <button 
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors group"
        >
          <LogOut size={18} className="transition-transform duration-200 group-hover:-translate-x-1" />
          <span className="font-medium text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
