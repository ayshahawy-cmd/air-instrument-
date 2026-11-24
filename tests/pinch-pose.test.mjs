import assert from 'node:assert/strict';
import test from 'node:test';
import { PinchPoseTracker } from '../src/pinch-pose.ts';
import { DoubleTapIntent } from '../src/double-tap.ts';

test('an open hand is not shown as touching just because a joint is nearby', () => {
  const pose = new PinchPoseTracker();
  assert.equal(pose.update(.28, .55), 'open');
  assert.equal(pose.update(.3, .52), 'open');
});

test('contact can use nearby finger joints when tip landmarks are occluded', () => {
  const pose = new PinchPoseTracker();
  assert.equal(pose.update(.55, .55), 'open');
  assert.equal(pose.update(.2, .4), 'closed');
  assert.equal(pose.update(.54, .55), 'open');
});

test('visible fingertip separation releases even while a joint still looks close', () => {
  const pose = new PinchPoseTracker();
  pose.update(.7, .7);
  assert.equal(pose.update(.2, .4), 'closed');
  assert.equal(pose.update(.2, .5), 'open');
});

test('moving both tips and joints apart releases below the open-hand threshold', () => {
  const pose = new PinchPoseTracker();
  pose.update(.6, .6);
  assert.equal(pose.update(.15, .25), 'closed');
  assert.equal(pose.update(.35, .34), 'open');
});

test('a hand can open after entering the frame already pinched', () => {
  const pose = new PinchPoseTracker();
  pose.update(.14, .2);
  assert.equal(pose.update(.5, .5), 'open');
});

test('adaptive contact and separation complete two quick taps', () => {
  const pose = new PinchPoseTracker();
  const taps = new DoubleTapIntent();
  const point = { x: .3, y: .5 };
  const frame = (closeGap, tipGap, at) => {
    const state = pose.update(closeGap, tipGap);
    return taps.update(state === 'open' ? .8 : state === 'closed' ? .2 : .6, point, at);
  };
  frame(.6, .6, 0);
  frame(.6, .6, 80);
  frame(.2, .4, 110);
  assert.deepEqual(frame(.6, .6, 150), { firstTap: true });
  frame(.2, .4, 260);
  assert.deepEqual(frame(.6, .6, 300), { doubleTap: point });
});
