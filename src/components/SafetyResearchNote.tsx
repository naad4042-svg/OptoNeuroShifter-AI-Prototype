import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, FileText, Info } from 'lucide-react';

export const SafetyResearchNote: React.FC = () => {
  return (
    <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100/90 border border-amber-300/60 text-amber-800 shrink-0 mt-0.5 sm:mt-0">
            <ShieldAlert className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-amber-900 tracking-tight">
                RESEARCH PROTOTYPE &amp; SIMULATION NOTICE
              </h2>
              <span className="inline-flex items-center px-2 py-0.2 rounded text-[11px] font-semibold bg-amber-200/70 text-amber-900">
                Non-Clinical Benchmark
              </span>
            </div>
            <p className="text-xs text-amber-900/90 mt-0.5 leading-relaxed font-medium">
              This prototype demonstrates AI-based environmental interpretation and simulated neural encoding. Neural stimulation and clinical use require preclinical and clinical validation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 shrink-0 self-end sm:self-center bg-white/70 px-3 py-1.5 rounded-lg border border-amber-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>In-Silico Simulation Active</span>
        </div>

      </div>
    </div>
  );
};
