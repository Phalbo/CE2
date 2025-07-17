const CHORD_RHYTHM_PATTERNS = {
    "4/4": [
        { name: "EighthNotes", weight: 20, pattern: [{ duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }] },
        { name: "QuarterNotes", weight: 30, pattern: [{ duration: "4n" }, { duration: "4n" }, { duration: "4n" }, { duration: "4n" }] },
        { name: "HalfNotes", weight: 15, pattern: [{ duration: "2n" }, { duration: "2n" }] },
        { name: "WholeNote", weight: 10, pattern: [{ duration: "1n" }] },
        { name: "Syncopated1", weight: 15, pattern: [{ duration: "8n" }, { duration: "4n" }, { duration: "8n" }, { duration: "4n" }, { duration: "4n" }] }, // 1/8 + 1/4 + 1/8 + 1/4 + 1/4 = 1 bar
        { name: "Syncopated2", weight: 10, pattern: [{ duration: "4n." }, { duration: "8n" }, { duration: "2n" }] } // 3/8 + 1/8 + 1/2 = 1 bar
    ],
    "3/4": [
        { name: "QuarterNotes", weight: 40, pattern: [{ duration: "4n" }, { duration: "4n" }, { duration: "4n" }] },
        { name: "EighthNotes", weight: 25, pattern: [{ duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }] },
        { name: "DottedHalf", weight: 20, pattern: [{ duration: "2n." }] },
        { name: "WaltzFeel", weight: 15, pattern: [{ duration: "4n" }, { duration: "2n" }] }
    ],
    "6/8": [
        { name: "EighthNotes", weight: 35, pattern: [{ duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }] },
        { name: "DottedQuarters", weight: 30, pattern: [{ duration: "4n." }, { duration: "4n." }] },
        { name: "CompoundFeel1", weight: 20, pattern: [{ duration: "4n" }, { duration: "8n" }, { duration: "4n" }, { duration: "8n" }] },
        { name: "CompoundFeel2", weight: 15, pattern: [{ duration: "8n" }, { duration: "8n" }, { duration: "4n." }, { duration: "8n" }] } // Added one more 8n to complete
    ],
    "2/4": [
        { name: "QuarterNotes", weight: 50, pattern: [{ duration: "4n" }, { duration: "4n" }] },
        { name: "EighthNotes", weight: 30, pattern: [{ duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }] },
        { name: "HalfNote", weight: 20, pattern: [{ duration: "2n" }] }
    ],
    "12/8": [
        { name: "EighthNotes", weight: 30, pattern: Array(12).fill({ duration: "8n" }) },
        { name: "DottedQuarters", weight: 25, pattern: [{ duration: "4n." }, { duration: "4n." }, { duration: "4n." }, { duration: "4n." }] },
        { name: "ShuffleFeel", weight: 25, pattern: [{ duration: "4n" }, { duration: "8n" }, { duration: "4n" }, { duration: "8n" }, { duration: "4n" }, { duration: "8n" }, { duration: "4n" }, { duration: "8n" }] },
        { name: "LongAndShort", weight: 20, pattern: [{ duration: "2n." }, { duration: "2n." }] } // 2 x (6/8)
    ],
    // Fallback for other time signatures - can be expanded
    "default": [
        { name: "QuarterNotesGeneric", weight: 100, pattern: [{ duration: "4n" }] } // Repeats to fill
    ]
};

function totalBeats(pattern) {
  const durationMap = {
    "8n": 0.5,
    "4n": 1,
    "2n": 2,
    "1n": 4,
    "4n.": 1.5,
    "2n.": 3,
    "2n..": 3.5
  };
  return pattern.reduce((sum, p) => sum + (durationMap[p.duration] || 0), 0);
}

function validateAndFixPattern(pattern, timeSignature) {
  const [beatsPerBar, beatUnit] = timeSignature.split('/').map(Number);
  const expectedBeats = (beatsPerBar / beatUnit) * 4;
  let actualBeats = totalBeats(pattern);

  while (actualBeats < expectedBeats) {
    const remainingBeats = expectedBeats - actualBeats;
    if (remainingBeats >= 1) {
      pattern.push({ duration: "4n" });
    } else if (remainingBeats >= 0.5) {
      pattern.push({ duration: "8n" });
    }
    actualBeats = totalBeats(pattern);
  }

  // Truncate if it's too long
  while (actualBeats > expectedBeats) {
    pattern.pop();
    actualBeats = totalBeats(pattern);
  }

  return pattern;
}

function getChordRhythmPattern(timeSignature) {
    const patterns = CHORD_RHYTHM_PATTERNS[timeSignature] || CHORD_RHYTHM_PATTERNS["default"];
    const totalWeight = patterns.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    for (const pattern of patterns) {
        if (random < pattern.weight) {
            return pattern;
        }
        random -= pattern.weight;
    }
}

function expandChordRhythm(pattern, chords) {
  const chordEvents = [];
  let chordIndex = 0;
  for (const beat of pattern) {
    chordEvents.push({
      chord: chords[chordIndex],
      duration: beat.duration
    });
    chordIndex = (chordIndex + 1) % chords.length;
  }
  return chordEvents;
}
