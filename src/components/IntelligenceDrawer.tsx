import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Satellite, 
  Compass, 
  RotateCcw, 
  Ship, 
  LifeBuoy, 
  Info, 
  Sliders, 
  ChevronLeft,
  Maximize2
} from 'lucide-react';
import { 
  Incident, 
  MetOceanTelemetry, 
  HindcastResult, 
  Vessel, 
  ShorelineRiskZone 
} from '../types';

interface IntelligenceDrawerProps {
  incident: Incident;
  metocean: MetOceanTelemetry;
  hindcast: HindcastResult;
  vessels: Vessel[];
  shorelineRisk: ShorelineRiskZone;
  selectedVessel: Vessel | null;
  onSelectVessel: (vessel: Vessel) => void;
  onOpenSARCompare: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const IntelligenceDrawer: React.FC<IntelligenceDrawerProps> = ({
  incident,
  metocean,
  hindcast,
  vessels,
  shorelineRisk,
  selectedVessel,
  onSelectVessel,
  onOpenSARCompare,
  isOpen,
  onToggleOpen,
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    incident: true,
    satellite: true,
    environment: true,
    origin: false,
    attribution: false,
    response: false,
  });

  const [driftMode, setDriftMode] = useState<'LIVE' | 'BASELINE'>('LIVE');

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div
      className={`fixed top-11 right-0 bottom-0 z-30 transition-all duration-300 flex select-none ${
        isOpen ? 'w-96' : 'w-0'
      }`}
    >
      {/* Drawer Toggle Tab */}
      <button
        onClick={onToggleOpen}
        className="absolute -left-7 top-6 w-7 h-12 bg-[#0e131c] border-y border-l border-[#222d40] rounded-l-md flex items-center justify-center text-slate-400 hover:text-slate-100 shadow-md transition-colors"
        title={isOpen ? 'Collapse panel' : 'Open dossier'}
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Main Drawer Container */}
      <div className="w-full h-full bg-[#0e131c] border-l border-[#222d40] flex flex-col text-slate-200 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="h-11 px-4 border-b border-[#222d40] flex items-center justify-between bg-[#121824] shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Intelligence Dossier
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#182130] border border-[#28354b] text-blue-400 font-medium">
            {incident.id}
          </span>
        </div>

        {/* Scrollable Content Sections */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar text-xs font-sans">
          {/* 1. INCIDENT SUMMARY */}
          <div className="border border-[#222d40] rounded-md bg-[#121824] overflow-hidden">
            <button
              onClick={() => toggleSection('incident')}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#182130] transition-colors text-left"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>Incident Telemetry</span>
              </div>
              {openSections.incident ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openSections.incident && (
              <div className="px-3 py-2.5 border-t border-[#222d40] space-y-2 text-[11px] text-slate-300">
                <div className="flex justify-between border-b border-[#182130] pb-1.5">
                  <span className="text-slate-400">Incident Code:</span>
                  <span className="font-semibold text-slate-100 font-mono">{incident.code}</span>
                </div>
                <div className="flex justify-between border-b border-[#182130] pb-1.5">
                  <span className="text-slate-400">Centroid:</span>
                  <span className="text-blue-400 font-mono tabular-nums">18.112°N, 72.464°E</span>
                </div>
                <div className="flex justify-between border-b border-[#182130] pb-1.5">
                  <span className="text-slate-400">Detected:</span>
                  <span className="font-mono text-slate-300">{incident.detectedAt}</span>
                </div>
                <div className="flex justify-between border-b border-[#182130] pb-1.5">
                  <span className="text-slate-400">Estimated Area:</span>
                  <span className="font-semibold text-rose-400 font-mono tabular-nums">{incident.slickAreaKm2} km²</span>
                </div>
                <div className="flex justify-between border-b border-[#182130] pb-1.5">
                  <span className="text-slate-400">Perimeter:</span>
                  <span className="font-mono tabular-nums">{incident.slickPerimeterKm} km</span>
                </div>
                <div className="flex justify-between border-b border-[#182130] pb-1.5">
                  <span className="text-slate-400">Detection Confidence:</span>
                  <span className="text-emerald-400 font-semibold font-mono">{incident.confidencePercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Classification:</span>
                  <span className="text-slate-200">{incident.classification}</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. SATELLITE EVIDENCE */}
          <div className="border border-[#222d40] rounded-md bg-[#121824] overflow-hidden">
            <button
              onClick={() => toggleSection('satellite')}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#182130] transition-colors text-left"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                <Satellite className="w-3.5 h-3.5 text-blue-400" />
                <span>SAR Satellite Telemetry</span>
              </div>
              {openSections.satellite ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openSections.satellite && (
              <div className="px-3 py-2.5 border-t border-[#222d40] space-y-2 text-[11px]">
                <div className="flex items-center justify-between border-b border-[#182130] pb-1.5">
                  <span className="text-slate-400">Sensor:</span>
                  <span className="text-slate-200">Sentinel-1 C-SAR</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#182130] pb-1.5">
                  <span className="text-slate-400">Backscatter Mean:</span>
                  <span className="text-rose-400 font-semibold font-mono tabular-nums">{incident.backscatterDb} dB</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#182130] pb-1.5">
                  <span className="text-slate-400">Segmentation Model:</span>
                  <span className="text-blue-400">U-Net Multi-Res v1.4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-emerald-400 font-medium">VALIDATED</span>
                </div>

                {/* Compare SAR Button */}
                <button
                  onClick={onOpenSARCompare}
                  className="w-full mt-2 py-1.5 px-2.5 rounded bg-[#182130] hover:bg-[#222d40] border border-[#28354b] text-blue-400 hover:text-blue-300 flex items-center justify-center gap-2 transition-all text-xs font-medium"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Compare SAR & Mask</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. METOCEAN ENVIRONMENT & LAGRANGIAN DRIFT */}
          <div className="border border-[#222d40] rounded-md bg-[#121824] overflow-hidden">
            <button
              onClick={() => toggleSection('environment')}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#182130] transition-colors text-left"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                <span>MetOcean & Drift Dynamics</span>
              </div>
              {openSections.environment ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openSections.environment && (
              <div className="px-3 py-2.5 border-t border-[#222d40] space-y-2.5 text-[11px]">
                {/* 4-column compact data strip */}
                <div className="grid grid-cols-2 gap-2 bg-[#0e131c] p-2.5 rounded border border-[#1e293b]">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Wind (10m):</span>
                    <span className="text-slate-100 font-semibold font-mono">{metocean.windSpeedKt} kt</span>
                    <span className="text-slate-400 text-[10px] ml-1">{metocean.windDirectionCard} ({metocean.windDirectionDeg}°)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Current (Surface):</span>
                    <span className="text-slate-100 font-semibold font-mono">{metocean.currentSpeedKt} kt</span>
                    <span className="text-slate-400 text-[10px] ml-1">{metocean.currentDirectionCard} ({metocean.currentDirectionDeg}°)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Wave Swell:</span>
                    <span className="text-slate-100 font-semibold font-mono">{metocean.waveHeightM} m</span>
                    <span className="text-slate-400 text-[10px] ml-1">Moderate</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Sea Temp / Baro:</span>
                    <span className="text-slate-100 font-semibold font-mono">{metocean.seaTempC}°C</span>
                    <span className="text-slate-400 text-[10px] ml-1">{metocean.airPressureHpa} hPa</span>
                  </div>
                </div>

                {/* Lagrangian formula & Net Drift */}
                <div className="p-2.5 rounded bg-[#0e131c] border border-[#1e293b] space-y-1">
                  <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Lagrangian Drift Model</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {metocean.modelFormula}
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-[#1e293b] text-xs">
                    <span className="text-slate-400">Net Modeled Drift:</span>
                    <span className="text-blue-400 font-semibold font-mono">
                      {metocean.netDriftSpeedKt} kt @ {metocean.netDriftDirectionDeg}° {metocean.netDriftDirectionCard}
                    </span>
                  </div>
                </div>

                {/* Scenario Toggle */}
                <div className="flex gap-1.5 pt-0.5">
                  <button
                    onClick={() => setDriftMode('LIVE')}
                    className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                      driftMode === 'LIVE'
                        ? 'bg-[#182130] text-blue-400 border border-blue-500/40 font-semibold'
                        : 'bg-[#0e131c] text-slate-400 border border-[#1e293b]'
                    }`}
                  >
                    LIVE METOCEAN
                  </button>
                  <button
                    onClick={() => setDriftMode('BASELINE')}
                    className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                      driftMode === 'BASELINE'
                        ? 'bg-[#182130] text-blue-400 border border-blue-500/40 font-semibold'
                        : 'bg-[#0e131c] text-slate-400 border border-[#1e293b]'
                    }`}
                  >
                    BASELINE CLIMATOLOGY
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. PROBABLE ORIGIN / HINDCAST */}
          <div className="border border-[#222d40] rounded-md bg-[#121824] overflow-hidden">
            <button
              onClick={() => toggleSection('origin')}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#182130] transition-colors text-left"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                <span>Hindcast Probable Origin</span>
              </div>
              {openSections.origin ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openSections.origin && (
              <div className="px-3 py-2.5 border-t border-[#222d40] space-y-2 text-[11px]">
                <div className="flex justify-between border-b border-[#182130] pb-1.5">
                  <span className="text-slate-400">Probable Origin:</span>
                  <span className="text-blue-400 font-semibold font-mono tabular-nums">18.041°N, 72.512°E</span>
                </div>
                <div className="flex justify-between border-b border-[#182130] pb-1.5">
                  <span className="text-slate-400">Origin Confidence:</span>
                  <span className="text-emerald-400 font-semibold font-mono">{hindcast.confidencePercent}%</span>
                </div>
                <div className="flex justify-between border-b border-[#182130] pb-1.5">
                  <span className="text-slate-400">Discharge Window:</span>
                  <span className="text-slate-200 font-mono">{hindcast.dischargeWindowUtc}</span>
                </div>
                <div className="flex justify-between border-b border-[#182130] pb-1.5">
                  <span className="text-slate-400">Lagrangian Particles:</span>
                  <span className="font-mono">{hindcast.particleCount} stochastic</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">90% Uncertainty Radius:</span>
                  <span className="text-amber-400 font-semibold font-mono">{hindcast.uncertaintyRadiusKm} km</span>
                </div>

                <div className="p-2 rounded bg-[#0e131c] border border-[#1e293b] text-[10px] text-slate-400 leading-relaxed">
                  <span className="text-blue-400 font-medium">Note: </span>
                  Probabilistic source estimate computed via reverse 4D particle advection against hydro-current contours.
                </div>
              </div>
            )}
          </div>

          {/* 5. AIS ATTRIBUTION & RANKED VESSELS */}
          <div className="border border-[#222d40] rounded-md bg-[#121824] overflow-hidden">
            <button
              onClick={() => toggleSection('attribution')}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#182130] transition-colors text-left"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                <Ship className="w-3.5 h-3.5 text-blue-400" />
                <span>AIS Forensic Attribution</span>
              </div>
              {openSections.attribution ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openSections.attribution && (
              <div className="px-3 py-2.5 border-t border-[#222d40] space-y-2">
                <div className="text-[10px] font-mono text-slate-400 flex justify-between border-b border-[#182130] pb-1.5">
                  <span>284 ANALYZED</span>
                  <span>17 IN SECTOR</span>
                  <span className="text-rose-400 font-semibold">3 FLAGGED</span>
                </div>

                {vessels.slice(0, 3).map((vessel, idx) => (
                  <button
                    key={vessel.id}
                    onClick={() => onSelectVessel(vessel)}
                    className={`w-full text-left p-2.5 rounded-md border transition-all text-xs ${
                      selectedVessel?.id === vessel.id
                        ? 'bg-[#182130] border-blue-500/60 text-slate-100 shadow-sm'
                        : 'bg-[#0e131c] border-[#1e293b] hover:border-[#28354b] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-1.5">
                        <span className="text-slate-400 font-mono text-[11px]">#{idx + 1}</span>
                        <span className={idx === 0 ? 'text-rose-400' : 'text-slate-200'}>{vessel.name}</span>
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                        idx === 0 ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30' : 'bg-[#1e293b] text-slate-300'
                      }`}>
                        {vessel.attributionScore}%
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                      <span>{vessel.type}</span>
                      <span className="font-mono tabular-nums">Dist: {vessel.distanceFromOriginKm} km</span>
                    </div>

                    {/* Score Bar */}
                    <div className="w-full bg-[#182130] h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          idx === 0 ? 'bg-rose-500' : idx === 1 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${vessel.attributionScore}%` }}
                      />
                    </div>
                  </button>
                ))}

                <div className="text-[10px] text-slate-400 italic pt-1 leading-tight">
                  Attribution scores are forensic decision-support indicators, not proof of guilt.
                </div>
              </div>
            )}
          </div>

          {/* 6. SHORELINE RESPONSE ACTIONS */}
          <div className="border border-[#222d40] rounded-md bg-[#121824] overflow-hidden">
            <button
              onClick={() => toggleSection('response')}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#182130] transition-colors text-left"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                <LifeBuoy className="w-3.5 h-3.5 text-amber-400" />
                <span>Response & Containment</span>
              </div>
              {openSections.response ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openSections.response && (
              <div className="px-3 py-2.5 border-t border-[#222d40] space-y-2 text-[11px]">
                <div className="text-slate-200 font-semibold">{shorelineRisk.name}</div>
                <div className="text-[10px] text-amber-400 font-mono font-medium">ETA ~{shorelineRisk.projectedEtaHours} hrs · {shorelineRisk.protocolTier}</div>

                <div className="space-y-1.5 pt-1">
                  {shorelineRisk.immediateActions.map(act => (
                    <label key={act.id} className="flex items-start gap-2 cursor-pointer text-[10px] text-slate-300 hover:text-slate-100">
                      <input
                        type="checkbox"
                        defaultChecked={act.completed}
                        className="mt-0.5 rounded bg-[#0e131c] border-[#222d40] text-blue-500 focus:ring-0"
                      />
                      <span>{act.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
