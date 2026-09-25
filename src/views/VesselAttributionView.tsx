import React, { useState, useEffect } from 'react';
import { 
  Ship, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  ArrowRight, 
  Navigation,
  MapPin,
  RefreshCw,
  Radio,
  Search,
  CheckCircle2,
  Globe2,
  Sliders,
  ShieldAlert
} from 'lucide-react';
import { Vessel } from '../types';
import { apiService } from '../services/api';

interface VesselAttributionViewProps {
  vessels: Vessel[];
  onSelectVessel: (vessel: Vessel) => void;
  onOpenWorkspace: () => void;
  onUpdateVessels?: (newVessels: Vessel[]) => void;
  currentIncidentCoordinates?: [number, number];
}

interface SectorPreset {
  name: string;
  label: string;
  flag: string;
  lat: number;
  lon: number;
  preferLive: boolean;
  notes: string;
}

const AIS_PRESETS: SectorPreset[] = [
  { 
    name: 'Mumbai High', 
    label: 'Mumbai High Offshore', 
    flag: '🇮🇳', 
    lat: 18.12, 
    lon: 72.45, 
    preferLive: false,
    notes: 'Arabian Sea offshore drilling fairway'
  },
  { 
    name: 'Chennai Port', 
    label: 'Chennai Port Corridor', 
    flag: '🇮🇳', 
    lat: 13.12, 
    lon: 80.45, 
    preferLive: false,
    notes: 'Bay of Bengal deepwater shipping channel'
  },
  { 
    name: 'Kochi Malabar', 
    label: 'Kochi Malabar Strait', 
    flag: '🇮🇳', 
    lat: 9.95, 
    lon: 76.05, 
    preferLive: false,
    notes: 'Lakshadweep corridor & port approach'
  },
  { 
    name: 'Gulf of Kutch', 
    label: 'Gulf of Kutch Fairway', 
    flag: '🇮🇳', 
    lat: 22.45, 
    lon: 69.20, 
    preferLive: false,
    notes: 'High-density crude tanker route'
  },
  { 
    name: 'Baltic Sea', 
    label: 'Baltic Sea (Live)', 
    flag: '🇪🇺', 
    lat: 59.90, 
    lon: 24.90, 
    preferLive: true,
    notes: 'Live open AIS stream via Digitraffic API'
  },
  { 
    name: 'Singapore Strait', 
    label: 'Singapore Strait TSS', 
    flag: '🇸🇬', 
    lat: 1.25, 
    lon: 103.85, 
    preferLive: false,
    notes: 'Malacca / Singapore maritime transit lane'
  }
];

