export interface Chord {
  name: string;
  notes: string[]; // Piano notes like "C4", "E4", "G4"
  symbol: string; // Display symbol like "C", "Cm", "C7"
}

export interface ChordProgression {
  id: string;
  name: string;
  description: string;
  chords: Chord[];
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  genre?: string;
}

export const CHORD_BANK: Record<string, Chord> = {
  // Major Chords
  C: { name: "C Major", notes: ["C4", "E4", "G4"], symbol: "C" },
  D: { name: "D Major", notes: ["D4", "F#4", "A4"], symbol: "D" },
  E: { name: "E Major", notes: ["E4", "G#4", "B4"], symbol: "E" },
  F: { name: "F Major", notes: ["F4", "A4", "C5"], symbol: "F" },
  G: { name: "G Major", notes: ["G4", "B4", "D5"], symbol: "G" },
  A: { name: "A Major", notes: ["A4", "C#5", "E5"], symbol: "A" },
  B: { name: "B Major", notes: ["B4", "D#5", "F#5"], symbol: "B" },

  // Minor Chords
  Cm: { name: "C Minor", notes: ["C4", "Eb4", "G4"], symbol: "Cm" },
  Dm: { name: "D Minor", notes: ["D4", "F4", "A4"], symbol: "Dm" },
  Em: { name: "E Minor", notes: ["E4", "G4", "B4"], symbol: "Em" },
  Fm: { name: "F Minor", notes: ["F4", "Ab4", "C5"], symbol: "Fm" },
  Gm: { name: "G Minor", notes: ["G4", "Bb4", "D5"], symbol: "Gm" },
  Am: { name: "A Minor", notes: ["A4", "C5", "E5"], symbol: "Am" },
  Bm: { name: "B Minor", notes: ["B4", "D5", "F#5"], symbol: "Bm" },

  // Dominant 7 Chords
  G7: { name: "G7", notes: ["G4", "B4", "D5", "F5"], symbol: "G7" },
  C7: { name: "C7", notes: ["C4", "E4", "G4", "Bb4"], symbol: "C7" },
  D7: { name: "D7", notes: ["D4", "F#4", "A4", "C5"], symbol: "D7" },

  // Major 7 Chords
  Cmaj7: { name: "C Major 7", notes: ["C4", "E4", "G4", "B4"], symbol: "Cmaj7" },
  Dmaj7: { name: "D Major 7", notes: ["D4", "F#4", "A4", "C#5"], symbol: "Dmaj7" },
  Gmaj7: { name: "G Major 7", notes: ["G4", "B4", "D5", "F#5"], symbol: "Gmaj7" },

  // Minor 7 Chords
  Em7: { name: "E Minor 7", notes: ["E4", "G4", "B4", "D5"], symbol: "Em7" },
  Am7: { name: "A Minor 7", notes: ["A4", "C5", "E5", "G5"], symbol: "Am7" },
  Dm7: { name: "D Minor 7", notes: ["D4", "F4", "A4", "C5"], symbol: "Dm7" },
};

