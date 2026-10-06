import React from "react";
import { Eye, EyeOff, Trash2, Layers, CheckCircle2 } from "lucide-react";
import { usePointStore } from "../../lib/store/usePointStore";
import { Card } from "../ui/Card";
import { Slider } from "../ui/Slider";
import { Badge } from "../ui/Badge";

export const LayerManagerPanel: React.FC = () => {
  const {
    layers,
    activeLayerId,
    setActiveLayer,
    toggleLayerVisibility,
    setLayerOpacity,
    removeLayer,
  } = usePointStore();

  if (layers.length === 0) {
    return (
      <div className="text-center p-6 bg-slate-900/40 rounded-xl border border-slate-800">
        <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-xs text-slate-400">No point cloud layers loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {layers.map((layer) => {
        const isActive = layer.id === activeLayerId;

        return (
          <Card
            key={layer.id}
            className={`transition-all ${
              isActive ? "border-cyan-500/50 bg-slate-850/90" : "hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                onClick={() => setActiveLayer(layer.id)}
              >
                {isActive ? (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                )}
                <span className="text-xs font-semibold text-white truncate">{layer.name}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  onClick={() => toggleLayerVisibility(layer.id)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                  title={layer.visible ? "Hide layer" : "Show layer"}
                >
                  {layer.visible ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                </button>
                <button
                  onClick={() => removeLayer(layer.id)}
                  className="p-1 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded"
                  title="Remove layer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-mono">
              <span>{layer.cloud.pointCount.toLocaleString()} pts</span>
              <span>
                Z: {Math.round(layer.cloud.bounds.minZ)}m to {Math.round(layer.cloud.bounds.maxZ)}m
              </span>
            </div>

            <Slider
              label="Opacity"
              value={layer.opacity}
              min={0.1}
              max={1.0}
              step={0.05}
              onChange={(val) => setLayerOpacity(layer.id, val)}
            />
          </Card>
        );
      })}
    </div>
  );
};
