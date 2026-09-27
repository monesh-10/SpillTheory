import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  Clock, 
  ChevronDown,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { Incident } from '../types';
import { apiService } from '../services/api';
import { SpillTheoryLogo } from './SpillTheoryLogo';

interface CommandBarProps {
  currentIncident: Incident;
  allIncidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
  onOpenNotifications: () => void;
  onOpenCommandPalette: () => void;
  onRunFullInvestigation: () => void;
  unreadCount: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  currentIncident,
  allIncidents,
  onSelectIncident,
  onOpenNotifications,
  onOpenCommandPalette,
  onRunFullInvestigation,
  unreadCount,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [utcTime, setUtcTime] = useState<string>('');
  const [incidentMenuOpen, setIncidentMenuOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [backendLatency, setBackendLatency] = useState<number>(14);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = now.toUTCString().slice(5, 16).toUpperCase();
      const timePart = now.toTimeString().slice(0, 8);
      setUtcTime(`${datePart} · ${timePart} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    apiService.checkBackendHealth().then(res => {
      setBackendOnline(res.online);
      if (res.online) setBackendLatency(res.latencyMs);
    });
    const timer = setInterval(() => {
      apiService.checkBackendHealth().then(res => {
        setBackendOnline(res.online);
        if (res.online) setBackendLatency(res.latencyMs);
      });
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-11 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 flex items-center justify-between select-none z-30 sticky top-0 text-slate-100 font-sans transition-colors duration-200">
      {/* Left: Brand Logo + System Status */}
      <div className="flex items-center gap-3">
        <SpillTheoryLogo size="md" showWordmark={true} />

        <div className="h-3 w-px bg-slate-800 hidden sm:block" />

        {/* Backend Live Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px]">
          <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          <span className="text-slate-400 font-mono text-[10px]">API</span>
          <span className={`font-mono text-[10px] ${backendOnline ? 'text-slate-200 font-medium' : 'text-rose-400'}`}>
            {backendOnline ? `${backendLatency}ms` : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Center: Minimal Incident Selector */}
      <div className="relative">
        <button
          onClick={() => setIncidentMenuOpen(!incidentMenuOpen)}
          className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-200 transition-colors"
        >
          <span className="text-slate-400 text-[11px]">Incident:</span>
          <span className="font-semibold text-cyan-400 font-mono">{currentIncident.id}</span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">{currentIncident.name.split('-')[0]}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${incidentMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {incidentMenuOpen && (
          <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-80 bg-slate-950 border border-slate-800 rounded-lg shadow-xl p-1 z-50 animate-in fade-in">
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
              Select Incident Scenario
            </div>
            {allIncidents.map(inc => (
              <button
                key={inc.id}
                onClick={() => {
                  onSelectIncident(inc);
                  setIncidentMenuOpen(false);
                }}
                className={`w-full text-left px-2.5 py-2 rounded-md flex items-center justify-between text-xs transition-colors ${
                  inc.id === currentIncident.id
                    ? 'bg-cyan-500/10 text-cyan-300 font-medium'
                    : 'hover:bg-slate-900 text-slate-300'
                }`}
              >
                <div>
                  <div className="font-medium font-mono text-slate-200">{inc.id} · {inc.name}</div>
                  <div className="text-[11px] text-slate-400">{inc.locationName}</div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-mono">
                  {inc.slickAreaKm2} km²
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Quick actions, clock, theme toggle, demo CTA */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenCommandPalette}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-slate-300 text-xs transition-colors"
          title="Search or press Ctrl+K"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Quick Find <kbd className="text-[10px] font-mono bg-slate-950 px-1 py-0.5 rounded text-slate-400 border border-slate-800">Ctrl K</kbd></span>
        </button>

        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-md bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-300" />
            )}
          </button>
        )}

        {/* Primary Demo Action */}
        <button
          onClick={onRunFullInvestigation}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
          <span>Investigation Demo</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-1.5 rounded-md hover:bg-slate-900 text-slate-300 transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
          )}
        </button>

        {/* Live UTC Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span className="font-mono text-[11px] tabular-nums text-slate-300">{utcTime}</span>
        </div>
      </div>
    </header>
  );
};

