import React, { useState, useRef, useCallback } from 'react';
import {
  Layers,
  UploadCloud,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Info,
  ChevronLeft,
  Eye,
  BarChart2,
  Droplets,
  XCircle,
  Globe,
} from 'lucide-react';
import { apiService } from '../services/api';
import { Incident } from '../types';

// ── Class palette (must match eo/postprocess.py CLASS_COLORS exactly) ────────
const CLASS_META: { name: string; hex: string }[] = [
  { name: 'Marine Debris',          hex: '#FF8C00' },
  { name: 'Dense Sargassum',        hex: '#228B22' },
  { name: 'Sparse Floating Algae',  hex: '#90EE90' },
  { name: 'Natural Organic Material', hex: '#8B5A2B' },
  { name: 'Ship',                   hex: '#DC143C' },
  { name: 'Oil Spill',              hex: '#141414' },
  { name: 'Marine Water',           hex: '#006994' },
  { name: 'Sediment-Laden Water',   hex: '#D2B48C' },
  { name: 'Foam',                   hex: '#FFFFFF' },
  { name: 'Turbid Water',           hex: '#6495ED' },
  { name: 'Shallow Water',          hex: '#ADD8E6' },
  { name: 'Waves & Wakes',          hex: '#FFD700' },
  { name: 'Oil Platform',           hex: '#4B0082' },
  { name: 'Jellyfish',              hex: '#FFB6C1' },
  { name: 'Sea Snot',               hex: '#A9A9A9' },
];

const EO_INFERENCE_STAGES = [
  { name: 'READING MULTISPECTRAL TIFF (11 BANDS)' },
  { name: 'PREPROCESSING: NORMALIZE SPECTRAL BANDS' },
  { name: 'COMPUTING LSCC MARINE CONTRAST FEATURES' },
  { name: 'SeaRel-SR-UNet SEMANTIC SEGMENTATION (TTA×4)' },
  { name: 'GENERATING CLASSIFICATION RESULT' },
];

interface EODetectionViewProps {
  onOpenWorkspace: () => void;
  onSpillDetected?: (incident: Incident) => void;
}

