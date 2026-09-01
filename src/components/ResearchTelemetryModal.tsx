import React, { useState } from 'react';
import { 
  Download, 
  X, 
  FileSpreadsheet, 
  FileJson, 
  Copy, 
  Check, 
  Activity,
  Layers,
  Database
} from 'lucide-react';
import { DetectedEntity, NeuralSimulationState, SpatialMapData, SystemPipelineTelemetry } from '../types';

interface ResearchTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectedEntities: DetectedEntity[];
  spatialMapData: SpatialMapData;
  neuralState: NeuralSimulationState;
  telemetry: SystemPipelineTelemetry;
}

export const ResearchTelemetryModal: React.FC<ResearchTelemetryModalProps> = ({
  isOpen,
  onClose,
  detectedEntities,
  spatialMapData,
  neuralState,
  telemetry
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const exportPayload = {
    timestamp: new Date().toISOString(),
    systemState: {
      mode: telemetry.status,
      fps: telemetry.inputFps,
      pipelineLatencyMs: telemetry.totalPipelineLatencyMs,
      breakdownLatency: {
        camera: telemetry.cameraLatencyMs,
        aiInference: telemetry.aiInferenceLatencyMs,
        spatialMapping: telemetry.spatialMappingLatencyMs,
        neuralEncoding: telemetry.neuralEncodingLatencyMs
      }
    },
    sceneUnderstanding: {
      totalEntitiesDetected: detectedEntities.length,
      entities: detectedEntities.map(e => ({
        id: e.id,
        label: e.label,
        category: e.category,
        confidence: e.confidence,
        distanceMeters: e.distanceMeters,
        azimuthDeg: e.azimuthDegrees,
        direction: e.direction,
        movement: e.movement,
        velocityMps: e.velocityMps,
        hazardLevel: e.hazardLevel,
        stimulationIntensity: e.stimulationIntensity
      })),
      spatialMetrics: {
        safePathAngleDeg: spatialMapData.safePathAngle,
        safePathWidthM: spatialMapData.safePathWidthMeters,
        navigabilityScorePct: spatialMapData.navigabilityScore,
        nearestObstacleMeters: spatialMapData.nearestObstacleDistance
      }
    },
    neuralEncodingSimulation: {
      protocol: neuralState.protocol,
      gridDimension: `${neuralState.gridSize}x${neuralState.gridSize}`,
      activeElectrodes: neuralState.activeElectrodesCount,
      totalElectrodes: neuralState.totalElectrodes,
      averageSpikingFreqHz: neuralState.averageFrequencyHz,
      meanChargeDensityMicroC: neuralState.meanChargeDensity,
      pulseWidthUs: neuralState.pulseWidthUs
    },
    researchDisclaimer: "SIMULATION RESEARCH RECORD - PRECLINICAL IN-SILICO PROTOTYPE DATA ONLY"
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OptoNeuroShifter_Telemetry_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    const headers = ['Entity ID', 'Label', 'Category', 'Confidence', 'Distance (m)', 'Azimuth (deg)', 'Direction', 'Movement', 'Velocity (m/s)', 'Hazard Level'];
    const rows = detectedEntities.map(e => [
      e.id,
      `"${e.label}"`,
      e.category,
      e.confidence,
      e.distanceMeters,
      e.azimuthDegrees,
      e.direction,
      e.movement,
      e.velocityMps,
      e.hazardLevel
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OptoNeuroShifter_Entities_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600 text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Research Telemetry &amp; Log Export</h3>
              <p className="text-xs text-slate-500 font-medium">Preclinical Simulation Benchmark Dataset</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          
          <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-lg">
            <span className="font-mono text-slate-700">Format: JSON Telemetry &amp; Spatial CSV Matrix</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700 hover:bg-slate-50"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
          </div>

          {/* Code preview */}
          <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-[11px] max-h-60 overflow-y-auto border border-slate-800">
            <pre>{JSON.stringify(exportPayload, null, 2)}</pre>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={handleDownloadJson}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-xs"
            >
              <FileJson className="w-4 h-4" />
              Download JSON Dataset
            </button>
            <button
              onClick={handleDownloadCsv}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Download Spatial CSV
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
