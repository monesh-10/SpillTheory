import {
  Incident,
  MetOceanTelemetry,
  HindcastResult,
  Vessel,
  ForecastStep,
  ShorelineRiskZone,
  SARDetectionResult,
  DataSourceStatus,
  ModelStatus,
} from '../types';

import {
  ALL_INCIDENTS,
  PRIMARY_INCIDENT,
  SINGLE_SPILL_INCIDENT,
  PRIMARY_METOCEAN,
  PRIMARY_HINDCAST,
  SUSPECT_VESSELS,
  FORECAST_STEPS,
  PRIMARY_SHORELINE_RISK,
  SAR_DETECTION_MOCK,
  DATA_SOURCES,
  AI_MODELS
} from '../data/mockData';

const BACKEND_URL = 'http://127.0.0.1:8000';

export interface ScenarioBundle {
  incident: Incident;
  vessels: Vessel[];
  hindcast: HindcastResult;
  forecastSteps: ForecastStep[];
  metocean: MetOceanTelemetry;
  shorelineRisk: ShorelineRiskZone;
}

function generateSubtleCloud(origin: [number, number], count: number = 40): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI + (i % 3);
    const radius = 0.003 + (i % 5) * 0.0035;
    points.push([
      Number((origin[0] + radius * Math.cos(angle)).toFixed(4)),
      Number((origin[1] + radius * Math.sin(angle) * 1.3).toFixed(4))
    ]);
  }
  return points;
}

