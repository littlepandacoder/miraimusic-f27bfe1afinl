/*
 * Key sounds for the on-screen, computer and MIDI keyboards. Piano notes play from the Salamander
 * Grand Piano samples (Alexander Holm, CC BY 3.0) through Tone.js. Until those samples have loaded,
 * and for metronome clicks, a simple synthesized tone is used. Key sounds run on their own audio
 * context, separate from alphaTab's song playback, so pressing a key never stops the score.
 */

let context = null;
let output = null; // master chain: low-pass -> compressor -> speakers
const voices = new Map(); // voice id -> { oscillators, gain }

// Softer upper partials than before: the strong 2nd/3rd harmonics made chords buzzy.
const PARTIALS = [
  { multiple: 1, amplitude: 1 },
  { multiple: 2, amplitude: 0.3 },
  { multiple: 3, amplitude: 0.12 },
  { multiple: 4, amplitude: 0.04 },
];
// Loudness of a single note. Each new note is scaled down by the number of notes already sounding,
// so chords are not louder than a single note.
const BASE_PEAK_GAIN = 0.16;
const ATTACK_SECONDS = 0.012;

function getContext() {
  if (!context) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();

    const lowPass = context.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = 3200; // take off the harsh top end
    lowPass.Q.value = 0.5;

    const compressor = context.createDynamicsCompressor(); // stops loud chords from clipping
    compressor.threshold.value = -20;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    lowPass.connect(compressor).connect(context.destination);
    output = lowPass;
  }
  if (context.state === "suspended") context.resume();
  return context;
}

// `id` separates voices that share a pitch (e.g. a key press and an accompaniment note).
function startSynth(midi, velocity = 100, id = midi) {
  const ctx = getContext();
  if (!ctx) return;
  stopSynth(midi, id);

  const frequency = 440 * Math.pow(2, (midi - 69) / 12);
  const now = ctx.currentTime;
  const notesAlreadySounding = voices.size;
  const peak = (BASE_PEAK_GAIN / Math.sqrt(notesAlreadySounding + 1)) * (velocity / 127);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + ATTACK_SECONDS); // softer attack
  gain.gain.setTargetAtTime(peak * 0.4, now + ATTACK_SECONDS, 0.8); // gentle decay while held
  gain.connect(output);

  const oscillators = PARTIALS.map(({ multiple, amplitude }) => {
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency * multiple;
    const partialGain = ctx.createGain();
    partialGain.gain.value = amplitude;
    oscillator.connect(partialGain).connect(gain);
    oscillator.start(now);
    return oscillator;
  });

  voices.set(id, { oscillators, gain });
}

function stopSynth(midi, id = midi) {
  const voice = voices.get(id);
  if (!voice || !context) return;
  voices.delete(id);

  const now = context.currentTime;
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
  voice.gain.gain.linearRampToValueAtTime(0, now + 0.15); // short release
  voice.oscillators.forEach((oscillator) => oscillator.stop(now + 0.16));
}

