import React, { useState } from 'react';
import { Settings, Check } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [themeMode, setThemeMode] = useState<'DARK_NAUTICAL' | 'TACTICAL_HIGH_CONTRAST'>('DARK_NAUTICAL');
  const [attributionThreshold, setAttributionThreshold] = useState<number>(70);
  const [autoSyncTelemetry, setAutoSyncTelemetry] = useState<boolean>(true);
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);

  const handleSave = () => {
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  return (
    <div className="w-full h-[calc(100vh-2.75rem)] overflow-y-auto p-6 bg-navy-900 text-ink-primary select-none font-sans custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-edge-dark pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-navy-700 border border-edge-dark text-cyan-brand">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-ink-primary uppercase">
                System Configurations & Preferences
              </h1>
              <p className="text-xs text-ink-secondary mt-0.5">
                Configure geospatial digital twin parameters, attribution thresholds, and data stream intervals.
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded bg-cyan-brand hover:bg-cyan-bright text-navy-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            {showSavedToast ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{showSavedToast ? 'Config Saved' : 'Save Changes'}</span>
          </button>
        </div>

        {/* Form Groups */}
        <div className="space-y-4 text-xs">
          {/* 1. Map Preferences */}
          <div className="p-4 rounded bg-navy-800 border border-edge-dark space-y-3">
            <span className="font-semibold text-xs uppercase tracking-wider text-ink-secondary block">
              Cartographic & Basemap Display
            </span>
            <div className="space-y-3">
              <label className="flex items-center justify-between text-ink-secondary">
                <span>Nautical Palette Theme</span>
                <select
                  value={themeMode}
                  onChange={(e) => setThemeMode(e.target.value as any)}
                  className="bg-navy-900 border border-edge-dark rounded px-3 py-1 text-ink-primary text-xs outline-none focus:border-cyan-brand"
                >
                  <option value="DARK_NAUTICAL">Dark Nautical Operations (Default)</option>
                  <option value="TACTICAL_HIGH_CONTRAST">Tactical High Contrast GIS</option>
                </select>
              </label>

              <label className="flex items-center justify-between text-ink-secondary">
                <span>Auto-refresh real-time AIS bursts (15s)</span>
                <input
                  type="checkbox"
                  checked={autoSyncTelemetry}
                  onChange={(e) => setAutoSyncTelemetry(e.target.checked)}
                  className="rounded bg-navy-900 border-edge-dark text-cyan-brand focus:ring-0"
                />
              </label>
            </div>
          </div>

          {/* 2. Attribution Engine Thresholds */}
          <div className="p-4 rounded bg-navy-800 border border-edge-dark space-y-3">
            <span className="font-semibold text-xs uppercase tracking-wider text-ink-secondary block">
              Forensic Attribution Engine Thresholds
            </span>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-ink-secondary mb-1">
                  <span>High-Priority Investigation Threshold Score</span>
                  <span className="text-cyan-brand font-mono font-bold">{attributionThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={attributionThreshold}
                  onChange={(e) => setAttributionThreshold(Number(e.target.value))}
                  className="w-full h-1.5 bg-navy-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="text-[11px] text-ink-muted block mt-1">
                  Vessels exceeding this composite score trigger immediate Coast Guard alert dispatch.
                </span>
              </div>
            </div>
          </div>

          {/* 3. Agency Integration */}
          <div className="p-4 rounded bg-navy-800 border border-edge-dark space-y-2">
            <span className="font-semibold text-xs uppercase tracking-wider text-ink-secondary block">
              Authority Endpoints
            </span>
            <div className="text-ink-muted text-xs leading-relaxed">
              Configured for automatic secure dossier transmittal to Indian Coast Guard Regional HQ (Mumbai) and Maharashtra Pollution Control Board (MPCB) API gateways.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
