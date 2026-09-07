import React from 'react';
import { Database, Radio, Satellite, Compass } from 'lucide-react';
import { DataSourceStatus } from '../types';

interface DataSourcesViewProps {
  dataSources: DataSourceStatus[];
}

export const DataSourcesView: React.FC<DataSourcesViewProps> = ({ dataSources }) => {
  return (
    <div className="w-full h-[calc(100vh-2.75rem)] overflow-y-auto p-6 bg-navy-900 text-ink-primary select-none font-sans custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-edge-dark pb-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-navy-700 border border-edge-dark text-cyan-brand">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-wide text-ink-primary uppercase">
                  Multi-Source Geospatial Telemetry Feeds
                </h1>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Real-time pipeline ingestion monitoring for SAR satellites, terrestrial/satellite AIS, and ocean hydrodynamic buoys.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-cyan-brand bg-navy-800 px-3 py-1.5 rounded border border-cyan-brand/30">
            <span className="w-2 h-2 rounded-full bg-cyan-brand" />
            <span className="font-semibold">All Feeds Synchronized</span>
          </div>
        </div>

        {/* Data Source Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dataSources.map((source) => (
            <div key={source.id} className="p-4 rounded bg-navy-800 border border-edge-dark space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {source.category === 'SATELLITE' ? (
                    <Satellite className="w-4 h-4 text-cyan-brand" />
                  ) : source.category === 'AIS' ? (
                    <Radio className="w-4 h-4 text-cyan-bright" />
                  ) : (
                    <Compass className="w-4 h-4 text-cyan-brand" />
                  )}
                  <h3 className="font-semibold text-xs text-ink-primary">{source.name}</h3>
                </div>

                <span className="text-[10px] px-2 py-0.5 rounded bg-navy-700 text-cyan-brand border border-cyan-brand/30 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-brand" />
                  {source.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-ink-secondary">
                  <span className="text-ink-muted">Provider:</span>
                  <span className="text-ink-primary">{source.provider}</span>
                </div>
                <div className="flex justify-between text-ink-secondary">
                  <span className="text-ink-muted">Latency:</span>
                  <span className="text-cyan-brand font-mono font-semibold">{source.latencySeconds} seconds</span>
                </div>
                <div className="flex justify-between text-ink-secondary">
                  <span className="text-ink-muted">Coverage:</span>
                  <span className="text-ink-primary">{source.coverage}</span>
                </div>
                <div className="flex justify-between text-ink-secondary">
                  <span className="text-ink-muted">Revisit / Update:</span>
                  <span className="text-ink-secondary">{source.updateFrequency}</span>
                </div>
                <div className="flex justify-between text-ink-secondary">
                  <span className="text-ink-muted">Last Sync:</span>
                  <span className="text-ink-primary font-mono">{source.lastUpdated}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
