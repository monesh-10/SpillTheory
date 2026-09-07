import {
  Incident,
  MetOceanTelemetry,
  HindcastResult,
  Vessel,
  ForecastStep,
  ShorelineRiskZone,
  SARDetectionResult,
  NotificationItem,
  DataSourceStatus,
  ModelStatus,
} from '../types';

export const PRIMARY_INCIDENT: Incident = {
  id: 'OCN-042',
  code: 'SAR_043659',
  name: 'Offshore Mumbai Basin Discharge',
  locationName: 'Offshore Mumbai Basin (Arabian Sea)',
  coordinates: [18.112, 72.464],
  detectedAt: '07 Sep 2026 04:32 UTC',
  estimatedAgeHours: '5–8 hours',
  slickAreaKm2: 13.48,
  slickPerimeterKm: 31.6,
  confidencePercent: 94.7,
  classification: 'Probable petroleum slick',
  sensor: 'Sentinel-1 SAR (C-Band Interferometric Wide)',
  status: 'UNDER INVESTIGATION',
  priority: 'HIGH',
  backscatterDb: -9.2,
  model: 'OceanTrace-Seg v1.4 (U-Net Multi-Res)',
  summary: 'Persistent dark oceanic backscatter anomaly detected during Sentinel-1 morning ascending pass. Backscatter damping of 5.8 dB indicates dense hydrocarbon damping of capillary ripples. Surface morphology demonstrates wind-driven tailing oriented toward Southeast.'
};

export const ALL_INCIDENTS: Incident[] = [
  PRIMARY_INCIDENT,
  {
    id: 'OCN-041',
    code: 'SAR_043612',
    name: 'Krishna-Godavari Deepwater Plume',
    locationName: 'Bay of Bengal (KG Basin)',
    coordinates: [15.821, 81.942],
    detectedAt: '06 Sep 2026 22:14 UTC',
    estimatedAgeHours: '12–16 hours',
    slickAreaKm2: 7.82,
    slickPerimeterKm: 19.4,
    confidencePercent: 89.3,
    classification: 'Probable emulsified crude',
    sensor: 'Sentinel-1 SAR',
    status: 'MONITORING',
    priority: 'MEDIUM',
    backscatterDb: -8.4,
    model: 'OceanTrace-Seg v1.4',
    summary: 'Elongated sheen feature aligned with local boundary current. Moderate probability of bilge cleaning along offshore shipping channel.'
  },
  {
    id: 'OCN-039',
    code: 'SAR_043588',
    name: 'Gulf of Mannar Coral Zone Alert',
    locationName: 'Gulf of Mannar Biosphere',
    coordinates: [8.852, 78.621],
    detectedAt: '05 Sep 2026 14:05 UTC',
    estimatedAgeHours: '18–24 hours',
    slickAreaKm2: 4.15,
    slickPerimeterKm: 12.1,
    confidencePercent: 91.1,
    classification: 'Light fuel oil sheen',
    sensor: 'Sentinel-1 SAR + Sentinel-2 MSI',
    status: 'CONTAINED',
    priority: 'LOW',
    backscatterDb: -10.1,
    model: 'OceanTrace-Seg v1.4',
    summary: 'Contained small-vessel discharge in shallow transit strait. Containment boom deployment completed by local port trust.'
  }
];

export const PRIMARY_METOCEAN: MetOceanTelemetry = {
  timestamp: '07 Sep 2026 04:30 UTC',
  windSpeedKt: 13.0,
  windDirectionDeg: 291,
  windDirectionCard: 'NW',
  waveHeightM: 1.42,
  waveState: 'Moderate Sea (Sea State 3)',
  currentSpeedKt: 0.32,
  currentDirectionDeg: 146,
  currentDirectionCard: 'SE',
  seaTempC: 28.3,
  airPressureHpa: 1009.9,
  netDriftSpeedKt: 0.69,
  netDriftDirectionDeg: 130,
  netDriftDirectionCard: 'SE',
  modelFormula: 'Vdrift = Vcurrent + 0.03 × Vwind',
  mode: 'LIVE METOCEAN'
};

