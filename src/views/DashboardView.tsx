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
  Sliders,
  ChevronRight,
  FileText,
  Waves,
  Navigation,
  PanelRightClose,
  PanelRightOpen,
  Layers,
  AlertTriangle
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
    // Commercial Crude Oil Tanker underway at sea with wake
    return 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80';
  } else if (t.includes('chemical') || t.includes('product') || t.includes('gulf') || t.includes('voyager')) {
    // Chemical/Product Tanker navigating open ocean
    return 'https://images.unsplash.com/photo-1506158669146-619067261a7f?auto=format&fit=crop&w=800&q=80';
  } else if (t.includes('bulk') || t.includes('horizon') || t.includes('cargo') || t.includes('vessel b') || t.includes('express')) {
    // Deepwater Bulk Carrier / Ocean Freighter
    return 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80';
  } else {
    // Commercial Merchant Vessel
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

  const isDualSpillScenario = incident.id === 'OCN-042' || (!incident.name.includes('Single') && incident.id !== 'OCN-043' && !incident.id.includes('043'));

  // Active vessel defaults to selected or #1 ranked suspect
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

  return (
    <div className="w-full h-[calc(100vh-3rem)] flex bg-[#050B14] overflow-hidden font-sans text-slate-100 select-none transition-colors duration-200">
      {/* ========================================================================= */}
      {/* MAIN VIEWPORT: EXPANSIVE HERO MAP */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Top Floating/Sticky Operational Toolbar */}
        <div className="h-11 bg-[#070F1D]/95 backdrop-blur-md border-b border-[#162D4A] px-4 flex items-center justify-between text-xs shrink-0 z-10 gap-2">
          {/* Left: Scenario Switcher & Layer Chips */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
            {/* Scenario Mode Segmented Switcher */}
            <div className="flex items-center bg-[#050B14] p-0.5 rounded-lg border border-[#162D4A] shrink-0 mr-1">
              <button
                onClick={() => {
                  const dualInc = allIncidents.find(i => i.id === 'OCN-042' || (!i.name.includes('Single') && i.id !== 'OCN-043')) || PRIMARY_INCIDENT;
                  if (onSelectIncident) onSelectIncident(dualInc);
                }}
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isDualSpillScenario
                    ? 'bg-[#00E5FF] text-[#050B14] shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Simulate 2 ships discharging independently and coalescing into one slick"
              >
                <span>🛰️ 2-Spills Merged (2 Ships)</span>
              </button>
              <button
                onClick={() => {
                  const singleInc = allIncidents.find(i => i.id === 'OCN-043' || i.name.includes('Single')) || SINGLE_SPILL_INCIDENT;
                  if (onSelectIncident) onSelectIncident(singleInc);
                }}
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  !isDualSpillScenario
                    ? 'bg-[#00E5FF] text-[#050B14] shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Simulate 1 ship discharging at origin and forecasting forward"
              >
                <span>🎯 1-Spill Point-Source (1 Ship)</span>
              </button>
            </div>

            <div className="h-4 w-px bg-[#162D4A] shrink-0" />

            {/* Oil Slick (SAR) */}
            <button
              onClick={() => onToggleLayer('oilSlicks')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-xs border cursor-pointer shrink-0 ${
                layerState.oilSlicks
                  ? 'bg-[#2A0E13] text-[#EF4444] border-[#EF4444]/60 font-semibold shadow-[0_0_10px_rgba(239,68,68,0.25)]'
                  : 'bg-[#0B1523] text-slate-400 border-[#162D4A] hover:text-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${layerState.oilSlicks ? 'bg-[#EF4444] shadow-[0_0_6px_#EF4444]' : 'bg-slate-500'}`} />
              <span>Oil Slick (SAR)</span>
            </button>

            {/* AIS Vessels */}
            <button
              onClick={() => onToggleLayer('aisVessels')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-xs border cursor-pointer shrink-0 ${
                layerState.aisVessels
                  ? 'bg-[#072533] text-[#00E5FF] border-[#00E5FF]/60 font-semibold shadow-[0_0_10px_rgba(0,229,255,0.25)]'
                  : 'bg-[#0B1523] text-slate-400 border-[#162D4A] hover:text-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${layerState.aisVessels ? 'bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]' : 'bg-slate-500'}`} />
              <span>AIS Vessels</span>
            </button>

            {/* Navigation Paths */}
            <button
              onClick={() => onToggleLayer('vesselTracks')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-xs border cursor-pointer ${
                layerState.vesselTracks
                  ? 'bg-[#1F1338] text-[#C084FC] border-[#8B5CF6]/60 font-semibold shadow-[0_0_10px_rgba(139,92,246,0.25)]'
                  : 'bg-[#0B1523] text-slate-400 border-[#162D4A] hover:text-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${layerState.vesselTracks ? 'bg-[#8B5CF6] shadow-[0_0_6px_#8B5CF6]' : 'bg-slate-500'}`} />
              <span>Navigation Paths</span>
            </button>

            {/* Hindcast (-5h) */}
            <button
              onClick={() => onToggleLayer('hindcastTrajectory')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-xs border cursor-pointer ${
                layerState.hindcastTrajectory
                  ? 'bg-[#0B1E38] text-[#60A5FA] border-[#3B82F6]/60 font-semibold shadow-[0_0_10px_rgba(59,130,246,0.25)]'
                  : 'bg-[#0B1523] text-slate-400 border-[#162D4A] hover:text-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${layerState.hindcastTrajectory ? 'bg-[#3B82F6] shadow-[0_0_6px_#3B82F6]' : 'bg-slate-500'}`} />
              <span>Hindcast (-5h)</span>
            </button>

            {/* Forecast (+48h) */}
            <button
              onClick={() => onToggleLayer('forecastCone')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-xs border cursor-pointer ${
                layerState.forecastCone
                  ? 'bg-[#082820] text-[#34D399] border-[#10B981]/60 font-semibold shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                  : 'bg-[#0B1523] text-slate-400 border-[#162D4A] hover:text-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${layerState.forecastCone ? 'bg-[#10B981] shadow-[0_0_6px_#10B981]' : 'bg-slate-500'}`} />
              <span>Forecast (+48h)</span>
            </button>

            {/* Shoreline Risk */}
            <button
              onClick={() => onToggleLayer('shorelineRisk')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-xs border cursor-pointer ${
                layerState.shorelineRisk
                  ? 'bg-[#2D1B06] text-[#FBBF24] border-[#F59E0B]/60 font-semibold shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                  : 'bg-[#0B1523] text-slate-400 border-[#162D4A] hover:text-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${layerState.shorelineRisk ? 'bg-[#F59E0B] shadow-[0_0_6px_#F59E0B]' : 'bg-slate-500'}`} />
              <span>Shoreline Risk</span>
            </button>

            {/* Temporal Validation Engine Debug Toggle */}
            <button
              onClick={() => onToggleLayer('temporalValidation')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-xs border cursor-pointer shrink-0 ${
                layerState.temporalValidation
                  ? 'bg-[#06242B] text-cyan-300 border-cyan-400/80 font-bold shadow-[0_0_12px_rgba(0,229,255,0.4)] ring-1 ring-cyan-400/40'
                  : 'bg-[#0B1523] text-slate-400 border-[#162D4A] hover:text-cyan-300'
              }`}
              title="Toggle real-time causal temporal integrity validation engine"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${layerState.temporalValidation ? 'bg-[#00E5FF] shadow-[0_0_8px_#00E5FF] animate-pulse' : 'bg-slate-500'}`} />
              <span>⏱️ Temporal Validation</span>
            </button>
          </div>

          {/* Center Coordinates & Inspector Toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-slate-400 font-mono text-[11px]">
              <span className="text-cyan-400 font-semibold">18.112°N, 72.464°E</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-200 font-sans font-medium">{incident.locationName}</span>
            </div>

            <button
              onClick={() => setInspectorOpen(!inspectorOpen)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-medium transition-all shadow-xs cursor-pointer ${
                inspectorOpen
                  ? 'bg-[#0B1523] text-cyan-400 border-[#00E5FF]/40 hover:bg-[#0E1B2C]'
                  : 'bg-[#0B1523] text-slate-300 border-[#162D4A] hover:bg-[#0E1B2C] hover:text-white'
              }`}
              title={inspectorOpen ? 'Collapse inspector panel' : 'Open intelligence inspector'}
            >
              {inspectorOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{inspectorOpen ? 'Hide Panel' : 'Inspect Forensics'}</span>
            </button>
          </div>
        </div>

        {/* The Map Workspace Hero Viewport */}
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

        {/* Floating Bottom Time Simulation Dock */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-4xl bg-[#070F1D]/95 backdrop-blur-md border border-[#162D4A] rounded-xl px-5 py-2.5 shadow-2xl shadow-black/80 space-y-2">
          {/* Header & 4D Digital Twin Milestones */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#162D4A]/60 pb-1.5">
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping" />
                4D DIGITAL TWIN RECONSTRUCTION
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300 font-semibold">PROOF OF DISCHARGE TRANSIT</span>
            </div>

            {/* Quick Milestone Navigation Buttons matching reference image */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-slate-400 font-bold mr-0.5">MILESTONES:</span>
              <button
                onClick={() => setTimeOffsetMinutes(-360)}
                className={`px-2 py-0.5 rounded border text-[10px] transition-all cursor-pointer ${
                  timeOffsetMinutes < -300 ? 'bg-blue-900/70 text-blue-300 border-blue-400 font-bold shadow-[0_0_8px_rgba(59,130,246,0.4)]' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                01:42 Entry (Clean Sea)
              </button>
              <button
                onClick={() => setTimeOffsetMinutes(-300)}
                className={`px-2 py-0.5 rounded border text-[10px] transition-all cursor-pointer ${
                  timeOffsetMinutes === -300 ? 'bg-amber-900/80 text-amber-300 border-amber-400 font-black shadow-[0_0_10px_rgba(245,158,11,0.6)]' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                ● 02:47 RELEASE EVENT
              </button>
              <button
                onClick={() => setTimeOffsetMinutes(0)}
                className={`px-2 py-0.5 rounded border text-[10px] transition-all cursor-pointer ${
                  timeOffsetMinutes === 0 ? 'bg-cyan-900/80 text-cyan-300 border-cyan-400 font-black shadow-[0_0_10px_rgba(0,229,255,0.6)]' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                ● 04:32 SAR OBSERVATION
              </button>
              <button
                onClick={() => setTimeOffsetMinutes(1440)}
                className={`px-2 py-0.5 rounded border text-[10px] transition-all cursor-pointer ${
                  timeOffsetMinutes >= 1400 && timeOffsetMinutes <= 1500 ? 'bg-emerald-900/80 text-emerald-300 border-emerald-400 font-black shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                +24h Coastal Threat
              </button>
              <button
                onClick={() => setTimeOffsetMinutes(2880)}
                className={`px-2 py-0.5 rounded border text-[10px] transition-all cursor-pointer ${
                  timeOffsetMinutes >= 2800 ? 'bg-rose-900/80 text-rose-300 border-rose-400 font-black shadow-[0_0_10px_rgba(244,63,94,0.6)]' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                +48h Landfall & ICG
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3.5 text-xs">
            {/* Round Cyan Play Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-full bg-[#00E5FF] hover:bg-[#33EAFF] text-[#050B14] flex items-center justify-center font-bold transition-all active:scale-95 shadow-[0_0_12px_rgba(0,229,255,0.45)] cursor-pointer shrink-0"
              title={isPlaying ? 'Pause Simulation' : 'Play 4D Lagrangian Reconstruction (-5h to +48h)'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            <span className="text-[11px] font-mono text-cyan-300 font-bold px-2 py-0.5 rounded bg-[#0B1523] border border-[#162D4A] shrink-0">
              1x
            </span>

            {/* Timeline Scrubber */}
            <div className="flex-1 flex items-center gap-2.5">
              <span className="text-[10px] font-mono text-blue-400 font-bold shrink-0">
                -6h
              </span>

              <div className="flex-1 relative flex items-center">
                <input
                  type="range"
                  min="-360"
                  max="2880"
                  step="15"
                  value={timeOffsetMinutes}
                  onChange={(e) => setTimeOffsetMinutes(Number(e.target.value))}
                  className="w-full h-2 bg-[#162D4A] rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
                />
                {/* Probable Origin Discharge marker tick at -300 minutes */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3.5 bg-amber-400 rounded-xs pointer-events-none shadow-[0_0_6px_#F59E0B] z-10"
                  style={{ left: `${((360 - 300) / (360 + 2880)) * 100}%` }}
                  title="Probable Discharge Event (-5h / 02:47 UTC)"
                />
                {/* Center / NOW marker tick at 0 minutes */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 bg-cyan-400 rounded-xs pointer-events-none shadow-[0_0_8px_#00E5FF] z-10"
                  style={{ left: `${(360 / (360 + 2880)) * 100}%` }}
                  title="Satellite Detection Moment (NOW / T+0h)"
                />
                {/* +24h Coastal Threat marker tick */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-emerald-400 rounded-xs pointer-events-none shadow-[0_0_6px_#10B981] z-10"
                  style={{ left: `${((360 + 1440) / (360 + 2880)) * 100}%` }}
                  title="+24h Coastal Threat Horizon"
                />
                {/* +48h Landfall marker tick */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3.5 bg-rose-400 rounded-xs pointer-events-none shadow-[0_0_6px_#F43F5E] z-10"
                  style={{ left: `99.5%` }}
                  title="+48h Shoreline Landfall & Interceptor Waypoint"
                />
              </div>

              <span className="text-[10px] font-mono text-rose-400 font-bold shrink-0">
                +48h
              </span>
            </div>

            {/* Timestamp card */}
            {(() => {
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
                badgeText = `${offsetHours}h (APPROACHING ORIGIN)`;
                badgeStyle = 'bg-slate-900/80 text-slate-400 border-slate-600/50';
              } else if (timeOffsetMinutes === -300) {
                badgeText = '-5h (DISCHARGE ORIGIN)';
                badgeStyle = 'bg-amber-950/80 text-amber-400 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
              } else if (timeOffsetMinutes < 0) {
                badgeText = `${offsetHours}h (DRIFTING)`;
                badgeStyle = 'bg-blue-950/70 text-blue-400 border-blue-500/50';
              } else if (timeOffsetMinutes === 0) {
                badgeText = 'NOW (SAR DETECTION)';
                badgeStyle = 'bg-cyan-950/70 text-cyan-400 border-cyan-500/50 shadow-[0_0_6px_rgba(0,229,255,0.3)]';
              } else if (timeOffsetMinutes <= 1440) {
                badgeText = `+${offsetHours}h (FORECAST)`;
                badgeStyle = 'bg-emerald-950/70 text-emerald-400 border-emerald-500/50';
              } else {
                badgeText = `+${offsetHours}h (COASTAL LANDFALL)`;
                badgeStyle = 'bg-rose-950/70 text-rose-400 border-rose-500/50';
              }

              return (
                <div className="px-3 py-1 rounded bg-[#0B1523] border border-[#162D4A] font-mono text-xs text-slate-200 shrink-0 flex items-center gap-2">
                  <span className="text-cyan-400 font-bold">{timeString}</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-300 font-medium">{dateString}</span>
                  <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded border ${badgeStyle}`}>
                    {badgeText}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Dynamic Narrative Phase Bar matching Reference Screenshot */}
          {(() => {
            const isDual = isDualSpillScenario;
            const targetVesselName = activeVessel?.name || vessels[0]?.name || 'MT Ocean Star';
            const origLatStr = hindcast?.originCoordinates ? hindcast.originCoordinates[0].toFixed(3) : '18.065';
            const origLngStr = hindcast?.originCoordinates ? hindcast.originCoordinates[1].toFixed(3) : '72.395';
            const dischargeTimeStr = hindcast?.dischargeWindowUtc ? hindcast.dischargeWindowUtc.split('–')[0].trim() : '02:47 UTC';

            let phaseTitle = isDual ? 'PHASE 3: DUAL PLUME ADVECTION & MERGING' : 'PHASE 3: OIL DRIFT & DISPERSION';
            let phaseDesc = isDual
              ? 'Plume 1 (MT Ocean Star) and Plume 2 (Gulf Voyager) advect along ocean currents and coalesce into one unified slick.'
              : `${targetVesselName} transits away; oil slick expands and advects towards detected location. Hindcast particles back-calculate origin.`;
            let areaBadge = isDual ? 'Coalescing to 13.48 km²' : 'Advecting to 8.25 km²';
            let badgeColor = 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40';

            if (timeOffsetMinutes < -300) {
              phaseTitle = 'PHASE 1: PRE-INCIDENT TRANSIT';
              phaseDesc = isDual
                ? 'MT Ocean Star (125° SE) and Gulf Voyager (310° NW) navigate commercial transit lanes under normal passage (Clean Sea).'
                : `${targetVesselName} navigates commercial transit lane under normal passage (Clean Sea). No spill or anomaly observed.`;
              areaBadge = 'Clean Sea 0.00 km²';
              badgeColor = 'text-blue-400 border-blue-500/40 bg-blue-950/40';
            } else if (timeOffsetMinutes === -300) {
              phaseTitle = isDual ? 'PHASE 2: DUAL DISCHARGE EVENTS (-5h)' : 'PHASE 2: POINT-SOURCE DISCHARGE EVENT (-5h)';
              phaseDesc = isDual
                ? 'MT Ocean Star reaches Origin #1 (02:47 UTC) & Gulf Voyager reaches Origin #2 (02:35 UTC) discharging bilge waste overboard.'
                : `${targetVesselName} reaches origin coordinates (${origLatStr}°N, ${origLngStr}°E) at ${dischargeTimeStr} and discharges oily waste overboard.`;
              areaBadge = isDual ? 'Dual Plumes 1.50 km²' : 'Discharge Plume 0.75 km²';
              badgeColor = 'text-amber-400 border-amber-500/40 bg-amber-950/40';
            } else if (timeOffsetMinutes < 0) {
              const hindcastFrac = (timeOffsetMinutes + 300) / 300;
              const currentArea = (0.75 + (incident.slickAreaKm2 - 0.75) * hindcastFrac).toFixed(2);
              phaseTitle = isDual ? 'PHASE 3: DUAL PLUME ADVECTION & MERGING' : 'PHASE 3: OIL DRIFT & DISPERSION';
              phaseDesc = isDual
                ? 'Plume 1 (Amber/Orange) and Plume 2 (Violet) advect along metocean vectors, expand, and combine into a unified slick at t=0.'
                : `${targetVesselName} transits away; simulated oil plume advects from origin towards detection location. Lagrangian particles back-calculate origin.`;
              areaBadge = isDual ? `Merging to ${currentArea} km²` : `Advecting to ${currentArea} km²`;
              badgeColor = 'text-amber-400 border-amber-500/40 bg-amber-950/40';
            } else if (timeOffsetMinutes === 0) {
              phaseTitle = isDual ? 'PHASE 4: SAR DETECTION (MERGED SLICK)' : 'PHASE 4: SAR RADAR OBSERVATION';
              phaseDesc = isDual
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

            return (
              <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-[#050B14]/90 border border-[#162D4A] text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] shrink-0" />
                  <span className="text-cyan-300 font-bold font-mono text-[11px] shrink-0">{phaseTitle} —</span>
                  <span className="text-slate-300 text-[11px] truncate">{phaseDesc}</span>
                </div>
                <div className={`px-2.5 py-0.5 rounded border text-[10px] font-mono font-bold shrink-0 ${badgeColor}`}>
                  {areaBadge}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* UNIFIED INTELLIGENCE INSPECTOR (Clean, Spacious, Tabbed) */}
      {/* ========================================================================= */}
      {inspectorOpen && (
        <aside className="w-96 lg:w-[420px] bg-[#070F1D] border-l border-[#162D4A] flex flex-col shrink-0 overflow-hidden shadow-2xl transition-all duration-200 animate-in slide-in-from-right-2">
          {/* Segmented Tab Bar */}
          <div className="p-2 border-b border-[#162D4A] bg-[#050B14] flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setActiveInspectorTab('attribution')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeInspectorTab === 'attribution'
                  ? 'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0E1B2C]'
              }`}
            >
              <Ship className="w-3.5 h-3.5" />
              <span>Attribution</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                activeInspectorTab === 'attribution'
                  ? 'bg-[#00E5FF] text-[#050B14]'
                  : 'bg-[#0B1523] text-slate-400 border border-[#162D4A]'
              }`}>
                {activeVessel.attributionScore}%
              </span>
            </button>

            <button
              onClick={() => setActiveInspectorTab('environment')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeInspectorTab === 'environment'
                  ? 'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0E1B2C]'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span>MetOcean</span>
            </button>

            <button
              onClick={() => setActiveInspectorTab('detection')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeInspectorTab === 'detection'
                  ? 'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0E1B2C]'
              }`}
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>SAR</span>
            </button>
          </div>

          {/* Tab Content Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* TAB 1: ATTRIBUTION FORENSICS */}
            {activeInspectorTab === 'attribution' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Suspect Vessel Scenario Switcher (Dual vs Single) */}
                {isDualSpillScenario && vessels.length >= 2 && (
                  <div className="p-3 rounded-xl bg-[#0B1523] border border-[#162D4A] space-y-2 shadow-lg">
                    <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
                        DUAL-SOURCE SUSPECTS (2 SHIPS)
                      </span>
                      <span className="font-mono text-slate-400">SELECT TO INSPECT</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Suspect 1 (MT Ocean Star) */}
                      <button
                        onClick={() => onSelectVessel(vessels[0])}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          activeVessel.id === vessels[0]?.id
                            ? 'bg-[#2A0E13] border-[#EF4444] shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                            : 'bg-[#070F1D] border-[#162D4A] hover:border-red-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#EF4444] font-mono">#1 PLUME 1</span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-red-950/80 text-red-300 border border-red-500/40">
                            {vessels[0]?.attributionScore || 78.2}%
                          </span>
                        </div>
                        <div className="font-bold text-xs text-white truncate mt-1">{vessels[0]?.name || 'MT Ocean Star'}</div>
                        <div className="text-[9.5px] text-slate-400 font-mono">Origin 1 · 02:47 UTC</div>
                      </button>

                      {/* Suspect 2 (Gulf Voyager) */}
                      <button
                        onClick={() => onSelectVessel(vessels[1])}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          activeVessel.id === vessels[1]?.id
                            ? 'bg-[#1F1338] border-[#C084FC] shadow-[0_0_10px_rgba(192,132,252,0.3)]'
                            : 'bg-[#070F1D] border-[#162D4A] hover:border-purple-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#C084FC] font-mono">#2 PLUME 2</span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40">
                            {vessels[1]?.attributionScore || 76.4}%
                          </span>
                        </div>
                        <div className="font-bold text-xs text-white truncate mt-1">{vessels[1]?.name || 'Gulf Voyager'}</div>
                        <div className="text-[9.5px] text-slate-400 font-mono">Origin 2 · 02:35 UTC</div>
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-400 bg-[#070F1D] p-2 rounded-lg border border-[#162D4A] flex items-center gap-1.5">
                      <span className="text-cyan-400 font-bold">ℹ️ Spatial Deconvolution:</span>
                      <span>Both vessels discharged along independent tracks and merged at t=0.</span>
                    </div>
                  </div>
                )}

                {/* Active Vessel Identity Card */}
                <div className="p-4 rounded-xl bg-[#0B1523] border border-[#162D4A] space-y-3 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm tracking-wide text-white uppercase">{activeVessel.name}</h3>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span className="text-cyan-400 font-semibold">{activeVessel.type}</span>
                        <span>·</span>
                        <span className="font-mono">IMO {activeVessel.imo}</span>
                        <span>·</span>
                        <span>{activeVessel.flag}</span>
                      </div>
                    </div>

                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      activeVessel.rank === 1
                        ? 'bg-[#2A0E13] text-[#EF4444] border border-[#EF4444]/40 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                        : 'bg-[#072533] text-[#00E5FF] border border-[#00E5FF]/40'
                    }`}>
                      {activeVessel.investigationPriority} PRIORITY
                    </span>
                  </div>

                  {/* Authentic Commercial Maritime Vessel Photo */}
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-[#162D4A] bg-[#070F1D] group">
                    <img 
                      src={getVesselPhotoUrl(activeVessel.type, activeVessel.name)} 
                      alt={activeVessel.name}
                      onError={(e) => {
                        // Fallback to high-res commercial tanker if offline / url fails
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80';
                      }}
                      className="w-full h-full object-cover contrast-110 saturate-105 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1523] via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono">
                      <span className="bg-[#070F1D]/90 px-2 py-0.5 rounded border border-[#162D4A] text-slate-300 font-semibold">
                        MMSI: {activeVessel.mmsi}
                      </span>
                      <span className="bg-[#00E5FF]/20 text-[#00E5FF] px-2 py-0.5 rounded border border-[#00E5FF]/40 font-bold flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-ping" />
                        SAR CO-LOCATED
                      </span>
                    </div>
                  </div>

                  {/* Vessel Telemetry 2x2 grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-[#070F1D] border border-[#162D4A]">
                      <span className="text-[10px] text-slate-400 block">Current Pos</span>
                      <span className="font-mono text-cyan-400 font-semibold text-[11px] tabular-nums">
                        {activeVessel.currentCoordinates[0]}°N, {activeVessel.currentCoordinates[1]}°E
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#070F1D] border border-[#162D4A]">
                      <span className="text-[10px] text-slate-400 block">Speed & Heading</span>
                      <span className="font-mono text-slate-200 font-semibold text-[11px] tabular-nums">
                        {activeVessel.currentSpeedKt} kn @ {activeVessel.currentHeadingDeg}°
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#070F1D] border border-[#162D4A]">
                      <span className="text-[10px] text-slate-400 block">Distance to Origin</span>
                      <span className="font-mono text-emerald-400 font-semibold text-[11px] tabular-nums">
                        {activeVessel.distanceFromOriginKm} km
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#070F1D] border border-[#162D4A]">
                      <span className="text-[10px] text-slate-400 block">Destination</span>
                      <span className="text-slate-200 text-[11px] truncate block font-medium">
                        {activeVessel.destination}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Composite Attribution Ranking Score with 5 Distinct Colored Bars */}
                <div className="p-4 rounded-xl bg-[#0B1523] border border-[#162D4A] space-y-3 shadow-lg">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      FORENSIC ATTRIBUTION SCORE
                    </span>
                    <span className="text-3xl font-bold font-mono text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
                      {activeVessel.attributionScore}%
                    </span>
                  </div>

                  {/* Evidence Breakdown Bars with EXACT Colors */}
                  <div className="space-y-3 pt-1">
                    {[
                      { label: 'Origin Proximity', score: activeVessel.proximityScore, barColor: 'bg-[#10B981]', dotColor: 'bg-[#10B981]' },
                      { label: 'Trajectory Alignment', score: activeVessel.trajectoryScore, barColor: 'bg-[#00E5FF]', dotColor: 'bg-[#00E5FF]' },
                      { label: 'Temporal Discharge Window', score: activeVessel.temporalScore, barColor: 'bg-[#3B82F6]', dotColor: 'bg-[#3B82F6]' },
                      { label: 'AIS Continuity & Beacon Rate', score: activeVessel.aisAnomalyScore, barColor: 'bg-[#F59E0B]', dotColor: 'bg-[#F59E0B]' },
                      { label: 'Speed Drop & Course Deviation', score: activeVessel.behavioralAnomalyScore, barColor: 'bg-[#EF4444]', dotColor: 'bg-[#EF4444]' }
                    ].map(ev => (
                      <div key={ev.label} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-300 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${ev.dotColor}`} />
                            {ev.label}
                          </span>
                          <span className="text-slate-100 font-mono tabular-nums font-bold">{ev.score}%</span>
                        </div>
                        <div className="w-full bg-[#070F1D] h-2 rounded-full overflow-hidden border border-[#162D4A]">
                          <div
                            className={`h-full ${ev.barColor} rounded-full transition-all duration-500 shadow-sm`}
                            style={{ width: `${ev.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-500 italic pt-1 border-t border-[#162D4A] leading-tight">
                    Attribution score provides forensic decision-support for maritime inspectors, not legal proof of guilt.
                  </p>
                </div>

                {/* Reconstructed Vessel Activity Timeline */}
                <div className="p-4 rounded-xl bg-[#0B1523] border border-[#162D4A] space-y-3 shadow-lg">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-slate-200">ACTIVITY CHRONOLOGY</span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400/80">UTC TIMELINE</span>
                  </div>

                  <div className="relative pl-3 border-l border-[#162D4A] space-y-3 py-1">
                    {activeVessel.activityTimeline.map((item, index) => (
                      <div key={index} className="relative group">
                        <div
                          className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full border ${
                            item.isAnomaly
                              ? 'bg-[#EF4444] border-[#EF4444] shadow-[0_0_6px_#EF4444]'
                              : index === 0
                              ? 'bg-[#10B981] border-[#10B981]'
                              : 'bg-[#00E5FF] border-[#00E5FF]'
                          }`}
                        />
                        <div className="text-[10px] text-slate-400 font-mono font-medium">{item.timestampUtc}</div>
                        <div className={`text-[11px] mt-0.5 leading-snug ${item.isAnomaly ? 'text-red-400 font-medium' : 'text-slate-200'}`}>
                          {item.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compact Candidate Vessels in Sector */}
                <div className="space-y-2 pt-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    OTHER CANDIDATE VESSELS IN SECTOR
                  </div>
                  {vessels.filter(v => v.id !== activeVessel.id).slice(0, 2).map(other => (
                    <button
                      key={other.id}
                      onClick={() => onSelectVessel(other)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#0B1523] hover:bg-[#0E1B2C] border border-[#162D4A] hover:border-[#00E5FF]/40 flex items-center justify-between text-xs transition-colors cursor-pointer shadow-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">{other.name}</span>
                        <span className="text-[10px] text-slate-400 block">{other.type} · Dist: {other.distanceFromOriginKm} km</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {other.attributionScore}%
                      </span>
                    </button>
                  ))}
                </div>

                {/* Primary Action Button */}
                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('reports')}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#00E5FF] hover:bg-[#33EAFF] text-[#050B14] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,229,255,0.35)] active:scale-95 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-[#050B14]" />
                    <span>GENERATE INVESTIGATION DOSSIER</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: ENVIRONMENT & METOCEAN FORCING */}
            {activeInspectorTab === 'environment' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* MetOcean Forcing Cards */}
                <div className="p-4 rounded-xl bg-[#0B1523] border border-[#162D4A] space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#162D4A] pb-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">LAGRANGIAN 4D FORCING</span>
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold">ECMWF / HYCOM</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-[#070F1D] border border-[#162D4A]">
                      <span className="text-[10px] text-slate-400 block">Wind (10m)</span>
                      <span className="font-mono font-bold text-white text-sm">{metocean.windSpeedKt} kt</span>
                      <span className="text-cyan-400 text-[10px] ml-1">{metocean.windDirectionCard}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#070F1D] border border-[#162D4A]">
                      <span className="text-[10px] text-slate-400 block">Surface Current</span>
                      <span className="font-mono font-bold text-white text-sm">{metocean.currentSpeedKt} kt</span>
                      <span className="text-cyan-400 text-[10px] ml-1">{metocean.currentDirectionCard}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#070F1D] border border-[#162D4A]">
                      <span className="text-[10px] text-slate-400 block">Wave Swell</span>
                      <span className="font-mono font-bold text-white text-sm">{metocean.waveHeightM} m</span>
                      <span className="text-slate-400 text-[10px] ml-1">Moderate</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#070F1D] border border-[#162D4A]">
                      <span className="text-[10px] text-slate-400 block">Net Advection</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">{metocean.netDriftSpeedKt} kt</span>
                      <span className="text-slate-400 text-[10px] ml-1">@ 130°</span>
                    </div>
                  </div>
                </div>

                {/* Shoreline Impact & Asset Risk */}
                <div className="p-4 rounded-xl bg-[#0B1523] border border-[#162D4A] space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#162D4A] pb-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">SHORELINE IMPACT FORECAST</span>
                    <span className="text-[10px] font-mono text-amber-400 px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/40 font-bold">
                      ETA ~{shorelineRisk.projectedEtaHours}h
                    </span>
                  </div>

                  <div>
                    <div className="font-semibold text-white text-xs leading-snug">{shorelineRisk.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Distance Offshore: <span className="font-mono text-white font-medium">{shorelineRisk.distanceOffshoreKm} km</span> · Vuln Index: <span className="font-mono text-amber-400 font-bold">EVT {shorelineRisk.vulnerabilityIndex}/10</span>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-2 pt-2 border-t border-[#162D4A]">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Operational Response Checklist:</div>
                    {actions.map(act => (
                      <div
                        key={act.id}
                        onClick={() => toggleAction(act.id)}
                        className="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-300 hover:text-white transition-colors"
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
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-4 rounded-xl bg-[#0B1523] border border-[#162D4A] space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#162D4A] pb-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">SAR RADAR CHARACTERIZATION</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">94.7% IoU</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-[#162D4A]">
                      <span className="text-slate-400">Centroid Coordinates:</span>
                      <span className="font-mono text-cyan-400 tabular-nums font-medium">18.112°N, 72.464°E</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#162D4A]">
                      <span className="text-slate-400">Calculated Slick Area:</span>
                      <span className="font-mono text-red-400 tabular-nums font-bold">{incident.slickAreaKm2} km²</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#162D4A]">
                      <span className="text-slate-400">Slick Perimeter:</span>
                      <span className="font-mono text-slate-200 tabular-nums font-medium">{incident.slickPerimeterKm} km</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#162D4A]">
                      <span className="text-slate-400">Sensor Platform:</span>
                      <span className="text-slate-200 font-medium">{incident.sensor}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Classification:</span>
                      <span className="text-cyan-400 font-semibold">{incident.classification}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsSARCompareModalOpen(true)}
                    className="w-full mt-2 py-2 px-3 rounded-lg bg-[#070F1D] hover:bg-[#0E1B2C] border border-[#162D4A] text-cyan-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
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
      )}

      {/* SAR COMPARISON MODAL */}
      <EvidenceCompareModal
        isOpen={isSARCompareModalOpen}
        onClose={() => setIsSARCompareModalOpen(false)}
        detectionData={sarDetection}
      />
    </div>
  );
};