export const VesselAttributionView: React.FC<VesselAttributionViewProps> = ({
  vessels,
  onSelectVessel,
  onOpenWorkspace,
  onUpdateVessels,
  currentIncidentCoordinates,
}) => {
  const [displayedVessels, setDisplayedVessels] = useState<Vessel[]>(vessels);
  const [expandedVesselId, setExpandedVesselId] = useState<string>(vessels[0]?.id || 'ves-01');
  
  // Coordinate Query Parameters
  const [selectedPreset, setSelectedPreset] = useState<string>('Mumbai High');
  const [queryLat, setQueryLat] = useState<number>(currentIncidentCoordinates?.[0] || 18.12);
  const [queryLon, setQueryLon] = useState<number>(currentIncidentCoordinates?.[1] || 72.45);
  const [queryRadius, setQueryRadius] = useState<number>(50);
  const [preferLive, setPreferLive] = useState<boolean>(false);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);

  // Active AIS Stream Telemetry
  const [dataSource, setDataSource] = useState<string>('MARINECADASTRE_AIS');
  const [activeSector, setActiveSector] = useState<string>('Mumbai High Offshore Sector');
  const [lastSyncTime, setLastSyncTime] = useState<string>('04:32:00 UTC');
  const [queryError, setQueryError] = useState<string | null>(null);

  // Sync displayed vessels if parent vessels change and user hasn't queried a custom coordinate
  useEffect(() => {
    if (vessels && vessels.length > 0 && selectedPreset === 'Mumbai High') {
      setDisplayedVessels(vessels);
      if (!expandedVesselId) {
        setExpandedVesselId(vessels[0].id);
      }
    }
  }, [vessels]);

  const toggleExpand = (id: string) => {
    setExpandedVesselId(prev => (prev === id ? '' : id));
  };

  const handleApplyPreset = (preset: SectorPreset) => {
    setSelectedPreset(preset.name);
    setQueryLat(preset.lat);
    setQueryLon(preset.lon);
    setPreferLive(preset.preferLive);
    handleFetchAIS(preset.lat, preset.lon, queryRadius, preset.preferLive);
  };

  const handleFetchAIS = async (
    lat: number = queryLat,
    lon: number = queryLon,
    radius: number = queryRadius,
    live: boolean = preferLive
  ) => {
    setIsQuerying(true);
    setQueryError(null);
    try {
      const res = await apiService.getAISVessels(lat, lon, radius, undefined, undefined, live);
      if (res && res.vessels && res.vessels.length > 0) {
        setDisplayedVessels(res.vessels);
        setDataSource(res.source || (live ? 'DIGITRAFFIC_LIVE_OPEN_AIS' : 'MARINECADASTRE_AIS'));
        setActiveSector(res.sector || `Maritime Sector (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`);
        setLastSyncTime(new Date().toISOString().substring(11, 19) + ' UTC');
        setExpandedVesselId(res.vessels[0].id);
        
        // Notify parent application to keep map in sync
        if (onUpdateVessels) {
          onUpdateVessels(res.vessels);
        }
      } else {
        setQueryError('No vessels detected in specified bounding radius. Displaying sector standby tracks.');
      }
    } catch {
      setQueryError('AIS Telemetry endpoint temporarily unreachable. Retaining active vessels.');
    } finally {
      setIsQuerying(false);
    }
  };

  // Dynamic KPI Metric Calculations
  const totalAnalyzed = displayedVessels.length * 14 + 12; // Sector density estimate
  const inOriginWindowCount = displayedVessels.filter(v => v.presenceInOriginWindow || v.distanceFromOriginKm <= 15).length;
  const highPriorityCount = displayedVessels.filter(v => v.attributionScore >= 70).length;
  const anomalyCount = displayedVessels.filter(v => v.speedAnomalyDetected || v.courseDeviationDetected).length;

  return (
    <div className="w-full h-[calc(100vh-2.75rem)] overflow-y-auto p-4 md:p-6 bg-[#FFFFE3] dark:bg-[#171B1F] text-[#4A4A4A] dark:text-[#FFFFE3] select-none font-sans custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-5">
        
        {/* ========================================================================= */}
        {/* TITLE HEADER & LEGAL DISCLAIMER                                           */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#CBCBCB] dark:border-[#353D46] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] text-[#6D8196] shadow-xs">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-[#4A4A4A] dark:text-[#FFFFE3] uppercase flex items-center gap-2">
                AIS Forensic Vessel Attribution Engine
              </h1>
              <p className="text-xs text-[#6D8196] dark:text-[#CBCBCB] mt-0.5">
                Spatiotemporal vessel reconstruction, kinematics anomaly correlation, and multi-factor investigative ranking.
              </p>
            </div>
          </div>

          <div className="px-3 py-2 rounded-xl bg-white dark:bg-[#272E36] border border-[#D9822B]/50 text-[#D9822B] text-xs flex items-center gap-2 shadow-xs shrink-0">
            <AlertTriangle className="w-4 h-4 text-[#D9822B] shrink-0" />
            <span className="text-[11px] leading-tight text-[#4A4A4A] dark:text-[#CBCBCB]">
              Attribution scores indicate <strong className="text-[#D9822B]">investigative priority</strong> for authorities — not legal proof of culpability.
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COORDINATE AIS QUERY TOOLBAR                                              */}
        {/* ========================================================================= */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#CBCBCB]/60 dark:border-[#353D46]/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#6D8196] dark:text-cyan-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#4A4A4A] dark:text-[#FFFFE3]">
                Coordinate-Based AIS Telemetry Acquisition
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#6D8196] dark:text-[#CBCBCB]">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-0.5" />
              <span>Stream: <strong className="text-[#4A4A4A] dark:text-[#FFFFE3]">{dataSource}</strong></span>
              <span>·</span>
              <span>Sync: <strong className="text-[#4A4A4A] dark:text-[#FFFFE3]">{lastSyncTime}</strong></span>
            </div>
          </div>

          {/* Preset Sector Quick Selectors */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6D8196] dark:text-[#CBCBCB] flex items-center justify-between">
              <span>Maritime Fairways & Port Corridors:</span>
              <span className="text-[10px] font-mono text-[#6D8196] dark:text-[#CBCBCB]">Select sector or enter custom lat/lon</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {AIS_PRESETS.map((p) => {
                const isActive = selectedPreset === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      isActive
                        ? 'bg-[#6D8196] dark:bg-[#00E5FF] text-white dark:text-[#0B0F17] font-bold shadow-xs'
                        : 'bg-[#FFFFE3] dark:bg-[#1F242A] hover:bg-white dark:hover:bg-[#2F3740] border border-[#CBCBCB] dark:border-[#353D46] text-[#4A4A4A] dark:text-[#FFFFE3]'
                    }`}
                  >
                    <span>{p.flag}</span>
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coordinate Inputs, Radius, Live Switch & Fetch Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1">
            <div className="lg:col-span-3">
              <label className="text-[10px] font-mono uppercase text-[#6D8196] dark:text-[#CBCBCB] block mb-1">
                Latitude (°N / °S)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  value={queryLat}
                  onChange={(e) => {
                    setQueryLat(parseFloat(e.target.value) || 0);
                    setSelectedPreset('Custom');
                  }}
                  className="w-full bg-[#FFFFE3] dark:bg-[#1F242A] border border-[#CBCBCB] dark:border-[#353D46] focus:border-[#6D8196] dark:focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#4A4A4A] dark:text-[#FFFFE3] outline-none"
                  placeholder="e.g. 18.12"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#6D8196] font-mono pointer-events-none">°N</span>
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="text-[10px] font-mono uppercase text-[#6D8196] dark:text-[#CBCBCB] block mb-1">
                Longitude (°E / °W)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  value={queryLon}
                  onChange={(e) => {
                    setQueryLon(parseFloat(e.target.value) || 0);
                    setSelectedPreset('Custom');
                  }}
                  className="w-full bg-[#FFFFE3] dark:bg-[#1F242A] border border-[#CBCBCB] dark:border-[#353D46] focus:border-[#6D8196] dark:focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#4A4A4A] dark:text-[#FFFFE3] outline-none"
                  placeholder="e.g. 72.45"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#6D8196] font-mono pointer-events-none">°E</span>
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="text-[10px] font-mono uppercase text-[#6D8196] dark:text-[#CBCBCB] block mb-1">
                Radius (KM)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="200"
                  value={queryRadius}
                  onChange={(e) => setQueryRadius(parseInt(e.target.value) || 50)}
                  className="w-full bg-[#FFFFE3] dark:bg-[#1F242A] border border-[#CBCBCB] dark:border-[#353D46] focus:border-[#6D8196] dark:focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#4A4A4A] dark:text-[#FFFFE3] outline-none"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#6D8196] font-mono pointer-events-none">km</span>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg bg-[#FFFFE3] dark:bg-[#1F242A] border border-[#CBCBCB] dark:border-[#353D46]">
                <input
                  type="checkbox"
                  checked={preferLive}
                  onChange={(e) => setPreferLive(e.target.checked)}
                  className="rounded text-[#6D8196] focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] font-medium text-[#4A4A4A] dark:text-[#FFFFE3] truncate">
                  Live Digitraffic API
                </span>
              </label>
            </div>

            <div className="lg:col-span-2 flex items-end">
              <button
                type="button"
                disabled={isQuerying}
                onClick={() => handleFetchAIS(queryLat, queryLon, queryRadius, preferLive)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#6D8196] hover:bg-[#586A7D] dark:bg-[#00E5FF] dark:hover:bg-[#00c8e0] text-white dark:text-[#0B0F17] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isQuerying ? 'animate-spin' : ''}`} />
                <span>{isQuerying ? 'Querying...' : 'Fetch AIS'}</span>
              </button>
            </div>
          </div>

          {/* Active Sector Summary Pill */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-[#6D8196] dark:text-[#CBCBCB] border-t border-[#CBCBCB]/40 dark:border-[#353D46]/50">
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#6D8196] dark:text-cyan-400 shrink-0" />
              <span>Active Sector: <strong className="text-[#4A4A4A] dark:text-[#FFFFE3] font-medium">{activeSector}</strong></span>
              <span>·</span>
              <span className="font-mono">[{queryLat.toFixed(4)}°N, {queryLon.toFixed(4)}°E · R={queryRadius}km]</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{displayedVessels.length} Target Vessels Reconstructed</span>
            </div>
          </div>

          {queryError && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{queryError}</span>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* DYNAMIC KPI METRIC CARDS                                                  */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] space-y-1 shadow-xs">
            <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] uppercase tracking-wider font-medium block">Vessels Analyzed</span>
            <div className="text-2xl font-bold font-mono text-[#4A4A4A] dark:text-[#FFFFE3]">
              {totalAnalyzed}
            </div>
            <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB] truncate block">
              Across {queryRadius * 2}km maritime corridor
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] space-y-1 shadow-xs">
            <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] uppercase tracking-wider font-medium block">In Origin Window</span>
            <div className="text-2xl font-bold font-mono text-[#6D8196] dark:text-cyan-400">
              {String(inOriginWindowCount).padStart(2, '0')}
            </div>
            <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB]">
              Present 02:10–03:40 UTC
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] space-y-1 shadow-xs">
            <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] uppercase tracking-wider font-medium block">High Priority Flags</span>
            <div className="text-2xl font-bold font-mono text-[#D9534F]">
              {String(highPriorityCount).padStart(2, '0')}
            </div>
            <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB]">
              Exceeding 70% threshold
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] space-y-1 shadow-xs">
            <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] uppercase tracking-wider font-medium block">AIS Anomalies</span>
            <div className="text-2xl font-bold font-mono text-[#D9822B]">
              {String(anomalyCount).padStart(2, '0')}
            </div>
            <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB]">
              Course shifts & speed drops
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RANKED CANDIDATE VESSEL CARDS                                             */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6D8196] dark:text-[#CBCBCB]">
              Ranked Vessels for Further Maritime Investigation ({displayedVessels.length} Candidates)
            </h2>
            <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB]">
              Sorted by Composite Forensic Score
            </span>
          </div>

          <div className="space-y-3">
            {displayedVessels.map((vessel) => {
              const isExpanded = expandedVesselId === vessel.id;
              const isTop = vessel.rank === 1;

              return (
                <div
                  key={vessel.id}
                  className={`rounded-xl border transition-all shadow-xs ${
                    isTop
                      ? 'bg-white dark:bg-[#272E36] border-2 border-[#D9534F]'
                      : 'bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46]'
                  }`}
                >
                  {/* Summary Bar */}
                  <div
                    onClick={() => toggleExpand(vessel.id)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#FFFFE3]/60 dark:hover:bg-[#1F242A] transition-colors rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold font-mono text-sm ${
                        isTop
                          ? 'bg-[#D9534F]/15 text-[#D9534F] border border-[#D9534F]/40'
                          : vessel.rank === 2
                          ? 'bg-[#D9822B]/15 text-[#D9822B] border border-[#D9822B]/40'
                          : 'bg-[#FFFFE3] dark:bg-[#1F242A] text-[#6D8196] dark:text-[#CBCBCB] border border-[#CBCBCB] dark:border-[#353D46]'
                      }`}>
                        #{vessel.rank}
                      </div>

                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-semibold text-sm text-[#4A4A4A] dark:text-[#FFFFE3]">{vessel.name}</span>
                          <span className="text-xs text-[#6D8196] dark:text-[#CBCBCB] font-mono">· IMO {vessel.imo}</span>
                          <span className="text-xs text-[#6D8196] dark:text-[#CBCBCB] font-mono">· MMSI {vessel.mmsi}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#FFFFE3] dark:bg-[#1F242A] text-[#6D8196] dark:text-[#CBCBCB] border border-[#CBCBCB] dark:border-[#353D46]">
                            {vessel.type}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#FFFFE3] dark:bg-[#1F242A] text-[#6D8196] dark:text-[#CBCBCB] border border-[#CBCBCB] dark:border-[#353D46]">
                            Flag: {vessel.flag}
                          </span>
                        </div>
                        <div className="text-xs text-[#6D8196] dark:text-[#CBCBCB] mt-1 flex items-center gap-3 flex-wrap">
                          <span className="font-mono tabular-nums">Speed: {vessel.currentSpeedKt} kn</span>
                          <span className="font-mono tabular-nums">Heading: {vessel.currentHeadingDeg}°</span>
                          <span>Dist to Origin: <strong className="text-[#4A4A4A] dark:text-[#FFFFE3] font-mono tabular-nums">{vessel.distanceFromOriginKm} km</strong></span>
                          <span>Destination: <span className="text-[#4A4A4A] dark:text-[#FFFFE3] font-medium">{vessel.destination}</span></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] uppercase block font-medium">Priority Score</span>
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className={`text-lg font-bold font-mono tabular-nums ${
                            vessel.attributionScore >= 80 ? 'text-[#D9534F]' : vessel.attributionScore >= 50 ? 'text-[#D9822B]' : 'text-[#6D8196]'
                          }`}>
                            {vessel.attributionScore}%
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] px-2.5 py-1 rounded-md font-semibold uppercase ${
                        vessel.investigationPriority === 'HIGH'
                          ? 'bg-[#D9534F]/15 text-[#D9534F] border border-[#D9534F]/40'
                          : vessel.investigationPriority === 'MEDIUM'
                          ? 'bg-[#D9822B]/15 text-[#D9822B] border border-[#D9822B]/40'
                          : 'bg-[#FFFFE3] dark:bg-[#1F242A] text-[#6D8196] dark:text-[#CBCBCB] border border-[#CBCBCB] dark:border-[#353D46]'
                      }`}>
                        {vessel.investigationPriority}
                      </span>

                      {isExpanded ? <ChevronUp className="w-4 h-4 text-[#6D8196] dark:text-[#CBCBCB]" /> : <ChevronDown className="w-4 h-4 text-[#6D8196] dark:text-[#CBCBCB]" />}
                    </div>
                  </div>

                  {/* Expandable Forensic Deep Dive */}
                  {isExpanded && (
                    <div className="p-5 border-t border-[#CBCBCB] dark:border-[#353D46] bg-[#FFFFE3]/40 dark:bg-[#1F242A] rounded-b-xl space-y-4 text-xs">
                      {/* Evidence Breakdown Bars */}
                      <div className="space-y-2">
                        <span className="text-[11px] uppercase font-semibold text-[#6D8196] dark:text-[#CBCBCB] block tracking-wider">
                          Evidence Breakdown & Multi-Factor Scoring
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#4A4A4A] dark:text-[#CBCBCB]">Spatiotemporal Proximity to Origin</span>
                              <span className="text-[#6D8196] dark:text-[#FFFFE3] font-mono font-semibold">{vessel.proximityScore}%</span>
                            </div>
                            <div className="w-full bg-[#CBCBCB]/40 dark:bg-[#171B1F] h-1.5 rounded-full overflow-hidden border border-[#CBCBCB]/60 dark:border-[#353D46]">
                              <div className="h-full bg-[#6D8196] rounded-full" style={{ width: `${vessel.proximityScore}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#4A4A4A] dark:text-[#CBCBCB]">Drift Trajectory Alignment</span>
                              <span className="text-[#6D8196] dark:text-[#FFFFE3] font-mono font-semibold">{vessel.trajectoryScore}%</span>
                            </div>
                            <div className="w-full bg-[#CBCBCB]/40 dark:bg-[#171B1F] h-1.5 rounded-full overflow-hidden border border-[#CBCBCB]/60 dark:border-[#353D46]">
                              <div className="h-full bg-[#6D8196] rounded-full" style={{ width: `${vessel.trajectoryScore}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#4A4A4A] dark:text-[#CBCBCB]">Temporal Discharge Window Correlation</span>
                              <span className="text-[#6D8196] dark:text-[#FFFFE3] font-mono font-semibold">{vessel.temporalScore}%</span>
                            </div>
                            <div className="w-full bg-[#CBCBCB]/40 dark:bg-[#171B1F] h-1.5 rounded-full overflow-hidden border border-[#CBCBCB]/60 dark:border-[#353D46]">
                              <div className="h-full bg-[#6D8196] rounded-full" style={{ width: `${vessel.temporalScore}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#4A4A4A] dark:text-[#CBCBCB]">AIS Continuity & Transmission Fidelity</span>
                              <span className="text-[#6D8196] dark:text-[#FFFFE3] font-mono font-semibold">{vessel.aisAnomalyScore}%</span>
                            </div>
                            <div className="w-full bg-[#CBCBCB]/40 dark:bg-[#171B1F] h-1.5 rounded-full overflow-hidden border border-[#CBCBCB]/60 dark:border-[#353D46]">
                              <div className="h-full bg-[#6D8196] rounded-full" style={{ width: `${vessel.aisAnomalyScore}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* "Why This Vessel?" Deep Dive */}
                      <div className="p-3.5 rounded-lg bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] space-y-2 shadow-xs">
                        <div className="flex items-center gap-2 text-[#6D8196] dark:text-[#FFFFE3] font-semibold text-xs uppercase tracking-wider">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Why is this vessel prioritized for investigation?</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                          <div className="bg-[#FFFFE3]/50 dark:bg-[#1F242A] p-2.5 rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46]">
                            <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[10px] block">Offset from Origin:</span>
                            <span className="font-semibold text-[#4A4A4A] dark:text-[#FFFFE3] font-mono tabular-nums">{vessel.distanceFromOriginKm} km</span>
                          </div>
                          <div className="bg-[#FFFFE3]/50 dark:bg-[#1F242A] p-2.5 rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46]">
                            <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[10px] block">Timing Delta (Δt):</span>
                            <span className="font-semibold text-[#4A4A4A] dark:text-[#FFFFE3] font-mono tabular-nums">{vessel.timeDiffMinutes} minutes</span>
                          </div>
                          <div className="bg-[#FFFFE3]/50 dark:bg-[#1F242A] p-2.5 rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46]">
                            <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[10px] block">Speed Anomaly:</span>
                            <span className={`font-semibold ${vessel.speedAnomalyDetected ? 'text-[#D9534F]' : 'text-[#6D8196]'}`}>
                              {vessel.speedAnomalyDetected ? 'DETECTED (>1.5 kn drop)' : 'STEADY (Within Bounds)'}
                            </span>
                          </div>
                          <div className="bg-[#FFFFE3]/50 dark:bg-[#1F242A] p-2.5 rounded-lg border border-[#CBCBCB]/70 dark:border-[#353D46]">
                            <span className="text-[#6D8196] dark:text-[#CBCBCB] text-[10px] block">Course Deviation:</span>
                            <span className={`font-semibold ${vessel.courseDeviationDetected ? 'text-[#D9822B]' : 'text-[#6D8196]'}`}>
                              {vessel.courseDeviationDetected ? 'DETECTED (>10° deviation)' : 'NORMAL TRACK'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Activity Chronology */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] uppercase font-semibold text-[#6D8196] dark:text-[#CBCBCB] block tracking-wider">
                          Reconstructed Timeline Events ({vessel.track.length} Waypoints)
                        </span>
                        <div className="space-y-1">
                          {vessel.activityTimeline.map((ev, i) => (
                            <div key={i} className="text-xs flex items-center gap-2 text-[#4A4A4A] dark:text-[#CBCBCB]">
                              <span className="text-[#6D8196] dark:text-[#FFFFE3] font-mono text-[11px]">{ev.timestampUtc}</span>
                              <span className="text-[#CBCBCB]">·</span>
                              <span className={ev.isAnomaly ? 'text-[#D9534F] font-medium' : 'text-[#4A4A4A] dark:text-[#FFFFE3]'}>
                                {ev.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#CBCBCB] dark:border-[#353D46]">
                        <button
                          onClick={() => onSelectVessel(vessel)}
                          className="px-3 py-1.5 rounded-md bg-white dark:bg-[#272E36] hover:border-[#6D8196] border border-[#CBCBCB] dark:border-[#353D46] text-[#4A4A4A] dark:text-[#FFFFE3] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Navigation className="w-3.5 h-3.5 text-[#6D8196]" />
                          <span>Focus On Map</span>
                        </button>
                        <button
                          onClick={onOpenWorkspace}
                          className="px-3 py-1.5 rounded-md bg-[#6D8196] hover:bg-[#586A7D] text-[#FFFFE3] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <span>Open Digital Twin Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
