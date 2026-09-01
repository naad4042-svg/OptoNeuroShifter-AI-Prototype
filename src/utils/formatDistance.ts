/**
 * Utility for formatting real-world distance measurements
 * - Centimeters (< 100 cm): e.g. "35 cm", "82 cm"
 * - Meters (>= 1.0 m / 100 cm): e.g. "1.2 m", "1.4 m", "3.6 m"
 */

export function formatDistance(distanceMeters: number): string {
  if (isNaN(distanceMeters) || distanceMeters <= 0) {
    return '0 cm';
  }

  // Under 1.0 meter (100 cm), format in centimeters
  if (distanceMeters < 0.995) {
    const cm = Math.round(distanceMeters * 100);
    return `${cm} cm`;
  }

  // 1.0 meter and above, format in meters (1 decimal place)
  return `${distanceMeters.toFixed(1)} m`;
}

/**
 * Returns formatted direction string (e.g. "4° Right", "24° Left", "Center (0°)")
 */
export function formatDirection(azimuthDegrees: number): string {
  const rounded = Math.round(azimuthDegrees);
  if (rounded === 0) return 'Center (0°)';
  if (rounded < 0) return `${Math.abs(rounded)}° Left`;
  return `${rounded}° Right`;
}

/**
 * Returns concise relative position description (e.g. "Center-Right", "Mid-Left", "Center")
 */
export function formatRelativePosition(direction: string, azimuthDegrees: number): string {
  const rounded = Math.round(azimuthDegrees);
  if (Math.abs(rounded) <= 3) return 'Center';
  if (rounded < -25) return 'Far-Left';
  if (rounded < -10) return 'Mid-Left';
  if (rounded < 0) return 'Center-Left';
  if (rounded <= 10) return 'Center-Right';
  if (rounded <= 25) return 'Mid-Right';
  return 'Far-Right';
}
