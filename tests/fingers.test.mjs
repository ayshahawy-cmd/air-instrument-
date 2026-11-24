import assert from 'node:assert/strict';
import test from 'node:test';
import { extendedFingertips } from '../src/fingers.ts';

test('thumb, index, middle, ring, and pinky can independently pluck', () => {
  const points = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));
  for (const [base, joint, tip, x] of [[2, 3, 4, .1], [5, 6, 8, .2], [9, 10, 12, .3], [13, 14, 16, .4], [17, 18, 20, .5]]) {
    points[base] = { x, y: .5 };
    points[joint] = { x, y: .4 };
    points[tip] = { x, y: .2 };
  }
  assert.deepEqual(extendedFingertips(points).map(item => item.id), ['thumb', 'index', 'middle', 'ring', 'pinky']);
  points[16] = { x: .4, y: .48 };
  assert.deepEqual(extendedFingertips(points).map(item => item.id), ['thumb', 'index', 'middle', 'pinky']);
});
