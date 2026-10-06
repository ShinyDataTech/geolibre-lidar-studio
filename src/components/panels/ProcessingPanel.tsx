import React, { useState } from "react";
import { Cpu, Play, CheckCircle2, AlertCircle, Terminal, RefreshCw, Download, Layers } from "lucide-react";
import { LIDAR_TOOL_REGISTRY, type LidarToolDef } from "../../lib/wasm/lidar-tool-registry";
import { executeWhiteboxTool } from "../../lib/wasm/wasm-client";
import { writeLas, readLasClassifications } from "../../lib/parsers/las-writer";
import { usePointStore } from "../../lib/store/usePointStore";
import { useProcessingStore } from "../../lib/store/useProcessingStore";
import { useSymbologyStore } from "../../lib/store/useSymbologyStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

export const ProcessingPanel: React.FC = () => {
  const layers = usePointStore((s) => s.layers);
  const activeLayerId = usePointStore((s) => s.activeLayerId);
  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const updateActiveLayerCloud = usePointStore((s) => s.updateActiveLayerCloud);
  const setColorMode = useSymbologyStore((s) => s.setColorMode);

  const {
    activeToolId,
    toolParams,
    isProcessing,
    statusMessage,
    setActiveToolId,
    setToolParam,
    setProcessing,
    addHistoryEntry,
  } = useProcessingStore();

  const [stdoutLogs, setStdoutLogs] = useState<string[]>([]);
  const [lastOutputDownload, setLastOutputDownload] = useState<{
    filename: string;
    url: string;
    sizeKb: number;
  } | null>(null);

  const currentTool: LidarToolDef = LIDAR_TOOL_REGISTRY[activeToolId] || LIDAR_TOOL_REGISTRY.improved_ground_point_filter;

  const handleRunTool = async () => {
    if (!activeLayer) return;

    try {
      setProcessing(true, `Executing ${currentTool.name}...`);
      setStdoutLogs([`[Init] Serializing point cloud (${activeLayer.cloud.pointCount.toLocaleString()} points) to LAS...`]);

      // 1. Serialize active point cloud to LAS 1.2 binary buffer
      const inputLasBytes = activeLayer.cloud.sourceBytes || writeLas({
        positions: activeLayer.cloud.positions,
        coordinateOrigin: activeLayer.cloud.coordinateOrigin,
        pointCount: activeLayer.cloud.pointCount,
        classifications: activeLayer.cloud.classifications,
        intensities: activeLayer.cloud.intensities,
      });

      const inFileName = `input.${currentTool.inputExt}`;
      const outFileName = `output.${currentTool.outputExt}`;

      const args = currentTool.buildArgs(inFileName, outFileName, toolParams);
      setStdoutLogs((prev) => [...prev, `[WASM] Starting background worker with parameters:`, JSON.stringify(args, null, 2)]);

      // 2. Run Whitebox WASM tool
      const res = await executeWhiteboxTool({
        tool: currentTool.id,
        args,
        inputFiles: {
          [inFileName]: inputLasBytes,
        },
      });

      setStdoutLogs((prev) => [
        ...prev,
        ...res.stdout,
        `[Done] Finished in ${(res.durationMs / 1000).toFixed(2)}s (exit code: ${res.exitCode})`,
      ]);

      const outBasename = outFileName.replace(/^\/work\//, "");
      const outBytes = res.files[outBasename] || res.files[outFileName] || Object.values(res.files)[0];

      if (res.success && outBytes) {
        // Create download blob URL
        const blob = new Blob([outBytes as any], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        setLastOutputDownload({
          filename: `${activeLayer.name.replace(/\.[^/.]+$/, "")}_${currentTool.id}.${currentTool.outputExt}`,
          url,
          sizeKb: Math.round(outBytes.byteLength / 1024),
        });

        // 3. For LAS outputs, extract classifications and update layer in-place
        if (currentTool.outputExt === "las") {
          try {
            const updatedClasses = readLasClassifications(outBytes);
            const classCounts: Record<number, number> = {};
            for (let i = 0; i < updatedClasses.length; i++) {
              const c = updatedClasses[i];
              classCounts[c] = (classCounts[c] || 0) + 1;
            }

            updateActiveLayerCloud((prev) => ({
              ...prev,
              classifications: updatedClasses,
              classCounts,
              sourceBytes: outBytes,
            }));

            // Automatically switch to classification view to show the results
            setColorMode("classification");

            setStdoutLogs((prev) => [
              ...prev,
              `[Update] Successfully updated ${updatedClasses.length.toLocaleString()} point classifications on deck.gl canvas!`,
            ]);
          } catch (e) {
            console.warn("Could not read back classes directly:", e);
          }
        }

        addHistoryEntry({
          id: `run-${Date.now()}`,
          toolId: currentTool.id,
          toolName: currentTool.name,
          timestamp: new Date().toLocaleTimeString(),
          durationMs: res.durationMs,
          success: true,
          message: `Generated ${outFileName} successfully (${Math.round(outBytes.byteLength / 1024)} KB).`,
        });
      } else {
        throw new Error(res.stdout.join("\n") || `Tool exited with code ${res.exitCode}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStdoutLogs((prev) => [...prev, `[Error] ${msg}`]);
      addHistoryEntry({
        id: `run-${Date.now()}`,
        toolId: currentTool.id,
        toolName: currentTool.name,
        timestamp: new Date().toLocaleTimeString(),
        durationMs: 0,
        success: false,
        message: msg,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tool Selection */}
      <Card title="Whitebox LiDAR Toolbox" action={<Cpu className="w-3.5 h-3.5 text-cyan-400" />}>
        <div className="space-y-2">
          <label className="text-xs text-slate-400 block font-medium">Select Algorithm</label>
          <select
            value={activeToolId}
            onChange={(e) => {
              setActiveToolId(e.target.value);
              setLastOutputDownload(null);
            }}
            className="w-full bg-slate-900 border border-slate-750 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-cyan-500 font-medium"
          >
            {Object.values(LIDAR_TOOL_REGISTRY).map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.categoryLabel}: {tool.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 leading-normal pt-1">{currentTool.description}</p>
        </div>
      </Card>

      {/* Tool Parameters */}
      <Card title="Parameters & Configuration">
        <div className="space-y-3">
          {currentTool.params.map((param) => {
            const currentValue = toolParams[param.name] ?? param.default;

            if (param.type === "number") {
              return (
                <div key={param.name} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{param.label}</span>
                    <span className="font-mono text-cyan-400">{String(currentValue)}</span>
                  </div>
                  <input
                    type="number"
                    value={Number(currentValue)}
                    onChange={(e) => setToolParam(param.name, parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-cyan-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500">{param.description}</p>
                </div>
              );
            }

            if (param.type === "boolean") {
              return (
                <label key={param.name} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={Boolean(currentValue)}
                    onChange={(e) => setToolParam(param.name, e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500 w-3.5 h-3.5"
                  />
                  <span>{param.label}</span>
                </label>
              );
            }

            if (param.type === "select" && param.options) {
              return (
                <div key={param.name} className="space-y-1">
                  <label className="text-xs text-slate-400 block font-medium">{param.label}</label>
                  <select
                    value={String(currentValue)}
                    onChange={(e) => setToolParam(param.name, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5"
                  >
                    {param.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            return null;
          })}

          <Button
            variant="primary"
            onClick={handleRunTool}
            disabled={!activeLayer || isProcessing}
            icon={isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
            className="w-full mt-3 py-2 text-xs font-bold"
          >
            {isProcessing ? statusMessage : "Run In-Browser (WASM)"}
          </Button>

          {/* Download Output File when complete */}
          {lastOutputDownload && (
            <a
              href={lastOutputDownload.url}
              download={lastOutputDownload.filename}
              className="inline-flex items-center justify-center w-full py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-colors gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Download {lastOutputDownload.filename} ({lastOutputDownload.sizeKb} KB)
            </a>
          )}
        </div>
      </Card>

      {/* Terminal Output */}
      {stdoutLogs.length > 0 && (
        <Card title="Execution Console" action={<Terminal className="w-3.5 h-3.5 text-slate-400" />}>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 font-mono text-[11px] text-slate-300 max-h-44 overflow-y-auto space-y-1 select-text">
            {stdoutLogs.map((log, idx) => (
              <div key={idx} className="whitespace-pre-wrap leading-tight">
                {log}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
