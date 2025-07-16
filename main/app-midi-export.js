// File: main/app-midi-export.js - v1.34
// Gestisce l'esportazione MIDI e il salvataggio dei dati testuali.
// Modificato per utilizzare detailedHarmonicEvents e per la new logica dei pulsanti.
// Aggiunta rimozione sovrapposizioni in handleGenerateChordRhythm.

/**
 * Costruisce la stringa di testo con i dettagli della canzone per il salvataggio.
 * Popola la variabile globale currentSongDataForSave.
 */
function buildSongDataForTextFile() {
    if (!currentMidiData) {
        currentSongDataForSave = {title: "Error", content: "No song data available."};
        return;
    }

    const {title, bpm, timeSignatureChanges, sections, keySignatureRoot, keyModeName, fullKeyName, capriceNum} = currentMidiData;
    const mood = document.getElementById('mood').value;
    const styleNote = (typeof moodToStyleNotes !== 'undefined' && moodToStyleNotes[mood]) ? moodToStyleNotes[mood] : "Experiment.";
    // Assicurati che TICKS_PER_QUARTER_NOTE_REFERENCE sia disponibile globalmente
    const TPQN_TEXT = typeof TICKS_PER_QUARTER_NOTE_REFERENCE !== 'undefined' ? TICKS_PER_QUARTER_NOTE_REFERENCE : 128;


    let songDataText = `${title}\nMood: ${mood.replace(/_/g, ' ')}\nKey: ${fullKeyName || (keySignatureRoot + " " + keyModeName)}\nBPM: ${bpm}\n`;

    if (timeSignatureChanges && timeSignatureChanges.length === 1) {
        songDataText += `Meter: ${timeSignatureChanges[0].ts[0]}/${timeSignatureChanges[0].ts[1]}\n`;
    } else if (timeSignatureChanges && timeSignatureChanges.length > 1) {
        let uniqueTimeSignatures = new Set(timeSignatureChanges.map(tc => `${tc.ts[0]}/${tc.ts[1]}`));
        if (uniqueTimeSignatures.size > 1) {
            songDataText += `Meter: Variable (starts ${timeSignatureChanges[0].ts[0]}/${timeSignatureChanges[0].ts[1]})\n`;
        } else {
            songDataText += `Meter: ${timeSignatureChanges[0].ts[0]}/${timeSignatureChanges[0].ts[1]}\n`;
        }
    } else {
        songDataText += `Meter: N/A\n`;
    }
    songDataText += `Style Notes: ${styleNote}\n`;

    let estimatedTotalSeconds = 0;
    sections.forEach(section => {
        const sectionTS = section.timeSignature;
        const beatsPerMeasureInSection = sectionTS[0];
        const beatUnitValueInSection = sectionTS[1];
        const ticksPerBeatForThisSectionCalc = (4 / beatUnitValueInSection) * TPQN_TEXT;
        const sectionDurationTicks = section.measures * beatsPerMeasureInSection * ticksPerBeatForThisSectionCalc;
        estimatedTotalSeconds += (sectionDurationTicks / TPQN_TEXT) * (60 / bpm);
    });
    const minutes = Math.floor(estimatedTotalSeconds / 60);
    const seconds = Math.round(estimatedTotalSeconds % 60);
    songDataText += `Estimated Total Duration: ${minutes} min ${seconds < 10 ? '0' : ''}${seconds} sec\n\n`;

    songDataText += `STRUCTURE AND CHORDS:\n`;

    sections.forEach(sectionData => {
        songDataText += `\n--- ${sectionData.name.toUpperCase()} (${sectionData.measures} bars in ${sectionData.timeSignature[0]}/${sectionData.timeSignature[1]}) ---\n`;

        if (sectionData.baseChords && sectionData.baseChords.length > 0) {
            songDataText += `Chords: [ ${sectionData.baseChords.join(' | ')} ]\n`;
        } else {
            songDataText += `Chords: (None/Silence)\n`;
        }
    });
    currentSongDataForSave = {title: title, content: songDataText};
}


/**
 * Gestisce il salvataggio dei dettagli della canzone in un file di testo.
 */
