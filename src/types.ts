export type ObjectCategory = 'person' | 'car' | 'bench' | 'tree' | 'obstacle' | 'doorway' | 'steps' | 'hazard' | 'cyclist' | 'dog';

export type MovementType = 'approaching' | 'receding' | 'stationary' | 'crossing-left' | 'crossing-right';

export type DirectionSector = 'far-left' | 'mid-left' | 'center-left' | 'center' | 'center-right' | 'mid-right' | 'far-right';

export type HazardLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface BoundingBox {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  width: number; // 0-1 normalized
  height: number; // 0-1 normalized
}

export interface DetectedEntity {
  id: string;
  label: string;
  category: ObjectCategory;
  confidence: number; // 0.0 - 1.0
  bbox: BoundingBox;
  
  // Spatial Analysis
  distanceMeters: number; // e.g. 1.8m
  distanceMm?: number; // e.g. 1800 mm
  distanceSource?: 'camera-depth' | 'vl53l0x';
  azimuthDegrees: number; // -45 to +45 deg (0 = center)
  elevationDegrees: number; // -20 to +20 deg
  direction: DirectionSector;
  relativePositionText: string; // e.g. "2.4m, 18° Left"
  
  // Movement vector
  movement: MovementType;
  velocityMps: number; // velocity in m/s
  trajectoryVector: { dx: number; dy: number }; // normalized movement
  
  // Clinical hazard evaluation
  hazardLevel: HazardLevel;
  timeToCollisionSec: number | null;
  pathInterference: boolean;
  
  // Neural mapping
  receptiveFieldIds: number[];
  stimulationIntensity: number; // 0.0 - 1.0
}

export interface SpatialMapData {
  entities: DetectedEntity[];
  safePathAngle: number; // recommended walking bearing in degrees
  safePathWidthMeters: number; // corridor width in meters
  nearestObstacleDistance: number;
  nearestObstacleSector: DirectionSector;
  navigabilityScore: number; // 0 - 100%
  fovDegrees: number; // e.g. 75 degrees
  maxRangeMeters: number; // e.g. 6.0 meters
  distanceSource?: 'camera-depth' | 'vl53l0x';
  liveSensorDistanceMeters?: number | null;
}

export type NeuralEncodingProtocol = 
  | 'retinotopic_v1' 
  | 'optogenetic_rgc' 
  | 'edge_contrast_phosphene' 
  | 'hazard_burst_frequency';

export interface NeuralElectrodeChannel {
  id: number;
  row: number;
  col: number;
  azimuthDeg: number;
  elevationDeg: number;
  activation: number; // 0.0 to 1.0 (firing strength)
  frequencyHz: number; // e.g. 0 - 120 Hz
  phase: number; // 0 - 2PI for pulse waveform animation
  isHazardFocalPoint: boolean;
  targetCategory?: ObjectCategory;
}

export interface NeuralSimulationState {
  gridSize: 16 | 24 | 32; // 16x16 or 32x32 array
  protocol: NeuralEncodingProtocol;
  totalElectrodes: number;
  activeElectrodesCount: number;
  averageFrequencyHz: number;
  meanChargeDensity: number; // µC/cm²
  pulseWidthUs: number; // e.g. 200 µs
  spikingWaveform: number[]; // real-time waveform data points
  channels: NeuralElectrodeChannel[];
  phospheneFieldCanvasData?: ImageData | null;
  simulationActive: boolean;
}

export interface SystemPipelineTelemetry {
  status: 'Prototype Mode' | 'Calibrating' | 'Active Pipeline';
  simulationReady: boolean;
  inputFps: number;
  cameraLatencyMs: number;
  aiInferenceLatencyMs: number;
  spatialMappingLatencyMs: number;
  neuralEncodingLatencyMs: number;
  totalPipelineLatencyMs: number;
  framesProcessed: number;
  modelConfidenceAverage: number;
  channelBandwidthKbps: number;
}

export interface ClinicalBenchmarkScenario {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  environmentType: 'indoor-hallway' | 'urban-crosswalk' | 'park-path' | 'domestic-room' | 'low-light-transit';
  durationSeconds: number;
  entities: DetectedEntity[];
  narrativeInsight: string;
  videoUrlPlaceholder?: string;
  visualTheme: string;
}
