import React from 'react';
import { Cpu } from 'lucide-react';
import { ModelStatus } from '../types';

interface ModelsViewProps {
  models: ModelStatus[];
}

export const ModelsView: React.FC<ModelsViewProps> = ({ models }) => {
  return (
    <div className="w-full h-[calc(100vh-2.75rem)] overflow-y-auto p-6 bg-navy-900 text-ink-primary select-none font-sans custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-edge-dark pb-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-navy-700 border border-edge-dark text-cyan-brand">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-wide text-ink-primary uppercase">
                  AI Model Benchmarks & Inference Health
                </h1>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Production neural network endpoints for U-Net segmentation, Bayesian vessel attribution, and 4D Lagrangian drift.
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs font-semibold px-2.5 py-1 rounded bg-navy-800 border border-edge-dark text-cyan-brand">
            3 ACTIVE ENGINES
          </div>
        </div>

        {/* Model Cards */}
        <div className="space-y-3">
          {models.map((mod) => (
            <div key={mod.id} className="p-4 rounded bg-navy-800 border border-edge-dark space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-sm text-ink-primary">{mod.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-700 border border-edge-dark text-cyan-brand">
                      {mod.version}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    {mod.role}
                  </p>
                </div>

                <span className="text-[10px] px-2 py-0.5 rounded bg-navy-700 text-cyan-brand border border-cyan-brand/30 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-brand" />
                  {mod.status}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-xs border-t border-edge-dark">
                <div className="p-2.5 bg-navy-900 rounded border border-edge-dark">
                  <span className="text-[10px] text-ink-muted block uppercase tracking-wider">Performance Metric</span>
                  <span className="text-cyan-brand font-mono font-semibold">{mod.confidenceMetric}</span>
                </div>
                <div className="p-2.5 bg-navy-900 rounded border border-edge-dark">
                  <span className="text-[10px] text-ink-muted block uppercase tracking-wider">Average Latency</span>
                  <span className="text-cyan-brand font-mono font-semibold">{mod.avgInferenceMs} ms</span>
                </div>
                <div className="p-2.5 bg-navy-900 rounded border border-edge-dark">
                  <span className="text-[10px] text-ink-muted block uppercase tracking-wider">Framework</span>
                  <span className="text-ink-primary">{mod.framework}</span>
                </div>
                <div className="p-2.5 bg-navy-900 rounded border border-edge-dark">
                  <span className="text-[10px] text-ink-muted block uppercase tracking-wider">Last Inferred</span>
                  <span className="text-ink-primary font-mono">{mod.lastInferenceUtc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
