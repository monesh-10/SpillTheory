import React, { useState, useEffect } from 'react';
import { 
  Ship, 
  Satellite, 
  Maximize2, 
  Clock, 
  CheckSquare, 
  Square, 
  Play, 
  Pause, 
  ChevronRight, 
  ChevronDown,
  FileText, 
  Waves, 
  Navigation, 
  PanelRightClose, 
  PanelRightOpen, 
  Layers, 
  AlertTriangle,
  Compass,
  Columns,
  LayoutGrid,
  Info,
  ShieldAlert,
  X
} from 'lucide-react';
import { MapWorkspace } from '../components/MapWorkspace';
import { EvidenceCompareModal } from '../components/EvidenceCompareModal';
import { 
  Incident, 
  Vessel, 
  HindcastResult, 
  ForecastStep, 
  ShorelineRiskZone, 
  MetOceanTelemetry, 
  MapLayerState,
  SARDetectionResult 
} from '../types';
import { PRIMARY_INCIDENT, SINGLE_SPILL_INCIDENT } from '../data/mockData';
import { NavigationPage } from '../components/NavigationRail';

interface DashboardViewProps {
  incident: Incident;
  allIncidents?: Incident[];
  onSelectIncident?: (incident: Incident) => void;
  vessels: Vessel[];
  selectedVessel: Vessel | null;
  onSelectVessel: (vessel: Vessel | null) => void;
  hindcast: HindcastResult;
  forecastSteps: ForecastStep[];
  activeForecastStep: number;
  shorelineRisk: ShorelineRiskZone;
  metocean: MetOceanTelemetry;
  sarDetection: SARDetectionResult;
  layerState: MapLayerState;
  onToggleLayer: (layerKey: keyof MapLayerState) => void;
  onNavigate: (page: NavigationPage) => void;
  theme?: 'dark' | 'light';
}

