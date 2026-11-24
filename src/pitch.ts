import { clamp } from './geometry.ts';
import type { Voice } from './audio';

export type TuningMode = 'length' | 'tension';
export type ScaleMode = 'major' | 'minor';

const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const scales: Record<ScaleMode, number[]> = { major: [0, 2, 4, 7, 9], minor: [0, 3, 5, 7, 10] };
const octaves: Partial<Record<Voice, number>> = { bass: -12, harp: 12, glass: 12 };

export function snapMidi(midi: number, scale: ScaleMode): number {
  let best = 60;
  let gap = Infinity;
  for (let candidate = 36; candidate <= 96; candidate++) {
    if (!scales[scale].includes(candidate % 12)) continue;
    const distance = Math.abs(candidate - midi);
    if (distance < gap) { best = candidate; gap = distance; }
  }
  return best;
}

export function midiForLength(length: number, voice: Voice, tuning: TuningMode, scale: ScaleMode): number {
  const relative = clamp(length, 0.075, 1.2) / 0.42;
  const raw = 60 + 12 * Math.log2(tuning === 'tension' ? relative : 1 / relative) + (octaves[voice] ?? 0);
  return snapMidi(clamp(raw, 36, 96), scale);
}

export function noteName(midi: number): string {
  const rounded = Math.round(midi);
  return `${names[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`;
}

export const midiToFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
