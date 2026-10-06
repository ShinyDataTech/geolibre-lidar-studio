import React from "react";
import { Box, Sparkles, Download, RefreshCw } from "lucide-react";
import { usePointStore } from "../../lib/store/usePointStore";
import { writeLas } from "../../lib/parsers/las-writer";
import { Button } from "../ui/Button";

export const Header: React.FC = () => {
  const layers = usePointStore((s) => s.layers);
  const activeLayerId = usePointStore((s) => s.activeLayerId);
  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const loadDemoTile = usePointStore((s) => s.loadDemoTile);
  const isLoading = usePointStore((s) => s.isLoading);
  const loadingProgress = usePointStore((s) => s.loadingProgress);

  const handleExportLas = () => {
    if (!activeLayer) return;
    const bytes = activeLayer.cloud.sourceBytes || writeLas({
      positions: activeLayer.cloud.positions,
      coordinateOrigin: activeLayer.cloud.coordinateOrigin,
      pointCount: activeLayer.cloud.pointCount,
      classifications: activeLayer.cloud.classifications,
      intensities: activeLayer.cloud.intensities,
    });

    const blob = new Blob([bytes as any], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeLayer.name.endsWith(".las") ? activeLayer.name : `${activeLayer.name}.las`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="h-12 border-b border-slate-800/80 bg-studio-900/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-cyan-950/40">
          <Box className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
            GeoLibre <span className="text-cyan-400 font-normal">LiDAR 3D Studio</span>
          </h1>
        </div>
      </div>

      {/* Center status info */}
      <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
        {isLoading && (
          <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{loadingProgress || "Loading point cloud..."}</span>
          </div>
        )}
        {!isLoading && activeLayer && (
          <div className="flex items-center gap-4 bg-slate-850 px-3 py-1 rounded-full border border-slate-750">
            <span className="text-slate-300 font-medium">{activeLayer.name}</span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-400">{activeLayer.cloud.pointCount.toLocaleString()} pts</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {activeLayer && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportLas}
            icon={<Download className="w-3.5 h-3.5 text-cyan-400" />}
            title="Download active point cloud as LAS 1.2"
          >
            Export .LAS
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={loadDemoTile}
          icon={<Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
        >
          Load 3D Sample
        </Button>
      </div>
    </header>
  );
};
