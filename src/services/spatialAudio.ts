/**
 * Spatial Audio Proximity Synthesizer
 * Provides non-invasive acoustic substitution cues for obstacles
 */
export class SpatialAudioService {
  private static audioCtx: AudioContext | null = null;
  private static isPlaying = false;
  private static nextBeepTime = 0;

  private static initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public static playProximityCue(distanceMeters: number, azimuthDegrees: number, isCritical = false) {
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      if (now < this.nextBeepTime) return;

      // Higher frequency for closer obstacles (440Hz -> 880Hz)
      const baseFreq = isCritical ? 880 : Math.max(300, 800 - distanceMeters * 80);
      const panVal = Math.max(-1, Math.min(1, azimuthDegrees / 45)); // -1 (left) to +1 (right)

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const panner = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : null;

      osc.type = isCritical ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);

      // Volume envelope (subtle, soft chime)
      const volume = isCritical ? 0.12 : 0.06;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      if (panner) {
        panner.pan.setValueAtTime(panVal, now);
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.audioCtx.destination);
      } else {
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
      }

      osc.start(now);
      osc.stop(now + 0.09);

      // Interval between beeps (faster when closer: 0.15s to 0.7s)
      const interval = Math.max(0.18, Math.min(0.8, distanceMeters * 0.16));
      this.nextBeepTime = now + interval;
    } catch (err) {
      // Audio context might be restricted before user interaction
    }
  }
}
