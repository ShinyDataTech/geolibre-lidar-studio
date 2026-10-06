import React from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { LidarCanvas3D } from "../viewer/LidarCanvas3D";
import { DropZoneOverlay } from "../viewer/DropZoneOverlay";
import { usePointStore } from "../../lib/store/usePointStore";
import { AlertCircle, X } from "lucide-react";

export const MainLayout: React.FC = () => {
  const error = usePointStore((s) => s.error);
  const setError = usePointStore((s) => s.setError);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-studio-950">
      <Header />

      {/* Global Error Banner */}
      {error && (
        <div className="bg-rose-950/80 border-b border-rose-800/80 px-4 py-2 flex items-center justify-between text-xs text-rose-200 z-50 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-0.5 hover:bg-rose-900 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Workspace Area: Sidebar + 3D Viewport */}
      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar />
        <main className="flex-1 relative h-full overflow-hidden">
          <LidarCanvas3D />
          <DropZoneOverlay />
        </main>
      </div>
    </div>
  );
};
