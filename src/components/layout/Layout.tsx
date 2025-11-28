import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AIPanel } from "@/components/ai/AIPanel";

export function Layout() {
  return (
    <div className="flex min-h-screen bg-background font-sans antialiased">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
      
      {/* Floating AI Assistant Panel */}
      <AIPanel />
    </div>
  );
}

