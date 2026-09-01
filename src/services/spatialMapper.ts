import { BoundingBox, DetectedEntity, DirectionSector, HazardLevel, MovementType, ObjectCategory, SpatialMapData } from '../types';
import { formatDistance, formatDirection, formatRelativePosition } from '../utils/formatDistance';

export class SpatialMapperService {
  /**
   * Computes calibrated top-down coordinate mapping & distance estimation
   * from camera perspective geometry & physical dimension priors.
   * Field of View calibrated: 75° horizontal, 50° vertical.
   */
  public static calculateSpatialCoordinates(
    bbox: BoundingBox,
    category: ObjectCategory,
    movement: MovementType = 'stationary'
  ): {
    distanceMeters: number;
    azimuthDegrees: number;
    elevationDegrees: number;
    direction: DirectionSector;
    relativePositionText: string;
    hazardLevel: HazardLevel;
    timeToCollisionSec: number | null;
    stimulationIntensity: number;
  } {
    // Optical center of the detected object
    const centerX = bbox.x + bbox.width / 2;
    const bottomY = Math.min(1.0, bbox.y + bbox.height); // Ground contact point
    const centerY = bbox.y + bbox.height / 2;

    // Calibrated Horizontal angular offset (-37.5° to +37.5°)
    const azimuthDegrees = Math.round((centerX - 0.5) * 75);

    // Calibrated Vertical angular offset (-25° to +25°)
    const elevationDegrees = Math.round((0.5 - centerY) * 50);

    // Sector mapping
    let direction: DirectionSector = 'center';
    if (azimuthDegrees < -25) direction = 'far-left';
    else if (azimuthDegrees < -10) direction = 'mid-left';
    else if (azimuthDegrees < -3) direction = 'center-left';
    else if (azimuthDegrees <= 3) direction = 'center';
    else if (azimuthDegrees <= 10) direction = 'center-right';
    else if (azimuthDegrees <= 25) direction = 'mid-right';
    else direction = 'far-right';

    // Physical reference heights & dimensions (in meters)
    // Based on standard anthropometric and architectural benchmarks
    const referenceDimensions: Record<ObjectCategory, { height: number; width: number }> = {
      person: { height: 1.70, width: 0.50 },
      car: { height: 1.50, width: 1.80 },
      tree: { height: 3.20, width: 1.10 },
      bench: { height: 0.80, width: 1.40 },
      dog: { height: 0.50, width: 0.70 },
      steps: { height: 0.35, width: 1.20 },
      doorway: { height: 2.10, width: 0.90 },
      obstacle: { height: 0.85, width: 0.70 },
      hazard: { height: 0.90, width: 0.60 },
      cyclist: { height: 1.55, width: 0.60 }
    };

    const prior = referenceDimensions[category] || referenceDimensions.obstacle;

    // 1. Pinhole Optical Projection Model:
    // Focal length fy in normalized screen height units for a 50° vertical FOV:
    // fy = 1.0 / (2 * tan(25°)) ≈ 1.072
    const fy = 1.072;
    const apparentH = Math.max(0.04, bbox.height);
    const opticalDistance = (prior.height * fy) / apparentH;

    // 2. Ground-Plane Contact Perspective Model:
    // Assuming standard user perspective height h_cam ≈ 1.30m with a gentle 6° pitch downward tilt:
    // Objects contacting the ground lower on the screen (bottomY closer to 1.0) are nearer.
    const hCam = 1.30;
    const tiltRad = (6 * Math.PI) / 180;
    const pitchRad = Math.atan((bottomY - 0.5) / fy);
    const totalAngle = Math.max(0.12, tiltRad + pitchRad);
    const groundPlaneDistance = hCam / Math.tan(totalAngle);

    // 3. Calibrated Multi-Cues Depth Fusion:
    // For close-up objects (occupying large height), optical height is very reliable.
    // For ground obstacles (steps, tables, chairs), ground-plane contact gives stable bounds.
    let fusedDistance: number;
    if (category === 'steps' || category === 'bench') {
      fusedDistance = groundPlaneDistance * 0.7 + opticalDistance * 0.3;
    } else if (category === 'person' || category === 'doorway') {
      fusedDistance = opticalDistance * 0.65 + groundPlaneDistance * 0.35;
    } else {
      fusedDistance = opticalDistance * 0.5 + groundPlaneDistance * 0.5;
    }

    // Clamp to realistic sensor field depth (0.35m to 7.0m)
    fusedDistance = Math.max(0.35, Math.min(7.0, fusedDistance));
    // Calibrated round (2 decimals if <1m, 1 decimal if >=1m)
    const distanceMeters = fusedDistance < 1.0 
      ? Number(fusedDistance.toFixed(2))
      : Number(fusedDistance.toFixed(1));

    // Direction string label
    const relativePosition = formatRelativePosition(direction, azimuthDegrees);
    const relativePositionText = relativePosition;

    // Hazard evaluation
    let hazardLevel: HazardLevel = 'low';
    let timeToCollisionSec: number | null = null;
    let stimulationIntensity = 0.4;

    const isCentral = Math.abs(azimuthDegrees) < 18;

    if (category === 'steps' && distanceMeters < 1.8) {
      hazardLevel = 'high';
      stimulationIntensity = 0.88;
    } else if (category === 'car' && movement === 'approaching') {
      hazardLevel = distanceMeters < 5.0 ? 'critical' : 'high';
      timeToCollisionSec = Number((distanceMeters / 4.0).toFixed(1));
      stimulationIntensity = 0.98;
    } else if (distanceMeters < 1.0 && isCentral) {
      hazardLevel = 'critical';
      stimulationIntensity = 0.95;
    } else if (distanceMeters < 2.2 && isCentral) {
      hazardLevel = 'high';
      stimulationIntensity = 0.75;
    } else if (distanceMeters < 3.8) {
      hazardLevel = 'moderate';
      stimulationIntensity = 0.55;
    } else {
      hazardLevel = 'low';
      stimulationIntensity = 0.35;
    }

    return {
      distanceMeters,
      azimuthDegrees,
      elevationDegrees,
      direction,
      relativePositionText,
      hazardLevel,
      timeToCollisionSec,
      stimulationIntensity
    };
  }

