import React from 'react';
import { 
  Satellite, 
  RotateCcw, 
  Ship, 
  TrendingUp, 
  FileText, 
  ArrowRight, 
  Layers
} from 'lucide-react';
import { SpillTheoryLogo } from '../components/SpillTheoryLogo';

interface LandingPageViewProps {
  onEnterApp: () => void;
  onRunDemo: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onEnterApp,
  onRunDemo,
}) => {
  return (
    <div className="w-full min-h-[calc(100vh-2.75rem)] overflow-y-auto bg-[#FFFFE3] dark:bg-[#171B1F] text-[#4A4A4A] dark:text-[#FFFFE3] select-none font-sans custom-scrollbar">
      {/* Hero Section */}
      <section className="relative px-6 py-16 md:py-20 max-w-6xl mx-auto flex flex-col items-center text-center space-y-6">
        {/* Minimalist Logo Emblem & Wordmark */}
        <div className="flex flex-col items-center gap-2 mb-2">
          <SpillTheoryLogo size="lg" showWordmark={true} showTagline={true} />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] text-[#6D8196] dark:text-[#FFFFE3] text-xs font-mono shadow-xs">
          <span>Autonomous Maritime Intelligence & Ocean Forensics Engine</span>
        </div>

        {/* Hero Subtitle & Description */}
        <div className="space-y-3 max-w-3xl">
          <p className="text-base md:text-xl text-[#6D8196] dark:text-[#CBCBCB] max-w-2xl mx-auto font-medium">
            AI-Powered Maritime Oil Spill Intelligence & Vessel Attribution
          </p>
          <p className="text-xs md:text-sm text-[#4A4A4A] dark:text-[#CBCBCB]/90 max-w-xl mx-auto leading-relaxed">
            Detect probable slicks from satellite SAR imagery, reconstruct hydrodynamic drift backwards to estimate origin, and rank nearby vessel kinematics using forensic AIS tracking.
          </p>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={onEnterApp}
            className="px-5 py-2.5 rounded-md bg-[#6D8196] hover:bg-[#586A7D] text-[#FFFFE3] font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <span>Enter Mission Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onRunDemo}
            className="px-5 py-2.5 rounded-md bg-white hover:bg-[#FFFFE3] dark:bg-[#272E36] dark:hover:bg-[#303943] border border-[#CBCBCB] dark:border-[#353D46] text-[#4A4A4A] dark:text-[#FFFFE3] font-semibold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <span>Run 10-Step Investigation Demo</span>
          </button>
        </div>

        {/* Graphic Digital Twin Map Mockup Banner */}
        <div className="w-full max-w-4xl mt-6 p-1 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] shadow-md">
          <div className="relative w-full h-80 rounded-lg bg-[#1F242A] overflow-hidden border border-[#CBCBCB]/40 dark:border-[#353D46] flex items-center justify-center">
            {/* SVG Digital Twin Diagram */}
            <svg className="w-full h-full" viewBox="0 0 900 400">
              <defs>
                <radialGradient id="originGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#6D8196" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6D8196" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Grid lines */}
              <g stroke="#353D46" strokeWidth="0.5" strokeDasharray="3, 6">
                {Array.from({ length: 15 }).map((_, i) => (
                  <line key={`v-${i}`} x1={i * 60} y1="0" x2={i * 60} y2="400" />
                ))}
                {Array.from({ length: 10 }).map((_, i) => (
                  <line key={`h-${i}`} x1="0" y1={i * 40} x2="900" y2={i * 40} />
                ))}
              </g>

              {/* Hindcast Trajectory */}
              <path
                d="M 320,180 C 370,210 440,240 500,230"
                stroke="#6D8196"
                strokeWidth="2.2"
                strokeDasharray="5, 5"
                fill="none"
              />

              {/* Forecast Corridor */}
              <path
                d="M 500,230 C 580,220 670,260 760,280"
                stroke="#6D8196"
                strokeWidth="2"
                strokeDasharray="4, 4"
                fill="none"
              />

              {/* Origin Probability Region */}
              <circle cx="320" cy="180" r="45" fill="url(#originGlow)" stroke="#D9822B" strokeWidth="1" strokeDasharray="3, 3" />
              <circle cx="320" cy="180" r="20" fill="#D9822B" fillOpacity="0.2" stroke="#D9822B" strokeWidth="1.5" />
              <circle cx="320" cy="180" r="3.5" fill="#FFFFE3" />

              {/* Oil Slick Polygon */}
              <path
                d="M 470,210 Q 520,190 540,225 T 525,255 Q 490,265 475,245 Z"
                fill="rgba(217, 83, 79, 0.35)"
                stroke="#D9534F"
                strokeWidth="2"
                strokeDasharray="3, 3"
              />

              {/* Suspect Vessel Marker MT OCEAN STAR */}
              <circle cx="340" cy="165" r="12" fill="none" stroke="#D9534F" strokeWidth="1.5" />
              <polygon points="340,155 347,173 340,169 333,173" fill="#D9534F" stroke="#171B1F" strokeWidth="0.8" />

              {/* Text annotations */}
              <text x="320" y="125" fill="#6D8196" fontSize="11" fontFamily="Inter, sans-serif" fontWeight="bold" textAnchor="middle">
                PROBABLE ORIGIN (78.2% CONFIDENCE)
              </text>
              <text x="505" y="180" fill="#D9534F" fontSize="11" fontFamily="Inter, sans-serif" fontWeight="bold" textAnchor="middle">
                INCIDENT OCN-042 (13.48 km²)
              </text>
              <text x="355" y="160" fill="#D9534F" fontSize="10" fontFamily="Inter, sans-serif" fontWeight="bold">
                MT OCEAN STAR (91.7%)
              </text>
              <text x="760" y="265" fill="#D9822B" fontSize="10" fontFamily="Inter, sans-serif" fontWeight="bold">
                SHORELINE RISK ETA ~23.5H
              </text>
            </svg>

            {/* Floating Overlays */}
            <div className="absolute top-3 left-3 p-2.5 rounded-md bg-[#FFFFE3]/95 dark:bg-[#1F242A]/95 border border-[#CBCBCB] dark:border-[#353D46] text-left text-[11px] space-y-0.5 shadow-xs">
              <span className="text-[#6D8196] font-semibold block text-[10px] uppercase tracking-wider">Active Geospatial Feed</span>
              <span className="text-[#4A4A4A] dark:text-[#FFFFE3]">Sentinel-1A IW GRDH · VV-Pol</span>
              <span className="text-[#6D8196] dark:text-[#CBCBCB] block font-mono text-[10px]">Backscatter: -9.2 dB · Area: 13.48 km²</span>
            </div>

            <div className="absolute bottom-3 right-3 p-2.5 rounded-md bg-[#FFFFE3]/95 dark:bg-[#1F242A]/95 border border-[#CBCBCB] dark:border-[#353D46] text-right text-[11px] space-y-0.5 shadow-xs">
              <span className="text-[#D9534F] font-semibold block text-[10px] uppercase tracking-wider">Top Priority Vessel</span>
              <span className="text-[#4A4A4A] dark:text-[#FFFFE3]">MT OCEAN STAR (IMO 9384910)</span>
              <span className="text-[#D9822B] block font-mono text-[10px]">Proximity: 2.8 km · Speed Drop Detected</span>
            </div>
          </div>
        </div>
      </section>

      {/* The 6-Stage Intelligence Pipeline */}
      <section className="px-6 py-14 max-w-6xl mx-auto border-t border-[#CBCBCB] dark:border-[#353D46] space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-widest text-[#6D8196] dark:text-[#CBCBCB] font-semibold">
            Automated Forensic Pipeline
          </span>
          <h2 className="text-2xl font-bold uppercase text-[#4A4A4A] dark:text-[#FFFFE3]">
            From Satellite Telemetry to Legal Evidence
          </h2>
          <p className="text-xs text-[#6D8196] dark:text-[#CBCBCB] max-w-xl mx-auto leading-relaxed">
            An end-to-end computational intelligence workflow uniting radar remote sensing, hydrodynamic dispersion, and forensic AIS vessel kinematics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              step: '01',
              title: 'DETECT',
              desc: 'Sentinel-1 SAR imagery processed by SpillTheory-Seg U-Net to detect capillary wave damping.',
              icon: Satellite,
              color: 'text-[#6D8196]',
            },
            {
              step: '02',
              title: 'CHARACTERIZE',
              desc: 'Calculate precise non-convex slick geometry, thickness distribution, and estimated age.',
              icon: Layers,
              color: 'text-[#6D8196]',
            },
            {
              step: '03',
              title: 'HINDCAST',
              desc: 'Reverse 4D Lagrangian particle tracking advects 500 stochastic particles to estimate source region.',
              icon: RotateCcw,
              color: 'text-[#6D8196]',
            },
            {
              step: '04',
              title: 'ATTRIBUTE',
              desc: 'Reconstruct historical AIS tracks and rank candidate vessels using multi-factor Bayesian evidence.',
              icon: Ship,
              color: 'text-[#D9534F]',
            },
            {
              step: '05',
              title: 'FORECAST',
              desc: 'Predict forward dispersion corridor with stochastic uncertainty envelopes and wave forcing.',
              icon: TrendingUp,
              color: 'text-[#6D8196]',
            },
            {
              step: '06',
              title: 'RESPOND & REPORT',
              desc: 'Evaluate coastal asset vulnerability and compile an ICG/MPCB-certified investigation dossier.',
              icon: FileText,
              color: 'text-[#D9822B]',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="p-4 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] space-y-2 hover:border-[#6D8196] transition-colors shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg font-bold text-[#6D8196] dark:text-[#CBCBCB]">
                    {item.step}
                  </span>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <h3 className="font-semibold text-xs uppercase tracking-wider text-[#4A4A4A] dark:text-[#FFFFE3]">{item.title}</h3>
                <p className="text-xs text-[#6D8196] dark:text-[#CBCBCB] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="p-6 border-t border-[#CBCBCB] dark:border-[#353D46] text-center text-xs text-[#6D8196] dark:text-[#CBCBCB]">
        spilltheory · Autonomous Maritime Intelligence & Forensic Vessel Attribution
      </footer>
    </div>
  );
};