function handleSaveSong() {
    buildSongDataForTextFile();
    if(!currentSongDataForSave || !currentSongDataForSave.content) {
        console.warn("Nessun dato della canzone da salvare.");
        alert("Nessun dato della canzone da salvare. Genera prima una canzone.");
        return;
    }
    const blob = new Blob([currentSongDataForSave.content],{type:'text/plain;charset=utf-8'});
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href',url);
    const fileName = (currentSongDataForSave.title || "Phalbo_Caprice").replace(/[^\w\s.-]/gi,'_').replace(/\s+/g,'_') + '.txt';
    link.setAttribute('download',fileName);
    link.style.visibility='hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Funzione generica per scaricare una singola traccia MIDI (Tipo 0).
 */
function downloadSingleTrackMidi(trackName, midiEvents, fileName, bpm, timeSignatureChangesArray, instrumentId = 0, isDrumTrack = false) {
    if (!isDrumTrack && (!midiEvents || midiEvents.length === 0)) {
         alert("Nessun evento MIDI generato per questa traccia.");
         return;
    }
    if (typeof MidiWriter === 'undefined') {
        console.error("Libreria MidiWriter.js non trovata.");
        alert("Errore interno: libreria MIDI mancante.");
        return;
    }

    const track = new MidiWriter.Track();
    track.setTempo(bpm, 0);
    track.addTrackName(trackName);

    // Usa i timeSignatureChanges globali da currentMidiData se disponibili e corretti
    const actualTimeSignatures = (currentMidiData && currentMidiData.timeSignatureChanges && currentMidiData.timeSignatureChanges.length > 0)
                                 ? currentMidiData.timeSignatureChanges
                                 : (timeSignatureChangesArray && timeSignatureChangesArray.length > 0 ? timeSignatureChangesArray : [{tick: 0, ts: [4,4]}]);

    actualTimeSignatures.forEach(tsEvent => {
        track.addEvent(new MidiWriter.TimeSignatureEvent(tsEvent.ts[0], tsEvent.ts[1]), {tick: Math.round(tsEvent.tick)});
    });


    if (midiEvents && midiEvents.length > 0) {
        midiEvents.forEach(event => {
            if (!event || typeof event.pitch === 'undefined' || !event.duration || typeof event.startTick === 'undefined') {
                return;
            }
            const pitchArray = Array.isArray(event.pitch) ? event.pitch : [event.pitch];
            // Assicurati che la durata sia nel formato corretto per MidiWriter (es. "T128", non solo numero)
            const durationString = typeof event.duration === 'string' && event.duration.startsWith('T') ? event.duration : `T${Math.round(event.duration)}`;

            const noteEventArgs = {
                pitch: pitchArray.filter(p => p !== null && p >=0 && p <=127), // Filtra note MIDI valide
                duration: durationString,
                startTick: Math.round(event.startTick),
                velocity: event.velocity || (isDrumTrack ? 90 : 70),
                channel: isDrumTrack ? 10 : 1
            };
            if (noteEventArgs.pitch.length === 0) return; // Salta se non ci sono note valide dopo il filtro

            try {
                track.addEvent(new MidiWriter.NoteEvent(noteEventArgs));
            } catch (e) {
                console.error("Errore durante l'aggiunta di NoteEvent:", e, "Dati evento:", noteEventArgs);
            }
        });
    }

    const writer = new MidiWriter.Writer([track]);
    const dataUri = writer.dataUri();
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = fileName.replace(/[^\w\s.-]/gi,'_').replace(/\s+/g,'_');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


/**
 * Gestisce la generazione e il download del MIDI degli accordi "PAD" (sostenuti) su traccia singola.
 * Usa `mainChordSlots` per creare accordi lunghi e stabili.
 */
function handleGenerateSingleTrackChordMidi() {
    if (!currentMidiData || !currentMidiData.sections) { alert("Genera prima una canzone."); return; }
    if (typeof TICKS_PER_QUARTER_NOTE_REFERENCE === 'undefined') { console.error("TICKS_PER_QUARTER_NOTE_REFERENCE non definito!"); return; }

    const { title, bpm, sections, capriceNum, timeSignatureChanges } = currentMidiData;
    const chordMIDIEvents = [];

    sections.forEach(sectionData => {
        if (sectionData.mainChordSlots && sectionData.mainChordSlots.length > 0) {
            sectionData.mainChordSlots.forEach(slot => {
                if (slot.chordName && slot.effectiveDurationTicks > 0) {
                    const chordDefinition = CHORD_LIB[slot.chordName] || (typeof getChordNotes === 'function' ? getChordNotes(getChordRootAndType(slot.chordName).root, getChordRootAndType(slot.chordName).type) : null);

                    if (chordDefinition && chordDefinition.notes && chordDefinition.notes.length > 0) {
                        const midiNoteNumbers = chordDefinition.notes.map(noteName => {
                            let note = noteName.charAt(0).toUpperCase() + noteName.slice(1);
                            if (note.length > 1 && (note.charAt(1) === 'b')) { note = note.charAt(0) + 'b'; }
                            let pitch = NOTE_NAMES.indexOf(note);
                            if (pitch === -1) {
                                const sharpMap = {"Db":"C#", "Eb":"D#", "Fb":"E", "Gb":"F#", "Ab":"G#", "Bb":"A#", "Cb":"B"};
                                const mappedNote = sharpMap[noteName];
                                if (mappedNote) pitch = NOTE_NAMES.indexOf(mappedNote);
                                else pitch = NOTE_NAMES.indexOf(noteName);
                            }
                            return (pitch !== -1) ? pitch + 48 : null;
                        }).filter(n => n !== null);

                        if (midiNoteNumbers.length > 0) {
                            chordMIDIEvents.push({
                                pitch: midiNoteNumbers,
                                duration: `T${Math.round(slot.effectiveDurationTicks)}`,
                                startTick: sectionData.startTick + slot.effectiveStartTickInSection,
                                velocity: 60,
                            });
                        }
                    }
                }
            });
        }
    });
    const midiFileNameST = `Phalbo_Caprice_n${capriceNum}_Chords_Pad.mid`;
    downloadSingleTrackMidi(`${title} - Chords (Pad)`, chordMIDIEvents, midiFileNameST, bpm, timeSignatureChanges, 0);
}

/**
 * Handler per generare e scaricare gli accordi con ritmo.
 * Chiama il nuovo generatore di arpeggi semplici per ogni mainChordSlot.
 */
function handleGenerateChordRhythm() {
    if (!currentMidiData || !currentMidiData.sections) { alert("Genera prima una canzone."); return; }
    if (typeof generateChordRhythmEvents !== "function") {
        alert("Errore interno: Funzione generateChordRhythmEvents non trovata.");
        return;
    }
    if (typeof TICKS_PER_QUARTER_NOTE_REFERENCE === 'undefined') { console.error("TICKS_PER_QUARTER_NOTE_REFERENCE non definito!"); return; }


    const chordRhythmBtn = document.getElementById('generateChordRhythmButton');
    if (chordRhythmBtn) { chordRhythmBtn.disabled = true; chordRhythmBtn.textContent = "Creating Arpeggio..."; }

    try {
        let allRhythmicChordEvents = [];
        const helpers = {
            getRandomElement: (typeof getRandomElement === 'function' ? getRandomElement : () => null),
            getChordNotes: (typeof getChordNotes === 'function' ? getChordNotes : () => ({notes:[], qualityName:''})),
            getChordRootAndType: (typeof getChordRootAndType === 'function' ? getChordRootAndType : () => ({root:null, type:''})),
            getWeightedRandom: (typeof getWeightedRandom === 'function' ? getWeightedRandom : () => null)
        };

        currentMidiData.sections.forEach(section => {
            if (section.mainChordSlots && section.mainChordSlots.length > 0) {
                section.mainChordSlots.forEach(slot => {
                    const slotContext = {
                        chordName: slot.chordName,
                        startTickAbsolute: section.startTick + slot.effectiveStartTickInSection,
                        durationTicks: slot.effectiveDurationTicks,
                        timeSignature: slot.timeSignature
                    };
                    const eventsForThisSlot = generateChordRhythmEvents(
                        currentMidiData,
                        CHORD_LIB,
                        NOTE_NAMES,
                        helpers,
                        slotContext
                    );
                    if (eventsForThisSlot) {
                        allRhythmicChordEvents.push(...eventsForThisSlot);
                    }
                });
            }
        });

        if (allRhythmicChordEvents && allRhythmicChordEvents.length > 0) {

            const fileName = `${currentMidiData.title.replace(/[^a-zA-Z0-9_]/g, '_')}_Arpeggio.mid`;
            downloadSingleTrackMidi(
                `Arpeggio for ${currentMidiData.title}`,

                allRhythmicChordEvents,
                fileName,
                currentMidiData.bpm,
                currentMidiData.timeSignatureChanges,
                0
            );
        } else {
            alert("Could not generate arpeggio with the current data.");
        }
    } catch (e) {
        console.error("Error during arpeggio generation:", e, e.stack);
        alert("Critical error during arpeggio generation. Check the console.");
    } finally {
        if (chordRhythmBtn) { chordRhythmBtn.disabled = false; chordRhythmBtn.textContent = "Arpeggiator"; }
    }
}


function handleGenerateMelody() {
    if (!currentMidiData || !currentMidiData.sections || !currentMidiData.mainScaleNotes || currentMidiData.mainScaleNotes.length === 0) {
        alert("Dati canzone, sezioni o scala principale mancanti. Genera prima una struttura completa."); return;
    }
    if (typeof generateMelodyForSong !== "function") { alert("Errore interno: Funzione melodia (generateMelodyForSong) non trovata."); return; }
    if (typeof TICKS_PER_QUARTER_NOTE_REFERENCE === 'undefined') { console.error("TICKS_PER_QUARTER_NOTE_REFERENCE non definito!"); return; }

    const melodyBtn = document.getElementById('generateMelodyButton');
    if(melodyBtn) { melodyBtn.disabled = true; melodyBtn.textContent = "Creating Fake Insp...";}
    try {
        const generatedMelody = generateMelodyForSong(
            currentMidiData, currentMidiData.mainScaleNotes, currentMidiData.mainScaleRoot,
            CHORD_LIB, scales, NOTE_NAMES, allNotesWithFlats,
            getChordNotes, getNoteName, getRandomElement, getChordRootAndType,
            sectionCache
        );
        if (generatedMelody && generatedMelody.length > 0) {
            const melodyFileName = `Phalbo_Caprice_melody_n${currentMidiData.capriceNum || 'X'}.mid`;
            downloadSingleTrackMidi(
                `Melody for ${currentMidiData.displayTitle}`, generatedMelody, melodyFileName,
                currentMidiData.bpm, currentMidiData.timeSignatureChanges, 0
            );
        } else { alert("Impossibile generare 'Fake Inspiration' con i dati attuali. Riprova o cambia parametri."); }
    } catch (e) {
        console.error("Errore critico durante l'esecuzione di generateMelodyForSong:", e, e.stack);
        alert("Errore critico durante la generazione di 'Fake Inspiration'. Controlla la console.");
    }
    finally { if(melodyBtn){ melodyBtn.disabled = false; melodyBtn.textContent = "don't click again!"; } }
}

function handleGenerateVocalLine() {
    if (!currentMidiData || !currentMidiData.sections || !currentMidiData.mainScaleNotes || currentMidiData.mainScaleNotes.length === 0) {
        alert("Dati canzone, sezioni o scala principale mancanti. Genera prima una struttura completa."); return;
    }
    if (typeof generateVocalLineForSong !== "function") { alert("Errore interno: Funzione generateVocalLineForSong non trovata."); return; }
    if (typeof TICKS_PER_QUARTER_NOTE_REFERENCE === 'undefined') { console.error("TICKS_PER_QUARTER_NOTE_REFERENCE non definito!"); return; }

    const vocalBtn = document.getElementById('generateVocalLineButton');
    if (vocalBtn) { vocalBtn.disabled = true; vocalBtn.textContent = "Creating Vocal Line..."; }
    try {
        const options = { globalRandomActivationProbability: 0.6 };
        const vocalLine = generateVocalLineForSong(
            currentMidiData, currentMidiData.mainScaleNotes, currentMidiData.mainScaleRoot,
            CHORD_LIB, scales, NOTE_NAMES, allNotesWithFlats,
            getChordNotes, getNoteName, getRandomElement, getChordRootAndType,
            options,
            sectionCache
        );
        if (vocalLine && vocalLine.length > 0) {
            const fileName = `Phalbo_Caprice_vocal_n${currentMidiData.capriceNum || 'X'}.mid`;
            downloadSingleTrackMidi(
                `Vocal for ${currentMidiData.displayTitle}`, vocalLine, fileName,
                currentMidiData.bpm, currentMidiData.timeSignatureChanges, 0
            );
        } else { alert("Impossibile generare una linea vocale con i dati attuali."); }
    } catch (e) {
        console.error("Errore durante la generazione della linea vocale:", e, e.stack);
        alert("Errore critico durante la generazione della linea vocale. Controlla la console.");
    }
    finally { if (vocalBtn) { vocalBtn.disabled = false; vocalBtn.textContent = "Vocal Shame Machine"; } }
}

function getScaleNotes(root, scale) {
    // Simple implementation for the context of this file
    const scaleData = scales[scale];
    if (!scaleData) return [];
    const rootIndex = NOTE_NAMES.indexOf(root);
    if (rootIndex === -1) return [];
    return scaleData.intervals.map(interval => NOTE_NAMES[(rootIndex + interval) % 12]);
}

function handleGenerateBassLine() {
    if (!currentMidiData || !currentMidiData.sections || !currentMidiData.mainScaleNotes || currentMidiData.mainScaleNotes.length === 0) {
        alert("Dati canzone, sezioni o scala principale mancanti. Genera prima una struttura completa."); return;
    }
    if (typeof generateBassLineForSong !== "function") { alert("Errore interno: Funzione generateBassLineForSong non trovata."); return; }
    if (typeof TICKS_PER_QUARTER_NOTE_REFERENCE === 'undefined') { console.error("TICKS_PER_QUARTER_NOTE_REFERENCE non definito!"); return; }


    const bassBtn = document.getElementById('generateBassLineButton');
    if (bassBtn) { bassBtn.disabled = true; bassBtn.textContent = "Creating Bass Line..."; }
    try {
        const helpers = {
            getChordRootAndType,
            getChordNotes,
            getScaleNotes,
            getRandomElement,
            getDiatonicChords,
            NOTE_NAMES
        };
        const bassLine = generateBassLineForSong(currentMidiData, helpers, sectionCache);
        if (bassLine && bassLine.length > 0) {
            const fileName = `Phalbo_Caprice_bass_n${currentMidiData.capriceNum || 'X'}.mid`;
            downloadSingleTrackMidi(
                `Bass for ${currentMidiData.displayTitle}`, bassLine, fileName,
                currentMidiData.bpm, currentMidiData.timeSignatureChanges, 0
            );
        } else { alert("Impossibile generare una linea di basso con i dati attuali."); }
    } catch (e) {
        console.error("Errore durante la generazione della linea di basso:", e, e.stack);
        alert("Errore critico durante la generazione della linea di basso. Controlla la console.");
    }
    finally { if (bassBtn) { bassBtn.disabled = false; bassBtn.textContent = "Deekonizer (bass)"; } }
}

function handleGenerateDrumTrack() {
    if (!currentMidiData || !currentMidiData.sections || currentMidiData.sections.length === 0 ||
        !currentMidiData.bpm || !currentMidiData.timeSignatureChanges || currentMidiData.timeSignatureChanges.length === 0 ) {
        alert("Dati canzone (BPM, cambi di time signature, sezioni) mancanti. Genera prima una struttura completa."); return;
    }
    if (typeof generateDrumTrackForSong !== "function") { alert("Errore interno: Funzione generateDrumTrackForSong non trovata."); return; }
    if (typeof TICKS_PER_QUARTER_NOTE_REFERENCE === 'undefined') { console.error("TICKS_PER_QUARTER_NOTE_REFERENCE non definito!"); return; }


    const drumBtn = document.getElementById('generateDrumTrackButton');
    if (drumBtn) { drumBtn.disabled = true; drumBtn.textContent = "Creating Drum Track..."; }

    try {
        const drumTrackOptions = { globalRandomActivationProbability: 0.6, fillFrequency: 0.25 };
        const drumEvents = generateDrumTrackForSong(
            currentMidiData, currentMidiData.bpm, null, currentMidiData.sections,
            CHORD_LIB, NOTE_NAMES, getRandomElement, drumTrackOptions,
            sectionCache
        );
        if (drumEvents && drumEvents.length > 0) {
            const fileName = `Phalbo_Caprice_drums_n${currentMidiData.capriceNum || 'X'}.mid`;
            downloadSingleTrackMidi(
                `Drums for ${currentMidiData.displayTitle}`, drumEvents, fileName,
                currentMidiData.bpm, currentMidiData.timeSignatureChanges, 0, true
            );
        } else { alert("Impossibile generare una traccia di batteria con i dati attuali."); }
    } catch (e) {
        console.error("Errore durante la generazione della traccia di batteria:", e, e.stack);
        alert("Errore critico durante la generazione della traccia di batteria. Controlla la console: " + e.message);
    }
    finally { if (drumBtn) { drumBtn.disabled = false; drumBtn.textContent = "LingoStarr (drum)"; } }
}
