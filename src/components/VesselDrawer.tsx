import React from 'react';
import { 
  X, 
  Ship, 
  Clock, 
  FilePlus,
  Navigation
} from 'lucide-react';
import { Vessel } from '../types';

interface VesselDrawerProps {
  vessel: Vessel | null;
  onClose: () => void;
  onFocusTrack?: () => void;
  onAddToReport?: (vessel: Vessel) => void;
}

export const VesselDrawer: React.FC<VesselDrawerProps> = ({
  vessel,
  onClose,
  onFocusTrack,
  onAddToReport,
}) => {
  if (!vessel) return null;

  const isSuspect = vessel.rank === 1;

  return (
    <div className="fixed top-11 right-0 bottom-0 z-40 w-96 bg-[#0e131c] border-l border-[#222d40] flex flex-col text-slate-200 shadow-2xl select-none font-sans">
      {/* Header */}
      <div className="p-4 border-b border-[#222d40] bg-[#121824] flex items-start justify-between shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Ship className={`w-4 h-4 ${isSuspect ? 'text-rose-400' : 'text-blue-400'}`} />
            <h3 className="font-bold text-sm tracking-wide text-slate-100 uppercase">{vessel.name}</h3>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>{vessel.type}</span>
            <span>·</span>
            <span className="font-mono">IMO {vessel.imo}</span>
            <span>·</span>
            <span>{vessel.flag}</span>
          </div>
          <div className="pt-1">
            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
              isSuspect 
                ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40' 
                : 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
            }`}>
              {vessel.investigationPriority} Priority
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#182130] text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
        {/* Real-time Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2 bg-[#121824] p-3 rounded-md border border-[#222d40]">
          <div>
            <span className="text-[10px] text-slate-400 block">Position:</span>
            <span className="text-slate-100 font-semibold font-mono tabular-nums">{vessel.currentCoordinates[0]}°N, {vessel.currentCoordinates[1]}°E</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Speed / Heading:</span>
            <span className="text-slate-100 font-semibold font-mono tabular-nums">{vessel.currentSpeedKt} kn</span>
            <span className="text-slate-400 text-[10px] ml-1">@ {vessel.currentHeadingDeg}°</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Dist to Origin:</span>
            <span className={`font-semibold font-mono tabular-nums ${vessel.distanceFromOriginKm <= 3.0 ? 'text-rose-400' : 'text-slate-200'}`}>
              {vessel.distanceFromOriginKm} km
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Dest / ETA:</span>
            <span className="text-slate-200 truncate block text-[11px]">{vessel.destination}</span>
          </div>
        </div>

        {/* Forensic Attribution Score Block */}
        <div className="p-3.5 rounded-md bg-[#121824] border border-[#222d40] space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Attribution Ranking
            </span>
            <span className="text-lg font-bold font-mono text-rose-400">
              {vessel.attributionScore}%
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {[
              { label: 'Origin Proximity', score: vessel.proximityScore },
              { label: 'Trajectory Correlation', score: vessel.trajectoryScore },
              { label: 'Temporal Correlation', score: vessel.temporalScore },
              { label: 'AIS Continuity & Reliability', score: vessel.aisAnomalyScore },
              { label: 'Behavioral Anomaly Index', score: vessel.behavioralAnomalyScore }
            ].map(ev => (
              <div key={ev.label} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">{ev.label}</span>
                  <span className="text-slate-200 font-mono tabular-nums font-semibold">{ev.score}%</span>
                </div>
                <div className="w-full bg-[#0a0d14] h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      ev.score >= 90 ? 'bg-rose-500' : ev.score >= 75 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${ev.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 italic pt-2 border-t border-[#182130] leading-tight">
            * Analytical priority score — decision-support indicator for maritime inspectors, not legal proof of guilt.
          </p>
        </div>

        {/* Vessel Activity Anomaly Timeline */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Activity Timeline</span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal">UTC Chronology</span>
          </div>

          <div className="relative pl-3 border-l border-[#222d40] space-y-3 py-1">
            {vessel.activityTimeline.map((item, index) => (
              <div key={index} className="relative group">
                <div
                  className={`absolute -left-[18px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                    item.isAnomaly
                      ? 'bg-rose-500 border-rose-300'
                      : 'bg-[#182130] border-slate-500'
                  }`}
                />
                <div className="text-[10px] text-blue-400 font-mono font-medium">{item.timestampUtc}</div>
                <div
                  className={`text-[11px] mt-0.5 leading-snug ${
                    item.isAnomaly ? 'text-rose-200 font-medium' : 'text-slate-300'
                  }`}
                >
                  {item.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-t border-[#222d40] bg-[#121824] grid grid-cols-2 gap-2 shrink-0">
        <button
          onClick={onFocusTrack}
          className="py-2 px-3 rounded-md bg-[#182130] hover:bg-[#222d40] border border-[#28354b] text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5 text-blue-400" />
          <span>Show AIS Track</span>
        </button>
        <button
          onClick={() => onAddToReport && onAddToReport(vessel)}
          className="py-2 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
        >
          <FilePlus className="w-3.5 h-3.5" />
          <span>Add to Dossier</span>
        </button>
      </div>
    </div>
  );
};
