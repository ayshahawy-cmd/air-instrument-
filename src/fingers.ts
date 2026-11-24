import { distance, type Point } from './geometry.ts';

const fingers = [
  { id: 'thumb', base: 2, joint: 3, tip: 4 },
  { id: 'index', base: 5, joint: 6, tip: 8 },
  { id: 'middle', base: 9, joint: 10, tip: 12 },
  { id: 'ring', base: 13, joint: 14, tip: 16 },
  { id: 'pinky', base: 17, joint: 18, tip: 20 },
] as const;

export function extendedFingertips(points: Point[]): { id: string; point: Point }[] {
  if (points.length < 21) return [];
  return fingers.flatMap(finger => {
    const rootToTip = distance(points[finger.base], points[finger.tip]);
    const rootToJoint = distance(points[finger.base], points[finger.joint]);
    return rootToTip > rootToJoint * 1.15 ? [{ id: finger.id, point: points[finger.tip] }] : [];
  });
}
