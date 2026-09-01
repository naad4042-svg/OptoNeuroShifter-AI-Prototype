/**
 * OptoNeuroShifter - AI-Based Alternative Pathway for Visual Information
 * Research Prototype & Simulation Dashboard
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { SafetyResearchNote } from './components/SafetyResearchNote';
import { LiveEnvironmentalInput } from './components/LiveEnvironmentalInput';
import { SceneUnderstanding } from './components/SceneUnderstanding';
import { SpatialRepresentation } from './components/SpatialRepresentation';
import { NeuralEncodingSimulation } from './components/NeuralEncodingSimulation';
import { PipelineBottomFlow } from './components/PipelineBottomFlow';
import { PresentationGuideModal } from './components/PresentationGuideModal';
import { ResearchTelemetryModal } from './components/ResearchTelemetryModal';

import { CLINICAL_SCENARIOS } from './data/scenarios';
import { 
  ClinicalBenchmarkScenario, 
  DetectedEntity, 
  NeuralEncodingProtocol, 
  NeuralSimulationState, 
  SpatialMapData, 
  SystemPipelineTelemetry 
} from './types';
import { DetectionEngineService } from './services/detectionEngine';
import { SpatialMapperService } from './services/spatialMapper';
import { NeuralEncoderService } from './services/neuralEncoder';
import { SpatialAudioService } from './services/spatialAudio';
import { microbitBleService, MicrobitConnectionState } from './services/microbitBleService';

export default function App() {
  // Scenario & Source State
  const [currentScenario, setCurrentScenario] = useState<ClinicalBenchmarkScenario>(CLINICAL_SCENARIOS[0]);
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // micro:bit Bluetooth & VL53L0X state
  const [bleState, setBleState] = useState<MicrobitConnectionState>(microbitBleService.getState());

  // Entities & Processing State
  const [detectedEntities, setDetectedEntities] = useState<DetectedEntity[]>(currentScenario.entities);
  const [spatialMapData, setSpatialMapData] = useState<SpatialMapData>(() => 
    SpatialMapperService.generateSpatialMap(currentScenario.entities)
  );
  
  // Neural Simulation State
  const [gridSize, setGridSize] = useState<16 | 24 | 32>(16);
  const [neuralProtocol, setNeuralProtocol] = useState<NeuralEncodingProtocol>('retinotopic_v1');
  const [neuralState, setNeuralState] = useState<NeuralSimulationState>(() => 
    NeuralEncoderService.generateCorticalGrid(16, 'retinotopic_v1', currentScenario.entities, 0)
  );

  // Interaction State
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedElectrodeId, setSelectedElectrodeId] = useState<number | null>(null);
  const [minConfidence, setMinConfidence] = useState<number>(0.65);
  const [showDepthOverlay, setShowDepthOverlay] = useState<boolean>(false);
  const [showVectors, setShowVectors] = useState<boolean>(true);

  // Modals
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState<boolean>(false);

  // Real-time Telemetry
  const [fps, setFps] = useState<number>(40);
  const [telemetry, setTelemetry] = useState<SystemPipelineTelemetry>({
    status: 'Prototype Mode',
    simulationReady: true,
    inputFps: 40,
    cameraLatencyMs: 6,
    aiInferenceLatencyMs: 14,
    spatialMappingLatencyMs: 3,
    neuralEncodingLatencyMs: 2,
    totalPipelineLatencyMs: 25,
    framesProcessed: 120,
    modelConfidenceAverage: 0.94,
    channelBandwidthKbps: 48
  });

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const pulsePhaseRef = useRef<number>(0);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  // Subscribe to micro:bit BLE state changes
  useEffect(() => {
    const unsubscribe = microbitBleService.subscribe(setBleState);
    return () => unsubscribe();
  }, []);

  // Handle Scenario Change
  const handleSelectScenario = (scenario: ClinicalBenchmarkScenario) => {
    setCurrentScenario(scenario);
    let entities = scenario.entities;
    if (bleState.isLiveSensorActive && bleState.sensorDistanceMeters !== null) {
      entities = SpatialMapperService.applyLiveSensorDistance(entities, bleState.sensorDistanceMeters, selectedEntityId);
    }
    setDetectedEntities(entities);
    const spatial = SpatialMapperService.generateSpatialMap(entities);
    setSpatialMapData(spatial);
    const neural = NeuralEncoderService.generateCorticalGrid(gridSize, neuralProtocol, entities, pulsePhaseRef.current);
    setNeuralState(neural);
    setSelectedEntityId(null);
  };

  // Handle Webcam Start/Stop
  const handleToggleWebcam = async () => {
    if (isWebcamActive) {
      // Stop webcam
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
        webcamStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsWebcamActive(false);
      setCameraError(null);
      handleSelectScenario(currentScenario);
    } else {
      // Start webcam
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' }
        });
        webcamStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
          };
        }
        setIsWebcamActive(true);
        // Preload COCO model
        DetectionEngineService.loadCocoModel();
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraError('Unable to open camera hardware. Using synthetic clinical stream.');
        setIsWebcamActive(false);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Main Real-Time Simulation Loop
  const runSimulationTick = useCallback(async (time: number) => {
    if (!isRunning) {
      animationFrameId.current = requestAnimationFrame(runSimulationTick);
      return;
    }

    const delta = time - lastFrameTimeRef.current;
    if (delta > 22) { // Target ~40-45 FPS
      lastFrameTimeRef.current = time;
      pulsePhaseRef.current = (pulsePhaseRef.current + 0.12) % (2 * Math.PI);
      const calculatedFps = Math.round(1000 / Math.max(16, delta));
      setFps(calculatedFps);

      let currentEntities: DetectedEntity[] = [];

      if (isWebcamActive && videoRef.current && videoRef.current.readyState >= 2) {
        // Live Webcam Inference
        const detected = await DetectionEngineService.detectFrame(videoRef.current, minConfidence);
        currentEntities = detected.length > 0 ? detected : detectedEntities;
      } else if (canvasRef.current) {
        // High-precision Synthetic Scenario Animation
        currentEntities = DetectionEngineService.drawScenarioFrame(
          canvasRef.current,
          currentScenario,
          time
        );
      }

      if (currentEntities.length > 0) {
        // If micro:bit VL53L0X distance sensor is active, replace estimated distance with real sensor value
        if (bleState.isLiveSensorActive && bleState.sensorDistanceMeters !== null) {
          currentEntities = SpatialMapperService.applyLiveSensorDistance(
            currentEntities,
            bleState.sensorDistanceMeters,
            selectedEntityId
          );
        }

        setDetectedEntities(currentEntities);

        // Compute Spatial Map
        const spatial = SpatialMapperService.generateSpatialMap(currentEntities);
        setSpatialMapData(spatial);

        // Compute Neural Retinotopic Encoding Grid
        const neural = NeuralEncoderService.generateCorticalGrid(
          gridSize,
          neuralProtocol,
          currentEntities,
          pulsePhaseRef.current
        );
        setNeuralState(neural);

        // Trigger Audio Cues if active
        if (isAudioActive) {
          const nearest = currentEntities.reduce((prev, curr) => 
            curr.distanceMeters < prev.distanceMeters ? curr : prev, currentEntities[0]
          );
          if (nearest && nearest.distanceMeters < 4.0) {
            SpatialAudioService.playProximityCue(
              nearest.distanceMeters, 
              nearest.azimuthDegrees, 
              nearest.hazardLevel === 'critical'
            );
          }
        }

        // Update telemetry counters
        setTelemetry(prev => ({
          ...prev,
          inputFps: calculatedFps,
          framesProcessed: prev.framesProcessed + 1,
          totalPipelineLatencyMs: 22 + Math.floor(Math.sin(time * 0.005) * 3)
        }));
      }
    }

    animationFrameId.current = requestAnimationFrame(runSimulationTick);
  }, [isRunning, isWebcamActive, currentScenario, minConfidence, gridSize, neuralProtocol, isAudioActive, detectedEntities, bleState, selectedEntityId]);

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(runSimulationTick);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [runSimulationTick]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Top Application Header */}
      <Header
        currentScenario={currentScenario}
        onSelectScenario={handleSelectScenario}
        isWebcamActive={isWebcamActive}
        onToggleWebcam={handleToggleWebcam}
        isAudioActive={isAudioActive}
        onToggleAudio={() => setIsAudioActive(!isAudioActive)}
        isRunning={isRunning}
        onTogglePlay={() => setIsRunning(!isRunning)}
        onOpenTelemetryModal={() => setIsTelemetryOpen(true)}
        onOpenGuideModal={() => setIsGuideOpen(true)}
        fps={fps}
        totalLatencyMs={telemetry.totalPipelineLatencyMs}
        bleState={bleState}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 space-y-4">
        
        {/* Section F: Prominent Safety & Research Disclaimer Note */}
        <SafetyResearchNote />

        {/* 2x2 Grid of Core Research Pipeline Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Section A: Live Environmental Input */}
          <div className="min-h-[380px]">
            <LiveEnvironmentalInput
              currentScenario={currentScenario}
              detectedEntities={detectedEntities}
              isWebcamActive={isWebcamActive}
              selectedEntityId={selectedEntityId}
              onSelectEntity={setSelectedEntityId}
              videoRef={videoRef}
              canvasRef={canvasRef}
              minConfidence={minConfidence}
              onChangeMinConfidence={setMinConfidence}
              showDepthOverlay={showDepthOverlay}
              onToggleDepthOverlay={() => setShowDepthOverlay(!showDepthOverlay)}
              showVectors={showVectors}
              onToggleVectors={() => setShowVectors(!showVectors)}
              cameraError={cameraError}
              bleState={bleState}
            />
          </div>

          {/* Section B: AI Scene Understanding */}
          <div className="min-h-[380px]">
            <SceneUnderstanding
              detectedEntities={detectedEntities}
              spatialMapData={spatialMapData}
              selectedEntityId={selectedEntityId}
              onSelectEntity={setSelectedEntityId}
              bleState={bleState}
            />
          </div>

          {/* Section C: Spatial Representation */}
          <div className="min-h-[380px]">
            <SpatialRepresentation
              spatialMapData={spatialMapData}
              selectedEntityId={selectedEntityId}
              onSelectEntity={setSelectedEntityId}
            />
          </div>

          {/* Section D: Neural Encoding Simulation */}
          <div className="min-h-[380px]">
            <NeuralEncodingSimulation
              neuralState={neuralState}
              onChangeProtocol={setNeuralProtocol}
              onChangeGridSize={setGridSize}
              selectedElectrodeId={selectedElectrodeId}
              onSelectElectrode={setSelectedElectrodeId}
            />
          </div>

        </div>

        {/* Bottom Flow: Complete End-to-End Pipeline */}
        <PipelineBottomFlow />

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>OptoNeuroShifter</strong> • In-Silico Computational Vision Research System
          </span>
          <span className="text-[11px] text-slate-400">
            For presentation &amp; educational simulation purposes only • Not for clinical diagnostic use
          </span>
        </div>
      </footer>

      {/* Modals */}
      <PresentationGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <ResearchTelemetryModal
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
        detectedEntities={detectedEntities}
        spatialMapData={spatialMapData}
        neuralState={neuralState}
        telemetry={telemetry}
      />

    </div>
  );
}

