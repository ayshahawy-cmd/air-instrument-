import assert from 'node:assert/strict';
import test from 'node:test';
import { handGapRatios } from '../src/hand-geometry.ts';
import { PinchPoseTracker } from '../src/pinch-pose.ts';

test('a landscape camera preserves a horizontal finger gap relative to a vertical palm', () => {
  const points = Array.from({ length: 21 }, () => ({ x: .4, y: .5 }));
  points[0] = { x: .4, y: .6 };
  points[9] = { x: .4, y: .4 };
  points[4] = { x: .4, y: .2 };
  points[7] = { x: .4, y: .1 };
  points[8] = { x: .52, y: .2 };
  const open = handGapRatios(points, 16 / 9);
  assert.ok(open.tips > handGapRatios(points, 1).tips * 1.7);
  const pose = new PinchPoseTracker();
  assert.equal(pose.update(open.contact, open.tips), 'open');

  points[8] = { x: .43, y: .2 };
  const touch = handGapRatios(points, 16 / 9);
  assert.equal(pose.update(touch.contact, touch.tips), 'closed');
});
