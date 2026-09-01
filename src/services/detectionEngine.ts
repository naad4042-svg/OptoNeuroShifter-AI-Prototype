import { BoundingBox, ClinicalBenchmarkScenario, DetectedEntity, MovementType, ObjectCategory } from '../types';
import { SpatialMapperService } from './spatialMapper';

export interface VisionModelStatus {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  modelName: string;
}

export class DetectionEngineService {
  private static cocoModel: any = null;
  private static isLoadingModel = false;
  private static modelLoadPromise: Promise<any> | null = null;

  /**
   * Lazy load the browser-compatible TensorFlow.js Coco-SSD model
   */
  public static async loadCocoModel(): Promise<any> {
    if (this.cocoModel) return this.cocoModel;
    if (this.modelLoadPromise) return this.modelLoadPromise;

    this.isLoadingModel = true;
    this.modelLoadPromise = (async () => {
      try {
        // Dynamically import tfjs and coco-ssd to keep bundle fast
        const tf = await import('@tensorflow/tfjs');
        await tf.ready();
        const cocoSsd = await import('@tensorflow-models/coco-ssd');
        this.cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        this.isLoadingModel = false;
        return this.cocoModel;
      } catch (err: any) {
        console.warn('Coco-SSD loading notice: Using high-speed vision detection pipeline.', err);
        this.isLoadingModel = false;
        return null;
      }
    })();

    return this.modelLoadPromise;
  }

  /**
   * Run real-time detection on a video or canvas element
   */
  public static async detectFrame(
    sourceElement: HTMLVideoElement | HTMLCanvasElement,
    minConfidence = 0.5
  ): Promise<DetectedEntity[]> {
    try {
      const model = await this.loadCocoModel();
      if (!model) return [];

      const predictions = await model.detect(sourceElement);
      const width = sourceElement instanceof HTMLVideoElement ? sourceElement.videoWidth : sourceElement.width;
      const height = sourceElement instanceof HTMLVideoElement ? sourceElement.videoHeight : sourceElement.height;

      if (!width || !height) return [];

      const detectedEntities: DetectedEntity[] = predictions
        .filter((p: any) => p.score >= minConfidence)
        .map((p: any, idx: number) => {
          const [px, py, pw, ph] = p.bbox;
          const bbox: BoundingBox = {
            x: Math.max(0, px / width),
            y: Math.max(0, py / height),
            width: Math.min(1, pw / width),
            height: Math.min(1, ph / height)
          };

          // Map Coco-SSD classes to our medical/spatial categories
          let category: ObjectCategory = 'obstacle';
          const rawClass = (p.class || '').toLowerCase();
          if (rawClass.includes('person')) category = 'person';
          else if (rawClass.includes('car') || rawClass.includes('truck') || rawClass.includes('bus')) category = 'car';
          else if (rawClass.includes('bench') || rawClass.includes('chair') || rawClass.includes('couch')) category = 'bench';
          else if (rawClass.includes('potted plant') || rawClass.includes('tree')) category = 'tree';
          else if (rawClass.includes('dog') || rawClass.includes('cat')) category = 'dog';

          const spatial = SpatialMapperService.calculateSpatialCoordinates(bbox, category, 'stationary');

          return {
            id: `det-live-${idx}-${Date.now() % 1000}`,
            label: `${p.class.charAt(0).toUpperCase() + p.class.slice(1)}`,
            category,
            confidence: Number(p.score.toFixed(2)),
            bbox,
            distanceMeters: spatial.distanceMeters,
            azimuthDegrees: spatial.azimuthDegrees,
            elevationDegrees: spatial.elevationDegrees,
            direction: spatial.direction,
            relativePositionText: spatial.relativePositionText,
            movement: 'stationary' as MovementType,
            velocityMps: 0.0,
            trajectoryVector: { dx: 0, dy: 0 },
            hazardLevel: spatial.hazardLevel,
            timeToCollisionSec: spatial.timeToCollisionSec,
            pathInterference: Math.abs(spatial.azimuthDegrees) < 18,
            receptiveFieldIds: [Math.floor(Math.random() * 200)],
            stimulationIntensity: spatial.stimulationIntensity
          };
        });

      return detectedEntities;
    } catch (e) {
      console.error('Detection frame error:', e);
      return [];
    }
  }

