import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Loader2, 
  X, 
  ArrowRight, 
  Ship, 
  Compass
} from 'lucide-react';
import { Incident, Vessel } from '../types';

interface FullInvestigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident;
  topVessel: Vessel;
  onCompleteInvestigation: () => void;
}

const STEPS = [
  { id: 1, label: 'Ingesting Sentinel-1A SAR Telemetry Pass', detail: 'Copernicus IW Level-1 GRDH packet received' },
  { id: 2, label: 'OceanTrace-Seg v1.4 Inference', detail: 'U-Net neural segmentation on C-band backscatter' },
  { id: 3, label: 'Spill Geometry & Thickness Extraction', detail: '13.48 km² area, 31.6 km perimeter, -9.2 dB contrast' },
  { id: 4, label: 'Lagrangian 4D Backward Hindcast Initiated', detail: 'Reverse-advecting 500 stochastic particles against MetOcean' },
  { id: 5, label: 'Probable Source Region Resolved', detail: '18.041°N, 72.512°E (90% radius: 3.96 km, 78.2% certainty)' },
  { id: 6, label: 'Historical AIS Traffic Reconstructed', detail: '284 regional vessels filtered; 17 present in origin window' },
  { id: 7, label: 'Forensic Vessel Attribution Ranking', detail: 'Multi-factor spatio-temporal scoring & anomaly analysis' },
  { id: 8, label: 'Forward Drift Forecast Modeling', detail: '+6h, +12h, +24h, +48h dispersion corridors computed' },
  { id: 9, label: 'Shoreline Vulnerability & NOSDCP Alert', detail: 'Murud-Janjira fishing grounds flagged (ETA ~23.5h, Tier-1)' },
  { id: 10, label: 'Legal Investigation Dossier Compiled', detail: 'Forensic evidence package ready for Coast Guard & authorities' }
];

export const FullInvestigationModal: React.FC<FullInvestigationModalProps> = ({
  isOpen,
  onClose,
  incident,
  topVessel,
  onCompleteInvestigation,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setIsFinished(false);
      return;
    }

    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        } else {
          setIsFinished(true);
          clearInterval(timer);
          return prev;
        }
      });
    }, 800);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-2xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] rounded-xl shadow-2xl overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="p-4 border-b border-[#CBCBCB] dark:border-[#353D46] bg-[#FFFFE3]/50 dark:bg-[#1F242A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#6D8196]" />
            <span className="font-semibold text-xs uppercase tracking-wider text-[#4A4A4A] dark:text-[#FFFFE3]">
              Autonomous Investigation Pipeline
            </span>
          </div>
          <button onClick={onClose} className="text-[#6D8196] hover:text-[#4A4A4A] dark:text-[#CBCBCB] dark:hover:text-[#FFFFE3] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="w-full bg-[#CBCBCB]/40 dark:bg-[#171B1F] h-1.5 overflow-hidden border-b border-[#CBCBCB] dark:border-[#353D46]">
          <div
            className="h-full bg-[#6D8196] transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-xs border-b border-[#CBCBCB] dark:border-[#353D46] pb-2">
            <div>
              <span className="text-[#6D8196] dark:text-[#CBCBCB]">Target Incident: </span>
              <span className="text-[#6D8196] dark:text-[#FFFFE3] font-mono font-semibold">{incident.id}</span>
              <span className="text-[#6D8196] dark:text-[#CBCBCB] ml-2">({incident.locationName})</span>
            </div>
            <span className="text-[10px] text-[#6D8196] dark:text-[#FFFFE3] font-mono font-semibold bg-white dark:bg-[#1F242A] px-2 py-0.5 rounded border border-[#CBCBCB] dark:border-[#353D46] shadow-xs">
              STEP {currentStepIndex + 1} OF {STEPS.length}
            </span>
          </div>

          {/* Steps Timeline Display */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar text-xs">
            {STEPS.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={`p-2.5 rounded-lg border transition-all flex items-start gap-3 ${
                    isCurrent
                      ? 'bg-white dark:bg-[#272E36] border-2 border-[#6D8196] shadow-xs'
                      : isPast
                      ? 'bg-[#FFFFE3]/50 dark:bg-[#1F242A] border border-[#CBCBCB]/70 dark:border-[#353D46]'
                      : 'bg-[#FFFFE3]/20 dark:bg-[#171B1F]/60 border border-[#CBCBCB]/40 dark:border-[#353D46]/40 opacity-40'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-[#6D8196]" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-[#6D8196] animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-[#CBCBCB] dark:border-[#353D46] flex items-center justify-center text-[9px] text-[#6D8196] dark:text-[#CBCBCB] font-mono">
                        {step.id}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${isCurrent ? 'text-[#4A4A4A] dark:text-[#FFFFE3]' : 'text-[#6D8196] dark:text-[#CBCBCB]'}`}>
                        {step.label}
                      </span>
                      {isPast && <span className="text-[9px] text-[#6D8196] dark:text-[#FFFFE3] font-semibold font-mono">DONE</span>}
                    </div>
                    <div className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB] mt-0.5">
                      {step.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completion Card */}
          {isFinished && (
            <div className="p-4 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] space-y-3 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-[#6D8196] dark:text-[#FFFFE3] font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 text-[#6D8196]" />
                <span>Forensic Investigation Sequence Complete</span>
              </div>

              <div className="p-3 bg-[#FFFFE3]/50 dark:bg-[#1F242A] rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] block uppercase font-medium">Top Priority Vessel for Inquiry:</span>
                  <div className="font-semibold text-[#4A4A4A] dark:text-[#FFFFE3] text-sm flex items-center gap-2 mt-0.5">
                    <Ship className="w-4 h-4 text-[#D9534F]" />
                    <span className="text-[#D9534F]">{topVessel.name}</span>
                    <span className="text-xs font-mono text-[#6D8196] dark:text-[#CBCBCB]">(IMO: {topVessel.imo})</span>
                  </div>
                  <div className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB] mt-1">
                    Passage: 2.8 km from probable origin · Speed drop: 12.4 → 5.8 kn
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] block uppercase font-medium">Attribution Score</span>
                  <span className="text-xl font-bold font-mono text-[#D9534F]">{topVessel.attributionScore}%</span>
                </div>
              </div>

              <p className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] italic">
                Attribution outputs are forensic decision-support analytics and require multi-agency validation before regulatory enforcement.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[#CBCBCB] dark:border-[#353D46] bg-[#FFFFE3]/40 dark:bg-[#1F242A] flex items-center justify-between">
          <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB]">
            Autonomous Maritime Oil Spill Intelligence & Forensic Attribution
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-white dark:bg-[#272E36] hover:border-[#6D8196] border border-[#CBCBCB] dark:border-[#353D46] text-[#4A4A4A] dark:text-[#FFFFE3] text-xs font-medium transition-colors cursor-pointer shadow-xs"
            >
              Close
            </button>
            <button
              disabled={!isFinished}
              onClick={() => {
                onCompleteInvestigation();
                onClose();
              }}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                isFinished
                  ? 'bg-[#6D8196] hover:bg-[#586A7D] text-[#FFFFE3]'
                  : 'bg-[#CBCBCB]/40 dark:bg-[#171B1F] text-[#6D8196]/50 dark:text-[#CBCBCB]/40 cursor-not-allowed border border-[#CBCBCB] dark:border-[#353D46]'
              }`}
            >
              <span>View Full Investigation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
