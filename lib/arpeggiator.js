// File: lib/arpeggiator.js - v2.1
// Genera arpeggi complessi per un dato slot di accordo, con supporto per vari pattern, rivolti e variazioni ritmiche.

const ARPEGGIO_PATTERNS = {
    'up': { weight: 10, notes: [0, 1, 2, 3] }, // Indici delle note dell'accordo
    'down': { weight: 10, notes: [3, 2, 1, 0] },
    'upDown': { weight: 10, notes: [0, 1, 2, 3, 2, 1, 0] },
    'downUp': { weight: 5, notes: [3, 2, 1, 0, 1, 2, 3] },
    'random': { weight: 5, notes: 'random' }, // 'random' indica di scegliere note a caso
    'converge': { weight: 3, notes: [0, 3, 1, 2] },
    'diverge': { weight: 3, notes: [2, 1, 3, 0] },
    'thumbPiano': { weight: 8, notes: [0, 2, 1, 3] }, // Stile Kalimba
    'skip': { weight: 7, notes: [0, 2, 3, 1] }, // Salta una nota
};

const RHYTHMIC_VARIATIONS = {
    'eighths': { weight: 10, durations: [0.5] }, // Durate in beat (0.5 = croma)
    'sixteenths': { weight: 5, durations: [0.25] },
    'dotted': { weight: 7, durations: [0.75, 0.25] }, // Semiminima puntata + croma
    'syncopated': { weight: 7, durations: [0.25, 0.5, 0.25] },
    'longShort': { weight: 5, durations: [1.0, 0.5] },
    'with_pause': {weight: 6, durations: [0.5, -0.5]}, // -0.5 = pausa di una croma
};

/**
 * Ottiene le note di un accordo in un certo rivolto.
 * @param {string[]} chordNotes - Note base dell'accordo (es. ['C', 'E', 'G'])
 * @param {number} inversion - 0 per fondamentale, 1 per primo rivolto, etc.
 * @returns {string[]} Le note dell'accordo nel rivolto specificato.
 */
function getChordInversion(chordNotes, inversion) {
    const notes = [...chordNotes];
    for (let i = 0; i < inversion; i++) {
        if (notes.length > 0) {
            notes.push(notes.shift()); // Sposta la nota più bassa alla fine (un'ottava sopra)
        }
    }
    return notes;
}

/**
 * Genera una serie di eventi MIDI che formano un arpeggio complesso.
 */
function generateChordRhythmEvents(songMidiData, CHORD_LIB_GLOBAL, NOTE_NAMES_GLOBAL, helpers, slotContext) {
    const rhythmicEvents = [];
    if (!slotContext || !slotContext.chordName || !helpers || typeof helpers.getChordRootAndType !== 'function') {
        return rhythmicEvents;
    }

    const { chordName, startTickAbsolute, durationTicks, timeSignature } = slotContext;
    const ticksPerBeat = (4 / timeSignature[1]) * TICKS_PER_QUARTER_NOTE_REFERENCE;

    const { root, type } = helpers.getChordRootAndType(chordName);
    const chordDefinition = CHORD_LIB_GLOBAL[chordName] || helpers.getChordNotes(root, type);

    if (!chordDefinition || !chordDefinition.notes || chordDefinition.notes.length < 3) {
        return rhythmicEvents;
    }

    // Aggiungi l'ottava per avere più note tra cui scegliere
    let extendedChordNotes = [...chordDefinition.notes, chordDefinition.notes[0]];

    // Scegli un rivolto casuale (0, 1, o 2)
    const inversion = helpers.getRandomElement([0, 1, 2]);
    const invertedChordNotes = getChordInversion(extendedChordNotes, inversion);

    const midiNoteNumbers = invertedChordNotes.map((noteName, i) => {
        let pitch = NOTE_NAMES_GLOBAL.indexOf(noteName);
        if (pitch === -1) {
            const sharpMap = {"Db":"C#", "Eb":"D#", "Fb":"E", "Gb":"F#", "Ab":"G#", "Bb":"A#", "Cb":"B"};
            const mappedNote = sharpMap[noteName];
            if(mappedNote) pitch = NOTE_NAMES_GLOBAL.indexOf(mappedNote);
        }
        // Se la nota è stata spostata in cima (rivolto), aumenta l'ottava
        const octaveOffset = (i < inversion) ? 12 : 0;
        return (pitch !== -1) ? pitch + 48 + octaveOffset : null;
    }).filter(n => n !== null);

    if (midiNoteNumbers.length < 3) return rhythmicEvents;

    const patternChoice = helpers.getWeightedRandom(ARPEGGIO_PATTERNS);
    const rhythmChoice = helpers.getWeightedRandom(RHYTHMIC_VARIATIONS);

    let arpeggioPattern = patternChoice.notes;
    if (arpeggioPattern === 'random') {
        arpeggioPattern = Array.from({ length: 8 }, () => Math.floor(Math.random() * midiNoteNumbers.length));
    }
    const rhythmPattern = rhythmChoice.durations;

    let currentTickInSlot = 0;
    let patternIndex = 0;
    let rhythmIndex = 0;

    while (currentTickInSlot < durationTicks) {
        const noteIndex = arpeggioPattern[patternIndex % arpeggioPattern.length];
        const noteToPlay = midiNoteNumbers[noteIndex % midiNoteNumbers.length];

        const durationInBeats = rhythmPattern[rhythmIndex % rhythmPattern.length];
        let actualDurationTicks = durationInBeats * ticksPerBeat;

        if (currentTickInSlot + Math.abs(actualDurationTicks) > durationTicks) {
            actualDurationTicks = durationTicks - currentTickInSlot;
        }

        if (actualDurationTicks > 0) {
             if (durationInBeats > 0) { // Se non è una pausa
                rhythmicEvents.push({
                    pitch: [noteToPlay],
                    duration: `T${Math.round(actualDurationTicks)}`,
                    startTick: startTickAbsolute + currentTickInSlot,
                    velocity: 70 + Math.floor(Math.random() * 15) // Aggiunge un po' di dinamica
                });
            }
        } else {
            break; // Evita loop infiniti se la durata è 0 o negativa
        }

        currentTickInSlot += Math.abs(actualDurationTicks);
        patternIndex++;
        rhythmIndex++;
    }

    return rhythmicEvents;
}
