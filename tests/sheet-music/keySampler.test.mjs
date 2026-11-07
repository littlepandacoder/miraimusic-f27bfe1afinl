// Run with: node --test tests/sheet-music/keySampler.test.mjs
// Uses fake Web Audio and Tone.js objects, so no sound is needed.
import { test } from "node:test";
import assert from "node:assert/strict";

const log = { stops: 0, oscillators: 0 };
const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
const node = () => ({ connect() { return this; }, toDestination() { return this; }, frequency: param(), Q: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), gain: param(), type: "" });

class FakeAudioContext {
  constructor() { this.currentTime = 0; this.state = "running"; this.destination = {}; }
  createBiquadFilter() { return node(); }
  createDynamicsCompressor() { return node(); }
  createGain() { return node(); }
  createOscillator() { log.oscillators++; return { ...node(), start() {}, stop() { log.stops++; } }; }
  resume() {}
}

// Sampler instances are created layer by layer: layer 4 (copies 0,1), layer 9 (2,3), layer 14 (4,5).
const calls = [];
const instances = [];
class FakeSampler {
  constructor(options) { this.options = options; this.index = instances.length; instances.push(this); }
  toDestination() { return this; }
  triggerAttack(note, time, velocity) { calls.push({ sampler: this.index, op: "attack", note, velocity }); }
  triggerRelease(note) { calls.push({ sampler: this.index, op: "release", note }); }
}
const fakeTone = { Sampler: FakeSampler, getContext: () => ({ state: "running" }), start() {} };

globalThis.window = { AudioContext: FakeAudioContext, Tone: fakeTone, dispatchEvent() {}, addEventListener() {} };
globalThis.document = { baseURI: "http://localhost/sheet-music-practice/index.html" };
const { startKeySound, stopKeySound, startClickSound, stopClickSound } = await import("../../public/sheet-music-practice/src/keySampler.js");

const loadAll = () => instances.forEach((s) => s.options.onload());

test("before the samples load, piano notes are silent (no other synth)", () => {
  const before = log.oscillators;
  startKeySound(60, 100, "midi-60");
  stopKeySound(60, "midi-60");
  assert.equal(calls.length, 0);
  assert.equal(log.oscillators, before, "no synthesized oscillator is created for piano notes");
});

test("two copies per velocity layer, each reading its own sample files", () => {
  assert.equal(instances.length, 6);
  assert.equal(instances[0].options.urls["C5"], "C5v4.mp3");
  assert.equal(instances[2].options.urls["C5"], "C5v9.mp3");
  assert.equal(instances[4].options.urls["C5"], "C5v14.mp3");
  assert.equal(instances[0].options.urls["D#4"], "Ds4v4.mp3");
  assert.equal(instances[0].options.urls["C4"], undefined, "C4 has no sample in the set");
  assert.match(instances[0].options.baseUrl, /\/sheet-music-practice\/piano\/$/);
  assert.equal(instances[0].options.release, 1.5);
});

test("piano notes stay silent until every sampler has loaded", () => {
  instances.slice(0, 5).forEach((s) => s.options.onload());
  startKeySound(60, 100, "midi-60");
  assert.equal(calls.length, 0, "still waiting for the last sampler");
  instances[5].options.onload();
});

test("soft, medium and loud key presses use the matching layer", () => {
  calls.length = 0;
  startKeySound(61, 30, "a"); // soft -> layer 4 (copies 0 or 1)
  startKeySound(61, 80, "b"); // medium -> layer 9 (copies 2 or 3)
  startKeySound(61, 127, "c"); // loud -> layer 14 (copies 4 or 5)
  assert.deepEqual(calls.map((c) => c.sampler >> 1), [0, 1, 2]);
  assert.equal(calls[2].velocity, 1);
  stopKeySound(61, "a"); stopKeySound(61, "b"); stopKeySound(61, "c");
  assert.deepEqual(calls.slice(3).map((c) => [c.sampler, c.op]), [[calls[0].sampler, "release"], [calls[1].sampler, "release"], [calls[2].sampler, "release"]]);
});

test("the two copies take turns, so two notes of the same pitch can overlap", () => {
  calls.length = 0;
  startKeySound(72, 30, "x");
  startKeySound(72, 30, "y");
  assert.notEqual(calls[0].sampler, calls[1].sampler, "second note goes to the other copy");
  stopKeySound(72, "x");
  assert.equal(calls[2].sampler, calls[0].sampler, "releasing x stops only x's copy");
  assert.equal(calls[2].op, "release");
  stopKeySound(72, "y");
});

test("a chord plays every note together and releases each one separately (polyphony)", () => {
  calls.length = 0;
  startKeySound(60, 100, "midi-60");
  startKeySound(64, 100, "midi-64");
  startKeySound(67, 100, "midi-67");
  assert.deepEqual(calls.map((c) => c.note), ["C4", "E4", "G4"]);
  stopKeySound(64, "midi-64");
  assert.deepEqual(calls[3], { sampler: calls[1].sampler, op: "release", note: "E4" });
  stopKeySound(60, "midi-60");
  stopKeySound(67, "midi-67");
  assert.equal(calls.length, 6);
});

test("metronome clicks use the synthesized tone, not the piano", () => {
  calls.length = 0;
  startClickSound(84, 110, "click");
  stopClickSound(84, "click");
  assert.equal(calls.length, 0);
});
