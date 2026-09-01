import React, { useRef, useEffect, useState } from 'react';
import { 
  BrainCircuit, 
  Activity, 
  Layers, 
  Sparkles, 
  Sliders, 
  Zap, 
  Grid3X3, 
  Eye, 
  Flame, 
  Info, 
  Waves 
} from 'lucide-react';
import { NeuralEncodingProtocol, NeuralSimulationState } from '../types';
import { NeuralEncoderService } from '../services/neuralEncoder';

interface NeuralEncodingSimulationProps {
  neuralState: NeuralSimulationState;
  onChangeProtocol: (protocol: NeuralEncodingProtocol) => void;
  onChangeGridSize: (size: 16 | 24 | 32) => void;
  selectedElectrodeId: number | null;
  onSelectElectrode: (id: number | null) => void;
}

export const NeuralEncodingSimulation: React.FC<NeuralEncodingSimulationProps> = ({
  neuralState,
  onChangeProtocol,
  onChangeGridSize,
  selectedElectrodeId,
  onSelectElectrode
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'phosphenes'>('matrix');
  const phospheneCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);

  // Render simulated phosphenes canvas
  useEffect(() => {
    if (phospheneCanvasRef.current) {
      NeuralEncoderService.renderPhosphenesToCanvas(phospheneCanvasRef.current, neuralState, false);
    }
  }, [neuralState, activeTab]);

  // Render live spike waveform oscilloscope
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clean background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Zero axis
    const zeroY = h / 2;
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.8)';
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(w, zeroY);
    ctx.stroke();

    // Waveform plot
    const points = neuralState.spikingWaveform;
    if (points.length < 2) return;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
    ctx.shadowBlur = 6;

    ctx.beginPath();
    const step = w / (points.length - 1);
    for (let i = 0; i < points.length; i++) {
      const px = i * step;
      const py = zeroY - points[i] * 18;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

  }, [neuralState.spikingWaveform]);

  const getProtocolLabel = (proto: NeuralEncodingProtocol) => {
    switch (proto) {
      case 'retinotopic_v1': return 'Retinotopic V1 Cortical Array';
      case 'optogenetic_rgc': return 'Optogenetic RGC Frequency Pulse';
      case 'edge_contrast_phosphene': return 'Edge-Contrast Phosphene Mapping';
      case 'hazard_burst_frequency': return 'Hazard-Priority Burst Encoding';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-full overflow-hidden">
      
      {/* Header with requested explicit label */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-600 text-white shadow-2xs">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700">Section D</span>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
                SIMULATED NEURAL REPRESENTATION
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Primary Visual Cortex (V1) &amp; Optogenetic Retinotopic Micro-Array Encoding
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg">
          <button
            id="tab-electrode-matrix"
            onClick={() => setActiveTab('matrix')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'matrix' ? 'bg-white text-purple-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            Electrode Matrix ({neuralState.gridSize}x{neuralState.gridSize})
          </button>
          <button
            id="tab-phosphene-field"
            onClick={() => setActiveTab('phosphenes')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'phosphenes' ? 'bg-white text-purple-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Phosphene Vision Field
          </button>
        </div>
      </div>

      {/* Protocol Toolbar */}
      <div className="px-4 py-2.5 bg-purple-50/50 border-b border-purple-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-purple-900">Encoding Protocol:</span>
          <select
            id="neural-protocol-selector"
            value={neuralState.protocol}
            onChange={(e) => onChangeProtocol(e.target.value as NeuralEncodingProtocol)}
            className="bg-white border border-purple-200 rounded-md px-2 py-1 text-xs font-medium text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
          >
            <option value="retinotopic_v1">Retinotopic V1 Cortical Array (Biphasic)</option>
            <option value="optogenetic_rgc">Optogenetic RGC Frequency Pulse Modulation</option>
            <option value="edge_contrast_phosphene">Edge-Contrast Spatial Phosphene Mapping</option>
            <option value="hazard_burst_frequency">Hazard-Priority Burst Encoding</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Array Density:</span>
            <select
              id="grid-size-selector"
              value={neuralState.gridSize}
              onChange={(e) => onChangeGridSize(Number(e.target.value) as 16 | 24 | 32)}
              className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-slate-800"
            >
              <option value="16">16x16 (256 Ch)</option>
              <option value="24">24x24 (576 Ch)</option>
              <option value="32">32x32 (1024 Ch)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="p-4 flex-1 flex flex-col items-center justify-center bg-white min-h-[300px]">
        {activeTab === 'matrix' ? (
          <div className="w-full flex flex-col items-center">
            
            {/* Grid Container */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${neuralState.gridSize}, minmax(0, 1fr))`,
                gap: neuralState.gridSize === 32 ? '1px' : '2px'
              }}
              className="w-full max-w-[340px] aspect-square bg-slate-900 p-2.5 rounded-xl shadow-inner border border-slate-800"
            >
              {neuralState.channels.map((ch) => {
                const isSelected = selectedElectrodeId === ch.id;
                
                // Color scaling based on activation and hazard
                let cellBg = 'bg-slate-800/80';
                if (ch.isHazardFocalPoint && ch.activation > 0.3) {
                  cellBg = ch.activation > 0.7 ? 'bg-red-500 shadow-xs shadow-red-500/50' : 'bg-orange-400';
                } else if (ch.targetCategory === 'doorway' && ch.activation > 0.2) {
                  cellBg = 'bg-emerald-400 shadow-xs shadow-emerald-400/50';
                } else if (ch.activation > 0.05) {
                  const opacity = Math.min(1.0, ch.activation * 1.3);
                  cellBg = ch.activation > 0.7 ? 'bg-blue-400' : 'bg-blue-600/80';
                }

                return (
                  <div
                    key={ch.id}
                    onClick={() => onSelectElectrode(isSelected ? null : ch.id)}
                    style={{
                      opacity: ch.activation > 0.05 ? Math.max(0.4, ch.activation) : 0.25
                    }}
                    className={`aspect-square rounded-[2px] transition-all cursor-pointer ${cellBg} ${
                      isSelected ? 'ring-2 ring-white scale-125 z-10' : 'hover:scale-110'
                    }`}
                    title={`Channel #${ch.id}: ${ch.frequencyHz} Hz, Azimuth: ${ch.azimuthDeg.toFixed(0)}°`}
                  />
                );
              })}
            </div>

            {/* Electrode Grid Legend */}
            <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-slate-600">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-800"></span>
                <span>Baseline (2 Hz)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-500"></span>
                <span>Visual Activation (40-80 Hz)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-red-500"></span>
                <span>Hazard Burst (120+ Hz)</span>
              </div>
            </div>

          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            {/* Phosphene Field Canvas */}
            <canvas
              ref={phospheneCanvasRef}
              width={340}
              height={340}
              className="rounded-xl shadow-inner border border-slate-800 max-w-[340px] w-full aspect-square"
            />
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              Simulated Artificial Phosphene Perception (Visual Cortex Light Dots)
            </p>
          </div>
        )}
      </div>

      {/* Real-time Oscilloscope & Neural Telemetry Strip */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 text-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Live Spiking Waveform Canvas */}
        <div className="w-full sm:w-1/2 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              MICRO-ELECTRODE ACTION POTENTIALS
            </span>
            <span>{neuralState.pulseWidthUs} µs PULSE</span>
          </div>
          <canvas
            ref={waveformCanvasRef}
            width={240}
            height={48}
            className="w-full h-12 rounded border border-slate-700/60 bg-slate-950"
          />
        </div>

        {/* Neural Metrics */}
        <div className="w-full sm:w-1/2 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Nodes</div>
            <div className="text-sm font-bold font-mono text-cyan-400">
              {neuralState.activeElectrodesCount} / {neuralState.totalElectrodes}
            </div>
          </div>

          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Mean Spikes</div>
            <div className="text-sm font-bold font-mono text-purple-400">
              {neuralState.averageFrequencyHz} Hz
            </div>
          </div>

          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Charge Density</div>
            <div className="text-sm font-bold font-mono text-emerald-400">
              {neuralState.meanChargeDensity} µC/cm²
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
