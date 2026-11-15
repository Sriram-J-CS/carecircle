// Gentle Web Audio API synthesizer for reminder chime and alerts
// No external mp3 files required, fully reliable offline.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSoftChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Harmonic triad: E5 (659.25 Hz), G#5 (830.61 Hz), B5 (987.77 Hz)
    const notes = [659.25, 830.61, 987.77];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 1.3);
    });
  } catch (err) {
    // Audio context may be blocked by browser autoplay policy before user interaction
  }
}

export function playAlertTone() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Urgent double chime
    [0, 0.25].forEach((startOffset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now + startOffset); // A5
      gain.gain.setValueAtTime(0.2, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + startOffset);
      osc.stop(now + startOffset + 0.22);
    });
  } catch (err) {
    // ignore
  }
}
