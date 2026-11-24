export type Point = { x: number; y: number };
import type { Voice } from './audio';

export type AirString = { id: number; a: Point; b: Point; voice: Voice; hue: number; pulse: number; created: number; interval?: number };

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function closestOnSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  const point = { x: a.x + t * dx, y: a.y + t * dy };
  return { point, t, distance: distance(p, point) };
}

// A fingertip must move through the actual string, not just hover nearby.
export function crossing(from: Point, to: Point, a: Point, b: Point) {
  const r = { x: to.x - from.x, y: to.y - from.y };
  const s = { x: b.x - a.x, y: b.y - a.y };
  const cross = (u: Point, v: Point) => u.x * v.y - u.y * v.x;
  const denominator = cross(r, s);
  if (Math.abs(denominator) < 0.00001) return null;
  const delta = { x: a.x - from.x, y: a.y - from.y };
  const motion = cross(delta, s) / denominator;
  const position = cross(delta, r) / denominator;
  if (motion < 0 || motion > 1 || position < 0.06 || position > 0.94) return null;
  return { position, speed: distance(from, to) };
}
