export type ScaleType = 'major' | 'naturalMinor' | 'harmonicMinor' | 'melodicMinor';

export interface ScaleFormula {
  name: string;
  intervals: number[]; // in semitones
  displayFormula: string; // W-W-H-W-W-W-H format
}

export const scaleFormulas: Record<ScaleType, ScaleFormula> = {
  major: {
    name: 'Major',
    intervals: [2, 2, 1, 2, 2, 2, 1],
    displayFormula: 'W - W - H - W - W - W - H',
  },
  naturalMinor: {
    name: 'Natural Minor',
    intervals: [2, 1, 2, 2, 1, 2, 2],
    displayFormula: 'W - H - W - W - H - W - W',
  },
  harmonicMinor: {
    name: 'Harmonic Minor',
    intervals: [2, 1, 2, 2, 1, 3, 1],
    displayFormula: 'W - H - W - W - H - 1.5W - H',
  },
  melodicMinor: {
    name: 'Melodic Minor (Ascending)',
    intervals: [2, 1, 2, 2, 2, 2, 1],
    displayFormula: 'W - H - W - W - W - W - H',
  },
};

// All chromatic notes in order
export const chromaticNotes = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

export const flatNotes = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
];

export function getNoteIndex(note: string): number {
  const normalized = note.replace(/4|5/, '');
  const sharpIndex = chromaticNotes.indexOf(normalized);
  if (sharpIndex !== -1) return sharpIndex;

  const flatIndex = flatNotes.indexOf(normalized);
  return flatIndex !== -1 ? flatIndex : -1;
}

export function buildScale(rootNote: string, formula: ScaleFormula): string[] {
  const scale: string[] = [rootNote];
  let currentIndex = getNoteIndex(rootNote);

  if (currentIndex === -1) return scale;

  for (const interval of formula.intervals.slice(0, -1)) {
    currentIndex = (currentIndex + interval) % 12;
    scale.push(chromaticNotes[currentIndex]);
  }

  return scale;
}

export function getRandomScale(): { note: string; type: ScaleType } {
  const types: ScaleType[] = ['major', 'naturalMinor'];
  const type = types[Math.floor(Math.random() * types.length)];
  const notes = chromaticNotes.filter((n) => !n.includes('#'));
  const note = notes[Math.floor(Math.random() * notes.length)];
  return { note, type };
}