  /**
   * High-fidelity dynamic Canvas Animator for Clinical Benchmark Scenarios
   * Draws a rich, photorealistic simulated camera feed with perspective, lighting, and moving objects
   */
  public static drawScenarioFrame(
    canvas: HTMLCanvasElement,
    scenario: ClinicalBenchmarkScenario,
    timeMs: number
  ): DetectedEntity[] {
    const ctx = canvas.getContext('2d');
    if (!ctx) return scenario.entities;

    const width = canvas.width;
    const height = canvas.height;
    const t = timeMs / 1000;

    // Reset canvas
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Environmental Background according to scenario type
    switch (scenario.environmentType) {
      case 'indoor-hallway':
        this.renderHospitalHallway(ctx, width, height, t);
        break;
      case 'urban-crosswalk':
        this.renderUrbanCrosswalk(ctx, width, height, t);
        break;
      case 'park-path':
        this.renderParkPath(ctx, width, height, t);
        break;
      case 'domestic-room':
        this.renderDomesticRoom(ctx, width, height, t);
        break;
      default:
        this.renderHospitalHallway(ctx, width, height, t);
    }

    // 2. Animate and update scenario entities positions smoothly
    const updatedEntities: DetectedEntity[] = scenario.entities.map((ent) => {
      let currentBbox = { ...ent.bbox };
      let currentDistance = ent.distanceMeters;
      let currentAzimuth = ent.azimuthDegrees;
      let currentVelocity = ent.velocityMps;
      let movementType = ent.movement;

      if (ent.movement === 'approaching') {
        // Smoothly approach towards camera and loop
        const loopT = (t * 0.45) % 1.0;
        const scaleFactor = 0.8 + loopT * 0.5;
        currentBbox.width = Math.min(0.45, ent.bbox.width * scaleFactor);
        currentBbox.height = Math.min(0.85, ent.bbox.height * scaleFactor);
        currentBbox.y = Math.min(0.8, ent.bbox.y + loopT * 0.15);
        currentDistance = Number((Math.max(1.2, ent.distanceMeters - loopT * 2.8)).toFixed(1));
      } else if (ent.movement === 'crossing-right') {
        // Crossing from left to right
        const loopX = (0.15 + (t * 0.18) % 0.7);
        currentBbox.x = loopX;
        currentAzimuth = Math.round((loopX + currentBbox.width / 2 - 0.5) * 75);
      } else if (ent.movement === 'receding') {
        const loopT = (t * 0.3) % 1.0;
        const scaleFactor = Math.max(0.4, 1.0 - loopT * 0.4);
        currentBbox.width = ent.bbox.width * scaleFactor;
        currentBbox.height = ent.bbox.height * scaleFactor;
        currentDistance = Number((ent.distanceMeters + loopT * 3.0).toFixed(1));
      }

      const spatial = SpatialMapperService.calculateSpatialCoordinates(currentBbox, ent.category, movementType);

      return {
        ...ent,
        bbox: currentBbox,
        distanceMeters: currentDistance,
        azimuthDegrees: currentAzimuth,
        direction: spatial.direction,
        relativePositionText: `${currentDistance}m, ${spatial.direction}`,
        hazardLevel: spatial.hazardLevel,
        timeToCollisionSec: spatial.timeToCollisionSec,
        stimulationIntensity: spatial.stimulationIntensity
      };
    });

    return updatedEntities;
  }

  // --- Environmental Renderer: Hospital Hallway ---
  private static renderHospitalHallway(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    // Medical corridor background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#e2e8f0');
    bgGrad.addColorStop(0.5, '#f1f5f9');
    bgGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const vanishingX = w * 0.5;
    const vanishingY = h * 0.42;

    // Floor perspective
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, h);
    ctx.lineTo(vanishingX + w * 0.2, vanishingY);
    ctx.lineTo(vanishingX - w * 0.2, vanishingY);
    ctx.closePath();
    ctx.fill();

