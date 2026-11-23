import { clamp } from './geometry.ts';

export type Voice = 'silk' | 'glass' | 'bass' | 'starlight';
export const voices: { id: Voice; name: string; description: string; hue: number }[] = [
  { id: 'silk', name: 'Silk', description: 'warm, singing strings', hue: 173 },
  { id: 'glass', name: 'Glass', description: 'bright little bells', hue: 284 },
  { id: 'bass', name: 'Bass', description: 'deep and elastic', hue: 34 },
  { id: 'starlight', name: 'Starlight', description: 'soft synth sparks', hue: 222 },
];

const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19];

export const noteIndexForLength = (length: number) =>
  clamp(Math.round((0.82 - length) / 0.7 * (scale.length - 1)), 0, scale.length - 1);

export class SoundEngine {
  private context?: AudioContext;
  private master?: GainNode;
  private cache = new Map<string, AudioBuffer>();
  muted = false;

  async ready() {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.master = this.context.createGain();
      this.master.gain.value = 0.66;
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -22;
      compressor.ratio.value = 3;
      this.master.connect(compressor).connect(this.context.destination);
    }
    await this.context.resume();
  }

  play(length: number, position: number, speed: number, voice: Voice, pan: number) {
    if (!this.context || !this.master || this.muted) return;
    // Longer strings play lower notes; snap to a pentatonic scale for easy harmony.
    const index = noteIndexForLength(length);
    const midi = (voice === 'bass' ? 36 : 48) + scale[index];
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    const key = `${voice}:${midi}`;
    let buffer = this.cache.get(key);
    if (!buffer) {
      buffer = this.makeBuffer(frequency, voice);
      this.cache.set(key, buffer);
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const gain = this.context.createGain();
    const velocity = clamp(speed * 5.5, 0.2, 1);
    gain.gain.value = velocity * (0.7 + 0.3 * Math.sin(Math.PI * position));
    const stereo = this.context.createStereoPanner();
    stereo.pan.value = clamp(pan, -0.85, 0.85);
    source.connect(gain).connect(stereo).connect(this.master);
    source.start();
    source.onended = () => { source.disconnect(); gain.disconnect(); stereo.disconnect(); };
  }

  private makeBuffer(frequency: number, voice: Voice) {
    const context = this.context!;
    const duration = voice === 'glass' ? 2.9 : voice === 'bass' ? 1.9 : 2.4;
    const buffer = context.createBuffer(1, Math.round(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    const sampleRate = context.sampleRate;
    if (voice === 'silk' || voice === 'bass') {
      // Karplus–Strong: a short noise burst circulates through a damped delay.
      const period = Math.max(2, Math.round(sampleRate / frequency));
      const ring = new Float32Array(period);
      for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
      const damping = voice === 'bass' ? 0.994 : 0.997;
      for (let i = 0; i < data.length; i++) {
        const j = i % period;
        const next = (j + 1) % period;
        const value = ring[j];
        ring[j] = (value + ring[next]) * 0.5 * damping;
        data[i] = value * Math.min(1, i / 72) * Math.min(1, (data.length - i) / 3000);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const attack = Math.min(1, t * 180);
        const tail = Math.min(1, (duration - t) * 10);
        if (voice === 'glass') {
          const partials = Math.sin(2 * Math.PI * frequency * t) * 0.7
            + Math.sin(2 * Math.PI * frequency * 2.76 * t) * 0.17
            + Math.sin(2 * Math.PI * frequency * 5.4 * t) * 0.08;
          data[i] = partials * attack * tail * Math.exp(-t * 1.65);
        } else {
          const shimmer = Math.sin(2 * Math.PI * frequency * t)
            + 0.34 * Math.sin(2 * Math.PI * frequency * 2.005 * t)
            + 0.12 * Math.sin(2 * Math.PI * frequency * 3.01 * t);
          data[i] = shimmer * 0.58 * attack * tail * Math.exp(-t * 1.25);
        }
      }
    }
    return buffer;
  }
}
