import React from 'react';
import { X, Check } from 'lucide-react';

interface MapGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MapGuideModal: React.FC<MapGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleDismissForever = () => {
    try {
      localStorage.setItem('spilltheory_map_guide_dismissed', 'true');
    } catch {
      // ignore
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#CBCBCB] dark:border-[#353D46] bg-[#FFFFE3]/50 dark:bg-[#1F242A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6D8196] animate-pulse" />
            <h3 className="font-semibold text-xs tracking-wider uppercase text-[#4A4A4A] dark:text-[#FFFFE3]">
              How to Read This Map
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#6D8196] hover:text-[#4A4A4A] dark:text-[#CBCBCB] dark:hover:text-[#FFFFE3] hover:bg-[#CBCBCB]/30 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Items */}
        <div className="p-5 space-y-3.5 text-xs text-[#4A4A4A] dark:text-[#FFFFE3]">
          <p className="text-[#6D8196] dark:text-[#CBCBCB] text-[11px] leading-relaxed">
            SpillTheory pairs satellite radar, reverse hydrodynamic drift, and AIS vessel kinematics on a high-precision nautical chart.
          </p>

          <div className="space-y-2.5">
            <div className="flex items-center gap-3.5 p-2.5 rounded-lg bg-[#FFFFE3]/50 dark:bg-[#1F242A] border border-[#CBCBCB]/70 dark:border-[#353D46]">
              <div className="w-5 h-5 rounded bg-[#D9534F]/20 border border-[#D9534F] shrink-0" />
              <div>
                <span className="font-semibold text-[#D9534F] uppercase text-[11px] block">Multi-Contour Slick</span>
                <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[11px]">Outer sheen envelope & heavy crude emulsion core from Sentinel-1 SAR</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-2.5 rounded-lg bg-[#FFFFE3]/50 dark:bg-[#1F242A] border border-[#CBCBCB]/70 dark:border-[#353D46]">
              <div className="w-5 h-5 rounded-full border-2 border-[#D9822B] flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D9822B]" />
              </div>
              <div>
                <span className="font-semibold text-[#D9822B] uppercase text-[11px] block">Amber Target (◎)</span>
                <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[11px]">Probable spill origin computed via backward Lagrangian hindcast</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-2.5 rounded-lg bg-[#FFFFE3]/50 dark:bg-[#1F242A] border border-[#CBCBCB]/70 dark:border-[#353D46]">
              <svg className="w-5 h-5 shrink-0 fill-[#6D8196]" viewBox="0 0 24 24">
                <polygon points="12 2 19 21 12 17 5 21 12 2" />
              </svg>
              <div>
                <span className="font-semibold text-[#6D8196] dark:text-[#FFFFE3] uppercase text-[11px] block">Ship Vector Icons</span>
                <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[11px]">Vessels in sector rotated to true heading (Red with tactical badge = #1 suspect)</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-2.5 rounded-lg bg-[#FFFFE3]/50 dark:bg-[#1F242A] border border-[#CBCBCB]/70 dark:border-[#353D46]">
              <div className="w-8 h-1 bg-[#CBCBCB]/40 dark:bg-[#353D46] relative flex items-center justify-center shrink-0">
                <div className="w-full border-t border-dashed border-[#6D8196]" />
                <span className="text-[10px] text-[#6D8196] absolute">›</span>
              </div>
              <div>
                <span className="font-semibold text-[#4A4A4A] dark:text-[#FFFFE3] uppercase text-[11px] block">Line with Chevrons (──›──›)</span>
                <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[11px]">Historical and active ship navigation paths</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-2.5 rounded-lg bg-[#FFFFE3]/50 dark:bg-[#1F242A] border border-[#CBCBCB]/70 dark:border-[#353D46]">
              <div className="w-8 h-1 border-t-2 border-dashed border-[#6D8196] shrink-0" />
              <div>
                <span className="font-semibold text-[#6D8196] dark:text-[#FFFFE3] uppercase text-[11px] block">Slate Hindcast Path (‹── ‹──)</span>
                <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[11px]">Drift hindcast tracing slick backwards from detection to source</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-2.5 rounded-lg bg-[#FFFFE3]/50 dark:bg-[#1F242A] border border-[#CBCBCB]/70 dark:border-[#353D46]">
              <div className="w-8 h-1 border-t-2 border-dotted border-[#6D8196] shrink-0" />
              <div>
                <span className="font-semibold text-[#6D8196] dark:text-[#FFFFE3] uppercase text-[11px] block">Slate Forecast Path (──› ──›)</span>
                <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[11px]">Forward drift forecast corridor (+6h to +48h trajectory)</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-2.5 rounded-lg bg-[#FFFFE3]/50 dark:bg-[#1F242A] border border-[#CBCBCB]/70 dark:border-[#353D46]">
              <div className="w-5 h-5 rounded bg-[#D9822B]/20 border border-[#D9822B] shrink-0" />
              <div>
                <span className="font-semibold text-[#D9822B] uppercase text-[11px] block">Amber Coastal Zone</span>
                <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[11px]">Sensitive shoreline risk sector under imminent environmental threat</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#CBCBCB] dark:border-[#353D46] bg-[#FFFFE3]/40 dark:bg-[#1F242A] flex items-center justify-between">
          <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB]">
            Access anytime via the map legend
          </span>
          <button
            onClick={handleDismissForever}
            className="px-4 py-1.5 rounded-md bg-[#6D8196] hover:bg-[#586A7D] text-[#FFFFE3] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Understood</span>
          </button>
        </div>
      </div>
    </div>
  );
};
