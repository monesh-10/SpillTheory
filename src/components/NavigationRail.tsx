import React from 'react';
import {
  Compass,
  Satellite,
  Layers,
  Ship,
  BarChart2,
  Database,
  FileText,
  Clock,
  Settings
} from 'lucide-react';

export type NavigationPage = 
  | 'overview' 
  | 'live-twin' 
  | 'incidents' 
  | 'sar-detection' 
  | 'eo-detection'
  | 'hindcast' 
  | 'attribution' 
  | 'forecast' 
  | 'impact' 
  | 'response-plan' 
  | 'reports' 
  | 'data-sources' 
  | 'models' 
  | 'settings'
  | 'landing';

interface NavigationRailProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

interface NavItem {
  id: NavigationPage;
  activeMatches: NavigationPage[];
  label: string;
  icon: React.ElementType;
}

const TACTICAL_NAV_ITEMS: NavItem[] = [
  { 
    id: 'overview', 
    activeMatches: ['overview', 'live-twin'], 
    label: 'Map', 
    icon: Compass 
  },
  { 
    id: 'sar-detection', 
    activeMatches: ['sar-detection'], 
    label: 'SAR', 
    icon: Satellite 
  },
  { 
    id: 'eo-detection', 
    activeMatches: ['eo-detection'], 
    label: 'EO', 
    icon: Layers 
  },
  { 
    id: 'attribution', 
    activeMatches: ['attribution'], 
    label: 'AIS', 
    icon: Ship 
  },
  { 
    id: 'forecast', 
    activeMatches: ['forecast', 'impact', 'response-plan'], 
    label: 'Analysis', 
    icon: BarChart2 
  },
  { 
    id: 'incidents', 
    activeMatches: ['incidents'], 
    label: 'Incidents', 
    icon: Database 
  },
  { 
    id: 'reports', 
    activeMatches: ['reports'], 
    label: 'Reports', 
    icon: FileText 
  },
  { 
    id: 'hindcast', 
    activeMatches: ['hindcast'], 
    label: 'Timeline', 
    icon: Clock 
  },
  { 
    id: 'settings', 
    activeMatches: ['settings', 'data-sources', 'models'], 
    label: 'Settings', 
    icon: Settings 
  }
];

export const NavigationRail: React.FC<NavigationRailProps> = ({
  currentPage,
  onNavigate
}) => {
  return (
    <aside
      className="w-14 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between select-none z-20 shrink-0 h-full py-3 transition-colors duration-200"
    >
      {/* Tactical Nav Button Items */}
      <div className="flex flex-col items-center space-y-1.5 w-full px-1.5">
        {TACTICAL_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.activeMatches.includes(currentPage);

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={item.label}
              className={`w-full py-2 px-1 rounded-lg flex flex-col items-center justify-center transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'text-cyan-400 bg-cyan-500/10 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] tracking-tight leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom Status: System Online */}
      <div className="flex flex-col items-center justify-center pt-2 pb-1 border-t border-slate-800/60 text-center px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mb-1" />
        <span className="text-[9px] text-slate-500 font-mono leading-tight">
          LIVE
        </span>
      </div>
    </aside>
  );
};
