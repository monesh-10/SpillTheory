import React, { useState, useEffect } from 'react';
import { CommandBar } from './components/CommandBar';
import { NavigationRail, NavigationPage } from './components/NavigationRail';
import { DashboardView } from './views/DashboardView';
import { SpillDetectionView } from './views/SpillDetectionView';
import { VesselAttributionView } from './views/VesselAttributionView';
import { DriftForecastView } from './views/DriftForecastView';
import { IncidentsView } from './views/IncidentsView';
import { ResponsePlanView } from './views/ResponsePlanView';
import { ReportsView } from './views/ReportsView';
import { DataSourcesView } from './views/DataSourcesView';
import { ModelsView } from './views/ModelsView';
import { SettingsView } from './views/SettingsView';
import { LandingPageView } from './views/LandingPageView';
import { EODetectionView } from './views/EODetectionView';
import { CommandPalette } from './components/CommandPalette';
import { NotificationDrawer } from './components/NotificationDrawer';
import { FullInvestigationModal } from './components/FullInvestigationModal';
import { apiService } from './services/api';

import {
  ALL_INCIDENTS,
  PRIMARY_INCIDENT,
  SUSPECT_VESSELS,
  PRIMARY_HINDCAST,
  PRIMARY_METOCEAN,
  FORECAST_STEPS,
  PRIMARY_SHORELINE_RISK,
  SAR_DETECTION_MOCK,
  DATA_SOURCES,
  AI_MODELS,
  NOTIFICATIONS
} from './data/mockData';
import { Incident, Vessel, MapLayerState, HindcastResult, ForecastStep, ShorelineRiskZone, MetOceanTelemetry } from './types';