// Generates 500 stochastic Lagrangian particles distributed around origin
const generateParticleCloud = (): [number, number][] => {
  const originLat = 18.041;
  const originLng = 72.512;
  const particles: [number, number][] = [];
  
  // Seeded deterministic generation
  for (let i = 0; i < 350; i++) {
    const angle = (i * 137.5 * Math.PI) / 180;
    const r = (Math.sqrt(i) / Math.sqrt(350)) * 0.038;
    const latOffset = r * Math.sin(angle) * 0.85;
    const lngOffset = r * Math.cos(angle) * 1.15;
    particles.push([
      Number((originLat + latOffset).toFixed(5)),
      Number((originLng + lngOffset).toFixed(5))
    ]);
  }
  return particles;
};

export const PRIMARY_HINDCAST: HindcastResult = {
  incidentId: 'OCN-042',
  originCoordinates: [18.041, 72.512],
  originRegionName: 'Probable Source Region (90% Uncertainty Envelope)',
  confidencePercent: 78.2,
  dischargeWindowUtc: '02:10–03:40 UTC',
  particleCount: 500,
  uncertaintyRadiusKm: 3.96,
  estimatedSpillAgeRange: '5.2 – 6.5 hours',
  trajectoryWaypoints: [
    [18.112, 72.464], // Current slick center
    [18.095, 72.478],
    [18.077, 72.492],
    [18.058, 72.503],
    [18.041, 72.512]  // Estimated Origin
  ],
  particleCloud: generateParticleCloud()
};

export const SLICK_POLYGON: [number, number][] = [
  [18.135, 72.451],
  [18.128, 72.472],
  [18.118, 72.486],
  [18.102, 72.492],
  [18.089, 72.484],
  [18.082, 72.468],
  [18.091, 72.449],
  [18.109, 72.438],
  [18.126, 72.442],
  [18.135, 72.451]
];

