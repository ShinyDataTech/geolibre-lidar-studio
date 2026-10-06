import React, { useState } from "react";
import {
  Sparkles,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Download,
  GitBranch,
  ArrowDown,
  Layers,
} from "lucide-react";
import { planAiLidarPipeline, AI_PROMPT_PRESETS } from "../../lib/ai/pipeline-planner";
import { executeWhiteboxTool } from "../../lib/wasm/wasm-client";
import { LIDAR_TOOL_REGISTRY } from "../../lib/wasm/lidar-tool-registry";
import { writeLas, readLasClassifications } from "../../lib/parsers/las-writer";
import { usePointStore } from "../../lib/store/usePointStore";
import { useProcessingStore } from "../../lib/store/useProcessingStore";
import { useSymbologyStore } from "../../lib/store/useSymbologyStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

export const AiExtractionPanel: React.FC = () => {
  const {
    aiPrompt,
    currentPipeline,
    setAiPrompt,
    setPipeline,
    updatePipelineStep,
  } = useProcessingStore();

  const layers = usePointStore((s) => s.layers);
  const activeLayerId = usePointStore((s) => s.activeLayerId);
  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const updateActiveLayerCloud = usePointStore((s) => s.updateActiveLayerCloud);
  const setColorMode = useSymbologyStore((s) => s.setColorMode);

  const [isRunning, setIsRunning] = useState(false);
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const [pipelineResultUrl, setPipelineResultUrl] = useState<{
    url: string;
    filename: string;
  } | null>(null);

  const handleGeneratePlan = () => {
    const steps = planAiLidarPipeline(aiPrompt);
    setPipeline(steps);
    setPipelineLogs([`[AI Planner] Generated ${steps.length}-stage pipeline DAG for: "${aiPrompt}"`]);
    setPipelineResultUrl(null);
  };

  const handleExecutePipeline = async () => {
    if (!activeLayer || currentPipeline.length === 0) return;

    setIsRunning(true);
    setPipelineResultUrl(null);
    let workingBytes = activeLayer.cloud.sourceBytes || writeLas({
      positions: activeLayer.cloud.positions,
      coordinateOrigin: activeLayer.cloud.coordinateOrigin,
      pointCount: activeLayer.cloud.pointCount,
      classifications: activeLayer.cloud.classifications,
      intensities: activeLayer.cloud.intensities,
    });

    try {
      for (let i = 0; i < currentPipeline.length; i++) {
        const step = currentPipeline[i];
        updatePipelineStep(step.id, { status: "running" });
        setPipelineLogs((prev) => [
          ...prev,
          `[Stage ${i + 1}/${currentPipeline.length}] Starting ${step.toolName}...`,
        ]);

        const toolDef = LIDAR_TOOL_REGISTRY[step.toolId];
        const inName = `stage_${i}.${toolDef.inputExt}`;
        const outName = `stage_${i + 1}.${toolDef.outputExt}`;
        const args = toolDef.buildArgs(inName, outName, step.params);

        const res = await executeWhiteboxTool({
          tool: step.toolId,
          args,
          inputFiles: { [inName]: workingBytes },
        });

        const outBasename = outName.replace(/^\/work\//, "");
        const outBytes = res.files[outBasename] || res.files[outName] || Object.values(res.files)[0];

        if (!res.success || !outBytes) {
          updatePipelineStep(step.id, { status: "failed" });
          throw new Error(`Failed at ${step.toolName}: ${res.stdout.join(" ")}`);
        }

        workingBytes = outBytes;
        updatePipelineStep(step.id, { status: "completed" });
        setPipelineLogs((prev) => [
          ...prev,
          `✓ Completed ${step.toolName} in ${(res.durationMs / 1000).toFixed(2)}s`,
        ]);

        // If stage produced LAS, immediately re-render classification in deck.gl
        if (toolDef.outputExt === "las") {
          try {
            const classes = readLasClassifications(workingBytes);
            const classCounts: Record<number, number> = {};
            for (let j = 0; j < classes.length; j++) {
              classCounts[classes[j]] = (classCounts[classes[j]] || 0) + 1;
            }
            updateActiveLayerCloud((prev) => ({
              ...prev,
              classifications: classes,
              classCounts,
              sourceBytes: workingBytes,
            }));
          } catch (e) {
            console.warn(e);
          }
        }
      }

      setPipelineLogs((prev) => [
        ...prev,
        `[AI Studio] All pipeline stages executed successfully! Features highlighted.`,
      ]);

      // Create download blob for final product
      const blob = new Blob([workingBytes as any], { type: "application/octet-stream" });
      const lastStep = currentPipeline[currentPipeline.length - 1];
      const ext = LIDAR_TOOL_REGISTRY[lastStep.toolId]?.outputExt || "las";
      setPipelineResultUrl({
        url: URL.createObjectURL(blob),
        filename: `${activeLayer.name.replace(/\.[^/.]+$/, "")}_ai_extracted.${ext}`,
      });

      // Automatically switch viewer to classification mode
      setColorMode("classification");
    } catch (err) {
      setPipelineLogs((prev) => [
        ...prev,
        `[AI Pipeline Error] ${err instanceof Error ? err.message : String(err)}`,
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Intent Prompt */}
      <Card title="Natural Language Pipeline Generator" action={<Sparkles className="w-3.5 h-3.5 text-cyan-400" />}>
        <div className="space-y-3">
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={2}
            placeholder="Describe what you want to extract (e.g. Extract building footprints from this point cloud)..."
            className="w-full bg-slate-900 border border-slate-750 text-slate-100 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-cyan-500 placeholder-slate-500 resize-none font-sans"
          />

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Example Presets:</span>
            <div className="flex flex-col gap-1.5">
              {AI_PROMPT_PRESETS.map((preset) => (
                <button
                  key={preset.title}
                  onClick={() => {
                    setAiPrompt(preset.prompt);
                    const steps = planAiLidarPipeline(preset.prompt);
                    setPipeline(steps);
                    setPipelineLogs([`[Preset Loaded] Translated to ${steps.length}-stage pipeline.`]);
                    setPipelineResultUrl(null);
                  }}
                  className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 rounded-lg text-left text-xs transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-semibold text-slate-200 group-hover:text-cyan-300">
                      {preset.title}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      {preset.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={handleGeneratePlan}
            className="w-full py-2 text-xs font-semibold"
          >
            Translate Prompt into Pipeline DAG
          </Button>
        </div>
      </Card>

      {/* Visual Pipeline DAG */}
      {currentPipeline.length > 0 && (
        <Card title="Automated Pipeline DAG" action={<GitBranch className="w-3.5 h-3.5 text-cyan-400" />}>
          <div className="space-y-2 relative">
            {currentPipeline.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div
                  className={`p-2.5 rounded-lg border transition-all text-xs flex items-center justify-between ${
                    step.status === "running"
                      ? "bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-950/40"
                      : step.status === "completed"
                      ? "bg-emerald-950/20 border-emerald-500/40"
                      : "bg-slate-850 border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${
                        step.status === "completed"
                          ? "bg-emerald-500 text-slate-950 font-bold"
                          : step.status === "running"
                          ? "bg-cyan-500 text-slate-950 font-bold animate-pulse"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-slate-200">{step.toolName}</div>
                      <div className="text-[10px] text-slate-400 truncate">{step.progressMsg}</div>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {step.status === "pending" && <Clock className="w-4 h-4 text-slate-500" />}
                    {step.status === "running" && <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />}
                    {step.status === "completed" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {step.status === "failed" && <AlertCircle className="w-4 h-4 text-rose-400" />}
                  </div>
                </div>

                {idx < currentPipeline.length - 1 && (
                  <div className="flex justify-center my-0.5">
                    <ArrowDown className="w-3 h-3 text-slate-600" />
                  </div>
                )}
              </React.Fragment>
            ))}

            <Button
              variant="accent"
              onClick={handleExecutePipeline}
              disabled={!activeLayer || isRunning}
              icon={isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              className="w-full mt-3 py-2 text-xs font-bold"
            >
              {isRunning ? "Executing Pipeline..." : "Execute Automated AI Pipeline"}
            </Button>

            {pipelineResultUrl && (
              <a
                href={pipelineResultUrl.url}
                download={pipelineResultUrl.filename}
                className="inline-flex items-center justify-center w-full py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-colors gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Download Final AI Result ({pipelineResultUrl.filename})
              </a>
            )}
          </div>
        </Card>
      )}

      {/* Execution Trace Logs */}
      {pipelineLogs.length > 0 && (
        <Card title="Live Execution Trace">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 font-mono text-[10px] text-slate-300 max-h-40 overflow-y-auto space-y-1 select-text">
            {pipelineLogs.map((log, idx) => (
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
