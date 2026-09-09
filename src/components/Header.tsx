import React, { useState } from 'react';
import { 
  Activity, 
  BrainCircuit, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Download, 
  Sparkles, 
  Camera, 
  Radio, 
  Bluetooth, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  X,
  ChevronRight,
  AlertTriangle
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

const BLE_STAGES = [
  { id: 1, name: 'Stage 1 Device Selected', short: '1. Device Selected', action: 'Stage 1 Device Selection' },
  { id: 2, name: 'Stage 2 GATT Connected', short: '2. GATT Connected', action: 'Stage 2 GATT Connection' },
  { id: 3, name: 'Stage 3 Nordic UART Service Found', short: '3. Service Found', action: 'Stage 3 Nordic UART Service Discovery' },
  { id: 4, name: 'Stage 4 Characteristics Found', short: '4. Characteristics Found', action: 'Stage 4 Characteristic Discovery' },
  { id: 5, name: 'Stage 5 Notifications Started', short: '5. Notifications Started', action: 'Stage 5 Notification Subscription' },
];

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
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const handleConnectBle = async () => {
    setDismissedError(null);
    setIsConnectingBle(true);
    const success = await microbitBleService.connect();
    setIsConnectingBle(false);

    const latestState = microbitBleService.getState();
    if (success) {
      setFeedbackToast({ 
        message: 'Connected to BBC micro:bit! Continuously reading VL53L0X distance sensor.', 
        type: 'success' 
      });
      setTimeout(() => setFeedbackToast(null), 5000);
    } else {
      if (!microbitBleService.isBluetoothSupported()) {
        setFeedbackToast({ 
          message: 'Web Bluetooth is not supported in Safari on iPad. Open in Bluefy browser on iPadOS for direct Bluetooth.', 
          type: 'info' 
        });
        setTimeout(() => setFeedbackToast(null), 6000);
      } else if (latestState.error) {
        setFeedbackToast({ message: latestState.error, type: 'error' });
      }
    }
  };

  const handleVibrateClick = async () => {
    setIsVibrating(true);
    const success = await microbitBleService.sendVibrateCommand();
    const latestState = microbitBleService.getState();
    
    if (success) {
      setFeedbackToast({ message: 'Sent "V\\n" command to BBC micro:bit', type: 'success' });
      setTimeout(() => setFeedbackToast(null), 4000);
    } else {
      if (!microbitBleService.isBluetoothSupported()) {
        setFeedbackToast({ 
          message: 'Web Bluetooth is not supported in Safari on iPad. Open in Bluefy browser on iPadOS for direct Bluetooth.', 
          type: 'info' 
        });
        setTimeout(() => setFeedbackToast(null), 6000);
      } else if (latestState.error) {
        setFeedbackToast({ message: latestState.error, type: 'error' });
      }
    }

    setTimeout(() => setIsVibrating(false), 600);
  };

  const getStageStatus = (stage: typeof BLE_STAGES[0]) => {
    const lastDone = bleState.lastCompletedStage;
    const isCompleted = (
      (stage.id === 1 && (lastDone === 'Stage 1 Device Selected' || lastDone === 'Stage 2 GATT Connected' || lastDone === 'Stage 3 Nordic UART Service Found' || lastDone === 'Stage 4 Characteristics Found' || lastDone === 'Stage 5 Notifications Started')) ||
      (stage.id === 2 && (lastDone === 'Stage 2 GATT Connected' || lastDone === 'Stage 3 Nordic UART Service Found' || lastDone === 'Stage 4 Characteristics Found' || lastDone === 'Stage 5 Notifications Started')) ||
      (stage.id === 3 && (lastDone === 'Stage 3 Nordic UART Service Found' || lastDone === 'Stage 4 Characteristics Found' || lastDone === 'Stage 5 Notifications Started')) ||
      (stage.id === 4 && (lastDone === 'Stage 4 Characteristics Found' || lastDone === 'Stage 5 Notifications Started')) ||
      (stage.id === 5 && lastDone === 'Stage 5 Notifications Started')
    );

    const isCurrentFailing = bleState.currentFailingStage?.includes(`Stage ${stage.id}`) ||
      (stage.id === 1 && !lastDone && bleState.error) ||
      (stage.id === 2 && lastDone === 'Stage 1 Device Selected' && bleState.error) ||
      (stage.id === 3 && lastDone === 'Stage 2 GATT Connected' && bleState.error) ||
      (stage.id === 4 && lastDone === 'Stage 3 Nordic UART Service Found' && bleState.error) ||
      (stage.id === 5 && lastDone === 'Stage 4 Characteristics Found' && bleState.error);

    const isCurrentlyExecuting = bleState.isConnecting && (
      (stage.id === 1 && !lastDone) ||
      (stage.id === 2 && lastDone === 'Stage 1 Device Selected') ||
      (stage.id === 3 && lastDone === 'Stage 2 GATT Connected') ||
      (stage.id === 4 && lastDone === 'Stage 3 Nordic UART Service Found') ||
      (stage.id === 5 && lastDone === 'Stage 4 Characteristics Found')
    );

    return { isCompleted, isCurrentFailing, isCurrentlyExecuting };
  };

  const hasVisibleError = (bleState.error && bleState.error !== dismissedError) || (feedbackToast?.type === 'error');
  const displayErrorText = bleState.error || (feedbackToast?.type === 'error' ? feedbackToast.message : null);

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

          {/* Real-Time Scenario Selector & Action Controls */}
          <div className="flex items-center flex-wrap gap-2">
            
            {/* Scenario Picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-500 font-medium">Scenario:</span>
              <select
                id="benchmark-scenario-select"
                aria-label="Select Clinical Benchmark Scenario"
                value={isWebcamActive ? 'webcam' : currentScenario.id}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'webcam') {
                    if (!isWebcamActive) onToggleWebcam();
                  } else {
                    if (isWebcamActive) onToggleWebcam();
                    const sc = CLINICAL_SCENARIOS.find(s => s.id === val);
                    if (sc) onSelectScenario(sc);
                  }
                }}
                className="bg-transparent text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
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
                      className="w-full py-1 text-center font-semibold text-red-600 hover:bg-red-50 rounded border border-red-200 cursor-pointer"
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
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all shadow-2xs cursor-pointer ${
                  isConnectingBle || bleState.isConnecting
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-blue-600'
                }`}
                title="Connect BBC micro:bit via Web Bluetooth UART to read live VL53L0X distance"
              >
                <Bluetooth className={`w-3.5 h-3.5 ${isConnectingBle || bleState.isConnecting ? 'animate-spin text-blue-600' : 'text-blue-500'}`} />
                <span>
                  {bleState.isConnecting
                    ? (bleState.connectionStage || 'Connecting micro:bit...')
                    : 'Connect micro:bit (VL53L0X)'}
                </span>
              </button>
            )}

            {/* Vibrate Button (Sends Bluetooth UART 'V\n' to BBC micro:bit) */}
            <button
              id="microbit-vibrate-btn"
              onClick={handleVibrateClick}
              disabled={bleState.isConnecting}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all shadow-xs cursor-pointer ${
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
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
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
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
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
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Research Tour
            </button>

            {/* Export Telemetry Log Button */}
            <button
              id="open-telemetry-modal-btn"
              onClick={onOpenTelemetryModal}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
              title="View Research Data & Telemetry"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-Time BLE Connecting Progress Indicator Bar */}
        {bleState.isConnecting && (
          <div className="mt-3 p-2.5 rounded-xl border border-blue-200 bg-blue-50/80 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                <span>Connecting to BBC micro:bit via Nordic UART Service...</span>
                <span className="text-blue-600 font-normal">({bleState.connectionStage})</span>
              </div>
              <div className="text-[11px] text-blue-700 font-medium flex items-center gap-2 flex-wrap">
                {bleState.deviceName && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold border border-blue-300">
                    Device: {bleState.deviceName}
                  </span>
                )}
                <span>Last Completed: <strong>{bleState.lastCompletedStage || 'None'}</strong></span>
              </div>
            </div>

            {/* 5-Stage Visual Progress Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 text-[10px]">
              {BLE_STAGES.map((st) => {
                const { isCompleted, isCurrentlyExecuting } = getStageStatus(st);
                return (
                  <div
                    key={st.id}
                    className={`px-2 py-1 rounded-md border flex items-center gap-1.5 transition-all ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold'
                        : isCurrentlyExecuting
                        ? 'bg-blue-100 text-blue-900 border-blue-400 font-bold ring-2 ring-blue-300 animate-pulse'
                        : 'bg-white/70 text-slate-500 border-slate-200'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    ) : isCurrentlyExecuting ? (
                      <RefreshCw className="w-3 h-3 text-blue-600 animate-spin shrink-0" />
                    ) : (
                      <span className="w-3 h-3 rounded-full bg-slate-300 text-[8px] flex items-center justify-center text-slate-700 shrink-0">
                        {st.id}
                      </span>
                    )}
                    <span className="truncate">{st.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Prominent Red Connection Error / 30s Timeout Stage Banner */}
        {hasVisibleError && (
          <div className="mt-3 p-3.5 rounded-xl border border-red-300 bg-red-50 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xs font-bold text-red-900">
                      BBC micro:bit Bluetooth Connection Error
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-200/80 text-red-800 border border-red-300">
                      Timeout / BLE Issue
                    </span>
                  </div>

                  {/* Explicit Stage Breakdown Display */}
                  <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white border border-red-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Last Successfully Completed Stage
                      </span>
                      <strong className="text-emerald-700 flex items-center gap-1 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {bleState.lastCompletedStage || 'None (Failed before device selection)'}
                      </strong>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-red-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Currently Failing Stage
                      </span>
                      <strong className="text-red-700 flex items-center gap-1 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        {bleState.currentFailingStage || 'Stage Failure'}
                      </strong>
                    </div>
                  </div>

                  {/* Complete Error Message Detail */}
                  <div className="mt-2 text-xs font-medium text-red-800 whitespace-pre-line bg-red-100/60 p-2 rounded border border-red-200">
                    {displayErrorText}
                  </div>

                  {/* 5-Stage Diagnostic Visualizer on Failure */}
                  <div className="mt-2.5">
                    <div className="text-[10px] font-bold text-slate-600 mb-1">Stage Diagnostic Status:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 text-[10px]">
                      {BLE_STAGES.map((st) => {
                        const { isCompleted, isCurrentFailing } = getStageStatus(st);
                        return (
                          <div
                            key={st.id}
                            className={`px-2 py-1 rounded border flex items-center gap-1.5 ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                                : isCurrentFailing
                                ? 'bg-red-100 text-red-900 border-red-400 font-bold ring-1 ring-red-400'
                                : 'bg-slate-100 text-slate-400 border-slate-200'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            ) : isCurrentFailing ? (
                              <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />
                            ) : (
                              <span className="w-3 h-3 rounded-full bg-slate-200 text-[8px] flex items-center justify-center text-slate-500 shrink-0">
                                {st.id}
                              </span>
                            )}
                            <span className="truncate">{st.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Retry & Dismiss */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleConnectBle}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
                <button
                  onClick={() => {
                    if (displayErrorText) setDismissedError(displayErrorText);
                    setFeedbackToast(null);
                  }}
                  className="p-1 rounded text-red-500 hover:text-red-800 hover:bg-red-100 transition-all cursor-pointer"
                  title="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success / Info Toast Notification */}
        {feedbackToast && feedbackToast.type !== 'error' && (
          <div className={`mt-2 text-xs px-3 py-2 rounded-lg border flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-200 ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              {feedbackToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {feedbackToast.type === 'info' && <Bluetooth className="w-4 h-4 text-amber-600 shrink-0" />}
              <span>{feedbackToast.message}</span>
            </div>
            <button
              onClick={() => setFeedbackToast(null)}
              className="text-slate-400 hover:text-slate-600 font-bold px-1 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
