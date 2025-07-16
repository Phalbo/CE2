// File: lib/arpeggiator.js - v2.2
// Genera arpeggi complessi per un dato slot di accordo, con supporto per vari pattern, rivolti e variazioni ritmiche.

const ARPEGGIO_PATTERNS = {
    'up': { weight: 10, notes: [0, 1, 2, 3] }, // Indici delle note dell'accordo
    'down': { weight: 10, notes: [3, 2, 1, 0] },
    'upDown': { weight: 10, notes: [0, 1, 2, 3, 2, 1, 0] },
    'downUp': { weight: 5, notes: [3, 2, 1, 0, 1, 2, 3] },
    'random': { weight: 5, notes: 'random' },
    'converge': { weight: 3, notes: [0, 3, 1, 2] },
    'diverge': { weight: 3, notes: [2, 1, 3, 0] },
    'thumbPiano': { weight: 8, notes: [0, 2, 1, 3] },
    'skip': { weight: 7, notes: [0, 2, 3, 1] },
    'circle': { weight: 4, notes: [0, 1, 2, 3, 0, 2, 1, 3] },
    'zigzag': { weight: 4, notes: [0, 3, 1, 2, 0, 2, 1, 3] },
    'leapFrog': { weight: 3, notes: [0, 2, 0, 3, 1, 3, 1, 2] },
    'brokenChord': { weight: 5, notes: [0, 2, 1, 3] },
    'reverseThumb': { weight: 3, notes: [3, 1, 2, 0] },
    'octaveJumps': { weight: 2, notes: [0, 0, 2, 2] },
    'outerToInner': { weight: 3, notes: [0, 3, 1, 2] },
    'bounce': { weight: 4, notes: [0, 2, 0, 3, 1, 3, 2, 0] },
    'spiral': { weight: 2, notes: [0, 1, 3, 2, 0, 2, 1, 3] },
    'doubleBounce': { weight: 3, notes: [0, 0, 3, 3, 1, 1, 2, 2] },
    'sawTooth': { weight: 2, notes: [0, 1, 2, 3, 3, 2, 1, 0] },
    'insideOut': { weight: 3, notes: [1, 2, 0, 3] },
    'arabic': { weight: 2, notes: [0, 2, 1, 3, 2, 0, 3, 1] },
    'fractal': { weight: 2, notes: [0, 1, 0, 2, 0, 3] },
    'shortBurst': { weight: 1, notes: [0, 1, 2] },
    'slap': { weight: 1, notes: [0, 3] }
};

const RHYTHMIC_VARIATIONS = {
    'eighths': { weight: 10, durations: [0.5] }, // Durate in beat (0.5 = croma)
    'sixteenths': { weight: 5, durations: [0.25] },
    'dotted': { weight: 7, durations: [0.75, 0.25] },
    'syncopated': { weight: 7, durations: [0.25, 0.5, 0.25] },
    'longShort': { weight: 5, durations: [1.0, 0.5] },
    'with_pause': {weight: 6, durations: [0.5, -0.5]},
    'triplets': { weight: 6, durations: [1 / 3, 1 / 3, 1 / 3] },
    'shuffle': { weight: 7, durations: [0.67, 0.33] },
    'crescendo': { weight: 3, durations: [0.25, 0.5, 0.75, 1.0] },
    'diminuendo': { weight: 3, durations: [1.0, 0.75, 0.5, 0.25] },
    'mixedLengths': { weight: 5, durations: [0.5, 0.25, 1.0, 0.25] },
    'irregular': { weight: 2, durations: [0.4, 0.6, 0.2, 0.8] },
    'restedSyncopation': { weight: 4, durations: [0.25, -0.25, 0.5, -0.25, 0.5] },
    'bounceRhythm': { weight: 3, durations: [0.5, 0.75, 0.25] },
    'longSyncopated': { weight: 3, durations: [1.0, -0.25, 0.25, 0.5] },
    'irregularWithPauses': { weight: 2, durations: [0.25, -0.25, 0.75, -0.5, 0.5] },
    'funky': { weight: 4, durations: [0.25, 0.25, 0.5, 0.25, 0.25, 0.5] },
    'doubleTime': { weight: 3, durations: [0.125, 0.125, 0.25, 0.25, 0.5] },
    'offBeat': { weight: 3, durations: [-0.25, 0.75, 0.25, -0.25, 0.5] }
};