  /**
   * Evaluates whole scene navigability and computes safest clearance corridor
   */
  public static generateSpatialMap(entities: DetectedEntity[]): SpatialMapData {
    const fovDegrees = 75;
    const maxRangeMeters = 6.0;

    if (entities.length === 0) {
      return {
        entities: [],
        safePathAngle: 0,
        safePathWidthMeters: 3.0,
        nearestObstacleDistance: 9.9,
        nearestObstacleSector: 'center',
        navigabilityScore: 100,
        fovDegrees,
        maxRangeMeters
      };
    }

    // Find nearest critical or high obstacle
    let nearestObstacleDistance = 9.9;
    let nearestObstacleSector: DirectionSector = 'center';

    for (const ent of entities) {
      if (ent.distanceMeters < nearestObstacleDistance) {
        nearestObstacleDistance = ent.distanceMeters;
        nearestObstacleSector = ent.direction;
      }
    }

    // Determine safe path angle by finding the widest unblocked angular sector
    // Sector buckets: -30, -20, -10, 0, +10, +20, +30
    const sectorClearance: Record<number, number> = {
      [-30]: 6.0,
      [-20]: 6.0,
      [-10]: 6.0,
      [0]: 6.0,
      [10]: 6.0,
      [20]: 6.0,
      [30]: 6.0
    };

    for (const ent of entities) {
      const az = ent.azimuthDegrees;
      for (const bucketKey of Object.keys(sectorClearance)) {
        const bucketAngle = Number(bucketKey);
        if (Math.abs(az - bucketAngle) < 18) {
          sectorClearance[bucketAngle] = Math.min(sectorClearance[bucketAngle], ent.distanceMeters);
        }
      }
    }

    let bestAngle = 0;
    let maxClearance = -1;

    for (const [angleStr, clearance] of Object.entries(sectorClearance)) {
      const angle = Number(angleStr);
      // Bias slightly towards forward center
      const centerBonus = Math.abs(angle) === 0 ? 0.8 : (Math.abs(angle) <= 10 ? 0.4 : 0);
      const score = clearance + centerBonus;
      if (score > maxClearance) {
        maxClearance = score;
        bestAngle = angle;
      }
    }

    // Navigability score
    const navigabilityScore = Math.max(15, Math.min(100, Math.round((maxClearance / 6.0) * 100)));
    const safePathWidthMeters = Number((Math.min(3.2, Math.max(1.2, maxClearance * 0.5))).toFixed(1));

    return {
      entities,
      safePathAngle: bestAngle,
      safePathWidthMeters,
      nearestObstacleDistance,
      nearestObstacleSector,
      navigabilityScore,
      fovDegrees,
      maxRangeMeters
    };
  }

