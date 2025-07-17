// gen/generateRhythmChordsForSong.js

function generateRhythmChordsForSong(songData, helpers) {
    const { sectionCache } = helpers;
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

            const ts = `${timeSignature[0]}/${timeSignature[1]}`;
            const patternsForTs = RHYTHM_PATTERNS[ts] || RHYTHM_PATTERNS['default'];
            const chosenPattern = getWeightedRandom(patternsForTs.reduce((acc, p) => { acc[p.name] = p.weight; return acc; }, {}));
            const patternSteps = patternsForTs.find(p => p.name === chosenPattern).steps;

            const { root, type } = getChordRootAndType(chordName);
            const chordNotes = getChordNotes(root, type).notes;
            const pitches = chordNotes.map(note => NOTE_NAMES.indexOf(note) + 48);

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
