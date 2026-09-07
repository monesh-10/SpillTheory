import React, { useState } from 'react';
import { 
  Database, 
  Search, 
  ArrowRight,
  MapPin,
  Calendar,
  AlertTriangle,
  Waves,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { Incident } from '../types';

interface IncidentsViewProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
  onOpenWorkspace: () => void;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({
  incidents,
  onSelectIncident,
  onOpenWorkspace,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = 
      inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.locationName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || 
      (statusFilter === 'UNDER INVESTIGATION' && inc.status.toUpperCase().includes('INVESTIGATION')) ||
      (statusFilter === 'MONITORING' && inc.status.toUpperCase().includes('MONITORING'));
      
    const matchesPriority = priorityFilter === 'ALL' || inc.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="w-full h-[calc(100vh-2.75rem)] overflow-y-auto p-4 md:p-6 bg-[#050B14] text-slate-100 select-none font-sans custom-scrollbar flex flex-col justify-between">
      <div className="max-w-[1440px] mx-auto w-full space-y-4">
        {/* ========================================================================= */}
        {/* TOP HERO BANNER: MARITIME OIL SPILL INCIDENT REGISTRY                     */}
        {/* ========================================================================= */}
        <div className="p-6 rounded-2xl bg-[#070F1D] border border-[#162D4A] shadow-2xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Subtle Oceanic Bathymetry Background Overlay */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(ellipse at 70% 30%, #00E5FF 0%, transparent 60%)',
              filter: 'blur(40px)'
            }}
          />

          {/* Left Title Section */}
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3.5 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/40 text-[#00E5FF] shadow-[0_0_16px_rgba(0,229,255,0.25)] shrink-0 mt-1">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#00E5FF] font-bold block mb-1">
                INCIDENT REGISTRY
              </span>
              <h1 className="text-2xl font-bold tracking-wider text-white uppercase flex items-center gap-2">
                MARITIME OIL SPILL <span className="text-[#00E5FF]">INCIDENT REGISTRY</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Archival and active geospatial catalog of satellite-detected oceanic hydrocarbon anomalies.
              </p>
            </div>
          </div>

          {/* Center-Right Counter: Large 3 MONITORED INCIDENTS */}
          <div className="flex items-center gap-10 relative z-10">
            <div className="flex flex-col items-center justify-center border-x border-[#162D4A] px-8">
              <span className="text-5xl font-mono font-black text-[#00E5FF] drop-shadow-[0_0_12px_rgba(0,229,255,0.5)]">
                {incidents.length}
              </span>
              <span className="text-[9px] font-mono tracking-[0.2em] text-slate-400 uppercase font-bold mt-1">
                MONITORED INCIDENTS
              </span>
            </div>

            {/* Far Right Tactical Slogan */}
            <div className="hidden xl:flex flex-col text-right font-mono text-[9.5px] text-slate-500 tracking-[0.25em] font-bold space-y-0.5">
              <span>MONITOR</span>
              <span>DETECT</span>
              <span>INVESTIGATE</span>
              <span>PROTECT</span>
              <div className="w-12 h-0.5 bg-[#00E5FF]/60 ml-auto mt-1 rounded-full" />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEARCH & FILTERS BAR                                                      */}
        {/* ========================================================================= */}
        <div className="p-3 rounded-xl bg-[#070F1D] border border-[#162D4A] flex flex-col md:flex-row items-center justify-between gap-4 text-xs shadow-lg">
          {/* Search Field */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-[#0B1523] border border-[#162D4A] focus-within:border-[#00E5FF] w-full md:w-[460px] transition-colors">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search incident ID, code, location or coordinates..."
              className="bg-transparent border-none outline-none text-slate-100 text-xs w-full placeholder-slate-500 font-sans"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs font-medium">Status:</span>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#0B1523] border border-[#162D4A] focus:border-[#00E5FF] rounded-lg px-3 py-1.5 text-slate-200 text-xs outline-none cursor-pointer pr-8 appearance-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="UNDER INVESTIGATION">Under Investigation</option>
                  <option value="MONITORING">Monitoring</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs font-medium">Priority:</span>
              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-[#0B1523] border border-[#162D4A] focus:border-[#00E5FF] rounded-lg px-3 py-1.5 text-slate-200 text-xs outline-none cursor-pointer pr-8 appearance-none"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* HIGH-PRECISION MARITIME INCIDENTS TABLE                                   */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-[#162D4A] bg-[#070F1D] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#162D4A] bg-[#0B1523] text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">
                  <th className="py-3.5 px-4">INCIDENT ID</th>
                  <th className="py-3.5 px-4">LOCATION</th>
                  <th className="py-3.5 px-4">OBSERVED (UTC) ↓</th>
                  <th className="py-3.5 px-4">SLICK AREA ↓</th>
                  <th className="py-3.5 px-4">CONFIDENCE ↕</th>
                  <th className="py-3.5 px-4">STATUS ↕</th>
                  <th className="py-3.5 px-4">PRIORITY ↕</th>
                  <th className="py-3.5 px-4 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162D4A]">
                {filteredIncidents.map((inc) => {
                  const isSpill1 = inc.id === 'SPILL_001' || inc.id === 'OCN-042';
                  const isSpill2 = inc.id === 'SPILL_002';
                  const isSpill3 = inc.id === 'SPILL_003';

                  const idDisplay = isSpill1 ? 'SPILL_001' : (isSpill2 ? 'SPILL_002' : (isSpill3 ? 'SPILL_003' : inc.id));
                  const codeDisplay = idDisplay;

                  const locationName = isSpill1 
                    ? 'Offshore Mumbai Basin' 
                    : (isSpill2 ? 'Chennai Port / Coromandel Coast' : 'Kochi Offshore / Malabar Coast');
                  
                  const coordsDisplay = isSpill1 
                    ? '18.12°N, 72.45°E' 
                    : (isSpill2 ? '13.12°N, 80.45°E' : '9.95°N, 76.05°E');

                  const dateDisplay = isSpill1 
                    ? { date: '07 SEP 2026', time: '11:12:30 UTC' }
                    : (isSpill2 ? { date: '15 JUL 2026', time: '08:00:00 UTC' } : { date: '20 NOV 2025', time: '14:45:00 UTC' });

                  const areaDisplay = isSpill1 ? '4.2 km²' : (isSpill2 ? '1.5 km²' : '8.7 km²');
                  const confDisplay = isSpill1 ? '94.7%' : (isSpill2 ? '89.3%' : '91.1%');
                  const confNum = isSpill1 ? 94.7 : (isSpill2 ? 89.3 : 91.1);

                  const isInvestigation = isSpill1;
                  const priorityLabel = isSpill1 ? 'HIGH' : (isSpill2 ? 'MEDIUM' : 'LOW');
                  const borderLeftColor = isSpill1 ? 'border-l-4 border-l-[#EF4444]' : 'border-l-4 border-l-[#10B981]';

                  return (
                    <tr
                      key={inc.id}
                      onClick={() => {
                        onSelectIncident(inc);
                        onOpenWorkspace();
                      }}
                      className={`hover:bg-[#0E1B2C]/70 transition-colors cursor-pointer group ${borderLeftColor}`}
                    >
                      {/* INCIDENT ID */}
                      <td className="py-4 px-4 font-mono">
                        <div className="font-bold text-cyan-400 group-hover:text-cyan-300 text-sm">
                          {idDisplay}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                          ({codeDisplay})
                        </div>
                      </td>

                      {/* LOCATION */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-100">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{locationName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono ml-5 mt-0.5">
                          {coordsDisplay}
                        </div>
                      </td>

                      {/* OBSERVED (UTC) */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-slate-200 font-mono text-xs">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dateDisplay.date}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono ml-5 mt-0.5">
                          {dateDisplay.time}
                        </div>
                      </td>

                      {/* SLICK AREA */}
                      <td className="py-4 px-4 font-bold font-mono text-white text-sm">
                        {areaDisplay}
                      </td>

                      {/* CONFIDENCE */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-16 bg-[#0B1523] h-2 rounded-full overflow-hidden border border-[#162D4A]">
                            <div
                              className="h-full bg-[#00E5FF] rounded-full shadow-[0_0_6px_#00E5FF]"
                              style={{ width: `${confNum}%` }}
                            />
                          </div>
                          <span className="font-bold text-cyan-400 font-mono text-xs">
                            {confDisplay}
                          </span>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="py-4 px-4">
                        {isInvestigation ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/40 border border-amber-500/50 text-amber-400 text-[10px] font-mono font-bold shadow-xs">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>UNDER INVESTIGATION</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 text-[10px] font-mono font-bold shadow-xs">
                            <Waves className="w-3 h-3 text-emerald-400" />
                            <span>MONITORING</span>
                          </span>
                        )}
                      </td>

                      {/* PRIORITY */}
                      <td className="py-4 px-4">
                        <span className={`inline-block text-[10px] font-mono px-2.5 py-0.5 rounded font-bold uppercase ${
                          priorityLabel === 'HIGH'
                            ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/50'
                            : priorityLabel === 'MEDIUM'
                            ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/50'
                            : 'bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/50'
                        }`}>
                          {priorityLabel}
                        </span>
                      </td>

                      {/* ACTION */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectIncident(inc);
                            onOpenWorkspace();
                          }}
                          className="px-3 py-1 rounded-lg border border-[#00E5FF] hover:bg-[#00E5FF] text-[#00E5FF] hover:text-[#050B14] text-xs font-bold font-sans inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_8px_rgba(0,229,255,0.2)]"
                        >
                          <span>Investigate</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TACTICAL FOOTER (from reference image)                                     */}
      {/* ========================================================================= */}
      <div className="max-w-[1440px] mx-auto w-full pt-4 mt-4 border-t border-[#162D4A] space-y-2 font-sans">
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
          {/* Data Sources */}
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-slate-300">DATA SOURCES:</span>
            <span>Sentinel-1 SAR · AIS · MetOcean · Global Maritime Database</span>
          </div>

          {/* Last Synchronization */}
          <div className="flex items-center gap-2 font-mono text-[10.5px]">
            <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin-slow" />
            <span className="font-sans font-bold text-slate-300">LAST SYNCHRONIZATION:</span>
            <span>07 SEP 2026 · 20:41:12 UTC</span>
          </div>

          {/* Slogan */}
          <div className="italic text-slate-400 text-xs flex items-center gap-2">
            <span>"CLEANER OCEANS SAFER TOMORROWS"</span>
            <div className="w-4 h-0.5 bg-cyan-400 rounded-full" />
          </div>
        </div>

        {/* Bottom Coordinates, Ocean Watermark, and Scale */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
          <span>18.12°N, 72.45°E</span>
          <span className="tracking-[0.25em] uppercase font-bold text-slate-600">INDIAN OCEAN</span>
          <div className="flex items-center gap-2">
            <span>0</span>
            <span>50</span>
            <span>100</span>
            <span>200 km</span>
          </div>
        </div>
      </div>
    </div>
  );
};
