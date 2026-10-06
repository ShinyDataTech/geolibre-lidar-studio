import { create } from "zustand";

export interface ToolLogEntry {
  id: string;
  toolId: string;
  toolName: string;
  timestamp: string;
  durationMs: number;
  success: boolean;
  message: string;
}

export interface PipelineStep {
  id: string;
  toolId: string;
  toolName: string;
  params: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed";
  progressMsg?: string;
}

interface ProcessingState {
  activeToolId: string;
  toolParams: Record<string, unknown>;
  isProcessing: boolean;
  statusMessage: string;
  history: ToolLogEntry[];
  aiPrompt: string;
  currentPipeline: PipelineStep[];

  setActiveToolId: (id: string) => void;
  setToolParam: (key: string, value: unknown) => void;
  setProcessing: (isProcessing: boolean, statusMessage?: string) => void;
  addHistoryEntry: (entry: ToolLogEntry) => void;
  setAiPrompt: (prompt: string) => void;
  setPipeline: (steps: PipelineStep[]) => void;
  updatePipelineStep: (stepId: string, updates: Partial<PipelineStep>) => void;
}

export const useProcessingStore = create<ProcessingState>((set) => ({
  activeToolId: "improved_ground_point_filter",
  toolParams: {},
  isProcessing: false,
  statusMessage: "",
  history: [],
  aiPrompt: "Filter aerial noise, classify bare earth ground, and detect building rooftops",
  currentPipeline: [],

  setActiveToolId: (id) => set({ activeToolId: id, toolParams: {} }),
  setToolParam: (key, value) =>
    set((state) => ({ toolParams: { ...state.toolParams, [key]: value } })),
  setProcessing: (isProcessing, statusMessage = "") => set({ isProcessing, statusMessage }),
  addHistoryEntry: (entry) => set((state) => ({ history: [entry, ...state.history] })),
  setAiPrompt: (aiPrompt) => set({ aiPrompt }),
  setPipeline: (currentPipeline) => set({ currentPipeline }),
  updatePipelineStep: (stepId, updates) =>
    set((state) => ({
      currentPipeline: state.currentPipeline.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
    })),
}));
