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
            const { getChordRootAndType, getChordNotes, getRandomElement, NOTE_NAMES } = helpers;
            const { root, type } = getChordRootAndType(chordName);
            const chordNotes = getChordNotes(root, type).notes;
            const pitches = chordNotes.map(note => NOTE_NAMES.indexOf(note) + 48);

            sectionChords.push({
                pitch: pitches,
                duration: `T${effectiveDurationTicks}`,
                startTick: startTick + effectiveStartTickInSection,
                velocity: 60 + Math.floor(Math.random() * 10)
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
