// gen/generateRhythmChordsForSong.js

function generateRhythmChordsForSong(songData, helpers, sectionCache) {
    const chordEvents = [];
    let lastEvent = null;

    if (!sectionCache.rhythmChords) {
        sectionCache.rhythmChords = {};
    }

    songData.sections.forEach((section, sectionIndex) => {
        const baseName = normalizeSectionName(section.name);
        if (sectionCache.rhythmChords[baseName]) {
            const cachedChords = sectionCache.rhythmChords[baseName];
            cachedChords.forEach(event => {
                chordEvents.push({ ...event, startTick: event.startTick + section.startTick });
            });
            return;
        }

        const sectionChords = [];

        section.mainChordSlots.forEach((slot, slotIndex) => {
            const { chordName, effectiveDurationTicks, timeSignature, effectiveStartTickInSection, startTick } = slot;
            const { getChordRootAndType, getChordNotes, getRandomElement, NOTE_NAMES, getWeightedRandom } = helpers;

            // 1. Initialize pitches early to prevent ReferenceError
            const { root, type } = getChordRootAndType(chordName);
            const chordNotes = getChordNotes(root, type).notes;
            const pitches = chordNotes.map(note => NOTE_NAMES.indexOf(note) + 48);

            const ts = `${timeSignature[0]}/${timeSignature[1]}`;
            const patternsForTs = RHYTHM_PATTERNS[ts] || RHYTHM_PATTERNS['default'];

            if (!patternsForTs || patternsForTs.length === 0) {
                console.error(`No rhythm patterns found for time signature ${ts} or default.`);
                return;
            }

            // 2. Correctly get a random pattern name from the list of available patterns
            const availablePatternNames = patternsForTs.map(p => p.name);
            const chosenPatternName = getRandomElement(availablePatternNames); // Use simple random choice for stability
            const chosenPatternObject = patternsForTs.find(p => p.name === chosenPatternName);

            console.log(`Chosen pattern for ${chordName}: ${chosenPatternName}`); // Verification log

            if (!chosenPatternObject) {
                console.error(`Could not find pattern object for name: ${chosenPatternName}. Applying fallback.`);
                // Fallback to a single sustained note
                sectionChords.push({
                    pitch: pitches,
                    duration: `T${effectiveDurationTicks}`,
                    startTick: startTick + effectiveStartTickInSection,
                    velocity: 60
                });
                return;
            }

            const patternSteps = chosenPatternObject.steps;
            const stepDuration = effectiveDurationTicks / patternSteps.length;

            patternSteps.forEach((step, stepIndex) => {
                if (step === 'D' || step === 'U') { // Play a note
                    sectionChords.push({
                        pitch: pitches,
                        duration: `T${Math.round(stepDuration)}`,
                        startTick: startTick + effectiveStartTickInSection + (stepIndex * stepDuration),
                        velocity: 60 + Math.floor(Math.random() * 10)
                    });
                }
                // '-' is a rest, so we do nothing
            });
        });

        if (sectionChords.length > 0) {
            const cachedSectionChords = sectionChords.map(event => ({
                ...event,
                startTick: event.startTick - section.startTick
            }));
            sectionCache.rhythmChords[baseName] = cachedSectionChords;
        }

        chordEvents.push(...sectionChords);
    });

    return chordEvents;
}

function normalizeSectionName(name) {
  // Rimuove numeri finali tipo "Verse 1" → "Verse"
  return name.replace(/\s*\d+$/, '').trim();
}
