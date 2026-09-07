import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Clock
} from 'lucide-react';
import { Incident, Vessel, HindcastResult, MetOceanTelemetry, ShorelineRiskZone } from '../types';

interface ReportsViewProps {
  incident: Incident;
  topVessel: Vessel;
  hindcast: HindcastResult;
  metocean: MetOceanTelemetry;
  shorelineRisk: ShorelineRiskZone;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  incident,
  topVessel,
  hindcast,
  metocean,
  shorelineRisk,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handlePrintPDF = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      window.print();
    }, 800);
  };

  return (
    <div className="w-full h-[calc(100vh-2.75rem)] overflow-y-auto p-6 bg-[#FFFFE3] dark:bg-[#171B1F] text-[#4A4A4A] dark:text-[#FFFFE3] select-none font-sans custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBCBCB] dark:border-[#353D46] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] text-[#6D8196] shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-wide text-[#4A4A4A] dark:text-[#FFFFE3] uppercase">
                  Forensic Investigation Dossier
                </h1>
                <p className="text-xs text-[#6D8196] dark:text-[#CBCBCB] mt-0.5">
                  Official maritime evidence package prepared for Indian Coast Guard, DG Shipping & MPCB.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="http://127.0.0.1:8000/api/scenario/SPILL_001/export-pdf"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-md bg-[#6D8196] hover:bg-[#586A7D] text-[#FFFFE3] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-xs"
              title="Download official ReportLab legal forensic PDF dossier directly from backend"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Official PDF (ICG)</span>
            </a>
            <button
              onClick={handlePrintPDF}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-md bg-white dark:bg-[#272E36] hover:border-[#6D8196] border border-[#CBCBCB] dark:border-[#353D46] text-[#4A4A4A] dark:text-[#FFFFE3] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              {isExporting ? <Clock className="w-3.5 h-3.5 animate-spin text-[#6D8196]" /> : <Printer className="w-3.5 h-3.5 text-[#6D8196]" />}
              <span>Print View</span>
            </button>
          </div>
        </div>

        {/* The Printable Dossier Sheet */}
        <div className="bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] rounded-xl p-8 shadow-xs space-y-6 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
          {/* Document Header */}
          <div className="border-b-2 border-[#CBCBCB] dark:border-[#353D46] pb-4 flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-[#6D8196] font-mono">
                SPILLTHE◎RY FORENSIC INTELLIGENCE
              </div>
              <h2 className="text-lg font-bold text-[#4A4A4A] dark:text-[#FFFFE3] uppercase tracking-wide mt-1">
                Maritime Hydrocarbon Incident Investigation Report
              </h2>
              <div className="text-xs text-[#6D8196] dark:text-[#CBCBCB] mt-1">
                Ref ID: <strong className="text-[#4A4A4A] dark:text-[#FFFFE3] font-mono">{incident.id}</strong> ({incident.code}) · Classification: RESTRICTED OFFICIAL USE
              </div>
            </div>

            <div className="text-right text-xs space-y-0.5 text-[#6D8196] dark:text-[#CBCBCB]">
              <div>Date Generated: <span className="text-[#4A4A4A] dark:text-[#FFFFE3] font-mono">07 SEP 2026</span></div>
              <div>Time: <span className="text-[#4A4A4A] dark:text-[#FFFFE3] font-mono">10:42:31 UTC</span></div>
              <div>Sensor: <span className="text-[#6D8196] dark:text-[#FFFFE3] font-semibold font-mono">Sentinel-1A IW GRD</span></div>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6D8196] dark:text-[#CBCBCB] border-b border-[#CBCBCB] dark:border-[#353D46] pb-1">
              1. Executive Summary & Legal Disclaimer
            </h3>
            <p className="text-xs text-[#4A4A4A] dark:text-[#CBCBCB] leading-relaxed">
              At 04:32 UTC on 07 September 2026, satellite synthetic aperture radar (SAR) telemetry from Copernicus Sentinel-1A 
              identified a surface slick damping anomaly spanning <strong className="font-mono text-[#4A4A4A] dark:text-[#FFFFE3]">{incident.slickAreaKm2} km²</strong> in the 
              <strong className="text-[#4A4A4A] dark:text-[#FFFFE3]"> {incident.locationName}</strong>. Reverse Lagrangian hydrodynamic particle dispersion analysis estimates 
              discharge origin between <strong className="text-[#4A4A4A] dark:text-[#FFFFE3] font-mono">{hindcast.dischargeWindowUtc}</strong> at <strong className="font-mono text-[#4A4A4A] dark:text-[#FFFFE3]">{hindcast.originCoordinates[0]}°N, {hindcast.originCoordinates[1]}°E</strong>. 
              Correlated historical AIS data identifies crude tanker <strong className="text-[#4A4A4A] dark:text-[#FFFFE3]">{topVessel.name} (IMO {topVessel.imo})</strong> as the 
              <strong className="text-[#4A4A4A] dark:text-[#FFFFE3]"> highest-priority candidate vessel for further regulatory inquiry</strong> (Composite Priority Score: <span className="font-mono text-[#D9534F] font-bold">{topVessel.attributionScore}%</span>).
            </p>
            <div className="p-3 rounded-lg bg-[#FFFFE3]/60 dark:bg-[#1F242A] border border-[#D9822B]/40 text-xs text-[#D9822B]">
              <strong>Notice of Non-Culpability: </strong>
              <span className="text-[#4A4A4A] dark:text-[#CBCBCB]">
                Attribution scores represent computational likelihood based on spatiotemporal proximity and AIS kinematics. 
                This report constitutes analytical decision-support and does not represent definitive legal proof of discharge.
              </span>
            </div>
          </div>

          {/* Section 2 & 3: Satellite Detection & Geometry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6D8196] dark:text-[#CBCBCB] border-b border-[#CBCBCB] dark:border-[#353D46] pb-1">
                2. Satellite SAR Characterization
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>Sensor Platform:</span>
                  <span className="text-[#4A4A4A] dark:text-[#FFFFE3] font-mono">{incident.sensor}</span>
                </div>
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>Mean Backscatter:</span>
                  <span className="text-[#D9534F] font-mono font-semibold">{incident.backscatterDb} dB</span>
                </div>
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>Damping Factor:</span>
                  <span className="font-mono text-[#4A4A4A] dark:text-[#FFFFE3]">-5.8 dB (Consistent with crude)</span>
                </div>
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>Confidence Metric:</span>
                  <span className="text-[#6D8196] dark:text-[#FFFFE3] font-mono font-bold">{incident.confidencePercent}% IoU</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6D8196] dark:text-[#CBCBCB] border-b border-[#CBCBCB] dark:border-[#353D46] pb-1">
                3. Slick Morphology & Dimensions
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>Surface Footprint:</span>
                  <span className="text-[#D9534F] font-mono font-semibold">{incident.slickAreaKm2} km²</span>
                </div>
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>Perimeter:</span>
                  <span className="font-mono text-[#4A4A4A] dark:text-[#FFFFE3]">{incident.slickPerimeterKm} km</span>
                </div>
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>Estimated Spill Age:</span>
                  <span className="text-[#D9822B] font-mono font-semibold">{incident.estimatedAgeHours}</span>
                </div>
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>Classification:</span>
                  <span className="text-[#4A4A4A] dark:text-[#FFFFE3]">{incident.classification}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 & 5: Hindcast & MetOcean Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6D8196] dark:text-[#CBCBCB] border-b border-[#CBCBCB] dark:border-[#353D46] pb-1">
                4. Lagrangian Backward Hindcast
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>Probable Origin:</span>
                  <span className="text-[#6D8196] dark:text-[#FFFFE3] font-mono font-semibold">{hindcast.originCoordinates[0]}°N, {hindcast.originCoordinates[1]}°E</span>
                </div>
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>Discharge Window:</span>
                  <span className="font-mono text-[#4A4A4A] dark:text-[#FFFFE3]">{hindcast.dischargeWindowUtc}</span>
                </div>
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>Origin Confidence:</span>
                  <span className="text-[#6D8196] dark:text-[#FFFFE3] font-mono font-semibold">{hindcast.confidencePercent}%</span>
                </div>
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>90% Uncertainty Radius:</span>
                  <span className="text-[#D9822B] font-mono">{hindcast.uncertaintyRadiusKm} km</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6D8196] dark:text-[#CBCBCB] border-b border-[#CBCBCB] dark:border-[#353D46] pb-1">
                5. MetOcean Environmental Forcing
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>Wind Vector (10m):</span>
                  <span className="font-mono text-[#4A4A4A] dark:text-[#FFFFE3]">{metocean.windSpeedKt} kt @ {metocean.windDirectionDeg}° {metocean.windDirectionCard}</span>
                </div>
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>Current Vector (Surface):</span>
                  <span className="font-mono text-[#4A4A4A] dark:text-[#FFFFE3]">{metocean.currentSpeedKt} kt @ {metocean.currentDirectionDeg}° {metocean.currentDirectionCard}</span>
                </div>
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>Significant Wave Height:</span>
                  <span className="text-[#4A4A4A] dark:text-[#FFFFE3]">{metocean.waveHeightM} m (Sea State 3)</span>
                </div>
                <div className="flex justify-between text-[#6D8196] dark:text-[#CBCBCB]">
                  <span>Net Modeled Drift:</span>
                  <span className="text-[#6D8196] dark:text-[#FFFFE3] font-mono font-semibold">{metocean.netDriftSpeedKt} kt @ {metocean.netDriftDirectionDeg}°</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: AIS Forensic Vessel Ranking */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6D8196] dark:text-[#CBCBCB] border-b border-[#CBCBCB] dark:border-[#353D46] pb-1">
              6. Forensic Vessel Ranking & Evidence Evaluation
            </h3>

            <div className="p-3.5 bg-[#FFFFE3]/40 dark:bg-[#1F242A] rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#4A4A4A] dark:text-[#FFFFE3] text-sm">{topVessel.name}</span>
                  <span className="text-xs text-[#6D8196] dark:text-[#CBCBCB] ml-2 font-mono">IMO {topVessel.imo} · Flag: {topVessel.flag} · {topVessel.type}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] block uppercase font-medium">Investigation Priority</span>
                  <span className="text-base font-bold font-mono text-[#D9534F]">{topVessel.attributionScore}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="bg-white dark:bg-[#272E36] p-2 rounded-md border border-[#CBCBCB] dark:border-[#353D46] shadow-xs">
                  <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[10px] block">Offset from Origin:</span>
                  <span className="font-semibold text-[#4A4A4A] dark:text-[#FFFFE3] font-mono tabular-nums">{topVessel.distanceFromOriginKm} km</span>
                </div>
                <div className="bg-white dark:bg-[#272E36] p-2 rounded-md border border-[#CBCBCB] dark:border-[#353D46] shadow-xs">
                  <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[10px] block">Temporal Delta (Δt):</span>
                  <span className="font-semibold text-[#4A4A4A] dark:text-[#FFFFE3] font-mono tabular-nums">{topVessel.timeDiffMinutes} min</span>
                </div>
                <div className="bg-white dark:bg-[#272E36] p-2 rounded-md border border-[#CBCBCB] dark:border-[#353D46] shadow-xs">
                  <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[10px] block">Speed Drop:</span>
                  <span className="font-semibold text-[#D9534F] font-mono">12.4 → 5.8 kn</span>
                </div>
                <div className="bg-white dark:bg-[#272E36] p-2 rounded-md border border-[#CBCBCB] dark:border-[#353D46] shadow-xs">
                  <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[10px] block">Course Anomaly:</span>
                  <span className="font-semibold text-[#D9822B] font-mono">35° deviation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Shoreline Impact Assessment */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6D8196] dark:text-[#CBCBCB] border-b border-[#CBCBCB] dark:border-[#353D46] pb-1">
              7. Shoreline Impact & Asset Exposure
            </h3>
            <div className="text-xs text-[#4A4A4A] dark:text-[#CBCBCB] space-y-1">
              <div>Target Coastal Sector: <strong className="text-[#4A4A4A] dark:text-[#FFFFE3]">{shorelineRisk.name}</strong></div>
              <div>Estimated Time to Coastal Intercept: <strong className="text-[#D9822B] font-mono">~{shorelineRisk.projectedEtaHours} hours</strong></div>
              <div>Environmental Vulnerability Index: <strong className="text-[#D9534F] font-mono">EVT {shorelineRisk.vulnerabilityIndex}/10</strong></div>
              <div>Activated Contingency Protocol: <strong className="text-[#6D8196] dark:text-[#FFFFE3] font-semibold">{shorelineRisk.protocolTier}</strong></div>
            </div>
          </div>

          {/* Signatures & Certification */}
          <div className="pt-6 border-t border-[#CBCBCB] dark:border-[#353D46] grid grid-cols-2 gap-8 text-xs text-[#6D8196] dark:text-[#CBCBCB]">
            <div>
              <span className="block text-[10px] uppercase font-medium text-[#6D8196] dark:text-[#CBCBCB]">Lead Marine Forensic Analyst:</span>
              <div className="mt-4 border-b border-[#CBCBCB] dark:border-[#353D46] w-48" />
              <span className="text-[#4A4A4A] dark:text-[#FFFFE3] mt-1 block font-medium">Dr. S. K. Nair, Maritime Earth Observation Wing</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-medium text-[#6D8196] dark:text-[#CBCBCB]">Vessel Traffic Service Certification:</span>
              <div className="mt-4 border-b border-[#CBCBCB] dark:border-[#353D46] w-48" />
              <span className="text-[#4A4A4A] dark:text-[#FFFFE3] mt-1 block font-medium">Capt. R. Deshmukh, ICG Western Command</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
