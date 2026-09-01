import React, { useRef, useEffect, useState } from 'react';
import { 
  Camera, 
  Eye, 
  Scan, 
  Sliders, 
  Maximize2, 
  Layers, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw,
  Crosshair,
  Gauge,
  Ruler,
  Bluetooth,
  Zap
} from 'lucide-react';
import { ClinicalBenchmarkScenario, DetectedEntity } from '../types';
import { formatDistance } from '../utils/formatDistance';
import { MicrobitConnectionState } from '../services/microbitBleService';

interface LiveEnvironmentalInputProps {
  currentScenario: ClinicalBenchmarkScenario;
  detectedEntities: DetectedEntity[];
  isWebcamActive: boolean;
  selectedEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  minConfidence: number;
  onChangeMinConfidence: (val: number) => void;
  showDepthOverlay: boolean;
  onToggleDepthOverlay: () => void;
  showVectors: boolean;
  onToggleVectors: () => void;
  cameraError: string | null;
  bleState: MicrobitConnectionState;
}

export const LiveEnvironmentalInput: React.FC<LiveEnvironmentalInputProps> = ({
  currentScenario,
  detectedEntities,
  isWebcamActive,
  selectedEntityId,
  onSelectEntity,
  videoRef,
  canvasRef,
  minConfidence,
  onChangeMinConfidence,
  showDepthOverlay,
  onToggleDepthOverlay,
  showVectors,
  onToggleVectors,
  cameraError,
  bleState
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Category badge color lookup
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'person': return 'bg-blue-600 border-blue-500 text-white';
      case 'car': return 'bg-purple-600 border-purple-500 text-white';
      case 'bench': return 'bg-amber-600 border-amber-500 text-white';
      case 'tree': return 'bg-emerald-600 border-emerald-500 text-white';
      case 'doorway': return 'bg-teal-600 border-teal-500 text-white';
      case 'steps': return 'bg-rose-600 border-rose-500 text-white';
      default: return 'bg-slate-700 border-slate-600 text-white';
    }
  };

  const getHazardBorder = (level: string) => {
    switch (level) {
      case 'critical': return 'border-red-500 bg-red-500/10 ring-2 ring-red-400/50';
      case 'high': return 'border-orange-500 bg-orange-500/10';
      case 'moderate': return 'border-blue-500 bg-blue-500/10';
      default: return 'border-emerald-500 bg-emerald-500/10';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-full">
      
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700">Section A</span>
              <h2 className="text-sm font-bold text-slate-900">LIVE ENVIRONMENTAL INPUT</h2>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {isWebcamActive ? 'Active Optical Ingestion Sensor (Webcam)' : currentScenario.title}
              {bleState.isLiveSensorActive && ' • Live VL53L0X Active'}
            </p>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2">
          {bleState.isLiveSensorActive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live VL53L0X: {bleState.sensorDistanceFormatted}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {detectedEntities.length} Targets Isolated
            </span>
          )}

          <button
            id="toggle-input-settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
              showSettings ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Adjust Detection Parameters"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Settings Drawer (expandable) */}
      {showSettings && (
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-medium">Confidence Filter:</span>
            <input
              id="confidence-threshold-slider"
              type="range"
              min="0.4"
              max="0.95"
              step="0.05"
              value={minConfidence}
              onChange={(e) => onChangeMinConfidence(parseFloat(e.target.value))}
              className="w-24 accent-blue-600 cursor-pointer"
            />
            <span className="font-mono font-bold text-slate-800">{Math.round(minConfidence * 100)}%</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={showDepthOverlay}
                onChange={onToggleDepthOverlay}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Depth Gradients</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium ml-2">
              <input
                type="checkbox"
                checked={showVectors}
                onChange={onToggleVectors}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Vector Arrows</span>
            </label>
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <div 
        ref={containerRef}
        className="relative flex-1 min-h-[300px] lg:min-h-[360px] bg-slate-950 flex items-center justify-center overflow-hidden"
      >
        {/* Real Webcam Video (hidden if using synthetic scenarios, displayed if webcam active) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${isWebcamActive ? 'opacity-100' : 'hidden'}`}
        />

        {/* Dynamic High-Fidelity Environmental Canvas */}
        <canvas
          ref={canvasRef}
          width={640}
          height={400}
          className={`w-full h-full object-cover transition-opacity duration-200 ${isWebcamActive ? 'hidden' : 'opacity-100'}`}
        />

        {/* Depth Grid / Spatial Perspective Overlay */}
        {showDepthOverlay && (
          <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-blue-950/20 to-blue-950/60 border border-blue-500/20 flex flex-col justify-between p-3">
            <div className="flex justify-between text-[10px] font-mono text-blue-300/80">
              <span>FOV: 75° H / 50° V</span>
              <span>DEPTH RATING: 0.5m - 6.0m</span>
            </div>
            <div className="flex justify-center">
              <div className="border-b-2 border-dashed border-emerald-400/60 w-3/4 pb-1 text-center">
                <span className="text-[10px] font-mono bg-emerald-950/80 px-2 py-0.5 rounded text-emerald-300 font-bold">
                  CLEARANCE PASSAGE CORRIDOR
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Object Detection Bounding Boxes Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {detectedEntities.map((entity) => {
            const isSelected = selectedEntityId === entity.id;
            const leftPct = `${entity.bbox.x * 100}%`;
            const topPct = `${entity.bbox.y * 100}%`;
            const widthPct = `${entity.bbox.width * 100}%`;
            const heightPct = `${entity.bbox.height * 100}%`;
            const isVl53 = entity.distanceSource === 'vl53l0x' || bleState.isLiveSensorActive;

            return (
              <div
                key={entity.id}
                style={{
                  left: leftPct,
                  top: topPct,
                  width: widthPct,
                  height: heightPct
                }}
                className={`absolute pointer-events-auto border-2 rounded-sm transition-all duration-150 cursor-pointer ${getHazardBorder(
                  entity.hazardLevel
                )} ${isSelected ? 'ring-4 ring-blue-400 scale-[1.01]' : 'hover:ring-2 hover:ring-white/80'}`}
                onClick={() => onSelectEntity(isSelected ? null : entity.id)}
              >
                {/* Object Label & Confidence Score & Calibrated/Real Distance Tag */}
                <div className="absolute -top-7 left-0 flex items-center gap-1 whitespace-nowrap shadow-md">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-tight uppercase ${getCategoryColor(entity.category)}`}>
                    {entity.label.split('(')[0].trim()}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900/90 text-emerald-300 border border-slate-700">
                    {Math.round(entity.confidence * 100)}%
                  </span>
                  
                  {/* Primary Distance Badge: Live VL53L0X Distance when active, Camera Estimation otherwise */}
                  <span 
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border ${
                      isVl53 
                        ? 'bg-emerald-950/95 text-emerald-300 border-emerald-400 shadow-sm' 
                        : 'bg-slate-900/90 text-sky-200 border-slate-700'
                    }`} 
                    title={isVl53 ? 'Live VL53L0X Distance (mm ToF)' : 'Estimated Distance'}
                  >
                    {isVl53 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>}
                    <span>{formatDistance(entity.distanceMeters)}</span>
                    {isVl53 && <span className="text-[9px] text-emerald-400 font-extrabold">[VL53L0X]</span>}
                  </span>
                </div>

                {/* Corner Targeting Reticles */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white"></div>

                {/* Center Reticle Point */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/80 shadow-xs"></div>

                {/* Direction & Movement indicator */}
                {showVectors && entity.movement !== 'stationary' && (
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-900/90 text-purple-200 border border-purple-400/40">
                    {entity.movement === 'approaching' ? '▼ Approaching' : entity.movement === 'receding' ? '▲ Receding' : '► Lateral'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Camera Permission / Error Warning */}
        {cameraError && isWebcamActive && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-white">
            <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
            <h4 className="text-sm font-bold">Camera Access Notification</h4>
            <p className="text-xs text-slate-300 mt-1 max-w-sm">{cameraError}</p>
            <p className="text-[11px] text-blue-300 mt-3">Reverting to high-precision synthetic clinical scenario stream.</p>
          </div>
        )}

        {/* Live HUD Bottom Status Bar */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none text-[10px] font-mono text-white/90">
          <div className="bg-slate-900/85 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-700/80 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>AI Object Detection (Camera Active)</span>
          </div>

          {bleState.isLiveSensorActive ? (
            <div className="bg-emerald-950/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-emerald-500/80 flex items-center gap-2 text-emerald-300 font-bold shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Live VL53L0X Distance: {bleState.sensorDistanceFormatted} ({bleState.sensorDistanceMm} mm)</span>
            </div>
          ) : (
            <div className="bg-slate-900/85 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-700/80 flex items-center gap-2">
              <Crosshair className="w-3 h-3 text-blue-400" />
              <span>FOV: 75° AZIMUTH</span>
            </div>
          )}
        </div>

      </div>

      {/* Footer Info Strip */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between flex-wrap gap-2">
        <span className="font-medium">
          Target Classes: <span className="font-bold text-slate-800">Person, Car, Bench, Tree, Obstacle, Steps, Doorway</span>
        </span>
        
        {bleState.isLiveSensorActive ? (
          <span className="text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live VL53L0X Distance: {bleState.sensorDistanceFormatted} ({bleState.sensorDistanceMm} mm via micro:bit Bluetooth UART)
          </span>
        ) : (
          <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Distance: Estimated from camera/depth model
          </span>
        )}
      </div>

    </div>
  );
};

