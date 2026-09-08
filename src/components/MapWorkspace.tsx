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
  Compass,
  X,
  Plus,
  Minus,
  Maximize2
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

// Interpolate position along multi-waypoint polyline track
function interpolateTrackPosition(
  track: { lat: number; lng: number; headingDeg?: number; speedKt?: number }[],
  fraction: number
): { pos: [number, number]; heading: number } {
  if (!track || track.length === 0) return { pos: [0, 0], heading: 0 };
  if (track.length === 1 || fraction <= 0) {
    const p = track[0];
    return { pos: [p.lat, p.lng], heading: p.headingDeg || 0 };
  }
  if (fraction >= 1) {
    const last = track[track.length - 1];
    return { pos: [last.lat, last.lng], heading: last.headingDeg || 0 };
  }

  // Calculate cumulative distances along track segments
  const distances: number[] = [0];
  let totalDist = 0;
  for (let i = 0; i < track.length - 1; i++) {
    const d = Math.hypot(
      track[i + 1].lat - track[i].lat,
      (track[i + 1].lng - track[i].lng) * Math.cos((track[i].lat * Math.PI) / 180)
    );
    totalDist += d;
    distances.push(totalDist);
  }

  if (totalDist === 0) {
    const p = track[0];
    return { pos: [p.lat, p.lng], heading: p.headingDeg || 0 };
  }

  const targetDist = fraction * totalDist;
  for (let i = 0; i < track.length - 1; i++) {
    if (targetDist <= distances[i + 1]) {
      const segStartDist = distances[i];
      const segEndDist = distances[i + 1];
      const segLen = segEndDist - segStartDist;
      const segFraction = segLen > 0 ? (targetDist - segStartDist) / segLen : 0;
      const p1 = track[i];
      const p2 = track[i + 1];
      const lat = p1.lat + (p2.lat - p1.lat) * segFraction;
      const lng = p1.lng + (p2.lng - p1.lng) * segFraction;
      const heading = p2.headingDeg !== undefined ? p2.headingDeg : (p1.headingDeg || 0);
      return { pos: [Number(lat.toFixed(5)), Number(lng.toFixed(5))], heading };
    }
  }

  const last = track[track.length - 1];
  return { pos: [last.lat, last.lng], heading: last.headingDeg || 0 };
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
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const refTileLayerRef = useRef<L.TileLayer | null>(null);
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

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

    // Compute drift position offset according to time scrubber
    const timeRatio = Math.max(0, Math.min(currentTimeSimulationMinutes / 180, 1));
    const driftLatOffset = (baseLat - hindcast.originCoordinates[0]) * (timeRatio - 1);
    const driftLngOffset = (baseLng - hindcast.originCoordinates[1]) * (timeRatio - 1);

    // -------------------------------------------------------------
    // -------------------------------------------------------------
    // 1. OIL SPILL VISUALIZATION (Multi-Contour Realistic Satellite Anomaly)
    // -------------------------------------------------------------
    if (layerState.oilSlicks) {
      // High-resolution organic dispersion coordinates
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

      const outerSlickCoords = outerOffsets.map(([dLat, dLng]) => [
        baseLat + dLat + driftLatOffset,
        baseLng + dLng + driftLngOffset
      ]) as L.LatLngExpression[];

      // Core heavy emulsion coordinates (55% radius scale)
      const coreOffsets = outerOffsets.map(([dLat, dLng]) => [dLat * 0.55, dLng * 0.55]);
      const coreSlickCoords = coreOffsets.map(([dLat, dLng]) => [
        baseLat + dLat + driftLatOffset,
        baseLng + dLng + driftLngOffset
      ]) as L.LatLngExpression[];

      // Layer A: Outer Sheen Envelope (Iridescent surface film)
      const sheenPolygon = L.polygon(outerSlickCoords, {
        color: '#F87171',
        weight: 1.6,
        dashArray: '5, 4',
        fillColor: '#EF4444',
        fillOpacity: 0.18,
      }).addTo(group);

      // Layer B: Concentrated Emulsion Core (Thick crude oil plume)
      const corePolygon = L.polygon(coreSlickCoords, {
        color: '#EF4444',
        weight: 1.8,
        fillColor: '#B91C1C',
        fillOpacity: 0.62,
      }).addTo(group);

      const slickTooltipContent = `
        <div style="font-family: 'Inter', sans-serif; font-size: 11px; color: #F0F9FA; background: rgba(7, 12, 24, 0.96); backdrop-filter: blur(8px); padding: 8px 12px; border-radius: 8px; border: 1.5px solid #EF4444; box-shadow: 0 8px 24px rgba(0,0,0,0.85);">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; color: #F87171; font-size: 11px; letter-spacing: 0.05em;">
              <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #EF4444; box-shadow: 0 0 8px #EF4444;"></span>
              DETECTED OIL SLICK
            </div>
            <span style="font-size: 9px; font-weight: 700; color: #15D8B3; background: rgba(21, 216, 179, 0.15); border: 1px solid rgba(21, 216, 179, 0.4); padding: 1px 5px; border-radius: 4px; font-family: monospace;">94.7% IoU</span>
          </div>
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #FFFFFF; font-weight: 700; margin-top: 4px;">
            ${incident.slickAreaKm2} km² · Est. Vol ~3,840 bbl
          </div>
          <div style="display: flex; gap: 8px; color: #A3C2CF; font-size: 10px; margin-top: 3px; border-top: 1px solid rgba(255,255,255,0.1); pt: 3px;">
            <span>Perimeter: ${incident.slickPerimeterKm} km</span>
            <span>·</span>
            <span>Damping: -9.5 dB</span>
          </div>
          <div style="color: #15D8B3; font-size: 10px; margin-top: 4px; font-weight: 600;">
            Sentinel-1 C-SAR · Click to view AI Mask
          </div>
        </div>
      `;

      sheenPolygon.bindTooltip(slickTooltipContent, { sticky: true, opacity: 0.98 });
      corePolygon.bindTooltip(slickTooltipContent, { sticky: true, opacity: 0.98 });

      const handleSlickClick = () => {
        if (onOpenSlickDetails) onOpenSlickDetails();
      };
      sheenPolygon.on('click', handleSlickClick);
      corePolygon.on('click', handleSlickClick);

      // Tactical Centroid Radar Beacon & Floating Callout
      const centerLat = baseLat + driftLatOffset;
      const centerLng = baseLng + driftLngOffset;
      const slickCenterIcon = L.divIcon({
        className: 'custom-slick-marker !bg-transparent !border-0',
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(239, 68, 68, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; inset: 6px; border-radius: 50%; border: 1.5px solid #F87171; background: rgba(220, 38, 38, 0.65); box-shadow: 0 0 10px rgba(239, 68, 68, 0.8);"></div>
            <div style="width: 4px; height: 4px; border-radius: 50%; background: #FFFFFF;"></div>

            <!-- Floating Map Callout for Oil Slick (Anchored to Right to Prevent Overlap) -->
            <div style="position: absolute; left: 28px; top: 50%; transform: translateY(-50%); pointer-events: auto; cursor: pointer; z-index: 35; display: flex; align-items: center;">
              <div style="width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-right: 6px solid #EF4444;"></div>
              <div style="background: rgba(7, 15, 29, 0.95); backdrop-filter: blur(8px); border: 1.5px solid #EF4444; border-radius: 6px; padding: 4px 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.85); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #EF4444; box-shadow: 0 0 8px #EF4444;"></span>
                <span style="font-size: 11px; font-weight: 700; color: #EF4444; font-family: 'Inter', sans-serif;">Detected Oil Slick</span>
                <span style="color: #475569; font-size: 10px;">|</span>
                <span style="font-size: 11px; font-weight: 700; color: #F8FAFC; font-family: 'JetBrains Mono', monospace;">${incident.slickAreaKm2} km² · 94.7%</span>
              </div>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const slickMarker = L.marker([centerLat, centerLng], { icon: slickCenterIcon, interactive: true }).addTo(group);
      slickMarker.on('click', () => {
        if (onOpenSlickDetails) onOpenSlickDetails();
      });
    }

    // -------------------------------------------------------------
    // 2. PROBABLE ORIGIN & HINDCAST (Electric Mint Trajectory)
    // -------------------------------------------------------------
    if (layerState.hindcastTrajectory) {
      // Royal Blue backward drift path
      const trajectoryLine = L.polyline(hindcast.trajectoryWaypoints, {
        color: '#3B82F6',
        weight: 2.4,
        dashArray: '6, 4',
        opacity: 0.95,
      }).addTo(group);

      trajectoryLine.bindTooltip(`
        <div style="font-family: 'Inter', sans-serif; font-size: 11px; color: #FFFFE3; background: rgba(7, 15, 29, 0.95); backdrop-filter: blur(8px); padding: 5px 9px; border: 1.5px solid #3B82F6; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.6);">
          <strong style="color: #60A5FA; font-family: monospace;">HINDCAST -5h DRIFT PATH</strong><br/>
          Reverse Lagrangian Advection · ${hindcast.confidencePercent}% Confidence
        </div>
      `, { sticky: true });

      // Add backward directional chevrons along path in Royal Blue
      if (hindcast.trajectoryWaypoints.length >= 2) {
        for (let i = 0; i < hindcast.trajectoryWaypoints.length - 1; i++) {
          const p1 = hindcast.trajectoryWaypoints[i];
          const p2 = hindcast.trajectoryWaypoints[i + 1];
          const mid: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
          const dLat = p2[0] - p1[0];
          const dLng = p2[1] - p1[1];
          const screenAngle = Math.atan2(-dLat, dLng * Math.cos((p1[0] * Math.PI) / 180)) * 180 / Math.PI;

          const chevronIcon = L.divIcon({
            className: 'hindcast-chevron !bg-transparent !border-0',
            html: `
              <div style="width: 12px; height: 12px; display: flex; align-items: center; justify-content: center; transform: rotate(${screenAngle}deg); transform-origin: 50% 50%; color: #60A5FA; font-size: 13px; font-weight: 900; opacity: 0.95; line-height: 1; text-shadow: 0 0 6px rgba(59, 130, 246, 0.6); pointer-events: none;">
                ›
              </div>
            `,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });
          L.marker(mid, { icon: chevronIcon, interactive: false }).addTo(group);
        }
      }
    }

    if (layerState.originProbability) {
      // Amber target symbol ◎ with precision uncertainty rings
      L.circle(hindcast.originCoordinates, {
        radius: hindcast.uncertaintyRadiusKm * 1000,
        color: '#F59E0B',
        weight: 1.2,
        dashArray: '4, 4',
        fillColor: '#F59E0B',
        fillOpacity: 0.08,
      }).addTo(group);

      L.circle(hindcast.originCoordinates, {
        radius: (hindcast.uncertaintyRadiusKm * 1000) * 0.5,
        color: '#F59E0B',
        weight: 1.6,
        dashArray: '3, 3',
        fillColor: '#F59E0B',
        fillOpacity: 0.16,
      }).addTo(group);

      // Tactical Reticle Target symbol ◎ icon with Floating Callout
      const originIcon = L.divIcon({
        className: 'origin-marker !bg-transparent !border-0',
        html: `
          <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; border: 1.5px dashed #F59E0B; border-radius: 50%;"></div>
            <div style="position: absolute; inset: 6px; border: 1.5px solid #F59E0B; border-radius: 50%; background: rgba(245, 158, 11, 0.2);"></div>
            <div style="width: 5px; height: 5px; background: #F59E0B; border-radius: 50%; box-shadow: 0 0 8px #F59E0B;"></div>

            <!-- Floating Tactical Callout for Probable Origin (Anchored to Left to Prevent Overlap) -->
            <div style="position: absolute; right: 28px; top: 50%; transform: translateY(-50%); pointer-events: none; z-index: 35; display: flex; align-items: center;">
              <div style="background: rgba(7, 15, 29, 0.95); backdrop-filter: blur(8px); border: 1.5px solid #F59E0B; border-radius: 6px; padding: 4px 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.85); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #F59E0B; box-shadow: 0 0 8px #F59E0B;"></span>
                <span style="font-size: 11px; font-weight: 700; color: #F59E0B; font-family: 'Inter', sans-serif;">Probable Origin</span>
                <span style="color: #475569; font-size: 10px;">|</span>
                <span style="font-size: 11px; font-weight: 600; color: #F8FAFC; font-family: 'JetBrains Mono', monospace;">07:30 - 08:15 UTC | 78% confidence</span>
              </div>
              <div style="width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-left: 6px solid #F59E0B;"></div>
            </div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const originMarker = L.marker(hindcast.originCoordinates, { icon: originIcon }).addTo(group);
      originMarker.bindTooltip(`
        <div style="font-family: 'Inter', sans-serif; font-size: 11px; color: #FFFFE3; background: rgba(7, 15, 29, 0.95); backdrop-filter: blur(8px); padding: 7px 11px; border: 1.5px solid #F59E0B; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.7);">
          <div style="font-weight: 800; color: #F59E0B; font-size: 11px; letter-spacing: 0.05em; display: flex; align-items: center; gap: 5px;">
            <span>◎</span>
            <span>PROBABLE DISCHARGE ORIGIN</span>
          </div>
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #FFFFE3; font-weight: 600; margin-top: 3px;">
            78% CONFIDENCE · ${hindcast.originCoordinates[0].toFixed(3)}°N, ${hindcast.originCoordinates[1].toFixed(3)}°E
          </div>
          <div style="color: #94A3B8; font-size: 10px; margin-top: 2px;">
            Estimated Discharge Window: 02:10–03:40 UTC
          </div>
        </div>
      `);
    }

    // -------------------------------------------------------------
    // 3. FORECAST CORRIDOR (Emerald Green Dispersion Envelope)
    // -------------------------------------------------------------
    if (layerState.forecastCone) {
      const currentStep = forecastSteps[activeForecastStep] || forecastSteps[0];
      
      if (currentStep.polygonCoordinates.length > 0) {
        L.polygon(currentStep.polygonCoordinates as L.LatLngExpression[], {
          color: '#10B981',
          weight: 1.6,
          dashArray: '5, 4',
          fillColor: '#10B981',
          fillOpacity: 0.14,
        }).addTo(group);
      }

      const forecastSpine = forecastSteps.map(s => s.centerCoordinates as [number, number]);
      const forecastPolyline = L.polyline(forecastSpine, {
        color: '#10B981',
        weight: 2.0,
        dashArray: '5, 4',
        opacity: 0.9,
      }).addTo(group);

      forecastPolyline.bindTooltip(`
        <div style="font-family: 'Inter', sans-serif; font-size: 11px; color: #FFFFE3; background: rgba(7, 15, 29, 0.95); backdrop-filter: blur(8px); padding: 5px 9px; border: 1.5px solid #10B981; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.6);">
          <strong style="color: #34D399; font-family: monospace;">FORECAST +24h TRAJECTORY</strong><br/>
          Lagrangian Forward Dispersion Corridor
        </div>
      `, { sticky: true });

      // Forward directional chevrons along forecast path in Emerald Green
      for (let i = 0; i < forecastSpine.length - 1; i++) {
        const p1 = forecastSpine[i];
        const p2 = forecastSpine[i + 1];
        const mid: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
        const dLat = p2[0] - p1[0];
        const dLng = p2[1] - p1[1];
        const screenAngle = Math.atan2(-dLat, dLng * Math.cos((p1[0] * Math.PI) / 180)) * 180 / Math.PI;

        const chevronIcon = L.divIcon({
          className: 'forecast-chevron !bg-transparent !border-0',
          html: `
            <div style="width: 12px; height: 12px; display: flex; align-items: center; justify-content: center; transform: rotate(${screenAngle}deg); transform-origin: 50% 50%; color: #10B981; font-size: 13px; font-weight: 900; opacity: 0.9; line-height: 1; text-shadow: 0 0 6px rgba(16, 185, 129, 0.8); pointer-events: none;">
              ›
            </div>
          `,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        L.marker(mid, { icon: chevronIcon, interactive: false }).addTo(group);
      }
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
          <div style="background: rgba(7, 15, 29, 0.95); backdrop-filter: blur(8px); border: 1.5px solid #F59E0B; border-radius: 6px; padding: 4px 10px; font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: #F59E0B; display: flex; align-items: center; gap: 6px; box-shadow: 0 6px 20px rgba(0,0,0,0.85); white-space: nowrap;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #F59E0B; box-shadow: 0 0 6px #F59E0B;"></span>
            <span>Shoreline Risk</span>
            <span style="color: #475569; font-size: 10px;">|</span>
            <span style="color: #F8FAFC; font-family: 'JetBrains Mono', monospace;">ETA ~${shorelineRisk.projectedEtaHours}h</span>
          </div>
        `,
        iconSize: [180, 24],
        iconAnchor: [90, 12],
      });

      const shorelineMarker = L.marker(shorelineRisk.coordinates, { icon: shorelineIcon }).addTo(group);
      shorelineMarker.bindTooltip(`
        <div style="font-family: 'Inter', sans-serif; font-size: 11px; color: #F0F9FA; background: rgba(7, 15, 29, 0.95); backdrop-filter: blur(8px); padding: 7px 11px; border: 1.5px solid #F59E0B; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.85);">
          <strong style="color: #F59E0B;">SENSITIVE SHORELINE RISK ZONE</strong><br/>
          ${shorelineRisk.name}<br/>
          Offshore: ${shorelineRisk.distanceOffshoreKm} km · ETA: ~${shorelineRisk.projectedEtaHours} hrs · Vuln: EVT ${shorelineRisk.vulnerabilityIndex}/10
        </div>
      `);
    }

    // -------------------------------------------------------------
    // 5. AIS VESSELS & DIRECTIONAL NAVIGATION PATHS
    // -------------------------------------------------------------
    if (layerState.aisVessels) {
      vessels.forEach(vessel => {
        const isSelected = selectedVessel?.id === vessel.id;
        const isFlagged = vessel.rank === 1;
        const isRelevant = vessel.attributionScore >= 70;
        const isDimmed = selectedVessel !== null && !isSelected;

        // Draw Ship Navigation Path with Directional Chevrons
        if ((layerState.vesselTracks || isSelected) && vessel.track && vessel.track.length > 1) {
          const trackCoords = vessel.track.map(t => [t.lat, t.lng] as [number, number]);
          
          L.polyline(trackCoords, {
            color: isSelected ? '#00E5FF' : (isFlagged ? '#EF4444' : '#8B5CF6'),
            weight: isSelected ? 2.4 : (isFlagged ? 1.8 : 1.3),
            dashArray: isSelected ? 'none' : '5, 4',
            opacity: isDimmed ? 0.2 : (isSelected ? 1.0 : 0.7),
          }).addTo(group);

          // Add directional chevrons along vessel route segments
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
                <div style="width: 12px; height: 12px; display: flex; align-items: center; justify-content: center; transform: rotate(${screenAngle}deg); transform-origin: 50% 50%; color: ${isSelected ? '#00E5FF' : (isFlagged ? '#EF4444' : '#8B5CF6')}; font-size: 13px; font-weight: 900; opacity: ${isDimmed ? 0.2 : 0.85}; line-height: 1; pointer-events: none;">
                  ›
                </div>
              `,
              iconSize: [12, 12],
              iconAnchor: [6, 6],
            });
            L.marker(mid, { icon: chevronIcon, interactive: false }).addTo(group);
          }
        }

        // Time-interpolated vessel position strictly adhering to polyline track
        const timeFraction = Math.min(Math.max(currentTimeSimulationMinutes / 180, 0), 1);
        let currentPos: [number, number];
        let heading: number;

        if (vessel.track && vessel.track.length > 0) {
          const interp = interpolateTrackPosition(vessel.track, timeFraction);
          currentPos = interp.pos;
          heading = timeFraction >= 1 && vessel.currentHeadingDeg !== undefined
            ? vessel.currentHeadingDeg
            : interp.heading;
        } else {
          currentPos = vessel.currentCoordinates;
          heading = vessel.currentHeadingDeg || 0;
        }

        const shipFillColor = isFlagged ? '#EF4444' : (isRelevant ? '#00E5FF' : '#94A3B8');

        // Label for other key vessels matching reference image
        const hasVesselBadge = !isFlagged && (vessel.name.includes('OCEAN STAR') || vessel.name.includes('BLUE HORIZON') || vessel.name.includes('GULF') || isRelevant);
        const displayName = vessel.name.includes('OCEAN STAR') ? 'MT Ocean Star' : (vessel.name.includes('BLUE HORIZON') ? 'Ocean Trader' : vessel.name);

        const vesselIcon = L.divIcon({
          className: 'vessel-marker-icon !bg-transparent !border-0',
          html: `
            <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; opacity: ${isDimmed ? 0.3 : 1.0};">
              ${isSelected ? `
                <div style="position: absolute; inset: 0; border: 1.5px solid #00E5FF; border-radius: 50%; box-shadow: 0 0 14px rgba(0, 229, 255, 0.8); pointer-events: none;"></div>
              ` : ''}
              
              ${isFlagged ? `
                <!-- Pulsing Halo Aura around Flagged Suspect -->
                <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(239, 68, 68, 0.25); animation: ping 2.5s cubic-bezier(0,0,0.2,1) infinite; pointer-events: none;"></div>
                <div style="position: absolute; inset: 3px; border: 1.5px solid #EF4444; border-radius: 50%; background: rgba(239, 68, 68, 0.2); pointer-events: none;"></div>
              ` : ''}

              <!-- Ship Directional Vector (0° = North, pointing Up) -->
              <div style="width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; transform: rotate(${heading}deg); transform-origin: 50% 50%; pointer-events: none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="${shipFillColor}" stroke="#070F1D" stroke-width="1.5" style="display: block;">
                  <polygon points="12 2 19 21 12 17 5 21 12 2" />
                </svg>
              </div>

              <!-- High-End Tactical Floating Callout for Flagged Suspect -->
              ${isFlagged ? `
                <div style="position: absolute; bottom: 36px; left: 50%; transform: translateX(-50%); pointer-events: none; z-index: 40; display: flex; flex-direction: column; align-items: center;">
                  <div style="background: rgba(7, 15, 29, 0.95); backdrop-filter: blur(8px); border: 1.5px solid #EF4444; border-radius: 6px; padding: 3px 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.85); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                    <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #EF4444; box-shadow: 0 0 8px #EF4444;"></span>
                    <span style="font-size: 10px; font-weight: 800; color: #EF4444; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em;">#1 FLAGGED</span>
                    <span style="color: #475569; font-size: 10px;">|</span>
                    <span style="font-size: 11px; font-weight: 800; color: #F8FAFC; font-family: 'JetBrains Mono', monospace;">${vessel.attributionScore}%</span>
                  </div>
                  <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #EF4444; margin-top: -1px;"></div>
                </div>
              ` : ''}

              <!-- Direct on-map label for other vessels matching reference image -->
              ${hasVesselBadge ? `
                <div style="position: absolute; left: 28px; top: 50%; transform: translateY(-50%); pointer-events: none; white-space: nowrap; text-shadow: 0 1px 4px rgba(0,0,0,0.95); background: rgba(7, 15, 29, 0.75); backdrop-filter: blur(4px); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">
                  <div style="font-size: 11px; font-weight: 700; color: ${isRelevant ? '#00E5FF' : '#F8FAFC'}; font-family: 'Inter', sans-serif;">${displayName}</div>
                  <div style="font-size: 10px; color: #94A3B8; font-family: 'JetBrains Mono', monospace;">${vessel.currentSpeedKt} kt · ${String(heading).padStart(3, '0')}°</div>
                </div>
              ` : ''}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker(currentPos, { icon: vesselIcon }).addTo(group);
        marker.on('click', () => onSelectVessel(vessel));

        marker.bindTooltip(`
          <div style="font-family: 'Inter', sans-serif; font-size: 11px; background: rgba(7, 15, 29, 0.96); backdrop-filter: blur(8px); color: #F8FAFC; padding: 7px 11px; border: 1.5px solid ${isSelected ? '#00E5FF' : (isFlagged ? '#EF4444' : '#162D4A')}; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.75);">
            <div style="font-weight: 800; color: ${isFlagged ? '#EF4444' : '#F8FAFC'}; font-size: 12px;">${vessel.name}</div>
            <div style="color: #94A3B8; font-size: 10px; margin-top: 1px;">MMSI: ${vessel.mmsi} · ${vessel.type} · ${vessel.flag}</div>
            <div style="font-family: 'JetBrains Mono', monospace; color: #00E5FF; font-size: 11px; margin-top: 3px;">
              ${vessel.currentSpeedKt} kn · Heading: ${heading}°
            </div>
            <div style="color: ${isFlagged ? '#EF4444' : '#10B981'}; font-weight: 700; margin-top: 4px; font-size: 11px; font-family: 'JetBrains Mono', monospace;">
              Forensic Attribution Score: ${vessel.attributionScore}%
            </div>
          </div>
        `, { sticky: true });
      });
    }

    // -------------------------------------------------------------
    // 6. COASTAL CITY LABELS & SEA WATERMARK (from reference image)
    // -------------------------------------------------------------
    if (incident.coordinates[0] > 17 && incident.coordinates[0] < 20) {
      // Mumbai coastal city markers
      const coastalCities = [
        { name: 'Mumbai', coords: [18.96, 72.82] as [number, number] },
        { name: 'JNPT', coords: [18.95, 72.95] as [number, number] },
        { name: 'Alibag', coords: [18.64, 72.87] as [number, number] }
      ];

      coastalCities.forEach(city => {
        const cityIcon = L.divIcon({
          className: 'city-label-marker !bg-transparent !border-0',
          html: `
            <div style="display: flex; align-items: center; gap: 4px; pointer-events: none; white-space: nowrap;">
              <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #F8FAFC; box-shadow: 0 0 6px rgba(255,255,255,0.8);"></span>
              <span style="font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; color: #E2E8F0; text-shadow: 0 1px 4px rgba(0,0,0,0.95);">${city.name}</span>
            </div>
          `,
          iconSize: [60, 16],
          iconAnchor: [2, 8]
        });
        L.marker(city.coords, { icon: cityIcon, interactive: false }).addTo(group);
      });

      // Arabian Sea watermark
      const seaIcon = L.divIcon({
        className: 'sea-watermark !bg-transparent !border-0',
        html: `
          <div style="font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 700; color: rgba(56, 189, 248, 0.25); letter-spacing: 0.15em; text-transform: uppercase; pointer-events: none; font-style: italic;">
            Arabian Sea
          </div>
        `,
        iconSize: [140, 24],
        iconAnchor: [70, 12]
      });
      L.marker([18.25, 72.05], { icon: seaIcon, interactive: false }).addTo(group);

      // Subtle Wind / Ocean Current arrows
      const windVectors: [number, number][] = [
        [18.35, 72.25],
        [18.28, 72.45],
        [18.15, 72.30],
        [18.05, 72.65],
        [17.95, 72.48]
      ];
      windVectors.forEach(pos => {
        const arrowIcon = L.divIcon({
          className: 'wind-arrow !bg-transparent !border-0',
          html: `
            <div style="transform: rotate(65deg); color: rgba(0, 229, 255, 0.45); font-size: 13px; font-weight: bold; pointer-events: none;">
              ➔
            </div>
          `,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        L.marker(pos, { icon: arrowIcon, interactive: false }).addTo(group);
      });
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
    onOpenSlickDetails
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

      {/* Floating Selected Vessel Info Bubble */}
      {selectedVessel && (
        <div className="absolute top-3 left-3 z-20 bg-[#070F1D]/95 border border-[#00E5FF]/40 rounded-lg shadow-2xl p-3 text-xs font-sans max-w-xs animate-in fade-in backdrop-blur-md">
          <div className="flex items-start justify-between gap-3 border-b border-[#162D4A] pb-2">
            <div>
              <div className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                <span>{selectedVessel.name}</span>
              </div>
              <div className="text-[10px] text-slate-400 uppercase mt-0.5">
                {selectedVessel.type} · IMO {selectedVessel.imo}
              </div>
            </div>
            <button
              onClick={() => onSelectVessel(null)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#0E1B2C] cursor-pointer"
              title="Deselect vessel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
            <div>
              <span className="text-[9px] text-slate-400 uppercase block">Speed / Heading:</span>
              <span className="font-mono text-slate-200 font-semibold">{selectedVessel.currentSpeedKt} kn @ {selectedVessel.currentHeadingDeg}°</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase block">Position:</span>
              <span className="font-mono text-cyan-400 font-semibold">{selectedVessel.currentCoordinates[0]}°N, {selectedVessel.currentCoordinates[1]}°E</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase block">Dist to Origin:</span>
              <span className="font-mono text-emerald-400 font-semibold">{selectedVessel.distanceFromOriginKm} km</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase block">Attribution:</span>
              <span className={`font-mono font-bold ${selectedVessel.rank === 1 ? 'text-[#EF4444]' : 'text-cyan-400'}`}>
                {selectedVessel.attributionScore}% PRIORITY
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Persistent Map Symbology Legend */}
      <div className="absolute bottom-4 left-4 z-20 font-sans">
        {legendOpen ? (
          <div className="w-60 bg-[#070F1D]/95 border border-[#162D4A] rounded-xl p-3 text-xs font-sans space-y-2 shadow-2xl backdrop-blur-md animate-in fade-in">
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
                <span className="text-slate-300">Detected Oil Slick</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full border border-[#F59E0B] flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-[#F59E0B]" />
                </span>
                <span className="text-slate-300">Probable Origin (◎)</span>
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
                <span className="text-[#EF4444] font-semibold">Flagged Suspect (#1)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 border-t border-dashed border-[#8B5CF6]" />
                <span className="text-slate-300">AIS Path (──›──›)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 border-t-2 border-dashed border-[#3B82F6]" />
                <span className="text-blue-400 font-semibold">Hindcast Path (‹── ‹──)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 border-t-2 border-dotted border-[#10B981]" />
                <span className="text-emerald-400 font-semibold">Forecast Path (──› ──›)</span>
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

      {/* "How to Read This Map" First-Time Modal Overlay */}
      <MapGuideModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
      />
    </div>
  );
};
