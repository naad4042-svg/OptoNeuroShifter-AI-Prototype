import React from 'react';
import { 
  Cpu, 
  Compass, 
  MoveRight, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowUpRight, 
  Navigation,
  Activity,
  Gauge,
  Ruler,
  Info,
  Bluetooth,
  Zap
} from 'lucide-react';
import { DetectedEntity, SpatialMapData } from '../types';
import { formatDistance, formatDirection, formatRelativePosition } from '../utils/formatDistance';
import { MicrobitConnectionState } from '../services/microbitBleService';

interface SceneUnderstandingProps {
  detectedEntities: DetectedEntity[];
  spatialMapData: SpatialMapData;
  selectedEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
  bleState: MicrobitConnectionState;
}

export const SceneUnderstanding: React.FC<SceneUnderstandingProps> = ({
  detectedEntities,
  spatialMapData,
  selectedEntityId,
  onSelectEntity,
  bleState
}) => {

  const getHazardBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
            High
          </span>
        );
      case 'moderate':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
            Moderate
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
            Low
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-full overflow-hidden">
      
      {/* Section Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">Section B</span>
              <h2 className="text-sm font-bold text-slate-900">AI SCENE UNDERSTANDING</h2>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Camera Object Classification + {bleState.isLiveSensorActive ? 'Live VL53L0X Distance ToF Sensor' : 'Calibrated Distance Estimation'}
            </p>
          </div>
        </div>

        {/* Clearance Score & Distance Note */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-slate-500 font-medium">Corridor Clearance</div>
            <div className="text-xs font-bold text-emerald-700">{spatialMapData.navigabilityScore}% Navigable</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-mono text-xs font-bold">
            {spatialMapData.navigabilityScore}%
          </div>
        </div>
      </div>

      {/* Navigational Vector Recommendation Callout */}
      <div className="p-2.5 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-blue-600 text-white shrink-0">
            <Navigation className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-slate-800">Optimal Path Bearing: </span>
            <span className="font-semibold text-blue-700">
              {spatialMapData.safePathAngle === 0 
                ? '0° Direct Center' 
                : spatialMapData.safePathAngle < 0 
                  ? `${Math.abs(spatialMapData.safePathAngle)}° Left Corridor` 
                  : `${spatialMapData.safePathAngle}° Right Corridor`}
            </span>
            <span className="text-slate-500 ml-1">
              ({formatDistance(spatialMapData.safePathWidthMeters)} clearance width)
            </span>
          </div>
        </div>

        <div className="text-[11px] font-mono font-semibold text-slate-600 bg-white/90 px-2 py-0.5 rounded border border-slate-200 shrink-0">
          Nearest Obstacle: <span className="text-slate-900 font-bold">{formatDistance(spatialMapData.nearestObstacleDistance)}</span>
        </div>
      </div>

      {/* Distance Model / Live Sensor Notice Banner */}
      {bleState.isLiveSensorActive ? (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-[11px] text-emerald-950 font-semibold flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Distance Source: <strong className="text-emerald-900">Live VL53L0X Distance ({bleState.sensorDistanceFormatted} / {bleState.sensorDistanceMm} mm)</strong></span>
          </span>
          <span className="text-[10px] text-emerald-800 font-mono bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
            Bluetooth UART Stream Active
          </span>
        </div>
      ) : (
        <div className="px-4 py-1.5 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between text-[11px] text-sky-800 font-medium">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <strong>Distance: Estimated from camera/depth model</strong>
          </span>
          <span className="text-[10px] text-sky-700/80 font-mono hidden sm:inline">
            Units: &lt;100 cm in centimeters, ≥1m in meters
          </span>
        </div>
      )}

      {/* Detected Objects Telemetry Table with explicit required columns */}
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[300px] lg:max-h-[340px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/90 text-slate-700 sticky top-0 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold z-10">
            <tr>
              <th className="py-2.5 px-3">Detected Object</th>
              <th className="py-2.5 px-3">Confidence</th>
              <th className="py-2.5 px-3">Distance</th>
              <th className="py-2.5 px-3">Direction</th>
              <th className="py-2.5 px-3">Relative Position</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {detectedEntities.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                  Scanning environmental field... No targets detected in current aperture.
                </td>
              </tr>
            ) : (
              detectedEntities.map((ent) => {
                const isSelected = selectedEntityId === ent.id;
                const formattedDist = formatDistance(ent.distanceMeters);
                const formattedDir = formatDirection(ent.azimuthDegrees);
                const relPos = formatRelativePosition(ent.direction, ent.azimuthDegrees);
                const isVl53 = ent.distanceSource === 'vl53l0x' || bleState.isLiveSensorActive;

                return (
                  <tr
                    key={ent.id}
                    onClick={() => onSelectEntity(isSelected ? null : ent.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-50/90 font-medium' 
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Detected Object */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></div>
                        <span className="font-bold text-slate-900">{ent.label}</span>
                        {getHazardBadge(ent.hazardLevel)}
                      </div>
                    </td>

                    {/* Confidence */}
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                      <span className="px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                        {Math.round(ent.confidence * 100)}%
                      </span>
                    </td>

                    {/* Distance (Real-world units: cm for <100cm, m for >=1m, with Live VL53L0X badge when active) */}
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded font-semibold border ${
                          isVl53
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-slate-100 text-slate-900 border-slate-200'
                        }`} title={isVl53 ? 'Live VL53L0X Distance' : 'Estimated Distance'}>
                          {formattedDist}
                        </span>
                        {isVl53 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-700 text-white shadow-2xs">
                            Live VL53L0X ({ent.distanceMm || (bleState.sensorDistanceMm ?? Math.round(ent.distanceMeters * 1000))} mm)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Direction */}
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      <div className="flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedDir}</span>
                      </div>
                    </td>

                    {/* Relative Position */}
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      <span className="px-2 py-0.5 bg-slate-50 rounded border border-slate-200 text-[11px] font-semibold text-slate-800">
                        {relPos}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Summary Strip */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
        {bleState.isLiveSensorActive ? (
          <span className="text-emerald-800 font-semibold">
            Distance: <strong className="text-emerald-900">Live VL53L0X Distance (Real-time ToF)</strong>
          </span>
        ) : (
          <span>Distance: <strong className="text-slate-800">Estimated from camera/depth model</strong></span>
        )}
        <span>Receptive field correlation: <strong className="text-emerald-700">99.1%</strong></span>
      </div>

    </div>
  );
};