export const SUSPECT_VESSELS: Vessel[] = [
  {
    id: 'ves-01',
    name: 'MT OCEAN STAR',
    imo: '9384910',
    mmsi: '419001284',
    callsign: 'ATX9',
    flag: 'Liberia',
    flagCode: 'LR',
    type: 'Crude Oil Tanker',
    lengthM: 248,
    beamM: 42,
    currentCoordinates: [17.924, 72.715],
    currentSpeedKt: 11.4,
    currentHeadingDeg: 71,
    distanceFromOriginKm: 2.8,
    timeDiffMinutes: 17,
    rank: 1,
    investigationPriority: 'HIGH',
    attributionScore: 91.7,
    proximityScore: 96,
    trajectoryScore: 94,
    temporalScore: 91,
    aisAnomalyScore: 87,
    behavioralAnomalyScore: 82,
    speedAnomalyDetected: true,
    courseDeviationDetected: true,
    presenceInOriginWindow: true,
    destination: 'JNPT MUMBAI',
    eta: '07 Sep 2026 18:00 UTC',
    track: [
      { lat: 18.210, lng: 72.310, timestampUtc: '01:42 UTC', speedKt: 12.4, headingDeg: 125 },
      { lat: 18.145, lng: 72.410, timestampUtc: '02:18 UTC', speedKt: 5.8, headingDeg: 145 },
      { lat: 18.080, lng: 72.485, timestampUtc: '02:31 UTC', speedKt: 6.2, headingDeg: 160 },
      { lat: 18.048, lng: 72.525, timestampUtc: '02:47 UTC', speedKt: 7.1, headingDeg: 110 },
      { lat: 17.985, lng: 72.610, timestampUtc: '03:05 UTC', speedKt: 10.9, headingDeg: 72 },
      { lat: 17.924, lng: 72.715, timestampUtc: '04:32 UTC', speedKt: 11.4, headingDeg: 71 }
    ],
    activityTimeline: [
      { timestampUtc: '01:42 UTC', description: 'Vessel enters forensic tracking corridor from North-West', isAnomaly: false, type: 'ENTER_SECTOR' },
      { timestampUtc: '02:18 UTC', description: 'Significant speed reduction: drops abruptly from 12.4 kn to 5.8 kn in open sea', isAnomaly: true, type: 'SPEED_DROP' },
      { timestampUtc: '02:31 UTC', description: 'Course deviation of 35° detected without navigational obstacle or VTS advisement', isAnomaly: true, type: 'COURSE_DEVIATION' },
      { timestampUtc: '02:47 UTC', description: 'Vessel transits within 2.8 km of the probabilistic hindcast origin core', isAnomaly: true, type: 'ORIGIN_PROXIMITY' },
      { timestampUtc: '03:05 UTC', description: 'Accelerates to 10.9 kn and resumes designated offshore transit heading (071°)', isAnomaly: false, type: 'RESUME_COURSE' }
    ]
  },
  {
    id: 'ves-02',
    name: 'GULF VOYAGER',
    imo: '9412089',
    mmsi: '419002931',
    callsign: 'VTG4',
    flag: 'Marshall Islands',
    flagCode: 'MH',
    type: 'Chemical/Oil Products Tanker',
    lengthM: 182,
    beamM: 28,
    currentCoordinates: [18.241, 72.285],
    currentSpeedKt: 10.8,
    currentHeadingDeg: 310,
    distanceFromOriginKm: 6.2,
    timeDiffMinutes: 44,
    rank: 2,
    investigationPriority: 'HIGH',
    attributionScore: 76.4,
    proximityScore: 84,
    trajectoryScore: 78,
    temporalScore: 79,
    aisAnomalyScore: 72,
    behavioralAnomalyScore: 68,
    speedAnomalyDetected: false,
    courseDeviationDetected: true,
    presenceInOriginWindow: true,
    destination: 'FUJAIRAH',
    eta: '09 Sep 2026 06:00 UTC',
    track: [
      { lat: 17.980, lng: 72.620, timestampUtc: '01:50 UTC', speedKt: 11.2, headingDeg: 308 },
      { lat: 18.062, lng: 72.540, timestampUtc: '02:35 UTC', speedKt: 10.6, headingDeg: 312 },
      { lat: 18.150, lng: 72.410, timestampUtc: '03:20 UTC', speedKt: 10.9, headingDeg: 309 },
      { lat: 18.241, lng: 72.285, timestampUtc: '04:32 UTC', speedKt: 10.8, headingDeg: 310 }
    ],
    activityTimeline: [
      { timestampUtc: '01:50 UTC', description: 'Vessel transiting standard northbound tanker channel', isAnomaly: false, type: 'ENTER_SECTOR' },
      { timestampUtc: '02:35 UTC', description: 'Passed 6.2 km east of origin centroid during estimated release window', isAnomaly: true, type: 'ORIGIN_PROXIMITY' },
      { timestampUtc: '03:40 UTC', description: 'Maintained steady speed and heading throughout sector exit', isAnomaly: false, type: 'RESUME_COURSE' }
    ]
  },
  {
    id: 'ves-03',
    name: 'MV BLUE HORIZON',
    imo: '9245178',
    mmsi: '419003810',
    callsign: 'VBL2',
    flag: 'Panama',
    flagCode: 'PA',
    type: 'Bulk Carrier',
    lengthM: 225,
    beamM: 32,
    currentCoordinates: [17.810, 72.350],
    currentSpeedKt: 12.2,
    currentHeadingDeg: 220,
    distanceFromOriginKm: 9.8,
    timeDiffMinutes: 72,
    rank: 3,
    investigationPriority: 'MEDIUM',
    attributionScore: 63.8,
    proximityScore: 68,
    trajectoryScore: 65,
    temporalScore: 62,
    aisAnomalyScore: 58,
    behavioralAnomalyScore: 66,
    speedAnomalyDetected: false,
    courseDeviationDetected: false,
    presenceInOriginWindow: false,
    destination: 'COLOMBO',
    eta: '09 Sep 2026 14:00 UTC',
    track: [
      { lat: 18.120, lng: 72.620, timestampUtc: '02:10 UTC', speedKt: 12.3, headingDeg: 222 },
      { lat: 17.960, lng: 72.480, timestampUtc: '03:15 UTC', speedKt: 12.1, headingDeg: 219 },
      { lat: 17.810, lng: 72.350, timestampUtc: '04:32 UTC', speedKt: 12.2, headingDeg: 220 }
    ],
    activityTimeline: [
      { timestampUtc: '02:10 UTC', description: 'Entered sector southbound at constant transit speed', isAnomaly: false, type: 'ENTER_SECTOR' },
      { timestampUtc: '03:15 UTC', description: 'Transited outer periphery at 9.8 km distance', isAnomaly: false, type: 'ORIGIN_PROXIMITY' }
    ]
  },
  {
    id: 'ves-04',
    name: 'MT ARABIAN PEARL',
    imo: '9553147',
    mmsi: '419004529',
    callsign: '9V82',
    flag: 'Singapore',
    flagCode: 'SG',
    type: 'Product Tanker',
    lengthM: 183,
    beamM: 27,
    currentCoordinates: [17.750, 72.820],
    currentSpeedKt: 13.1,
    currentHeadingDeg: 145,
    distanceFromOriginKm: 14.5,
    timeDiffMinutes: 110,
    rank: 4,
    investigationPriority: 'LOW',
    attributionScore: 52.1,
    proximityScore: 49,
    trajectoryScore: 54,
    temporalScore: 51,
    aisAnomalyScore: 55,
    behavioralAnomalyScore: 51,
    speedAnomalyDetected: false,
    courseDeviationDetected: false,
    presenceInOriginWindow: false,
    destination: 'MANGALORE',
    eta: '08 Sep 2026 09:30 UTC',
    track: [
      { lat: 18.250, lng: 72.580, timestampUtc: '01:15 UTC', speedKt: 13.2, headingDeg: 146 },
      { lat: 17.750, lng: 72.820, timestampUtc: '04:32 UTC', speedKt: 13.1, headingDeg: 145 }
    ],
    activityTimeline: [
      { timestampUtc: '01:15 UTC', description: 'Transited outside origin error boundary', isAnomaly: false, type: 'ENTER_SECTOR' }
    ]
  },
  {
    id: 'ves-05',
    name: 'COASTAL PIONEER',
    imo: '9104823',
    mmsi: '419005118',
    callsign: 'AU88',
    flag: 'India',
    flagCode: 'IN',
    type: 'General Cargo',
    lengthM: 110,
    beamM: 18,
    currentCoordinates: [18.340, 72.780],
    currentSpeedKt: 8.4,
    currentHeadingDeg: 90,
    distanceFromOriginKm: 24.1,
    timeDiffMinutes: 180,
    rank: 5,
    investigationPriority: 'CLEARED',
    attributionScore: 21.3,
    proximityScore: 18,
    trajectoryScore: 22,
    temporalScore: 19,
    aisAnomalyScore: 24,
    behavioralAnomalyScore: 23,
    speedAnomalyDetected: false,
    courseDeviationDetected: false,
    presenceInOriginWindow: false,
    destination: 'REVDANDA',
    eta: '07 Sep 2026 12:00 UTC',
    track: [
      { lat: 18.340, lng: 72.520, timestampUtc: '02:00 UTC', speedKt: 8.5, headingDeg: 90 },
      { lat: 18.340, lng: 72.780, timestampUtc: '04:32 UTC', speedKt: 8.4, headingDeg: 90 }
    ],
    activityTimeline: [
      { timestampUtc: '02:00 UTC', description: 'Coastal feeder vessel maintaining charted lane. No correlation with slick.', isAnomaly: false, type: 'ENTER_SECTOR' }
    ]
  }
];

