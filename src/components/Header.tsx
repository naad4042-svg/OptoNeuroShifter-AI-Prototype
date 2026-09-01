import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  BrainCircuit, 
  Eye, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Download, 
  Sparkles, 
  Layers, 
  Info,
  Camera,
  Compass,
  Cpu,
  Radio,
  Bluetooth,
  CheckCircle2,
  AlertCircle,
  Gauge,
  Ruler,
  Zap
} from 'lucide-react';
import { ClinicalBenchmarkScenario } from '../types';
import { CLINICAL_SCENARIOS } from '../data/scenarios';
import { microbitBleService, MicrobitConnectionState } from '../services/microbitBleService';

interface HeaderProps {
  currentScenario: ClinicalBenchmarkScenario;
  onSelectScenario: (scenario: ClinicalBenchmarkScenario) => void;
  isWebcamActive: boolean;
  onToggleWebcam: () => void;
  isAudioActive: boolean;
  onToggleAudio: () => void;
  isRunning: boolean;
  onTogglePlay: () => void;
  onOpenTelemetryModal: () => void;
  onOpenGuideModal: () => void;
  fps: number;
  totalLatencyMs: number;
  bleState: MicrobitConnectionState;
}

export const Header: React.FC<HeaderProps> = ({
  currentScenario,
  onSelectScenario,
  isWebcamActive,
  onToggleWebcam,
  isAudioActive,
  onToggleAudio,
  isRunning,
  onTogglePlay,
  onOpenTelemetryModal,
  onOpenGuideModal,
  fps,
  totalLatencyMs,
  bleState
}) => {
  const [isVibrating, setIsVibrating] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isConnectingBle, setIsConnectingBle] = useState<boolean>(false);
  const [showSensorMenu, setShowSensorMenu] = useState<boolean>(false);

  const handleConnectBle = async () => {
    setIsConnectingBle(true);
    const success = await microbitBleService.connect();
    setIsConnectingBle(false);

    const latestState = microbitBleService.getState();
    if (success) {
      setFeedbackToast({ 
        message: 'Connected to BBC micro:bit! Continuously reading VL53L0X distance sensor.', 
        type: 'success' 
      });
    } else {
      if (!microbitBleService.isBluetoothSupported()) {
        setFeedbackToast({ 
          message: 'Web Bluetooth is not supported in Safari on iPad. Open in Bluefy browser on iPadOS for direct Bluetooth.', 
          type: 'info' 
        });
      } else if (latestState.error) {
        setFeedbackToast({ message: latestState.error, type: 'error' });
      }
    }
    setTimeout(() => setFeedbackToast(null), 5000);
  };

  const handleVibrateClick = async () => {
    setIsVibrating(true);
    const success = await microbitBleService.sendVibrateCommand();
    const latestState = microbitBleService.getState();
    
    if (success) {
      setFeedbackToast({ message: 'Sent "V\\n" command to BBC micro:bit', type: 'success' });
    } else {
      if (!microbitBleService.isBluetoothSupported()) {
        setFeedbackToast({ 
          message: 'Web Bluetooth is not supported in Safari on iPad. Open in Bluefy browser on iPadOS for direct Bluetooth.', 
          type: 'info' 
        });
      } else if (latestState.error) {
        setFeedbackToast({ message: latestState.error, type: 'error' });
      }
    }

    setTimeout(() => setIsVibrating(false), 600);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* Brand & Project Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs shrink-0">
              <BrainCircuit className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">OptoNeuroShifter</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                  Simulation Ready
                </span>
                {bleState.isLiveSensorActive ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>
                    Live VL53L0X Distance: {bleState.sensorDistanceFormatted} ({bleState.sensorDistanceMm} mm)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Camera Depth Estimation
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-500">
                AI-Based Alternative Pathway for Visual Information • Preclinical Research Simulation
              </p>
            </div>
          </div>

          {/* Scenario & Controls Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Live Scenario Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <span className="text-xs font-semibold text-slate-600 px-2 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Scene:
              </span>
              <select
                id="scenario-selector-dropdown"
                value={isWebcamActive ? 'webcam' : currentScenario.id}
                onChange={(e) => {
                  if (e.target.value === 'webcam') {
                    if (!isWebcamActive) onToggleWebcam();
                  } else {
                    if (isWebcamActive) onToggleWebcam();
                    const sc = CLINICAL_SCENARIOS.find((s) => s.id === e.target.value);
                    if (sc) onSelectScenario(sc);
                  }
                }}
                className="bg-white text-xs font-medium text-slate-800 border border-slate-200 rounded-md px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                <optgroup label="Clinical Benchmarks">
                  {CLINICAL_SCENARIOS.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Real-Time Feed">
                  <option value="webcam">🔴 Live Camera Ingestion</option>
                </optgroup>
              </select>
            </div>

            {/* Webcam Toggle Button */}
            <button
              id="webcam-toggle-btn"
              onClick={onToggleWebcam}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                isWebcamActive
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Toggle Live Webcam Device"
            >
              <Camera className="w-3.5 h-3.5" />
              {isWebcamActive ? 'Stop Camera' : 'Live Camera'}
            </button>

            {/* micro:bit Bluetooth / VL53L0X Distance Status & Connect Button */}
            {bleState.isConnected ? (
              <div className="relative">
                <button
                  id="microbit-connected-status-btn"
                  onClick={() => setShowSensorMenu(!showSensorMenu)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 transition-all shadow-xs"
                  title="micro:bit Connected: Continuously streaming VL53L0X Distance"
                >
                  <Bluetooth className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span>Live VL53L0X: <strong>{bleState.sensorDistanceFormatted || 'Measuring...'}</strong></span>
                </button>

                {showSensorMenu && (
                  <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50 text-xs">
                    <div className="font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span>micro:bit VL53L0X Sensor</span>
                      <span className="text-[10px] text-emerald-600 font-mono">Connected</span>
                    </div>
                    <p className="text-slate-500 text-[11px] mb-2">
                      Device: <strong>{bleState.deviceName || 'BBC micro:bit'}</strong>
                    </p>
                    <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 mb-2">
                      <div className="text-[10px] text-emerald-700 font-semibold">Live VL53L0X Distance</div>
                      <div className="text-sm font-mono font-extrabold text-emerald-900">
                        {bleState.sensorDistanceFormatted || 'Waiting for stream...'}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-mono">
                        {bleState.sensorDistanceMm !== null ? `${bleState.sensorDistanceMm} mm` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        microbitBleService.disconnect();
                        setShowSensorMenu(false);
                      }}
                      className="w-full py-1 text-center font-semibold text-red-600 hover:bg-red-50 rounded border border-red-200"
                    >
                      Disconnect micro:bit
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="connect-microbit-btn"
                onClick={handleConnectBle}
                disabled={isConnectingBle || bleState.isConnecting}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-2xs"
                title="Connect BBC micro:bit via Web Bluetooth UART to read live VL53L0X distance"
              >
                <Bluetooth className={`w-3.5 h-3.5 ${isConnectingBle ? 'animate-spin text-blue-600' : 'text-blue-500'}`} />
                <span>{isConnectingBle ? 'Connecting...' : 'Connect micro:bit (VL53L0X)'}</span>
              </button>
            )}

            {/* Vibrate Button (Sends Bluetooth UART 'V\n' to BBC micro:bit) */}
            <button
              id="microbit-vibrate-btn"
              onClick={handleVibrateClick}
              disabled={bleState.isConnecting}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all shadow-xs ${
                isVibrating
                  ? 'bg-purple-600 text-white border-purple-700 scale-105 ring-2 ring-purple-400'
                  : bleState.isConnected
                  ? 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-purple-700'
              }`}
              title="Sends Bluetooth UART command 'V\n' to trigger vibration on BBC micro:bit"
            >
              <Radio className={`w-3.5 h-3.5 ${isVibrating ? 'animate-ping' : bleState.isConnected ? 'text-purple-600' : 'text-slate-500'}`} />
              <span>Vibrate</span>
              {bleState.isConnected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="micro:bit Connected"></span>
              )}
            </button>

            {/* Audio Feedback Simulation Toggle */}
            <button
              id="audio-toggle-btn"
              onClick={onToggleAudio}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                isAudioActive
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Toggle Spatial Proximity Acoustic Substitution"
            >
              {isAudioActive ? <Volume2 className="w-3.5 h-3.5 text-indigo-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
              {isAudioActive ? 'Acoustic Cue: ON' : 'Acoustic Cue'}
            </button>

            {/* Play/Pause Simulation Engine */}
            <button
              id="play-pause-simulation-btn"
              onClick={onTogglePlay}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
            >
              {isRunning ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
              {isRunning ? 'Pause Stream' : 'Resume'}
            </button>

            {/* Telemetry Metrics Pill */}
            <div className="hidden xl:flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold text-slate-700">{fps} FPS</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">{totalLatencyMs}ms pipeline</span>
            </div>

            {/* Hackathon Guide Modal Button */}
            <button
              id="open-guide-modal-btn"
              onClick={onOpenGuideModal}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Research Tour
            </button>

            {/* Export Telemetry Log Button */}
            <button
              id="open-telemetry-modal-btn"
              onClick={onOpenTelemetryModal}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
              title="View Research Data & Telemetry"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Toast Notification for Bluetooth / Vibration */}
        {feedbackToast && (
          <div className={`mt-2 text-xs px-3 py-2 rounded-lg border flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-200 ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : feedbackToast.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              {feedbackToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {feedbackToast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              {feedbackToast.type === 'info' && <Bluetooth className="w-4 h-4 text-amber-600 shrink-0" />}
              <span>{feedbackToast.message}</span>
            </div>
            <button
              onClick={() => setFeedbackToast(null)}
              className="text-slate-400 hover:text-slate-600 font-bold px-1"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

