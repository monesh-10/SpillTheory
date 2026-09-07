import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Ship, 
  AlertTriangle, 
  Satellite, 
  RotateCcw, 
  TrendingUp, 
  FileText, 
  Eye, 
  X,
  Compass
} from 'lucide-react';
import { NavigationPage } from './NavigationRail';
import { MapLayerState, Incident, Vessel } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: NavigationPage) => void;
  onSelectIncident: (incident: Incident) => void;
  onSelectVessel: (vessel: Vessel) => void;
  onToggleLayer: (layerKey: keyof MapLayerState) => void;
  incidents: Incident[];
  vessels: Vessel[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectIncident,
  onSelectVessel,
  onToggleLayer,
  incidents,
  vessels,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Actions list
  const systemActions = [
    { label: 'Go to Command Center', icon: Compass, action: () => onNavigate('overview') },
    { label: 'Go to SAR Satellite Detection', icon: Satellite, action: () => onNavigate('sar-detection') },
    { label: 'Go to AIS Forensic Attribution', icon: Ship, action: () => onNavigate('attribution') },
    { label: 'Go to Spill Drift Forecast Model', icon: TrendingUp, action: () => onNavigate('forecast') },
    { label: 'Generate Legal Investigation Dossier', icon: FileText, action: () => onNavigate('reports') },
    { label: 'Toggle AIS Vessels Layer', icon: Eye, action: () => onToggleLayer('aisVessels') },
    { label: 'Toggle Hindcast Trajectory', icon: RotateCcw, action: () => onToggleLayer('hindcastTrajectory') },
    { label: 'Toggle Shoreline Risk Zones', icon: AlertTriangle, action: () => onToggleLayer('shorelineRisk') },
  ];

  const filteredActions = systemActions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));
  const filteredVessels = vessels.filter(v => 
    v.name.toLowerCase().includes(query.toLowerCase()) || 
    v.imo.includes(query) ||
    v.type.toLowerCase().includes(query.toLowerCase())
  );
  const filteredIncidents = incidents.filter(i => 
    i.id.toLowerCase().includes(query.toLowerCase()) ||
    i.locationName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 p-4 font-sans select-none">
      <div className="w-full max-w-xl bg-white dark:bg-[#272E36] border border-[#CBCBCB] dark:border-[#353D46] rounded-xl shadow-2xl overflow-hidden animate-in fade-in">
        {/* Search Input */}
        <div className="p-3 border-b border-[#CBCBCB] dark:border-[#353D46] bg-[#FFFFE3]/50 dark:bg-[#1F242A] flex items-center gap-3">
          <Search className="w-4 h-4 text-[#6D8196]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, vessels (MT OCEAN STAR), incidents (OCN-042)..."
            className="w-full bg-transparent border-none outline-none text-[#4A4A4A] dark:text-[#FFFFE3] placeholder-[#6D8196]/60 dark:placeholder-[#CBCBCB]/60 text-xs"
          />
          <button onClick={onClose} className="text-[#6D8196] hover:text-[#4A4A4A] dark:text-[#CBCBCB] dark:hover:text-[#FFFFE3] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3 custom-scrollbar text-xs">
          {/* System Actions */}
          {filteredActions.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] uppercase text-[#6D8196] dark:text-[#CBCBCB] font-semibold tracking-wider">Quick Actions</div>
              {filteredActions.map((act, i) => {
                const Icon = act.icon;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      act.action();
                      onClose();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 hover:bg-[#FFFFE3] dark:hover:bg-[#1F242A] text-[#4A4A4A] dark:text-[#CBCBCB] hover:text-[#4A4A4A] dark:hover:text-[#FFFFE3] transition-colors text-left cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5 text-[#6D8196]" />
                    <span>{act.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Suspect Vessels */}
          {filteredVessels.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] uppercase text-[#6D8196] dark:text-[#CBCBCB] font-semibold tracking-wider">Suspect Vessels</div>
              {filteredVessels.map((ves) => (
                <button
                  key={ves.id}
                  onClick={() => {
                    onSelectVessel(ves);
                    onNavigate('overview');
                    onClose();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between hover:bg-[#FFFFE3] dark:hover:bg-[#1F242A] text-[#4A4A4A] dark:text-[#CBCBCB] hover:text-[#4A4A4A] dark:hover:text-[#FFFFE3] transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Ship className="w-3.5 h-3.5 text-[#D9534F]" />
                    <span className="font-semibold text-[#4A4A4A] dark:text-[#FFFFE3]">{ves.name}</span>
                    <span className="text-[11px] text-[#6D8196] dark:text-[#CBCBCB] font-mono">· IMO {ves.imo}</span>
                  </div>
                  <span className="text-[11px] text-[#D9534F] font-mono font-semibold">{ves.attributionScore}% Score</span>
                </button>
              ))}
            </div>
          )}

          {/* Incidents */}
          {filteredIncidents.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] uppercase text-[#6D8196] dark:text-[#CBCBCB] font-semibold tracking-wider">Incidents</div>
              {filteredIncidents.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => {
                    onSelectIncident(inc);
                    onNavigate('overview');
                    onClose();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between hover:bg-[#FFFFE3] dark:hover:bg-[#1F242A] text-[#4A4A4A] dark:text-[#CBCBCB] hover:text-[#4A4A4A] dark:hover:text-[#FFFFE3] transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D9822B]" />
                    <span className="font-semibold font-mono text-[#6D8196] dark:text-[#FFFFE3]">{inc.id}</span>
                    <span className="text-xs text-[#6D8196] dark:text-[#CBCBCB]">({inc.locationName})</span>
                  </div>
                  <span className="text-xs text-[#D9534F] font-mono font-semibold">{inc.slickAreaKm2} km²</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-[#CBCBCB] dark:border-[#353D46] bg-[#FFFFE3]/40 dark:bg-[#1F242A] flex items-center justify-between text-[11px] text-[#6D8196] dark:text-[#CBCBCB]">
          <span>Navigation: Use arrow keys or click</span>
          <span>ESC to dismiss</span>
        </div>
      </div>
    </div>
  );
};
