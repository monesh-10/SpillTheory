import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Layers, 
  RotateCcw, 
  Crosshair, 
  HelpCircle, 
  ChevronDown, 
  Eye, 
  EyeOff,
  Navigation,
  Wind,
  X,
  Plus,
  Minus,
  Maximize2,
  Ship,
  Target
} from 'lucide-react';
import { 
  Incident, 
  Vessel, 
  HindcastResult, 
  ForecastStep, 
  ShorelineRiskZone, 
  MetOceanTelemetry,
  MapLayerState 
} from '../types';
import { MapGuideModal } from './MapGuideModal';

function interpolateAlongTrack(
  pts: { lat: number; lng: number; headingDeg?: number }[],
  frac: number
): { pos: [number, number]; heading: number } {
  if (!pts || pts.length === 0) return { pos: [0, 0], heading: 0 };
  if (pts.length === 1 || frac <= 0) return { pos: [pts[0].lat, pts[0].lng], heading: pts[0].headingDeg || 0 };
  if (frac >= 1) return { pos: [pts[pts.length - 1].lat, pts[pts.length - 1].lng], heading: pts[pts.length - 1].headingDeg || 0 };

  const distances: number[] = [0];
  let totalDist = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(
      pts[i + 1].lat - pts[i].lat,
      (pts[i + 1].lng - pts[i].lng) * Math.cos((pts[i].lat * Math.PI) / 180)
    );
    totalDist += d;
    distances.push(totalDist);
  }
  if (totalDist === 0) return { pos: [pts[0].lat, pts[0].lng], heading: pts[0].headingDeg || 0 };

  const targetDist = frac * totalDist;
  for (let i = 0; i < pts.length - 1; i++) {
    if (targetDist <= distances[i + 1]) {
      const segStart = distances[i];
      const segEnd = distances[i + 1];
      const segLen = segEnd - segStart;
      const segFrac = segLen > 0 ? (targetDist - segStart) / segLen : 0;
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const lat = p1.lat + (p2.lat - p1.lat) * segFrac;
      const lng = p1.lng + (p2.lng - p1.lng) * segFrac;
      const heading = p2.headingDeg !== undefined ? p2.headingDeg : (p1.headingDeg || 0);
      return { pos: [Number(lat.toFixed(5)), Number(lng.toFixed(5))], heading };
    }
  }
  const last = pts[pts.length - 1];
  return { pos: [last.lat, last.lng], heading: last.headingDeg || 0 };
}

// Synchronized AIS position resolver: strictly reflects observed AIS transponder telemetry
function getVesselPositionAtTime(
  vessel: Vessel,
  t: number
): { pos: [number, number]; heading: number } {
  const track = vessel.track;

  if (!track || track.length === 0) {
    const coords = vessel.currentCoordinates || [0, 0];
    return { pos: [coords[0], coords[1]], heading: vessel.currentHeadingDeg || 0 };
  }

  const lastPt = track[track.length - 1];
  const firstPt = track[0];

  // At present or forward forecast times (t >= 0): display the exact latest observed AIS transponder position
  if (t >= 0) {
    return {
      pos: vessel.currentCoordinates || [lastPt.lat, lastPt.lng],
      heading: vessel.currentHeadingDeg ?? (lastPt.headingDeg || 0)
    };
  }

  // Pre-event (prior to first recorded AIS broadcast): hold at first known AIS waypoint
  if (t <= -360) {
    return { pos: [firstPt.lat, firstPt.lng], heading: firstPt.headingDeg || vessel.currentHeadingDeg || 0 };
  }

  // Historical hindcast window (-360 min to 0 min): interpolate directly between verified AIS waypoints
  const frac = Math.max(0, Math.min(1, (t - (-360)) / 360));
  const interpolated = interpolateAlongTrack(track, frac);
  return { pos: [interpolated.pos[0], interpolated.pos[1]], heading: interpolated.heading };
}

interface MapWorkspaceProps {
  incident: Incident;
  vessels: Vessel[];
  selectedVessel: Vessel | null;
  onSelectVessel: (vessel: Vessel | null) => void;
  hindcast: HindcastResult;
  forecastSteps: ForecastStep[];
  activeForecastStep: number;
  shorelineRisk: ShorelineRiskZone;
  metocean: MetOceanTelemetry;
  currentTimeSimulationMinutes: number;
  layerState: MapLayerState;
  onToggleLayer: (layerKey: keyof MapLayerState) => void;
  onOpenSlickDetails?: () => void;
  theme?: 'dark' | 'light';
  isDualSpillScenario?: boolean;
  hiddenVesselIds?: string[];
  onToggleHideVessel?: (vesselId: string) => void;
  onShowAllVessels?: () => void;
  onSoloVessel?: (vesselId: string) => void;
}

