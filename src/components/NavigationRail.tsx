import React from 'react';
import {
  Compass,
  Satellite,
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
      className="w-[60px] bg-[#050B14] border-r border-[#162D4A] flex flex-col justify-between select-none z-20 shrink-0 h-full py-2.5 transition-colors duration-200"
    >
      {/* Tactical Nav Button Items */}
      <div className="flex flex-col items-center space-y-1 w-full">
        {TACTICAL_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.activeMatches.includes(currentPage);

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={item.label}
              className={`w-full py-2 px-1 flex flex-col items-center justify-center transition-all duration-150 relative cursor-pointer group ${
                isActive
                  ? 'text-[#00E5FF] bg-[#00E5FF]/10 border-l-2 border-[#00E5FF] shadow-[inset_0_0_12px_rgba(0,229,255,0.1)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#070F1D]'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-150 group-hover:scale-105 ${
                  isActive ? 'text-[#00E5FF] drop-shadow-[0_0_6px_rgba(0,229,255,0.5)]' : 'text-slate-400'
                }`}
              />
              <span
                className={`text-[9.5px] font-sans tracking-wide mt-1 transition-colors ${
                  isActive ? 'text-[#00E5FF] font-semibold' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom Status: System Online */}
      <div className="flex flex-col items-center justify-center pt-2 pb-1 border-t border-[#162D4A]/60 text-center px-1">
        <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981] animate-pulse mb-1" />
        <span className="text-[9px] font-sans text-slate-400 font-medium leading-tight">
          System<br />Online
        </span>
      </div>
    </aside>
  );
};
