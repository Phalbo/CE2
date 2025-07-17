const MIDI_DURATION_TO_TICKS = {
    "1n": TICKS_PER_QUARTER_NOTE_REFERENCE * 4,   // Whole note
    "2n": TICKS_PER_QUARTER_NOTE_REFERENCE * 2,   // Half note
    "2n.": TICKS_PER_QUARTER_NOTE_REFERENCE * 3,  // Dotted half note
    "4n": TICKS_PER_QUARTER_NOTE_REFERENCE * 1,   // Quarter note
    "4n.": TICKS_PER_QUARTER_NOTE_REFERENCE * 1.5, // Dotted quarter note
    "8n": TICKS_PER_QUARTER_NOTE_REFERENCE * 0.5, // Eighth note
    "8n.": TICKS_PER_QUARTER_NOTE_REFERENCE * 0.75,// Dotted eighth note
    "16n": TICKS_PER_QUARTER_NOTE_REFERENCE * 0.25 // Sixteenth note
};
