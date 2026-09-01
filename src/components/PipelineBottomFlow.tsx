import React, { useState } from 'react';
import { 
  ArrowRight, 
  Camera, 
  Scan,
  Cpu, 
  Radar, 
  BrainCircuit, 
  Eye, 
  CheckCircle2, 
  ChevronRight, 
  Info,
  X,
  Ruler
} from 'lucide-react';

interface StageDetail {
  id: string;
  stepNumber: number;
  name: string;
  shortLabel: string;
  icon: any;
  color: string;
  bgLight: string;
  borderColor: string;
  summary: string;
  technicalDetails: {
    inputTensor: string;
    algorithm: string;
    transformation: string;
    safetyConstraint: string;
  };
}

const PIPELINE_STAGES: StageDetail[] = [
  {
    id: 'camera-input',
    stepNumber: 1,
    name: 'Camera Input',
    shortLabel: 'CAMERA INPUT',
    icon: Camera,
    color: 'text-blue-700',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-300',
    summary: 'Captures live RGB environmental visual feed via camera sensor with 75° field-of-view aperture.',
    technicalDetails: {
      inputTensor: 'Frame buffer: [1, 640, 480, 3] @ 60 FPS RGB',
      algorithm: 'Auto-gain normalization + dynamic range luminance compensation',
      transformation: 'Spatial normalization for real-time edge processing',
      safetyConstraint: 'Local device frame ingestion with zero cloud transit'
    }
  },
  {
    id: 'object-detection',
    stepNumber: 2,
    name: 'AI Object Detection',
    shortLabel: 'AI OBJECT DETECTION',
    icon: Scan,
    color: 'text-sky-700',
    bgLight: 'bg-sky-50',
    borderColor: 'border-sky-300',
    summary: 'Performs real-time vision inference to detect people, vehicles, obstacles, steps, benches, and doorways.',
    technicalDetails: {
      inputTensor: 'Feature tensor: [1, 300, 4] bounding boxes + [1, 300] classes',
      algorithm: 'Browser-optimized lightweight MobileNet / YOLO vision backbone',
      transformation: 'Confidence thresholding (>65%) and bounding box coordinate isolation',
      safetyConstraint: 'Multi-frame aggregation prevents false negative hazard dropouts'
    }
  },
  {
    id: 'scene-understanding',
    stepNumber: 3,
    name: 'Scene Understanding + Distance Estimation',
    shortLabel: 'SCENE UNDERSTANDING',
    icon: Cpu,
    color: 'text-indigo-700',
    bgLight: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    summary: 'Computes calibrated real-world distances (cm/m), azimuth directions, and relative spatial sectors.',
    technicalDetails: {
      inputTensor: 'Bounding geometry + category reference height priors',
      algorithm: 'Calibrated pinhole optical projection & ground-plane contact perspective fusion',
      transformation: 'Direct metric distance estimation in cm (<100 cm) and meters (≥1m)',
      safetyConstraint: 'Calibrated distance bounds with clear "Estimated Distance" labeling'
    }
  },
  {
    id: 'spatial-rep',
    stepNumber: 4,
    name: 'Spatial Representation',
    shortLabel: 'SPATIAL MAP',
    icon: Radar,
    color: 'text-teal-700',
    bgLight: 'bg-teal-50',
    borderColor: 'border-teal-300',
    summary: 'Maps detected objects onto a simplified 2D top-down bird’s-eye radar map and calculates safe passage corridors.',
    technicalDetails: {
      inputTensor: 'Polar coordinates: [Azimuth θ, Range r, Elevation φ]',
      algorithm: 'Inverse perspective egocentric bird’s-eye spatial mapping',
      transformation: 'Calculates navigability clearance corridors and obstacle proximity halos',
      safetyConstraint: 'Calculates collision-free walking angles with high-contrast safety vectors'
    }
  },
  {
    id: 'neural-encoding',
    stepNumber: 5,
    name: 'Neural Encoding Simulation',
    shortLabel: 'NEURAL ENCODING',
    icon: BrainCircuit,
    color: 'text-purple-700',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-300',
    summary: 'Converts spatial vectors into simulated cortical electrode matrices (V1 retinotopic spike frequencies).',
    technicalDetails: {
      inputTensor: 'Cortical Receptive Array: [16x16, 24x24, 32x32] channel matrix',
      algorithm: 'Retinotopic log-polar mapping & biphasic spike rate frequency modulation (20-140 Hz)',
      transformation: 'Encodes spatial azimuth and distance into micro-electrode stimulation patterns',
      safetyConstraint: 'Strict in-silico simulation model without biological neural coupling'
    }
  },
  {
    id: 'cortex-interface',
    stepNumber: 6,
    name: 'Proposed Visual Cortex Interface',
    shortLabel: 'CORTEX INTERFACE',
    icon: Eye,
    color: 'text-rose-700',
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-300',
    summary: 'Simulates the resulting phosphene light-dot field perception proposed for visual cortex restoration research.',
    technicalDetails: {
      inputTensor: 'Action potential pulse trains: 200 µs biphasic pulses, safe charge limits',
      algorithm: 'Gaussian phosphene point-spread function rendering',
      transformation: 'Visualizes perceived geometric contours and obstacle warning clusters',
      safetyConstraint: 'Research prototype simulation only — human clinical stimulation requires certified clinical trials'
    }
  }
];

