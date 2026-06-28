/**
 * Sight Reading Level Configurations
 * Defines note ranges for each level and clef
 */

export type ClefType = 'treble' | 'bass';
export type DifficultyLevel = 1 | 2 | 3;

export interface NoteRange {
  from: string;
  to: string;
  label: string;
}

export interface LevelConfig {
  level: DifficultyLevel;
  name: string;
  description: string;
  ranges: {
    treble: NoteRange;
    bass: NoteRange;
  };
}

/**
 * All available sight reading levels
 */
export const SIGHT_READING_LEVELS: LevelConfig[] = [
  {
    level: 1,
    name: 'Level 1 - Beginner',
    description: 'Start with basic note reading',
    ranges: {
      treble: {
        from: 'C4',
        to: 'A4',
        label: 'C4 to A4 (Treble)',
      },
      bass: {
        from: 'A3',
        to: 'C4',
        label: 'A3 to C4 (Bass)',
      },
    },
  },
  {
    level: 2,
    name: 'Level 2 - Intermediate',
    description: 'Expand your range with higher and lower notes',
    ranges: {
      treble: {
        from: 'C5',
        to: 'G5',
        label: 'C5 to G5 (Treble)',
      },
      bass: {
        from: 'C3',
        to: 'C4',
        label: 'C3 to C4 (Bass)',
      },
    },
  },
  {
    level: 3,
    name: 'Level 3 - Advanced',
    description: 'Master both ranges combined',
    ranges: {
      treble: {
        from: 'C4',
        to: 'G5',
        label: 'C4 to G5 (Treble - Mixed)',
      },
      bass: {
        from: 'G3',
        to: 'C4',
        label: 'G3 to C4 (Bass - Mixed)',
      },
    },
  },
];

/**
 * Get configuration for a specific level
 */
export function getLevelConfig(level: DifficultyLevel): LevelConfig | undefined {
  return SIGHT_READING_LEVELS.find((l) => l.level === level);
}

/**
 * Get note range for a specific level and clef
 */
export function getNoteRange(level: DifficultyLevel, clef: ClefType): NoteRange | undefined {
  const config = getLevelConfig(level);
  if (!config) return undefined;
  return config.ranges[clef];
}

/**
 * Get all levels for a specific clef
 */
export function getLevelsForClef(clef: ClefType): LevelConfig[] {
  return SIGHT_READING_LEVELS.map((level) => ({
    ...level,
    ranges: {
      treble: level.ranges.treble,
      bass: level.ranges.bass,
    },
  }));
}

/**
 * Convert note name to MIDI number for range calculations
 * Useful for determining if a note is within a range
 */
export const NOTE_TO_MIDI: Record<string, number> = {
  // Octave 1
  'A1': 21,
  'B1': 23,
  // Octave 2
  'C2': 24,
  'D2': 26,
  'E2': 28,
  'F2': 29,
  'G2': 31,
  'A2': 33,
  'B2': 35,
  // Octave 3
  'C3': 36,
  'D3': 38,
  'E3': 40,
  'F3': 41,
  'G3': 43,
  'A3': 45,
  'B3': 47,
  // Octave 4 (Middle C area)
  'C4': 48,
  'D4': 50,
  'E4': 52,
  'F4': 53,
  'G4': 55,
  'A4': 57,
  'B4': 59,
  // Octave 5
  'C5': 60,
  'D5': 62,
  'E5': 64,
  'F5': 65,
  'G5': 67,
  'A5': 69,
  'B5': 71,
  // Octave 6
  'C6': 72,
  'D6': 74,
  'E6': 76,
  'F6': 77,
  'G6': 79,
  'A6': 81,
  'B6': 83,
};

/**
 * Check if a note is within the given range
 */
export function isNoteInRange(note: string, from: string, to: string): boolean {
  const noteMidi = NOTE_TO_MIDI[note];
  const fromMidi = NOTE_TO_MIDI[from];
  const toMidi = NOTE_TO_MIDI[to];

  if (noteMidi === undefined || fromMidi === undefined || toMidi === undefined) {
    return false;
  }

  return noteMidi >= fromMidi && noteMidi <= toMidi;
}

/**
 * Get all notes within a range
 */
export function getNotesInRange(from: string, to: string): string[] {
  const allNotes = Object.keys(NOTE_TO_MIDI).sort((a, b) => NOTE_TO_MIDI[a] - NOTE_TO_MIDI[b]);
  const fromMidi = NOTE_TO_MIDI[from];
  const toMidi = NOTE_TO_MIDI[to];

  if (fromMidi === undefined || toMidi === undefined) {
    return [];
  }

  return allNotes.filter((note) => {
    const midi = NOTE_TO_MIDI[note];
    return midi >= fromMidi && midi <= toMidi;
  });
}

/**
 * Treble Clef specific levels
 */
export const TREBLE_LEVELS = {
  1: { from: 'C4', to: 'A4', name: 'Beginner' },
  2: { from: 'C5', to: 'G5', name: 'Intermediate' },
  3: { from: 'C4', to: 'G5', name: 'Advanced' },
};

/**
 * Bass Clef specific levels
 */
export const BASS_LEVELS = {
  1: { from: 'A3', to: 'C4', name: 'Beginner' },
  2: { from: 'C3', to: 'C4', name: 'Intermediate' },
  3: { from: 'G3', to: 'C4', name: 'Advanced' },
};

/**
 * Get suggested daily practice routine
 */
export function getDailyPracticeRoutine(currentLevel: DifficultyLevel): DifficultyLevel[] {
  // Progression: do current level, then advance
  if (currentLevel === 1) return [1, 1, 2];
  if (currentLevel === 2) return [2, 2, 3];
  return [3, 3, 3]; // Expert stays at 3
}
