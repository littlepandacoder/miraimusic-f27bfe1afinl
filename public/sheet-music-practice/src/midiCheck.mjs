/*
 * Step-by-step check of the MIDI connection: browser support, permission, a keyboard, and a key press.
 * The browser APIs are passed in, so this runs in the page and in Node tests with fake devices.
 */

export async function checkMidiConnection({ midi, timeoutMs = 10000, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const steps = [];
  const add = (name, ok, detail = "") => {
    steps.push({ name, ok, detail });
    return ok;
  };

  if (!add("Browser supports Web MIDI", midi.supported, midi.supported ? "" : "Use Chrome, Edge or Opera.")) {
    return steps;
  }

  let access;
  try {
    access = await midi.requestAccess({ sysex: false });
  } catch (e) {
    add("MIDI access granted", false, `Denied or unavailable: ${e?.message ?? e}`);
    return steps;
  }
  add("MIDI access granted", true);

  const inputs = [...access.inputs.values()];
  const found = add(
    "MIDI keyboard found",
    inputs.length > 0,
    inputs.length > 0 ? inputs.map((input) => input.name || input.id).join(", ") : "Plug in the keyboard, then test again.",
  );
  if (!found) return steps;

  const heard = await waitForNoteOn(inputs, timeoutMs, setTimer, clearTimer);
  add(
    "Key press received",
    heard !== null,
    heard
      ? `Note ${heard.note} from ${heard.input}`
      : `No key press within ${Math.round(timeoutMs / 1000)} seconds. Press any key on the keyboard.`,
  );
  return steps;
}

// Resolves with the first note-on from any input, or null after the timeout. Listeners are always removed.
function waitForNoteOn(inputs, timeoutMs, setTimer, clearTimer) {
  return new Promise((resolve) => {
    const listeners = [];
    let timer = null;
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      clearTimer(timer);
      for (const { input, handler } of listeners) input.removeEventListener("midimessage", handler);
      resolve(value);
    };
    for (const input of inputs) {
      const handler = (event) => {
        const [status, note, velocity = 0] = event.data;
        if ((status & 0xf0) === 0x90 && velocity > 0) finish({ note, input: input.name || input.id });
      };
      input.addEventListener("midimessage", handler);
      listeners.push({ input, handler });
    }
    timer = setTimer(() => finish(null), timeoutMs);
  });
}