export const FORECAST_STEPS: ForecastStep[] = [
  {
    stepHours: 0,
    label: 'NOW (T+0h)',
    timeUtc: '07 Sep 04:32 UTC',
    estimatedAreaKm2: 13.48,
    centerCoordinates: [18.112, 72.464],
    uncertaintyRadiusKm: 1.2,
    polygonCoordinates: SLICK_POLYGON
  },
  {
    stepHours: 6,
    label: '+6H',
    timeUtc: '07 Sep 10:32 UTC',
    estimatedAreaKm2: 17.20,
    centerCoordinates: [18.148, 72.522],
    uncertaintyRadiusKm: 2.8,
    polygonCoordinates: [
      [18.175, 72.505],
      [18.168, 72.535],
      [18.152, 72.552],
      [18.132, 72.548],
      [18.121, 72.520],
      [18.135, 72.498],
      [18.160, 72.492],
      [18.175, 72.505]
    ]
  },
  {
    stepHours: 12,
    label: '+12H',
    timeUtc: '07 Sep 16:32 UTC',
    estimatedAreaKm2: 22.80,
    centerCoordinates: [18.192, 72.601],
    uncertaintyRadiusKm: 4.6,
    polygonCoordinates: [
      [18.225, 72.580],
      [18.216, 72.625],
      [18.195, 72.645],
      [18.170, 72.635],
      [18.162, 72.595],
      [18.178, 72.565],
      [18.210, 72.560],
      [18.225, 72.580]
    ]
  },
  {
    stepHours: 24,
    label: '+24H',
    timeUtc: '08 Sep 04:32 UTC',
    estimatedAreaKm2: 31.40,
    centerCoordinates: [18.245, 72.715],
    uncertaintyRadiusKm: 7.2,
    polygonCoordinates: [
      [18.285, 72.685],
      [18.272, 72.755],
      [18.245, 72.780],
      [18.215, 72.765],
      [18.205, 72.700],
      [18.230, 72.665],
      [18.268, 72.660],
      [18.285, 72.685]
    ]
  },
  {
    stepHours: 48,
    label: '+48H',
    timeUtc: '09 Sep 04:32 UTC',
    estimatedAreaKm2: 46.80,
    centerCoordinates: [18.288, 72.875],
    uncertaintyRadiusKm: 11.5,
    polygonCoordinates: [
      [18.335, 72.835],
      [18.320, 72.930],
      [18.285, 72.960],
      [18.250, 72.935],
      [18.240, 72.850],
      [18.270, 72.805],
      [18.315, 72.800],
      [18.335, 72.835]
    ]
  }
];

