import { clamp } from './geometry.ts';
import { midiForLength, midiToFrequency } from './pitch.ts';

export type Voice = 'clean' | 'rock' | 'bass' | 'sitar' | 'harp' | 'glass' | 'synth';
export const voices: { id: Voice; name: string; description: string; hue: number }[] = [
  { id: 'clean', name: 'Clean', description: 'clear plucked strings', hue: 176 },
  { id: 'rock', name: 'Rock', description: 'gritty power chords', hue: 12 },
  { id: 'bass', name: 'Bass', description: 'deep and elastic', hue: 34 },
  { id: 'sitar', name: 'Sitar', description: 'bright buzzing bridge', hue: 274 },
  { id: 'harp', name: 'Harp', description: 'soft shimmering plucks', hue: 146 },
  { id: 'glass', name: 'Glass', description: 'bright little bells', hue: 210 },
  { id: 'synth', name: 'Synth', description: 'warm electric glow', hue: 316 },
];

// Kept for older integrations. The display and audio both use midiForLength.
export const noteIndexForLength = (length: number) => midiForLength(length, 'clean', 'length', 'major');

type ActiveSource = { source: AudioBufferSourceNode; rootMidi: number };

export class SoundEngine {
  private context?: AudioContext;
  private master?: GainNode;
  private cache = new Map<string, AudioBuffer>();
  private active = new Map<number, Set<ActiveSource>>();
  muted = false;

  async ready() {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.master = this.context.createGain();
      this.master.gain.value = 0.62;
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -23;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.005;
      this.master.connect(compressor).connect(this.context.destination);
    }
    await this.context.resume();
  }

  play(id: number, midi: number, position: number, speed: number, voice: Voice, pan: number) {
    if (!this.context || !this.master || this.muted) return;
    const chord = voice === 'rock' ? [[0, 0.63], [7, 0.22], [12, 0.15]] : [[0, 1]];
    for (const [interval, level] of chord) {
      const note = midi + interval;
      const key = `${voice}:${note}`;
      let buffer = this.cache.get(key);
      if (!buffer) {
        buffer = this.makeBuffer(midiToFrequency(note), voice);
        if (this.cache.size > 48) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(key, buffer);
      }
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      const gain = this.context.createGain();
      const velocity = clamp(speed * 5.5, 0.18, 1);
      gain.gain.value = velocity * level * (0.72 + 0.28 * Math.sin(Math.PI * position));
      const stereo = this.context.createStereoPanner();
      stereo.pan.value = clamp(pan, -0.85, 0.85);
      source.connect(gain).connect(stereo).connect(this.master);
      const active = this.active.get(id) ?? new Set<ActiveSource>();
      const playing = { source, rootMidi: midi };
      active.add(playing);
      this.active.set(id, active);
      source.start();
      source.onended = () => {
        active.delete(playing);
        if (!active.size) this.active.delete(id);
        source.disconnect(); gain.disconnect(); stereo.disconnect();
      };
    }
  }

  retune(id: number, midi: number) {
    if (!this.context) return;
    for (const playing of this.active.get(id) ?? []) {
      const rate = 2 ** ((midi - playing.rootMidi) / 12);
      playing.source.playbackRate.setTargetAtTime(rate, this.context.currentTime, 0.045);
    }
  }

  private makeBuffer(frequency: number, voice: Voice) {
    const context = this.context!;
    const duration = voice === 'glass' ? 3.1 : voice === 'harp' ? 2.8 : voice === 'bass' ? 2.2 : 2.5;
    const buffer = context.createBuffer(1, Math.round(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    const sampleRate = context.sampleRate;
    if (voice === 'glass' || voice === 'synth') {
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const attack = Math.min(1, t * (voice === 'glass' ? 160 : 60));
        const tail = Math.min(1, (duration - t) * 9);
        const partials = voice === 'glass'
          ? Math.sin(2 * Math.PI * frequency * t) * 0.68 + Math.sin(2 * Math.PI * frequency * 2.76 * t) * 0.22 + Math.sin(2 * Math.PI * frequency * 5.4 * t) * 0.1
          : Math.sin(2 * Math.PI * frequency * t) * 0.6 + Math.sin(2 * Math.PI * frequency * 2 * t) * 0.2 + Math.sin(2 * Math.PI * frequency * 3 * t) * 0.12 + Math.sin(2 * Math.PI * frequency * 4 * t) * 0.08;
        data[i] = partials * attack * tail * Math.exp(-t * (voice === 'glass' ? 1.55 : 0.95));
      }
    } else {
      const period = Math.max(3, Math.round(sampleRate / frequency));
      const ring = new Float32Array(period);
      for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
      const damping = { clean: 0.997, rock: 0.998, bass: 0.995, sitar: 0.9965, harp: 0.994 }[voice];
      const brightness = { clean: 0.55, rock: 0.86, bass: 0.24, sitar: 0.9, harp: 0.47 }[voice];
      let filtered = 0;
      for (let i = 0; i < data.length; i++) {
        const j = i % period;
        const next = (j + 1) % period;
        const sample = ring[j];
        filtered += brightness * (sample - filtered);
        ring[j] = (filtered + ring[next]) * 0.5 * damping;
        const decay = Math.exp(-i / sampleRate * (voice === 'harp' ? 1.1 : voice === 'bass' ? 0.65 : 0.35));
        let value = sample * decay;
        if (voice === 'sitar') value = value > 0 ? value : value * 0.6 + Math.sin(value * 18) * Math.abs(value) * 0.16;
        if (voice === 'rock') value = Math.tanh(value * 4.5) * 0.58;
        data[i] = value * Math.min(1, i / (voice === 'harp' ? 250 : 75)) * Math.min(1, (data.length - i) / 2800);
      }
    }
    return buffer;
  }
}
