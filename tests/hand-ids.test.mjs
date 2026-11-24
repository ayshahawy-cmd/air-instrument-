import assert from 'node:assert/strict';
import test from 'node:test';
import { HandIds } from '../src/hand-ids.ts';

test('a hand keeps its gesture identity across order changes and brief detection gaps', () => {
  const ids = new HandIds();
  const first = ids.assign([{ x: .2, y: .5 }, { x: .8, y: .5 }], 0);
  assert.deepEqual(ids.assign([{ x: .78, y: .5 }, { x: .22, y: .5 }], 40), [first[1], first[0]]);
  assert.deepEqual(ids.assign([], 90), []);
  assert.deepEqual(ids.assign([{ x: .25, y: .5 }], 240), [first[0]]);
});
