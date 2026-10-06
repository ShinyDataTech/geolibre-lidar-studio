import type { PipelineStep } from "../store/useProcessingStore";

export interface AiPromptPreset {
  title: string;
  prompt: string;
  description: string;
}

export const AI_PROMPT_PRESETS: AiPromptPreset[] = [
  {
    title: "Building Extraction",
    prompt: "Extract all building structures and rooftops from this point cloud",
    description: "Filters outlier noise, isolates ground baseline, and classifies coplanar rooftop structures.",
  },
  {
    title: "Bare Earth DEM",
    prompt: "Generate a clean Bare Earth Digital Elevation Model (DEM)",
    description: "Cleans multipath noise, runs adaptive ground filtering, and triangulates a smooth bare earth raster grid.",
  },
  {
    title: "Quality Cleansing",
    prompt: "Cleans all multipath outliers and classify vegetation & ground",
    description: "Removes isolated noise returns and classifies bare earth vs vegetation canopy.",
  },
];

/**
 * AI Workflow Planner:
 * Analyzes natural language instructions and translates them into an executable
 * chain of Whitebox LiDAR tools.
 */
export function planAiLidarPipeline(prompt: string): PipelineStep[] {
  const p = prompt.toLowerCase();
  const steps: PipelineStep[] = [];

  // 1. Noise filtering step
  if (p.includes("noise") || p.includes("clean") || p.includes("outlier") || p.includes("building") || p.includes("dem")) {
    steps.push({
      id: `step-noise-${Date.now()}`,
      toolId: "filter_lidar_noise",
      toolName: "Filter LiDAR Noise",
      params: { radius: 2.0, threshold: 4.5 },
      status: "pending",
      progressMsg: "Removing outlier multipath errors...",
    });
  }

  // 2. Ground point filtering step
  if (p.includes("ground") || p.includes("earth") || p.includes("dem") || p.includes("building") || p.includes("canopy")) {
    steps.push({
      id: `step-ground-${Date.now()}`,
      toolId: "improved_ground_point_filter",
      toolName: "Improved Ground Point Filter",
      params: { search_radius: 2.5, min_intercloud_dist: 0.5, max_surface_slope: 15.0, classify: true },
      status: "pending",
      progressMsg: "Classifying bare earth terrain points...",
    });
  }

  // 3. Building & Rooftop classification step
  if (p.includes("building") || p.includes("rooftop") || p.includes("structure") || p.includes("footprint")) {
    steps.push({
      id: `step-buildings-${Date.now()}`,
      toolId: "classify_lidar",
      toolName: "Classify LiDAR (Ground, Veg & Buildings)",
      params: { search_radius: 2.5, planarity_threshold: 0.85, grd_threshold: 0.15, num_iter: 30 },
      status: "pending",
      progressMsg: "Extracting planar building rooftops and structures via 3D geometry & RANSAC...",
    });
  }

  // 4. DEM / Surface gridding step
  if (p.includes("dem") || p.includes("dsm") || p.includes("grid") || p.includes("elevation model")) {
    steps.push({
      id: `step-gridding-${Date.now()}`,
      toolId: "lidar_tin_gridding",
      toolName: "TIN Gridding (DEM)",
      params: { resolution: 1.0, returns: "last", max_triangle_edge_length: 50.0 },
      status: "pending",
      progressMsg: "Triangulating points into 1m elevation raster grid...",
    });
  }

  // Default fallback if query didn't match specific terms
  if (steps.length === 0) {
    steps.push({
      id: `step-default-${Date.now()}`,
      toolId: "improved_ground_point_filter",
      toolName: "Improved Ground Point Filter",
      params: { classify: true },
      status: "pending",
      progressMsg: "Classifying ground points...",
    });
  }

  return steps;
}