export const MapWorkspace: React.FC<MapWorkspaceProps> = ({
  incident,
  vessels,
  selectedVessel,
  onSelectVessel,
  hindcast,
  forecastSteps,
  activeForecastStep,
  shorelineRisk,
  metocean,
  currentTimeSimulationMinutes,
  layerState,
  onToggleLayer,
  onOpenSlickDetails,
  theme = 'dark',
  isDualSpillScenario: isDualSpillScenarioProp,
  hiddenVesselIds = [],
  onToggleHideVessel = () => {},
  onShowAllVessels = () => {},
  onSoloVessel = () => {},
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const refTileLayerRef = useRef<L.TileLayer | null>(null);
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [lagrangianOpen, setLagrangianOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  const origin1Coords: [number, number] = hindcast?.originCoordinates || [18.065, 72.395];
  const v2Suspect = vessels[1];
  const origin2Coords: [number, number] = v2Suspect?.track && v2Suspect.track.length > 1
    ? [v2Suspect.track[1].lat, v2Suspect.track[1].lng]
    : [18.050, 72.415];

  const isDualSpillScenario = isDualSpillScenarioProp !== undefined
    ? isDualSpillScenarioProp
    : ((vessels.length >= 2 || incident.id === 'OCN-042') && !incident.name.includes('Single') && incident.id !== 'OCN-043');
  const hindcastFracVal = Math.max(0, Math.min(1, (currentTimeSimulationMinutes + 300) / 300));
  const forecastFracVal = Math.min(1, Math.max(0, currentTimeSimulationMinutes / 2880));
  const hudSlickScale = currentTimeSimulationMinutes < 0
    ? (0.22 + 0.78 * Math.pow(hindcastFracVal, 0.80))
    : (1.0 + 2.65 * Math.pow(forecastFracVal, 0.75));

  // Check if first-time user needs the map guide overlay
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('spilltheory_map_guide_dismissed');
      if (!dismissed) {
        setGuideModalOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Initialize Leaflet Map with deep nautical chart styling
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: incident?.coordinates || [18.112, 72.464],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
      minZoom: 6,
      maxZoom: 16,
    });

    const isLight = theme === 'light';
    const baseTileUrl = isLight
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const refTileUrl = isLight
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

    const baseTile = L.tileLayer(baseTileUrl, {
      maxZoom: 16,
      subdomains: ['server', 'services'],
    }).addTo(map);
    baseTileLayerRef.current = baseTile;

    const refTile = L.tileLayer(refTileUrl, {
      maxZoom: 16,
      opacity: 0.75,
    }).addTo(map);
    refTileLayerRef.current = refTile;

    if (!map.getPane('lagrangianParticlesPane')) {
      const pPane = map.createPane('lagrangianParticlesPane');
      pPane.style.zIndex = '620';
      pPane.style.pointerEvents = 'none';
    }

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      baseTileLayerRef.current = null;
      refTileLayerRef.current = null;
    };
  }, []);

  // Dynamically update basemap when theme changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const isLight = theme === 'light';
    const baseTileUrl = isLight
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const refTileUrl = isLight
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

    if (baseTileLayerRef.current) {
      baseTileLayerRef.current.setUrl(baseTileUrl);
    }
    if (refTileLayerRef.current) {
      refTileLayerRef.current.setUrl(refTileUrl);
    }
  }, [theme]);

  // Update map vector layers
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    const group = layerGroupRef.current;
    group.clearLayers();

    const baseLat = incident.coordinates[0];
    const baseLng = incident.coordinates[1];

    // -------------------------------------------------------------
    // 1. DUAL / SINGLE OIL SPILL VISUALIZATION & COALESCENCE
    // -------------------------------------------------------------
    const hasVessel2 = isDualSpillScenario && vessels.length >= 2;
    const isSpillInitiated = currentTimeSimulationMinutes >= -300;

    const origin1Coords: [number, number] = hindcast?.originCoordinates || [18.065, 72.395];
    const v2 = vessels[1];
    const origin2Coords: [number, number] = v2?.track && v2.track.length > 1
      ? [v2.track[1].lat, v2.track[1].lng]
      : [18.050, 72.415];

    let centerLat1 = baseLat;
    let centerLng1 = baseLng;
    let centerLat2 = baseLat;
    let centerLng2 = baseLng;
    let slickScale1 = 1.0;
    let slickScale2 = 1.0;
    let timeStatusLabel = isDualSpillScenario ? 'COALESCED OIL SLICK' : 'DETECTED OIL SLICK';
    let timeStatusSub = 'Sentinel-1 C-SAR · 94.7% IoU';

    if (currentTimeSimulationMinutes <= 0) {
      if (!isSpillInitiated) {
        timeStatusLabel = 'PRE-INCIDENT NAVIGATION';
        timeStatusSub = isDualSpillScenario ? 'Vessels approaching probable discharge origins' : 'Vessel approaching probable discharge origin';
      } else {
        // Hindcast Regime (-300 min / -5h to 0 min / NOW)
        const hindcastFrac = Math.max(0, Math.min(1, (currentTimeSimulationMinutes + 300) / 300));
        
        // Plume 1 center calculation (MT Ocean Star)
        centerLat1 = origin1Coords[0] + (baseLat - origin1Coords[0]) * hindcastFrac;
        centerLng1 = origin1Coords[1] + (baseLng - origin1Coords[1]) * hindcastFrac;
        slickScale1 = 0.22 + 0.78 * Math.pow(hindcastFrac, 0.80);

        // Plume 2 center calculation (Gulf Voyager in violet region)
        if (hasVessel2) {
          centerLat2 = origin2Coords[0] + (baseLat - origin2Coords[0]) * hindcastFrac;
          centerLng2 = origin2Coords[1] + (baseLng - origin2Coords[1]) * hindcastFrac;
          slickScale2 = 0.22 + 0.78 * Math.pow(hindcastFrac, 0.80);
        }

        if (currentTimeSimulationMinutes <= -300) {
          timeStatusLabel = isDualSpillScenario ? 'DUAL DISCHARGE PLUMES (-5h)' : 'NASCENT DISCHARGE PLUME (-5h)';
          timeStatusSub = isDualSpillScenario ? 'Simultaneous discharges initiate at Origin #1 & Origin #2' : 'Point-source discharge begins at Origin #1';
        } else if (currentTimeSimulationMinutes < 0) {
          const h = (currentTimeSimulationMinutes / 60).toFixed(1);
          timeStatusLabel = isDualSpillScenario ? `DUAL DRIFT & MERGING (${h}h)` : `RECONSTRUCTED DRIFT (${h}h)`;
          timeStatusSub = isDualSpillScenario ? 'Plume 1 & Plume 2 advecting and combining into unified slick' : `Reverse Lagrangian trajectory · ${hindcast.confidencePercent}% Conf`;
        } else {
          timeStatusLabel = isDualSpillScenario ? 'COALESCED OIL SLICK (NOW)' : 'DETECTED OIL SLICK (NOW)';
          timeStatusSub = 'Sentinel-1 C-SAR Acquisition · 94.7% IoU';
        }
      }
    } else {
      // Forward Forecast Regime (0 min to +2880 min / +48h)
      const hours = currentTimeSimulationMinutes / 60;
      if (forecastSteps && forecastSteps.length > 0) {
        let s0 = forecastSteps[0];
        let s1 = forecastSteps[forecastSteps.length - 1];
        for (let i = 0; i < forecastSteps.length - 1; i++) {
          const hStart = forecastSteps[i].stepHours ?? 0;
          const hEnd = forecastSteps[i + 1].stepHours ?? 48;
          if (hours >= hStart && hours <= hEnd) {
            s0 = forecastSteps[i];
            s1 = forecastSteps[i + 1];
            break;
          }
        }
        const h0 = s0.stepHours ?? 0;
        const h1 = s1.stepHours ?? 48;
        const span = Math.max(0.1, h1 - h0);
        const segFrac = Math.max(0, Math.min(1, (hours - h0) / span));
        const c0 = s0.centerCoordinates;
        const c1 = s1.centerCoordinates;
        centerLat1 = c0[0] + (c1[0] - c0[0]) * segFrac;
        centerLng1 = c0[1] + (c1[1] - c0[1]) * segFrac;
        centerLat2 = centerLat1;
        centerLng2 = centerLng1;
      }
      const forecastFrac = Math.min(1, currentTimeSimulationMinutes / 2880);
      // Physical Fay viscous-surface tension expansion:
      // Area expands ~5.6x across 48h, linear scale grows by ~2.65x
      slickScale1 = 1.0 + 2.65 * Math.pow(forecastFrac, 0.75);
      slickScale2 = slickScale1;
      const h = (currentTimeSimulationMinutes / 60).toFixed(1);
      timeStatusLabel = `PROJECTED SLICK (+${h}h FORECAST)`;
      timeStatusSub = 'Unified Lagrangian forward advection & coastal dispersion';
    }

    if (layerState.oilSlicks && !isSpillInitiated) {
      // Pre-spill navigation regime: Show ghosted release footprints indicating pending discharge
      L.circle(origin1Coords, {
        radius: 1200,
        color: '#64748B',
        weight: 1.5,
        dashArray: '5, 5',
        fillColor: '#334155',
        fillOpacity: 0.14,
      }).bindTooltip(`
        <div style="font-family: 'Inter', sans-serif; font-size: 11px; color: #94A3B8; background: rgba(7, 12, 24, 0.96); padding: 6px 10px; border-radius: 6px; border: 1px dashed #64748B;">
          <strong style="color: #94A3B8;">PROJECTED RELEASE FOOTPRINT (ORIGIN #1)</strong><br/>
          Pending ${vessels[0]?.name || 'Target Vessel 1'} arrival at 02:47 UTC · Sea is clean
        </div>
      `, { sticky: true }).addTo(group);

      if (hasVessel2) {
        L.circle(origin2Coords, {
          radius: 1100,
          color: '#818CF8',
          weight: 1.5,
          dashArray: '5, 5',
          fillColor: '#4338CA',
          fillOpacity: 0.14,
        }).bindTooltip(`
          <div style="font-family: 'Inter', sans-serif; font-size: 11px; color: #C084FC; background: rgba(7, 12, 24, 0.96); padding: 6px 10px; border-radius: 6px; border: 1px dashed #818CF8;">
            <strong style="color: #C084FC;">PROJECTED RELEASE FOOTPRINT (ORIGIN #2)</strong><br/>
            Pending ${vessels[1]?.name || 'Target Vessel 2'} arrival at 02:35 UTC
          </div>
        `, { sticky: true }).addTo(group);
      }
    }

    if (layerState.oilSlicks && isSpillInitiated) {
      // Organic dispersion offsets
      const outerOffsets = [
        [0.026, -0.010],
        [0.033, 0.005],
        [0.028, 0.018],
        [0.016, 0.026],
        [0.005, 0.036],
        [-0.008, 0.032],
        [-0.018, 0.022],
        [-0.028, 0.008],
        [-0.033, -0.006],
        [-0.026, -0.018],
        [-0.015, -0.024],
        [-0.002, -0.028],
        [0.012, -0.024],
        [0.020, -0.018]
      ];

      const outerOffsets2 = [
        [0.022, 0.014],
        [0.028, -0.004],
        [0.020, -0.022],
        [0.008, -0.030],
        [-0.006, -0.034],
        [-0.020, -0.024],
        [-0.030, -0.010],
        [-0.026, 0.008],
        [-0.018, 0.024],
        [-0.004, 0.030],
        [0.010, 0.026],
        [0.018, 0.020]
      ];

      const isHindcastSeparated = isDualSpillScenario && currentTimeSimulationMinutes < 0;
      const isHistoricalSim = currentTimeSimulationMinutes < 0;
      const isSARObservation = currentTimeSimulationMinutes === 0;

      // Elongation along the drift vector (058° ENE) in forecast
      const elongationLng = currentTimeSimulationMinutes > 0
        ? (1.0 + 0.45 * Math.min(1, currentTimeSimulationMinutes / 2880))
        : 1.0;
      const elongationLat = currentTimeSimulationMinutes > 0
        ? (1.0 + 0.20 * Math.min(1, currentTimeSimulationMinutes / 2880))
        : 1.0;

      // Dynamic physical Fay spreading area calculation
      const dynamicArea1 = currentTimeSimulationMinutes < 0
        ? Math.max(1.8, Number((incident.slickAreaKm2 * (isHindcastSeparated ? 0.58 : 1.0) * Math.pow(slickScale1, 1.25)).toFixed(1)))
        : Number((incident.slickAreaKm2 * Math.pow(slickScale1, 1.35)).toFixed(1));

      const dynamicArea2 = Math.max(1.2, Number((incident.slickAreaKm2 * 0.45 * Math.pow(slickScale2, 1.25)).toFixed(1)));

      // ==========================================
      // A. PLUME #1 / UNIFIED SLICK (GEOMETRY B in Past, GEOMETRY A at t=0)
      // ==========================================
      const p1Scale = isHindcastSeparated ? slickScale1 * 0.78 : slickScale1;
      const outerCoords1 = outerOffsets.map(([dLat, dLng]) => [
        centerLat1 + dLat * p1Scale * elongationLat,
        centerLng1 + dLng * p1Scale * elongationLng
      ]) as L.LatLngExpression[];

      const coreCoords1 = outerOffsets.map(([dLat, dLng]) => [
        centerLat1 + dLat * 0.52 * p1Scale * elongationLat,
        centerLng1 + dLng * 0.52 * p1Scale * elongationLng
      ]) as L.LatLngExpression[];

      // Dynamic styling based on physical regime:
      // 1. Historical Sim (-300 to -1 min): Geometry B (Amber/Orange Simulated Plume)
      // 2. SAR Observation (t = 0 min): Geometry A (Solid Red Observed SAR Slick Ground Truth)
      // 3. Forecast (> 0 min): Forward Forecast Dispersion (Emerald/Teal)
      const p1SheenColor = isHistoricalSim ? '#F59E0B' : (isSARObservation ? '#EF4444' : '#10B981');
      const p1FillColor = isHistoricalSim ? '#EA580C' : (isSARObservation ? '#DC2626' : '#059669');
      const p1CoreFill = isHistoricalSim ? '#C2410C' : (isSARObservation ? '#991B1B' : '#047857');
      const p1DashArray = isSARObservation ? 'none' : '5, 4';
      const p1Weight = isSARObservation ? 2.4 : 1.6;

      const p1Sheen = L.polygon(outerCoords1, {
        color: p1SheenColor,
        weight: p1Weight,
        dashArray: p1DashArray,
        fillColor: p1FillColor,
        fillOpacity: isHistoricalSim ? 0.22 : (isSARObservation ? 0.30 : 0.18),
      }).addTo(group);

      const p1Core = L.polygon(coreCoords1, {
        color: p1SheenColor,
        weight: p1Weight,
        fillColor: p1CoreFill,
        fillOpacity: isHistoricalSim ? 0.68 : (isSARObservation ? 0.78 : 0.60),
      }).addTo(group);

      const v1Name = vessels[0]?.name || 'MT Ocean Star';
      const p1Tooltip = `
        <div style="font-family: 'Inter', sans-serif; font-size: 11px; color: #F0F9FA; background: rgba(7, 12, 24, 0.96); backdrop-filter: blur(8px); padding: 8px 12px; border-radius: 8px; border: 1.5px solid ${p1SheenColor}; box-shadow: 0 8px 24px rgba(0,0,0,0.85);">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; color: ${p1SheenColor}; font-size: 11px; letter-spacing: 0.05em;">
              <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: ${p1SheenColor}; box-shadow: 0 0 8px ${p1SheenColor};"></span>
              ${isHistoricalSim ? (isHindcastSeparated ? 'SIMULATED PLUME #1 (02:47 UTC)' : 'SIMULATED OIL PLUME') : (isSARObservation ? 'OBSERVED SAR SLICK (GROUND TRUTH)' : timeStatusLabel)}
            </div>
            <span style="font-size: 9px; font-weight: 700; color: #15D8B3; background: rgba(21, 216, 179, 0.15); border: 1px solid rgba(21, 216, 179, 0.4); padding: 1px 5px; border-radius: 4px; font-family: monospace;">
              ${isHistoricalSim ? `${vessels[0]?.attributionScore || 91.7}% Suspect` : '94.7% IoU'}
            </span>
          </div>
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #FFFFFF; font-weight: 700; margin-top: 4px;">
            ${dynamicArea1} km² · Est. Vol ~${Math.round((isHindcastSeparated ? 2200 : 3840) * slickScale1)} bbl
          </div>
          <div style="display: flex; gap: 8px; color: #A3C2CF; font-size: 10px; margin-top: 3px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 3px;">
            <span>Source: ${v1Name}</span>
            <span>·</span>
            <span>Scale: ${(slickScale1 * 100).toFixed(0)}%</span>
          </div>
          <div style="color: #15D8B3; font-size: 10px; margin-top: 4px; font-weight: 600;">
            ${isHistoricalSim ? 'Origin 1 (02:47 UTC) → Advecting 55° ENE towards Observation Zone' : (isSARObservation ? 'Sentinel-1 C-SAR Acquisition · 04:32 UTC' : timeStatusSub)}
          </div>
        </div>
      `;

      p1Sheen.bindTooltip(p1Tooltip, { sticky: true, opacity: 0.98 });
      p1Core.bindTooltip(p1Tooltip, { sticky: true, opacity: 0.98 });

      const handleSlickClick = () => {
        if (onOpenSlickDetails) onOpenSlickDetails();
      };
      p1Sheen.on('click', handleSlickClick);
      p1Core.on('click', handleSlickClick);

      // Centroid Marker for Plume 1
      const slick1CenterIcon = L.divIcon({
        className: 'custom-slick-marker-1 !bg-transparent !border-0',
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <div style="position: absolute; inset: 0; border-radius: 50%; background: ${p1SheenColor}40; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; inset: 6px; border-radius: 50%; border: 1.5px solid ${p1SheenColor}; background: ${p1FillColor}; box-shadow: 0 0 10px ${p1SheenColor};"></div>
            <div style="width: 4px; height: 4px; border-radius: 50%; background: #FFFFFF;"></div>

            <!-- Clean floating badge on the right of the centroid -->
            <div style="position: absolute; left: 30px; top: 50%; transform: translateY(-50%); pointer-events: auto; cursor: pointer; z-index: 35; display: flex; align-items: center;">
              <div style="width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-right: 6px solid ${p1SheenColor};"></div>
              <div style="background: rgba(7, 15, 29, 0.95); backdrop-filter: blur(8px); border: 1.5px solid ${p1SheenColor}; border-radius: 6px; padding: 3px 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.85); display: flex; align-items: center; gap: 5px; white-space: nowrap;">
                <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: ${p1SheenColor}; box-shadow: 0 0 8px ${p1SheenColor};"></span>
                <span style="font-size: 10.5px; font-weight: 700; color: ${p1SheenColor}; font-family: 'Inter', sans-serif;">
                  ${isHistoricalSim ? (isHindcastSeparated ? 'SIMULATED PLUME #1' : 'SIMULATED PLUME') : (isSARObservation ? 'OBSERVED SAR SLICK' : timeStatusLabel.split('(')[0].trim())}
                </span>
                <span style="color: #475569; font-size: 9px;">|</span>
                <span style="font-size: 10.5px; font-weight: 700; color: #F8FAFC; font-family: 'JetBrains Mono', monospace;">
                  ${dynamicArea1} km²
                </span>
              </div>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const slick1Marker = L.marker([centerLat1, centerLng1], { icon: slick1CenterIcon, interactive: true }).addTo(group);
      slick1Marker.on('click', handleSlickClick);

      // =========================================================================
      // B. PLUME #2 (SECONDARY DISCHARGE IN VIOLET REGION - GULF VOYAGER)
      // =========================================================================
      if (hasVessel2 && isHindcastSeparated && !hiddenVesselIds.includes(v2.id)) {
        const v2Name = v2.name;
        const v2Score = v2.attributionScore || 76;
        const p2Scale = slickScale2 * 0.72;

        const outerCoords2 = outerOffsets2.map(([dLat, dLng]) => [
          centerLat2 + dLat * p2Scale,
          centerLng2 + dLng * p2Scale
        ]) as L.LatLngExpression[];

        const coreCoords2 = outerOffsets2.map(([dLat, dLng]) => [
          centerLat2 + dLat * 0.55 * p2Scale,
          centerLng2 + dLng * 0.55 * p2Scale
        ]) as L.LatLngExpression[];

        // Layer A: Outer Violet Sheen Envelope
        const p2Sheen = L.polygon(outerCoords2, {
          color: '#C084FC',
          weight: 1.6,
          dashArray: '5, 4',
          fillColor: '#8B5CF6',
          fillOpacity: 0.25,
        }).addTo(group);

        // Layer B: Concentrated Deep Purple Emulsion Core
        const p2Core = L.polygon(coreCoords2, {
          color: '#A855F7',
          weight: 1.8,
          fillColor: '#6B21A8',
          fillOpacity: 0.75,
        }).addTo(group);

        const p2Tooltip = `
          <div style="font-family: 'Inter', sans-serif; font-size: 11px; color: #F0F9FA; background: rgba(7, 12, 24, 0.96); backdrop-filter: blur(8px); padding: 8px 12px; border-radius: 8px; border: 1.5px solid #C084FC; box-shadow: 0 8px 24px rgba(0,0,0,0.85);">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; color: #C084FC; font-size: 11px; letter-spacing: 0.05em;">
                <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #C084FC; box-shadow: 0 0 8px #C084FC;"></span>
                SIMULATED PLUME #2 (02:35 UTC)
              </div>
              <span style="font-size: 9px; font-weight: 700; color: #C084FC; background: rgba(192, 132, 252, 0.15); border: 1px solid rgba(192, 132, 252, 0.4); padding: 1px 5px; border-radius: 4px; font-family: monospace;">${v2Score}% Suspect</span>
            </div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #FFFFFF; font-weight: 700; margin-top: 4px;">
              ${dynamicArea2} km² · Est. Vol ~${Math.round(1640 * slickScale2)} bbl
            </div>
            <div style="display: flex; gap: 8px; color: #D8B4FE; font-size: 10px; margin-top: 3px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 3px;">
              <span>Source: ${v2Name} (MMSI: ${v2.mmsi})</span>
              <span>·</span>
              <span>Scale: ${(slickScale2 * 100).toFixed(0)}%</span>
            </div>
            <div style="color: #A855F7; font-size: 10px; margin-top: 4px; font-weight: 600;">
              Origin 2 (02:35 UTC) → Advecting to Coalescence Zone
            </div>
          </div>
        `;

        p2Sheen.bindTooltip(p2Tooltip, { sticky: true, opacity: 0.98 });
        p2Core.bindTooltip(p2Tooltip, { sticky: true, opacity: 0.98 });

        p2Sheen.on('click', () => onSelectVessel(v2));
        p2Core.on('click', () => onSelectVessel(v2));

        // Tactical Beacon for Plume 2 in Violet Region
        const slick2CenterIcon = L.divIcon({
          className: 'custom-slick-marker-2 !bg-transparent !border-0',
          html: `
            <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
              <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(192, 132, 252, 0.25); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: absolute; inset: 6px; border-radius: 50%; border: 1.5px solid #C084FC; background: rgba(147, 51, 234, 0.65); box-shadow: 0 0 10px rgba(192, 132, 252, 0.8);"></div>
              <div style="width: 4px; height: 4px; border-radius: 50%; background: #FFFFFF;"></div>

              <!-- Clean floating badge on the left of Plume 2 -->
              <div style="position: absolute; right: 30px; top: 50%; transform: translateY(-50%); pointer-events: auto; cursor: pointer; z-index: 35; display: flex; align-items: center;">
                <div style="background: rgba(7, 15, 29, 0.95); backdrop-filter: blur(8px); border: 1.5px solid #C084FC; border-radius: 6px; padding: 3px 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.85); display: flex; align-items: center; gap: 5px; white-space: nowrap;">
                  <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #C084FC; box-shadow: 0 0 8px #C084FC;"></span>
                  <span style="font-size: 10.5px; font-weight: 700; color: #C084FC; font-family: 'Inter', sans-serif;">SIMULATED PLUME #2</span>
                  <span style="color: #475569; font-size: 9px;">|</span>
                  <span style="font-size: 10.5px; font-weight: 700; color: #F8FAFC; font-family: 'JetBrains Mono', monospace;">${dynamicArea2} km²</span>
                </div>
                <div style="width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-left: 6px solid #C084FC;"></div>
              </div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const slick2Marker = L.marker([centerLat2, centerLng2], { icon: slick2CenterIcon, interactive: true }).addTo(group);
        slick2Marker.on('click', () => onSelectVessel(v2));

        // Coalescence Convergence Corridor Vector between Plume 1 and Plume 2
        L.polyline([[centerLat1, centerLng1], [centerLat2, centerLng2]], {
          color: '#E879F9',
          weight: 1.5,
          dashArray: '3, 4',
          opacity: 0.65,
        }).addTo(group);
      }
    }

    // -------------------------------------------------------------
    // 2. PROBABLE ORIGINS & HINDCAST DRIFT PATHS (GEOMETRY C)
    // -------------------------------------------------------------
    if (layerState.hindcastTrajectory) {
      // 1. Primary Hindcast Drift Path (Blue #3B82F6) for Plume 1 / Suspect 1
      const trajectoryLine1 = L.polyline(hindcast.trajectoryWaypoints, {
        color: '#3B82F6',
        weight: 2.4,
        dashArray: '6, 4',
        opacity: 0.95,
      }).addTo(group);

      trajectoryLine1.bindTooltip(`
        <div style="font-family: 'Inter', sans-serif; font-size: 11px; color: #FFFFE3; background: rgba(7, 15, 29, 0.95); backdrop-filter: blur(8px); padding: 5px 9px; border: 1.5px solid #3B82F6; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.6);">
          <strong style="color: #60A5FA; font-family: monospace;">HINDCAST — PROBABLE SOURCE PATH (Analytical Reverse Reconstruction)</strong><br/>
          Reverse Lagrangian Advection (${vessels[0]?.name || 'Target Vessel 1'}) · ${hindcast.confidencePercent}% Conf
        </div>
      `, { sticky: true });

      // 2. Secondary Hindcast Drift Path (Violet #C084FC) for Plume 2 / Suspect 2
      if (hasVessel2 && !hiddenVesselIds.includes(v2.id)) {
        const hindcast2Waypoints: [number, number][] = [
          [origin2Coords[0], origin2Coords[1]],
          [
            origin2Coords[0] + (baseLat - origin2Coords[0]) * 0.48 + 0.005,
            origin2Coords[1] + (baseLng - origin2Coords[1]) * 0.48 - 0.004
          ],
          [baseLat, baseLng]
        ];

        const trajectoryLine2 = L.polyline(hindcast2Waypoints, {
          color: '#C084FC',
          weight: 2.2,
          dashArray: '6, 4',
          opacity: 0.95,
        }).addTo(group);

        trajectoryLine2.bindTooltip(`
          <div style="font-family: 'Inter', sans-serif; font-size: 11px; color: #FFFFE3; background: rgba(7, 15, 29, 0.95); backdrop-filter: blur(8px); padding: 5px 9px; border: 1.5px solid #C084FC; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.6);">
            <strong style="color: #C084FC; font-family: monospace;">HINDCAST — PROBABLE SOURCE PATH #2</strong><br/>
            Reverse Lagrangian Advection (${v2.name}) · ${v2.attributionScore || 76}% Conf
          </div>
        `, { sticky: true });
      }
    }

    // -------------------------------------------------------------
    // 2.5. VIRTUAL LAGRANGIAN PARTICLE DISPERSION & BACKTRACKING ENGINE
    // -------------------------------------------------------------
    if (layerState.hindcastTrajectory || layerState.oilSlicks || layerState.forecastCone) {
      const isHindcastSeparated = isDualSpillScenario && currentTimeSimulationMinutes < 0;

      if (!isSpillInitiated) {
        // Pre-spill ambient hydrodynamic tracers (60 particles tracking 058° ENE coastal current)
        const numPre = 60;
        for (let k = 0; k < numPre; k++) {
          const pFrac = k / numPre;
          const angle = (k * 137.5 * Math.PI) / 180;
          const rDist = Math.sqrt(pFrac) * 0.045;
          const pLat = Number((origin1Coords[0] + rDist * Math.sin(angle)).toFixed(5));
          const pLng = Number((origin1Coords[1] + rDist * Math.cos(angle)).toFixed(5));

          L.circleMarker([pLat, pLng], {
            pane: 'lagrangianParticlesPane',
            radius: 2.6,
            color: '#38BDF8',
            weight: 0.9,
            fillColor: '#0284C7',
            fillOpacity: 0.55,
          }).bindTooltip(`
            <div style="font-family: 'Inter', sans-serif; font-size: 10px; color: #F0F9FA; background: rgba(7, 12, 24, 0.96); padding: 4px 8px; border-radius: 6px; border: 1px solid #38BDF8;">
              <strong style="color: #38BDF8;">Lagrangian Tracer #${k + 1}</strong><br/>
              Ambient Hydrodynamic Baseline · Current: 0.81 kn (058° ENE)
            </div>
          `, { sticky: true }).addTo(group);
        }
      } else {
        // Active Lagrangian Ensemble 1: Plume 1 / Unified Forward Swarm (150 Particles)
        const numParticles1 = 150;
        const spiralArms1 = 4.2;
        const timeOffset = currentTimeSimulationMinutes < 0
          ? ((currentTimeSimulationMinutes + 300) / 300) * 135
          : 135 + (currentTimeSimulationMinutes / 2880) * 220;

        for (let k = 0; k < numParticles1; k++) {
          const pFrac = k / numParticles1;
          const armAngle = (k * (360 * spiralArms1 / numParticles1) + timeOffset) * (Math.PI / 180);
          
          // Turbulent eddy diffusion & longitudinal elongation
          const rBase = Math.sqrt(pFrac) * 0.034;
          const rScale = isHindcastSeparated ? slickScale1 * 0.82 : slickScale1;
          const rDist = rBase * rScale;
          const latOffset = rDist * Math.sin(armAngle) * (currentTimeSimulationMinutes > 0 ? 0.95 : 0.85);
          const lngOffset = rDist * Math.cos(armAngle) * (currentTimeSimulationMinutes > 0 ? 1.45 : 1.15);
          const pLat = Number((centerLat1 + latOffset).toFixed(5));
          const pLng = Number((centerLng1 + lngOffset).toFixed(5));

          const isCore = k < 35;
          const isMid = k >= 35 && k < 90;
          
          let pColor = '#10B981';
          if (currentTimeSimulationMinutes < 0) {
            pColor = isCore ? '#F59E0B' : (isMid ? '#EA580C' : '#00F0FF');
          } else if (currentTimeSimulationMinutes === 0) {
            pColor = isCore ? '#EF4444' : (isMid ? '#DC2626' : '#00F0FF');
          } else {
            pColor = isCore ? '#10B981' : (isMid ? '#34D399' : '#00E5FF');
          }

          const pRadius = isCore ? 4.8 : (isMid ? 3.8 : 2.8);
          const pOpacity = isCore ? 0.98 : (isMid ? 0.90 : 0.78);

          L.circleMarker([pLat, pLng], {
            pane: 'lagrangianParticlesPane',
            radius: pRadius,
            color: '#FFFFFF',
            weight: isCore ? 1.5 : (isMid ? 1.2 : 1.0),
            fillColor: pColor,
            fillOpacity: pOpacity,
          }).bindTooltip(`
            <div style="font-family: 'Inter', sans-serif; font-size: 10px; color: #F0F9FA; background: rgba(7, 12, 24, 0.96); padding: 4px 8px; border-radius: 6px; border: 1.5px solid ${pColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.8);">
              <strong style="color: ${pColor}; font-family: monospace;">Lagrangian Parcel #${k + 1}</strong><br/>
              Velocity: 0.81 kn (058° ENE) · ${currentTimeSimulationMinutes < 0 ? 'Reverse Backtracking' : (currentTimeSimulationMinutes === 0 ? 'Ground Truth Slick' : 'Forward Coastal Advection')}<br/>
              Coordinates: ${pLat}°N, ${pLng}°E
            </div>
          `, { sticky: true }).addTo(group);
        }

        // Ensemble 2: Plume 2 Particles in Violet Sector (90 particles for Gulf Voyager)
        if (hasVessel2 && isHindcastSeparated) {
          const numParticles2 = 90;
          const spiralArms2 = 3.8;
          const timeRotation2 = ((currentTimeSimulationMinutes + 300) / 300) * 110 + 45;

          for (let k = 0; k < numParticles2; k++) {
            const pFrac = k / numParticles2;
            const armAngle = (k * (360 * spiralArms2 / numParticles2) + timeRotation2) * (Math.PI / 180);
            const rDist = Math.sqrt(pFrac) * 0.030 * slickScale2 * 0.78;
            const latOffset = rDist * Math.sin(armAngle) * 0.9;
            const lngOffset = rDist * Math.cos(armAngle) * 1.1;
            const pLat = Number((centerLat2 + latOffset).toFixed(5));
            const pLng = Number((centerLng2 + lngOffset).toFixed(5));

            const isCore = k < 25;
            const isMid = k >= 25 && k < 60;
            const pColor = isCore ? '#C084FC' : (isMid ? '#E879F9' : '#8B5CF6');
            const pRadius = isCore ? 4.5 : (isMid ? 3.5 : 2.6);
            const pOpacity = isCore ? 0.98 : (isMid ? 0.90 : 0.78);

            L.circleMarker([pLat, pLng], {
              pane: 'lagrangianParticlesPane',
              radius: pRadius,
              color: '#FFFFFF',
              weight: isCore ? 1.5 : (isMid ? 1.2 : 1.0),
              fillColor: pColor,
              fillOpacity: pOpacity,
            }).bindTooltip(`
              <div style="font-family: 'Inter', sans-serif; font-size: 10px; color: #F0F9FA; background: rgba(7, 12, 24, 0.96); padding: 4px 8px; border-radius: 6px; border: 1.5px solid ${pColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.8);">
                <strong style="color: ${pColor}; font-family: monospace;">Plume #2 Parcel #${k + 1}</strong><br/>
                Source: Gulf Voyager · Coalescence Corridor
              </div>
            `, { sticky: true }).addTo(group);
          }
        }
      }
    }

    if (layerState.originProbability) {
      // 1. Probable Origin #1 (MT Ocean Star - Suspect #1)
      const isReleaseMoment = currentTimeSimulationMinutes === -300;
      const isPreSpill = currentTimeSimulationMinutes < -300;

      L.circle(origin1Coords, {
        radius: (hindcast.uncertaintyRadiusKm || 3.5) * 1000,
        color: isReleaseMoment ? '#EF4444' : (isPreSpill ? '#64748B' : '#F59E0B'),
        weight: isReleaseMoment ? 2.2 : 1.2,
        dashArray: isReleaseMoment ? 'none' : '4, 4',
        fillColor: isReleaseMoment ? '#EF4444' : '#F59E0B',
        fillOpacity: isReleaseMoment ? 0.22 : 0.08,
      }).addTo(group);

      const originIcon1 = L.divIcon({
        className: 'origin-marker !bg-transparent !border-0',
        html: `
          <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
            ${isReleaseMoment ? `
              <div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(239, 68, 68, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: absolute; inset: 2px; border: 2px solid #EF4444; border-radius: 50%; background: rgba(239, 68, 68, 0.35); box-shadow: 0 0 16px #EF4444;"></div>
              <div style="width: 7px; height: 7px; background: #FFFFFF; border-radius: 50%; box-shadow: 0 0 10px #EF4444;"></div>
            ` : `
              <div style="position: absolute; inset: 0; border: 1.5px dashed ${isPreSpill ? '#64748B' : '#F59E0B'}; border-radius: 50%;"></div>
              <div style="position: absolute; inset: 6px; border: 1.5px solid ${isPreSpill ? '#64748B' : '#F59E0B'}; border-radius: 50%; background: ${isPreSpill ? 'rgba(100, 116, 139, 0.2)' : 'rgba(245, 158, 11, 0.2)'};"></div>
              <div style="width: 5px; height: 5px; background: ${isPreSpill ? '#94A3B8' : '#F59E0B'}; border-radius: 50%; box-shadow: 0 0 8px ${isPreSpill ? '#94A3B8' : '#F59E0B'};"></div>
            `}

            <!-- Floating Clean Badge (Anchored above-left of Origin 1 to prevent collisions) -->
            <div style="position: absolute; right: 28px; bottom: 14px; pointer-events: none; z-index: 35; display: flex; align-items: center;">
              <div style="background: rgba(7, 15, 29, 0.96); backdrop-filter: blur(8px); border: 1.5px solid ${isReleaseMoment ? '#EF4444' : (isPreSpill ? '#475569' : '#F59E0B')}; border-radius: 6px; padding: 3px 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.85); display: flex; align-items: center; gap: 5px; white-space: nowrap;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${isReleaseMoment ? '#EF4444' : (isPreSpill ? '#94A3B8' : '#F59E0B')}; box-shadow: 0 0 8px ${isReleaseMoment ? '#EF4444' : '#F59E0B'};"></span>
                <span style="font-size: 10.5px; font-weight: 800; color: ${isReleaseMoment ? '#EF4444' : (isPreSpill ? '#94A3B8' : '#F59E0B')}; font-family: 'Inter', sans-serif;">
                  ${isReleaseMoment ? '● RELEASE EVENT · 02:47 UTC' : (isPreSpill ? 'Probable Origin #1 [NO OIL YET]' : 'Probable Origin #1')}
                </span>
                <span style="color: #475569; font-size: 9px;">|</span>
                <span style="font-size: 10.5px; font-weight: 600; color: #F8FAFC; font-family: 'JetBrains Mono', monospace;">
                  ${isReleaseMoment ? `${vessels[0]?.name || 'Target Vessel 1'} (Discharge Overboard)` : (isPreSpill ? '02:47 UTC · Clean Sea' : `02:47 UTC · ${vessels[0]?.name || 'Target Vessel 1'}`)}
                </span>
              </div>
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      L.marker(origin1Coords, { icon: originIcon1 }).addTo(group);

      // 2. Probable Origin #2 (Gulf Voyager - Suspect #2 in Dual Mode)
      if (hasVessel2 && !hiddenVesselIds.includes(v2.id)) {
        L.circle(origin2Coords, {
          radius: 3500,
          color: isReleaseMoment ? '#C084FC' : (isPreSpill ? '#64748B' : '#C084FC'),
          weight: isReleaseMoment ? 2.2 : 1.2,
          dashArray: isReleaseMoment ? 'none' : '4, 4',
          fillColor: '#8B5CF6',
          fillOpacity: isReleaseMoment ? 0.22 : 0.08,
        }).addTo(group);

        const originIcon2 = L.divIcon({
          className: 'origin-marker-2 !bg-transparent !border-0',
          html: `
            <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
              ${isReleaseMoment ? `
                <div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(192, 132, 252, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: absolute; inset: 2px; border: 2px solid #C084FC; border-radius: 50%; background: rgba(192, 132, 252, 0.35); box-shadow: 0 0 16px #C084FC;"></div>
                <div style="width: 7px; height: 7px; background: #FFFFFF; border-radius: 50%; box-shadow: 0 0 10px #C084FC;"></div>
              ` : `
                <div style="position: absolute; inset: 0; border: 1.5px dashed ${isPreSpill ? '#64748B' : '#C084FC'}; border-radius: 50%;"></div>
                <div style="position: absolute; inset: 6px; border: 1.5px solid ${isPreSpill ? '#64748B' : '#C084FC'}; border-radius: 50%; background: ${isPreSpill ? 'rgba(100, 116, 139, 0.2)' : 'rgba(192, 132, 252, 0.2)'};"></div>
                <div style="width: 5px; height: 5px; background: ${isPreSpill ? '#94A3B8' : '#C084FC'}; border-radius: 50%; box-shadow: 0 0 8px ${isPreSpill ? '#94A3B8' : '#C084FC'};"></div>
              `}

              <!-- Floating Clean Badge (Anchored below-right of Origin 2 to prevent collisions) -->
              <div style="position: absolute; left: 28px; top: 14px; pointer-events: none; z-index: 35; display: flex; align-items: center;">
                <div style="background: rgba(7, 15, 29, 0.96); backdrop-filter: blur(8px); border: 1.5px solid ${isReleaseMoment ? '#C084FC' : (isPreSpill ? '#475569' : '#C084FC')}; border-radius: 6px; padding: 3px 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.85); display: flex; align-items: center; gap: 5px; white-space: nowrap;">
                  <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${isReleaseMoment ? '#C084FC' : (isPreSpill ? '#94A3B8' : '#C084FC')}; box-shadow: 0 0 8px #C084FC;"></span>
                  <span style="font-size: 10.5px; font-weight: 800; color: ${isReleaseMoment ? '#C084FC' : (isPreSpill ? '#94A3B8' : '#C084FC')}; font-family: 'Inter', sans-serif;">
                    ${isReleaseMoment ? '● RELEASE EVENT · 02:35 UTC' : (isPreSpill ? 'Probable Origin #2 [NO OIL YET]' : 'Probable Origin #2')}
                  </span>
                  <span style="color: #475569; font-size: 9px;">|</span>
                  <span style="font-size: 10.5px; font-weight: 600; color: #F8FAFC; font-family: 'JetBrains Mono', monospace;">
                    ${isReleaseMoment ? `${vessels[1]?.name || 'Target Vessel 2'} (Discharge Overboard)` : (isPreSpill ? '02:35 UTC · Clean Sea' : `02:35 UTC · ${vessels[1]?.name || 'Target Vessel 2'}`)}
                  </span>
                </div>
              </div>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        L.marker(origin2Coords, { icon: originIcon2 }).addTo(group);
      }
    }

    // -------------------------------------------------------------
    // 3. FORECAST CORRIDOR (Clean, elegant milestone badges)
    // -------------------------------------------------------------
    if (layerState.forecastCone) {
      const currentStep = forecastSteps[activeForecastStep] || forecastSteps[0];
      
      if (currentStep && currentStep.polygonCoordinates && currentStep.polygonCoordinates.length > 0) {
        L.polygon(currentStep.polygonCoordinates as L.LatLngExpression[], {
          color: '#10B981',
          weight: 1.6,
          dashArray: '5, 4',
          fillColor: '#10B981',
          fillOpacity: 0.14,
        }).addTo(group);
      }

      const forecastSpine = forecastSteps.map(s => s.centerCoordinates as [number, number]);
      L.polyline(forecastSpine, {
        color: '#10B981',
        weight: 2.0,
        dashArray: '5, 4',
        opacity: 0.9,
      }).addTo(group);

      // Clean Milestone Badges (only +6h, +12h, +24h, and +48h to avoid clutter)
      forecastSteps.forEach((step, idx) => {
        const isMilestone = step.stepHours === 6 || step.stepHours === 12 || step.stepHours === 24 || step.stepHours === 48;
        if (!isMilestone && idx !== forecastSteps.length - 1) return;
        const milestoneIcon = L.divIcon({
          className: 'forecast-milestone-marker !bg-transparent !border-0',
          html: `
            <div style="background: rgba(7, 15, 29, 0.95); backdrop-filter: blur(8px); border: 1.2px solid #10B981; border-radius: 5px; padding: 2px 6px; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; font-weight: 800; color: #10B981; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.7); white-space: nowrap;">
              <span style="display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: #10B981;"></span>
              <span>${step.label}</span>
            </div>
          `,
          iconSize: [44, 18],
          iconAnchor: [22, 9],
        });
        L.marker(step.centerCoordinates as [number, number], { icon: milestoneIcon }).addTo(group);
      });
    }

    // -------------------------------------------------------------
    // 4. SHORELINE RISK ZONE
    // -------------------------------------------------------------
    if (layerState.shorelineRisk) {
      L.circle(shorelineRisk.coordinates, {
        radius: 8000,
        color: '#F59E0B',
        weight: 1.6,
        dashArray: '5, 4',
        fillColor: '#F59E0B',
        fillOpacity: 0.14,
      }).addTo(group);

      const shorelineIcon = L.divIcon({
        className: 'shoreline-risk-marker !bg-transparent !border-0',
        html: `
          <div style="background: rgba(7, 15, 29, 0.95); backdrop-filter: blur(8px); border: 1.5px solid #F59E0B; border-radius: 6px; padding: 4px 9px; font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: #F59E0B; display: flex; align-items: center; gap: 5px; box-shadow: 0 6px 20px rgba(0,0,0,0.85); white-space: nowrap;">
            <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #F59E0B; box-shadow: 0 0 6px #F59E0B;"></span>
            <span>Shoreline Risk</span>
            <span style="color: #475569; font-size: 9px;">|</span>
            <span style="color: #F8FAFC; font-family: 'JetBrains Mono', monospace;">ETA ~${shorelineRisk.projectedEtaHours}h</span>
          </div>
        `,
        iconSize: [160, 22],
        iconAnchor: [80, 11],
      });
      L.marker(shorelineRisk.coordinates, { icon: shorelineIcon }).addTo(group);
    }

    // -------------------------------------------------------------
    // 5. AIS VESSELS & CLEAN NON-OVERLAPPING TRAJECTORIES
    // -------------------------------------------------------------
    if (layerState.aisVessels) {
      vessels.forEach((vessel, vIndex) => {
        if (hiddenVesselIds.includes(vessel.id)) return;
        const isSelected = selectedVessel?.id === vessel.id;
        const isSuspect1 = vessel.rank === 1 || vIndex === 0;
        const isSuspect2 = isDualSpillScenario && (vessel.rank === 2 || vIndex === 1) && !isSuspect1;
        const isRelevant = vessel.attributionScore >= 70;
        const isDimmed = selectedVessel !== null && !isSelected && !isSuspect1 && !isSuspect2;

        // Draw Ship Navigation Path with Directional Chevrons
        if ((layerState.vesselTracks || isSelected || isSuspect1 || isSuspect2) && vessel.track && vessel.track.length > 1) {
          const trackCoords: [number, number][] = vessel.track.map(t => [t.lat, t.lng]);
          
          const baseTrackColor = isSuspect1 ? '#00E5FF' : (isSuspect2 ? '#C084FC' : '#8B5CF6');
          const trackColor = isSelected ? (isSuspect2 ? '#E879F9' : '#00E5FF') : baseTrackColor;
          const trackWeight = isSelected ? 3.0 : (isSuspect1 || isSuspect2 ? 2.4 : 1.3);
          const trackOpacity = isDimmed ? 0.35 : 0.95;

          // Main crisp navigation polyline
          const shipPolyline = L.polyline(trackCoords, {
            color: trackColor,
            weight: trackWeight,
            dashArray: isSelected ? 'none' : '7, 4',
            opacity: trackOpacity,
          }).addTo(group);

          const trackTooltip = `
            <div style="font-family: 'Inter', sans-serif; font-size: 11px; background: rgba(7, 15, 29, 0.96); backdrop-filter: blur(8px); padding: 6px 10px; border: 1.5px solid ${trackColor}; border-radius: 6px; color: #F0F9FA; box-shadow: 0 4px 16px rgba(0,0,0,0.85);">
              <strong style="color: ${trackColor}; font-family: monospace;">${isSuspect1 ? 'PRIMARY SUSPECT TRAJECTORY' : (isSuspect2 ? 'SECONDARY SUSPECT TRAJECTORY' : 'VESSEL TRACK')}</strong><br/>
              ${vessel.name} (${vessel.type})<br/>
              Heading: ${vessel.currentHeadingDeg || 0}° · Speed: ${vessel.currentSpeedKt} kn · Attribution: ${vessel.attributionScore}%
            </div>
          `;
          shipPolyline.bindTooltip(trackTooltip, { sticky: true });
          shipPolyline.on('click', () => onSelectVessel(vessel));

          // Directional Chevrons
          for (let i = 0; i < trackCoords.length - 1; i++) {
            const p1 = trackCoords[i];
            const p2 = trackCoords[i + 1];
            const mid: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
            const dLat = p2[0] - p1[0];
            const dLng = p2[1] - p1[1];
            const screenAngle = Math.atan2(-dLat, dLng * Math.cos((p1[0] * Math.PI) / 180)) * 180 / Math.PI;

            const chevronIcon = L.divIcon({
              className: 'vessel-track-chevron !bg-transparent !border-0',
              html: `
                <div style="width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; transform: rotate(${screenAngle}deg); transform-origin: 50% 50%; color: ${trackColor}; font-size: 14px; font-weight: 900; opacity: ${trackOpacity}; line-height: 1; text-shadow: 0 0 6px ${trackColor}; pointer-events: none;">
                  ›
                </div>
              `,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            });
            L.marker(mid, { icon: chevronIcon, interactive: false }).addTo(group);
          }

          // Dedicated Trajectory Label at track origin
          if (isSuspect1 || isSuspect2) {
            const labelPos = trackCoords[0];
            const badgeColor = isSuspect1 ? '#00E5FF' : '#C084FC';
            const badgeRank = vessel.rank || (isSuspect1 ? 1 : 2);
            const badgeIcon = L.divIcon({
              className: `vessel-route-label-${badgeRank} !bg-transparent !border-0`,
              html: `
                <div style="background: rgba(7, 15, 29, 0.92); backdrop-filter: blur(6px); border: 1.2px solid ${badgeColor}; border-radius: 4px; padding: 2px 7px; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; font-weight: 800; color: ${badgeColor}; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.8); white-space: nowrap; pointer-events: none;">
                  <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: ${badgeColor};"></span>
                  <span>TRAJECTORY #${badgeRank} · ${vessel.name?.toUpperCase()}</span>
                </div>
              `,
              iconSize: [220, 20],
              iconAnchor: [110, 10],
            });
            L.marker(labelPos, { icon: badgeIcon, interactive: false }).addTo(group);
          }
        }

        // Time-interpolated vessel position
        const { pos: currentPos, heading } = getVesselPositionAtTime(vessel, currentTimeSimulationMinutes);
        const shipFillColor = isSuspect1 ? '#EF4444' : (isSuspect2 ? '#C084FC' : (isRelevant ? '#00E5FF' : '#94A3B8'));

        const vesselIcon = L.divIcon({
          className: 'vessel-marker-icon !bg-transparent !border-0',
          html: `
            <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; opacity: ${isDimmed ? 0.3 : 1.0};">
              ${isSelected ? `
                <div style="position: absolute; inset: 0; border: 1.5px solid #00E5FF; border-radius: 50%; box-shadow: 0 0 14px rgba(0, 229, 255, 0.8); pointer-events: none;"></div>
              ` : ''}
              
              ${isSuspect1 ? `
                <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(239, 68, 68, 0.25); animation: ping 2.5s cubic-bezier(0,0,0.2,1) infinite; pointer-events: none;"></div>
                <div style="position: absolute; inset: 3px; border: 1.5px solid #EF4444; border-radius: 50%; background: rgba(239, 68, 68, 0.2); pointer-events: none;"></div>
              ` : ''}

              ${isSuspect2 ? `
                <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(192, 132, 252, 0.25); animation: ping 3s cubic-bezier(0,0,0.2,1) infinite; pointer-events: none;"></div>
                <div style="position: absolute; inset: 3px; border: 1.5px solid #C084FC; border-radius: 50%; background: rgba(192, 132, 252, 0.2); pointer-events: none;"></div>
              ` : ''}

              <!-- Ship Directional Vector -->
              <div style="width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; transform: rotate(${heading}deg); transform-origin: 50% 50%; pointer-events: none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="${shipFillColor}" stroke="#070F1D" stroke-width="1.5" style="display: block;">
                  <polygon points="12 2 19 21 12 17 5 21 12 2" />
                </svg>
              </div>

              <!-- Compact Ship Label Tag (Attached neatly above ship) -->
              ${(isSuspect1 || isSuspect2) ? `
                <div style="position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); pointer-events: none; z-index: 40; white-space: nowrap;">
                  <div style="background: rgba(7, 15, 29, 0.95); backdrop-filter: blur(8px); border: 1.2px solid ${isSuspect1 ? '#EF4444' : '#C084FC'}; border-radius: 4px; padding: 1px 6px; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 800; color: ${isSuspect1 ? '#EF4444' : '#C084FC'};">
                    ${isSuspect1 ? `#1 · ${vessels[0]?.name?.toUpperCase() || 'SUSPECT #1'}` : `#2 · ${vessels[1]?.name?.toUpperCase() || 'SUSPECT #2'}`}
                  </div>
                </div>
              ` : ''}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker(currentPos, { icon: vesselIcon }).addTo(group);
        marker.on('click', () => onSelectVessel(vessel));

        const tooltipBorderColor = isSelected ? '#00E5FF' : (isSuspect1 ? '#EF4444' : (isSuspect2 ? '#C084FC' : '#162D4A'));
        const titleColor = isSuspect1 ? '#EF4444' : (isSuspect2 ? '#C084FC' : '#F8FAFC');
        const scoreColor = isSuspect1 ? '#EF4444' : (isSuspect2 ? '#C084FC' : '#10B981');

        marker.bindTooltip(`
          <div style="font-family: 'Inter', sans-serif; font-size: 11px; background: rgba(7, 15, 29, 0.96); backdrop-filter: blur(8px); color: #F8FAFC; padding: 7px 11px; border: 1.5px solid ${tooltipBorderColor}; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.75);">
            <div style="font-weight: 800; color: ${titleColor}; font-size: 12px;">${vessel.name}</div>
            <div style="color: #94A3B8; font-size: 10px; margin-top: 1px;">MMSI: ${vessel.mmsi} · ${vessel.type} · ${vessel.flag}</div>
            <div style="font-family: 'JetBrains Mono', monospace; color: #00E5FF; font-size: 11px; margin-top: 3px;">
              ${vessel.currentSpeedKt} kn · Heading: ${heading}°
            </div>
            <div style="color: ${scoreColor}; font-weight: 700; margin-top: 4px; font-size: 11px; font-family: 'JetBrains Mono', monospace;">
              Forensic Attribution Score: ${vessel.attributionScore}%
            </div>
          </div>
        `, { sticky: true });
      });
    }

    // -------------------------------------------------------------
    // 6. METOCEAN WIND & DRIFT VECTOR OVERLAY (Dynamic from live MetOcean telemetry)
    // -------------------------------------------------------------
    if (metocean && metocean.windDirectionDeg !== undefined && incident.coordinates) {
      const windAngle = metocean.windDirectionDeg;
      const windSpeedKt = metocean.windSpeedKt || 12;
      const cPos = incident.coordinates;
      // Single clean live meteorological vector badge near slick
      const windBadge = L.divIcon({
        className: 'live-metocean-vector !bg-transparent !border-0',
        html: `
          <div style="background: rgba(7, 15, 29, 0.88); backdrop-filter: blur(6px); border: 1px solid rgba(0, 229, 255, 0.4); border-radius: 4px; padding: 2px 6px; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #00E5FF; display: flex; align-items: center; gap: 4px; pointer-events: none; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.6);">
            <span style="transform: rotate(${windAngle}deg); display: inline-block; font-size: 11px;">➔</span>
            <span>WIND ${windSpeedKt} kn · ${metocean.windDirectionCard || ''} (${windAngle}°)</span>
          </div>
        `,
        iconSize: [160, 18],
        iconAnchor: [80, 9]
      });
      L.marker([cPos[0] + 0.08, cPos[1] - 0.08], { icon: windBadge, interactive: false }).addTo(group);
    }

  }, [
    incident,
    vessels,
    selectedVessel,
    hindcast,
    forecastSteps,
    activeForecastStep,
    shorelineRisk,
    metocean,
    currentTimeSimulationMinutes,
    layerState,
    onSelectVessel,
    onOpenSlickDetails,
    isDualSpillScenario,
    hiddenVesselIds
  ]);

  // Center map smoothly on incident changes
  useEffect(() => {
    if (mapInstanceRef.current && incident?.coordinates) {
      mapInstanceRef.current.flyTo(incident.coordinates, 10, { duration: 1.2 });
    }
  }, [incident?.id, incident?.coordinates?.[0], incident?.coordinates?.[1]]);

  const handleResetView = () => {
    if (mapInstanceRef.current && incident?.coordinates) {
      mapInstanceRef.current.flyTo(incident.coordinates, 10, { duration: 1.0 });
    }
  };

  const handleFocusSlick = () => {
    if (mapInstanceRef.current && incident?.coordinates) {
      mapInstanceRef.current.flyTo(incident.coordinates, 12, { duration: 1.0 });
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  return (
    <div className="relative w-full h-full bg-[#050B14] overflow-hidden flex flex-col">
      {/* Pristine Nautical Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top-Right Tactical Controls: Layers Button & Compass Rose */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setLayersMenuOpen(!layersMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#070F1D]/95 hover:bg-[#0E1B2C] text-cyan-300 border border-[#162D4A] shadow-xl backdrop-blur-md transition-colors cursor-pointer text-xs font-semibold"
            title="Toggle Geospatial Layers"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Layers</span>
            <ChevronDown className="w-3 h-3 text-cyan-400" />
          </button>

          {/* Floating Layers Dropdown */}
          {layersMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-[#070F1D] border border-[#162D4A] rounded-xl shadow-2xl p-2 z-50 text-xs font-sans space-y-1 animate-in fade-in backdrop-blur-md">
              <div className="px-2 py-1 text-[9px] uppercase font-bold tracking-widest text-slate-400 border-b border-[#162D4A] mb-1">
                Geospatial Layers
              </div>
              {[
                { key: 'oilSlicks', label: 'Oil Slick (SAR)', color: 'text-[#EF4444]' },
                { key: 'aisVessels', label: 'AIS Vessels', color: 'text-[#00E5FF]' },
                { key: 'vesselTracks', label: 'AIS Navigation Paths', color: 'text-[#8B5CF6]' },
                { key: 'hindcastTrajectory', label: 'Spill Hindcast (Past)', color: 'text-[#3B82F6]' },
                { key: 'originProbability', label: 'Probable Origin (Target)', color: 'text-[#F59E0B]' },
                { key: 'forecastCone', label: 'Drift Forecast (Future)', color: 'text-[#10B981]' },
                { key: 'shorelineRisk', label: 'Shoreline Risk Zone', color: 'text-[#F59E0B]' },
              ].map(layer => {
                const isEnabled = layerState[layer.key as keyof MapLayerState];
                return (
                  <button
                    key={layer.key}
                    onClick={() => onToggleLayer(layer.key as keyof MapLayerState)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#0E1B2C] text-left transition-colors cursor-pointer"
                  >
                    <span className={isEnabled ? `${layer.color} font-semibold` : 'text-slate-500'}>
                      {layer.label}
                    </span>
                    {isEnabled ? (
                      <span className="w-2 h-2 rounded-full bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-700" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Circular Compass Rose Widget */}
        <div
          className="w-8 h-8 rounded-full bg-[#070F1D]/95 border border-[#162D4A] flex flex-col items-center justify-center shadow-lg relative select-none"
          title="Tactical Compass (True North)"
        >
          <span className="text-[7.5px] font-mono font-bold text-cyan-400 absolute top-0.5">N</span>
          <div className="w-0.5 h-3.5 bg-gradient-to-t from-transparent via-cyan-400 to-white rounded-full" />
        </div>
      </div>

      {/* Right Edge Standalone Vertical Tactical Zoom Pill */}
      <div className="absolute right-3 top-56 z-20 flex flex-col items-center bg-[#070F1D]/95 backdrop-blur-md border border-[#162D4A] rounded-xl p-1 shadow-2xl space-y-1">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#0E1B2C] transition-colors cursor-pointer"
          title="Zoom In (+)"
        >
          <Plus className="w-4 h-4 text-slate-300 hover:text-white" />
        </button>

        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#0E1B2C] transition-colors cursor-pointer"
          title="Zoom Out (−)"
        >
          <Minus className="w-4 h-4 text-slate-300 hover:text-white" />
        </button>

        <div className="w-4 h-px bg-[#162D4A]" />

        <button
          onClick={handleFocusSlick}
          className="p-1.5 rounded-lg text-slate-300 hover:text-[#00E5FF] hover:bg-[#0E1B2C] transition-colors cursor-pointer"
          title="Center on Detected Oil Slick"
        >
          <Crosshair className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          onClick={handleResetView}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#0E1B2C] transition-colors cursor-pointer"
          title="Fit Ocean Extent / Fullscreen"
        >
          <Maximize2 className="w-4 h-4 text-slate-300 hover:text-white" />
        </button>
      </div>

      {/* Floating Fleet Visibility & Ship Filter Bar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-[#070F1D]/95 backdrop-blur-md border border-[#162D4A] rounded-xl px-2 sm:px-2.5 py-1.5 shadow-2xl max-w-[calc(100%-80px)] sm:max-w-[calc(100%-140px)] overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1.5 pr-2 border-r border-[#162D4A] shrink-0">
          <Ship className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
            Ships ({vessels.filter(v => !hiddenVesselIds.includes(v.id)).length}/{vessels.length})
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {vessels.map((v, idx) => {
            const isHidden = hiddenVesselIds.includes(v.id);
            const isSelected = selectedVessel?.id === v.id;
            const isSuspect1 = idx === 0 || v.rank === 1;

            return (
              <button
                key={v.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleHideVessel(v.id);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono transition-all cursor-pointer border ${
                  isHidden
                    ? 'bg-slate-900/60 border-slate-800 text-slate-500 line-through opacity-60 hover:opacity-100 hover:text-slate-300'
                    : isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_8px_rgba(0,229,255,0.3)]'
                    : isSuspect1
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title={`${isHidden ? 'Click to show' : 'Click to hide'} ${v.name} (${v.attributionScore}%)`}
              >
                {isHidden ? (
                  <EyeOff className="w-3 h-3 text-rose-400" />
                ) : (
                  <Eye className={`w-3 h-3 ${isSuspect1 ? 'text-rose-400' : 'text-cyan-400'}`} />
                )}
                <span className="truncate max-w-[85px]">{v.name}</span>
                <span className={`text-[9px] ${isHidden ? 'text-slate-600' : 'text-slate-400 font-semibold'}`}>
                  {v.attributionScore}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Reset & Solo actions */}
        <div className="flex items-center gap-1 pl-2 border-l border-[#162D4A] shrink-0">
          {hiddenVesselIds.length > 0 && (
            <button
              onClick={onShowAllVessels}
              className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-[9px] font-mono text-cyan-300 hover:bg-cyan-900 transition-colors cursor-pointer flex items-center gap-1"
              title="Unhide all ships on map"
            >
              <Eye className="w-2.5 h-2.5" />
              <span>Show All</span>
            </button>
          )}
          {selectedVessel && (
            <button
              onClick={() => onSoloVessel(selectedVessel.id)}
              className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-mono text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30 transition-colors cursor-pointer flex items-center gap-1"
              title="Solo this selected vessel (hide all other ships)"
            >
              <Target className="w-2.5 h-2.5 text-cyan-400" />
              <span>Solo</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Active/Selected Vessel Tactical HUD Card (positioned below fleet bar) */}
      {selectedVessel && (() => {
        const displayVessel = selectedVessel;
        if (!displayVessel) return null;
        const isFlagged = displayVessel.rank === 1;
        const isHidden = hiddenVesselIds.includes(displayVessel.id);

        return (
          <div className="absolute top-14 left-3 right-3 sm:right-auto z-20 bg-[#070F1D]/95 border border-[#00E5FF]/40 rounded-xl shadow-2xl p-3 text-xs font-sans max-w-sm animate-in fade-in backdrop-blur-md">
            <div className="flex items-start justify-between gap-3 border-b border-[#162D4A] pb-2">
              <div>
                <div className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{displayVessel.name}</span>
                </div>
                <div className="text-[10px] text-slate-400 uppercase mt-0.5">
                  {displayVessel.type} · IMO {displayVessel.imo}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onToggleHideVessel(displayVessel.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors border ${
                    isHidden
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30'
                  }`}
                  title={isHidden ? "Unhide this vessel on map" : "Hide this vessel on map"}
                >
                  {isHidden ? <EyeOff className="w-3 h-3 text-rose-400" /> : <Eye className="w-3 h-3 text-slate-400" />}
                  <span>{isHidden ? 'Hidden' : 'Hide'}</span>
                </button>
                <button
                  onClick={() => onSoloVessel(displayVessel.id)}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                  title="Solo this ship (hide other ships)"
                >
                  <Target className="w-3 h-3 text-cyan-400" />
                  <span>Solo</span>
                </button>
                <button
                  onClick={() => onSelectVessel(null)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#0E1B2C] cursor-pointer"
                  title="Deselect vessel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {(() => {
              const simState = getVesselPositionAtTime(displayVessel, currentTimeSimulationMinutes);
              const curPos = simState.pos;
              const curHeading = simState.heading || displayVessel.currentHeadingDeg || 168;
              const targetOrig = displayVessel.rank === 2 ? origin2Coords : origin1Coords;
              const distFromOrig = Number((Math.hypot(curPos[0] - targetOrig[0], (curPos[1] - targetOrig[1]) * Math.cos(targetOrig[0] * Math.PI / 180)) * 111.0).toFixed(1));

              const releaseDist = displayVessel.distanceAtReleaseKm ?? (displayVessel.rank === 2 ? 0.18 : 0.12);
              const releaseTime = displayVessel.releaseTimestampUtc || (displayVessel.rank === 2 ? '02:35 UTC' : '02:47 UTC');
              const temporalCons = displayVessel.temporalConsistency || 'HIGH (Verified)';

              return (
                <div className="space-y-2 pt-2 text-[11px]">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-semibold">Speed / Heading:</span>
                      <span className="font-mono text-slate-200 font-bold">{displayVessel.currentSpeedKt} kn @ {curHeading}°</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-semibold">Position:</span>
                      <span className="font-mono text-cyan-400 font-bold">{curPos[0]}°N, {curPos[1]}°E</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-semibold">Dist at Release:</span>
                      <span className="font-mono text-emerald-400 font-bold">{releaseDist} km ({releaseTime})</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-semibold">Current Dist to Origin:</span>
                      <span className={`font-mono font-bold ${distFromOrig <= 2.0 ? 'text-amber-400 animate-pulse' : 'text-slate-200'}`}>
                        {distFromOrig <= 0.3 ? '0.0 km (AT ORIGIN)' : `${distFromOrig} km`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-semibold">Temporal Consistency:</span>
                      <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {temporalCons}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-semibold">Forensic Attribution:</span>
                      <span className={`font-mono font-black ${isFlagged ? 'text-[#EF4444]' : 'text-cyan-400'}`}>
                        {displayVessel.attributionScore}% PRIORITY
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* Floating Temporal Validation Engine HUD Overlay */}
      {layerState.temporalValidation && (
        <div className="absolute top-14 left-3 z-30 bg-[#070F1D]/95 border border-cyan-400/50 rounded-xl shadow-2xl p-3.5 text-xs font-sans max-w-md animate-in fade-in backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-[#162D4A] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00E5FF]" />
              <span className="font-bold text-xs uppercase tracking-wider text-cyan-300 font-mono">
                TEMPORAL CAUSALITY ENGINE (4D)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/50 font-bold">
                100% CAUSAL PASS
              </span>
              <button
                onClick={() => onToggleLayer('temporalValidation')}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#0E1B2C] cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <div className="space-y-1.5 pt-2 text-[10.5px] font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">1. Pre-Spill Clean Sea (t &lt; -300m):</span>
              <span className={currentTimeSimulationMinutes < -300 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                {currentTimeSimulationMinutes < -300 ? "● ACTIVE (0 Oil, 0 Particles)" : "✓ VERIFIED (Clean Sea)"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">2. Vessel Arrival at Origin (02:47 UTC):</span>
              <span className={currentTimeSimulationMinutes === -300 ? "text-cyan-400 font-bold animate-pulse" : "text-emerald-400 font-bold"}>
                {currentTimeSimulationMinutes === -300 ? "● DISCHARGE INITIATING" : "✓ VERIFIED (0.12 km offset)"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">3. Historical Advection (-300m to 0m):</span>
              <span className={currentTimeSimulationMinutes >= -300 && currentTimeSimulationMinutes < 0 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                {currentTimeSimulationMinutes >= -300 && currentTimeSimulationMinutes < 0 ? "● ADVECTION (55° ENE)" : "✓ VERIFIED (150 Particles)"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">4. SAR Ground Truth (t=0m / 04:32 UTC):</span>
              <span className={currentTimeSimulationMinutes === 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                {currentTimeSimulationMinutes === 0 ? "● SATELLITE ACQUISITION" : "✓ VERIFIED (94.7% IoU)"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">5. Forward Forecast (+48h Horizon):</span>
              <span className={currentTimeSimulationMinutes > 0 ? "text-emerald-400 font-bold" : "text-slate-400"}>
                {currentTimeSimulationMinutes > 0 ? "● SIMULATING COAST THREAT" : "✓ READY (Lagrangian)"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">6. Open Sea Nautical Corridor:</span>
              <span className="text-emerald-400 font-bold">✓ ZERO LAND CROSSINGS</span>
            </div>
            <div className="border-t border-[#162D4A] pt-1 text-[9.5px] text-slate-400 flex items-center justify-between">
              <span>Causal Order: VESSEL → RELEASE → DRIFT → SAR</span>
              <span className="text-cyan-400 font-bold">PHYSICALLY CONSISTENT</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Persistent Map Symbology Legend */}
      <div className="absolute bottom-4 left-4 z-20 font-sans">
        {legendOpen ? (
          <div className="w-64 bg-[#070F1D]/95 border border-[#162D4A] rounded-xl p-3 text-xs font-sans space-y-2 shadow-2xl backdrop-blur-md animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#162D4A] pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
                MAP SYMBOLOGY
              </span>
              <button
                onClick={() => setLegendOpen(false)}
                className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
              >
                Hide
              </button>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-2 rounded-sm bg-[#EF4444]/20 border border-[#EF4444]" />
                <span className="text-[#F87171] font-semibold">Plume #1 ({vessels[0]?.name || 'Target Vessel 1'})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-2 rounded-sm bg-[#C084FC]/25 border border-[#C084FC]" />
                <span className="text-[#C084FC] font-semibold">Plume #2 ({vessels[1]?.name || 'Target Vessel 2'})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full border border-[#F59E0B] flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-[#F59E0B]" />
                </span>
                <span className="text-amber-400">Probable Origin #1 & #2 (◎)</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="10" height="10" viewBox="0 0 24 24" className="fill-slate-400">
                  <polygon points="12 2 19 21 12 17 5 21 12 2" />
                </svg>
                <span className="text-slate-400">Normal Tracked Vessel</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="10" height="10" viewBox="0 0 24 24" className="fill-[#00E5FF]">
                  <polygon points="12 2 19 21 12 17 5 21 12 2" />
                </svg>
                <span className="text-slate-300">Relevant Sector Vessel</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="10" height="10" viewBox="0 0 24 24" className="fill-[#EF4444]">
                  <polygon points="12 2 19 21 12 17 5 21 12 2" />
                </svg>
                <span className="text-[#EF4444] font-semibold">Flagged Suspect Track</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 border-t border-dashed border-[#8B5CF6]" />
                <span className="text-slate-300">AIS Historical Path (──›)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 border-t-2 border-dashed border-[#3B82F6]" />
                <span className="text-blue-400 font-semibold">Hindcast Trajectories (‹──)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_6px_#00E5FF] flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-white" />
                </span>
                <span className="text-cyan-300 font-semibold">Virtual Particles Clouds</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 border-t-2 border-dotted border-[#10B981]" />
                <span className="text-emerald-400 font-semibold">Forecast Corridor (──›)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-2 rounded-sm bg-[#F59E0B]/20 border border-[#F59E0B]" />
                <span className="text-amber-400">Shoreline Risk Sector</span>
              </div>
            </div>

            {/* Scale Bar matching Reference Image */}
            <div className="pt-2 border-t border-[#162D4A] space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>0</span>
                <span>10</span>
                <span>25</span>
                <span>50 km</span>
              </div>
              <div className="w-full h-1 bg-[#0B1523] border border-[#162D4A] rounded-sm flex">
                <div className="w-1/4 h-full bg-cyan-400" />
                <div className="w-1/4 h-full bg-slate-600" />
                <div className="w-1/2 h-full bg-cyan-400" />
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setLegendOpen(true)}
            className="px-3 py-1.5 rounded-md bg-[#070F1D]/95 border border-[#162D4A] hover:border-[#00E5FF]/40 text-xs text-cyan-300 shadow-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Symbology</span>
          </button>
        )}
      </div>

      {/* Tactical Interactive Lagrangian Particle Tracking Engine HUD Badge */}
      <div className="absolute bottom-4 right-4 z-20 font-sans pointer-events-auto">
        {lagrangianOpen ? (
          <div className="bg-[#070F1D]/95 border border-cyan-400/50 rounded-xl p-3 text-xs shadow-2xl backdrop-blur-md animate-in fade-in max-w-xs">
            <div className="flex items-center justify-between border-b border-[#162D4A] pb-1.5 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 font-mono">
                  LAGRANGIAN ENGINE
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/40 font-bold">
                  {currentTimeSimulationMinutes < -300
                    ? 'PRE-SPILL'
                    : (currentTimeSimulationMinutes < 0
                      ? 'BACKTRACK'
                      : (currentTimeSimulationMinutes === 0
                        ? 'SAR OBSERVED'
                        : 'FORECAST'))}
                </span>
                <button
                  onClick={() => setLagrangianOpen(false)}
                  className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer transition-colors"
                  title="Hide"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1 pt-1.5 text-[10.5px] font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Particle Swarm:</span>
                <span className="text-emerald-400 font-bold">
                  {currentTimeSimulationMinutes < -300
                    ? '60 Hydro Tracers'
                    : (isDualSpillScenario ? '240 Active Parcels' : '150 Active Parcels')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Advection Vector:</span>
                <span className="text-cyan-400 font-bold">0.81 kn (058° ENE)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Fay Growth Model:</span>
                <span className="text-amber-400 font-bold">Viscous-Surface Tension</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#162D4A] pt-1 mt-1">
                <span className="text-slate-300 font-semibold">Current Footprint:</span>
                <span className="text-emerald-300 font-extrabold text-[11px]">
                  {currentTimeSimulationMinutes < -300
                    ? '0.0 km² (Clean Sea)'
                    : `${(currentTimeSimulationMinutes < 0 ? Math.max(1.8, incident.slickAreaKm2 * Math.pow(hudSlickScale, 1.25)) : incident.slickAreaKm2 * Math.pow(hudSlickScale, 1.35)).toFixed(1)} km²`}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setLagrangianOpen(true)}
            className="px-3 py-1.5 rounded-md bg-[#070F1D]/95 border border-[#162D4A] hover:border-[#00E5FF]/40 text-xs text-cyan-300 shadow-xl transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
            title="View Lagrangian Hydro Engine Telemetry"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Hydro Engine</span>
          </button>
        )}
      </div>

      {/* "How to Read This Map" First-Time Modal Overlay */}
      <MapGuideModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
      />
    </div>
  );
};
