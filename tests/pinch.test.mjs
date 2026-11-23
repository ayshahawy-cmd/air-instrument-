import assert from 'node:assert/strict';
import test from 'node:test';
import { PinchIntent } from '../src/pinch.ts';
import { noteIndexForLength } from '../src/audio.ts';

const point = (x, y = 0.5) => ({ x, y });

test('a hand entering the frame already pinched cannot start a gesture', () => {
  const intent = new PinchIntent();
  for (const now of [0, 100, 250, 500]) {
    assert.equal(intent.update(0.2, point(0.2 + now / 1000), now).started, undefined);
  }
  assert.equal(intent.active, false);
});

test('a brief false pinch does not start drawing', () => {
  const intent = new PinchIntent();
  intent.update(0.7, point(0.3), 0);
  intent.update(0.7, point(0.3), 150);
  assert.equal(intent.update(0.2, point(0.3), 190).started, undefined);
  assert.equal(intent.update(0.7, point(0.3), 230).started, undefined);
  assert.equal(intent.active, false);
});

test('a held pinch starts only after open hand and releases at its last stable point', () => {
  const intent = new PinchIntent();
  intent.update(0.7, point(0.2), 0);
  intent.update(0.7, point(0.2), 150);
  intent.update(0.2, point(0.2), 180);
  assert.deepEqual(intent.update(0.2, point(0.2), 360).started, point(0.2));
  assert.deepEqual(intent.update(0.2, point(0.32), 380).moved, point(0.32));
  assert.deepEqual(intent.update(0.2, point(0.44), 400).moved, point(0.44));
  assert.equal(intent.update(0.7, point(0.8), 420).released, undefined);
  assert.deepEqual(intent.update(0.7, point(0.8), 550).released, point(0.44));
  assert.equal(intent.active, false);
});

test('tracking jumps cancel a gesture and cannot create a string', () => {
  const intent = new PinchIntent();
  intent.update(0.7, point(0.2), 0);
  intent.update(0.7, point(0.2), 150);
  intent.update(0.2, point(0.2), 180);
  intent.update(0.2, point(0.2), 360);
  assert.equal(intent.update(0.2, point(0.5), 380).canceled, true);
  assert.equal(intent.active, false);
});

test('losing the hand while pinched cancels instead of releasing', () => {
  const intent = new PinchIntent();
  intent.update(0.7, point(0.2), 0);
  intent.update(0.7, point(0.2), 150);
  intent.update(0.2, point(0.2), 180);
  intent.update(0.2, point(0.2), 360);
  assert.equal(intent.update(0.7, point(0.2), 700).canceled, true);
  assert.equal(intent.active, false);
});

test('shorter strings produce higher notes', () => {
  assert.ok(noteIndexForLength(0.2) > noteIndexForLength(0.5));
  assert.ok(noteIndexForLength(0.5) > noteIndexForLength(0.8));
});
