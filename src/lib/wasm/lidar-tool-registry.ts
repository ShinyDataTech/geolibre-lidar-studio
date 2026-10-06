export type LidarToolCategory = "filtering" | "classification" | "gridding" | "features";

export interface LidarToolParamDef {
  name: string;
  label: string;
  type: "number" | "boolean" | "string" | "select";
  default: unknown;
  description: string;
  options?: { label: string; value: string }[];
}

export interface LidarToolDef {
  id: string;
  name: string;
  category: LidarToolCategory;
  categoryLabel: string;
  description: string;
  inputExt: string;
  outputExt: string;
  params: LidarToolParamDef[];
  buildArgs: (inputFilename: string, outputFilename: string, params: Record<string, unknown>) => Record<string, unknown>;
}

export function ensureWorkPath(filename: string): string {
  if (filename.startsWith("/work/")) return filename;
  return `/work/${filename.replace(/^\/+/, "")}`;
}

export const LIDAR_TOOL_REGISTRY: Record<string, LidarToolDef> = {
  improved_ground_point_filter: {
    id: "improved_ground_point_filter",
    name: "Improved Ground Point Filter",
    category: "classification",
    categoryLabel: "Ground Classification",
    description: "Separates bare earth ground points from vegetation, structures, and surface features using an adaptive filter.",
    inputExt: "las",
    outputExt: "las",
    params: [
      {
        name: "search_radius",
        label: "Search Radius (m)",
        type: "number",
        default: 2.0,
        description: "Search radius for local elevation minima identification.",
      },
      {
        name: "min_intercloud_dist",
        label: "Inter-cloud Distance (m)",
        type: "number",
        default: 0.5,
        description: "Minimum distance between points in adjacent clusters.",
      },
      {
        name: "max_surface_slope",
        label: "Max Surface Slope (°)",
        type: "number",
        default: 15.0,
        description: "Maximum allowable slope angle of the ground surface.",
      },
      {
        name: "classify",
        label: "Classify in-place",
        type: "boolean",
        default: true,
        description: "Assign ASPRS Class 2 (Ground) instead of discarding non-ground points.",
      },
    ],
    buildArgs: (input, output, p) => ({
      input: ensureWorkPath(input),
      output: ensureWorkPath(output),
      search_radius: p.search_radius ?? 2.0,
      min_intercloud_dist: p.min_intercloud_dist ?? 0.5,
      max_surface_slope: p.max_surface_slope ?? 15.0,
      classify: p.classify ?? true,
    }),
  },

  filter_lidar_noise: {
    id: "filter_lidar_noise",
    name: "Filter LiDAR Noise",
    category: "filtering",
    categoryLabel: "Noise Filtering",
    description: "Removes multipath reflections, low aerial noise, and isolated spurious outlier points.",
    inputExt: "las",
    outputExt: "las",
    params: [
      {
        name: "radius",
        label: "Search Radius (m)",
        type: "number",
        default: 2.0,
        description: "Search radius for evaluating local point density and outliers.",
      },
      {
        name: "threshold",
        label: "Outlier Threshold",
        type: "number",
        default: 5.0,
        description: "Standard deviation or neighbor difference threshold.",
      },
    ],
    buildArgs: (input, output, p) => ({
      input: ensureWorkPath(input),
      output: ensureWorkPath(output),
      radius: p.radius ?? 2.0,
      threshold: p.threshold ?? 5.0,
    }),
  },

  lidar_tin_gridding: {
    id: "lidar_tin_gridding",
    name: "TIN Gridding (DEM Generation)",
    category: "gridding",
    categoryLabel: "Elevation Gridding",
    description: "Interpolates point cloud elevations into a smooth Digital Elevation Model (DEM) raster grid via Delaunay triangulation.",
    inputExt: "las",
    outputExt: "tif",
    params: [
      {
        name: "resolution",
        label: "Grid Resolution (m)",
        type: "number",
        default: 1.0,
        description: "Output raster cell resolution in metres.",
      },
      {
        name: "returns",
        label: "Returns",
        type: "select",
        default: "all",
        description: "LiDAR returns to interpolate.",
        options: [
          { label: "All Returns (All Points)", value: "all" },
          { label: "Last Returns (Bare Earth)", value: "last" },
          { label: "First Returns (Canopy/Surface)", value: "first" },
        ],
      },
      {
        name: "max_triangle_edge_length",
        label: "Max Triangle Edge (m)",
        type: "number",
        default: 50.0,
        description: "Optional maximum triangle edge length in metres to prevent bridging across gaps.",
      },
    ],
    buildArgs: (input, output, p) => ({
      input: ensureWorkPath(input),
      output: ensureWorkPath(output),
      resolution: p.resolution ?? 1.0,
      returns: p.returns ?? "last",
      max_triangle_edge_length: p.max_triangle_edge_length ?? 50.0,
    }),
  },

  classify_lidar: {
    id: "classify_lidar",
    name: "Classify LiDAR (Ground, Veg & Buildings)",
    category: "features",
    categoryLabel: "Feature Extraction",
    description: "Automated point cloud segmentation: identifies ground, vegetation canopy, and building structures via local planarity, linearity, and RANSAC.",
    inputExt: "las",
    outputExt: "las",
    params: [
      {
        name: "search_radius",
        label: "Search Radius (m)",
        type: "number",
        default: 2.5,
        description: "Neighborhood radius for geometric covariance analysis.",
      },
      {
        name: "planarity_threshold",
        label: "Planarity Threshold",
        type: "number",
        default: 0.85,
        description: "Eigenvalue planarity threshold to extract planar rooftops and walls.",
      },
      {
        name: "grd_threshold",
        label: "Ground Threshold (m)",
        type: "number",
        default: 0.15,
        description: "Maximum distance to ground plane.",
      },
      {
        name: "num_iter",
        label: "RANSAC Iterations",
        type: "number",
        default: 30,
        description: "Number of iterations for RANSAC plane fitting.",
      },
    ],
    buildArgs: (input, output, p) => ({
      input: ensureWorkPath(input),
      output: ensureWorkPath(output),
      search_radius: p.search_radius ?? 2.5,
      planarity_threshold: p.planarity_threshold ?? 0.85,
      grd_threshold: p.grd_threshold ?? 0.15,
      num_iter: p.num_iter ?? 30,
    }),
  },

  lidar_ransac_planes: {
    id: "lidar_ransac_planes",
    name: "RANSAC Planar Rooftops & Structures",
    category: "features",
    categoryLabel: "Rooftop & Facade Extraction",
    description: "Extracts building rooftops and geometric planes from point clouds via RANSAC plane fitting.",
    inputExt: "las",
    outputExt: "las",
    params: [
      {
        name: "search_radius",
        label: "Search Radius (m)",
        type: "number",
        default: 2.0,
        description: "Radius of neighborhood for coplanar point sampling.",
      },
      {
        name: "inlier_threshold",
        label: "Inlier Distance (m)",
        type: "number",
        default: 0.15,
        description: "Maximum distance of a point to the fitted plane to be an inlier.",
      },
      {
        name: "max_planar_slope",
        label: "Max Slope (°)",
        type: "number",
        default: 75.0,
        description: "Maximum allowable slope of planar roof facets.",
      },
      {
        name: "classify",
        label: "Classify in-place",
        type: "boolean",
        default: true,
        description: "Assign classification codes to detected planar roof points.",
      },
    ],
    buildArgs: (input, output, p) => ({
      input: ensureWorkPath(input),
      output: ensureWorkPath(output),
      search_radius: p.search_radius ?? 2.0,
      inlier_threshold: p.inlier_threshold ?? 0.15,
      max_planar_slope: p.max_planar_slope ?? 75.0,
      classify: p.classify ?? true,
    }),
  },
};