export const PipelineBottomFlow: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState<StageDetail | null>(null);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Pipeline Architecture</span>
          <h3 className="text-sm font-bold text-slate-900">
            END-TO-END VISUAL INFORMATION PIPELINE
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 font-medium hidden sm:inline-block">
          Click any phase to view algorithmic mechanics &amp; safety specifications
        </span>
      </div>

      {/* Interactive Step-by-Step Flow Bar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 relative">
        {PIPELINE_STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isSelected = selectedStage?.id === stage.id;

          return (
            <div
              key={stage.id}
              onClick={() => setSelectedStage(isSelected ? null : stage)}
              className={`relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                isSelected 
                  ? `${stage.bgLight} ${stage.borderColor} ring-2 ring-blue-400 shadow-xs` 
                  : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              {/* Step number badge & icon */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                  0{stage.stepNumber}
                </span>
                <div className={`p-1.5 rounded-lg ${stage.bgLight} ${stage.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              {/* Step name */}
              <div>
                <div className="text-[11px] font-extrabold text-slate-900 tracking-tight">
                  {stage.shortLabel}
                </div>
                <div className="text-[10px] text-slate-500 font-medium line-clamp-1">
                  {stage.name}
                </div>
              </div>

              {/* Arrow divider for larger screens */}
              {idx < PIPELINE_STAGES.length - 1 && (
                <div className="hidden md:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-white border border-slate-200 items-center justify-center text-slate-400 shadow-2xs">
                  <ChevronRight className="w-3 h-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stage Detail Drawer Modal */}
      {selectedStage && (
        <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-md animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-3">
            
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-600/30 border border-blue-400 text-blue-400">
                <selectedStage.icon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">
                  Phase 0{selectedStage.stepNumber} Algorithmic Specification
                </span>
                <h4 className="text-sm font-bold text-white tracking-tight">
                  {selectedStage.name}
                </h4>
              </div>
            </div>

            <button
              onClick={() => setSelectedStage(null)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 mt-2 font-medium leading-relaxed">
            {selectedStage.summary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-800 text-xs">
            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
              <div className="text-[10px] font-mono text-blue-400 uppercase font-semibold">Tensor Schema</div>
              <div className="text-[11px] text-slate-200 mt-1 font-mono">{selectedStage.technicalDetails.inputTensor}</div>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
              <div className="text-[10px] font-mono text-purple-400 uppercase font-semibold">Core Model / Algorithm</div>
              <div className="text-[11px] text-slate-200 mt-1">{selectedStage.technicalDetails.algorithm}</div>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
              <div className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">Transformation Mechanism</div>
              <div className="text-[11px] text-slate-200 mt-1">{selectedStage.technicalDetails.transformation}</div>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
              <div className="text-[10px] font-mono text-amber-400 uppercase font-semibold">Safety Protocol</div>
              <div className="text-[11px] text-amber-200/90 mt-1">{selectedStage.technicalDetails.safetyConstraint}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
