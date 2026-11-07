import { startKeySound, stopKeySound, silencePiano, playWoodblock, audioReady } from "./keySampler.js";
import { checkMidiConnection } from "./midiCheck.mjs";

/*
 * Musicable MIDI practice mode.
 * alphaTab is the source of truth: checkpoints come from the score's beats, and
 * playback is paused/resumed through alphaTab's own API. Note input comes only from
 * a physical MIDI keyboard (Web MIDI API), or touch/click on the on-screen keys, or computer keys.
 */

const api = window.musicableApi;
const PlayerState = window.alphaTab.synth.PlayerState;

// alphaTab reports position jumps when the user seeks (clicks the score, presses stop, restarts).
// Pausing also moves the reported position back to the current beat, so while a checkpoint is
// waiting only large jumps count as seeks.
const SEEK_BACK_TICKS = 200;
const SEEK_FORWARD_TICKS = 1920;
// Time for alphaTab to finish pausing before the cursor is placed on the note.
// How long the cursor is held on a waiting note after alphaTab pauses.
const CURSOR_STICK_MS = 250;
// A checkpoint the playhead is already this far past was passed (e.g. after a seek) and is not triggered.
const CHECKPOINT_LATE_TICKS = 480;
const FEEDBACK_FLASH_MS = 700;

// Wait mode: what happened at each checkpoint (index -> wrong key presses, answered, skipped).
let waitLog = new Map();
function waitEntry(index) {
  if (!waitLog.has(index)) waitLog.set(index, { wrong: [], correct: false, skipped: false });
  return waitLog.get(index);
}