function getChordInversion(chordNotes, inversion) {
    const notes = [...chordNotes];
    for (let i = 0; i < inversion; i++) {
        if (notes.length > 0) {
            notes.push(notes.shift());
        }
    }
    return notes;
}

function generateChordRhythmEvents(songMidiData, CHORD_LIB_GLOBAL, NOTE_NAMES_GLOBAL, helpers, slotContext) {
    const rhythmicEvents = [];
    if (!slotContext || !slotContext.chordName || !helpers || typeof helpers.getChordRootAndType !== 'function' || !helpers.getWeightedRandom) {
        return rhythmicEvents;
    }

    const { chordName, startTickAbsolute, durationTicks, timeSignature } = slotContext;
    const ticksPerBeat = (4 / timeSignature[1]) * TICKS_PER_QUARTER_NOTE_REFERENCE;

    const { root, type } = helpers.getChordRootAndType(chordName);
    const chordDefinition = CHORD_LIB_GLOBAL[chordName] || helpers.getChordNotes(root, type);

    if (!chordDefinition || !chordDefinition.notes || chordDefinition.notes.length < 3) {
        return rhythmicEvents;
    }

    let extendedChordNotes = [...chordDefinition.notes];
    if (chordDefinition.notes.length === 3) { // Se è una triade, aggiungi l'ottava
        extendedChordNotes.push(chordDefinition.notes[0]);
    }

    const inversion = helpers.getRandomElement([0, 1, 2]);
    const invertedChordNotes = getChordInversion(extendedChordNotes, inversion);

    const midiNoteNumbers = invertedChordNotes.map((noteName, i) => {
        let pitch = NOTE_NAMES_GLOBAL.indexOf(noteName);
        if (pitch === -1) {
            const sharpMap = {"Db":"C#", "Eb":"D#", "Fb":"E", "Gb":"F#", "Ab":"G#", "Bb":"A#", "Cb":"B"};
            const mappedNote = sharpMap[noteName];
            if(mappedNote) pitch = NOTE_NAMES_GLOBAL.indexOf(mappedNote);
        }
        const octaveOffset = (i < inversion) ? 12 : 0;
        return (pitch !== -1) ? pitch + 48 + octaveOffset : null;
    }).filter(n => n !== null);

    if (midiNoteNumbers.length < 3) return rhythmicEvents;

    const patternChoice = helpers.getWeightedRandom(ARPEGGIO_PATTERNS);
    const rhythmChoice = helpers.getWeightedRandom(RHYTHMIC_VARIATIONS);

    let arpeggioPattern = patternChoice.notes;
    if (arpeggioPattern === 'random') {
        arpeggioPattern = Array.from({ length: 16 }, () => Math.floor(Math.random() * midiNoteNumbers.length));
    }
    const rhythmPattern = rhythmChoice.durations;

    let currentTickInSlot = 0;
    let patternIndex = 0;
    let rhythmIndex = 0;

    while (currentTickInSlot < durationTicks) {
        const noteIndex = arpeggioPattern[patternIndex % arpeggioPattern.length];
        const noteToPlay = midiNoteNumbers[noteIndex % midiNoteNumbers.length];

        const durationInBeats = rhythmPattern[rhythmIndex % rhythmPattern.length];
        let actualDurationTicks = Math.round(durationInBeats * ticksPerBeat);

        if (currentTickInSlot + Math.abs(actualDurationTicks) > durationTicks) {
            actualDurationTicks = durationTicks - currentTickInSlot;
        }

        if (actualDurationTicks > 0) {
             if (durationInBeats > 0) {
                rhythmicEvents.push({
                    pitch: [noteToPlay],
                    duration: `T${actualDurationTicks}`,
                    startTick: startTickAbsolute + currentTickInSlot,
                    velocity: 70 + Math.floor(Math.random() * 15)
                });
            }
        } else {
            break;
        }

        currentTickInSlot += Math.abs(actualDurationTicks);
        patternIndex++;
        rhythmIndex++;
    }

    return rhythmicEvents;
}