export const PRIMARY_SHORELINE_RISK: ShorelineRiskZone = {
  name: 'Murud-Janjira Artisanal Aquaculture & Fishing Grounds',
  region: 'Raigad Coastal Sector, Maharashtra',
  distanceOffshoreKm: 55.6,
  projectedEtaHours: 23.5,
  riskLevel: 'HIGH',
  protocolTier: 'Tier-1 (NOSDCP Activated)',
  vulnerabilityIndex: 8.4,
  coordinates: [18.298, 72.962],
  vulnerableAssets: [
    { name: 'Kashid & Murud Traditional Estuarine Fisheries', type: 'Marine Fisheries', sensitivity: 'CRITICAL' },
    { name: 'Rajpuri Creek Mangrove Nursery & Oyster Beds', type: 'Ecological Reserve', sensitivity: 'CRITICAL' },
    { name: 'Alibaug Artisan Aquaculture Cages', type: 'Coastal Aquaculture', sensitivity: 'HIGH' },
    { name: 'Janjira Marine Fort Intertidal Heritage Zone', type: 'Coastal Heritage / Tourism', sensitivity: 'HIGH' }
  ],
  immediateActions: [
    { id: 'act-1', text: 'Deploy 800m offshore heavy-duty containment booms along Rajpuri Creek ingress', completed: false, priority: 'CRITICAL' },
    { id: 'act-2', text: 'Issue urgent VHF advisory (Ch-16) to Murud artisan fishing cooperative fleet', completed: true, priority: 'HIGH' },
    { id: 'act-3', text: 'Dispatch ICG Interceptor Craft (C-432) with dynamic disk skimmers to T+12h drift waypoint', completed: false, priority: 'CRITICAL' },
    { id: 'act-4', text: 'Request high-cadence Sentinel-2 optical imagery pass for coastal zone baseline', completed: true, priority: 'STANDARD' },
    { id: 'act-5', text: 'Alert Maharashtra Pollution Control Board (MPCB) rapid shoreline sampling squad', completed: false, priority: 'HIGH' }
  ]
};

