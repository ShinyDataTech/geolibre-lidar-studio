import { runWasmToolInBackground } from "./wasm-tool-runner";
import type { ToolResult } from "geolibre-wasm/tools";

export interface WasmRunOptions {
  tool: string;
  args?: Record<string, unknown> | string[];
  inputFiles: Record<string, Uint8Array>;
}

export interface WasmExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string[];
  files: Record<string, Uint8Array>;
  durationMs: number;
}

/**
 * Normalizes an argument object into CLI-style arguments for Whitebox WASM.
 */
function normalizeArgs(args?: Record<string, unknown> | string[]): string[] {
  if (!args) return [];
  if (Array.isArray(args)) return args;

  const result: string[] = [];
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "boolean") {
      if (value) result.push(`--${key}`);
    } else {
      result.push(`--${key}=${String(value)}`);
    }
  }
  return result;
}

/**
 * High-level runner for Whitebox Next Gen WASM tools.
 */
export async function executeWhiteboxTool(
  options: WasmRunOptions,
): Promise<WasmExecutionResult> {
  const startTime = performance.now();
  const cliArgs = normalizeArgs(options.args);

  const res: ToolResult = await runWasmToolInBackground({
    tool: options.tool,
    args: cliArgs,
    input: options.inputFiles,
  });

  const durationMs = performance.now() - startTime;

  return {
    success: res.exitCode === 0,
    exitCode: res.exitCode,
    stdout: res.stdout,
    files: res.files,
    durationMs,
  };
}
