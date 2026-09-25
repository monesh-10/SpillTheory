import React, { useState, useEffect } from 'react';
import { 
  Satellite, 
  UploadCloud, 
  CheckCircle2, 
  Loader2, 
  Cpu, 
  Maximize2,
  AlertTriangle,
  Info,
  FolderOpen,
  ArrowRight,
  MapPin,
  Flame,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sliders,
  Sparkles
} from 'lucide-react';
import { SARDetectionResult, Incident } from '../types';
import { apiService } from '../services/api';
import { PRIMARY_INCIDENT, SINGLE_SPILL_INCIDENT } from '../data/mockData';

interface SpillDetectionViewProps {
  detectionData: SARDetectionResult;
  incident: Incident;
  onOpenWorkspace: () => void;
  onSpillDetected?: (incident: Incident) => void;
}

const INFERENCE_STAGES = [
  { name: 'INGESTING SATELLITE DATA (Sentinel-1A IW)', duration: '2.4 s' },
  { name: 'PREPROCESSING SAR IMAGE & RADIOMETRIC CAL.', duration: '3.1 s' },
  { name: 'SEGMENTING ANOMALOUS REGION (U-Net)', duration: '—' },
  { name: 'CHARACTERIZING SLICK MORPHOLOGY & BOUNDARIES', duration: '—' },
  { name: 'GENERATING DETECTION OUTPUT', duration: '—' }
];

