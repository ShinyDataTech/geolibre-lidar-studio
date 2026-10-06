import React, { useState } from "react";
import { Layers, Palette, Cpu, Sparkles } from "lucide-react";
import { LayerManagerPanel } from "../panels/LayerManagerPanel";
import { SymbologyPanel } from "../panels/SymbologyPanel";
import { ProcessingPanel } from "../panels/ProcessingPanel";
import { AiExtractionPanel } from "../panels/AiExtractionPanel";

type TabId = "layers" | "symbology" | "processing" | "ai";

export const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("symbology");

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "symbology", label: "Symbology", icon: <Palette className="w-4 h-4" /> },
    { id: "processing", label: "Whitebox", icon: <Cpu className="w-4 h-4" /> },
    { id: "ai", label: "AI Studio", icon: <Sparkles className="w-4 h-4 text-emerald-400" /> },
    { id: "layers", label: "Layers", icon: <Layers className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-80 h-full bg-studio-900/95 border-r border-slate-800/80 flex flex-col shrink-0 z-20">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800/80 bg-studio-950/60 p-1 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[11px] font-medium transition-all ${
              activeTab === tab.id
                ? "bg-slate-800 text-cyan-300 shadow-sm border border-slate-700/80"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/60"
            }`}
          >
            <span className="mb-1">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content Panel */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {activeTab === "symbology" && <SymbologyPanel />}
        {activeTab === "processing" && <ProcessingPanel />}
        {activeTab === "ai" && <AiExtractionPanel />}
        {activeTab === "layers" && <LayerManagerPanel />}
      </div>
    </aside>
  );
};
