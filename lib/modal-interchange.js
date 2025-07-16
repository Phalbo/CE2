// File: lib/modal-interchange.js
// Scopo: Contiene la logica per la funzionalità di modal interchange.

const MODAL_INTERCHANGE = {
  Ionian: {
    Aeolian: ['iv', 'bVI', 'bVII'],
    Dorian: ['ii', 'IV'],
    Phrygian: ['bII', 'iv'],
    Mixolydian: ['bVII'],
    Lydian: ['II'],
    Locrian: []
  },
  Aeolian: {
    Ionian: ['I', 'V'],
    Dorian: ['IV', 'ii'],
    Phrygian: ['bII', 'v'],
    Mixolydian: ['bVII'],
    Lydian: ['II'],
    Locrian: []
  },
  Dorian: {
    Ionian: ['I', 'V'],
    Aeolian: ['bVI', 'bVII'],
    Phrygian: ['bII'],
    Mixolydian: ['bVII'],
    Lydian: ['II'],
    Locrian: []
  },
  Phrygian: {
    Ionian: ['I'],
    Aeolian: ['bVI', 'bVII'],
    Dorian: ['IV'],
    Mixolydian: ['bVII'],
    Lydian: ['II'],
    Locrian: []
  },
  Lydian: {
    Ionian: ['I', 'V'],
    Mixolydian: ['bVII'],
    Aeolian: ['bVI'],
    Dorian: ['ii'],
    Phrygian: ['bII'],
    Locrian: []
  },
  Mixolydian: {
    Ionian: ['I', 'ii'],
    Aeolian: ['bVI'],
    Dorian: ['IV'],
    Phrygian: ['bII'],
    Lydian: ['II'],
    Locrian: []
  },
  Locrian: {
    Aeolian: ['bVI'],
    Phrygian: ['bII'],
    Dorian: ['ii'],
    Ionian: ['I'],
    Mixolydian: ['bVII'],
    Lydian: ['II']
  }
};

/**
 * Restituisce un accordo specifico da una modalità.
 * @param {string} key - La nota fondamentale della tonalità.
 * @param {string} mode - La modalità da cui prendere l'accordo.
 * @param {string} degreeSymbol - Il simbolo del grado dell'accordo (es. 'IV', 'bII').
 * @returns {string|null} - Il nome dell'accordo o null se non trovato.
 */
function getChordFromDegree(key, mode, degreeSymbol) {
  const scaleChords = getDiatonicChords(key, mode);
  if (!scaleChords || scaleChords.length === 0) {
    return null;
  }

  const degreesMap = {
    'I': 0, 'i': 0,
    'bII': 1, 'ii': 1, 'II': 1,
    'bIII': 2, 'iii': 2, 'III': 2,
    'iv': 3, 'IV': 3,
    'v': 4, 'V': 4,
    'bVI': 5, 'vi': 5, 'VI': 5,
    'bVII': 6, 'vii': 6, 'VII': 6
  };

  // Semplificazione: usiamo un mapping diretto basato sulla posizione,
  // ma la logica di `getDiatonicChords` già si occupa della qualità corretta.
  // La mappatura `degreeSymbol` aiuta a trovare l'indice corretto.
  const index = degreesMap[degreeSymbol];

  if (index !== undefined && scaleChords[index]) {
    // Per gestire correttamente i gradi alterati (es. bII, bVI, bVII),
    // dobbiamo ricalcolare l'accordo dalla scala corretta.
    // Ad esempio, il bII in C Ionian è Db maj, che viene da C Phrygian.
    // La funzione getDiatonicChords(key, mode) dovrebbe già darci gli accordi giusti per quel modo.
    // Quindi, se chiediamo il 'bII' dal modo 'Phrygian', `getDiatonicChords` per 'Phrygian'
    // dovrebbe restituire l'accordo corretto nella posizione corretta.

    const targetModeForDegree = Object.keys(MODAL_INTERCHANGE.Ionian).find(m => MODAL_INTERCHANGE.Ionian[m].includes(degreeSymbol));

    if (targetModeForDegree) {
        const chordsFromTargetMode = getDiatonicChords(key, targetModeForDegree);
        if (chordsFromTargetMode && chordsFromTargetMode[index]) {
            return chordsFromTargetMode[index];
        }
    }

    return scaleChords[index];
  }
  return null;
}


/**
 * Restituisce una lista di accordi disponibili per lo scambio modale.
 * @param {string} key - La nota fondamentale della tonalità.
 * @param {string} currentMode - La modalità corrente della canzone.
 * @returns {Array<Object>} - Una lista di oggetti accordo con informazioni sulla modalità di origine.
 */
function getInterchangeChords(key, currentMode) {
  const interchange = MODAL_INTERCHANGE[currentMode];
  const chords = [];

  if (!interchange) {
    return chords;
  }

  for (const [mode, degrees] of Object.entries(interchange)) {
    degrees.forEach(degree => {
      const chord = getChordFromDegree(key, mode, degree);
      if (chord) {
        chords.push({ chord: chord, fromMode: mode });
      }
    });
  }

  return chords;
}
