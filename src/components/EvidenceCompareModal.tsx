import React, { useState } from 'react';
import { X, Sliders, Satellite } from 'lucide-react';
import { SARDetectionResult } from '../types';

interface EvidenceCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectionData: SARDetectionResult;
}

export const EvidenceCompareModal: React.FC<EvidenceCompareModalProps> = ({
  isOpen,
  onClose,
  detectionData,
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100
  const [viewMode, setViewMode] = useState<'SLIDER' | 'SIDE_BY_SIDE' | 'OVERLAY'>('SLIDER');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-5xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#CBCBCB] dark:border-[#353D46] bg-[#FFFFE3]/50 dark:bg-[#1F242A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Satellite className="w-4 h-4 text-[#6D8196]" />
            <div>
              <h3 className="font-semibold text-xs uppercase tracking-wider text-[#4A4A4A] dark:text-[#FFFFE3]">
                Sentinel-1 SAR Slick Segmentation Analysis
              </h3>
              <div className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB]">
                Tile: {detectionData.tileId} · Polarization: {detectionData.polarization} · Res: 10m
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-[#FFFFE3]/60 dark:bg-[#171B1F] p-1 rounded-md border border-[#CBCBCB] dark:border-[#353D46] text-xs">
              <button
                onClick={() => setViewMode('SLIDER')}
                className={`px-2.5 py-1 rounded-md transition-colors text-xs font-medium cursor-pointer ${
                  viewMode === 'SLIDER' ? 'bg-white dark:bg-[#272E36] text-[#6D8196] dark:text-[#FFFFE3] border border-[#6D8196] shadow-xs' : 'text-[#6D8196] dark:text-[#CBCBCB] hover:text-[#4A4A4A]'
                }`}
              >
                Split Slider
              </button>
              <button
                onClick={() => setViewMode('SIDE_BY_SIDE')}
                className={`px-2.5 py-1 rounded-md transition-colors text-xs font-medium cursor-pointer ${
                  viewMode === 'SIDE_BY_SIDE' ? 'bg-white dark:bg-[#272E36] text-[#6D8196] dark:text-[#FFFFE3] border border-[#6D8196] shadow-xs' : 'text-[#6D8196] dark:text-[#CBCBCB] hover:text-[#4A4A4A]'
                }`}
              >
                Dual View
              </button>
              <button
                onClick={() => setViewMode('OVERLAY')}
                className={`px-2.5 py-1 rounded-md transition-colors text-xs font-medium cursor-pointer ${
                  viewMode === 'OVERLAY' ? 'bg-white dark:bg-[#272E36] text-[#6D8196] dark:text-[#FFFFE3] border border-[#6D8196] shadow-xs' : 'text-[#6D8196] dark:text-[#CBCBCB] hover:text-[#4A4A4A]'
                }`}
              >
                Overlay
              </button>
            </div>

            <button onClick={onClose} className="p-1 rounded-md hover:bg-[#CBCBCB]/30 text-[#6D8196] hover:text-[#4A4A4A] dark:text-[#CBCBCB] dark:hover:text-[#FFFFE3] transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Center - Visualization Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <div className="relative w-full h-96 bg-[#171B1F] rounded-lg border border-[#CBCBCB] dark:border-[#353D46] overflow-hidden flex items-center justify-center">
            {viewMode === 'SLIDER' && (
              <div className="relative w-full h-full select-none overflow-hidden">
                {/* Background: Segmented AI Mask */}
                <div className="absolute inset-0 flex items-center justify-center bg-[#171B1F]">
                  <div className="relative w-full h-full bg-[#1F242A] flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 800 450">
                      <rect width="800" height="450" fill="#171B1F" />
                      {/* Grid / ocean lines */}
                      <g stroke="#353D46" strokeWidth="0.5" strokeDasharray="3, 6">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <line key={i} x1="0" y1={i * 24} x2="800" y2={i * 24} />
                        ))}
                      </g>
                      {/* AI Detected Mask Shape with Red/Amber fill */}
                      <path
                        d="M 320,160 Q 380,140 450,170 T 520,240 Q 480,310 390,290 T 280,230 Z"
                        fill="rgba(217, 83, 79, 0.35)"
                        stroke="#D9534F"
                        strokeWidth="2"
                        strokeDasharray="4, 4"
                      />
                      <text x="360" y="225" fill="#D9534F" fontSize="13" fontFamily="Inter, sans-serif" fontWeight="bold">
                        AI SEGMENTED SLICK MASK (94.7%)
                      </text>
                      <text x="360" y="245" fill="#D9822B" fontSize="11" fontFamily="Inter, sans-serif">
                        Area: 13.48 km² · Damping: -5.8 dB
                      </text>
                    </svg>
                  </div>
                </div>

                {/* Foreground: Original Raw SAR clipped by sliderPosition */}
                <div
                  className="absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <div className="w-full h-full bg-[#171B1F] flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 800 450" preserveAspectRatio="none">
                      <rect width="800" height="450" fill="#171B1F" />
                      <g stroke="#353D46" strokeWidth="0.5">
                        {Array.from({ length: 40 }).map((_, i) => (
                          <line key={i} x1="0" y1={i * 12} x2="800" y2={i * 12} opacity="0.3" />
                        ))}
                      </g>
                      {/* Natural dark damping depression */}
                      <path
                        d="M 320,160 Q 380,140 450,170 T 520,240 Q 480,310 390,290 T 280,230 Z"
                        fill="#0F1316"
                        stroke="#353D46"
                        strokeWidth="1"
                      />
                      <text x="60" y="50" fill="#FFFFE3" fontSize="13" fontFamily="Inter, sans-serif" fontWeight="bold">
                        ORIGINAL C-BAND SAR BACKSCATTER
                      </text>
                      <text x="60" y="70" fill="#6D8196" fontSize="11" fontFamily="Inter, sans-serif">
                        VV Polarization (Sigma-0)
                      </text>
                    </svg>
                  </div>
                </div>

                {/* Vertical Divider line */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-[#6D8196] z-10 pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-7 h-7 rounded-full bg-white dark:bg-[#272E36] border-2 border-[#6D8196] flex items-center justify-center text-[#6D8196] shadow-sm">
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Drag Slider Overlay */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                />
              </div>
            )}

            {viewMode === 'SIDE_BY_SIDE' && (
              <div className="grid grid-cols-2 w-full h-full gap-2 p-2 bg-[#171B1F]">
                <div className="border border-[#CBCBCB] dark:border-[#353D46] rounded-lg flex flex-col items-center justify-center p-4 bg-[#1F242A]">
                  <span className="text-xs text-[#6D8196] dark:text-[#CBCBCB] mb-2 font-medium">RAW SENTINEL-1 SAR</span>
                  <div className="w-48 h-36 bg-[#171B1F] border border-[#353D46] rounded flex items-center justify-center text-[#6D8196] text-xs">
                    Dark oceanic depression (-9.2 dB)
                  </div>
                </div>
                <div className="border border-[#CBCBCB] dark:border-[#353D46] rounded-lg flex flex-col items-center justify-center p-4 bg-[#1F242A]">
                  <span className="text-xs text-[#6D8196] dark:text-[#FFFFE3] mb-2 font-medium">U-NET SEGMENTATION MASK</span>
                  <div className="w-48 h-36 bg-[#171B1F] border border-[#D9534F]/40 rounded flex items-center justify-center text-[#D9534F] text-xs">
                    Extracted Slick Boundary
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'OVERLAY' && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#171B1F] p-6 text-center">
                <div className="text-[#6D8196] font-semibold text-xs mb-1 uppercase tracking-wider">Neural Confidence Density Map</div>
                <p className="text-[#6D8196] dark:text-[#CBCBCB] text-xs max-w-md">
                  Overlaying multi-frequency C-band coherence and threshold damping. 94.7% intersection over union across 13.48 km² surface area.
                </p>
              </div>
            )}
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-[#FFFFE3]/50 dark:bg-[#1F242A] rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46]">
              <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] block uppercase tracking-wider font-medium">Slick Surface Area</span>
              <span className="text-base font-bold text-[#D9534F] font-mono tabular-nums">{detectionData.metrics.areaKm2} km²</span>
            </div>
            <div className="p-3 bg-[#FFFFE3]/50 dark:bg-[#1F242A] rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46]">
              <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] block uppercase tracking-wider font-medium">Perimeter Length</span>
              <span className="text-base font-bold text-[#4A4A4A] dark:text-[#FFFFE3] font-mono tabular-nums">{detectionData.metrics.perimeterKm} km</span>
            </div>
            <div className="p-3 bg-[#FFFFE3]/50 dark:bg-[#1F242A] rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46]">
              <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] block uppercase tracking-wider font-medium">Mean Backscatter</span>
              <span className="text-base font-bold text-[#6D8196] dark:text-[#FFFFE3] font-mono tabular-nums">{detectionData.metrics.meanBackscatterDb} dB</span>
            </div>
            <div className="p-3 bg-[#FFFFE3]/50 dark:bg-[#1F242A] rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46]">
              <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] block uppercase tracking-wider font-medium">Detection Confidence</span>
              <span className="text-base font-bold text-[#6D8196] dark:text-[#FFFFE3] font-mono tabular-nums">{detectionData.metrics.classificationConfidence}%</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#CBCBCB] dark:border-[#353D46] bg-[#FFFFE3]/40 dark:bg-[#1F242A] flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB]">
            Sensor: {detectionData.satellite} · Resolution: {detectionData.resolutionM}m GSD
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-white dark:bg-[#272E36] hover:border-[#6D8196] border border-[#CBCBCB] dark:border-[#353D46] text-[#4A4A4A] dark:text-[#FFFFE3] text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
