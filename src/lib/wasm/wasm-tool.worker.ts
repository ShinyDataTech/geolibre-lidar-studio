/// <reference lib="webworker" />
import { runTool } from "geolibre-wasm/tools";
import type { ToolResult } from "geolibre-wasm/tools";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

export interface WasmToolRequest {
  tool: string;
  args: string[];
  input: Record<string, Uint8Array>;
}

export type WasmToolResponse =
  | { ok: "ack" }
  | { ok: true; result: ToolResult }
  | { ok: false; error: string };

ctx.addEventListener("message", async (event: MessageEvent<WasmToolRequest>) => {
  const { tool, args, input } = event.data;
  // Acknowledge receipt immediately so caller knows worker is alive
  ctx.postMessage({ ok: "ack" } satisfies WasmToolResponse);

  try {
    const result = await runTool(tool, { args, input });
    ctx.postMessage({ ok: true, result } satisfies WasmToolResponse);
  } catch (error) {
    ctx.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } satisfies WasmToolResponse);
  }
});
