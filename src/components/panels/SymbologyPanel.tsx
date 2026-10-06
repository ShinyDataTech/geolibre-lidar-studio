import React from "react";
import { Sliders, Palette, Layers, Eye, EyeOff } from "lucide-react";
import { useSymbologyStore } from "../../lib/store/useSymbologyStore";
import { usePointStore } from "../../lib/store/usePointStore";
import { COLOR_RAMPS } from "../../lib/color/color-ramps";
import { ASPRS_STANDARD_CLASSES, getAsprsClassColor, getAsprsClassLabel } from "../../lib/color/asprs-classes";
import { Slider } from "../ui/Slider";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

export const SymbologyPanel: React.FC = () => {
  const {
    colorMode,
    colorRamp,
    pointSize,
    intensityContrast,
    hiddenClasses,
    setColorMode,
    setColorRamp,
    setPointSize,
    setIntensityContrast,
    toggleClassificationVisibility,
    showAllClasses,
  } = useSymbologyStore();

  const layers = usePointStore((s) => s.layers);
  const activeLayerId = usePointStore((s) => s.activeLayerId);
  const activeLayer = layers.find((l) => l.id === activeLayerId);

  return (
    <div className="space-y-4">
      {/* Color Mode Selector */}
      <Card title="Color Mode" action={<Palette className="w-3.5 h-3.5 text-cyan-400" />}>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "elevation", label: "Elevation (Z)" },
            { id: "intensity", label: "Intensity" },
            { id: "classification", label: "Classification" },
            { id: "rgb", label: "True RGB", disabled: !activeLayer?.cloud.colors },
          ].map((mode) => (
            <button
              key={mode.id}
              disabled={mode.disabled}
              onClick={() => setColorMode(mode.id as any)}
              className={`px-3 py-2 text-xs font-medium rounded-lg text-left transition-all border ${
                colorMode === mode.id
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm"
                  : "bg-slate-800/60 border-slate-750 text-slate-300 hover:border-slate-600"
              } ${mode.disabled ? "opacity-35 cursor-not-allowed" : ""}`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Mode-specific settings */}
      {colorMode === "elevation" && (
        <Card title="Color Ramp">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {Object.values(COLOR_RAMPS).map((ramp) => (
                <button
                  key={ramp.id}
                  onClick={() => setColorRamp(ramp.id)}
                  className={`flex flex-col gap-1.5 p-2 rounded-lg border text-left text-xs transition-colors ${
                    colorRamp === ramp.id
                      ? "bg-slate-800 border-cyan-400 text-white"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="font-medium">{ramp.name}</span>
                  <div
                    className="h-2 w-full rounded"
                    style={{
                      background: `linear-gradient(to right, ${ramp.stops
                        .map((s) => `rgb(${s.join(",")})`)
                        .join(",")})`,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {colorMode === "intensity" && (
        <Card title="Intensity Contrast">
          <Slider
            label="Contrast Gamma"
            value={intensityContrast}
            min={0.2}
            max={2.5}
            step={0.1}
            onChange={setIntensityContrast}
          />
        </Card>
      )}

      {colorMode === "classification" && activeLayer && (
        <Card
          title="ASPRS Classes"
          action={
            <button
              onClick={showAllClasses}
              className="text-[10px] text-cyan-400 hover:underline uppercase"
            >
              Show All
            </button>
          }
        >
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {Object.entries(activeLayer.cloud.classCounts).map(([clsStr, count]) => {
              const cls = parseInt(clsStr, 10);
              const color = getAsprsClassColor(cls);
              const label = getAsprsClassLabel(cls);
              const isHidden = hiddenClasses.has(cls);

              return (
                <div
                  key={cls}
                  onClick={() => toggleClassificationVisibility(cls)}
                  className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                    isHidden ? "opacity-40 bg-slate-900/40" : "bg-slate-850/80 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-black/30"
                      style={{ backgroundColor: `rgb(${color.join(",")})` }}
                    />
                    <span className="text-slate-200 truncate">{label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] text-slate-400">
                      {count.toLocaleString()}
                    </span>
                    {isHidden ? (
                      <EyeOff className="w-3 h-3 text-slate-500" />
                    ) : (
                      <Eye className="w-3 h-3 text-cyan-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Geometry & Point Size */}
      <Card title="Point Rendering" action={<Sliders className="w-3.5 h-3.5 text-cyan-400" />}>
        <Slider
          label="Point Size"
          value={pointSize}
          min={0.5}
          max={10.0}
          step={0.5}
          unit=" px"
          onChange={setPointSize}
        />
      </Card>
    </div>
  );
};
