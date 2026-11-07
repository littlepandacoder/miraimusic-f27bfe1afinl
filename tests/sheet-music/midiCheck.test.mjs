// Run with: node --test tests/sheet-music/
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMidiConnection } from "../../public/sheet-music-practice/src/midiCheck.mjs";

// A fake MIDI input. If pressOnAttach is set, it sends that message as soon as a listener is added,
// like a student pressing a key while the check is running.
function fakeInput(id, name, pressOnAttach = null) {
  const listeners = new Set();
  return {
    id,
    name,
    addEventListener(type, fn) {
      if (type !== "midimessage") return;
      listeners.add(fn);
      if (pressOnAttach) queueMicrotask(() => fn({ data: pressOnAttach }));
    },
    removeEventListener(type, fn) {
      if (type === "midimessage") listeners.delete(fn);
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

const access = (inputs) => ({ inputs: new Map(inputs.map((input) => [input.id, input])) });
const timerThatFiresNow = (fn) => {
  fn();
  return 1;
};
const timerThatNeverFires = () => 1;

test("reports when the browser has no Web MIDI", async () => {
  const steps = await checkMidiConnection({ midi: { supported: false } });
  assert.equal(steps.length, 1);
  assert.equal(steps[0].name, "Browser supports Web MIDI");
  assert.equal(steps[0].ok, false);
});

test("reports when MIDI permission is denied", async () => {
  const steps = await checkMidiConnection({
    midi: { supported: true, requestAccess: async () => { throw new Error("NotAllowedError"); } },
  });
  assert.deepEqual(steps.map((s) => s.ok), [true, false]);
  assert.match(steps[1].detail, /NotAllowedError/);
});

test("reports when no keyboard is plugged in", async () => {
  const steps = await checkMidiConnection({
    midi: { supported: true, requestAccess: async () => access([]) },
  });
  assert.deepEqual(steps.map((s) => s.ok), [true, true, false]);
  assert.equal(steps[2].name, "MIDI keyboard found");
});

test("passes when a key press is received from the keyboard", async () => {
  const keyboard = fakeInput("k1", "Test Keyboard", [0x90, 60, 100]);
  const steps = await checkMidiConnection({
    midi: { supported: true, requestAccess: async () => access([keyboard]) },
    timeoutMs: 1000,
  });
  assert.deepEqual(steps.map((s) => s.ok), [true, true, true, true]);
  assert.match(steps[2].detail, /Test Keyboard/);
  assert.equal(steps[3].detail, "Note 60 from Test Keyboard");
  assert.equal(keyboard.listenerCount, 0, "listeners are removed after the check");
});

test("ignores note-off messages and treats velocity 0 as note-off", async () => {
  const keyboard = fakeInput("k1", "Test Keyboard", [0x80, 60, 0]);
  const steps = await checkMidiConnection({
    midi: { supported: true, requestAccess: async () => access([keyboard]) },
    timeoutMs: 1000,
  });
  assert.equal(steps[3].ok, false);
});

test("fails the key-press step after the timeout and cleans up", async () => {
  const keyboard = fakeInput("k1", "Test Keyboard");
  const steps = await checkMidiConnection({
    midi: { supported: true, requestAccess: async () => access([keyboard]) },
    timeoutMs: 10000,
    setTimer: timerThatFiresNow,
    clearTimer: () => {},
  });
  assert.equal(steps[3].ok, false);
  assert.match(steps[3].detail, /10 seconds/);
  assert.equal(keyboard.listenerCount, 0);
});

test("does not hang when the timer never fires but a key is pressed", async () => {
  const keyboard = fakeInput("k1", "Test Keyboard", [0x90, 62, 90]);
  const steps = await checkMidiConnection({
    midi: { supported: true, requestAccess: async () => access([keyboard]) },
    timeoutMs: 10000,
    setTimer: timerThatNeverFires,
    clearTimer: () => {},
  });
  assert.equal(steps[3].ok, true);
});
