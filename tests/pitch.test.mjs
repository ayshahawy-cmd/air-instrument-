import assert from 'node:assert/strict';
import test from 'node:test';
import { midiForLength, noteName, snapMidi } from '../src/pitch.ts';

test('visible note names use the same MIDI pitch as audio', () => {
  assert.equal(noteName(60), 'C4');
  assert.equal(noteName(69), 'A4');
  assert.equal(noteName(59), 'B3');
});

test('tension and length modes reverse the stretch direction', () => {
  assert.ok(midiForLength(.8, 'clean', 'tension', 'major') > midiForLength(.25, 'clean', 'tension', 'major'));
  assert.ok(midiForLength(.8, 'clean', 'length', 'major') < midiForLength(.25, 'clean', 'length', 'major'));
});

test('major and minor snap to their selected pentatonic notes', () => {
  assert.equal(snapMidi(63, 'major'), 62);
  assert.equal(snapMidi(63, 'minor'), 63);
});

test('bass and glass voices sit in different registers', () => {
  assert.ok(midiForLength(.42, 'bass', 'length', 'major') < midiForLength(.42, 'clean', 'length', 'major'));
  assert.ok(midiForLength(.42, 'glass', 'length', 'major') > midiForLength(.42, 'clean', 'length', 'major'));
});