export const App: React.FC = () => {
  // Navigation & Page State (Default to 'landing' command center)
  const [currentPage, setCurrentPage] = useState<NavigationPage>('landing');
  const [navRailExpanded, setNavRailExpanded] = useState<boolean>(false);

  // Core Data States (Dynamic & Backend Synced)
  const [allIncidents, setAllIncidents] = useState<Incident[]>(ALL_INCIDENTS);
  const [currentIncident, setCurrentIncident] = useState<Incident>(PRIMARY_INCIDENT);
  const [vessels, setVessels] = useState<Vessel[]>(SUSPECT_VESSELS);
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(SUSPECT_VESSELS[0]);
  const [hindcast, setHindcast] = useState<HindcastResult>(PRIMARY_HINDCAST);
  const [forecastSteps, setForecastSteps] = useState<ForecastStep[]>(FORECAST_STEPS);
  const [shorelineRisk, setShorelineRisk] = useState<ShorelineRiskZone>(PRIMARY_SHORELINE_RISK);
  const [metocean, setMetocean] = useState<MetOceanTelemetry>(PRIMARY_METOCEAN);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  // Initial load of incidents from real FastAPI backend
  useEffect(() => {
    let mounted = true;
    apiService.getIncidents().then((incs) => {
      if (mounted && incs && incs.length > 0) {
        setAllIncidents(incs);
        setCurrentIncident(incs[0]);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Fetch full scenario bundle whenever active incident changes
  useEffect(() => {
    let mounted = true;
    if (currentIncident) {
      apiService.getScenarioBundle(currentIncident.id).then((bundle) => {
        if (mounted && bundle) {
          setVessels(bundle.vessels);
          setSelectedVessel(bundle.vessels[0] || null);
          setHindcast(bundle.hindcast);
          setForecastSteps(bundle.forecastSteps);
          setShorelineRisk(bundle.shorelineRisk);
          setMetocean(bundle.metocean);
        }
      });
    }
    return () => { mounted = false; };
  }, [currentIncident?.id]);

  // Map Geospatial Layers Active State
  const [layerState, setLayerState] = useState<MapLayerState>({
    satelliteLayer: true,
    oilSlicks: true,
    aisVessels: true,
    vesselTracks: true,
    hindcastTrajectory: true,
    originProbability: true,
    forecastCone: true,
    shorelineRisk: true,
    windVectors: true,
    currentVectors: true,
  });

  // Modal / Drawer Overlays
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [investigationModalOpen, setInvestigationModalOpen] = useState(false);

  const toggleLayer = (key: keyof MapLayerState) => {
    setLayerState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('spilltheory_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('spilltheory_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      {/* Top Persistent Command Bar */}
      <CommandBar
        currentIncident={currentIncident}
        allIncidents={allIncidents}
        onSelectIncident={(inc) => {
          setCurrentIncident(inc);
          setCurrentPage('overview');
        }}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onRunFullInvestigation={() => setInvestigationModalOpen(true)}
        unreadCount={unreadNotificationsCount}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Workspace Body: Navigation Rail + Views */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Navigation Rail (Collapsible 56px/224px) */}
        {currentPage !== 'landing' && (
          <NavigationRail
            currentPage={currentPage}
            onNavigate={(page) => setCurrentPage(page)}
            expanded={navRailExpanded}
            onToggleExpand={() => setNavRailExpanded(!navRailExpanded)}
          />
        )}

        {/* Dynamic Operational Page Views */}
        <main className="flex-1 h-full overflow-hidden relative bg-slate-50 dark:bg-[#0B0F17] transition-colors duration-200">
          {currentPage === 'landing' && (
            <LandingPageView
              onEnterApp={() => setCurrentPage('overview')}
              onRunDemo={() => setInvestigationModalOpen(true)}
            />
          )}

          {(currentPage === 'overview' || currentPage === 'live-twin') && currentIncident && (
            <DashboardView
              incident={currentIncident}
              allIncidents={allIncidents}
              onSelectIncident={(inc) => setCurrentIncident(inc)}
              vessels={vessels}
              selectedVessel={selectedVessel}
              onSelectVessel={(v) => setSelectedVessel(v)}
              hindcast={hindcast}
              forecastSteps={forecastSteps}
              activeForecastStep={1}
              shorelineRisk={shorelineRisk}
              metocean={metocean}
              sarDetection={SAR_DETECTION_MOCK}
              layerState={layerState}
              onToggleLayer={toggleLayer}
              onNavigate={(page) => setCurrentPage(page)}
              theme={theme}
            />
          )}

          {currentPage === 'sar-detection' && (
            <SpillDetectionView
              detectionData={SAR_DETECTION_MOCK}
              incident={currentIncident}
              onOpenWorkspace={() => setCurrentPage('overview')}
              onSpillDetected={(newInc) => {
                setAllIncidents(prev => [newInc, ...prev.filter(i => i.id !== newInc.id)]);
                setCurrentIncident(newInc);
                setCurrentPage('overview');
              }}
            />
          )}

          {currentPage === 'eo-detection' && (
            <EODetectionView
              onOpenWorkspace={() => setCurrentPage('overview')}
              onSpillDetected={(newInc) => {
                setAllIncidents(prev => [newInc, ...prev.filter(i => i.id !== newInc.id)]);
                setCurrentIncident(newInc);
                setCurrentPage('overview');
              }}
            />
          )}

          {currentPage === 'hindcast' && currentIncident && (
            <DashboardView
              incident={currentIncident}
              allIncidents={allIncidents}
              onSelectIncident={(inc) => setCurrentIncident(inc)}
              vessels={vessels}
              selectedVessel={selectedVessel}
              onSelectVessel={(v) => setSelectedVessel(v)}
              hindcast={hindcast}
              forecastSteps={forecastSteps}
              activeForecastStep={0}
              shorelineRisk={shorelineRisk}
              metocean={metocean}
              sarDetection={SAR_DETECTION_MOCK}
              layerState={{
                ...layerState,
                hindcastTrajectory: true,
                originProbability: true,
              }}
              onToggleLayer={toggleLayer}
              onNavigate={(page) => setCurrentPage(page)}
              theme={theme}
            />
          )}

          {currentPage === 'attribution' && currentIncident && (
            <VesselAttributionView
              vessels={vessels}
              onSelectVessel={(v) => {
                setSelectedVessel(v);
                setCurrentPage('overview');
              }}
              onOpenWorkspace={() => setCurrentPage('overview')}
              onUpdateVessels={(newVessels) => {
                setVessels(newVessels);
                if (newVessels.length > 0) setSelectedVessel(newVessels[0]);
              }}
              onSelectIncident={(inc) => setCurrentIncident(inc)}
              currentIncidentCoordinates={currentIncident.coordinates}
            />
          )}

          {currentPage === 'forecast' && currentIncident && (
            <DriftForecastView
              forecastSteps={forecastSteps}
              metocean={metocean}
              incident={currentIncident}
              shorelineRisk={shorelineRisk}
              onOpenWorkspace={() => setCurrentPage('overview')}
            />
          )}

          {currentPage === 'incidents' && (
            <IncidentsView
              incidents={allIncidents}
              onSelectIncident={(inc) => {
                setCurrentIncident(inc);
                setCurrentPage('overview');
              }}
              onOpenWorkspace={() => setCurrentPage('overview')}
            />
          )}

          {(currentPage === 'response-plan' || currentPage === 'impact') && currentIncident && (
            <ResponsePlanView
              shorelineRisk={shorelineRisk}
              incident={currentIncident}
              onOpenWorkspace={() => setCurrentPage('overview')}
            />
          )}

          {currentPage === 'reports' && currentIncident && (
            <ReportsView
              incident={currentIncident}
              topVessel={vessels[0] || SUSPECT_VESSELS[0]}
              hindcast={hindcast}
              metocean={metocean}
              shorelineRisk={shorelineRisk}
            />
          )}

          {currentPage === 'data-sources' && (
            <DataSourcesView dataSources={DATA_SOURCES} />
          )}

          {currentPage === 'models' && (
            <ModelsView models={AI_MODELS} />
          )}

          {currentPage === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Command Palette Modal (Ctrl + K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(page) => setCurrentPage(page)}
        onSelectIncident={(inc) => {
          setCurrentIncident(inc);
          setCurrentPage('overview');
        }}
        onSelectVessel={(v) => {
          setSelectedVessel(v);
          setCurrentPage('overview');
        }}
        onToggleLayer={toggleLayer}
        incidents={allIncidents}
        vessels={vessels}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllNotificationsRead}
      />

      {/* 10-Step Full Investigation Demo Modal */}
      <FullInvestigationModal
        isOpen={investigationModalOpen}
        onClose={() => setInvestigationModalOpen(false)}
        incident={currentIncident || ALL_INCIDENTS[0] || PRIMARY_INCIDENT}
        topVessel={vessels[0] || SUSPECT_VESSELS[0]}
        onCompleteInvestigation={() => {
          setSelectedVessel(vessels[0] || SUSPECT_VESSELS[0]);
          setCurrentPage('overview');
        }}
      />
    </div>
  );
};

export default App;
