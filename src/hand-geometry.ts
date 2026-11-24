import type { Point } from './geometry.ts';

// MediaPipe landmarks use 0–1 coordinates on both axes. A 0.1 horizontal gap
// is wider in pixels than a 0.1 vertical gap on a landscape camera image.
export function imageDistance(a: Point, b: Point, aspect: number): number {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}

export function handGapRatios(points: Point[], aspect: number) {
  if (points.length < 21) return { contact: NaN, tips: NaN };
  const measure = (a: number, b: number) => imageDistance(points[a], points[b], aspect);
  const span = Math.max(0.025, measure(0, 9), measure(5, 17) * 1.1);
  const tips = measure(4, 8);
  const nearby = Math.min(measure(4, 7), measure(3, 8));
  return { contact: Math.min(tips, nearby * 1.08) / span, tips: tips / span };
}