// Predefined Popular Chord Progressions
export const POPULAR_PROGRESSIONS: ChordProgression[] = [
  // Beginner Progressions
  {
    id: "beginner-1",
    name: "I-IV-V (C-F-G)",
    description: "The classic three-chord progression",
    chords: [
      CHORD_BANK.C,
      CHORD_BANK.F,
      CHORD_BANK.G,
    ],
    difficulty: "beginner",
    category: "Basic",
    genre: "Blues, Rock, Pop",
  },
  {
    id: "beginner-2",
    name: "I-V (C-G)",
    description: "Simple two-chord progression",
    chords: [CHORD_BANK.C, CHORD_BANK.G],
    difficulty: "beginner",
    category: "Basic",
    genre: "Folk, Country",
  },
  {
    id: "beginner-3",
    name: "I-IV (C-F)",
    description: "Simple major progression",
    chords: [CHORD_BANK.C, CHORD_BANK.F],
    difficulty: "beginner",
    category: "Basic",
  },
  {
    id: "beginner-4",
    name: "I-vi (C-Am)",
    description: "Major to minor progression",
    chords: [CHORD_BANK.C, CHORD_BANK.Am],
    difficulty: "beginner",
    category: "Basic",
  },

  // Intermediate Progressions
  {
    id: "intermediate-1",
    name: "I-IV-V-I (C-F-G-C) - Cadence",
    description: "Perfect authentic cadence",
    chords: [
      CHORD_BANK.C,
      CHORD_BANK.F,
      CHORD_BANK.G,
      CHORD_BANK.C,
    ],
    difficulty: "intermediate",
    category: "Classical",
  },
  {
    id: "intermediate-2",
    name: "vi-IV-I-V (Am-F-C-G)",
    description: "Modern pop progression",
    chords: [
      CHORD_BANK.Am,
      CHORD_BANK.F,
      CHORD_BANK.C,
      CHORD_BANK.G,
    ],
    difficulty: "intermediate",
    category: "Pop",
    genre: "Pop, Hip-Hop",
  },
  {
    id: "intermediate-3",
    name: "I-V-vi-IV (C-G-Am-F)",
    description: "Very popular modern progression",
    chords: [
      CHORD_BANK.C,
      CHORD_BANK.G,
      CHORD_BANK.Am,
      CHORD_BANK.F,
    ],
    difficulty: "intermediate",
    category: "Pop",
    genre: "Pop",
  },
  {
    id: "intermediate-4",
    name: "ii-V-I (Dm-G-C)",
    description: "Jazz standard progression",
    chords: [
      CHORD_BANK.Dm,
      CHORD_BANK.G,
      CHORD_BANK.C,
    ],
    difficulty: "intermediate",
    category: "Jazz",
    genre: "Jazz",
  },
  {
    id: "intermediate-5",
    name: "I-IV-vi-IV (C-F-Am-F)",
    description: "Emotional progression",
    chords: [
      CHORD_BANK.C,
      CHORD_BANK.F,
      CHORD_BANK.Am,
      CHORD_BANK.F,
    ],
    difficulty: "intermediate",
    category: "Pop",
  },

  // Advanced Progressions
  {
    id: "advanced-1",
    name: "i-VII-VI-VII (Cm-Bb-Ab-Bb) - Phrygian",
    description: "Spanish/Middle Eastern sound",
    chords: [CHORD_BANK.Cm, CHORD_BANK.Cm, CHORD_BANK.Cm, CHORD_BANK.Cm],
    difficulty: "advanced",
    category: "Modal",
    genre: "World Music",
  },
  {
    id: "advanced-2",
    name: "I-iii-IV-V (C-Em-F-G)",
    description: "Extended major scale harmony",
    chords: [
      CHORD_BANK.C,
      CHORD_BANK.Em,
      CHORD_BANK.F,
      CHORD_BANK.G,
    ],
    difficulty: "advanced",
    category: "Jazz",
  },
  {
    id: "advanced-3",
    name: "vi-ii-V-I (Am-Dm-G-C)",
    description: "Jazz turnaround",
    chords: [
      CHORD_BANK.Am,
      CHORD_BANK.Dm,
      CHORD_BANK.G,
      CHORD_BANK.C,
    ],
    difficulty: "advanced",
    category: "Jazz",
    genre: "Jazz",
  },
  {
    id: "advanced-4",
    name: "Imaj7-vi7-ii7-V7 (Cmaj7-Am7-Dm7-G7)",
    description: "Advanced jazz with 7th chords",
    chords: [
      CHORD_BANK.Cmaj7,
      CHORD_BANK.Am7,
      CHORD_BANK.Dm7,
      CHORD_BANK.G7,
    ],
    difficulty: "advanced",
    category: "Jazz",
    genre: "Jazz",
  },
];

export function getProgressionsByDifficulty(difficulty: "beginner" | "intermediate" | "advanced") {
  return POPULAR_PROGRESSIONS.filter(p => p.difficulty === difficulty);
}

export function getProgressionsByCategory(category: string) {
  return POPULAR_PROGRESSIONS.filter(p => p.category === category);
}

export function getAllDifficulties() {
  return ["beginner", "intermediate", "advanced"] as const;
}

export function getAllCategories() {
  const categories = new Set(POPULAR_PROGRESSIONS.map(p => p.category));
  return Array.from(categories);
}
