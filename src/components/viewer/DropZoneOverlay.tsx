import React, { useState } from "react";
import { UploadCloud, FileBox, Sparkles } from "lucide-react";
import { usePointStore } from "../../lib/store/usePointStore";
import { parseLidarFile } from "../../lib/parsers/las-loader";
import { Button } from "../ui/Button";

export const DropZoneOverlay: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const addLayer = usePointStore((s) => s.addLayer);
  const loadDemoTile = usePointStore((s) => s.loadDemoTile);
  const setLoading = usePointStore((s) => s.setLoading);
  const setError = usePointStore((s) => s.setError);
  const layers = usePointStore((s) => s.layers);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext !== "las" && ext !== "laz") {
      setError("Please drop a valid .las or .laz point cloud file.");
      return;
    }

    try {
      setLoading(true, `Parsing ${file.name}...`);
      const cloud = await parseLidarFile(file);
      addLayer(cloud);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse point cloud file.");
    } finally {
      setLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // If no layers loaded yet, show the full welcoming ingest screen
  if (layers.length === 0) {
    return (
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-8 transition-colors ${
          isDragging ? "bg-cyan-950/40 border-2 border-dashed border-cyan-400" : "bg-studio-950/85 backdrop-blur-sm"
        }`}
      >
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Import LiDAR Point Cloud</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drag & drop any <span className="text-cyan-400 font-mono">.las</span> or{" "}
              <span className="text-cyan-400 font-mono">.laz</span> file to inspect in high-performance 3D deck.gl.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".las,.laz"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <span className="w-full inline-flex items-center justify-center py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-lg shadow-cyan-950/40">
                <FileBox className="w-4 h-4 mr-2" />
                Browse Local File
              </span>
            </label>

            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                or
              </span>
            </div>

            <Button
              variant="secondary"
              onClick={loadDemoTile}
              icon={<Sparkles className="w-4 h-4 text-emerald-400" />}
              className="w-full py-2.5 rounded-xl border-slate-750"
            >
              Load Realistic 3D Sample (Autzen Tile)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If layers are already loaded, display subtle drag overlay when dragging
  if (isDragging) {
    return (
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="absolute inset-0 z-40 bg-cyan-950/60 backdrop-blur-sm border-2 border-dashed border-cyan-400 flex items-center justify-center"
      >
        <div className="bg-slate-900/90 px-6 py-4 rounded-xl border border-cyan-500/50 flex items-center gap-3 text-cyan-300">
          <UploadCloud className="w-6 h-6 animate-bounce" />
          <span className="text-sm font-semibold">Drop .las / .laz to add layer</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={onDragOver}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ pointerEvents: isDragging ? "auto" : "none" }}
    />
  );
};
