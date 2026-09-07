import React, { useState } from 'react';
import { ShieldAlert, ChevronDown, ChevronUp, LifeBuoy, Target, ArrowRight } from 'lucide-react';
import { ShorelineRiskZone } from '../types';

interface IncidentStripProps {
  riskZone: ShorelineRiskZone;
  onFocusImpactZone: () => void;
  onOpenResponsePlan: () => void;
  onOpenAssets: () => void;
}

export const IncidentStrip: React.FC<IncidentStripProps> = ({
  riskZone,
  onFocusImpactZone,
  onOpenResponsePlan,
  onOpenAssets,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute top-3 left-3 z-20 select-none font-sans">
      {/* Clean Solid Surface Pill */}
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#FFFFE3] dark:bg-[#171B1F] border border-[#CBCBCB] dark:border-[#353D46] shadow-xs text-xs text-[#4A4A4A] dark:text-[#FFFFE3]">
        <span className="w-2 h-2 rounded-full bg-[#D9822B] shrink-0" />
        <span className="text-[11px] text-[#D9822B] font-semibold uppercase tracking-wider">
          Shoreline Threat:
        </span>
        <span className="text-[#4A4A4A] dark:text-[#FFFFE3] font-semibold text-xs truncate max-w-[180px] sm:max-w-xs">
          {riskZone.name}
        </span>
        <span className="text-[#6D8196] dark:text-[#CBCBCB] text-xs hidden sm:inline font-mono">
          · ETA ~{riskZone.projectedEtaHours}h
        </span>

        <div className="flex items-center gap-1.5 ml-1">
          <button
            onClick={onFocusImpactZone}
            className="p-1 rounded-md hover:bg-[#CBCBCB]/30 text-[#6D8196] hover:text-[#4A4A4A] dark:text-[#CBCBCB] dark:hover:text-[#FFFFE3] transition-colors cursor-pointer"
            title="Focus On Shoreline"
          >
            <Target className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenResponsePlan}
            className="px-2 py-0.5 rounded-md bg-white dark:bg-[#272E36] hover:border-[#6D8196] border border-[#CBCBCB] dark:border-[#353D46] text-[11px] text-[#4A4A4A] dark:text-[#FFFFE3] font-medium transition-colors cursor-pointer shadow-xs"
          >
            Action Plan
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-[#6D8196] hover:text-[#4A4A4A] dark:text-[#CBCBCB] dark:hover:text-[#FFFFE3] rounded-md hover:bg-[#CBCBCB]/30 transition-colors cursor-pointer"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Micro-Card */}
      {expanded && (
        <div className="mt-1.5 w-80 bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] rounded-xl p-3 text-xs space-y-2 shadow-lg animate-in fade-in">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#6D8196] dark:text-[#CBCBCB]">Vulnerability Score:</span>
            <span className="text-[#D9534F] font-mono font-semibold">EVT {riskZone.vulnerabilityIndex}/10</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#6D8196] dark:text-[#CBCBCB]">Response Tier:</span>
            <span className="text-[#D9822B] font-semibold">{riskZone.protocolTier}</span>
          </div>
          <div className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB] border-t border-[#CBCBCB] dark:border-[#353D46] pt-2 leading-relaxed">
            Nearshore sensitive assets: aquaculture enclosures, mangrove nurseries, and artisanal fishing sectors.
          </div>
          <button
            onClick={onOpenAssets}
            className="w-full mt-1 py-1.5 rounded-md bg-[#6D8196] hover:bg-[#586A7D] text-[#FFFFE3] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
          >
            <span>Inspect Asset Vulnerability Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