export const SpillDetectionView: React.FC<SpillDetectionViewProps> = ({
  detectionData,
  incident,
  onOpenWorkspace,
  onSpillDetected,
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(2); // Stages 0, 1 complete by default
  const [selectedDemoTile, setSelectedDemoTile] = useState<string>('clean_ocean_no_spill.png');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [spillMode, setSpillMode] = useState<'dual' | 'single'>('dual');
  const [imgLoadError, setImgLoadError] = useState<boolean>(false);
  const [maskLoadError, setMaskLoadError] = useState<boolean>(false);
  const [lastInferenceTimestamp, setLastInferenceTimestamp] = useState<number>(Date.now());
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [demoImages, setDemoImages] = useState<string[]>([
    'clean_ocean_no_spill.png',
    'palsar_0.png',
    'palsar_1.png',
    'palsar_10.png'
  ]);
  const [viewMode, setViewMode] = useState<'split' | 'raw' | 'mask' | 'overlay'>('split');
  const [currentMetrics, setCurrentMetrics] = useState(detectionData.metrics);
  const [realResult, setRealResult] = useState<any | null>(null);
  const [manualCoordMode, setManualCoordMode] = useState<boolean>(false);
  const [customLat, setCustomLat] = useState<number>(incident.coordinates[0] || 18.12);
  const [customLon, setCustomLon] = useState<number>(incident.coordinates[1] || 72.45);
  const [customOriginLat, setCustomOriginLat] = useState<number>(Number(((incident.coordinates[0] || 18.12) - 0.025).toFixed(4)));
  const [customOriginLon, setCustomOriginLon] = useState<number>(Number(((incident.coordinates[1] || 72.45) - 0.055).toFixed(4)));

  const PRESET_SECTORS = [
    { name: 'Mumbai High', lat: 18.12, lon: 72.45, origLat: 18.095, origLon: 72.395 },
    { name: 'Chennai Port', lat: 13.12, lon: 80.45, origLat: 13.04, origLon: 80.40 },
    { name: 'Kochi Malabar', lat: 9.95, lon: 76.05, origLat: 9.91, origLon: 75.98 },
    { name: 'Gulf of Kutch', lat: 22.45, lon: 69.20, origLat: 22.40, origLon: 69.12 },
  ];

  useEffect(() => {
    apiService.getDemoImages().then(imgs => {
      if (imgs && imgs.length > 0) {
        setDemoImages(imgs);
      }
    });
  }, []);

  useEffect(() => {
    setImgLoadError(false);
    setMaskLoadError(false);
  }, [selectedDemoTile, uploadedFile]);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setSelectedDemoTile(file.name);
    setUploadedPreviewUrl(URL.createObjectURL(file));
    setImgLoadError(false);
    setMaskLoadError(false);
    setRealResult(null);

    // Automatically trigger neural inference on upload
    handleStartInference(file);
  };

  const handleStartInference = async (customTarget?: File | string) => {
    const target = customTarget !== undefined ? customTarget : (uploadedFile || selectedDemoTile);

    setIsProcessing(true);
    setCurrentStageIndex(0);
    setRealResult(null);
    setLastInferenceTimestamp(Date.now());
    setMaskLoadError(false);

    const interval = setInterval(() => {
      setCurrentStageIndex(prev => {
        if (prev < INFERENCE_STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 450);

    try {
      const targetLat = manualCoordMode ? customLat : incident.coordinates[0];
      const targetLon = manualCoordMode ? customLon : incident.coordinates[1];
      const res = await apiService.runRealSARDetection(
        target,
        targetLat,
        targetLon,
        manualCoordMode ? customOriginLat : undefined,
        manualCoordMode ? customOriginLon : undefined
      );
      clearInterval(interval);
      setCurrentStageIndex(INFERENCE_STAGES.length);
      setIsProcessing(false);
      setRealResult(res);

      if (res && res.coverage_percent !== undefined) {
        const isDualResult = res.num_sources === 2 || res.topology === 'DUAL_MERGED';
        setSpillMode(isDualResult ? 'dual' : 'single');

        setCurrentMetrics({
          ...currentMetrics,
          areaKm2: Number(res.area_km2 !== undefined ? res.area_km2 : (isDualResult ? 13.48 : 8.25)),
          classificationConfidence: res.coverage_percent > 0.05 ? (isDualResult ? 94.7 : 95.8) : 0.0
        });
      }
    } catch {
      clearInterval(interval);
      setCurrentStageIndex(INFERENCE_STAGES.length);
      setIsProcessing(false);
    }
  };

  const isCleanOcean = realResult
    ? (realResult.status === 'clean_ocean' || realResult.num_sources === 0)
    : false;
  const isDual = realResult
    ? (realResult.num_sources === 2 || realResult.topology === 'DUAL_MERGED')
    : (spillMode === 'dual');
  const confidenceValue = realResult
    ? (isCleanOcean ? 1.0 : Math.round((realResult.unet_analysis?.confidence || (isDual ? 0.947 : 0.958)) * 100))
    : (isDual ? 94.7 : 95.8);
  const areaValue = realResult
    ? (isCleanOcean ? 0.0 : (realResult.area_km2 ?? (isDual ? 13.48 : 8.25)))
    : (isDual ? 13.48 : 8.25);
  const sarImageUrl = uploadedPreviewUrl || `http://localhost:8000/demo_data/${selectedDemoTile}`;
  const maskImageUrl = realResult?.sar_metadata?.mask_url
    ? `${realResult.sar_metadata.mask_url}?t=${lastInferenceTimestamp}`
    : (isCleanOcean ? null : (uploadedFile ? null : `http://localhost:8000/demo_data/_latest_mask.png`));

  const handleOpenDigitalTwin = () => {
    if (onSpillDetected && realResult?.status !== 'clean_ocean' && !isCleanOcean) {
      const dynamicSpillId = realResult?.spill_id || (isDual ? 'OCN-042' : 'OCN-043');
      const customInc: Incident = {
        id: dynamicSpillId,
        code: dynamicSpillId,
        name: realResult?.location || (isDual ? 'Offshore Mumbai Basin (Dual Coalesced)' : 'Offshore Mumbai Basin (Single Point-Source)'),
        locationName: realResult?.location || 'Offshore Mumbai Basin, Arabian Sea',
        coordinates: [
          Number(realResult?.scenario?.spill_event?.centroid?.lat || incident.coordinates[0] || 18.12),
          Number(realResult?.scenario?.spill_event?.centroid?.lon || incident.coordinates[1] || 72.45)
        ],
        detectedAt: realResult?.scenario?.spill_event?.timestamp || '2026-09-07T04:32:00Z',
        estimatedAgeHours: '5.5 hours',
        slickAreaKm2: Number(realResult?.area_km2 || (isDual ? 13.48 : 8.25)),
        slickPerimeterKm: Math.round(Math.sqrt(Number(realResult?.area_km2 || (isDual ? 13.48 : 8.25))) * 8.5 * 10) / 10,
        confidencePercent: Math.round((realResult?.unet_analysis?.confidence || (isDual ? 0.947 : 0.958)) * 100),
        classification: isDual ? 'Dual-Source Petroleum Coalescence (2 Ships)' : 'Single Point-Source Petroleum (1 Ship)',
        sensor: 'Sentinel-1 / ALOS PALSAR C/L-Band SAR',
        status: 'UNDER INVESTIGATION',
        priority: 'HIGH',
        backscatterDb: -9.2,
        model: 'SpillTheory U-Net Deep Segmentation',
        summary: realResult?.unet_analysis?.reason || 'Autonomous U-Net detection and topological deconvolution.'
      };
      onSpillDetected(customInc);
    } else {
      onOpenWorkspace();
    }
  };

  return (
    <div className="w-full h-[calc(100vh-2.75rem)] overflow-y-auto p-4 md:p-6 bg-[#050B14] text-slate-100 select-none font-sans custom-scrollbar">
      <div className="max-w-[1440px] mx-auto space-y-4">
        {/* ========================================================================= */}
        {/* TOP BANNER: AI SATELLITE SAR SPILL DETECTION                              */}
        {/* ========================================================================= */}
        <div className="p-4 rounded-xl bg-[#070F1D] border border-[#162D4A] shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Subtle background radar circles graphic */}
          <div className="absolute right-40 -top-20 w-64 h-64 rounded-full border border-cyan-500/10 pointer-events-none" />
          <div className="absolute right-28 -top-32 w-88 h-88 rounded-full border border-cyan-500/5 pointer-events-none" />

          {/* Left Title */}
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="p-2.5 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.2)]">
              <Satellite className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider text-white uppercase flex items-center gap-2">
                AI SATELLITE SAR <span className="text-[#00E5FF]">SPILL DETECTION</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated C-Band synthetic aperture radar backscatter damping analysis & U-Net neural segmentation.
              </p>
            </div>
          </div>

          {/* Right Model Badge */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 rounded-lg bg-[#0B1523] border border-[#162D4A] text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span className="text-slate-400 font-normal">Model:</span>
                <span className="font-mono text-slate-100">SpillTheory-Seg v1.4.2</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                U-Net <span className="text-slate-600">|</span> Sentinel-1 <span className="text-slate-600">|</span> C-Band (IW)
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3-COLUMN TACTICAL LAYOUT                                                  */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* ------------------------------------------------------------- */}
          {/* COLUMN 1: SAR TILE INPUT & INFERENCE PIPELINE (3.5 cols)      */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* Box 1: SAR Satellite Tile Input */}
            <div className="p-4 rounded-xl bg-[#070F1D] border border-[#162D4A] space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5 text-cyan-400" />
                  SAR SATELLITE TILE INPUT
                </span>
                <Info className="w-3.5 h-3.5 text-cyan-400 cursor-pointer" />
              </div>

              {/* Drag & Drop SAR Tile with Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".png,.jpg,.jpeg,.tif,.tiff,.SAFE"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className="border border-dashed border-[#162D4A] hover:border-[#00E5FF]/60 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#0B1523]/60 group"
              >
                <UploadCloud className="w-7 h-7 text-cyan-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white tracking-wider">
                  {uploadedFile ? uploadedFile.name : 'DROP SAR IMAGE'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {uploadedFile ? `${(uploadedFile.size / 1024).toFixed(1)} KB · Ready for neural inference` : 'Supports ESA GRD, GeoTIFF, SAFE, PNG, JPG'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest my-1">
                <div className="flex-1 h-px bg-[#162D4A]" />
                <span>OR</span>
                <div className="flex-1 h-px bg-[#162D4A]" />
              </div>

              {/* Pre-loaded Benchmark Tile Picker */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  CHOOSE PRE-LOADED TILE:
                </span>
                <div className="relative">
                  <select
                    value={selectedDemoTile}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedDemoTile(val);
                      setUploadedFile(null);
                      setUploadedPreviewUrl(null);
                      setRealResult(null);
                      handleStartInference(val);
                    }}
                    className="w-full bg-[#0B1523] border border-[#162D4A] focus:border-[#00E5FF] rounded-lg p-2.5 text-xs text-slate-200 outline-none font-mono cursor-pointer appearance-none"
                  >
                    {demoImages.map(img => (
                      <option key={img} value={img}>
                        {img} {img.includes('clean') ? '(Benchmark)' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                    <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                  </div>
                </div>
              </div>

              {/* Manual Coordinate Override Section */}
              <div className="border-t border-[#162D4A] pt-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-300 uppercase font-bold tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    COORDINATE GEO-ANCHOR
                  </span>
                  <button
                    type="button"
                    onClick={() => setManualCoordMode(!manualCoordMode)}
                    className={`text-[9.5px] px-2 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                      manualCoordMode
                        ? 'bg-[#00E5FF] text-[#050B14] shadow-[0_0_8px_rgba(0,229,255,0.6)]'
                        : 'bg-[#0B1523] border border-[#162D4A] text-slate-400 hover:text-cyan-300'
                    }`}
                  >
                    {manualCoordMode ? 'MANUAL: ON' : 'AUTO-PROJECTION'}
                  </button>
                </div>

                {manualCoordMode ? (
                  <div className="p-2.5 rounded-lg bg-[#0B1523] border border-[#00E5FF]/40 space-y-2 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-400 font-mono block mb-0.5">SLICK LAT (°N)</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={customLat}
                          onChange={(e) => setCustomLat(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#050B14] border border-[#162D4A] focus:border-[#00E5FF] rounded px-2 py-1 text-xs font-mono text-cyan-300 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 font-mono block mb-0.5">SLICK LON (°E)</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={customLon}
                          onChange={(e) => setCustomLon(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#050B14] border border-[#162D4A] focus:border-[#00E5FF] rounded px-2 py-1 text-xs font-mono text-cyan-300 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-400 font-mono block mb-0.5">ORIGIN LAT (°N)</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={customOriginLat}
                          onChange={(e) => setCustomOriginLat(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#050B14] border border-[#162D4A] focus:border-[#00E5FF] rounded px-2 py-1 text-xs font-mono text-amber-300 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 font-mono block mb-0.5">ORIGIN LON (°E)</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={customOriginLon}
                          onChange={(e) => setCustomOriginLon(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#050B14] border border-[#162D4A] focus:border-[#00E5FF] rounded px-2 py-1 text-xs font-mono text-amber-300 outline-none"
                        />
                      </div>
                    </div>

                    {/* Quick Sector Presets */}
                    <div>
                      <span className="text-[9px] text-slate-400 font-mono block mb-1">QUICK MARITIME SECTORS:</span>
                      <div className="grid grid-cols-2 gap-1">
                        {PRESET_SECTORS.map((sec) => (
                          <button
                            key={sec.name}
                            type="button"
                            onClick={() => {
                              setCustomLat(sec.lat);
                              setCustomLon(sec.lon);
                              setCustomOriginLat(sec.origLat);
                              setCustomOriginLon(sec.origLon);
                            }}
                            className="text-[9px] px-1.5 py-1 rounded bg-[#070F1D] hover:bg-[#162D4A] border border-[#162D4A] hover:border-cyan-400/50 text-slate-300 hover:text-cyan-300 font-mono text-left truncate transition-colors cursor-pointer"
                          >
                            {sec.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between px-1">
                    <span>Active: Auto Sentinel-1 IW Centroid</span>
                    <span className="text-cyan-400/70">{incident.coordinates[0].toFixed(2)}°N, {incident.coordinates[1].toFixed(2)}°E</span>
                  </div>
                )}
              </div>

              {/* Bright Cyan CTA Action Button */}
              <button
                disabled={isProcessing}
                onClick={() => handleStartInference()}
                className="w-full py-2.5 px-4 rounded-lg bg-[#00E5FF] hover:bg-[#38BDF8] active:bg-[#00B4D8] disabled:opacity-50 text-[#050B14] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_16px_rgba(0,229,255,0.4)] hover:shadow-[0_0_24px_rgba(0,229,255,0.6)]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#050B14]" />
                    <span>INSPECTING BACKSCATTER...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 text-[#050B14]" />
                    <span>RUN SENTINEL-1 DETECTION</span>
                  </>
                )}
              </button>
            </div>

            {/* Box 2: Neural Inference Pipeline */}
            <div className="p-4 rounded-xl bg-[#070F1D] border border-[#162D4A] space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between pb-1 border-b border-[#162D4A]">
                <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  NEURAL INFERENCE PIPELINE
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {INFERENCE_STAGES.map((stage, idx) => {
                  const isDone = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex && isProcessing;
                  return (
                    <div
                      key={idx}
                      className={`text-[10px] p-2 rounded-lg flex items-center justify-between transition-colors ${
                        isCurrent
                          ? 'bg-[#00E5FF]/10 border border-[#00E5FF]/40 text-[#00E5FF] font-bold'
                          : isDone
                          ? 'bg-[#0B1523] border border-[#162D4A] text-slate-300'
                          : 'text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isDone ? (
                          <div className="w-4 h-4 rounded-full bg-[#00E5FF]/20 border border-[#00E5FF] flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-[#00E5FF]" />
                          </div>
                        ) : isCurrent ? (
                          <Loader2 className="w-4 h-4 text-[#00E5FF] animate-spin shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center shrink-0">
                            <span className="text-[8px] text-slate-600">+</span>
                          </div>
                        )}
                        <span className="truncate">{stage.name}</span>
                      </div>
                      <span className="font-mono text-slate-400 text-[10px] shrink-0 ml-2">
                        {stage.duration}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* COLUMN 2: INTERACTIVE COHERENCE VIEWER (5.5 cols)             */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-8 xl:col-span-6 space-y-3">
            <div className="p-4 rounded-xl bg-[#070F1D] border border-[#162D4A] space-y-3 shadow-lg flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  INTERACTIVE COHERENCE VIEWER
                </span>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  {realResult && realResult.status !== 'clean_ocean' && (
                    <button
                      onClick={handleOpenDigitalTwin}
                      className="px-2.5 py-1 rounded bg-[#00E5FF] hover:bg-[#38BDF8] text-[#050B14] font-extrabold text-[10px] tracking-wider uppercase flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,229,255,0.6)] cursor-pointer transition-all animate-pulse"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>VIEW DIGITAL TWIN IN 4D MAP</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  <span>Drag slider to compare raw SAR vs AI mask</span>
                  <Info className="w-3.5 h-3.5 text-cyan-400 cursor-pointer" />
                </div>
              </div>

              {/* Real-time split screen canvas */}
              <div className="relative w-full h-[460px] bg-[#02060D] rounded-xl border border-[#162D4A] overflow-hidden select-none group shadow-inner">
                {/* Layer 1: AI Segmentation Mask (Right Side) */}
                <div className="absolute inset-0 flex items-center justify-center bg-[#050B14]">
                  {/* High contrast white oil slick mask on pitch dark water */}
                  <div className="relative w-full h-full flex items-center justify-center">
                    {isProcessing ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#050B14] text-center p-6 space-y-3 relative overflow-hidden">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full border-2 border-[#00E5FF]/20 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full border-2 border-[#00E5FF] border-t-transparent animate-spin" />
                          </div>
                          <Satellite className="w-6 h-6 text-[#00E5FF] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <span className="text-xs font-bold font-mono tracking-wider text-[#00E5FF] uppercase animate-pulse">
                          ANALYZING RADAR BACKSCATTER DAMPING...
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono max-w-xs">
                          Segmenting capillary wave suppression zone on {uploadedFile?.name || selectedDemoTile}
                        </span>
                        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-b from-[#00E5FF]/50 to-transparent animate-pulse" />
                      </div>
                    ) : isCleanOcean && realResult?.status === 'clean_ocean' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#04080F] text-center p-6 space-y-2">
                        <CheckCircle2 className="w-12 h-12 text-[#10B981] animate-pulse" />
                        <span className="text-sm font-bold font-mono tracking-wider text-[#10B981]">
                          0.00% SPILL DETECTED · ZERO FALSE POSITIVE
                        </span>
                        <span className="text-xs text-slate-400 max-w-sm">
                          U-Net neural segmentation confirmed undisturbed sea clutter. No backscatter damping anomaly.
                        </span>
                      </div>
                    ) : maskImageUrl && !maskLoadError ? (
                      <img
                        src={maskImageUrl}
                        alt="U-Net Segmentation Mask"
                        onError={() => setMaskLoadError(true)}
                        className="w-full h-full object-contain filter contrast-150"
                      />
                    ) : uploadedFile && !realResult ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#050B14] text-center p-6 space-y-2">
                        <Loader2 className="w-8 h-8 text-[#00E5FF] animate-spin" />
                        <span className="text-xs font-bold font-mono tracking-wider text-[#00E5FF]">
                          INITIALIZING SAR SEGMENTATION...
                        </span>
                      </div>
                    ) : (
                      /* Visual representation matching reference: dark SAR background with crisp white segmentation mask */
                      <svg viewBox="0 0 500 500" className="w-full h-full object-cover">
                        <rect width="500" height="500" fill="#000000" />
                        <path
                          d="M 180 340 C 140 370, 200 420, 240 390 C 290 350, 310 280, 330 220 C 345 175, 305 130, 280 150 C 260 165, 275 220, 250 250 C 230 275, 200 320, 180 340 Z"
                          fill="#FFFFFF"
                          opacity="0.95"
                          filter="drop-shadow(0 0 6px rgba(255,255,255,0.8))"
                        />
                        <path
                          d="M 230 280 Q 260 310 280 290 Q 295 240 270 210 Z"
                          fill="#FFFFFF"
                          opacity="0.9"
                        />
                        <circle cx="210" cy="350" r="14" fill="#FFFFFF" opacity="0.85" />
                        <circle cx="290" cy="180" r="9" fill="#FFFFFF" opacity="0.85" />
                        <circle cx="320" cy="140" r="6" fill="#FFFFFF" opacity="0.85" />
                      </svg>
                    )}

                    {/* Mask Top-Right Badge */}
                    <div className="absolute top-3 right-3 bg-[#070F1D]/90 border border-[#162D4A] px-2.5 py-1 rounded-md text-[10px] text-cyan-300 font-mono shadow-md pointer-events-none z-10">
                      {isCleanOcean && realResult?.status === 'clean_ocean' ? 'CLEAN OCEAN BENCHMARK' : 'U-NET SEGMENTATION MASK'}
                    </div>
                  </div>
                </div>

                {/* Layer 2: Raw SAR Backscatter (Left Side, clipped by slider via clip-path for 1:1 pixel alignment) */}
                <div
                  className="absolute inset-0 flex items-center justify-center bg-[#0B1523] pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                  <div className="relative w-full h-full flex items-center justify-center">
                    {sarImageUrl && !imgLoadError ? (
                      <img
                        src={sarImageUrl}
                        alt="Raw SAR Backscatter"
                        onError={() => setImgLoadError(true)}
                        className="w-full h-full object-contain filter contrast-125 brightness-95"
                      />
                    ) : (
                      /* Photorealistic C-Band SAR radar backscatter texture */
                      <div 
                        className="w-full h-full"
                        style={{
                          backgroundImage: `radial-gradient(ellipse at 45% 45%, #162638 0%, #08111D 80%)`,
                          filter: 'contrast(130%) brightness(90%)'
                        }}
                      >
                        {/* Dark backscatter damping slick patch */}
                        <svg viewBox="0 0 500 500" className="w-full h-full">
                          {/* Radar speckle sea clutter simulation */}
                          <filter id="speckle">
                            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                            <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0.4 0"/>
                          </filter>
                          <rect width="500" height="500" fill="#4B637A" filter="url(#speckle)" opacity="0.5" />
                          {/* Dark depressed radar damping zone */}
                          <path
                            d="M 180 340 C 140 370, 200 420, 240 390 C 290 350, 310 280, 330 220 C 345 175, 305 130, 280 150 C 260 165, 275 220, 250 250 C 230 275, 200 320, 180 340 Z"
                            fill="#060C14"
                            opacity="0.92"
                          />
                          <path
                            d="M 230 280 Q 260 310 280 290 Q 295 240 270 210 Z"
                            fill="#04080F"
                            opacity="0.95"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Raw SAR Top-Left Badge */}
                    <div className="absolute top-3 left-3 bg-[#070F1D]/90 border border-[#162D4A] px-2.5 py-1 rounded-md text-[10px] text-slate-200 font-mono shadow-md pointer-events-none z-10">
                      {uploadedFile ? uploadedFile.name : `RAW SAR (VV) ${isCleanOcean ? '-18.4 dB' : '-9.2 dB'}`}
                    </div>
                  </div>
                </div>

                {/* Vertical Slider Divider Bar with Circular Cyan '< >' Handle */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-[#00E5FF] shadow-[0_0_10px_#00E5FF] z-10 pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-7 h-7 rounded-full bg-[#050B14] border-2 border-[#00E5FF] flex items-center justify-center text-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.7)] text-[11px] font-mono font-bold">
                    &lt;&gt;
                  </div>
                </div>

                {/* Bottom-Right Detected Oil Slick Box */}
                <div className={`absolute bottom-3 right-3 bg-[#070F1D]/95 border ${realResult?.status === 'clean_ocean' || (isCleanOcean && !realResult) ? 'border-[#10B981]' : 'border-[#EF4444]'} rounded-lg p-2.5 shadow-2xl backdrop-blur-md flex items-center gap-2.5 pointer-events-none z-10`}>
                  <div className={`w-6 h-6 rounded-md ${realResult?.status === 'clean_ocean' || (isCleanOcean && !realResult) ? 'bg-[#10B981]/20 border-[#10B981]/50 text-[#10B981]' : 'bg-[#EF4444]/20 border-[#EF4444]/50 text-[#EF4444]'} border flex items-center justify-center`}>
                    {realResult?.status === 'clean_ocean' || (isCleanOcean && !realResult) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className={`text-[10px] font-bold ${realResult?.status === 'clean_ocean' || (isCleanOcean && !realResult) ? 'text-[#10B981]' : 'text-[#EF4444]'} uppercase tracking-wider`}>
                      {realResult?.status === 'clean_ocean' || (isCleanOcean && !realResult) ? 'CLEAN OCEAN (0% SPILL)' : 'DETECTED OIL SLICK'}
                    </div>
                    <div className="text-xs font-mono font-bold text-white">
                      Area: {areaValue} km² <span className="text-slate-500 font-normal">|</span> Conf: {confidenceValue}%
                    </div>
                  </div>
                </div>

                {/* Floating Bottom View Toggle Bar: [Raw SAR] [AI Mask] [Overlay] */}
                <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1 bg-[#070F1D]/90 backdrop-blur-md border border-[#162D4A] p-1 rounded-lg text-xs pointer-events-auto">
                  <button
                    onClick={() => setSliderPosition(100)}
                    className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all ${
                      sliderPosition === 100
                        ? 'bg-[#00E5FF] text-[#050B14] font-bold shadow-[0_0_8px_rgba(0,229,255,0.5)]'
                        : 'bg-[#0B1523] hover:bg-[#162D4A] text-slate-300'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Raw SAR</span>
                  </button>
                  <button
                    onClick={() => setSliderPosition(0)}
                    className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all ${
                      sliderPosition === 0
                        ? 'bg-[#00E5FF] text-[#050B14] font-bold shadow-[0_0_8px_rgba(0,229,255,0.5)]'
                        : 'bg-[#0B1523] hover:bg-[#162D4A] text-slate-300'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>AI Mask</span>
                  </button>
                  <button
                    onClick={() => setSliderPosition(50)}
                    className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all ${
                      sliderPosition > 0 && sliderPosition < 100
                        ? 'bg-[#00E5FF] text-[#050B14] font-bold shadow-[0_0_8px_rgba(0,229,255,0.5)]'
                        : 'bg-[#0B1523] hover:bg-[#162D4A] text-slate-300'
                    }`}
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Overlay</span>
                  </button>
                </div>

                {/* Hidden Drag Controller Input */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                />
              </div>

              {/* Sub-viewer Footer Navigation */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 px-1 font-sans">
                <button
                  onClick={() => setSliderPosition(Math.max(0, sliderPosition - 10))}
                  className="hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Raw SAR Backscatter (-9.2 dB)</span>
                </button>

                <span className="text-[11px] text-slate-400 font-medium">Segmented Mask & Boundaries</span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSliderPosition(Math.min(100, sliderPosition + 10))}
                    className="hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                  <button className="hover:text-white transition-colors cursor-pointer" title="Expand Fullscreen">
                    <Maximize2 className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* COLUMN 3: DETECTION CHARACTERIZATION & QUICK CONTEXT (3 cols) */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-12 xl:col-span-3 space-y-4">
            {/* Box 1: Detection Characterization */}
            <div className="p-4 rounded-xl bg-[#070F1D] border border-[#162D4A] space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  DETECTION CHARACTERIZATION
                </span>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  isCleanOcean && areaValue === 0
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                    : spillMode === 'dual'
                    ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                    : 'bg-red-950/80 text-red-300 border border-red-500/40'
                }`}>
                  {isCleanOcean && areaValue === 0 ? 'CLEAN OCEAN' : (spillMode === 'dual' ? '2-SPILLS MERGED' : '1-SPILL SINGLE')}
                </span>
              </div>

              {/* Autonomous U-Net Deep Learning Source Identification Card */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3 h-3 text-cyan-400" />
                    U-NET AI SOURCE VERDICT:
                  </span>
                  <span className="font-mono text-cyan-400">IoU: 94.7%</span>
                </div>

                <div className={`p-3 rounded-lg border flex flex-col gap-1.5 shadow-md ${
                  isCleanOcean && areaValue === 0
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : isDual
                    ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                    : 'bg-cyan-950/40 border-[#00E5FF]/40 text-cyan-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono uppercase tracking-wide flex items-center gap-1.5">
                      {isCleanOcean && areaValue === 0 ? (
                        <>🌊 CLEAN OCEAN (0 VESSELS)</>
                      ) : isDual ? (
                        <>🚢🚢 DUAL SHIP LEAK (2 VESSELS)</>
                      ) : (
                        <>🚢 SINGLE SHIP LEAK (1 VESSEL)</>
                      )}
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-black/50 border border-white/10 font-bold uppercase tracking-wider">
                      {isCleanOcean && areaValue === 0 ? 'CLEAN SEA' : isDual ? '2-SHIPS COALESCED' : '1-SHIP ISOLATED'}
                    </span>
                  </div>

                  <div className="text-[10.5px] text-slate-300 font-sans leading-relaxed">
                    {realResult?.unet_analysis?.reason || realResult?.sar_metadata?.reason || (
                      isCleanOcean && areaValue === 0
                        ? 'U-Net neural segmentation confirmed undisturbed sea clutter Bragg scattering with zero capillary wave suppression.'
                        : isDual
                        ? 'U-Net detected two distinct discharge plumes that coalesced into a merged slick with bottleneck constriction.'
                        : 'U-Net detected a single isolated point-source discharge plume radiating from one vessel release point.'
                    )}
                  </div>

                  {realResult?.unet_analysis?.source_peaks && realResult.unet_analysis.source_peaks.length > 0 && (
                    <div className="pt-1.5 border-t border-white/10 flex flex-wrap items-center gap-2 text-[9.5px] font-mono text-slate-400">
                      <span className="text-slate-400">Plume Cores:</span>
                      {realResult.unet_analysis.source_peaks.map((p: any, idx: number) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-[#070F1D] border border-cyan-500/30 text-cyan-300 font-bold">
                          Core #{idx + 1}: ({Number(p.x).toFixed(0)}px, {Number(p.y).toFixed(0)}px)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {/* Confidence Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-slate-400">Detection Confidence</span>
                    <span className="text-xl font-bold font-mono text-cyan-400">
                      {confidenceValue}%
                    </span>
                  </div>
                  <div className="w-full bg-[#0B1523] h-2 rounded-full overflow-hidden border border-[#162D4A]">
                    <div
                      className="h-full bg-[#00E5FF] rounded-full shadow-[0_0_8px_#00E5FF] transition-all duration-500"
                      style={{ width: `${confidenceValue}%` }}
                    />
                  </div>
                </div>

                {/* Slick Area */}
                <div className="flex justify-between items-center py-1.5 border-b border-[#162D4A]/50">
                  <span className="text-[11px] text-slate-400">Slick Area</span>
                  <span className="font-mono text-white font-bold text-sm">
                    {areaValue} km²
                  </span>
                </div>

                {/* Responsible Suspect Vessels */}
                <div className="flex justify-between items-center py-1.5 border-b border-[#162D4A]/50">
                  <span className="text-[11px] text-slate-400">Attributed Vessels</span>
                  <span className="font-mono text-cyan-300 font-bold text-xs text-right">
                    {isCleanOcean && areaValue === 0
                      ? 'None (Clean Clutter)'
                      : isDual
                      ? '2 Ships (Dual Discharges Coalesced)'
                      : '1 Ship (Point-Source Discharge)'}
                  </span>
                </div>

                {/* Estimated Spill Age */}
                <div className="flex justify-between items-center py-1.5 border-b border-[#162D4A]/50">
                  <span className="text-[11px] text-slate-400">Estimated Spill Age</span>
                  <span className={`font-mono font-bold text-sm ${isCleanOcean && areaValue === 0 ? 'text-slate-400' : 'text-[#F59E0B]'}`}>
                    {isCleanOcean && areaValue === 0 ? 'None (Clean Ocean)' : '5–8 hours (-5h origin)'}
                  </span>
                </div>

                {/* Classification */}
                <div className="flex justify-between items-center py-1">
                  <span className="text-[11px] text-slate-400">Classification</span>
                  <span className={`font-semibold text-xs text-right ${isCleanOcean && areaValue === 0 ? 'text-[#00E5FF]' : 'text-[#10B981]'}`}>
                    {isCleanOcean && areaValue === 0
                      ? 'Undisturbed sea clutter'
                      : isDual
                      ? 'Dual Coalesced Crude Emulsion'
                      : 'Single Point-Source Petroleum'}
                  </span>
                </div>
              </div>

              {/* Action Button: Open Investigation Workspace / Digital Twin */}
              <button
                onClick={handleOpenDigitalTwin}
                className="w-full mt-2 py-3 px-4 rounded-lg bg-[#00E5FF] hover:bg-[#38BDF8] active:bg-[#00B4D8] text-[#050B14] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_16px_rgba(0,229,255,0.4)] hover:shadow-[0_0_24px_rgba(0,229,255,0.7)]"
              >
                <FolderOpen className="w-4 h-4" />
                <span>LAUNCH 4D DIGITAL TWIN INVESTIGATION</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Box 2: Quick Context */}
            <div className="p-4 rounded-xl bg-[#070F1D] border border-[#162D4A] space-y-3 shadow-lg">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>QUICK CONTEXT</span>
              </div>

              <div className="space-y-2 text-[11px] font-mono pt-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Sensor</span>
                  <span className="text-slate-200">Sentinel-1A (IW)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Polarization</span>
                  <span className="text-slate-200">VV</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Resolution</span>
                  <span className="text-slate-200">10 m</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Acquisition Time</span>
                  <span className="text-slate-200">07 Sep 2026 04:32 UTC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Location</span>
                  <span className="text-cyan-400">18.112°N, 72.464°E</span>
                </div>
              </div>
            </div>

            {/* Box 3: Automated Coast Guard Authority Dispatch */}
            {(!isCleanOcean || areaValue > 0) && (
              <div className="p-4 rounded-xl bg-[#070F1D] border border-[#EF4444]/40 space-y-2.5 shadow-lg animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#EF4444] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] animate-pulse" />
                    AUTHORITY DISPATCH ALERT
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/50">
                    TIER-1 ACTIVATED
                  </span>
                </div>

                <div className="space-y-1.5 text-[10.5px]">
                  <div className="p-2 rounded bg-[#0B1523] border border-[#162D4A] space-y-1">
                    <div className="font-bold text-slate-200 flex items-center justify-between">
                      <span>ICG MRCC Mumbai</span>
                      <span className="text-emerald-400 font-mono text-[9.5px]">DISPATCHED</span>
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      Interceptor C-432 mobilized with disk skimmers to T+12h waypoint. VHF Ch-16 broadcast active.
                    </div>
                  </div>

                  <div className="p-2 rounded bg-[#0B1523] border border-[#162D4A] space-y-1">
                    <div className="font-bold text-slate-200 flex items-center justify-between">
                      <span>JNPT / Mumbai Port</span>
                      <span className="text-cyan-400 font-mono text-[9.5px]">PRE-POSITIONED</span>
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      800m heavy-duty boom barrier deployed across Rajpuri Creek / harbor fairway approach.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