export const SAR_DETECTION_MOCK: SARDetectionResult = {
  tileId: 'S1A_IW_GRDH_1SDV_20260907T043218_043659_053F1B',
  acquisitionTime: '07 Sep 2026 04:32:18 UTC',
  satellite: 'Sentinel-1A SAR (ESA / Copernicus)',
  polarization: 'VV + VH Dual-Pol',
  resolutionM: 10.0,
  rawImagePreviewUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
  segmentedMaskPreviewUrl: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80',
  slickPolygonCoordinates: SLICK_POLYGON,
  metrics: {
    areaKm2: 13.48,
    perimeterKm: 31.6,
    meanBackscatterDb: -9.2,
    backscatterContrastDb: -5.8,
    slickThicknessCategory: 'Rainbow Sheen to Continuous Crude (0.1–5.0 µm)',
    estimatedSpillAgeHours: '5–8 hours',
    classificationConfidence: 94.7
  }
};

export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'High Priority Spill Detection',
    message: 'Incident OCN-042 confirmed offshore Mumbai Basin via Sentinel-1 SAR pass. Area: 13.48 km².',
    timestamp: '14 min ago',
    category: 'INCIDENT',
    severity: 'CRITICAL',
    read: false,
    incidentId: 'OCN-042'
  },
  {
    id: 'notif-2',
    title: 'Vessel Behavioral Anomaly Detected',
    message: 'MT OCEAN STAR (IMO: 9384910) logged speed drop from 12.4 kn to 5.8 kn and 35° course deviation within origin window.',
    timestamp: '28 min ago',
    category: 'VESSEL',
    severity: 'WARNING',
    read: false,
    vesselId: 'ves-01'
  },
  {
    id: 'notif-3',
    title: 'Shoreline Risk Advisory',
    message: 'Murud-Janjira fishing grounds within 23.5h projected drift corridor. NOSDCP Tier-1 alert broadcasted.',
    timestamp: '42 min ago',
    category: 'FORECAST',
    severity: 'WARNING',
    read: true,
    incidentId: 'OCN-042'
  },
  {
    id: 'notif-4',
    title: 'MetOcean Telemetry Synced',
    message: 'INCOIS Mumbai buoy feed refreshed. NW Wind 13 kt, SE Current 0.32 kt integrated into Lagrangian engine.',
    timestamp: '1h ago',
    category: 'SYSTEM',
    severity: 'INFO',
    read: true
  }
];