/** Piano samples: Salamander Grand Piano by Alexander Holm (CC BY 3.0), played through Tone.js. **/
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const pianoName = (midi) => `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

// The samples are every third key from A0 (MIDI 21) to C8 (MIDI 108). The sampler shifts pitch for the rest.
// The Salamander set has no C4 sample, so C4 is left out and the sampler stretches the nearest sample to it.
const SAMPLE_NOTES = [];
for (let midi = 21; midi <= 108; midi += 3) {
  if (pianoName(midi) !== "C4") SAMPLE_NOTES.push(pianoName(midi));
}

// Three velocity layers (soft, medium, loud), one sampler each, in public/sheet-music-practice/piano/.
const LAYERS = [
  { layer: 4, maxVelocity: 50 },
  { layer: 9, maxVelocity: 95 },
  { layer: 14, maxVelocity: 127 },
];

// Tone.js stops every sound of a pitch when that pitch is released, so each layer has two copies and
// they take turns. That lets two notes of the same pitch overlap without cutting each other off.
const COPIES_PER_LAYER = 2;
const samplers = []; // { maxVelocity, copies: Tone.Sampler[], next: number }
let samplersLoaded = 0;
const totalSamplers = LAYERS.length * COPIES_PER_LAYER;
const sampled = new Map(); // voice id -> { sampler, name } for the note the sampler is playing

// Tone.js is loaded as a classic script before this module runs. Without it the synthesized tone is used.
function createSamplers() {
  const Tone = window.Tone;
  if (!Tone || !Tone.Sampler) return;
  const baseUrl = new URL("./piano/", document.baseURI).href;
  for (const { layer, maxVelocity } of LAYERS) {
    const urls = Object.fromEntries(SAMPLE_NOTES.map((note) => [note, `${note.replace("#", "s")}v${layer}.mp3`])); // "#" would start a URL fragment
    const copies = [];
    for (let copy = 0; copy < COPIES_PER_LAYER; copy++) {
      copies.push(new Tone.Sampler({
        urls,
        baseUrl,
        release: 1.5, // let notes fade naturally instead of stopping abruptly
        onload: () => {
          samplersLoaded++;
          if (samplersLoaded === totalSamplers) window.dispatchEvent(new Event("piano-samples-ready"));
        },
      }).toDestination());
    }
    samplers.push({ maxVelocity, copies, next: 0 });
  }
}
createSamplers();
// Browsers only start audio after a click or key press, so start Tone.js on the first one.
window.addEventListener("pointerdown", () => window.Tone && window.Tone.start(), { once: true });

const pianoReady = () => samplers.length > 0 && samplersLoaded === totalSamplers;
// Picks the layer for this velocity, then the next copy of that layer (taking turns).
function samplerFor(velocity) {
  const entry = samplers.find((layer) => velocity <= layer.maxVelocity);
  const sampler = entry.copies[entry.next];
  entry.next = (entry.next + 1) % entry.copies.length;
  return sampler;
}

// Piano sound: Salamander samples only. Nothing else is played for piano notes. Until the samples
// have loaded, piano notes are silent. `id` separates voices that share a pitch.
export function startKeySound(midi, velocity = 100, id = midi) {
  if (!pianoReady()) return;
  stopKeySound(midi, id);
  if (window.Tone.getContext().state !== "running") window.Tone.start();
  const sampler = samplerFor(velocity);
  const name = pianoName(midi);
  sampler.triggerAttack(name, undefined, Math.min(1, velocity / 127));
  sampled.set(id, { sampler, name });
}

// Stops all piano sound at once (pause, stop, end of score). Fades out quickly instead of ringing on.
export function silencePiano() {
  sampled.clear();
  for (const entry of samplers) {
    for (const copy of entry.copies) {
      copy.releaseAll();
      copy.volume.rampTo(-60, 0.08);
    }
  }
  setTimeout(() => {
    for (const entry of samplers) for (const copy of entry.copies) copy.volume.value = 0;
  }, 300);
}

export function stopKeySound(midi, id = midi) {
  const entry = sampled.get(id);
  if (!entry) return;
  entry.sampler.triggerRelease(entry.name);
  sampled.delete(id);
}

// The first click or key press anywhere on the page starts the synth audio (browsers require a gesture).
for (const gesture of ["pointerdown", "keydown"]) {
  window.addEventListener(gesture, () => { getContext(); }, { once: true });
}

// True once the browser lets this page make sound. Clicks are not queued before that, because a
// suspended audio context would release everything queued at once (a fast burst).
export function audioReady() {
  return !!context && context.state === "running";
}

// Classic wood block click for the metronome: a short noise knock plus two fast-decaying woody tones.
// The first beat of a bar is higher and louder. Built from Web Audio, so no sample file is needed.
export function playWoodblock(accent = false, delaySeconds = 0) {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime + Math.max(0, delaySeconds);
  const pitch = accent ? 1750 : 1250;
  const peak = accent ? 0.9 : 0.65;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  gain.connect(output);

  // Body: a fundamental and a non-harmonic partial, which gives the hollow wood sound.
  for (const [multiple, amplitude] of [[1, 1], [2.76, 0.4]]) {
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = pitch * multiple;
    const partial = ctx.createGain();
    partial.gain.value = amplitude;
    oscillator.connect(partial).connect(gain);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  // Attack: a very short noise knock through a band-pass filter.
  const length = Math.floor(ctx.sampleRate * 0.012);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2600;
  band.Q.value = 2.5;
  noise.connect(band).connect(gain);
  noise.start(now);
}

// Metronome clicks use the wood block sound (so they do not sound like piano notes).
export function startClickSound(midi, velocity = 100, id = midi) {
  startSynth(midi, velocity, id);
}

export function stopClickSound(midi, id = midi) {
  stopSynth(midi, id);
}
