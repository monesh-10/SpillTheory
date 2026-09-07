import React from 'react';

interface SpillTheoryLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  showTagline?: boolean;
  variant?: 'raster' | 'vector' | 'hybrid';
}

export const SpillTheoryLogo: React.FC<SpillTheoryLogoProps> = ({
  className = '',
  size = 'md',
  showWordmark = true,
  showTagline = false,
  variant = 'hybrid',
}) => {
  // Size mappings
  const markDimensions = {
    xs: 'w-5 h-5',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }[size];

  const fontSize = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Glowing Oceanic S-Ribbon Logo Mark */}
      <div className={`relative ${markDimensions} shrink-0 flex items-center justify-center`}>
        <div className="absolute inset-0 rounded-full bg-[#00E5FF]/20 blur-md pointer-events-none" />

        {/* High-res transparent emblem */}
        <img
          src="/logo-mark.png"
          alt="SpillTheory Emblem"
          className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(0,229,255,0.6)] relative z-10"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'block';
          }}
        />

        {/* Glowing Vector S-Wave Fallback */}
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full hidden relative z-10 filter drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]"
        >
          <circle cx="28" cy="8" r="2" fill="#00E5FF" />
          <path d="M26 10L23 13" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
          
          <path
            d="M24 7C16 5 8 9 8 16C8 22 22 17 22 24C22 29 15 32 10 29"
            stroke="url(#cyan_wave_gradient)"
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <path
            d="M13 16C16 14.5 19 15.5 21 17"
            stroke="#00E5FF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="cyan_wave_gradient" x1="8" y1="7" x2="24" y2="31" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00E5FF" />
              <stop offset="0.5" stopColor="#38BDF8" />
              <stop offset="1" stopColor="#0284C7" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Wordmark: SPILL (white) + THEORY (cyan) */}
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <div className={`font-extrabold tracking-tight uppercase flex items-center ${fontSize}`}>
            <span className="text-white">SPILL</span>
            <span className="text-[#00E5FF]">THEORY</span>
          </div>

          {(showTagline || true) && (
            <span className="text-[7.5px] tracking-[0.22em] text-[#38BDF8]/80 font-mono uppercase mt-0.5 whitespace-nowrap">
              MARITIME INTELLIGENCE FOR A CLEANER TOMORROW
            </span>
          )}
        </div>
      )}
    </div>
  );
};