export const DATA_SOURCES: DataSourceStatus[] = [
  {
    id: 'ds-1',
    name: 'Sentinel-1 C-SAR (ESA / Copernicus)',
    category: 'SATELLITE',
    provider: 'Copernicus Open Access Hub',
    status: 'ONLINE',
    latencySeconds: 142,
    lastUpdated: '07 Sep 04:32 UTC',
    coverage: 'Global / Indian Exclusive Economic Zone',
    updateFrequency: 'Daily ascending/descending passes'
  },
  {
    id: 'ds-2',
    name: 'Sentinel-2 MSI Multispectral',
    category: 'SATELLITE',
    provider: 'ESA Copernicus Hub',
    status: 'ONLINE',
    latencySeconds: 210,
    lastUpdated: '06 Sep 10:15 UTC',
    coverage: 'Coastal 100km buffer',
    updateFrequency: '5-day revisit'
  },
  {
    id: 'ds-3',
    name: 'Terrestrial & Satellite AIS Stream',
    category: 'AIS',
    provider: 'Directorate General of Lighthouses & Lightships / Spire Maritime',
    status: 'ONLINE',
    latencySeconds: 12,
    lastUpdated: '07 Sep 04:35 UTC',
    coverage: 'Arabian Sea, Bay of Bengal, Indian Ocean',
    updateFrequency: 'Real-time (<15s burst)'
  },
  {
    id: 'ds-4',
    name: 'INCOIS High-Resolution MetOcean Buoys',
    category: 'METOCEAN',
    provider: 'Indian National Centre for Ocean Information Services',
    status: 'ONLINE',
    latencySeconds: 18,
    lastUpdated: '07 Sep 04:30 UTC',
    coverage: 'Mumbai Offshore & Western Continental Shelf',
    updateFrequency: '10-minute cycle'
  },
  {
    id: 'ds-5',
    name: 'HYCOM Global Hydrodynamic Current Model',
    category: 'HYDRODYNAMIC',
    provider: 'NOAA / HYCOM Consortium',
    status: 'ONLINE',
    latencySeconds: 340,
    lastUpdated: '07 Sep 00:00 UTC',
    coverage: '0.08° Equatorial Resolution (3-hourly)',
    updateFrequency: '3 hours'
  }
];

export const AI_MODELS: ModelStatus[] = [
  {
    id: 'mod-1',
    name: 'OceanTrace-Seg v1.4',
    role: 'Satellite SAR Dark Slick Segmentation & Contour Extraction',
    version: 'v1.4.2-prod',
    status: 'ONLINE',
    lastInferenceUtc: '07 Sep 04:41 UTC',
    confidenceMetric: '94.7% IoU / F1: 0.932',
    avgInferenceMs: 3820,
    framework: 'PyTorch / TensorRT Optimized'
  },
  {
    id: 'mod-2',
    name: 'OceanTrace-Attribution v2.1',
    role: 'Multi-Factor Forensic AIS Spatiotemporal Ranking',
    version: 'v2.1.0-rc3',
    status: 'ONLINE',
    lastInferenceUtc: '07 Sep 05:39 UTC',
    confidenceMetric: '91.7% Priority Score',
    avgInferenceMs: 1450,
    framework: 'Graph Neural Network / Bayesian Scoring'
  },
  {
    id: 'mod-3',
    name: 'OceanTrace-Drift v1.8 (Lagrangian 4D)',
    role: 'Backward Hindcast & Forward Oil Dispersion Simulation',
    version: 'v1.8.4',
    status: 'ONLINE',
    lastInferenceUtc: '07 Sep 05:44 UTC',
    confidenceMetric: '78.2% Hindcast Certainty',
    avgInferenceMs: 2190,
    framework: 'OpenDrift / Fortran Core Accelerated'
  }
];

export const AUDIT_TIMELINE = [
  { time: '04:32 UTC', event: 'Sentinel-1A SAR raw telemetry packet ingested by ground station' },
  { time: '04:41 UTC', event: 'OceanTrace-Seg v1.4 completed U-Net segmentation: -9.2 dB backscatter detected' },
  { time: '04:47 UTC', event: 'Slick vector geometry generated: Area 13.48 km², Perimeter 31.6 km' },
  { time: '05:02 UTC', event: 'Lagrangian 4D backward hindcast initiated with INCOIS live MetOcean telemetry' },
  { time: '05:19 UTC', event: 'Probable origin region resolved at 18.041°N, 72.512°E (discharge window 02:10–03:40 UTC)' },
  { time: '05:27 UTC', event: 'Historical AIS traffic reconstructed: 284 vessels filtered, 17 in origin sector' },
  { time: '05:39 UTC', event: 'Attribution engine ranked MT OCEAN STAR (IMO 9384910) as highest investigation priority (91.7%)' },
  { time: '05:44 UTC', event: 'Forward drift forecast generated: Murud-Janjira high-risk shoreline impact projected at T+23.5h' },
  { time: '06:00 UTC', event: 'Preliminary Investigation Dossier compiled for Indian Coast Guard & MPCB' }
];