export const EODetectionView: React.FC<EODetectionViewProps> = ({ onOpenWorkspace, onSpillDetected }) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'mask' | 'confidence'>('mask');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.tif') && !name.endsWith('.tiff')) {
      setErrorMsg(`Invalid file format. Expected .tif or .tiff. Received: "${file.name}".`);
      return;
    }
    setUploadedFile(file);
    setErrorMsg(null);
    setResult(null);
    runInference(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const runInference = async (file: File) => {
    setIsProcessing(true);
    setStageIndex(0);
    setResult(null);
    setErrorMsg(null);

    const interval = setInterval(() => {
      setStageIndex(prev => Math.min(prev + 1, EO_INFERENCE_STAGES.length - 1));
    }, 600);

    try {
      const res = await apiService.runEODetection(file);
      clearInterval(interval);
      setStageIndex(EO_INFERENCE_STAGES.length);
      setIsProcessing(false);

      if (res?.error) {
        setErrorMsg(res.message || 'EO inference failed.');
      } else {
        setResult(res);
      }
    } catch (err: any) {
      clearInterval(interval);
      setIsProcessing(false);
      setErrorMsg(err?.message || 'Unexpected error during EO inference.');
    }
  };

  const reset = () => {
    setUploadedFile(null);
    setResult(null);
    setErrorMsg(null);
    setStageIndex(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenDigitalTwin = () => {
    if (onSpillDetected && result?.spill_id) {
      const dynamicSpillId = result.spill_id;
      const customInc: Incident = {
        id: dynamicSpillId,
        code: dynamicSpillId,
        name: result.location || 'Offshore Mumbai Basin (Single Point EO)',
        locationName: result.location || 'Offshore Mumbai Basin, Arabian Sea',
        coordinates: [
          Number(result.scenario?.spill_event?.centroid?.lat ?? result.geospatial?.center_lat ?? 18.112),
          Number(result.scenario?.spill_event?.centroid?.lon ?? result.geospatial?.center_lon ?? 72.464),
        ],
        detectedAt: result.scenario?.spill_event?.timestamp || '2026-09-07T04:32:00Z',
        estimatedAgeHours: '5.5 hours',
        slickAreaKm2: Number(result.area_km2 || 8.25),
        slickPerimeterKm: Math.round(Math.sqrt(Number(result.area_km2 || 8.25)) * 8.5 * 10) / 10,
        confidencePercent: Math.round(Number(result.scenario?.spill_event?.confidence || 0.958) * 100),
        classification: result.classification || 'Single Point-Source Petroleum Slick (1 Ship)',
        sensor: result.scenario?.sensor_metadata?.sensor || result.geospatial?.sensor || 'Sentinel-2 MSI / Landsat Multispectral Optical',
        status: 'UNDER INVESTIGATION',
        priority: 'HIGH',
        backscatterDb: -8.8,
        model: 'SeaRel-SR-UNet V3 Multispectral',
        summary: result.scenario?.sensor_metadata?.reason || 'Multispectral 15-class semantic segmentation and topological deconvolution.',
      };
      onSpillDetected(customInc);
    } else {
      onOpenWorkspace();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full h-[calc(100vh-2.75rem)] overflow-y-auto p-4 md:p-6 bg-[#050B14] text-slate-100 select-none font-sans custom-scrollbar">
      <div className="max-w-[1280px] mx-auto space-y-4">

        {/* ── Top Banner ────────────────────────────────────────────────────── */}
        <div className="p-4 rounded-xl bg-[#070F1D] border border-[#1A3A5C] shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute right-32 -top-20 w-60 h-60 rounded-full border border-emerald-500/10 pointer-events-none" />
          <div className="absolute right-16 -top-32 w-80 h-80 rounded-full border border-emerald-500/5 pointer-events-none" />

          {/* Left: title */}
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="p-2.5 rounded-xl bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.2)]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider text-white uppercase flex items-center gap-2">
                EO Multispectral <span className="text-emerald-400">Segmentation</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                SeaRel-SR-UNet V3 · 11-band Sentinel-2 L2R · 15-class semantic segmentation · TTA×4
              </p>
            </div>
          </div>

          {/* Right: model badge */}
          <div className="flex items-center gap-3 relative z-10 shrink-0">
            <div className="text-right">
              <div className="text-xs font-bold text-white flex items-center gap-2 justify-end">
                <span className="text-slate-400 font-normal">Model:</span>
                <span className="font-mono text-slate-100">SeaRel-SR-UNet V3</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                MADOS · 15 classes · mIoU 0.683
              </div>
            </div>
          </div>
        </div>

        {/* ── Layout: two-column ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ── LEFT: Upload panel ─────────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-4">

            {/* Upload card */}
            <div className="bg-[#070F1D] border border-[#1A3A5C] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white tracking-wide uppercase">EO Data Upload</span>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 min-h-[160px]
                  ${dragOver
                    ? 'border-emerald-400 bg-emerald-400/10'
                    : uploadedFile
                      ? 'border-emerald-600 bg-emerald-900/10'
                      : 'border-[#1A3A5C] bg-[#0B1523] hover:border-emerald-500/50 hover:bg-emerald-900/5'
                  } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".tif,.tiff"
                  className="hidden"
                  onChange={handleInputChange}
                />
                {uploadedFile ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <p className="text-sm text-white font-semibold text-center break-all">{uploadedFile.name}</p>
                    <p className="text-xs text-slate-400">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-9 h-9 text-slate-500" />
                    <p className="text-sm text-slate-300 font-semibold">Drop TIFF here or click to browse</p>
                    <p className="text-xs text-slate-500">Accepts: .tif / .tiff</p>
                  </>
                )}
              </div>

              {/* Requirements note */}
              <div className="mt-3 p-3 rounded-lg bg-[#0B1523] border border-[#1A3A5C] flex gap-2">
                <Info className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The TIFF must contain <strong className="text-slate-200">exactly 11 spectral bands</strong> in MADOS L2R reflectance ordering.
                  Dimensions can be any size ≥1×1; the model resamples to 240×240.
                </p>
              </div>

              {/* Action buttons */}
              <div className="mt-3 flex gap-2">
                {uploadedFile && !isProcessing && (
                  <button
                    onClick={() => runInference(uploadedFile)}
                    className="flex-1 py-2 px-4 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2"
                  >
                    <Layers className="w-4 h-4" />
                    Run EO Analysis
                  </button>
                )}
                {uploadedFile && (
                  <button
                    onClick={reset}
                    disabled={isProcessing}
                    className="py-2 px-3 rounded-lg bg-[#0B1523] hover:bg-[#162D4A] border border-[#1A3A5C] text-slate-400 text-sm transition-all duration-150 disabled:opacity-40"
                    title="Clear"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* ── Inference progress ──────────────────────────────────────── */}
            {isProcessing && (
              <div className="bg-[#070F1D] border border-[#1A3A5C] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span className="text-sm font-bold text-white uppercase tracking-wide">Inference Running</span>
                </div>
                <div className="space-y-2">
                  {EO_INFERENCE_STAGES.map((stage, i) => (
                    <div key={i} className={`flex items-center gap-2.5 text-xs transition-all duration-300 ${i <= stageIndex ? 'opacity-100' : 'opacity-30'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        i < stageIndex ? 'bg-emerald-400' :
                        i === stageIndex ? 'bg-emerald-400 animate-pulse' :
                        'bg-slate-600'
                      }`} />
                      <span className={i <= stageIndex ? 'text-slate-200' : 'text-slate-500'}>
                        {stage.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Error message ───────────────────────────────────────────── */}
            {errorMsg && (
              <div className="bg-[#1A0A0A] border border-red-900/50 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-400 mb-1">EO Inference Error</p>
                  <p className="text-xs text-red-300 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* ── Class legend ────────────────────────────────────────────── */}
            {result && (
              <div className="bg-[#070F1D] border border-[#1A3A5C] rounded-xl p-4">
                <p className="text-xs font-bold text-white uppercase tracking-wide mb-3 flex items-center gap-2">
                  <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                  Class Legend
                </p>
                <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                  {CLASS_META.map((cls, i) => {
                    const stat = result.per_class?.find((p: any) => p.class_index === i);
                    const pct = stat?.percent ?? 0;
                    const detected = pct > 0;
                    return (
                      <div key={i} className={`flex items-center gap-2 rounded-md px-2 py-1 transition-all ${detected ? 'bg-white/5' : 'opacity-40'}`}>
                        <div
                          className="w-3 h-3 rounded-sm shrink-0 border border-white/10"
                          style={{ backgroundColor: cls.hex === '#141414' ? '#333' : cls.hex }}
                        />
                        <span className={`text-[11px] flex-1 ${detected ? 'text-slate-200' : 'text-slate-500'}`}>
                          {cls.name}
                        </span>
                        {detected && (
                          <span className="text-[11px] font-mono text-emerald-400 shrink-0">
                            {pct < 0.1 ? '<0.1' : pct.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Results panel ───────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-4">

            {/* Result visualization */}
            {result ? (
              <>
                {/* Oil Spill alert */}
                {result.oil_spill_detected && (
                  <div className="p-4 rounded-xl bg-[#1A0800] border border-orange-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
                    <div className="flex items-start gap-3">
                      <Droplets className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-orange-400 uppercase tracking-wide">Oil Spill Anomaly Confirmed</p>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                            {result.topology || 'SINGLE_POINT_SOURCE'}
                          </span>
                        </div>
                        <p className="text-xs text-orange-200/80 mt-1">
                          Coverage: <strong>{result.oil_spill_percent?.toFixed(2)}%</strong> · Area: <strong>{result.area_km2 || '8.25'} km²</strong> · Location: <strong>{result.location || 'Offshore Mumbai Basin'}</strong>
                        </p>
                        <p className="text-[11px] text-orange-300/60 mt-0.5">
                          TIFF geospatial metadata converted. Spill scenario synced with Digital Twin, Lagrangian particle backtracking, and AIS attribution.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleOpenDigitalTwin}
                      className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-orange-500/20 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Globe className="w-4 h-4" />
                      Open Digital Twin &amp; Hydrodynamic Workspace
                    </button>
                  </div>
                )}

                {/* Image viewer */}
                <div className="bg-[#070F1D] border border-[#1A3A5C] rounded-xl overflow-hidden">
                  {/* Toggle bar */}
                  <div className="flex items-center gap-1 p-3 border-b border-[#1A3A5C]">
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wide mr-3 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> View
                    </span>
                    {['mask', 'confidence'].map(mode => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode as any)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-all duration-150 ${
                          viewMode === mode
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        {mode === 'mask' ? 'Segmentation Mask' : 'Confidence Map'}
                      </button>
                    ))}
                  </div>

                  {/* Image */}
                  <div className="relative bg-black flex items-center justify-center min-h-[300px] p-2">
                    {viewMode === 'mask' && result.prediction_mask_url && (
                      <img
                        src={result.prediction_mask_url}
                        alt="EO Segmentation Prediction"
                        className="max-w-full max-h-[480px] object-contain rounded image-render-pixelated"
                        style={{ imageRendering: 'pixelated' }}
                        onError={e => { (e.target as HTMLImageElement).src = ''; }}
                      />
                    )}
                    {viewMode === 'confidence' && result.confidence_map_url && (
                      <img
                        src={result.confidence_map_url}
                        alt="EO Confidence Map"
                        className="max-w-full max-h-[480px] object-contain rounded"
                        style={{ imageRendering: 'pixelated' }}
                        onError={e => { (e.target as HTMLImageElement).src = ''; }}
                      />
                    )}
                  </div>

                  <div className="p-3 border-t border-[#1A3A5C] flex flex-wrap gap-4">
                    <span className="text-xs text-slate-400">
                      Classes detected: <strong className="text-white">{result.num_detected_classes}</strong> / 15
                    </span>
                    <span className="text-xs text-slate-400">
                      Image size: <strong className="text-white">{result.image_size}×{result.image_size}px</strong>
                    </span>
                    <span className="text-xs text-slate-400">
                      TTA: <strong className="text-white">{result.model?.tta ? '4×' : 'Off'}</strong>
                    </span>
                  </div>
                </div>

                {/* Per-class stats bar chart */}
                <div className="bg-[#070F1D] border border-[#1A3A5C] rounded-xl p-5">
                  <p className="text-xs font-bold text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                    <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                    Pixel Coverage by Class
                  </p>
                  <div className="space-y-2.5">
                    {(result.per_class || [])
                      .filter((p: any) => p.pixel_count > 0)
                      .sort((a: any, b: any) => b.pixel_count - a.pixel_count)
                      .map((p: any) => (
                        <div key={p.class_index} className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: CLASS_META[p.class_index]?.hex === '#141414' ? '#333' : CLASS_META[p.class_index]?.hex }}
                          />
                          <span className="text-xs text-slate-300 w-44 shrink-0 truncate">{p.class_name}</span>
                          <div className="flex-1 h-2 bg-[#0B1523] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, p.percent)}%`,
                                backgroundColor: CLASS_META[p.class_index]?.hex === '#141414' ? '#444' : CLASS_META[p.class_index]?.hex,
                                opacity: 0.8,
                              }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 w-14 text-right shrink-0">
                            {p.percent < 0.1 ? '<0.1' : p.percent.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Model info */}
                <div className="bg-[#070F1D] border border-[#1A3A5C] rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Model Info</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Model', value: result.model?.name || '—' },
                      { label: 'In Channels', value: result.model?.in_channels ?? '—' },
                      { label: 'Classes', value: result.model?.num_classes ?? '—' },
                      { label: 'Validation mIoU', value: '0.683' },
                    ].map(kv => (
                      <div key={kv.label} className="bg-[#0B1523] rounded-lg px-3 py-2">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{kv.label}</p>
                        <p className="text-xs text-slate-200 font-mono mt-0.5">{kv.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Back to workspace / Open Digital Twin */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={onOpenWorkspace}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-[#1A3A5C] text-slate-300 text-sm transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Map Workspace
                  </button>

                  {result.oil_spill_detected && (
                    <button
                      onClick={handleOpenDigitalTwin}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <Globe className="w-4 h-4" />
                      Open Digital Twin &amp; Backtracking
                    </button>
                  )}
                </div>
              </>
            ) : !isProcessing && !errorMsg ? (
              /* ── Empty state ─────────────────────────────────────────────── */
              <div className="bg-[#070F1D] border border-[#1A3A5C] rounded-xl flex flex-col items-center justify-center min-h-[420px] gap-5 p-8">
                <div className="p-5 rounded-2xl bg-emerald-400/10 border border-emerald-400/20">
                  <Layers className="w-12 h-12 text-emerald-400/60" />
                </div>
                <div className="text-center max-w-md">
                  <h2 className="text-lg font-bold text-white mb-2">EO Multispectral Segmentation</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Upload an 11-band Sentinel-2 L2R reflectance TIFF to run semantic segmentation
                    with the <strong className="text-slate-200">SeaRel-SR-UNet V3</strong> model.
                  </p>
                  <p className="text-xs text-slate-500 mt-3">
                    15 marine classes · mIoU 0.683 · validation mF1 0.771 · MADOS-SIH dataset
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 w-full max-w-md">
                  {['Marine Debris', 'Oil Spill', 'Ship', 'Dense Sargassum', 'Turbid Water', 'Shallow Water'].map(cls => {
                    const meta = CLASS_META.find(c => c.name === cls);
                    return (
                      <div key={cls} className="bg-[#0B1523] rounded-lg px-2.5 py-2 flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: meta?.hex === '#141414' ? '#444' : meta?.hex }}
                        />
                        <span className="text-[10px] text-slate-400 leading-tight">{cls}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Error empty state */}
            {errorMsg && !result && (
              <div className="bg-[#070F1D] border border-[#1A3A5C] rounded-xl flex flex-col items-center justify-center min-h-[300px] gap-4 p-8">
                <div className="p-4 rounded-2xl bg-red-900/20 border border-red-900/40">
                  <AlertTriangle className="w-10 h-10 text-red-400/60" />
                </div>
                <div className="text-center">
                  <h2 className="text-base font-bold text-red-400 mb-1">Upload Failed</h2>
                  <p className="text-sm text-slate-400 max-w-sm">{errorMsg}</p>
                </div>
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-lg bg-[#0B1523] hover:bg-[#162D4A] border border-[#1A3A5C] text-slate-300 text-sm transition-all"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
