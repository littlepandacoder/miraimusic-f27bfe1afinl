/*
 * Key sampler for the on-screen and computer keyboards. It runs on its own Web Audio
 * context, separate from alphaTab's song playback, so pressing a key never stops the score.
 * The tone is a simple additive piano-like sound (fundamental plus harmonics with a decay),
 * not alphaTab's SoundFont samples.
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
export function startKeySound(midi, velocity = 100, id = midi) {
  const ctx = getContext();
  if (!ctx) return;
  stopKeySound(midi, id);

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

export function stopKeySound(midi, id = midi) {
  const voice = voices.get(id);
  if (!voice || !context) return;
  voices.delete(id);

  const now = context.currentTime;
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
  voice.gain.gain.linearRampToValueAtTime(0, now + 0.15); // short release
  voice.oscillators.forEach((oscillator) => oscillator.stop(now + 0.16));
}