const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const midiName = (midi) => `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
const isBlackKey = (midi) => [1, 3, 6, 8, 10].includes(midi % 12);

const $ = (id) => document.getElementById(id);
const ui = {
  connectBtn: $("midiConnectBtn"),
  testBtn: $("midiTestBtn"),
  deviceSelect: $("midiDeviceSelect"),
  midiStatus: $("midiStatus"),
  practiceToggle: $("practiceToggle"),
  modeSelect: $("checkpointMode"),
  practiceMode: $("practiceMode"),
  finishBtn: $("finishPerfBtn"),
  clefSelect: $("clefFilter"),
  trackSelect: $("practiceTrack"),
  chordWindow: $("chordWindow"),
  pauseBtn: $("practicePauseBtn"),
  resumeBtn: $("practiceResumeBtn"),
  resetBtn: $("resetPracticeBtn"),
  nextBtn: $("nextCheckpointBtn"),
  stateLabel: $("practiceState"),
  checkpointInfo: $("cpInfo"),
  expectedInfo: $("expectedInfo"),
  lastMidi: $("lastMidi"),
  feedback: $("practiceFeedback"),
  keys: $("pianoKeys"),
};

const practice = {
  enabled: false,
  mode: "wait", // "wait" = stop at each note; "sync" = play on and analyse the performance
  perf: { active: false, presses: [] }, // current sync-mode performance: key presses in playback ms
  lastTime: 0, // playback position (ms) from the latest position event
  lastWall: null, // performance.now() at that event
  enabled: false,
  checkpoints: [], // { tick, midi: number[], bar: number }
  nextIndex: 0,
  waiting: null, // { index, pressed: Set<number>, windowStart: number | null }
  lastTick: 0,
  completed: false,
  playing: false,
  held: new Set(),
  flashKeys: [],
  midiAccess: null,
  device: null,
  error: "",
  lastMidiEvent: null,
  wasConnected: false,
};

/** Keys sounding during playback, from alphaTab's own note events **/
const soundingCounts = new Map(); // MIDI number -> number of notes currently sounding
const MidiEventTypes = window.alphaTab.midi.MidiEventType;
// Metronome clicks are reported too, so they can still be heard while the score is muted in practice.
api.midiEventsPlayedFilter = [MidiEventTypes.NoteOn, MidiEventTypes.NoteOff, MidiEventTypes.AlphaTabMetronome];

// Metronome click: a short tone, higher on the first beat of a bar.


// Each note-on gets its own voice; its note-off releases the oldest voice for that pitch, in order.
const scoreVoices = new Map(); // "track-pitch" -> [voice id, ...] still sounding

// Pausing or stopping the score must not leave its notes ringing.
function releaseScoreVoices() {
  scoreVoices.clear();
  silencePiano();
}

function clearSounding() {
  releaseScoreVoices();
  stopAccompaniment();
  if (soundingCounts.size === 0) return;
  soundingCounts.clear();
  refreshKeyboard();
}

api.midiEventsPlayed.on((e) => {
  let changed = false;
  for (const event of e.events) {
    const isOn = event.command === MidiEventTypes.NoteOn && event.noteVelocity > 0;
    const isOff = event.command === MidiEventTypes.NoteOff || (event.command === MidiEventTypes.NoteOn && event.noteVelocity === 0);
    if (!isOn && !isOff) continue;
    // Drum/percussion tracks use note numbers for instruments, not pitches.
    if (api.score?.tracks[event.track]?.isPercussion) continue;

    const count = soundingCounts.get(event.noteKey) ?? 0;
    if (isOn) {
      blinkKey(event.noteKey);
      soundingCounts.set(event.noteKey, count + 1);
    } else if (count > 1) {
      soundingCounts.set(event.noteKey, count - 1);
    } else {
      soundingCounts.delete(event.noteKey);
    }
    changed = true;
  }
  if (changed) refreshKeyboard();
});

/** Accompaniment: the clef you are NOT practising is played back ("treble" practice -> bass sounds) **/
// Which clef each note belongs to, keyed by "tick:midi" of its start, built from the score's beats.
const noteClefs = new Map();
const accompanied = new Set(); // voice ids currently sounding through the sampler
// Accompaniment notes wait here until the practised hand's checkpoint at or before them is answered.
const heldAccompaniment = []; // { tick, midi, velocity, key, id }

function indexNoteClefs() {
  noteClefs.clear();
  const score = api.score;
  if (!score) return;
  for (const track of score.tracks) {
    if (track.isPercussion) continue;
    for (const staff of track.staves) {
      if (staff.isPercussion) continue;
      let clef = null;
      for (const bar of staff.bars) {
        if (bar.clef !== CLEF_NEUTRAL) clef = bar.clef;
        const kind = clef === CLEF_G2 ? "treble" : clef === CLEF_F4 ? "bass" : "other";
        for (const voice of bar.voices) {
          for (const beat of voice.beats) {
            if (beat.isRest || beat.isEmpty) continue;
            for (const note of beat.notes) {
              if (note.isTieDestination || note.isPercussion) continue;
              noteClefs.set(`${beat.absolutePlaybackStart}:${note.realValue}`, kind);
            }
          }
        }
      }
    }
  }
}

// alphaTab's event tick can differ from the beat start by a tick or two, so allow a small window.
function clefOfNoteAt(tick, midi) {
  for (const offset of [0, 1, -1, 2, -2]) {
    const kind = noteClefs.get(`${tick + offset}:${midi}`);
    if (kind) return kind;
  }
  return null;
}

function stopAccompaniment() {
  for (const id of accompanied) stopKeySound(id.midi, id.key);
  accompanied.clear();
  heldAccompaniment.length = 0;
}

// True when no practised checkpoint at or before this tick is still waiting to be answered.
function accompanimentReleasable(tick) {
  if (practice.waiting && practice.checkpoints[practice.waiting.index].tick <= tick) return false;
  const next = practice.checkpoints[practice.nextIndex];
  if (practice.enabled && next && next.tick <= tick) return false;
  return true;
}

function flushAccompaniment() {
  for (let i = 0; i < heldAccompaniment.length; ) {
    const note = heldAccompaniment[i];
    if (accompanimentReleasable(note.tick)) {
      heldAccompaniment.splice(i, 1);
      accompanied.add(note.id);
      startKeySound(note.midi, note.velocity, note.key);
    } else {
      i++;
    }
  }
}

api.midiEventsPlayed.on((e) => {
  const filter = ui.clefSelect.value;
  // Only while practising a single clef; the other clef is the accompaniment.
  if (!practice.enabled || filter === "both") {
    if (accompanied.size) stopAccompaniment();
    return;
  }
  const accompanimentClef = filter === "treble" ? "bass" : "treble";

  for (const event of e.events) {
    const isOn = event.command === MidiEventTypes.NoteOn && event.noteVelocity > 0;
    const isOff = event.command === MidiEventTypes.NoteOff || (event.command === MidiEventTypes.NoteOn && event.noteVelocity === 0);
    if (!isOn && !isOff) continue;
    const voiceKey = `${event.track}:${event.channel}:${event.noteKey}`;

    if (isOn) {
      if (api.score?.tracks[event.track]?.isPercussion) continue;
      if (clefOfNoteAt(event.tick, event.noteKey) !== accompanimentClef) continue;
      // Hold the note; it sounds only once the practised note at this point is checked.
      heldAccompaniment.push({
        tick: event.tick,
        midi: event.noteKey,
        velocity: event.noteVelocity,
        key: voiceKey,
        id: { midi: event.noteKey, key: voiceKey },
      });
      flushAccompaniment();
    } else {
      // A note released before it was ever sounded is simply dropped.
      const heldIndex = heldAccompaniment.findIndex((n) => n.key === voiceKey);
      if (heldIndex !== -1) {
        heldAccompaniment.splice(heldIndex, 1);
        continue;
      }
      for (const id of accompanied) {
        if (id.key === voiceKey) {
          accompanied.delete(id);
          stopKeySound(id.midi, voiceKey);
          break;
        }
      }
    }
  }
});

/** Feedback **/
let feedbackTimer = null;
function setFeedback(kind, text) {
  ui.feedback.className = `practice-feedback ${kind}`;
  ui.feedback.textContent = text;
}

/** Checkpoints from the alphaTab score model **/
function buildCheckpoints() {
  const score = api.score;
  if (!score) return [];

  const trackFilter = ui.trackSelect.value;
  const clefFilter = ui.clefSelect.value; // "both" | "treble" | "bass"
  const byTick = new Map();

  for (const track of score.tracks) {
    if (trackFilter !== "all" && String(track.index) !== trackFilter) continue;
    if (track.isPercussion) continue;
    for (const staff of track.staves) {
      if (staff.isPercussion) continue;
      let clef = null; // bars with a Neutral clef keep the clef of the bar before
      for (const bar of staff.bars) {
        if (bar.clef !== CLEF_NEUTRAL) clef = bar.clef;
        if (!clefAllowed(clef, clefFilter)) continue;
        for (const voice of bar.voices) {
          for (const beat of voice.beats) {
            if (beat.isRest || beat.isEmpty) continue;
            // Tied continuations are not new events; the first note of a tie is the checkpoint.
            const pitches = beat.notes
              .filter((note) => !note.isTieDestination && !note.isPercussion)
              .map((note) => note.realValue);
            if (pitches.length === 0) continue;
            const tick = beat.absolutePlaybackStart;
            if (!byTick.has(tick)) byTick.set(tick, new Set());
            pitches.forEach((pitch) => byTick.get(tick).add(pitch));
          }
        }
      }
    }
  }

  const masterBars = score.masterBars;
  const barNumberAt = (tick) => {
    let bar = 1;
    masterBars.forEach((masterBar, i) => {
      if (masterBar.start <= tick) bar = i + 1;
    });
    return bar;
  };

  let ticks = [...byTick.keys()].sort((a, b) => a - b);
  if (ui.modeSelect.value === "measure") {
    const starts = new Set(masterBars.map((masterBar) => masterBar.start));
    ticks = ticks.filter((tick) => starts.has(tick));
  }

  return ticks.map((tick) => ({
    tick,
    midi: [...byTick.get(tick)].sort((a, b) => a - b),
    bar: barNumberAt(tick),
    time: null, // playback time (ms) of this checkpoint, recorded in sync mode
  }));
}

// alphaTab Clef enum values: G2 = treble, F4 = bass, Neutral = inherit.
const CLEF_NEUTRAL = 0;
const CLEF_F4 = 3;
const CLEF_G2 = 4;
function clefAllowed(clef, filter) {
  if (filter === "both") return true;
  if (filter === "treble") return clef === CLEF_G2;
  if (filter === "bass") return clef === CLEF_F4;
  return true;
}

function firstIndexAtOrAfter(tick) {
  const index = practice.checkpoints.findIndex((cp) => cp.tick >= tick - CHECKPOINT_LATE_TICKS);
  return index === -1 ? practice.checkpoints.length : index;
}

function rebuildCheckpoints(fromStart = false) {
  practice.checkpoints = buildCheckpoints();
  waitLog = new Map();
  practice.waiting = null;
  practice.completed = false;
  practice.nextIndex = fromStart ? 0 : firstIndexAtOrAfter(practice.lastTick);
}

function populateTracks() {
  const current = ui.trackSelect.value;
  ui.trackSelect.innerHTML = "";
  ui.trackSelect.add(new Option("All tracks", "all"));
  (api.score?.tracks ?? []).forEach((track) => {
    ui.trackSelect.add(new Option(track.name || `Track ${track.index + 1}`, String(track.index)));
  });
  ui.trackSelect.value = [...ui.trackSelect.options].some((o) => o.value === current) ? current : "all";
}

/** Playback gating **/
// Keeps the cursor on a waiting checkpoint's note for a short time after pausing.
function stickCursorToCheckpoint(index) {
  const cp = practice.checkpoints[index];
  const endAt = performance.now() + CURSOR_STICK_MS;
  const step = () => {
    if (!practice.waiting || practice.waiting.index !== index) return;
    if (Math.abs(api.tickPosition - cp.tick) > 2) api.tickPosition = cp.tick;
    if (performance.now() < endAt) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Places the playback cursor exactly on a checkpoint's note.
function setCursorToCheckpoint(index) {
  const cp = practice.checkpoints[index];
  if (cp) api.tickPosition = cp.tick;
}

function checkpointReached(index) {
  const cp = practice.checkpoints[index];
  practice.waiting = { index, pressed: new Set(), windowStart: null };
  practice.nextIndex = index + 1;
  api.pause();
  // pause() leaves the cursor on the beat before the note. Move it to the expected note after
  // alphaTab finishes this position update (this runs inside its position event).
  // alphaTab moves the cursor back to the beat start when it pauses, and applies that a moment later.
  // Re-apply the note position on each frame while this checkpoint waits, so the wrong position
  // shows for at most a frame.
  stickCursorToCheckpoint(index);
  setFeedback("info", `Checkpoint ${index + 1} (bar ${cp.bar}): play ${cp.midi.map(midiName).join(" + ")}`);
  refreshUi();
}

function resumePlayback() {
  practice.waiting = null;
  // The cursor is already on the answered note (placed when the checkpoint settled), so resume
  // from there. Moving it back here made the cursor jump back and forth on every answer.
  api.play();
  refreshUi();
}

api.playerPositionChanged.on((e) => {
  const tick = e.currentTick;
  const previous = practice.lastTick;
  const previousTime = practice.lastTime;
  practice.lastTick = tick;
  practice.lastTime = e.currentTime;
  practice.lastWall = performance.now();
  if (!practice.enabled) return;

  const seeked = practice.waiting
    ? Math.abs(tick - practice.checkpoints[practice.waiting.index].tick) > SEEK_FORWARD_TICKS
    : tick < previous - SEEK_BACK_TICKS || tick > previous + SEEK_FORWARD_TICKS;
  if (seeked) {
    clearSounding();
    practice.waiting = null;
    practice.nextIndex = firstIndexAtOrAfter(tick);
    if (practice.perf.active) practice.perf.active = false; // a seek abandons the performance
    refreshUi();
  }

  // Checkpoints only gate active playback; a rewind while stopped (e.g. after finishing) must not trigger one.
  if (!practice.playing) return;

  // Sync mode never stops: it only notes when the playhead reaches each checkpoint.
  if (practice.mode === "sync") {
    if (practice.perf.active) recordCheckpointTimes(previous, previousTime, tick, e.currentTime);
    return;
  }

  // Paused for input: ignore position updates (including the beat-start snap that pause() causes).
  if (practice.waiting) return;

  // Checkpoints the playhead has already passed are skipped, not triggered late.
  while (practice.nextIndex < practice.checkpoints.length
    && practice.checkpoints[practice.nextIndex].tick < tick - CHECKPOINT_LATE_TICKS) {
    practice.nextIndex++;
  }

  const cp = practice.checkpoints[practice.nextIndex];
  if (cp && tick >= cp.tick) {
    checkpointReached(practice.nextIndex);
  }
});

api.playerStateChanged.on((e) => {
  practice.playing = e.state === PlayerState.Playing;
  if (practice.playing) practice.completed = false;
  else clearSounding();
  if (practice.playing && practice.enabled && practice.mode === "sync" && !practice.perf.active) {
    startPerformance();
  }
  // While waiting for the correct key, the footer play button must not continue playback.
  if (practice.enabled && practice.waiting && practice.playing) {
    api.pause();
    setFeedback("wrong", "Play the expected note (MIDI keyboard, touch or click on the keys, or computer keys) to continue.");
  }
  refreshUi();
});

api.playerFinished.on(() => {
  clearSounding();
  if (practice.perf.active) finishPerformance();
  else if (practice.enabled && practice.mode === "wait" && waitLog.size > 0) finishWaitPractice();
  if (practice.enabled) practice.completed = true;
  practice.waiting = null;
  refreshUi();
});

api.scoreLoaded.on(() => {
  populateTracks();
  indexNoteClefs();
  rebuildCheckpoints(true);
  refreshUi();
});

/** MIDI input **/
function chordWindowMs() {
  const value = Number(ui.chordWindow.value);
  return Number.isFinite(value) ? Math.min(1000, Math.max(50, value)) : 250;
}

// Keys pressed on the connected MIDI keyboard also sound through the key sampler.
// Each key gets its own voice, so a chord keeps every note sounding (polyphony).
const midiVoice = (note) => `midi-${note}`;

function handleMidiMessage(event) {
  const [status, note, velocity = 0] = event.data;
  const type = status & 0xf0;
  if (type === 0x90 && velocity > 0) {
    startKeySound(note, velocity, midiVoice(note));
    noteOn(note, velocity);
  } else if (type === 0x80 || (type === 0x90 && velocity === 0)) {
    stopKeySound(note, midiVoice(note));
    noteOff(note);
  }
}

/** Sync mode: play on, time every key press against the playhead, then analyse **/
const SYNC_MATCH_WINDOW_MS = 250; // a press counts for a note within this distance of its time
const SYNC_ON_TIME_MS = 80; // rhythm counts as on time within this distance

// Playback position now, extrapolated from the latest position event.
function playbackNowMs() {
  if (practice.lastWall === null) return practice.lastTime;
  return practice.lastTime + (performance.now() - practice.lastWall) * api.playbackSpeed;
}

function resetPerformance() {
  practice.perf = { active: false, presses: [] };
  for (const cp of practice.checkpoints) cp.time = null;
}

function startPerformance() {
  resetPerformance();
  practice.perf.active = true;
  setFeedback("info", "Performance started. Play along; results appear at the end.");
}

// Interpolates the playback time (ms) of each checkpoint the playhead crossed between two events.
function recordCheckpointTimes(t0, ms0, t1, ms1) {
  const cps = practice.checkpoints;
  while (practice.nextIndex < cps.length && cps[practice.nextIndex].tick <= t1) {
    const cp = cps[practice.nextIndex];
    const fraction = t1 > t0 ? Math.min(1, Math.max(0, (cp.tick - t0) / (t1 - t0))) : 1;
    cp.time = ms0 + fraction * (ms1 - ms0);
    practice.nextIndex++;
  }
}

function finishPerformance() {
  practice.perf.active = false;
  const results = scorePerformance(practice.checkpoints, practice.perf.presses);
  showResults(results);
  refreshUi();
}

// Pure scoring: matches each key press to the nearest unmatched expected note of the same pitch.
// Also explains every note: on time, early or late (and by how much), and which wrong presses happened.
function scorePerformance(checkpoints, presses) {
  const expected = [];
  checkpoints.forEach((cp) => {
    if (cp.time === null) return;
    for (const midi of cp.midi) {
      expected.push({ bar: cp.bar, midi, time: cp.time, hit: false, deviation: null, playedOffset: null });
    }
  });

  const unmatched = [];
  for (const press of [...presses].sort((x, y) => x.t - y.t)) {
    let best = null;
    let bestDistance = Infinity;
    for (const note of expected) {
      if (note.hit || note.midi !== press.midi) continue;
      const distance = Math.abs(press.t - note.time);
      if (distance <= SYNC_MATCH_WINDOW_MS && distance < bestDistance) {
        best = note;
        bestDistance = distance;
      }
    }
    if (best) {
      best.hit = true;
      best.deviation = press.t - best.time;
    } else {
      unmatched.push(press);
    }
  }

  // Wrong presses: what was played, when, and the closest expected note in time.
  const wrongNotes = unmatched.map((press) => {
    let closest = null;
    for (const note of expected) {
      if (note.hit) continue;
      if (!closest || Math.abs(press.t - note.time) < Math.abs(press.t - closest.time)) closest = note;
    }
    return {
      midi: press.midi,
      t: press.t,
      closest: closest ? { midi: closest.midi, bar: closest.bar, offset: press.t - closest.time } : null,
    };
  });

  // Missed notes: if the same pitch was played anyway (outside the window), record how far off it was.
  // Each press can explain at most one missed note.
  const usedForMissed = new Set();
  for (const note of expected) {
    if (note.hit) continue;
    let nearest = null;
    for (const press of unmatched) {
      if (usedForMissed.has(press) || press.midi !== note.midi) continue;
      if (!nearest || Math.abs(press.t - note.time) < Math.abs(nearest.t - note.time)) nearest = press;
    }
    if (nearest) {
      usedForMissed.add(nearest);
      note.playedOffset = nearest.t - note.time;
    }
  }

  const hits = expected.filter((n) => n.hit);
  const deviations = hits.map((n) => n.deviation);
  const average = (values) => (values.length ? values.reduce((x, y) => x + y, 0) / values.length : 0);
  const pitchAccuracy = expected.length ? (hits.length / expected.length) * 100 : 0;
  const precision = hits.length + unmatched.length ? (hits.length / (hits.length + unmatched.length)) * 100 : 0;
  const onTime = deviations.filter((d) => Math.abs(d) <= SYNC_ON_TIME_MS).length;
  const rhythmAccuracy = hits.length ? (onTime / hits.length) * 100 : 0;

  const timingOf = (offset) => (offset > SYNC_ON_TIME_MS ? "late" : offset < -SYNC_ON_TIME_MS ? "early" : "on time");
  const notes = expected.map((n) => ({
    ...n,
    timing: n.hit ? timingOf(n.deviation) : "missed",
  }));

  return {
    expected: expected.length,
    hits: hits.length,
    missed: expected.length - hits.length,
    wrong: unmatched.length,
    wrongNotes,
    late: notes.filter((n) => n.timing === "late").length,
    early: notes.filter((n) => n.timing === "early").length,
    onTimeCount: notes.filter((n) => n.timing === "on time").length,
    pitchAccuracy,
    precision,
    rhythmAccuracy,
    averageDeviation: average(deviations),
    averageAbsoluteDeviation: average(deviations.map(Math.abs)),
    overall: (pitchAccuracy + rhythmAccuracy) / 2,
    notes,
    timingOf,
  };
}

function gradeFor(score) {
  if (score >= 95) return { letter: "S", title: "Flawless!", color: "#ffd54a" };
  if (score >= 85) return { letter: "A", title: "Excellent!", color: "#66bb6a" };
  if (score >= 70) return { letter: "B", title: "Great job!", color: "#42a5f5" };
  if (score >= 50) return { letter: "C", title: "Good effort", color: "#ffa726" };
  return { letter: "D", title: "Keep practising", color: "#ef5350" };
}

function finishWaitPractice() {
  const results = scoreWaitPractice(practice.checkpoints, waitLog);
  waitLog = new Map();
  showWaitResults(results);
  refreshUi();
}

// Pure scoring for wait mode. A "mistake" is each wrong key press while a checkpoint waits.
function scoreWaitPractice(checkpoints, log) {
  let rightFirst = 0;
  let fixed = 0; // wrong at least once, then the right note(s) were played
  let unresolved = 0; // wrong and never corrected
  let skipped = 0;
  let wrongPresses = 0;
  let reached = 0;
  const rows = [];
  checkpoints.forEach((cp, index) => {
    const entry = log.get(index);
    if (!entry) return;
    reached++;
    wrongPresses += entry.wrong.length;
    if (entry.correct && entry.wrong.length === 0) rightFirst++;
    else if (entry.correct) fixed++;
    else if (entry.skipped) skipped++;
    else unresolved++;
    if (entry.wrong.length > 0) {
      rows.push({ bar: cp.bar, expected: cp.midi, wrong: entry.wrong, corrected: entry.correct });
    }
  });
  const total = checkpoints.length;
  return {
    total,
    reached,
    rightFirst,
    fixed,
    unresolved,
    skipped,
    wrongPresses,
    rows,
    accuracy: total ? (rightFirst / total) * 100 : 0,
  };
}

function showWaitResults(r) {
  const body = document.querySelector("#resultsBody");
  const dialog = document.querySelector("#resultsDialog");
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const grade = gradeFor(r.accuracy);
  const stars = r.accuracy >= 85 ? 3 : r.accuracy >= 60 ? 2 : r.accuracy >= 35 ? 1 : 0;
  const notReached = r.total - r.reached;

  body.innerHTML = "";
  const content = make("div", "results-body");

  const banner = make("div", "res-banner");
  const badge = make("div", "res-grade", grade.letter);
  badge.style.background = grade.color;
  const info = make("div", "res-info");
  info.append(make("div", "res-title", grade.title), make("div", "res-stars", "★".repeat(stars) + "☆".repeat(3 - stars)));
  const scoreBox = make("div", "res-score");
  scoreBox.append(make("span", "res-score-num", String(Math.round(r.accuracy))), make("span", "res-score-unit", "%"));
  banner.append(badge, info, scoreBox);

  const tiles = make("div", "res-tiles");
  const tile = (icon, value, label, className) => {
    const node = make("div", `res-tile ${className}`);
    node.append(make("div", "res-tile-icon", icon), make("div", "res-tile-value", value), make("div", "res-tile-label", label));
    return node;
  };
  tiles.append(
    tile("🎯", `${r.rightFirst}/${r.total}`, "Right first time", "good"),
    tile("⚠️", String(r.wrongPresses), "Wrong key presses", "warn"),
    tile("🔁", String(r.fixed), "Wrong, then right", "info"),
    tile("💨", String(r.unresolved + r.skipped + notReached), "Not played", "bad"),
  );

  const counts = make("div", "res-counts");
  counts.textContent = `Right first time ${r.rightFirst} · Wrong then right ${r.fixed} · Wrong, not corrected ${r.unresolved} · Skipped ${r.skipped} · Not reached ${notReached}`;

  const list = make("div", "res-timing");
  if (r.rows.length === 0) {
    list.appendChild(make("div", "res-timing-row ontime", "No wrong notes played"));
  }
  for (const row of r.rows) {
    const detail = `played ${row.wrong.map(midiName).join(", ")} · ${row.corrected ? "then corrected" : "not corrected"}`;
    const el = make("div", `res-timing-row ${row.corrected ? "late" : "wrong"}`);
    el.append(
      make("span", "res-timing-note", `bar ${row.bar} · expected ${row.expected.map(midiName).join(" + ")}`),
      make("span", "res-timing-detail", detail),
    );
    list.appendChild(el);
  }

  content.append(banner, tiles, counts, make("div", "res-sub", "Wrong key presses (each one is a mistake)"), list);
  body.appendChild(content);
  dialog.showModal();
}

function showResults(r) {
  const body = document.querySelector("#resultsBody");
  const dialog = document.querySelector("#resultsDialog");
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const signed = (n) => `${n >= 0 ? "+" : ""}${Math.round(n)} ms`;
  const grade = gradeFor(r.overall);
  const stars = r.overall >= 85 ? 3 : r.overall >= 60 ? 2 : r.overall >= 35 ? 1 : 0;

  body.innerHTML = "";
  const content = make("div", "results-body");

  // Banner: grade, title, stars and score
  const banner = make("div", "res-banner");
  const badge = make("div", "res-grade", grade.letter);
  badge.style.background = grade.color;
  const info = make("div", "res-info");
  info.append(make("div", "res-title", grade.title), make("div", "res-stars", "★".repeat(stars) + "☆".repeat(3 - stars)));
  const scoreBox = make("div", "res-score");
  const scoreNumber = make("span", "res-score-num", "0");
  scoreBox.append(scoreNumber, make("span", "res-score-unit", "%"));
  banner.append(badge, info, scoreBox);

  // Accuracy bars
  const bars = make("div", "res-bars");
  const barRows = [
    ["Pitch accuracy", r.pitchAccuracy, "#66bb6a"],
    ["Rhythm accuracy", r.rhythmAccuracy, "#42a5f5"],
    ["Precision", r.precision, "#ab47bc"],
  ];
  for (const [label, value, color] of barRows) {
    const row = make("div", "res-bar-row");
    const top = make("div", "res-bar-top");
    top.append(make("span", "", label), make("strong", "", `${Math.round(value)}%`));
    const track = make("div", "res-bar-track");
    const fill = make("div", "res-bar-fill");
    fill.style.background = color;
    fill.dataset.width = String(Math.round(value));
    track.appendChild(fill);
    row.append(top, track);
    bars.appendChild(row);
  }

  // Stat tiles
  const tiles = make("div", "res-tiles");
  const tile = (icon, value, label, className) => {
    const node = make("div", `res-tile ${className}`);
    node.append(make("div", "res-tile-icon", icon), make("div", "res-tile-value", value), make("div", "res-tile-label", label));
    return node;
  };
  tiles.append(
    tile("🎯", `${r.hits}/${r.expected}`, "Notes hit", "good"),
    tile("💨", String(r.missed), "Missed", "bad"),
    tile("⚠️", String(r.wrong), "Wrong notes", "warn"),
    tile("⏱", r.hits ? signed(r.averageDeviation) : "–", "Avg timing (+ late)", "info"),
  );

  // Per-note timing: which note, whether it was on time, late or early, and by how much
  const noteName = (midi) => midiName(midi);
  const timingList = make("div", "res-timing");
  if (r.notes.length === 0) {
    timingList.appendChild(make("div", "res-timing-row missed", "No notes were analysed"));
  }
  for (const note of r.notes) {
    let detail;
    if (note.hit) {
      detail = `${note.timing === "on time" ? "on time" : note.timing} ${signed(note.deviation)}`;
    } else if (note.playedOffset !== null) {
      detail = `missed · you played it ${signed(note.playedOffset)} (${note.playedOffset > 0 ? "late" : "early"})`;
    } else {
      detail = "missed · not played";
    }
    const row = make("div", `res-timing-row ${note.hit ? note.timing.replace(" ", "") : "missed"}`);
    row.append(make("span", "res-timing-note", `bar ${note.bar} · ${noteName(note.midi)}`), make("span", "res-timing-detail", detail));
    timingList.appendChild(row);
  }

  // Wrong notes: what was played and where it landed
  const wrongList = make("div", "res-timing");
  if (r.wrongNotes.length === 0) {
    wrongList.appendChild(make("div", "res-timing-row ontime", "No wrong notes played"));
  }
  for (const w of r.wrongNotes) {
    const closest = w.closest
      ? `closest expected ${noteName(w.closest.midi)} (bar ${w.closest.bar}, ${signed(w.closest.offset)})`
      : "no expected note nearby";
    const row = make("div", "res-timing-row wrong");
    row.append(make("span", "res-timing-note", `played ${noteName(w.midi)}`), make("span", "res-timing-detail", closest));
    wrongList.appendChild(row);
  }

  const counts = make("div", "res-counts");
  counts.textContent = `On time ${r.onTimeCount} · Late ${r.late} · Early ${r.early} · Missed ${r.missed} · Wrong ${r.wrong}`;

  content.append(banner, bars, tiles, counts, make("div", "res-sub", "Timing per note"), timingList, make("div", "res-sub", "Wrong notes"), wrongList);

  body.appendChild(content);
  dialog.showModal();

  // Animate: count the score up and fill the bars
  const start = performance.now();
  const countUp = (now) => {
    const t = Math.min(1, (now - start) / 1000);
    const eased = 1 - Math.pow(1 - t, 3);
    scoreNumber.textContent = String(Math.round(r.overall * eased));
    if (t < 1) requestAnimationFrame(countUp);
  };
  requestAnimationFrame(countUp);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bars.querySelectorAll(".res-bar-fill").forEach((f) => { f.style.width = `${f.dataset.width}%`; });
  }));
}

function noteOn(midi, velocity) {
  practice.held.add(midi);
  blinkKey(midi);
  practice.lastMidiEvent = { midi, velocity, pressed: true };
  if (practice.enabled && practice.mode === "sync" && practice.perf.active) {
    practice.perf.presses.push({ t: playbackNowMs(), midi });
    setFeedback("info", `Recorded ${midiName(midi)}`);
  }
  checkInput(midi);
  refreshUi();
}

function noteOff(midi) {
  practice.held.delete(midi);
  practice.lastMidiEvent = { midi, velocity: 0, pressed: false };
  refreshUi();
}

function checkInput(midi) {
  const waiting = practice.waiting;
  if (!practice.enabled || !waiting) return;
  const cp = practice.checkpoints[waiting.index];

  // Exact MIDI number match: octave mismatches are wrong.
  if (!cp.midi.includes(midi)) {
    waitEntry(waiting.index).wrong.push(midi);
    setFeedback("wrong", `Wrong note: you played ${midiName(midi)} (${midi}). Expected ${cp.midi.map(midiName).join(" + ")}.`);
    return;
  }

  const now = performance.now();
  if (waiting.windowStart === null || now - waiting.windowStart > chordWindowMs()) {
    waiting.windowStart = now;
    waiting.pressed = new Set();
  }
  waiting.pressed.add(midi);

  if (waiting.pressed.size === cp.midi.length) {
    waitEntry(waiting.index).correct = true;
    setFeedback("correct", `Correct: ${cp.midi.map(midiName).join(" + ")}`);
    flashKeys(cp.midi);
    resumePlayback();
  } else {
    const missing = cp.midi.filter((m) => !waiting.pressed.has(m));
    setFeedback("partial", `Good: ${midiName(midi)}. Still need: ${missing.map(midiName).join(" + ")}`);
  }
}

function flashKeys(midis) {
  practice.flashKeys = midis;
  refreshKeyboard();
  setTimeout(() => {
    if (practice.flashKeys === midis) {
      practice.flashKeys = [];
      refreshKeyboard();
    }
  }, FEEDBACK_FLASH_MS);
}

function refreshDevices() {
  const access = practice.midiAccess;
  if (!access) return;

  const inputs = [...access.inputs.values()];
  const previousId = practice.device?.id;
  ui.deviceSelect.innerHTML = "";
  inputs.forEach((input) => ui.deviceSelect.add(new Option(input.name || input.id, input.id)));
  ui.deviceSelect.hidden = inputs.length === 0;

  const stillThere = previousId && inputs.find((input) => input.id === previousId);
  if (stillThere) {
    if (practice.device !== stillThere) selectDevice(previousId);
  } else if (inputs.length > 0) {
    selectDevice(inputs[0].id);
  } else {
    detachDevice();
  }

  if (practice.wasConnected && !practice.device) {
    setFeedback("wrong", practice.waiting
      ? "MIDI keyboard disconnected. Playback stays paused until a key is played again."
      : "MIDI keyboard disconnected.");
  }
  practice.wasConnected = !!practice.device;
  refreshUi();
}

function selectDevice(id) {
  const input = practice.midiAccess.inputs.get(id);
  if (!input) return;
  if (practice.device && practice.device !== input) {
    practice.device.onmidimessage = null;
  }
  practice.device = input;
  // Assigning (not adding) the handler means there can never be duplicate listeners.
  input.onmidimessage = handleMidiMessage;
  practice.error = "";
  ui.deviceSelect.value = id;
}

function detachDevice() {
  if (practice.device) practice.device.onmidimessage = null;
  practice.device = null;
}

async function connectMidi() {
  if (!navigator.requestMIDIAccess) {
    practice.error = "This browser does not support Web MIDI. Use Chrome, Edge or Opera.";
    refreshUi();
    return;
  }
  try {
    const access = await navigator.requestMIDIAccess({ sysex: false });
    practice.midiAccess = access;
    access.onstatechange = refreshDevices;
    refreshDevices();
  } catch (e) {
    practice.error = `MIDI access was denied or is unavailable: ${e?.message ?? e}`;
    refreshUi();
  }
}

// Runs the step-by-step MIDI check (browser, permission, keyboard, key press) and reports each step.
async function testMidiConnection() {
  let granted = null;
  setFeedback("info", "Testing the MIDI connection. Press any key on the keyboard within 10 seconds.");
  const steps = await checkMidiConnection({
    midi: {
      supported: !!navigator.requestMIDIAccess,
      requestAccess: async (options) => (granted = await navigator.requestMIDIAccess(options)),
    },
    timeoutMs: 10000,
  });
  // Keep the access the test obtained, so the keyboard is connected without a second permission prompt.
  if (granted && !practice.midiAccess) {
    practice.midiAccess = granted;
    granted.onstatechange = refreshDevices;
    refreshDevices();
  }
  const passed = steps.every((s) => s.ok);
  const report = steps.map((s) => `${s.ok ? "✓" : "✗"} ${s.name}${s.detail ? `: ${s.detail}` : ""}`).join("  ");
  setFeedback(passed ? "correct" : "wrong", `MIDI test ${passed ? "passed" : "failed"}. ${report}`);
  refreshUi();
}

ui.connectBtn.onclick = connectMidi;
ui.testBtn.onclick = testMidiConnection;
ui.deviceSelect.onchange = () => selectDevice(ui.deviceSelect.value);

/** Controls **/
// The score's own sound is muted during practice so only the student's key presses are heard.
// The volume the user had before practice is restored when practice is turned off.
let volumeBeforePractice = null;
// Only wait mode mutes the score: it stops at each note, so only the student's keys should be heard.
// Sync mode plays the score through, so the performance is audible.
function applyPracticeMute() {
  silenceAlphaTabSynth();
}

ui.practiceToggle.onchange = () => {
  practice.enabled = ui.practiceToggle.checked;
  applyPracticeMute();
  if (practice.enabled) {
    rebuildCheckpoints();
    setFeedback("info", practice.device
      ? "MIDI practice on. Press play; playback stops at each checkpoint."
      : "MIDI practice on, but no keyboard is connected yet.");
  } else {
    if (practice.waiting) resumePlayback();
    practice.waiting = null;
    setFeedback("", "");
  }
  refreshUi();
};

ui.modeSelect.onchange = () => { rebuildCheckpoints(); refreshUi(); };

ui.practiceMode.onchange = () => {
  practice.mode = ui.practiceMode.value;
  applyPracticeMute();
  practice.perf = { active: false, presses: [] };
  if (practice.waiting) resumePlayback();
  setFeedback("info", practice.mode === "sync"
    ? "Sync mode: playback never stops. Results appear when the piece finishes or you press Finish."
    : "Wait mode: playback stops at each note until you play it.");
  refreshUi();
};

ui.finishBtn.onclick = () => {
  if (practice.perf.active) {
    api.pause();
    finishPerformance();
  } else if (practice.mode === "wait" && waitLog.size > 0) {
    api.pause();
    finishWaitPractice();
  } else {
    setFeedback("info", "No performance in progress. Press play in sync mode to start one.");
  }
};
ui.clefSelect.onchange = () => { rebuildCheckpoints(); refreshUi(); };
ui.trackSelect.onchange = () => { rebuildCheckpoints(); refreshUi(); };
ui.chordWindow.onchange = () => refreshUi();

ui.pauseBtn.onclick = () => api.pause();
ui.resumeBtn.onclick = () => {
  if (practice.waiting) {
    setFeedback("wrong", "Play the expected note (MIDI keyboard, touch or click on the keys, or computer keys) to continue.");
  } else {
    api.play();
  }
};

ui.resetBtn.onclick = () => {
  resetPerformance();
  waitLog = new Map();
  practice.waiting = null;
  practice.completed = false;
  practice.nextIndex = 0;
  api.stop();
  setFeedback("info", "Practice reset. Press play to start from the beginning.");
  refreshUi();
};

ui.nextBtn.onclick = () => {
  if (!practice.waiting) {
    setFeedback("info", "Playback is not waiting at a checkpoint.");
    return;
  }
  waitEntry(practice.waiting.index).skipped = true;
  const skipped = practice.waiting.index + 1;
  setFeedback("info", `Skipped checkpoint ${skipped} (administrative).`);
  resumePlayback();
};

/** Visual keyboard (feedback only; validation uses MIDI input) **/
// A full grand piano: 88 keys, A0 (MIDI 21) to C8 (MIDI 108), 52 white keys.
const KEY_LOW = 21;
const KEY_HIGH = 108;
// Below this white-key width the keyboard scrolls sideways instead of shrinking further.
const MIN_WHITE_KEY_PX = 14;

function buildKeyboard() {
  const containerWidth = ui.keys.parentElement.clientWidth;
  if (!containerWidth) return;

  let whiteCount = 0;
  for (let midi = KEY_LOW; midi <= KEY_HIGH; midi++) {
    if (!isBlackKey(midi)) whiteCount++;
  }
  const keyboardWidth = Math.max(containerWidth, whiteCount * MIN_WHITE_KEY_PX);
  ui.keys.style.width = `${keyboardWidth}px`;

  const whitePct = 100 / whiteCount;
  const blackPct = whitePct * 0.6;

  ui.keys.innerHTML = "";
  let whiteIndex = 0;
  for (let midi = KEY_LOW; midi <= KEY_HIGH; midi++) {
    const el = document.createElement("div");
    if (isBlackKey(midi)) {
      el.className = "key black";
      el.style.left = `${whiteIndex * whitePct - whitePct * 0.3}%`;
      el.style.width = `${blackPct}%`;
    } else {
      el.className = "key white";
      el.style.left = `${whiteIndex * whitePct}%`;
      el.style.width = `${whitePct}%`;
      whiteIndex++;
      if (midi % 12 === 0) {
        const label = document.createElement("span");
        label.className = "key-label";
        label.textContent = midiName(midi);
        el.appendChild(label);
      }
    }
    el.dataset.midi = String(midi);
    el.title = `${midiName(midi)} (${midi})`;
    ui.keys.appendChild(el);
  }
  refreshKeyboard();
}

// Rebuild when the window (and so the score width) changes.
new ResizeObserver(() => buildKeyboard()).observe(ui.keys.parentElement);

function refreshKeyboard() {
  const expected = new Set(practice.waiting ? practice.checkpoints[practice.waiting.index].midi : []);
  const correct = new Set(practice.flashKeys);
  for (const el of ui.keys.querySelectorAll(".key")) {
    const midi = Number(el.dataset.midi);
    el.classList.toggle("expected", expected.has(midi));
    el.classList.toggle("held", practice.held.has(midi));
    el.classList.toggle("correct", correct.has(midi));
  }
}

// Each note blinks its key once when it starts. The blink ends by itself, so a key never stays lit
// when a note-off is missed.
function blinkKey(midi) {
  const el = ui.keys.querySelector(`.key[data-midi="${midi}"]`);
  if (!el) return;
  el.classList.remove("blink");
  void el.offsetWidth; // restart the animation for repeated notes
  el.classList.add("blink");
}

/** Input from the on-screen keyboard and the computer keyboard **/
// Same checking as the MIDI keyboard: noteOn/noteOff feed checkInput().
const SCREEN_VELOCITY = 100;

// Computer keyboard layout (C4 = 60): bottom row Z-M is C4-B4, top row Q-I continues to C5-E6.
const COMPUTER_KEYS = {
  KeyZ: 60, KeyS: 61, KeyX: 62, KeyD: 63, KeyC: 64, KeyV: 65, KeyG: 66, KeyB: 67, KeyH: 68, KeyN: 69, KeyJ: 70, KeyM: 71,
  KeyQ: 72, Digit2: 73, KeyW: 74, Digit3: 75, KeyE: 76, KeyR: 77, Digit5: 78, KeyT: 79, Digit6: 80, KeyY: 81, Digit7: 82, KeyU: 83, KeyI: 84,
};
const computerKeysDown = new Map(); // e.code -> MIDI number
const pointerKeys = new Map(); // pointerId -> MIDI number

// Mouse / touch on the on-screen keys.
ui.keys.addEventListener("pointerdown", (e) => {
  const key = e.target.closest(".key");
  if (!key) return;
  const midi = Number(key.dataset.midi);
  pointerKeys.set(e.pointerId, midi);
  startKeySound(midi, SCREEN_VELOCITY);
  noteOn(midi, SCREEN_VELOCITY);
});

function releasePointerKey(e) {
  const midi = pointerKeys.get(e.pointerId);
  if (midi === undefined) return;
  pointerKeys.delete(e.pointerId);
  stopKeySound(midi);
  noteOff(midi);
}
window.addEventListener("pointerup", releasePointerKey);
window.addEventListener("pointercancel", releasePointerKey);

// Computer keyboard. Only real text entry blocks the note keys. A focused dropdown, checkbox,
// slider or button must not stop notes from sounding (it used to, so chords went silent).
function isTextEntry(target) {
  return target.isContentEditable
    || target instanceof HTMLTextAreaElement
    || (target instanceof HTMLInputElement && ["text", "search", "email", "password", "url", "tel", "number"].includes(target.type));
}

window.addEventListener("keydown", (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const midi = COMPUTER_KEYS[e.code];
  if (midi === undefined || isTextEntry(e.target)) return;
  // A focused dropdown would otherwise jump to the option matching the letter pressed.
  if (e.target instanceof HTMLSelectElement) e.target.blur();
  if (computerKeysDown.has(e.code)) return;
  computerKeysDown.set(e.code, midi);
  startKeySound(midi, SCREEN_VELOCITY);
  noteOn(midi, SCREEN_VELOCITY);
});

window.addEventListener("keyup", (e) => {
  const midi = computerKeysDown.get(e.code);
  if (midi === undefined) return;
  computerKeysDown.delete(e.code);
  stopKeySound(midi);
  noteOff(midi);
});

window.addEventListener("blur", () => {
  for (const midi of computerKeysDown.values()) {
    stopKeySound(midi);
    noteOff(midi);
  }
  computerKeysDown.clear();
});

/** Status display **/
function stateLabel() {
  if (practice.error) return "Error";
  if (!practice.enabled) return practice.device ? "Connected (practice off)" : "Disconnected";
  if (practice.completed) return "Completed";
  if (practice.waiting) return "Waiting for input";
  if (practice.playing) return "Playing";
  return "Ready";
}

// Status bar in the settings pop-up: shows whether a MIDI keyboard is connected, and which one.
function updateMidiBar() {
  const bar = document.getElementById("psMidiBar");
  const text = document.getElementById("psMidiText");
  if (!bar || !text) return;
  let state;
  let message;
  if (practice.device) {
    state = "on";
    message = `MIDI keyboard connected: ${practice.device.name || practice.device.id}`;
  } else if (practice.error) {
    state = "warn";
    message = practice.error;
  } else if (practice.midiAccess) {
    state = "warn";
    message = "MIDI is on, but no keyboard is detected. Plug it in, or check that it is switched on.";
  } else {
    state = "warn";
    message = "No MIDI keyboard connected. Press Connect MIDI Keyboard, or use the on-screen keys.";
  }
  bar.className = `midi-bar ${state}`;
  text.textContent = message;
}

function refreshUi() {
  updateMidiBar();
  flushAccompaniment();
  // Connection status
  if (practice.error) {
    ui.midiStatus.textContent = practice.error;
  } else if (practice.device) {
    ui.midiStatus.textContent = `Connected: ${practice.device.name || practice.device.id}`;
  } else if (practice.midiAccess) {
    ui.midiStatus.textContent = "MIDI enabled, but no device found. Connect a keyboard.";
  } else {
    ui.midiStatus.textContent = "Disconnected";
  }
  ui.connectBtn.disabled = !!practice.midiAccess;
  ui.connectBtn.textContent = practice.midiAccess ? "MIDI keyboard access granted" : "Connect MIDI Keyboard";

  // Practice state
  ui.stateLabel.textContent = stateLabel();
  const total = practice.checkpoints.length;
  if (!total) {
    ui.checkpointInfo.textContent = api.score ? "No pitched notes to practise" : "-";
  } else if (practice.waiting) {
    const cp = practice.checkpoints[practice.waiting.index];
    ui.checkpointInfo.textContent = `${practice.waiting.index + 1} of ${total} (bar ${cp.bar})`;
  } else {
    const index = Math.min(practice.nextIndex, total - 1);
    ui.checkpointInfo.textContent = `${practice.nextIndex + 1 > total ? total : practice.nextIndex + 1} of ${total} (next: bar ${practice.checkpoints[index].bar})`;
  }

  if (practice.waiting) {
    const cp = practice.checkpoints[practice.waiting.index];
    ui.expectedInfo.textContent = `${cp.midi.map((m) => `${midiName(m)} (${m})`).join(" + ")}`;
  } else {
    ui.expectedInfo.textContent = "-";
  }

  const last = practice.lastMidiEvent;
  ui.lastMidi.textContent = last
    ? `${midiName(last.midi)} (${last.midi}) · velocity ${last.velocity} · ${last.pressed ? "pressed" : "released"}`
    : "-";

  ui.pauseBtn.disabled = !practice.playing;
  ui.resumeBtn.disabled = !!practice.waiting;
  ui.nextBtn.disabled = !practice.waiting;
  refreshKeyboard();
}

buildKeyboard();
if (api.score) {
  populateTracks();
  indexNoteClefs();
  rebuildCheckpoints();
}
refreshUi();

/** Settings chosen in the library pop-up (URL parameters), applied before the score loads **/
function applyLaunchSettings() {
  const params = new URLSearchParams(location.search);
  if (!params.has("song")) return;
  const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
  ui.practiceMode.value = pick(params.get("mode"), ["wait", "sync"], "wait");
  ui.modeSelect.value = pick(params.get("checkpoints"), ["note", "measure"], "note");
  ui.clefSelect.value = pick(params.get("clef"), ["both", "treble", "bass"], "both");
  const chord = Number(params.get("chord"));
  if (Number.isFinite(chord) && chord >= 50 && chord <= 1000) ui.chordWindow.value = String(chord);
  // "Just play" (mode=play) turns practice off: the score plays normally, with no checks or results.
  ui.practiceToggle.checked = params.get("mode") !== "play" && params.get("require") !== "0";
  practice.mode = ui.practiceMode.value;
  practice.enabled = ui.practiceToggle.checked;
  applyPracticeMute();
  refreshUi();
}
applyLaunchSettings();

/** Score playback through the Salamander piano samples. alphaTab's own synth is silenced, so only these play. **/
let scoreVoiceSerial = 0;
// alphaTab's synth sets its volume back to full when it (re)initialises, so keep it silenced.
function silenceAlphaTabSynth() {
  api.masterVolume = 0;
}
silenceAlphaTabSynth();
api.playerReady.on(silenceAlphaTabSynth);
api.soundFontLoad.on(silenceAlphaTabSynth);
api.scoreLoaded.on(silenceAlphaTabSynth);
api.midiEventsPlayed.on((e) => {
  // In wait mode the score is silent: the student plays the notes, and accompaniment is handled above.
  if (practice.enabled && practice.mode === "wait") return;
  for (const event of e.events) {
    const isOn = event.command === MidiEventTypes.NoteOn && event.noteVelocity > 0;
    const isOff = event.command === MidiEventTypes.NoteOff || (event.command === MidiEventTypes.NoteOn && event.noteVelocity === 0);
    if (!isOn && !isOff) continue;
    if (api.score?.tracks[event.track]?.isPercussion) continue;
    const key = `${event.track}-${event.noteKey}`;
    if (isOn) {
      // Treble-only or bass-only: the other clef is muted (notes of unknown clef still play).
      const clefFilter = ui.clefSelect.value;
      const kind = clefOfNoteAt(event.tick, event.noteKey);
      if (clefFilter !== "both" && (kind === "treble" || kind === "bass") && kind !== clefFilter) continue;
      const id = `score-${++scoreVoiceSerial}`;
      if (!scoreVoices.has(key)) scoreVoices.set(key, []);
      scoreVoices.get(key).push(id);
      startKeySound(event.noteKey, event.noteVelocity, id);
    } else {
      const queue = scoreVoices.get(key);
      if (!queue || queue.length === 0) continue;
      stopKeySound(event.noteKey, queue.shift());
    }
  }
});

/** Metronome: clicks are scheduled from the score's beats ahead of time, so they land on the beat. **/
// alphaTab reports a beat only after it has passed, so the clicks are not taken from its events.
let metroBeats = []; // { tick, accent, ticksPerBeat } sorted by tick
let metroPosition = null; // { time (ms), tick, bpm, wall (performance.now()) } from the latest position update
let metroScheduled = new Set(); // ticks already queued for a click
const METRO_LOOKAHEAD_MS = 250;

function buildMetronomeBeats() {
  metroBeats = [];
  const bars = api.score?.masterBars ?? [];
  bars.forEach((bar, i) => {
    const next = bars[i + 1];
    const barTicks = next ? next.start - bar.start : (i > 0 ? bar.start - bars[i - 1].start : 0);
    const beats = bar.timeSignatureNumerator || 4;
    if (barTicks <= 0) return;
    for (let beat = 0; beat < beats; beat++) {
      metroBeats.push({ tick: bar.start + beat * (barTicks / beats), accent: beat === 0, ticksPerBeat: barTicks / beats });
    }
  });
  metroScheduled.clear();
}

// Seconds from now until a tick is due, based on the latest position update and the playback speed.
function metronomeDelaySeconds(tick) {
  if (!metroPosition) return 0;
  const beat = metroBeats.find((b) => b.tick >= metroPosition.tick) ?? metroBeats[metroBeats.length - 1];
  const msPerTick = 60000 / (metroPosition.bpm * (beat ? beat.ticksPerBeat : 480));
  const dueMs = metroPosition.time + (tick - metroPosition.tick) * msPerTick;
  const elapsedReal = performance.now() - metroPosition.wall;
  const remainingRealMs = (dueMs - metroPosition.time) / (api.playbackSpeed || 1) - elapsedReal;
  return Math.max(0, remainingRealMs) / 1000;
}

function scheduleMetronome() {
  if (!metroPosition || api.metronomeVolume <= 0 || api.playerState !== PlayerState.Playing) return;
  if (!audioReady()) return; // wait until the browser allows sound (after the first click on the page)
  const lookaheadTicks = (METRO_LOOKAHEAD_MS / 1000) * (metroPosition.bpm / 60) * (metroBeats[0]?.ticksPerBeat ? metroBeats[0].ticksPerBeat : 480);
  for (const beat of metroBeats) {
    if (beat.tick < metroPosition.tick - 1) continue;
    if (beat.tick > metroPosition.tick + lookaheadTicks) break;
    if (metroScheduled.has(beat.tick)) continue;
    metroScheduled.add(beat.tick);
    playWoodblock(beat.accent, metronomeDelaySeconds(beat.tick));
  }
}

api.scoreLoaded.on(buildMetronomeBeats);
api.playerPositionChanged.on((e) => {
  // A jump backwards (seek or loop) starts the beats again.
  if (metroPosition && e.currentTick < metroPosition.tick - 1000) metroScheduled.clear();
  metroPosition = {
    time: e.currentTime,
    tick: e.currentTick,
    bpm: e.modifiedTempo || e.currentTempo || 120,
    wall: performance.now(),
  };
  scheduleMetronome();
});
api.playerStateChanged.on((e) => {
  if (e.state !== PlayerState.Playing) metroScheduled.clear();
});

