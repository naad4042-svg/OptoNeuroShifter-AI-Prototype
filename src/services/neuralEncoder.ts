import { DetectedEntity, NeuralElectrodeChannel, NeuralEncodingProtocol, NeuralSimulationState } from '../types';

export class NeuralEncoderService {
  /**
   * Generates a retinotopic cortical electrode grid based on detected entities
   */
  public static generateCorticalGrid(
    gridSize: 16 | 24 | 32,
    protocol: NeuralEncodingProtocol,
    entities: DetectedEntity[],
    pulsePhase: number
  ): NeuralSimulationState {
    const totalElectrodes = gridSize * gridSize;
    const channels: NeuralElectrodeChannel[] = [];
    let activeCount = 0;
    let totalFreq = 0;

    // Grid coordinate span (-45° to +45° azimuth, -25° to +25° elevation)
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const id = r * gridSize + c;
        // Normalized coordinate in [-1, 1]
        const normX = (c / (gridSize - 1)) * 2 - 1;
        const normY = 1 - (r / (gridSize - 1)) * 2; // top is positive elevation

        const azimuthDeg = normX * 45; // -45 to +45
        const elevationDeg = normY * 25; // -25 to +25

        let activation = 0.0;
        let isHazard = false;
        let matchedCategory = undefined;

        // Calculate stimulation response from detected entities
        for (const ent of entities) {
          // Centroid in grid coordinates
          const entNormX = (ent.bbox.x + ent.bbox.width / 2) * 2 - 1;
          const entNormY = 1 - (ent.bbox.y + ent.bbox.height / 2) * 2;
          
          // Span of entity in normalized units
          const entSpanX = ent.bbox.width;
          const entSpanY = ent.bbox.height;

          // Distance from electrode to entity centroid in normalized space
          const dx = (normX - entNormX) / Math.max(0.15, entSpanX);
          const dy = (normY - entNormY) / Math.max(0.15, entSpanY);
          const distSq = dx * dx + dy * dy;

          // Gaussian receptive field response
          if (distSq < 1.8) {
            let entIntensity = ent.stimulationIntensity;
            
            // Modulation based on protocol
            if (protocol === 'hazard_burst_frequency') {
              entIntensity = ent.hazardLevel === 'critical' ? 1.0 : (ent.hazardLevel === 'high' ? 0.85 : entIntensity * 0.5);
            } else if (protocol === 'optogenetic_rgc') {
              // Optogenetic RGC favors proximity and contrast
              const proxFactor = Math.max(0.2, 1.0 - ent.distanceMeters / 6.0);
              entIntensity = entIntensity * proxFactor * 1.2;
            } else if (protocol === 'edge_contrast_phosphene') {
              // Edge boundary enhancement
              const isEdge = distSq > 0.4 && distSq < 1.6;
              entIntensity = isEdge ? entIntensity * 1.1 : entIntensity * 0.4;
            }

            const falloff = Math.exp(-distSq * 1.5);
            const response = entIntensity * falloff;
            
            if (response > activation) {
              activation = Math.min(1.0, response);
              matchedCategory = ent.category;
              if (ent.hazardLevel === 'critical' || ent.hazardLevel === 'high') {
                isHazard = true;
              }
            }
          }
        }

        // Add subtle biological baseline spontaneous firing (0.01 - 0.04)
        if (activation < 0.05) {
          activation = 0.02 + Math.sin(id * 0.3 + pulsePhase) * 0.015;
        } else {
          activeCount++;
        }

        // Frequency mapping: 0 to 120 Hz
        let freqHz = Math.round(activation * 110);
        if (isHazard) freqHz = Math.min(140, freqHz + 25);
        totalFreq += freqHz;

        channels.push({
          id,
          row: r,
          col: c,
          azimuthDeg,
          elevationDeg,
          activation: Number(activation.toFixed(3)),
          frequencyHz: freqHz,
          phase: (pulsePhase + (r * 0.4 + c * 0.2)) % (2 * Math.PI),
          isHazardFocalPoint: isHazard,
          targetCategory: matchedCategory
        });
      }
    }

    const averageFrequencyHz = Math.round(totalFreq / totalElectrodes);
    const meanChargeDensity = Number((averageFrequencyHz * 0.18 + (activeCount / totalElectrodes) * 12).toFixed(1));

    // Real-time spiking waveform points (simulated extracellular action potential / pulse bursts)
    const waveform: number[] = [];
    const pointsCount = 48;
    for (let i = 0; i < pointsCount; i++) {
      const t = (i / pointsCount) * 4 * Math.PI + pulsePhase * 2;
      // Multiphasic stimulation burst wave
      const carrier = Math.sin(t * 3);
      const spike = Math.exp(-Math.pow((i % 12) - 4, 2) / 3) * (activeCount > 0 ? 1.4 : 0.2);
      const noise = (Math.sin(i * 1.7) * 0.1);
      waveform.push(Number((carrier * 0.35 + spike + noise).toFixed(2)));
    }

    return {
      gridSize,
      protocol,
      totalElectrodes,
      activeElectrodesCount: activeCount,
      averageFrequencyHz,
      meanChargeDensity,
      pulseWidthUs: protocol === 'optogenetic_rgc' ? 1000 : 200,
      spikingWaveform: waveform,
      channels,
      simulationActive: true
    };
  }

  /**
   * Renders simulated cortical phosphenes onto a canvas
   */
  public static renderPhosphenesToCanvas(
    canvas: HTMLCanvasElement,
    state: NeuralSimulationState,
    invertContrast = false
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clinical background: dark field with soft ambient glow or clean contrast
    ctx.fillStyle = invertContrast ? '#ffffff' : '#0a101d';
    ctx.fillRect(0, 0, width, height);

    // Subtle retinotopic polar coordinate rings
    ctx.strokeStyle = invertContrast ? 'rgba(0, 0, 0, 0.06)' : 'rgba(59, 130, 246, 0.12)';
    ctx.lineWidth = 1;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.46;

    for (let ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (maxRadius / 3) * ring, 0, 2 * Math.PI);
      ctx.stroke();
    }
    // Crosshair axis
    ctx.beginPath();
    ctx.moveTo(centerX, 10);
    ctx.lineTo(centerX, height - 10);
    ctx.moveTo(10, centerY);
    ctx.lineTo(width - 10, centerY);
    ctx.stroke();

    const { gridSize, channels } = state;
    const cellW = (width - 32) / gridSize;
    const cellH = (height - 32) / gridSize;

    // Draw phosphene Gaussian light spots
    for (const ch of channels) {
      if (ch.activation < 0.06) continue;

      const px = 16 + ch.col * cellW + cellW / 2;
      const py = 16 + ch.row * cellH + cellH / 2;
      
      const radius = Math.max(3, cellW * (0.35 + ch.activation * 0.55));
      const gradient = ctx.createRadialGradient(px, py, 1, px, py, radius);

      if (ch.isHazardFocalPoint) {
        // High hazard phosphenes: bright amber/violet pulse
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.95)');
        gradient.addColorStop(0.4, 'rgba(249, 115, 22, 0.7)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else if (ch.targetCategory === 'doorway') {
        // Safe pathway / exit: soft emerald phosphenes
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.95)');
        gradient.addColorStop(0.5, 'rgba(5, 150, 105, 0.6)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
      } else {
        // Standard visual phosphene: luminous cyan/azure spot
        gradient.addColorStop(0, `rgba(147, 197, 253, ${Math.min(1.0, ch.activation * 1.2)})`);
        gradient.addColorStop(0.4, `rgba(59, 130, 246, ${ch.activation * 0.8})`);
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');
      }

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(px, py, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Sharp central core dot for high activation
      if (ch.activation > 0.6) {
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.arc(px, py, Math.max(1.5, radius * 0.25), 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }
}