// Helper to retrieve authentic commercial maritime ship photography
const getVesselPhotoUrl = (type?: string, name?: string): string => {
  const t = ((type || '') + ' ' + (name || '')).toLowerCase();
  if (t.includes('crude') || t.includes('star') || t.includes('oil') || t.includes('vessel a')) {
    return 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80';
  } else if (t.includes('chemical') || t.includes('product') || t.includes('gulf') || t.includes('voyager')) {
    return 'https://images.unsplash.com/photo-1506158669146-619067261a7f?auto=format&fit=crop&w=800&q=80';
  } else if (t.includes('bulk') || t.includes('horizon') || t.includes('cargo') || t.includes('vessel b') || t.includes('express')) {
    return 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80';
  } else {
    return 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
  }
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  incident,
  allIncidents = [],
  onSelectIncident,
  vessels,
  selectedVessel,
  onSelectVessel,
  hindcast,
  forecastSteps,
  activeForecastStep,
  shorelineRisk,
  metocean,
  sarDetection,
  layerState,
  onToggleLayer,
  onNavigate,
  theme = 'dark',
}) => {
  // Continuous 4D Simulation Offset in minutes: -360 min (-6h Entry) to -300 min (-5h Discharge) to 0 min (NOW / Detection) to +2880 min (+48h Forecast)
  const [timeOffsetMinutes, setTimeOffsetMinutes] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSARCompareModalOpen, setIsSARCompareModalOpen] = useState<boolean>(false);
  const [actions, setActions] = useState(shorelineRisk.immediateActions);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'attribution' | 'environment' | 'detection'>('attribution');
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(true);
  const [layoutMode, setLayoutMode] = useState<'map' | 'split' | 'briefing'>('split');
  const [layersDropdownOpen, setLayersDropdownOpen] = useState<boolean>(false);
  const [showNarrativeLog, setShowNarrativeLog] = useState<boolean>(false);

  const isDualSpillScenario = false;
  const activeVessel = selectedVessel || vessels[0];

  const toggleAction = (id: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  };

  // Playback timer simulation (loops smoothly from -360 min to +2880 min / +48h)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setTimeOffsetMinutes(prev => {
          if (prev >= 2880) return -360;
          return prev + 45;
        });
      }, 350);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying]);

  // Date and Time labels
  const baseDetectionDate = incident.detectedAt
    ? new Date(incident.detectedAt.includes('T') ? incident.detectedAt : '2026-09-07T04:32:00Z')
    : new Date('2026-09-07T04:32:00Z');
  const validBaseDate = isNaN(baseDetectionDate.getTime()) ? new Date('2026-09-07T04:32:00Z') : baseDetectionDate;
  const simulatedDate = new Date(validBaseDate.getTime() + timeOffsetMinutes * 60 * 1000);
  const timeString = simulatedDate.toISOString().slice(11, 19) + ' UTC';
  const dateString = simulatedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const offsetHours = (timeOffsetMinutes / 60).toFixed(1).replace('.0', '');

  let badgeText = 'NOW (T+0h)';
  let badgeStyle = 'bg-cyan-950/70 text-cyan-400 border-cyan-500/50 shadow-[0_0_6px_rgba(0,229,255,0.3)]';

  if (timeOffsetMinutes < -300) {
    badgeText = `${offsetHours}h (APPROACHING)`;
    badgeStyle = 'bg-slate-900/80 text-slate-400 border-slate-600/50';
  } else if (timeOffsetMinutes === -300) {
    badgeText = '-5h (RELEASE EVENT)';
    badgeStyle = 'bg-amber-950/80 text-amber-400 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
  } else if (timeOffsetMinutes < 0) {
    badgeText = `${offsetHours}h (DRIFTING)`;
    badgeStyle = 'bg-blue-950/70 text-blue-400 border-blue-500/50';
  } else if (timeOffsetMinutes === 0) {
    badgeText = 'NOW (SAR GROUND TRUTH)';
    badgeStyle = 'bg-cyan-950/70 text-cyan-400 border-cyan-500/50 shadow-[0_0_6px_rgba(0,229,255,0.3)]';
  } else if (timeOffsetMinutes <= 1440) {
    badgeText = `+${offsetHours}h (FORWARD DRIFT)`;
    badgeStyle = 'bg-emerald-950/70 text-emerald-400 border-emerald-500/50';
  } else {
    badgeText = `+${offsetHours}h (COASTAL THREAT)`;
    badgeStyle = 'bg-rose-950/70 text-rose-400 border-rose-500/50';
  }

  // Narrative phase calculation
  const v1Name = vessels[0]?.name || 'Target Vessel 1';
  const v2Name = vessels[1]?.name || 'Target Vessel 2';
  const targetVesselName = activeVessel?.name || v1Name;
  const origLatStr = hindcast?.originCoordinates ? hindcast.originCoordinates[0].toFixed(3) : '18.065';
  const origLngStr = hindcast?.originCoordinates ? hindcast.originCoordinates[1].toFixed(3) : '72.395';
  const dischargeTimeStr = hindcast?.dischargeWindowUtc ? hindcast.dischargeWindowUtc.split('–')[0].trim() : '02:47 UTC';

  let phaseTitle = isDualSpillScenario ? 'PHASE 3: DUAL PLUME ADVECTION & MERGING' : 'PHASE 3: OIL DRIFT & DISPERSION';
  let phaseDesc = isDualSpillScenario
    ? `Plume 1 (${v1Name}) and Plume 2 (${v2Name}) advect along ocean currents and coalesce into one unified slick.`
    : `${targetVesselName} transits away; oil slick expands and advects towards detected location. Hindcast particles back-calculate origin.`;
  let areaBadge = isDualSpillScenario ? 'Coalescing to 13.48 km²' : 'Advecting to 8.25 km²';
  let badgeColor = 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40';

  if (timeOffsetMinutes < -300) {
    phaseTitle = 'PHASE 1: PRE-INCIDENT TRANSIT';
    phaseDesc = isDualSpillScenario
      ? `${v1Name} and ${v2Name} navigate commercial transit lanes under normal passage (Clean Sea).`
      : `${targetVesselName} navigates commercial transit lane under normal passage (Clean Sea). No spill or anomaly observed.`;
    areaBadge = 'Clean Sea 0.00 km²';
    badgeColor = 'text-blue-400 border-blue-500/40 bg-blue-950/40';
  } else if (timeOffsetMinutes === -300) {
    phaseTitle = isDualSpillScenario ? 'PHASE 2: DUAL DISCHARGE EVENTS (-5h)' : 'PHASE 2: POINT-SOURCE DISCHARGE EVENT (-5h)';
    phaseDesc = isDualSpillScenario
      ? `${v1Name} reaches Origin #1 (02:47 UTC) & ${v2Name} reaches Origin #2 (02:35 UTC) discharging bilge waste overboard.`
      : `${targetVesselName} reaches origin coordinates (${origLatStr}°N, ${origLngStr}°E) at ${dischargeTimeStr} and discharges oily waste overboard.`;
    areaBadge = isDualSpillScenario ? 'Dual Plumes 1.50 km²' : 'Discharge Plume 0.75 km²';
    badgeColor = 'text-amber-400 border-amber-500/40 bg-amber-950/40';
  } else if (timeOffsetMinutes < 0) {
    const hindcastFrac = (timeOffsetMinutes + 300) / 300;
    const currentArea = (0.75 + (incident.slickAreaKm2 - 0.75) * hindcastFrac).toFixed(2);
    phaseTitle = isDualSpillScenario ? 'PHASE 3: DUAL PLUME ADVECTION & MERGING' : 'PHASE 3: OIL DRIFT & DISPERSION';
    phaseDesc = isDualSpillScenario
      ? 'Plume 1 (Amber/Orange) and Plume 2 (Violet) advect along metocean vectors, expand, and combine into a unified slick at t=0.'
      : `${targetVesselName} transits away; simulated oil plume advects from origin towards detection location. Lagrangian particles back-calculate origin.`;
    areaBadge = isDualSpillScenario ? `Merging to ${currentArea} km²` : `Advecting to ${currentArea} km²`;
    badgeColor = 'text-amber-400 border-amber-500/40 bg-amber-950/40';
  } else if (timeOffsetMinutes === 0) {
    phaseTitle = isDualSpillScenario ? 'PHASE 4: SAR DETECTION (MERGED SLICK)' : 'PHASE 4: SAR RADAR OBSERVATION';
    phaseDesc = isDualSpillScenario
      ? `Sentinel-1 SAR acquires 13.48 km² combined slick. Spatial deconvolution computes attribution for both responsible ships (91.7% & 76.4%).`
      : `Sentinel-1 C-SAR satellite acquires SAR image. High-confidence dark patch detected (${incident.confidencePercent}% IoU). ${targetVesselName} is co-located along transit vector.`;
    areaBadge = `Detected Slick ${incident.slickAreaKm2.toFixed(2)} km²`;
    badgeColor = 'text-red-400 border-red-500/40 bg-red-950/40';
  } else if (timeOffsetMinutes <= 1440) {
    const forecastFrac = timeOffsetMinutes / 1440;
    const projectedArea = (incident.slickAreaKm2 * (1.0 + 1.33 * forecastFrac)).toFixed(2);
    phaseTitle = 'PHASE 5: +24H FORWARD DRIFT & SHORELINE RISK';
    phaseDesc = `Lagrangian forward advection projects slick envelope towards Murud-Janjira fisheries. Coast Guard Tier-1 response initiated.`;
    areaBadge = `Projected Area ${projectedArea} km²`;
    badgeColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
  } else {
    const extraFrac = (timeOffsetMinutes - 1440) / 1440;
    const projectedArea = (incident.slickAreaKm2 * (2.33 + 1.14 * extraFrac)).toFixed(2);
    phaseTitle = 'PHASE 6: +48H LANDFALL CONTAINMENT & ICG INTERCEPTION';
    phaseDesc = `Heavy-duty containment booms pre-positioned along Rajpuri Creek. Interceptor craft C-432 on station with skimmers.`;
    areaBadge = `Landfall Buffer ${projectedArea} km²`;
    badgeColor = 'text-rose-400 border-rose-500/40 bg-rose-950/40';
  }

  // Count active layers
  const activeLayersCount = Object.values(layerState).filter(Boolean).length;

  // Inspector Content Component for reuse in split view and slide-over
  const renderInspector = () => (
    <aside className="h-full bg-slate-950 border-l border-slate-800/80 flex flex-col shrink-0 overflow-hidden transition-all duration-200">
      {/* Segmented Tab Bar */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between gap-1 shrink-0">
        <div className="flex items-center gap-1 flex-1">
          <button
            onClick={() => setActiveInspectorTab('attribution')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeInspectorTab === 'attribution'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Ship className="w-3.5 h-3.5" />
            <span>Attribution</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
              activeInspectorTab === 'attribution'
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'bg-slate-900 text-slate-500'
            }`}>
              {activeVessel.attributionScore}%
            </span>
          </button>

          <button
            onClick={() => setActiveInspectorTab('environment')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeInspectorTab === 'environment'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>MetOcean</span>
          </button>

          <button
            onClick={() => setActiveInspectorTab('detection')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeInspectorTab === 'detection'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Satellite className="w-3.5 h-3.5" />
            <span>SAR</span>
          </button>
        </div>

        {layoutMode === 'map' && (
          <button
            onClick={() => setInspectorOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab Content Container */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
        {/* TAB 1: ATTRIBUTION FORENSICS */}
        {activeInspectorTab === 'attribution' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Suspect Vessel Scenario Switcher (Dual vs Single) */}
            {isDualSpillScenario && vessels.length >= 2 && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    Dual-Source Suspects (2 Ships)
                  </span>
                  <span className="font-mono text-slate-500 text-[9px]">Select to inspect</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onSelectVessel(vessels[0])}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      activeVessel.id === vessels[0]?.id
                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-semibold text-rose-400">Plume #1</span>
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">
                        {vessels[0]?.attributionScore || 78.2}%
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-white truncate mt-1">{vessels[0]?.name || 'Suspect #1'}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">02:47 UTC</div>
                  </button>

                  <button
                    onClick={() => onSelectVessel(vessels[1])}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      activeVessel.id === vessels[1]?.id
                        ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-semibold text-purple-400">Plume #2</span>
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                        {vessels[1]?.attributionScore || 76.4}%
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-white truncate mt-1">{vessels[1]?.name || 'Suspect #2'}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">02:35 UTC</div>
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 flex items-center gap-1.5">
                  <span className="text-cyan-400 font-medium">Spatial Deconvolution:</span>
                  <span>Both vessels discharged along independent tracks and coalesced.</span>
                </div>
              </div>
            )}

            {/* Active Vessel Identity Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-white">{activeVessel.name}</h3>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span className="text-cyan-400">{activeVessel.type}</span>
                    <span>·</span>
                    <span className="font-mono">IMO {activeVessel.imo}</span>
                    <span>·</span>
                    <span>{activeVessel.flag}</span>
                  </div>
                </div>

                <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-medium uppercase ${
                  activeVessel.rank === 1
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                }`}>
                  {activeVessel.investigationPriority} Priority
                </span>
              </div>

              {/* Commercial Maritime Vessel Photo */}
              <div className="relative w-full h-28 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 group">
                <img 
                  src={getVesselPhotoUrl(activeVessel.type, activeVessel.name)} 
                  alt={activeVessel.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80';
                  }}
                  className="w-full h-full object-cover contrast-105 saturate-100 group-hover:scale-102 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono">
                  <span className="bg-slate-950/80 px-2 py-0.5 rounded text-slate-300">
                    MMSI: {activeVessel.mmsi}
                  </span>
                  <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 font-medium">
                    Co-Located
                  </span>
                </div>
              </div>

              {/* Vessel Telemetry 2x2 grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Current Pos</span>
                  <span className="font-mono text-slate-200 font-medium text-[11px] tabular-nums">
                    {activeVessel.currentCoordinates[0]}°N, {activeVessel.currentCoordinates[1]}°E
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Speed & Heading</span>
                  <span className="font-mono text-slate-200 font-medium text-[11px] tabular-nums">
                    {activeVessel.currentSpeedKt} kn · {activeVessel.currentHeadingDeg}°
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Distance to Origin</span>
                  <span className="font-mono text-emerald-400 font-medium text-[11px] tabular-nums">
                    {activeVessel.distanceFromOriginKm} km
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Destination</span>
                  <span className="text-slate-300 text-[11px] truncate block font-medium">
                    {activeVessel.destination}
                  </span>
                </div>
              </div>
            </div>

            {/* Composite Attribution Ranking Score */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Attribution Score
                </span>
                <span className="text-2xl font-bold font-mono text-cyan-400">
                  {activeVessel.attributionScore}%
                </span>
              </div>

              {/* Evidence Breakdown Bars */}
              <div className="space-y-2 pt-1">
                {[
                  { label: 'Origin Proximity', score: activeVessel.proximityScore, barColor: 'bg-emerald-400' },
                  { label: 'Trajectory Alignment', score: activeVessel.trajectoryScore, barColor: 'bg-cyan-400' },
                  { label: 'Discharge Window Sync', score: activeVessel.temporalScore, barColor: 'bg-blue-400' },
                  { label: 'AIS Continuity', score: activeVessel.aisAnomalyScore, barColor: 'bg-amber-400' },
                  { label: 'Speed Drop Anomaly', score: activeVessel.behavioralAnomalyScore, barColor: 'bg-rose-400' }
                ].map(ev => (
                  <div key={ev.label} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">{ev.label}</span>
                      <span className="text-slate-200 font-mono tabular-nums font-semibold">{ev.score}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800/80">
                      <div
                        className={`h-full ${ev.barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${ev.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reconstructed Vessel Activity Timeline */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-400 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-200">Activity Chronology</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">UTC</span>
              </div>

              <div className="relative pl-3 border-l border-slate-800 space-y-2.5 py-1">
                {activeVessel.activityTimeline.map((item, index) => (
                  <div key={index} className="relative">
                    <div
                      className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full ${
                        item.isAnomaly
                          ? 'bg-rose-400'
                          : index === 0
                          ? 'bg-emerald-400'
                          : 'bg-cyan-400'
                      }`}
                    />
                    <div className="text-[10px] text-slate-500 font-mono">{item.timestampUtc}</div>
                    <div className={`text-[11px] mt-0.5 leading-snug ${item.isAnomaly ? 'text-rose-400 font-medium' : 'text-slate-300'}`}>
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compact Candidate Vessels in Sector */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Other Candidate Vessels
              </div>
              {vessels.filter(v => v.id !== activeVessel.id).slice(0, 2).map(other => (
                <button
                  key={other.id}
                  onClick={() => onSelectVessel(other)}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between text-xs transition-colors cursor-pointer"
                >
                  <div>
                    <span className="font-medium text-slate-200">{other.name}</span>
                    <span className="text-[10px] text-slate-500 block">{other.type} · {other.distanceFromOriginKm} km</span>
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-400">
                    {other.attributionScore}%
                  </span>
                </button>
              ))}
            </div>

            {/* Primary Action Button */}
            <div className="pt-1">
              <button
                onClick={() => onNavigate('reports')}
                className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-950" />
                <span>Export Investigation Dossier</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ENVIRONMENT & METOCEAN FORCING */}
        {activeInspectorTab === 'environment' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* MetOcean Forcing Cards */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Live MetOcean Telemetry</span>
                <span className="text-[10px] font-mono text-cyan-400">Open-Meteo GFS</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Wind (10m)</span>
                  <span className="font-mono font-semibold text-white text-sm">{metocean.windSpeedKt} kt</span>
                  <span className="text-cyan-400 text-[10px] ml-1">{metocean.windDirectionCard}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Surface Current</span>
                  <span className="font-mono font-semibold text-white text-sm">{metocean.currentSpeedKt} kt</span>
                  <span className="text-cyan-400 text-[10px] ml-1">{metocean.currentDirectionCard}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Wave Height</span>
                  <span className="font-mono font-semibold text-white text-sm">{metocean.waveHeightM} m</span>
                  <span className="text-slate-400 text-[10px] ml-1">Swell</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Net Drift</span>
                  <span className="font-mono font-semibold text-emerald-400 text-sm">{metocean.netDriftSpeedKt} kt</span>
                  <span className="text-slate-400 text-[10px] ml-1">Lagrangian</span>
                </div>
              </div>
            </div>

            {/* Shoreline Impact & Asset Risk */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Shoreline Impact Risk</span>
                <span className="text-[10px] font-mono text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 font-semibold">
                  ETA ~{shorelineRisk.projectedEtaHours}h
                </span>
              </div>

              <div>
                <div className="font-semibold text-white text-xs">{shorelineRisk.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Distance: <span className="font-mono text-white">{shorelineRisk.distanceOffshoreKm} km</span> · Vulnerability: <span className="font-mono text-amber-400 font-semibold">EVT {shorelineRisk.vulnerabilityIndex}/10</span>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Response Checklist:</div>
                {actions.map(act => (
                  <div
                    key={act.id}
                    onClick={() => toggleAction(act.id)}
                    className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-300 hover:text-white transition-colors"
                  >
                    <div className="mt-0.5 shrink-0">
                      {act.completed ? (
                        <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </div>
                    <span className={act.completed ? 'line-through text-slate-500' : 'text-slate-200'}>
                      {act.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SAR DETECTION TELEMETRY */}
        {activeInspectorTab === 'detection' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">SAR Segmentation</span>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold">94.7% IoU</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Centroid:</span>
                  <span className="font-mono text-cyan-400 tabular-nums">18.112°N, 72.464°E</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Slick Area:</span>
                  <span className="font-mono text-rose-400 tabular-nums font-semibold">{incident.slickAreaKm2} km²</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Perimeter:</span>
                  <span className="font-mono text-slate-200 tabular-nums">{incident.slickPerimeterKm} km</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Sensor:</span>
                  <span className="text-slate-200">{incident.sensor}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Classification:</span>
                  <span className="text-cyan-400 font-medium">{incident.classification}</span>
                </div>
              </div>

              <button
                onClick={() => setIsSARCompareModalOpen(true)}
                className="w-full mt-1 py-2 px-3 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-cyan-400 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Compare SAR AI Mask</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#0B1523] border border-[#162D4A] space-y-1.5 text-xs">
              <div className="font-semibold text-white">Radar Damping Physics</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Mineral oil dampens short capillary and gravity-capillary waves, creating stark dark patches on C-band synthetic aperture radar imagery.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );

  // Streamlined 4D Simulation Time Dock Component
  const renderTimeDock = () => (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 shadow-xl space-y-2">
      {/* Compact Top Row: Play/Pause, Scrubber, Time Readout */}
      <div className="flex items-center gap-2.5 text-xs">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-7 h-7 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center font-bold transition-all active:scale-95 shadow-xs cursor-pointer shrink-0"
          title={isPlaying ? 'Pause Simulation' : 'Play 4D Lagrangian Reconstruction (-5h to +48h)'}
        >
          {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
        </button>

        {/* Milestone Quick Jump Buttons */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
          <button
            onClick={() => setTimeOffsetMinutes(-300)}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              timeOffsetMinutes === -300 ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'text-slate-400 hover:text-white'
            }`}
            title="Discharge Event (-5h)"
          >
            -5h
          </button>
          <button
            onClick={() => setTimeOffsetMinutes(0)}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              timeOffsetMinutes === 0 ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
            title="SAR Detection (NOW / T=0)"
          >
            T=0
          </button>
          <button
            onClick={() => setTimeOffsetMinutes(1440)}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              timeOffsetMinutes >= 1400 && timeOffsetMinutes <= 1500 ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' : 'text-slate-400 hover:text-white'
            }`}
            title="+24h Threat"
          >
            +24h
          </button>
          <button
            onClick={() => setTimeOffsetMinutes(2880)}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              timeOffsetMinutes >= 2800 ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40' : 'text-slate-400 hover:text-white'
            }`}
            title="+48h Coastal Landfall"
          >
            +48h
          </button>
        </div>

        {/* Range Scrubber */}
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min="-360"
            max="2880"
            step="15"
            value={timeOffsetMinutes}
            onChange={(e) => setTimeOffsetMinutes(Number(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Time and Phase readout badge */}
        <div className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-200 shrink-0 flex items-center gap-1.5">
          <span className="text-cyan-400 font-medium">{timeString}</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
            {badgeText}
          </span>
        </div>

        {/* Toggle Narrative Description drawer */}
        <button
          onClick={() => setShowNarrativeLog(!showNarrativeLog)}
          className={`p-1 rounded-md border text-xs transition-colors cursor-pointer shrink-0 ${
            showNarrativeLog ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle 4D Mission Event Log"
        >
          <Info className="w-3 h-3" />
        </button>
      </div>

      {/* Expandable Mission Narrative Bar */}
      {showNarrativeLog && (
        <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
            <span className="text-cyan-300 font-medium font-mono text-[11px] shrink-0">{phaseTitle} —</span>
            <span className="text-slate-400 text-[11px] truncate">{phaseDesc}</span>
          </div>
          <div className="px-2 py-0.5 rounded border border-slate-800 bg-slate-950 text-[10px] font-mono text-cyan-400 shrink-0">
            {areaBadge}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full h-[calc(100vh-3rem)] flex flex-col bg-[#050B14] overflow-hidden font-sans text-slate-100 select-none transition-colors duration-200">
      {/* ========================================================================= */}
      {/* STREAMLINED TOP TACTICAL CONTROL BAR */}
      {/* ========================================================================= */}
      <div className="h-11 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 flex items-center justify-between text-xs shrink-0 z-20 gap-3">
        {/* Left: Scenario Toggle + Layout Selector */}
        <div className="flex items-center gap-2.5 overflow-x-auto custom-scrollbar py-1">
          {/* Scenario Mode Segmented Switcher */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => {
                const dualInc = allIncidents.find(i => i.id === 'OCN-042' || (!i.name.includes('Single') && i.id !== 'OCN-043')) || PRIMARY_INCIDENT;
                if (onSelectIncident) onSelectIncident(dualInc);
              }}
              className={`px-2.5 py-1 rounded-md text-[10.5px] font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                isDualSpillScenario
                  ? 'bg-cyan-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Simulate 2 ships discharging independently and coalescing into one slick"
            >
              <span>🛰️ Dual Ship</span>
            </button>
            <button
              onClick={() => {
                const singleInc = allIncidents.find(i => i.id === 'OCN-043' || i.name.includes('Single')) || SINGLE_SPILL_INCIDENT;
                if (onSelectIncident) onSelectIncident(singleInc);
              }}
              className={`px-2.5 py-1 rounded-md text-[10.5px] font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                !isDualSpillScenario
                  ? 'bg-cyan-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Simulate 1 ship discharging at origin and forecasting forward"
            >
              <span>🎯 Single Ship</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800 shrink-0" />
          {/* Clean Layout Switcher */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => { setLayoutMode('map'); setInspectorOpen(false); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'map'
                  ? 'bg-cyan-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Full canvas interactive nautical GIS map"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Map Focus</span>
            </button>
            <button
              onClick={() => { setLayoutMode('split'); setInspectorOpen(true); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'split'
                  ? 'bg-cyan-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Side-by-side tactical map & forensic intelligence"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
            <button
              onClick={() => { setLayoutMode('briefing'); setInspectorOpen(true); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'briefing'
                  ? 'bg-cyan-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Executive briefing command dashboard with top KPI metrics"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Briefing Grid</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800 shrink-0" />

          {/* Clean Layers Popover Button */}
          <div className="relative">
            <button
              onClick={() => setLayersDropdownOpen(!layersDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                layersDropdownOpen
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
              title="Configure Active Geospatial Layers"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Layers</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                {activeLayersCount}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${layersDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Floating Layers Dropdown Menu */}
            {layersDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 text-xs backdrop-blur-xl animate-in fade-in space-y-1">
                <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800 mb-1 flex items-center justify-between">
                  <span>Geospatial Layers</span>
                  <button
                    onClick={() => setLayersDropdownOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {[
                  { key: 'oilSlicks', label: 'Oil Slick (SAR)', color: 'text-rose-400' },
                  { key: 'aisVessels', label: 'AIS Vessels', color: 'text-cyan-400' },
                  { key: 'vesselTracks', label: 'AIS Navigation Tracks', color: 'text-violet-400' },
                  { key: 'hindcastTrajectory', label: 'Lagrangian Hindcast (-5h)', color: 'text-blue-400' },
                  { key: 'forecastCone', label: 'Drift Forecast (+48h)', color: 'text-emerald-400' },
                  { key: 'shorelineRisk', label: 'Shoreline Threat Zone', color: 'text-amber-400' },
                  { key: 'temporalValidation', label: 'Temporal Validation Engine', color: 'text-cyan-300' }
                ].map(layer => {
                  const isEnabled = layerState[layer.key as keyof MapLayerState];
                  return (
                    <button
                      key={layer.key}
                      onClick={() => onToggleLayer(layer.key as keyof MapLayerState)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 text-left transition-colors cursor-pointer"
                    >
                      <span className={isEnabled ? `${layer.color} font-medium` : 'text-slate-400'}>
                        {layer.label}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]' : 'bg-slate-700'}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Coordinates & Inspector Toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-slate-400 font-mono text-[11px] bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
            <span className="text-cyan-400 font-medium">18.112°N, 72.464°E</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300 font-sans">{incident.locationName}</span>
          </div>

          <button
            onClick={() => setInspectorOpen(!inspectorOpen)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-medium transition-all shadow-xs cursor-pointer ${
              inspectorOpen
                ? 'bg-slate-900 text-cyan-300 border-cyan-500/30 hover:bg-slate-800'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
            title={inspectorOpen ? 'Collapse inspector panel' : 'Open intelligence inspector'}
          >
            {inspectorOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{inspectorOpen ? 'Hide Forensics' : 'Show Forensics'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE BRIEFING KPI CARDS (Only displayed in Briefing Mode) */}
      {/* ========================================================================= */}
      {layoutMode === 'briefing' && (
        <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 py-2.5 shrink-0 animate-in fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* KPI 1: Primary Culprit Vessel */}
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">PRIMARY SUSPECT</span>
                <span className="text-sm font-bold text-white font-mono mt-0.5 block truncate">{activeVessel.name}</span>
                <span className="text-[10px] text-rose-400 font-medium">Rank #1 · {activeVessel.type}</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-mono font-bold text-cyan-400">{activeVessel.attributionScore}%</span>
                <span className="text-[9px] text-slate-400 uppercase block font-mono">Attribution</span>
              </div>
            </div>

            {/* KPI 2: Satellite Slick Anomaly */}
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">RADAR DETECTED SLICK</span>
                <span className="text-sm font-bold text-white font-mono mt-0.5 block">{incident.slickAreaKm2} km²</span>
                <span className="text-[10px] text-slate-400">Sentinel-1 C-SAR IW</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-mono font-bold text-emerald-400">94.7%</span>
                <span className="text-[9px] text-slate-400 uppercase block font-mono">IoU Confidence</span>
              </div>
            </div>

            {/* KPI 3: Coastal Vulnerability */}
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">SHORELINE THREAT</span>
                <span className="text-sm font-bold text-white mt-0.5 block truncate">{shorelineRisk.name.split(',')[0]}</span>
                <span className="text-[10px] text-amber-400 font-medium">{shorelineRisk.distanceOffshoreKm} km offshore</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-mono font-bold text-amber-400">~{shorelineRisk.projectedEtaHours}h</span>
                <span className="text-[9px] text-slate-400 uppercase block font-mono">Impact ETA</span>
              </div>
            </div>

            {/* KPI 4: MetOcean Advection */}
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">METOCEAN FORCING</span>
                <span className="text-sm font-bold text-white font-mono mt-0.5 block">{metocean.netDriftSpeedKt} kt</span>
                <span className="text-[10px] text-cyan-400 font-medium">Vector: 058° ENE</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-200 block">{metocean.windSpeedKt} kt Wind</span>
                <span className="text-xs font-mono font-bold text-cyan-400 block">{metocean.currentSpeedKt} kt Current</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN VIEWPORT BODY ACCORDING TO SELECTED LAYOUT */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* MAP CANVAS VIEWPORT */}
        <div className={`flex flex-col relative h-full transition-all duration-300 ${
          layoutMode === 'split' && inspectorOpen ? 'w-[58%]' : (layoutMode === 'briefing' ? 'w-[58%]' : 'w-full')
        }`}>
          <div className="flex-1 relative w-full h-full min-h-0">
            <MapWorkspace
              incident={incident}
              vessels={vessels}
              selectedVessel={selectedVessel}
              onSelectVessel={onSelectVessel}
              hindcast={hindcast}
              forecastSteps={forecastSteps}
              activeForecastStep={activeForecastStep}
              shorelineRisk={shorelineRisk}
              metocean={metocean}
              currentTimeSimulationMinutes={timeOffsetMinutes}
              layerState={layerState}
              onToggleLayer={onToggleLayer}
              onOpenSlickDetails={() => setIsSARCompareModalOpen(true)}
              theme={theme}
            />
          </div>

          {/* Floating Time Dock */}
          {renderTimeDock()}
        </div>

        {/* SPLIT / BRIEFING MODE SIDEBAR INSPECTOR */}
        {(layoutMode === 'split' || layoutMode === 'briefing') && inspectorOpen && (
          <div className="w-[42%] h-full flex flex-col min-w-0 transition-all duration-300">
            {renderInspector()}
          </div>
        )}

        {/* MAP FOCUS OVERLAY DRAWER (When inspector is toggled in Map mode) */}
        {layoutMode === 'map' && inspectorOpen && (
          <div className="absolute right-0 top-0 bottom-0 w-96 lg:w-[420px] z-30 shadow-2xl animate-in slide-in-from-right-4">
            {renderInspector()}
          </div>
        )}
      </div>

      {/* SAR COMPARISON MODAL */}
      <EvidenceCompareModal
        isOpen={isSARCompareModalOpen}
        onClose={() => setIsSARCompareModalOpen(false)}
        detectionData={sarDetection}
      />
    </div>
  );
};
