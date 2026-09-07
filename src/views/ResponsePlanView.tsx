import React, { useState } from 'react';
import { 
  LifeBuoy, 
  CheckSquare, 
  Square, 
  Send
} from 'lucide-react';
import { ShorelineRiskZone, Incident } from '../types';

interface ResponsePlanViewProps {
  shorelineRisk: ShorelineRiskZone;
  incident: Incident;
  onOpenWorkspace: () => void;
}

export const ResponsePlanView: React.FC<ResponsePlanViewProps> = ({
  shorelineRisk,
  incident,
}) => {
  const [actions, setActions] = useState(shorelineRisk.immediateActions);
  const [deploymentStatus, setDeploymentStatus] = useState<'IDLE' | 'DEPLOYING' | 'DEPLOYED'>('IDLE');

  const toggleAction = (id: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  };

  const completedCount = actions.filter(a => a.completed).length;

  const handleSimulateDispatch = () => {
    setDeploymentStatus('DEPLOYING');
    setTimeout(() => {
      setDeploymentStatus('DEPLOYED');
    }, 1200);
  };

  return (
    <div className="w-full h-[calc(100vh-2.75rem)] overflow-y-auto p-6 bg-navy-900 text-ink-primary select-none font-sans custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-edge-dark pb-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-navy-700 border border-edge-dark text-cyan-brand">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-wide text-ink-primary uppercase">
                  NOSDCP Tier-1 Coastal Containment & Response Plan
                </h1>
                <p className="text-xs text-ink-secondary mt-0.5">
                  National Oil Spill Disaster Contingency Plan operational mitigation protocols and asset dispatch.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted">Protocol Status:</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-navy-800 border border-semantic-amber/40 text-semantic-amber">
              {shorelineRisk.protocolTier}
            </span>
          </div>
        </div>

        {/* Shoreline Risk Alert Banner */}
        <div className="p-4 rounded bg-navy-800 border border-semantic-amber/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-semantic-amber" />
              <span className="text-sm font-semibold text-semantic-amber uppercase tracking-wide">
                Critical Shoreline Threat: {shorelineRisk.name}
              </span>
            </div>
            <span className="text-xs font-semibold text-semantic-red bg-semantic-red/15 px-2.5 py-0.5 rounded border border-semantic-red/30">
              VULNERABILITY INDEX: EVT {shorelineRisk.vulnerabilityIndex}/10
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-3 bg-navy-900 rounded border border-edge-dark">
              <span className="text-[10px] text-ink-muted block uppercase tracking-wider">Offshore Distance</span>
              <span className="text-base font-bold font-mono text-ink-primary">{shorelineRisk.distanceOffshoreKm} km</span>
            </div>
            <div className="p-3 bg-navy-900 rounded border border-edge-dark">
              <span className="text-[10px] text-ink-muted block uppercase tracking-wider">Projected ETA</span>
              <span className="text-base font-bold font-mono text-semantic-amber">~{shorelineRisk.projectedEtaHours} hrs</span>
            </div>
            <div className="p-3 bg-navy-900 rounded border border-edge-dark">
              <span className="text-[10px] text-ink-muted block uppercase tracking-wider">Action Window</span>
              <span className="text-base font-bold text-cyan-brand">Next 6–12 Hours</span>
            </div>
            <div className="p-3 bg-navy-900 rounded border border-edge-dark">
              <span className="text-[10px] text-ink-muted block uppercase tracking-wider">Checklist Progress</span>
              <span className="text-base font-bold font-mono text-cyan-brand">
                {completedCount} / {actions.length} Completed
              </span>
            </div>
          </div>
        </div>

        {/* 2 Columns: Action Plan Checklist (Left) + Vulnerable Ecological & Economic Assets (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Immediate Response Actions Checklist */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded bg-navy-800 border border-edge-dark space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                  Tactical Operational Checklist
                </span>
                <span className="text-xs text-ink-muted">Click actions to mark complete</span>
              </div>

              <div className="space-y-2">
                {actions.map((act) => (
                  <div
                    key={act.id}
                    onClick={() => toggleAction(act.id)}
                    className={`p-3 rounded border flex items-start gap-3 cursor-pointer transition-colors ${
                      act.completed
                        ? 'bg-navy-900/60 border-edge-dark text-ink-muted'
                        : 'bg-navy-900 border-edge-dark hover:border-edge-light text-ink-primary'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {act.completed ? (
                        <CheckSquare className="w-4 h-4 text-cyan-brand" />
                      ) : (
                        <Square className="w-4 h-4 text-ink-muted" />
                      )}
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className={act.completed ? 'line-through text-ink-muted' : 'font-medium text-ink-primary'}>
                          {act.text}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase shrink-0 ${
                          act.priority === 'CRITICAL'
                            ? 'bg-semantic-red/15 text-semantic-red border border-semantic-red/30'
                            : 'bg-semantic-amber/15 text-semantic-amber border border-semantic-amber/30'
                        }`}>
                          {act.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Asset Deployment CTA */}
              <div className="pt-3 border-t border-edge-dark flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-ink-muted">
                  Coordination: Coast Guard HQ (West), MPCB & Raigad Collectorate
                </span>
                <button
                  onClick={handleSimulateDispatch}
                  disabled={deploymentStatus === 'DEPLOYED'}
                  className={`px-4 py-2 rounded text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    deploymentStatus === 'DEPLOYED'
                      ? 'bg-navy-700 border border-edge-dark text-cyan-brand cursor-default'
                      : 'bg-cyan-brand hover:bg-cyan-bright text-navy-950 shadow-sm'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {deploymentStatus === 'DEPLOYING'
                      ? 'Dispatching Interceptors...'
                      : deploymentStatus === 'DEPLOYED'
                      ? 'Assets Dispatched (ICG C-432)'
                      : 'Dispatch Containment Squadron'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Coastal Assets Vulnerability Matrix */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded bg-navy-800 border border-edge-dark space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary block">
                Vulnerable Coastal Assets
              </span>

              <div className="space-y-2 text-xs">
                {shorelineRisk.vulnerableAssets.map((asset, i) => (
                  <div key={i} className="p-3 bg-navy-900 rounded border border-edge-dark space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-primary">{asset.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                        asset.sensitivity === 'CRITICAL'
                          ? 'bg-semantic-red/15 text-semantic-red border border-semantic-red/30'
                          : 'bg-semantic-amber/15 text-semantic-amber border border-semantic-amber/30'
                      }`}>
                        {asset.sensitivity}
                      </span>
                    </div>
                    <div className="text-xs text-ink-muted flex items-center justify-between pt-0.5">
                      <span>Sector: {asset.type}</span>
                      <span className="text-cyan-brand font-medium">Priority Protection</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Protective Measures Note */}
              <div className="p-3 rounded bg-navy-900 border border-edge-dark text-xs text-ink-secondary space-y-1">
                <div className="text-cyan-brand font-semibold text-[10px] uppercase tracking-wider">Containment Defense Geometry:</div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Deploying chevron boom configuration at Rajpuri Creek mouth to deflect oil toward rocky shoreline collection points, sparing estuarine oyster beds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
