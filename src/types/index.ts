export type IncidentStatus = 'UNDER INVESTIGATION' | 'MONITORING' | 'CONTAINED' | 'CLOSED';
export type IncidentPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Incident {
  id: string;
  code: string;
  name: string;
  locationName: string;
  coordinates: [number, number]; // [lat, lng]
  detectedAt: string;
  estimatedAgeHours: string;
  slickAreaKm2: number;
  slickPerimeterKm: number;
  confidencePercent: number;
  classification: string;
  sensor: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  backscatterDb: number;
  model: string;
  summary: string;
}

export interface MetOceanTelemetry {
  timestamp: string;
  windSpeedKt: number;
  windDirectionDeg: number;
  windDirectionCard: string;
  waveHeightM: number;
  waveState: string;
  currentSpeedKt: number;
  currentDirectionDeg: number;
  currentDirectionCard: string;
  seaTempC: number;
  airPressureHpa: number;
  netDriftSpeedKt: number;
  netDriftDirectionDeg: number;
  netDriftDirectionCard: string;
  modelFormula: string;
  mode: 'LIVE METOCEAN' | 'BASELINE';
}

export interface HindcastResult {
  incidentId: string;
  originCoordinates: [number, number]; // [lat, lng]
  originRegionName: string;
  confidencePercent: number;
  dischargeWindowUtc: string;
  particleCount: number;
  uncertaintyRadiusKm: number;
  estimatedSpillAgeRange: string;
  trajectoryWaypoints: [number, number][]; // from current slick back to origin
  particleCloud: [number, number][]; // dispersion dots
}

export interface VesselActivityEvent {
  timestampUtc: string;
  description: string;
  isAnomaly: boolean;
  type: 'SPEED_DROP' | 'COURSE_DEVIATION' | 'ORIGIN_PROXIMITY' | 'ENTER_SECTOR' | 'RESUME_COURSE' | 'AIS_GAP';
}

export interface VesselWaypoint {
  lat: number;
  lng: number;
  timestampUtc: string;
  speedKt: number;
  headingDeg: number;
}

export interface Vessel {
  id: string;
  name: string;
  imo: string;
  mmsi: string;
  callsign: string;
  flag: string;
  flagCode: string;
  type: string;
  lengthM: number;
  beamM: number;
  currentCoordinates: [number, number];
  currentSpeedKt: number;
  currentHeadingDeg: number;
  distanceFromOriginKm: number;
  timeDiffMinutes: number;
  rank: number;
  investigationPriority: 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEARED';
  attributionScore: number; // 0-100
  proximityScore: number;
  trajectoryScore: number;
  temporalScore: number;
  aisAnomalyScore: number;
  behavioralAnomalyScore: number;
  speedAnomalyDetected: boolean;
  courseDeviationDetected: boolean;
  presenceInOriginWindow: boolean;
  track: VesselWaypoint[];
  activityTimeline: VesselActivityEvent[];
  destination: string;
  eta: string;
  distanceAtReleaseKm?: number;
  releaseTimestampUtc?: string;
  releaseCoordinates?: [number, number];
  temporalConsistency?: 'HIGH' | 'MEDIUM' | 'LOW' | 'TEMPORALLY INCONSISTENT';
}

export interface ForecastStep {
  stepHours: number; // 0, 6, 12, 24, 48
  label: string;
  timeUtc: string;
  estimatedAreaKm2: number;
  centerCoordinates: [number, number];
  polygonCoordinates: [number, number][];
  uncertaintyRadiusKm: number;
}

export interface ShorelineRiskZone {
  name: string;
  region: string;
  distanceOffshoreKm: number;
  projectedEtaHours: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  protocolTier: string;
  vulnerabilityIndex: number; // out of 10
  coordinates: [number, number];
  vulnerableAssets: {
    name: string;
    type: string;
    sensitivity: 'HIGH' | 'CRITICAL' | 'MEDIUM';
  }[];
  immediateActions: {
    id: string;
    text: string;
    completed: boolean;
    priority: 'HIGH' | 'CRITICAL' | 'STANDARD';
  }[];
}

export interface SARDetectionResult {
  tileId: string;
  acquisitionTime: string;
  satellite: string;
  polarization: string;
  resolutionM: number;
  rawImagePreviewUrl: string;
  segmentedMaskPreviewUrl: string;
  slickPolygonCoordinates: [number, number][];
  metrics: {
    areaKm2: number;
    perimeterKm: number;
    meanBackscatterDb: number;
    backscatterContrastDb: number;
    slickThicknessCategory: string;
    estimatedSpillAgeHours: string;
    classificationConfidence: number;
  };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  category: 'INCIDENT' | 'VESSEL' | 'FORECAST' | 'SYSTEM';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  read: boolean;
  incidentId?: string;
  vesselId?: string;
}

export interface DataSourceStatus {
  id: string;
  name: string;
  category: 'SATELLITE' | 'AIS' | 'METOCEAN' | 'HYDRODYNAMIC';
  provider: string;
  status: 'ONLINE' | 'STANDBY' | 'DEGRADED';
  latencySeconds: number;
  lastUpdated: string;
  coverage: string;
  updateFrequency: string;
}

export interface ModelStatus {
  id: string;
  name: string;
  role: string;
  version: string;
  status: 'ONLINE' | 'TRAINING' | 'BENCHMARKING';
  lastInferenceUtc: string;
  confidenceMetric: string;
  avgInferenceMs: number;
  framework: string;
}

export interface MapLayerState {
  satelliteLayer: boolean;
  oilSlicks: boolean;
  aisVessels: boolean;
  vesselTracks: boolean;
  hindcastTrajectory: boolean;
  originProbability: boolean;
  forecastCone: boolean;
  shorelineRisk: boolean;
  windVectors: boolean;
  currentVectors: boolean;
  temporalValidation?: boolean;
}
