import React, { useState } from 'react';
import { 
  TrendingUp, 
  Wind, 
  Waves, 
  Compass, 
  ShieldAlert, 
  ArrowRight
} from 'lucide-react';
import { ForecastStep, MetOceanTelemetry, Incident, ShorelineRiskZone } from '../types';

interface DriftForecastViewProps {
  forecastSteps: ForecastStep[];
  metocean: MetOceanTelemetry;
  incident: Incident;
  shorelineRisk: ShorelineRiskZone;
  onOpenWorkspace: () => void;
}

export const DriftForecastView: React.FC<DriftForecastViewProps> = ({
  forecastSteps,
  metocean,
  incident,
  shorelineRisk,
  onOpenWorkspace,
}) => {
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(3); // +24H selected by default
  const activeStep = forecastSteps[selectedStepIndex] || forecastSteps[0];

  return (
    <div className="w-full h-[calc(100vh-2.75rem)] overflow-y-auto p-6 bg-[#FFFFE3] dark:bg-[#171B1F] text-[#4A4A4A] dark:text-[#FFFFE3] select-none font-sans custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#CBCBCB] dark:border-[#353D46] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] text-[#6D8196] shadow-xs">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-wide text-[#4A4A4A] dark:text-[#FFFFE3] uppercase">
                  Spill Drift Forecast & Dispersion Modeling
                </h1>
                <p className="text-xs text-[#6D8196] dark:text-[#CBCBCB] mt-0.5">
                  Forward Lagrangian hydrodynamic dispersion simulation with stochastic uncertainty envelopes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6D8196] dark:text-[#CBCBCB]">Engine:</span>
            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] text-[#6D8196] dark:text-[#FFFFE3] shadow-xs">
              SpillTheory-Drift v1.8 (Lagrangian 4D)
            </span>
          </div>
        </div>

        {/* Timeline Keyframe Buttons: NOW, +6H, +12H, +24H, +48H */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6D8196] dark:text-[#CBCBCB]">
              Forecast Time Horizon (0 to +48 Hours)
            </span>
            <span className="text-xs text-[#6D8196] dark:text-[#CBCBCB]">
              Targeted Window: <strong className="text-[#4A4A4A] dark:text-[#FFFFE3] font-mono">{activeStep.timeUtc}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {forecastSteps.map((step, idx) => {
              const isSelected = selectedStepIndex === idx;
              return (
                <button
                  key={step.stepHours}
                  onClick={() => setSelectedStepIndex(idx)}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#6D8196]/15 border-2 border-[#6D8196] text-[#4A4A4A] dark:text-[#FFFFE3] shadow-xs'
                      : 'bg-[#FFFFE3]/40 dark:bg-[#1F242A] border-[#CBCBCB] dark:border-[#353D46] hover:border-[#6D8196] text-[#6D8196] dark:text-[#CBCBCB]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{step.label}</span>
                    {step.stepHours === 24 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#D9822B]/15 text-[#D9822B] border border-[#D9822B]/30 font-bold">
                        RISK ETA
                      </span>
                    )}
                  </div>
                  <div className="text-base font-bold mt-1 text-[#4A4A4A] dark:text-[#FFFFE3] font-mono tabular-nums">
                    {step.estimatedAreaKm2} km²
                  </div>
                  <div className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB] mt-0.5 font-mono">
                    Uncertainty: ±{step.uncertaintyRadiusKm} km
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2-Column Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Corridor & Uncertainty Metrics */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] space-y-3 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6D8196] dark:text-[#CBCBCB] block">
                Horizon Telemetry ({activeStep.label})
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#FFFFE3]/50 dark:bg-[#1F242A] rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46]">
                  <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] block uppercase tracking-wider">Projected Surface Area</span>
                  <span className="text-lg font-bold text-[#D9534F] font-mono tabular-nums">{activeStep.estimatedAreaKm2} km²</span>
                  <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB] block mt-0.5 font-mono">
                    +{(activeStep.estimatedAreaKm2 - incident.slickAreaKm2).toFixed(1)} km² expansion
                  </span>
                </div>

                <div className="p-3 bg-[#FFFFE3]/50 dark:bg-[#1F242A] rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46]">
                  <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] block uppercase tracking-wider">Uncertainty Envelope</span>
                  <span className="text-lg font-bold text-[#D9822B] font-mono tabular-nums">±{activeStep.uncertaintyRadiusKm} km</span>
                  <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB] block mt-0.5">Stochastic Gaussian cone</span>
                </div>

                <div className="p-3 bg-[#FFFFE3]/50 dark:bg-[#1F242A] rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46]">
                  <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] block uppercase tracking-wider">Forecast Center</span>
                  <span className="text-xs font-semibold text-[#6D8196] dark:text-[#FFFFE3] font-mono tabular-nums block mt-1">
                    {activeStep.centerCoordinates[0]}°N, {activeStep.centerCoordinates[1]}°E
                  </span>
                  <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB] block mt-0.5">Bearing: 130° SE</span>
                </div>
              </div>

              {/* Uncertainty Progression visual bar */}
              <div className="p-3.5 rounded-lg bg-[#FFFFE3]/50 dark:bg-[#1F242A] border border-[#CBCBCB]/70 dark:border-[#353D46] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#6D8196] dark:text-[#CBCBCB] font-medium">Confidence Gradient:</span>
                  <span className={`font-semibold ${
                    activeStep.stepHours <= 6 ? 'text-[#6D8196] dark:text-[#FFFFE3]' : activeStep.stepHours <= 24 ? 'text-[#D9822B]' : 'text-[#6D8196]/70 dark:text-[#CBCBCB]/70'
                  }`}>
                    {activeStep.stepHours <= 6 ? 'High Confidence (92%)' : activeStep.stepHours <= 24 ? 'Moderate Confidence (76%)' : 'Long-Range Estimate (58%)'}
                  </span>
                </div>

                <div className="w-full bg-[#CBCBCB]/40 dark:bg-[#171B1F] h-2 rounded-full overflow-hidden flex border border-[#CBCBCB] dark:border-[#353D46]">
                  <div className="h-full bg-[#6D8196]" style={{ width: '25%' }} title="0-6h High" />
                  <div className="h-full bg-[#D9822B]" style={{ width: '35%' }} title="6-24h Medium" />
                  <div className="h-full bg-[#CBCBCB]" style={{ width: '40%' }} title="24-48h Diffuse" />
                </div>
                <div className="flex justify-between text-[10px] text-[#6D8196] dark:text-[#CBCBCB] font-mono">
                  <span>T+0h (Sharp)</span>
                  <span>T+12h (Spreading)</span>
                  <span>T+48h (Diffusive Envelope)</span>
                </div>
              </div>
            </div>

            {/* Shoreline Impact Warning */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#272E36] border border-[#D9822B]/60 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2 text-[#D9822B] font-semibold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" />
                <span>Projected Shoreline Impact Alert</span>
              </div>
              <p className="text-xs text-[#4A4A4A] dark:text-[#CBCBCB] leading-relaxed">
                Hydrodynamic trajectories indicate the leading edge of the plume will intersect the 
                <strong className="text-[#4A4A4A] dark:text-[#FFFFE3]"> {shorelineRisk.name} </strong> at approximately <strong className="text-[#D9822B]">T+23.5 hours</strong> under persistent Northwest wind conditions.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-[#CBCBCB] dark:border-[#353D46] text-xs">
                <span className="text-[#6D8196] dark:text-[#CBCBCB]">Distance to Shore: <strong className="text-[#4A4A4A] dark:text-[#FFFFE3] font-mono">55.6 km</strong></span>
                <button
                  onClick={onOpenWorkspace}
                  className="text-[#6D8196] hover:text-[#586A7D] dark:text-[#FFFFE3] flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  <span>View Vectors on Map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Environmental Drivers */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] space-y-3 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6D8196] dark:text-[#CBCBCB] block">
                Environmental Forcing Telemetry
              </span>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#FFFFE3]/50 dark:bg-[#1F242A] border border-[#CBCBCB]/70 dark:border-[#353D46] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-[#6D8196]" />
                    <span className="text-[#6D8196] dark:text-[#CBCBCB]">Surface Wind (10m)</span>
                  </div>
                  <span className="font-semibold text-[#4A4A4A] dark:text-[#FFFFE3] font-mono tabular-nums">{metocean.windSpeedKt} kt · NW ({metocean.windDirectionDeg}°)</span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#FFFFE3]/50 dark:bg-[#1F242A] border border-[#CBCBCB]/70 dark:border-[#353D46] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#6D8196]" />
                    <span className="text-[#6D8196] dark:text-[#CBCBCB]">Ocean Current</span>
                  </div>
                  <span className="font-semibold text-[#4A4A4A] dark:text-[#FFFFE3] font-mono tabular-nums">{metocean.currentSpeedKt} kt · SE ({metocean.currentDirectionDeg}°)</span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#FFFFE3]/50 dark:bg-[#1F242A] border border-[#CBCBCB]/70 dark:border-[#353D46] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Waves className="w-4 h-4 text-[#6D8196]" />
                    <span className="text-[#6D8196] dark:text-[#CBCBCB]">Significant Wave Height</span>
                  </div>
                  <span className="font-semibold text-[#4A4A4A] dark:text-[#FFFFE3] font-mono tabular-nums">{metocean.waveHeightM} m (Moderate)</span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#FFFFE3]/50 dark:bg-[#1F242A] border border-[#CBCBCB]/70 dark:border-[#353D46] flex items-center justify-between">
                  <span className="text-[#6D8196] dark:text-[#CBCBCB]">Sea Surface Temp</span>
                  <span className="font-semibold text-[#4A4A4A] dark:text-[#FFFFE3] font-mono tabular-nums">{metocean.seaTempC}°C</span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#FFFFE3]/50 dark:bg-[#1F242A] border border-[#CBCBCB]/70 dark:border-[#353D46] flex items-center justify-between">
                  <span className="text-[#6D8196] dark:text-[#CBCBCB]">Atmospheric Pressure</span>
                  <span className="font-semibold text-[#4A4A4A] dark:text-[#FFFFE3] font-mono tabular-nums">{metocean.airPressureHpa} hPa</span>
                </div>
              </div>

              {/* Formula Callout */}
              <div className="p-3 rounded-lg bg-[#FFFFE3]/50 dark:bg-[#1F242A] border border-[#CBCBCB]/70 dark:border-[#353D46] text-xs space-y-1">
                <div className="text-[#6D8196] font-semibold text-[10px] uppercase tracking-wider">Lagrangian Vector Sum:</div>
                <div className="font-mono text-[11px] text-[#4A4A4A] dark:text-[#CBCBCB]">Vdrift = Vcurrent + 0.03 × Vwind</div>
                <div className="text-[#6D8196] dark:text-[#FFFFE3] font-semibold pt-1 font-mono">
                  Net Advection: 0.69 kt heading 130° SE
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
