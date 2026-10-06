import type { ToolResult } from "geolibre-wasm/tools";
import type { WasmToolRequest, WasmToolResponse } from "./wasm-tool.worker";

export type { WasmToolRequest, WasmToolResponse };

const idleWorkers: Worker[] = [];
const MAX_IDLE_WORKERS = 1;

export function releaseIdleWasmToolWorkers(): void {
  for (const worker of idleWorkers.splice(0)) worker.terminate();
}

function spawnWorker(): Worker {
  return new Worker(new URL("./wasm-tool.worker.ts", import.meta.url), { type: "module" });
}

function acquireWorker(): { worker: Worker; reused: boolean } {
  const parked = idleWorkers.pop();
  return parked ? { worker: parked, reused: true } : { worker: spawnWorker(), reused: false };
}

function releaseWorker(worker: Worker): void {
  if (idleWorkers.length < MAX_IDLE_WORKERS) idleWorkers.push(worker);
  else worker.terminate();
}

/**
 * Executes a Whitebox / GeoLibre WASM tool on a dedicated Web Worker.
 */
export function runWasmToolInBackground(request: WasmToolRequest): Promise<ToolResult> {
  return new Promise((resolve, reject) => {
    let { worker, reused } = acquireWorker();
    let ackTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (ackTimer) clearTimeout(ackTimer);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      worker.removeEventListener("messageerror", onMessageError);
    };

    const armAck = () => {
      if (!reused) return;
      ackTimer = setTimeout(() => {
        cleanup();
        worker.terminate();
        // Retry with freshly spawned worker
        const fresh = acquireWorker();
        worker = fresh.worker;
        reused = false;
        post();
      }, 5000);
    };

    const onMessage = (event: MessageEvent<WasmToolResponse>) => {
      const data = event.data;
      if (data.ok === "ack") {
        if (ackTimer) {
          clearTimeout(ackTimer);
          ackTimer = undefined;
        }
        return;
      }

      cleanup();
      releaseWorker(worker);

      if (data.ok) {
        resolve(data.result);
      } else {
        reject(new Error(data.error));
      }
    };

    const onError = (event: ErrorEvent) => {
      cleanup();
      worker.terminate();
      reject(new Error(event.message || "WASM worker execution failed"));
    };

    const onMessageError = () => {
      cleanup();
      worker.terminate();
      reject(new Error("WASM worker communication deserialization error"));
    };

    const post = () => {
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      worker.addEventListener("messageerror", onMessageError);
      armAck();
      worker.postMessage(request);
    };

    post();
  });
}
