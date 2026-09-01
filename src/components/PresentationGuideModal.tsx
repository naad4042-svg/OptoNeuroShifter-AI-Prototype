import React from 'react';
import { 
  Sparkles, 
  X, 
  BrainCircuit, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  Award, 
  AlertCircle,
  Eye,
  Radio,
  FileCheck
} from 'lucide-react';

interface PresentationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PresentationGuideModal: React.FC<PresentationGuideModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                  Healthcare AI Hackathon Pitch
                </span>
                <span className="text-xs font-semibold text-slate-500">Research Brief</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                OptoNeuroShifter: AI-Based Alternative Visual Pathway
              </h2>
            </div>
          </div>

          <button
            id="close-presentation-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-sm">
          
          {/* Section 1: Clinical Problem & Novelty */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              1. The Clinical Challenge &amp; AI Solution
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Severe retinal degeneration and optic nerve damage prevent natural visual signals from reaching the brain. 
              <strong> OptoNeuroShifter</strong> explores an alternative computational pathway: instead of attempting full pixel-level camera streaming (which overwhelms micro-electrode arrays with noise), it uses <strong>lightweight on-device AI scene understanding</strong> to isolate key navigation affordances (people, obstacles, pathways) and translate them into <strong>simplified retinotopic neural encoding patterns</strong>.
            </p>
          </div>

          {/* Section 2: Key Pipeline Highlights */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-indigo-600" />
              2. Technical &amp; Computational Highlights
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  AI Object Detection &amp; Calibrated Depth
                </div>
                <p className="text-slate-500 mt-1">
                  Edge AI detection with calibrated optical perspective estimation, outputting real-world distance units in centimeters (&lt;100 cm) and meters (≥1m).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  2D Top-Down Spatial Projection
                </div>
                <p className="text-slate-500 mt-1">
                  Transforms perspective image bounds into an egocentric coordinate map with safe passage corridor calculation.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Cortical Retinotopic Mapping (V1)
                </div>
                <p className="text-slate-500 mt-1">
                  Generates 16x16 / 32x32 micro-electrode spike burst frequencies (20-140 Hz) with phosphene perceptual simulation.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Multimodal Spatial Acoustic Cueing
                </div>
                <p className="text-slate-500 mt-1">
                  Optional stereo spatial audio synthesizer provides immediate sensory redundancy for critical collision avoidance.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Preclinical Validation Roadmap & Ethics */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-700" />
              3. Research Governance &amp; Ethics Notice
            </h3>
            <p className="text-xs text-amber-900 mt-1.5 leading-relaxed font-medium">
              This system is strictly an <strong>in-silico research prototype and simulation</strong>. No human neural stimulation has been conducted. Transition to translational clinical trials requires animal electrophysiology models, optogenetic vector safety studies, and Institutional Review Board (IRB) approvals.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">OptoNeuroShifter Research Team</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-xs"
          >
            Explore Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};