export const apiService = {
  // Check if real FastAPI backend is online
  async checkBackendHealth(): Promise<{ online: boolean; latencyMs: number }> {
    const start = performance.now();
    try {
      const res = await fetch(`${BACKEND_URL}/api/spills`, { signal: AbortSignal.timeout(1500) });
      const latency = Math.round(performance.now() - start);
      return { online: res.ok, latencyMs: latency };
    } catch {
      return { online: false, latencyMs: 0 };
    }
  },

  async getIncidents(): Promise<Incident[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/spills`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw) && raw.length > 0) {
          const list: Incident[] = [];
          
          // Always ensure Primary Dual and Single Point-Source are top scenarios
          list.push(PRIMARY_INCIDENT);
          list.push(SINGLE_SPILL_INCIDENT);

          raw.forEach((item: any) => {
            if (item.spill_id === 'OCN-042' || item.spill_id === 'OCN-043') return;
            const fallback = ALL_INCIDENTS.find(i => i.id === item.spill_id) || ALL_INCIDENTS[2] || ALL_INCIDENTS[0];
            const coords: [number, number] = item.spill_id === 'SPILL_002'
              ? [13.12, 80.45]
              : item.spill_id === 'SPILL_003'
              ? [9.95, 76.05]
              : [18.12, 72.45];
            const name = item.spill_id === 'SPILL_002'
              ? 'Chennai Port Cargo Bunker Leak'
              : item.spill_id === 'SPILL_003'
              ? 'Kochi Malabar Coast Seep'
              : (item.location || fallback.name);
            list.push({
              ...fallback,
              id: item.spill_id || fallback.id,
              code: item.spill_id || fallback.code,
              name: name,
              locationName: item.location || fallback.locationName,
              coordinates: coords,
              slickAreaKm2: item.area_km2 || fallback.slickAreaKm2,
              detectedAt: item.timestamp || fallback.detectedAt,
              status: item.status?.toUpperCase().includes('ACTIVE') ? 'UNDER INVESTIGATION' : 'MONITORING'
            });
          });
          return list;
        }
      }
    } catch {
      // Backend offline fallback
    }
    return ALL_INCIDENTS;
  },

  async getIncident(id: string): Promise<Incident> {
    const incidents = await this.getIncidents();
    const found = incidents.find(inc => inc.id === id);
    return found || (id === 'OCN-043' || id.includes('043') ? SINGLE_SPILL_INCIDENT : PRIMARY_INCIDENT);
  },

  async getScenarioBundle(spillId: string = 'OCN-042'): Promise<ScenarioBundle> {
    // Single Spill point-source scenario (1 suspect vessel: MT OCEAN STAR)
    if (spillId === 'OCN-043' || spillId.includes('043') || spillId.toLowerCase().includes('single')) {
      return {
        incident: SINGLE_SPILL_INCIDENT,
        vessels: [SUSPECT_VESSELS[0]], // Only MT OCEAN STAR (91.7% Priority)
        hindcast: {
          ...PRIMARY_HINDCAST,
          incidentId: 'OCN-043',
          confidencePercent: 91.7
        },
        forecastSteps: FORECAST_STEPS.map(s => ({
          ...s,
          estimatedAreaKm2: Number((s.estimatedAreaKm2 * (8.25 / 13.48)).toFixed(2))
        })),
        metocean: PRIMARY_METOCEAN,
        shorelineRisk: PRIMARY_SHORELINE_RISK
      };
    }

    // Dual Spill coalesced scenario (2 suspect vessels merging)
    if (spillId === 'OCN-042' || spillId === 'PRIMARY_INCIDENT' || spillId === 'SPILL_001') {
      return {
        incident: PRIMARY_INCIDENT,
        vessels: SUSPECT_VESSELS,
        hindcast: PRIMARY_HINDCAST,
        forecastSteps: FORECAST_STEPS,
        metocean: PRIMARY_METOCEAN,
        shorelineRisk: PRIMARY_SHORELINE_RISK
      };
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/scenario/${spillId}`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const raw = await res.json();
        const cLat = Number(raw.spill_event?.centroid?.lat || 18.12);
        const cLon = Number(raw.spill_event?.centroid?.lon || 72.45);
        const origLat = Number(raw.hindcast?.origin_estimate?.point?.lat || cLat - 0.025);
        const origLon = Number(raw.hindcast?.origin_estimate?.point?.lon || cLon - 0.05);

        const incident: Incident = {
          id: raw.spill_event?.spill_id || spillId,
          code: raw.spill_event?.spill_id || spillId,
          name: spillId === 'SPILL_002'
            ? 'Chennai Port Cargo Bunker Leak'
            : spillId === 'SPILL_003'
            ? 'Kochi Malabar Coast Seep'
            : 'Offshore Mumbai Basin Discharge',
          locationName: raw.spill_event?.location_name || (spillId === 'SPILL_002' ? 'Coromandel Coast, Chennai' : spillId === 'SPILL_003' ? 'Malabar Coast, Kochi' : 'Offshore Mumbai Basin, Arabian Sea'),
          coordinates: [cLat, cLon],
          detectedAt: raw.spill_event?.timestamp || '2026-09-07T04:32:00Z',
          estimatedAgeHours: `${raw.spill_event?.estimated_age_hours || 5.5} hours`,
          slickAreaKm2: Number(raw.spill_event?.area_km2 || 13.48),
          slickPerimeterKm: Math.round(Math.sqrt(Number(raw.spill_event?.area_km2 || 13.48)) * 8.5 * 10) / 10,
          confidencePercent: Math.round((raw.spill_event?.confidence || 0.947) * 100),
          classification: 'Probable petroleum slick',
          sensor: 'Sentinel-1 / ALOS-2 PALSAR SAR',
          status: 'UNDER INVESTIGATION',
          priority: 'HIGH',
          backscatterDb: -9.2,
          model: 'OceanTrace-Seg v1.4 (U-Net Multi-Res)',
          summary: raw.sar_metadata?.reason || raw.attribution?.candidates?.[0]?.reasoning_agent_report || 'Active SAR backscatter depression identified in territorial waters.'
        };

        const origEstimate = raw.hindcast?.origin_estimate;
        const computedOrigLat = origEstimate?.point?.lat ?? origLat;
        const computedOrigLon = origEstimate?.point?.lon ?? origLon;
        const realParticleCloud = raw.hindcast?.particle_cloud || generateSubtleCloud([computedOrigLat, computedOrigLon], 40);
        const realTrajectory = raw.hindcast?.trajectory_waypoints || [
          [cLat, cLon],
          [Number(((cLat + computedOrigLat) / 2).toFixed(4)), Number(((cLon + computedOrigLon) / 2).toFixed(4))],
          [computedOrigLat, computedOrigLon]
        ];

        const hindcast: HindcastResult = {
          incidentId: spillId,
          originCoordinates: [computedOrigLat, computedOrigLon],
          originRegionName: spillId === 'SPILL_002' ? 'Chennai Anchorage Approach' : spillId === 'SPILL_003' ? 'Kochi Shipping Fairway' : 'Mumbai High Sector Beta',
          confidencePercent: Math.round((origEstimate?.confidence || 0.85) * 100),
          dischargeWindowUtc: origEstimate?.time ? origEstimate.time.replace('2026-09-01T', '').replace('2026-09-07T', '').replace('Z', ' UTC') : '02:47 UTC',
          particleCount: origEstimate?.particle_count || realParticleCloud.length || 150,
          uncertaintyRadiusKm: origEstimate?.uncertainty_radius_km || 1.8,
          estimatedSpillAgeRange: origEstimate?.best_age_hours ? `${origEstimate.best_age_hours} hrs (${origEstimate.plausible_age_range_hours?.join('-') || '2-6'}h plausible)` : `${raw.spill_event?.estimated_age_hours || 4.0} hrs`,
          trajectoryWaypoints: realTrajectory,
          particleCloud: realParticleCloud
        };

        const rawTracks = raw.ais?.vessel_tracks || [];
        const vessels: Vessel[] = rawTracks.length > 0 ? rawTracks.map((track: any, idx: number) => {
          const cand = (raw.attribution?.candidates || []).find((c: any) => c.mmsi === track.mmsi || c.name === track.name);
          const isV1 = idx === 0 || track.name === 'MT OCEAN STAR';
          const isV2 = idx === 1 || track.name === 'GULF VOYAGER';
          const defaultScore = isV1 ? 92 : (isV2 ? 76 : 30);
          const score = cand ? Math.round(cand.score * 100) : defaultScore;
          
          let waypoints = (track.path || []).map((pt: any) => ({
            lat: pt.lat,
            lng: pt.lon,
            timestampUtc: pt.timestamp ? pt.timestamp.replace('2026-09-01T', '').replace('2026-09-07T', '').replace('Z', ' UTC') : '02:47 UTC',
            speedKt: pt.sog || (isV1 ? 11.4 : (isV2 ? 10.8 : 12.0)),
            headingDeg: pt.heading || (isV1 ? 125 : (isV2 ? 310 : 90))
          }));

          const lastPt = waypoints[waypoints.length - 1] || { lat: cLat, lng: cLon, speedKt: 11.4, headingDeg: 125 };

          return {
            id: `VSL-${track.mmsi || idx + 1}`,
            name: track.name || (isV1 ? 'MT OCEAN STAR' : (isV2 ? 'GULF VOYAGER' : `Vessel ${idx + 1}`)),
            imo: isV1 ? '9384910' : (isV2 ? '9412089' : `9${String(track.mmsi || 1234567).padStart(6, '0').slice(0, 6)}`),
            mmsi: String(track.mmsi || (isV1 ? '419001284' : (isV2 ? '419002931' : '412345678'))),
            callsign: isV1 ? 'ATX9' : (isV2 ? 'VTG4' : `9V${idx + 1}A`),
            flag: isV1 ? 'Liberia' : (isV2 ? 'Marshall Islands' : 'Panama'),
            flagCode: isV1 ? 'LR' : (isV2 ? 'MH' : 'PA'),
            type: track.type || (isV1 ? 'Crude Oil Tanker' : (isV2 ? 'Chemical/Oil Products Tanker' : 'Bulk Carrier')),
            lengthM: isV1 ? 248 : (isV2 ? 182 : 225),
            beamM: isV1 ? 42 : (isV2 ? 28 : 32),
            currentCoordinates: [lastPt.lat, lastPt.lng] as [number, number],
            currentSpeedKt: lastPt.speedKt,
            currentHeadingDeg: lastPt.headingDeg,
            distanceFromOriginKm: Number((Math.hypot(lastPt.lat - origLat, lastPt.lng - origLon) * 111).toFixed(1)),
            timeDiffMinutes: 0,
            rank: idx + 1,
            investigationPriority: score >= 80 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW',
            attributionScore: score,
            proximityScore: cand?.evidence?.proximity_score ? Math.round(cand.evidence.proximity_score * 100) : (isV1 ? 96 : 84),
            trajectoryScore: cand?.evidence?.trajectory_score ? Math.round(cand.evidence.trajectory_score * 100) : (isV1 ? 94 : 78),
            temporalScore: isV1 ? 91 : 79,
            aisAnomalyScore: cand?.evidence?.anomaly_score ? Math.round(cand.evidence.anomaly_score * 100) : (isV1 ? 87 : 72),
            behavioralAnomalyScore: isV1 ? 82 : 68,
            speedAnomalyDetected: score > 70,
            courseDeviationDetected: score > 70,
            presenceInOriginWindow: true,
            track: waypoints,
            activityTimeline: [
              {
                timestampUtc: isV1 ? '02:47 UTC' : '02:35 UTC',
                description: isV1
                  ? 'Direct transit through probabilistic hindcast origin centroid at 02:47 UTC'
                  : 'Passed through origin centroid #2 during estimated release window at 02:35 UTC',
                isAnomaly: true,
                type: 'ORIGIN_PROXIMITY'
              }
            ],
            destination: isV1 ? 'JNPT MUMBAI' : 'FUJAIRAH',
            eta: '07 Sep 2026 18:00 UTC'
          };
        }) : SUSPECT_VESSELS;

        const rawForecast = raw.live_drift_forecast || raw.drift?.forecast || [];
        const baseArea = Number(raw.spill_event?.area_km2 || 13.48);
        const stepsFromRaw: ForecastStep[] = rawForecast.map((item: any, idx: number) => {
          const ptLat = item.point?.lat || cLat + (idx + 1) * 0.015;
          const ptLon = item.point?.lon || cLon + (idx + 1) * 0.025;
          const hrs = item.forecast_hour || ((idx + 1) * 3);
          const stepArea = item.area_km2
            ? Number(item.area_km2)
            : Number((baseArea * (1 + 2.8 * Math.pow(hrs / 48.0, 0.75))).toFixed(1));
          
          // Organic 8-point dispersion polygon scaled with growing physical Fay spreading area
          const rScale = Math.sqrt(stepArea / Math.max(1.0, baseArea));
          const dLat = 0.012 * rScale;
          const dLon = 0.018 * rScale;
          return {
            stepHours: hrs,
            label: `+${hrs}H`,
            timeUtc: item.timestamp ? item.timestamp.replace('T', ' ').replace('Z', ' UTC') : `+${hrs}h Forecast`,
            estimatedAreaKm2: stepArea,
            centerCoordinates: [ptLat, ptLon] as [number, number],
            polygonCoordinates: [
              [ptLat + dLat * 1.1, ptLon - dLon * 0.4],
              [ptLat + dLat * 0.8, ptLon + dLon * 0.9],
              [ptLat + dLat * 0.1, ptLon + dLon * 1.3],
              [ptLat - dLat * 0.7, ptLon + dLon * 1.0],
              [ptLat - dLat * 1.1, ptLon + dLon * 0.2],
              [ptLat - dLat * 0.9, ptLon - dLon * 0.8],
              [ptLat - dLat * 0.2, ptLon - dLon * 1.2],
              [ptLat + dLat * 0.8, ptLon - dLon * 0.9],
            ] as [number, number][],
            uncertaintyRadiusKm: Number((1.2 + (hrs / 24) * 5.0).toFixed(1))
          };
        });

        const initialStep: ForecastStep = {
          stepHours: 0,
          label: 'NOW (T+0h)',
          timeUtc: raw.spill_event?.timestamp ? raw.spill_event.timestamp.replace('T', ' ').replace('Z', ' UTC') : 'Detection Time',
          estimatedAreaKm2: baseArea,
          centerCoordinates: [cLat, cLon],
          uncertaintyRadiusKm: 1.2,
          polygonCoordinates: [
            [cLat + 0.015, cLon - 0.008],
            [cLat + 0.012, cLon + 0.018],
            [cLat - 0.012, cLon + 0.015],
            [cLat - 0.016, cLon - 0.010]
          ]
        };

        const forecastSteps: ForecastStep[] = stepsFromRaw.length > 0
          ? [initialStep, ...stepsFromRaw]
          : FORECAST_STEPS;

        const metocean: MetOceanTelemetry = raw.live_metocean ? {
          timestamp: raw.live_metocean.timestamp || 'Live Telemetry',
          windSpeedKt: Number(raw.live_metocean.wind?.speed_knots || 14.2),
          windDirectionDeg: Number(raw.live_metocean.wind?.direction_deg || 240),
          windDirectionCard: raw.live_metocean.wind?.direction_cardinal || 'WSW',
          waveHeightM: Number(raw.live_metocean.waves?.significant_height_m || 1.8),
          waveState: raw.live_metocean.waves?.sea_state || 'Moderate (Sea State 4)',
          currentSpeedKt: Number(raw.live_metocean.ocean_current?.speed_knots || 0.8),
          currentDirectionDeg: Number(raw.live_metocean.ocean_current?.direction_deg || 110),
          currentDirectionCard: raw.live_metocean.ocean_current?.direction_cardinal || 'ESE',
          seaTempC: Number(raw.live_metocean.atmosphere?.temp_c || 28.4),
          airPressureHpa: Number(raw.live_metocean.atmosphere?.pressure_hpa || 1012),
          netDriftSpeedKt: Number(raw.live_metocean.drift_model?.drift_speed_knots || 1.1),
          netDriftDirectionDeg: Number(raw.live_metocean.drift_model?.drift_direction_deg || 85),
          netDriftDirectionCard: raw.live_metocean.drift_model?.drift_cardinal || 'E',
          modelFormula: raw.live_metocean.drift_model?.formula || 'U_drift = 0.03 * U_wind + 1.0 * U_current',
          mode: 'LIVE METOCEAN'
        } : PRIMARY_METOCEAN;

        const shorelineRisk: ShorelineRiskZone = spillId === 'SPILL_002' ? {
          name: 'Marina Beach & Ennore Fishery Reserve',
          region: 'Coromandel Coastal Corridor, Tamil Nadu',
          distanceOffshoreKm: 6.8,
          projectedEtaHours: 9.5,
          riskLevel: 'HIGH',
          protocolTier: 'TIER-2 REGIONAL ACTIVATION',
          vulnerabilityIndex: 8.8,
          coordinates: [13.15, 80.34],
          vulnerableAssets: [
            { name: 'Ennore Creek Estuarine Fishery', type: 'Fisheries & Marine Habitat', sensitivity: 'CRITICAL' },
            { name: 'Chennai Port Outer Channel', type: 'Commercial Navigation Corridor', sensitivity: 'HIGH' }
          ],
          immediateActions: [
            { id: 'ACT-1', text: 'Pre-position nearshore deflection booms along Ennore inlet mouth', completed: true, priority: 'CRITICAL' },
            { id: 'ACT-2', text: 'Alert Indian Coast Guard Eastern Region Command', completed: false, priority: 'HIGH' }
          ]
        } : spillId === 'SPILL_003' ? {
          name: 'Vypin Island Mangrove Sanctuary',
          region: 'Cochin Backwaters & Coastal Buffer, Kerala',
          distanceOffshoreKm: 5.2,
          projectedEtaHours: 7.0,
          riskLevel: 'CRITICAL',
          protocolTier: 'TIER-2 RAPID CONTAINMENT',
          vulnerabilityIndex: 9.4,
          coordinates: [9.97, 76.24],
          vulnerableAssets: [
            { name: 'Vypin Tidal Mangrove Ecosystem', type: 'Protected Ecological Reserve', sensitivity: 'CRITICAL' },
            { name: 'Cochin Port Dredged Navigation Channel', type: 'Deepwater Shipping Channel', sensitivity: 'HIGH' }
          ],
          immediateActions: [
            { id: 'ACT-1', text: 'Deploy curtain skimmers across harbour approach channel', completed: true, priority: 'CRITICAL' },
            { id: 'ACT-2', text: 'Mobilize regional marine wildlife rehabilitation team', completed: false, priority: 'HIGH' }
          ]
        } : PRIMARY_SHORELINE_RISK;

        return {
          incident,
          vessels,
          hindcast,
          forecastSteps,
          metocean,
          shorelineRisk
        };
      }
    } catch {
      // Backend offline fallback
    }

    return {
      incident: PRIMARY_INCIDENT,
      vessels: SUSPECT_VESSELS,
      hindcast: PRIMARY_HINDCAST,
      forecastSteps: FORECAST_STEPS,
      metocean: PRIMARY_METOCEAN,
      shorelineRisk: PRIMARY_SHORELINE_RISK
    };
  },

  async getMetOcean(incidentId?: string): Promise<MetOceanTelemetry> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/metocean?lat=18.12&lon=72.45`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        const wind = data.wind || {};
        const waves = data.waves || {};
        const currents = data.ocean_current || {};
        const drift = data.drift_model || {};
        return {
          timestamp: data.timestamp || PRIMARY_METOCEAN.timestamp,
          windSpeedKt: Number(wind.speed_knots || PRIMARY_METOCEAN.windSpeedKt),
          windDirectionDeg: Number(wind.direction_deg || PRIMARY_METOCEAN.windDirectionDeg),
          windDirectionCard: wind.direction_cardinal || PRIMARY_METOCEAN.windDirectionCard,
          waveHeightM: Number(waves.significant_height_m || PRIMARY_METOCEAN.waveHeightM),
          waveState: waves.sea_state || PRIMARY_METOCEAN.waveState,
          currentSpeedKt: Number(currents.speed_knots || PRIMARY_METOCEAN.currentSpeedKt),
          currentDirectionDeg: Number(currents.direction_deg || PRIMARY_METOCEAN.currentDirectionDeg),
          currentDirectionCard: currents.direction_cardinal || PRIMARY_METOCEAN.currentDirectionCard,
          seaTempC: Number(data.atmosphere?.temp_c || PRIMARY_METOCEAN.seaTempC),
          airPressureHpa: Number(data.atmosphere?.pressure_hpa || PRIMARY_METOCEAN.airPressureHpa),
          netDriftSpeedKt: Number(drift.drift_speed_knots || PRIMARY_METOCEAN.netDriftSpeedKt),
          netDriftDirectionDeg: Number(drift.drift_direction_deg || PRIMARY_METOCEAN.netDriftDirectionDeg),
          netDriftDirectionCard: drift.drift_cardinal || PRIMARY_METOCEAN.netDriftDirectionCard,
          modelFormula: drift.formula || PRIMARY_METOCEAN.modelFormula,
          mode: 'LIVE METOCEAN'
        };
      }
    } catch {
      // Fallback
    }
    return PRIMARY_METOCEAN;
  },

  async getHindcast(incidentId?: string): Promise<HindcastResult> {
    return PRIMARY_HINDCAST;
  },

  async getVessels(incidentId?: string): Promise<Vessel[]> {
    return SUSPECT_VESSELS;
  },

  async getVessel(id: string): Promise<Vessel | undefined> {
    return SUSPECT_VESSELS.find(v => v.id === id);
  },

  async getForecast(incidentId?: string): Promise<ForecastStep[]> {
    return FORECAST_STEPS;
  },

  async getShorelineRisk(incidentId?: string): Promise<ShorelineRiskZone> {
    return PRIMARY_SHORELINE_RISK;
  },

  async getDemoImages(): Promise<string[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/demo-images`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        return data.images || [];
      }
    } catch {
      // Fallback
    }
    return ['palsar_0.png', 'palsar_1.png', 'palsar_10.png', 'clean_ocean_no_spill.png'];
  },

  async runRealSARDetection(
    demoFilenameOrFile: string | File,
    centerLat: number = 18.12,
    centerLon: number = 72.45,
    originLat?: number,
    originLon?: number
  ): Promise<any> {
    try {
      const formData = new FormData();
      if (typeof demoFilenameOrFile === 'string') {
        formData.append('demo_filename', demoFilenameOrFile);
      } else {
        formData.append('file', demoFilenameOrFile);
      }
      formData.append('center_lat', String(centerLat));
      formData.append('center_lon', String(centerLon));
      if (originLat !== undefined && !isNaN(originLat)) {
        formData.append('origin_lat', String(originLat));
      }
      if (originLon !== undefined && !isNaN(originLon)) {
        formData.append('origin_lon', String(originLon));
      }
      formData.append('threshold', '0.40');

      const res = await fetch(`${BACKEND_URL}/api/detect-sar`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(15000)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return SAR_DETECTION_MOCK;
  },

  async runEODetection(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${BACKEND_URL}/api/detect-eo`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(60000),
      });
      if (res.ok) {
        return await res.json();
      }
      const errJson = await res.json().catch(() => null);
      const detail = errJson?.detail || `Server error ${res.status}`;
      return { error: true, message: detail, status: res.status };
    } catch (err: any) {
      return { error: true, message: err?.message || 'Network error' };
    }
  },

  getPDFDownloadUrl(spillId: string = 'SPILL_001'): string {
    return `${BACKEND_URL}/api/scenario/${spillId}/export-pdf`;
  },

  async getDataSources(): Promise<DataSourceStatus[]> {
    return DATA_SOURCES;
  },

  async getModelStatuses(): Promise<ModelStatus[]> {
    return AI_MODELS;
  }
};