  /**
   * Replaces estimated camera depth with real Bluetooth VL53L0X Time-of-Flight sensor reading
   * for detected entities while maintaining camera object recognition.
   */
  public static applyLiveSensorDistance(
    entities: DetectedEntity[],
    sensorDistanceMeters: number,
    selectedEntityId: string | null = null
  ): DetectedEntity[] {
    if (entities.length === 0 || !sensorDistanceMeters || sensorDistanceMeters <= 0) {
      return entities;
    }

    // Find the primary target (selected entity, or the one closest to boresight center)
    let targetIndex = -1;
    if (selectedEntityId) {
      targetIndex = entities.findIndex(e => e.id === selectedEntityId);
    }
    if (targetIndex === -1) {
      // Find entity closest to central azimuth (where the VL53L0X laser points)
      let minAzimuthDiff = 999;
      entities.forEach((e, idx) => {
        const diff = Math.abs(e.azimuthDegrees);
        if (diff < minAzimuthDiff) {
          minAzimuthDiff = diff;
          targetIndex = idx;
        }
      });
    }

    return entities.map((ent, idx) => {
      // If this is the primary forward target or if single entity, apply exact sensor distance
      const isTarget = idx === targetIndex || entities.length === 1;
      const distanceMeters = isTarget ? Number(sensorDistanceMeters.toFixed(2)) : ent.distanceMeters;
      const distanceMm = Math.round(distanceMeters * 1000);
      const isCentral = Math.abs(ent.azimuthDegrees) < 18;

      let hazardLevel: HazardLevel = 'low';
      let stimulationIntensity = 0.35;
      let timeToCollisionSec = ent.timeToCollisionSec;

      if (ent.category === 'steps' && distanceMeters < 1.8) {
        hazardLevel = 'high';
        stimulationIntensity = 0.88;
      } else if (ent.category === 'car' && ent.movement === 'approaching') {
        hazardLevel = distanceMeters < 5.0 ? 'critical' : 'high';
        timeToCollisionSec = Number((distanceMeters / 4.0).toFixed(1));
        stimulationIntensity = 0.98;
      } else if (distanceMeters < 1.0 && isCentral) {
        hazardLevel = 'critical';
        stimulationIntensity = 0.95;
      } else if (distanceMeters < 2.2 && isCentral) {
        hazardLevel = 'high';
        stimulationIntensity = 0.75;
      } else if (distanceMeters < 3.8) {
        hazardLevel = 'moderate';
        stimulationIntensity = 0.55;
      }

      return {
        ...ent,
        distanceMeters,
        distanceMm,
        distanceSource: isTarget ? 'vl53l0x' : (ent.distanceSource || 'camera-depth'),
        hazardLevel,
        stimulationIntensity,
        timeToCollisionSec,
        relativePositionText: formatRelativePosition(ent.direction, ent.azimuthDegrees)
      };
    });
  }
}
