import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Deck, OrbitView, COORDINATE_SYSTEM } from "@deck.gl/core";
import { PointCloudLayer } from "@deck.gl/layers";
import { usePointStore } from "../../lib/store/usePointStore";
import { useSymbologyStore } from "../../lib/store/useSymbologyStore";
import { COLOR_RAMPS, sampleColorRamp } from "../../lib/color/color-ramps";
import { getAsprsClassColor, getAsprsClassLabel } from "../../lib/color/asprs-classes";

interface HoverInfo {
  x: number;
  y: number;
  coordinate?: [number, number, number];
  index?: number;
  elevation?: number;
  intensity?: number;
  classification?: number;
}

export const LidarCanvas3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const deckRef = useRef<Deck<any> | null>(null);

  const layers = usePointStore((s) => s.layers);
  const activeLayerId = usePointStore((s) => s.activeLayerId);
  const activeLayer = layers.find((l) => l.id === activeLayerId);

  const {
    colorMode,
    colorRamp,
    pointSize,
    minElevationCustom,
    maxElevationCustom,
    intensityContrast,
    hiddenClasses,
  } = useSymbologyStore();

  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  // Initial OrbitView state
  const [viewState, setViewState] = useState({
    target: [0, 0, 0] as [number, number, number],
    rotationX: 35,
    rotationOrbit: -30,
    zoom: 1.0,
    minZoom: -5,
    maxZoom: 15,
  });

  // Calculate elevation range
  const { minZ, maxZ } = useMemo(() => {
    if (!activeLayer) return { minZ: 0, maxZ: 100 };
    const b = activeLayer.cloud.bounds;
    return {
      minZ: minElevationCustom !== null ? minElevationCustom : b.minZ,
      maxZ: maxElevationCustom !== null ? maxElevationCustom : b.maxZ,
    };
  }, [activeLayer, minElevationCustom, maxElevationCustom]);

  // Generate color buffer based on active symbology mode
  const colorBuffer = useMemo(() => {
    if (!activeLayer) return null;
    const cloud = activeLayer.cloud;
    const count = cloud.pointCount;
    const colors = new Uint8Array(count * 4);

    const positions = cloud.positions;
    const origin = cloud.coordinateOrigin;
    const intensities = cloud.intensities;
    const classifications = cloud.classifications;
    const ramp = COLOR_RAMPS[colorRamp] || COLOR_RAMPS.turbo;

    const zRange = Math.max(0.001, maxZ - minZ);

    for (let i = 0; i < count; i++) {
      const cls = classifications ? classifications[i] : 1;

      // Check if class is filtered out
      if (hiddenClasses.has(cls)) {
        colors[i * 4 + 3] = 0; // invisible
        continue;
      }

      if (colorMode === "elevation") {
        const worldZ = origin[2] + positions[i * 3 + 2];
        const t = (worldZ - minZ) / zRange;
        const [r, g, b, a] = sampleColorRamp(ramp, t);
        colors[i * 4] = r;
        colors[i * 4 + 1] = g;
        colors[i * 4 + 2] = b;
        colors[i * 4 + 3] = a;
      } else if (colorMode === "intensity" && intensities) {
        const rawI = intensities[i];
        const stretched = Math.min(1.0, Math.pow(rawI, 1 / Math.max(0.1, intensityContrast)));
        const val = Math.round(stretched * 255);
        colors[i * 4] = val;
        colors[i * 4 + 1] = val;
        colors[i * 4 + 2] = val;
        colors[i * 4 + 3] = 255;
      } else if (colorMode === "classification") {
        const [r, g, b] = getAsprsClassColor(cls);
        colors[i * 4] = r;
        colors[i * 4 + 1] = g;
        colors[i * 4 + 2] = b;
        colors[i * 4 + 3] = 255;
      } else if (colorMode === "rgb" && cloud.colors) {
        colors[i * 4] = cloud.colors[i * 4];
        colors[i * 4 + 1] = cloud.colors[i * 4 + 1];
        colors[i * 4 + 2] = cloud.colors[i * 4 + 2];
        colors[i * 4 + 3] = cloud.colors[i * 4 + 3];
      } else {
        // Fallback to elevation
        const worldZ = origin[2] + positions[i * 3 + 2];
        const t = (worldZ - minZ) / zRange;
        const [r, g, b, a] = sampleColorRamp(ramp, t);
        colors[i * 4] = r;
        colors[i * 4 + 1] = g;
        colors[i * 4 + 2] = b;
        colors[i * 4 + 3] = a;
      }
    }

    return colors;
  }, [activeLayer, colorMode, colorRamp, minZ, maxZ, intensityContrast, hiddenClasses]);

  // Construct deck.gl PointCloudLayer
  const deckLayers = useMemo(() => {
    if (!activeLayer || !colorBuffer) return [];

    const cloud = activeLayer.cloud;

    return [
      new PointCloudLayer({
        id: `point-cloud-${activeLayer.id}`,
        data: {
          length: cloud.pointCount,
          attributes: {
            getPosition: { value: cloud.positions, size: 3 },
            getColor: { value: colorBuffer, size: 4 },
          },
        },
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        pointSize,
        sizeUnits: "pixels",
        opacity: activeLayer.opacity,
        visible: activeLayer.visible,
        pickable: true,
        onHover: (info) => {
          if (info.index !== undefined && info.index >= 0) {
            const idx = info.index;
            const worldZ = cloud.coordinateOrigin[2] + cloud.positions[idx * 3 + 2];
            setHoverInfo({
              x: info.x,
              y: info.y,
              index: idx,
              elevation: Math.round(worldZ * 100) / 100,
              intensity: cloud.intensities ? Math.round(cloud.intensities[idx] * 100) / 100 : undefined,
              classification: cloud.classifications ? cloud.classifications[idx] : undefined,
            });
          } else {
            setHoverInfo(null);
          }
        },
      }),
    ];
  }, [activeLayer, colorBuffer, pointSize]);

  // Initialize and update deck.gl
  useEffect(() => {
    if (!canvasRef.current) return;

    if (!deckRef.current) {
      deckRef.current = new Deck({
        canvas: canvasRef.current,
        views: new OrbitView({
          id: "orbit",
          orbitAxis: "Z",
        }),
        initialViewState: viewState,
        controller: true,
        onViewStateChange: ({ viewState: nextState }) => {
          setViewState(nextState as typeof viewState);
        },
        layers: deckLayers,
      });
    } else {
      deckRef.current.setProps({
        viewState: viewState as any,
        layers: deckLayers,
      });
    }
  }, [deckLayers, viewState]);

  // Clean up deck on unmount
  useEffect(() => {
    return () => {
      deckRef.current?.finalize();
      deckRef.current = null;
    };
  }, []);

  // Quick Camera Preset Functions
  const resetTop = useCallback(() => {
    setViewState((prev) => ({ ...prev, rotationX: 0, rotationOrbit: 0, zoom: 1.2 }));
  }, []);

  const resetFront = useCallback(() => {
    setViewState((prev) => ({ ...prev, rotationX: 90, rotationOrbit: 0, zoom: 1.2 }));
  }, []);

  const resetIso = useCallback(() => {
    setViewState((prev) => ({ ...prev, rotationX: 45, rotationOrbit: -45, zoom: 1.0 }));
  }, []);

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden bg-slate-950">
      <canvas ref={canvasRef} className="w-full h-full block focus:outline-none" />

      {/* Floating Camera Toolbar */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-lg border border-slate-800 shadow-xl z-20">
        <button
          onClick={resetIso}
          className="px-2.5 py-1 text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded font-medium transition-colors"
          title="Isometric 3D View"
        >
          3D Iso
        </button>
        <button
          onClick={resetTop}
          className="px-2.5 py-1 text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded font-medium transition-colors"
          title="Top Down 2D View"
        >
          Top
        </button>
        <button
          onClick={resetFront}
          className="px-2.5 py-1 text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded font-medium transition-colors"
          title="Front Profile View"
        >
          Front
        </button>
      </div>

      {/* Point Tooltip on Hover */}
      {hoverInfo && (
        <div
          className="absolute pointer-events-none z-30 bg-slate-900/90 backdrop-blur-md text-xs border border-cyan-500/40 rounded-lg p-2.5 shadow-2xl text-slate-200 space-y-1 transform -translate-x-1/2 -translate-y-full mb-2"
          style={{ left: hoverInfo.x, top: hoverInfo.y }}
        >
          <div className="font-semibold text-cyan-400 flex items-center gap-1.5">
            <span>Point #{hoverInfo.index}</span>
          </div>
          <div>Elevation: <span className="font-mono text-white">{hoverInfo.elevation} m</span></div>
          {hoverInfo.intensity !== undefined && (
            <div>Intensity: <span className="font-mono text-white">{hoverInfo.intensity}</span></div>
          )}
          {hoverInfo.classification !== undefined && (
            <div>
              Class:{" "}
              <span className="font-mono text-amber-300">
                {hoverInfo.classification} ({getAsprsClassLabel(hoverInfo.classification)})
              </span>
            </div>
          )}
        </div>
      )}

      {/* HUD Info Badge */}
      {activeLayer && (
        <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-center gap-4 z-20">
          <div>
            Points: <span className="font-mono text-white font-medium">{activeLayer.cloud.pointCount.toLocaleString()}</span>
          </div>
          <div>
            Elev: <span className="font-mono text-cyan-400">{Math.round(minZ)}m - {Math.round(maxZ)}m</span>
          </div>
          <div>
            Mode: <span className="font-mono uppercase text-emerald-400">{colorMode}</span>
          </div>
        </div>
      )}
    </div>
  );
};
