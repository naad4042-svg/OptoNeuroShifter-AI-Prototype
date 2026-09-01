import React, { useRef, useEffect } from 'react';
import { 
  Radar, 
  MapPin, 
  Navigation, 
  Maximize2, 
  Compass, 
  Crosshair, 
  Info,
  ShieldCheck
} from 'lucide-react';
import { DetectedEntity, SpatialMapData } from '../types';
import { formatDistance } from '../utils/formatDistance';

interface SpatialRepresentationProps {
  spatialMapData: SpatialMapData;
  selectedEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
}

export const SpatialRepresentation: React.FC<SpatialRepresentationProps> = ({
  spatialMapData,
  selectedEntityId,
  onSelectEntity
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clean white-slate canvas background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Coordinate system: Ego position is bottom center (x: width/2, y: height - 25)
    const egoX = width / 2;
    const egoY = height - 30;
    const maxRangeM = 6.0;
    const pixelsPerMeter = (egoY - 35) / maxRangeM;

    // 1. Draw Field of View (FOV) cone (75 degrees: -37.5° to +37.5°)
    const halfFovRad = (37.5 * Math.PI) / 180;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.04)';
    ctx.beginPath();
    ctx.moveTo(egoX, egoY);
    ctx.arc(egoX, egoY, maxRangeM * pixelsPerMeter, -Math.PI / 2 - halfFovRad, -Math.PI / 2 + halfFovRad);
    ctx.closePath();
    ctx.fill();

    // 2. Draw Safe Walking Passage Corridor (Soft Emerald polygon)
    const safeAngleRad = (spatialMapData.safePathAngle * Math.PI) / 180;
    const corridorHalfWidthM = spatialMapData.safePathWidthMeters / 2;
    const corridorHalfAngle = Math.atan2(corridorHalfWidthM, 3.0);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.beginPath();
    ctx.moveTo(egoX, egoY);
    ctx.arc(
      egoX,
      egoY,
      maxRangeM * pixelsPerMeter * 0.95,
      -Math.PI / 2 + safeAngleRad - corridorHalfAngle,
      -Math.PI / 2 + safeAngleRad + corridorHalfAngle
    );
    ctx.closePath();
    ctx.fill();

    // Safe Corridor Centerline
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(egoX, egoY);
    const endPassageX = egoX + Math.sin(safeAngleRad) * maxRangeM * pixelsPerMeter * 0.95;
    const endPassageY = egoY - Math.cos(safeAngleRad) * maxRangeM * pixelsPerMeter * 0.95;
    ctx.lineTo(endPassageX, endPassageY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Draw Concentric Distance Rings (1m, 2m, 3m, 4m, 5m, 6m)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;

    for (let m = 1; m <= 6; m++) {
      const radiusPx = m * pixelsPerMeter;
      ctx.beginPath();
      ctx.arc(egoX, egoY, radiusPx, -Math.PI / 2 - halfFovRad, -Math.PI / 2 + halfFovRad);
      ctx.stroke();

      // Distance labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`${m}m`, egoX + 4, egoY - radiusPx + 10);
    }

    // 4. Draw Radial Angle Guides (-30°, 0°, +30°)
    [-30, 0, 30].forEach((deg) => {
      const rad = (deg * Math.PI) / 180;
      const rx = egoX + Math.sin(rad) * maxRangeM * pixelsPerMeter;
      const ry = egoY - Math.cos(rad) * maxRangeM * pixelsPerMeter;

      ctx.strokeStyle = deg === 0 ? '#cbd5e1' : '#f1f5f9';
      ctx.lineWidth = deg === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(egoX, egoY);
      ctx.lineTo(rx, ry);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px Plus Jakarta Sans, sans-serif';
      ctx.fillText(`${deg}°`, rx - 8, ry - 6);
    });

    // 5. Draw Detected Object Spatial Markers
    spatialMapData.entities.forEach((ent) => {
      const isSelected = selectedEntityId === ent.id;
      const rad = (ent.azimuthDegrees * Math.PI) / 180;
      const distPx = ent.distanceMeters * pixelsPerMeter;

      const px = egoX + Math.sin(rad) * distPx;
      const py = egoY - Math.cos(rad) * distPx;

      // Hazard proximity warning halo
      if (ent.hazardLevel === 'critical' || ent.hazardLevel === 'high') {
        ctx.fillStyle = ent.hazardLevel === 'critical' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.15)';
        ctx.beginPath();
        ctx.arc(px, py, isSelected ? 22 : 16, 0, Math.PI * 2);
        ctx.fill();
      }

      // Movement vector arrow
      if (ent.movement !== 'stationary') {
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        
        let vecX = 0;
        let vecY = 0;
        if (ent.movement === 'approaching') {
          vecX = -Math.sin(rad) * 22;
          vecY = Math.cos(rad) * 22;
        } else if (ent.movement === 'receding') {
          vecX = Math.sin(rad) * 22;
          vecY = -Math.cos(rad) * 22;
        } else if (ent.movement === 'crossing-right') {
          vecX = 22;
        } else if (ent.movement === 'crossing-left') {
          vecX = -22;
        }

        ctx.lineTo(px + vecX, py + vecY);
        ctx.stroke();

        // Arrow tip
        ctx.fillStyle = '#7c3aed';
        ctx.beginPath();
        ctx.arc(px + vecX, py + vecY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Main Node Marker
      let nodeColor = '#3b82f6';
      if (ent.hazardLevel === 'critical') nodeColor = '#ef4444';
      else if (ent.hazardLevel === 'high') nodeColor = '#f97316';
      else if (ent.category === 'doorway') nodeColor = '#10b981';

      ctx.fillStyle = nodeColor;
      ctx.beginPath();
      ctx.arc(px, py, isSelected ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();

      // White outline ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Selected ring
      if (isSelected) {
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 11, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 10px Plus Jakarta Sans, sans-serif';
      const labelText = `${ent.label.split('(')[0].trim()} (${formatDistance(ent.distanceMeters)})`;
      ctx.fillText(labelText, px + 8, py - 4);
    });

    // 6. Draw Ego-User Position at origin (Ego Sensor Array)
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(egoX, egoY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Directional orientation chevron
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(egoX, egoY - 5);
    ctx.lineTo(egoX - 4, egoY + 3);
    ctx.lineTo(egoX + 4, egoY + 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px Plus Jakarta Sans, sans-serif';
    ctx.fillText('EGO ORIGIN (0,0)', egoX - 42, egoY + 18);

  }, [spatialMapData, selectedEntityId]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-full overflow-hidden">
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-600 text-white shadow-2xs">
            <Radar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700">Section C</span>
              <h2 className="text-sm font-bold text-slate-900">SPATIAL REPRESENTATION</h2>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Simplified Top-Down 2D Spatial Map (Birds-Eye Egocentric Projection)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Path Corridor: {spatialMapData.safePathAngle}°
          </span>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative flex-1 min-h-[300px] flex items-center justify-center bg-white p-3">
        <canvas
          ref={canvasRef}
          width={440}
          height={320}
          className="w-full h-full max-h-[320px] object-contain rounded-lg border border-slate-100"
        />

        {/* Legend Overlay */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-xs p-2 rounded-lg border border-slate-200 shadow-xs text-[10px] space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Safe Corridor</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Target Obstacle</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Critical Hazard</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
        <span>Coordinate Scale: <strong>0 - 6.0 Meters Depth</strong></span>
        <span>Aperture: <strong>75° Horizontal FOV</strong></span>
      </div>

    </div>
  );
};
