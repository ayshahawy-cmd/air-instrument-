import assert from 'node:assert/strict';
import test from 'node:test';
import { DoubleTapIntent } from '../src/double-tap.ts';

const p = (x = .3) => ({ x, y: .5 });

function firstTap(intent, start) {
  intent.update(.8, p(), start);
  intent.update(.8, p(), start + 70);
  intent.update(.2, p(), start + 90);
  intent.update(.2, p(), start + 130);
  const result = intent.update(.8, p(), start + 150);
  intent.update(.8, p(), start + 190);
  return result;
}

test('a deliberate double tap marks one endpoint', () => {
  const intent = new DoubleTapIntent();
  assert.deepEqual(firstTap(intent, 0), { firstTap: true });
  intent.update(.2, p(.7), 240);
  intent.update(.2, p(.7), 280);
  assert.deepEqual(intent.update(.8, p(.7), 300), { doubleTap: p(.7) });
});

test('entering the frame already pinched does not mark a point', () => {
  const intent = new DoubleTapIntent();
  for (const now of [0, 100, 180]) assert.deepEqual(intent.update(.2, p(), now), {});
  assert.deepEqual(intent.update(.8, p(), 240), {});
});

test('a single tap or old tap after the time window cannot finish a point', () => {
  const intent = new DoubleTapIntent();
  firstTap(intent, 0);
  assert.equal(intent.waitingForSecondTap, true);
  intent.update(.8, p(), 950);
  assert.equal(intent.waitingForSecondTap, false);
  assert.deepEqual(firstTap(intent, 1050), { firstTap: true });
});

test('brief noisy contacts are ignored', () => {
  const intent = new DoubleTapIntent();
  intent.update(.8, p(), 0);
  intent.update(.8, p(), 100);
  assert.deepEqual(intent.update(.2, p(), 120), {});
  assert.deepEqual(intent.update(.8, p(), 135), {});
  assert.deepEqual(intent.update(.8, p(), 200), {});
  assert.equal(intent.waitingForSecondTap, false);
});

test('one observed contact frame followed by release can count as a tap', () => {
  const intent = new DoubleTapIntent();
  intent.update(.8, p(), 0);
  intent.update(.8, p(), 80);
  intent.update(.2, p(), 100);
  assert.deepEqual(intent.update(.8, p(), 135), { firstTap: true });
});

test('a held pinch used for tuning does not count as a tap', () => {
  const intent = new DoubleTapIntent();
  intent.update(.8, p(), 0);
  intent.update(.8, p(), 80);
  intent.update(.2, p(), 100);
  intent.update(.2, p(), 150);
  intent.update(.2, p(), 450);
  intent.update(.8, p(), 470);
  assert.deepEqual(intent.update(.8, p(), 510), {});
  assert.equal(intent.waitingForSecondTap, false);
});
