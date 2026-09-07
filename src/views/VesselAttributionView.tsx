import React, { useState } from 'react';
import { 
  Ship, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  ArrowRight,
  Navigation
} from 'lucide-react';
import { Vessel } from '../types';

interface VesselAttributionViewProps {
  vessels: Vessel[];
  onSelectVessel: (vessel: Vessel) => void;
  onOpenWorkspace: () => void;
}

export const VesselAttributionView: React.FC<VesselAttributionViewProps> = ({
  vessels,
  onSelectVessel,
  onOpenWorkspace,
}) => {
  const [expandedVesselId, setExpandedVesselId] = useState<string>('ves-01'); // MT OCEAN STAR expanded by default

  const toggleExpand = (id: string) => {
    setExpandedVesselId(prev => (prev === id ? '' : id));
  };

  return (
    <div className="w-full h-[calc(100vh-2.75rem)] overflow-y-auto p-6 bg-[#FFFFE3] dark:bg-[#171B1F] text-[#4A4A4A] dark:text-[#FFFFE3] select-none font-sans custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#CBCBCB] dark:border-[#353D46] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] text-[#6D8196] shadow-xs">
                <Ship className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-wide text-[#4A4A4A] dark:text-[#FFFFE3] uppercase">
                  AIS Forensic Vessel Attribution Engine
                </h1>
                <p className="text-xs text-[#6D8196] dark:text-[#CBCBCB] mt-0.5">
                  Spatiotemporal vessel reconstruction, kinematics anomaly correlation, and multi-factor investigative ranking.
                </p>
              </div>
            </div>
          </div>

          {/* Legal/Scientific UX Disclaimer */}
          <div className="px-3 py-2 rounded-lg bg-white dark:bg-[#272E36] border border-[#D9822B]/50 text-[#D9822B] text-xs flex items-center gap-2 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-[#D9822B] shrink-0" />
            <span className="text-[11px] leading-tight text-[#4A4A4A] dark:text-[#CBCBCB]">
              Attribution scores indicate <strong className="text-[#D9822B]">investigative priority</strong> for authorities — not legal proof of culpability.
            </span>
          </div>
        </div>

        {/* Top KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] space-y-1 shadow-xs">
            <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] uppercase tracking-wider font-medium block">Vessels Analyzed</span>
            <div className="text-2xl font-bold font-mono text-[#4A4A4A] dark:text-[#FFFFE3]">284</div>
            <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB]">Across 100km Arabian Sea sector</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] space-y-1 shadow-xs">
            <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] uppercase tracking-wider font-medium block">In Origin Window</span>
            <div className="text-2xl font-bold font-mono text-[#6D8196] dark:text-[#FFFFE3]">17</div>
            <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB]">Present 02:10–03:40 UTC</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] space-y-1 shadow-xs">
            <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] uppercase tracking-wider font-medium block">High Priority Flags</span>
            <div className="text-2xl font-bold font-mono text-[#D9534F]">03</div>
            <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB]">Exceeding 70% threshold</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] space-y-1 shadow-xs">
            <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] uppercase tracking-wider font-medium block">AIS Anomalies</span>
            <div className="text-2xl font-bold font-mono text-[#D9822B]">05</div>
            <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB]">Course shifts & speed drops</span>
          </div>
        </div>

        {/* Ranked Candidate Vessel Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6D8196] dark:text-[#CBCBCB]">
              Ranked Vessels for Further Maritime Investigation
            </h2>
            <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB]">Sorted by Composite Forensic Score</span>
          </div>

          <div className="space-y-3">
            {vessels.map((vessel) => {
              const isExpanded = expandedVesselId === vessel.id;
              const isTop = vessel.rank === 1;

              return (
                <div
                  key={vessel.id}
                  className={`rounded-xl border transition-all shadow-xs ${
                    isTop
                      ? 'bg-white dark:bg-[#272E36] border-2 border-[#D9534F]'
                      : 'bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46]'
                  }`}
                >
                  {/* Summary Bar */}
                  <div
                    onClick={() => toggleExpand(vessel.id)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#FFFFE3]/60 dark:hover:bg-[#1F242A] transition-colors rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold font-mono text-sm ${
                        isTop
                          ? 'bg-[#D9534F]/15 text-[#D9534F] border border-[#D9534F]/40'
                          : vessel.rank === 2
                          ? 'bg-[#D9822B]/15 text-[#D9822B] border border-[#D9822B]/40'
                          : 'bg-[#FFFFE3] dark:bg-[#1F242A] text-[#6D8196] dark:text-[#CBCBCB] border border-[#CBCBCB] dark:border-[#353D46]'
                      }`}>
                        #{vessel.rank}
                      </div>

                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-sm text-[#4A4A4A] dark:text-[#FFFFE3]">{vessel.name}</span>
                          <span className="text-xs text-[#6D8196] dark:text-[#CBCBCB] font-mono">· IMO {vessel.imo}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#FFFFE3] dark:bg-[#1F242A] text-[#6D8196] dark:text-[#CBCBCB] border border-[#CBCBCB] dark:border-[#353D46]">
                            {vessel.type}
                          </span>
                        </div>
                        <div className="text-xs text-[#6D8196] dark:text-[#CBCBCB] mt-1 flex items-center gap-3">
                          <span className="font-mono tabular-nums">Speed: {vessel.currentSpeedKt} kn</span>
                          <span className="font-mono tabular-nums">Heading: {vessel.currentHeadingDeg}°</span>
                          <span>Dist to Origin: <strong className="text-[#4A4A4A] dark:text-[#FFFFE3] font-mono tabular-nums">{vessel.distanceFromOriginKm} km</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] uppercase block font-medium">Priority Score</span>
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className={`text-lg font-bold font-mono tabular-nums ${
                            vessel.attributionScore >= 85 ? 'text-[#D9534F]' : vessel.attributionScore >= 60 ? 'text-[#D9822B]' : 'text-[#6D8196]'
                          }`}>
                            {vessel.attributionScore}%
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] px-2.5 py-1 rounded-md font-semibold uppercase ${
                        vessel.investigationPriority === 'HIGH'
                          ? 'bg-[#D9534F]/15 text-[#D9534F] border border-[#D9534F]/40'
                          : vessel.investigationPriority === 'MEDIUM'
                          ? 'bg-[#D9822B]/15 text-[#D9822B] border border-[#D9822B]/40'
                          : 'bg-[#FFFFE3] dark:bg-[#1F242A] text-[#6D8196] dark:text-[#CBCBCB] border border-[#CBCBCB] dark:border-[#353D46]'
                      }`}>
                        {vessel.investigationPriority}
                      </span>

                      {isExpanded ? <ChevronUp className="w-4 h-4 text-[#6D8196] dark:text-[#CBCBCB]" /> : <ChevronDown className="w-4 h-4 text-[#6D8196] dark:text-[#CBCBCB]" />}
                    </div>
                  </div>

                  {/* Expandable Forensic Deep Dive */}
                  {isExpanded && (
                    <div className="p-5 border-t border-[#CBCBCB] dark:border-[#353D46] bg-[#FFFFE3]/40 dark:bg-[#1F242A] rounded-b-xl space-y-4 text-xs">
                      {/* Evidence Breakdown Bars */}
                      <div className="space-y-2">
                        <span className="text-[11px] uppercase font-semibold text-[#6D8196] dark:text-[#CBCBCB] block tracking-wider">
                          Evidence Breakdown & Multi-Factor Scoring
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#4A4A4A] dark:text-[#CBCBCB]">Spatiotemporal Proximity to Origin</span>
                              <span className="text-[#6D8196] dark:text-[#FFFFE3] font-mono font-semibold">{vessel.proximityScore}%</span>
                            </div>
                            <div className="w-full bg-[#CBCBCB]/40 dark:bg-[#171B1F] h-1.5 rounded-full overflow-hidden border border-[#CBCBCB]/60 dark:border-[#353D46]">
                              <div className="h-full bg-[#6D8196] rounded-full" style={{ width: `${vessel.proximityScore}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#4A4A4A] dark:text-[#CBCBCB]">Drift Trajectory Alignment</span>
                              <span className="text-[#6D8196] dark:text-[#FFFFE3] font-mono font-semibold">{vessel.trajectoryScore}%</span>
                            </div>
                            <div className="w-full bg-[#CBCBCB]/40 dark:bg-[#171B1F] h-1.5 rounded-full overflow-hidden border border-[#CBCBCB]/60 dark:border-[#353D46]">
                              <div className="h-full bg-[#6D8196] rounded-full" style={{ width: `${vessel.trajectoryScore}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#4A4A4A] dark:text-[#CBCBCB]">Temporal Discharge Window Correlation</span>
                              <span className="text-[#6D8196] dark:text-[#FFFFE3] font-mono font-semibold">{vessel.temporalScore}%</span>
                            </div>
                            <div className="w-full bg-[#CBCBCB]/40 dark:bg-[#171B1F] h-1.5 rounded-full overflow-hidden border border-[#CBCBCB]/60 dark:border-[#353D46]">
                              <div className="h-full bg-[#6D8196] rounded-full" style={{ width: `${vessel.temporalScore}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#4A4A4A] dark:text-[#CBCBCB]">AIS Continuity & Transmission Fidelity</span>
                              <span className="text-[#6D8196] dark:text-[#FFFFE3] font-mono font-semibold">{vessel.aisAnomalyScore}%</span>
                            </div>
                            <div className="w-full bg-[#CBCBCB]/40 dark:bg-[#171B1F] h-1.5 rounded-full overflow-hidden border border-[#CBCBCB]/60 dark:border-[#353D46]">
                              <div className="h-full bg-[#6D8196] rounded-full" style={{ width: `${vessel.aisAnomalyScore}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* "Why This Vessel?" Deep Dive */}
                      <div className="p-3.5 rounded-lg bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] space-y-2 shadow-xs">
                        <div className="flex items-center gap-2 text-[#6D8196] dark:text-[#FFFFE3] font-semibold text-xs uppercase tracking-wider">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Why is this vessel prioritized for investigation?</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                          <div className="bg-[#FFFFE3]/50 dark:bg-[#1F242A] p-2.5 rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46]">
                            <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[10px] block">Offset from Origin:</span>
                            <span className="font-semibold text-[#4A4A4A] dark:text-[#FFFFE3] font-mono tabular-nums">{vessel.distanceFromOriginKm} km</span>
                          </div>
                          <div className="bg-[#FFFFE3]/50 dark:bg-[#1F242A] p-2.5 rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46]">
                            <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[10px] block">Timing Delta (Δt):</span>
                            <span className="font-semibold text-[#4A4A4A] dark:text-[#FFFFE3] font-mono tabular-nums">{vessel.timeDiffMinutes} minutes</span>
                          </div>
                          <div className="bg-[#FFFFE3]/50 dark:bg-[#1F242A] p-2.5 rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46]">
                            <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[10px] block">Speed Anomaly:</span>
                            <span className={`font-semibold ${vessel.speedAnomalyDetected ? 'text-[#D9534F]' : 'text-[#6D8196]'}`}>
                              {vessel.speedAnomalyDetected ? 'DETECTED (12.4→5.8 kn)' : 'NONE'}
                            </span>
                          </div>
                          <div className="bg-[#FFFFE3]/50 dark:bg-[#1F242A] p-2.5 rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46]">
                            <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[10px] block">Course Deviation:</span>
                            <span className={`font-semibold ${vessel.courseDeviationDetected ? 'text-[#D9822B]' : 'text-[#6D8196]'}`}>
                              {vessel.courseDeviationDetected ? 'DETECTED (35° shift)' : 'NORMAL'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Activity Chronology */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] uppercase font-semibold text-[#6D8196] dark:text-[#CBCBCB] block tracking-wider">
                          Reconstructed Timeline Events
                        </span>
                        <div className="space-y-1">
                          {vessel.activityTimeline.map((ev, i) => (
                            <div key={i} className="text-xs flex items-center gap-2 text-[#4A4A4A] dark:text-[#CBCBCB]">
                              <span className="text-[#6D8196] dark:text-[#FFFFE3] font-mono text-[11px]">{ev.timestampUtc}</span>
                              <span className="text-[#CBCBCB]">·</span>
                              <span className={ev.isAnomaly ? 'text-[#D9534F] font-medium' : 'text-[#4A4A4A] dark:text-[#FFFFE3]'}>
                                {ev.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#CBCBCB] dark:border-[#353D46]">
                        <button
                          onClick={() => onSelectVessel(vessel)}
                          className="px-3 py-1.5 rounded-md bg-white dark:bg-[#272E36] hover:border-[#6D8196] border border-[#CBCBCB] dark:border-[#353D46] text-[#4A4A4A] dark:text-[#FFFFE3] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Navigation className="w-3.5 h-3.5 text-[#6D8196]" />
                          <span>Focus On Map</span>
                        </button>
                        <button
                          onClick={onOpenWorkspace}
                          className="px-3 py-1.5 rounded-md bg-[#6D8196] hover:bg-[#586A7D] text-[#FFFFE3] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <span>Open Digital Twin Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