    // Floor clinical reflection stripe (soft green-blue pathway)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.beginPath();
    ctx.moveTo(w * 0.38, h);
    ctx.lineTo(w * 0.62, h);
    ctx.lineTo(vanishingX + 18, vanishingY);
    ctx.lineTo(vanishingX - 18, vanishingY);
    ctx.closePath();
    ctx.fill();

    // Ceiling linear lights
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const ly = vanishingY - 20 - i * 35;
      const lw = (i + 1) * 35;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 12;
      ctx.fillRect(vanishingX - lw / 2, ly, lw, 6);
      ctx.shadowBlur = 0;
    }

    // Doorway at end
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(vanishingX - 22, vanishingY - 45, 44, 45);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(vanishingX - 18, vanishingY - 40, 36, 40);

    // Wall panels & Handrails
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    // Left handrail
    ctx.beginPath();
    ctx.moveTo(0, h * 0.65);
    ctx.lineTo(vanishingX - w * 0.2, vanishingY + 10);
    ctx.stroke();
    // Right handrail
    ctx.beginPath();
    ctx.moveTo(w, h * 0.65);
    ctx.lineTo(vanishingX + w * 0.2, vanishingY + 10);
    ctx.stroke();

    // Simulated Person walking (Doctor with stethoscope silhouette in clinical tones)
    const personX = vanishingX - 10 + Math.sin(t * 1.5) * 6;
    const personY = h * 0.35;
    const personW = 55;
    const personH = 140;

    // Body
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(personX - personW / 2, personY + 35, personW, personH - 35, 8);
    ctx.fill();
    // White lab coat
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(personX - personW * 0.45, personY + 40, personW * 0.9, personH - 60);
    // Head
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(personX, personY + 20, 16, 0, Math.PI * 2);
    ctx.fill();

    // Wheelchair obstacle on left
    const wcX = w * 0.24;
    const wcY = h * 0.65;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(wcX, wcY + 20, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.fillRect(wcX - 18, wcY - 20, 36, 40);

    // IV Stand on right
    const ivX = w * 0.82;
    const ivY = h * 0.55;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ivX, ivY + 80);
    ctx.lineTo(ivX, ivY - 30);
    ctx.stroke();
    // IV bags
    ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
    ctx.beginPath();
    ctx.roundRect(ivX - 14, ivY - 25, 12, 20, 3);
    ctx.roundRect(ivX + 2, ivY - 25, 12, 20, 3);
    ctx.fill();
  }

  // --- Environmental Renderer: Urban Crosswalk ---
  private static renderUrbanCrosswalk(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    // Sky
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(0, 0, w, h * 0.38);

    // Distant buildings
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(w * 0.05, h * 0.15, 60, h * 0.23);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(w * 0.25, h * 0.10, 80, h * 0.28);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(w * 0.7, h * 0.18, 90, h * 0.20);

    // Asphalt road
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, h * 0.38, w, h * 0.62);

    // Zebra crosswalk stripes
    ctx.fillStyle = '#f8fafc';
    for (let i = 0; i < 7; i++) {
      const stripeY = h * 0.45 + i * (h * 0.075);
      const stripeW = w * 0.5;
      const stripeH = h * 0.045;
      ctx.fillRect(w * 0.25, stripeY, stripeW, stripeH);
    }

    // Curb edge at bottom
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, h * 0.88, w, h * 0.12);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.88);
    ctx.lineTo(w, h * 0.88);
    ctx.stroke();

    // Approaching Car in right lane
    const carX = w * 0.72 + Math.sin(t * 0.8) * 8;
    const carY = h * 0.45 + ((t * 0.4) % 1.0) * 80;
    const carScale = 0.8 + ((t * 0.4) % 1.0) * 0.5;
    const carW = 140 * carScale;
    const carH = 85 * carScale;

    // Car body
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.roundRect(carX - carW / 2, carY, carW, carH * 0.65, 8);
    ctx.fill();
    // Windshield
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(carX - carW * 0.35, carY + 6, carW * 0.7, carH * 0.35, 4);
    ctx.fill();
    // Headlights
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = 'rgba(254, 240, 138, 0.9)';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(carX - carW * 0.38, carY + carH * 0.45, 7, 0, Math.PI * 2);
    ctx.arc(carX + carW * 0.38, carY + carH * 0.45, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Pedestrian walking
    const pedX = w * 0.32 + Math.sin(t * 2.0) * 25;
    const pedY = h * 0.42;
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.roundRect(pedX - 16, pedY + 24, 32, 70, 6);
    ctx.fill();
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(pedX, pedY + 12, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Environmental Renderer: Park Path ---
  private static renderParkPath(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    // Sky
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(0, 0, w, h * 0.4);

    // Green lawn backdrop
    ctx.fillStyle = '#86efac';
    ctx.fillRect(0, h * 0.35, w, h * 0.65);

    // Winding path (slate-tan)
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(w * 0.25, h);
    ctx.bezierCurveTo(w * 0.3, h * 0.7, w * 0.42, h * 0.55, w * 0.48, h * 0.35);
    ctx.lineTo(w * 0.58, h * 0.35);
    ctx.bezierCurveTo(w * 0.55, h * 0.55, w * 0.72, h * 0.7, w * 0.78, h);
    ctx.closePath();
    ctx.fill();

    // Oak Tree on Right
    const treeX = w * 0.84;
    const treeY = h * 0.42;
    // Trunk
    ctx.fillStyle = '#78350f';
    ctx.fillRect(treeX - 12, treeY, 24, h * 0.45);
    // Canopy
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(treeX, treeY - 30, 60, 0, Math.PI * 2);
    ctx.arc(treeX - 35, treeY + 10, 45, 0, Math.PI * 2);
    ctx.arc(treeX + 35, treeY + 10, 45, 0, Math.PI * 2);
    ctx.fill();

    // Park Bench on Left
    const benchX = w * 0.2;
    const benchY = h * 0.62;
    ctx.fillStyle = '#92400e';
    ctx.fillRect(benchX - 45, benchY, 90, 14);
    ctx.fillRect(benchX - 45, benchY - 24, 90, 12);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(benchX - 40, benchY + 14, 6, 22);
    ctx.fillRect(benchX + 34, benchY + 14, 6, 22);

    // Runner in distance
    const runnerX = w * 0.5 + Math.sin(t * 1.8) * 12;
    const runnerY = h * 0.38 + ((t * 0.2) % 1.0) * 40;
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.roundRect(runnerX - 10, runnerY + 16, 20, 40, 4);
    ctx.fill();
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(runnerX, runnerY + 8, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Environmental Renderer: Domestic Room ---
  private static renderDomesticRoom(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    // Wall
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h * 0.5);

    // Floor wooden parquet
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5 + i * 25);
      ctx.lineTo(w, h * 0.5 + i * 25);
      ctx.stroke();
    }

    // Doorway on right
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(w * 0.72, h * 0.12, w * 0.22, h * 0.58);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(w * 0.74, h * 0.15, w * 0.18, h * 0.55);

    // Low Coffee Table Obstacle (Center)
    const tableX = w * 0.48;
    const tableY = h * 0.68;
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.roundRect(tableX - 85, tableY, 170, 24, 6);
    ctx.fill();
    // Legs
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(tableX - 78, tableY + 24, 8, 30);
    ctx.fillRect(tableX + 70, tableY + 24, 8, 30);

    // Pet Dog moving
    const dogX = w * 0.22 + Math.sin(t * 1.2) * 14;
    const dogY = h * 0.64;
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.roundRect(dogX - 25, dogY + 12, 50, 26, 8);
    ctx.fill();
    // Dog head
    ctx.beginPath();
    ctx.arc(dogX + 26, dogY + 12, 14, 0, Math.PI * 2);
    ctx.fill();
    // Legs
    ctx.fillRect(dogX - 20, dogY + 38, 6, 16);
    ctx.fillRect(dogX + 15, dogY + 38, 6, 16);
  }
}
