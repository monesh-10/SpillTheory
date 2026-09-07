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
import { NavigationPage } from '../components/NavigationRail';

interface DashboardViewProps {
  incident: Incident;
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

export const DashboardView: React.FC<DashboardViewProps> = ({
  incident,
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
  const [timeSimulationMinutes, setTimeSimulationMinutes] = useState<number>(180);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSARCompareModalOpen, setIsSARCompareModalOpen] = useState<boolean>(false);
  const [actions, setActions] = useState(shorelineRisk.immediateActions);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'attribution' | 'environment' | 'detection'>('attribution');
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(true);

  // Active vessel defaults to selected or #1 ranked suspect
  const activeVessel = selectedVessel || vessels[0];

  const toggleAction = (id: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  };

  // Playback timer simulation
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setTimeSimulationMinutes(prev => {
          if (prev >= 180) return 0;
          return prev + 10;
        });
      }, 500);
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
        <div className="h-11 bg-[#070F1D]/95 backdrop-blur-md border-b border-[#162D4A] px-4 flex items-center justify-between text-xs shrink-0 z-10">
          {/* Layer Chips */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
            {/* Oil Slick (SAR) */}
            <button
              onClick={() => onToggleLayer('oilSlicks')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-xs border cursor-pointer ${
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
              className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-xs border cursor-pointer ${
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

            {/* Forecast (+24h) */}
            <button
              onClick={() => onToggleLayer('forecastCone')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-xs border cursor-pointer ${
                layerState.forecastCone
                  ? 'bg-[#082820] text-[#34D399] border-[#10B981]/60 font-semibold shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                  : 'bg-[#0B1523] text-slate-400 border-[#162D4A] hover:text-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${layerState.forecastCone ? 'bg-[#10B981] shadow-[0_0_6px_#10B981]' : 'bg-slate-500'}`} />
              <span>Forecast (+24h)</span>
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
            currentTimeSimulationMinutes={timeSimulationMinutes}
            layerState={layerState}
            onToggleLayer={onToggleLayer}
            onOpenSlickDetails={() => setIsSARCompareModalOpen(true)}
            theme={theme}
          />
        </div>

        {/* Floating Bottom Time Simulation Dock */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-3xl bg-[#070F1D]/95 backdrop-blur-md border border-[#162D4A] rounded-xl px-5 py-2.5 shadow-2xl shadow-black/80 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            <span className="text-cyan-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-ping" />
              TIME RECONSTRUCTION (Proof of Vessel Transit Time)
            </span>
            <span className="text-slate-400">4D LAGRANGIAN ADVECTION</span>
          </div>

          <div className="flex items-center gap-3.5 text-xs">
            {/* Round Cyan Play Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-full bg-[#00E5FF] hover:bg-[#33EAFF] text-[#050B14] flex items-center justify-center font-bold transition-all active:scale-95 shadow-[0_0_12px_rgba(0,229,255,0.45)] cursor-pointer shrink-0"
              title={isPlaying ? 'Pause Simulation' : 'Play 4D Lagrangian Reconstruction'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            <span className="text-[11px] font-mono text-cyan-300 font-bold px-2 py-0.5 rounded bg-[#0B1523] border border-[#162D4A] shrink-0">
              1x
            </span>

            {/* Timeline Scrubber */}
            <div className="flex-1 flex items-center gap-3">
              <span className="text-[10px] font-mono text-blue-400 shrink-0 font-semibold">-5h HINDCAST</span>
              <input
                type="range"
                min="0"
                max="180"
                value={timeSimulationMinutes}
                onChange={(e) => setTimeSimulationMinutes(Number(e.target.value))}
                className="w-full h-1.5 bg-[#162D4A] rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
              />
              <span className="text-[10px] font-mono text-emerald-400 shrink-0 font-semibold">+24h FORECAST</span>
            </div>

            {/* Timestamp card */}
            <div className="px-3 py-1 rounded bg-[#0B1523] border border-[#162D4A] font-mono text-xs text-slate-200 shrink-0 flex items-center gap-2">
              <span className="text-cyan-400 font-bold">04:30:00 UTC</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300 font-medium">01 Sep 2024</span>
              <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-500/40">
                {timeSimulationMinutes === 180 ? 'NOW' : `-${Math.round((180 - timeSimulationMinutes) / 60)}h`}
              </span>
            </div>
          </div>
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

                  {/* Vessel Thumbnail Photo */}
                  <div className="relative w-full h-28 rounded-lg overflow-hidden border border-[#162D4A] bg-[#070F1D] group">
                    <img 
                      src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=600&q=80" 
                      alt={activeVessel.name}
                      className="w-full h-full object-cover opacity-85 contrast-125 saturate-90 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1523] via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono">
                      <span className="bg-[#070F1D]/90 px-1.5 py-0.5 rounded border border-[#162D4A] text-slate-300">
                        MMSI: {activeVessel.mmsi}
                      </span>
                      <span className="bg-[#00E5FF]/20 text-[#00E5FF] px-1.5 py-0.5 rounded border border-[#00E5FF]/40 font-bold flex items-center gap-1">
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

