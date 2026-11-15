/**
 * Synthesizes a soft, pleasant two-tone chime using Web Audio API.
 * Guaranteed to work without external assets or 404 network errors.
 */
export function playChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Note 1 (E5 - 659.25Hz) - gentle warm attack
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.01, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.85);

    // Note 2 (A5 - 880Hz) - higher harmonious tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.25);
    gain2.gain.setValueAtTime(0.01, now + 0.25);
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.3);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 1.25);
  } catch (err) {
    console.warn('Unable to play audio chime:', err);
  }
}

/**
 * Synthesizes an alert tone for critical notifications (siren-free but distinct attention sound)
 */
export function playAlertSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Fast attention pulses
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const offset = now + i * 0.25;
      osc.frequency.setValueAtTime(880, offset);
      osc.frequency.setValueAtTime(1100, offset + 0.1);
      gain.gain.setValueAtTime(0.35, offset);
      gain.gain.exponentialRampToValueAtTime(0.01, offset + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(offset);
      osc.stop(offset + 0.22);
    }
  } catch (err) {
    console.warn('Unable to play alert sound:', err);
  }
}
