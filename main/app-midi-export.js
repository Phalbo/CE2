// File: main/app-midi-export.js - v2.24
// Gestisce l'esportazione MIDI e il salvataggio dei dati testuali.

function buildSongDataForTextFile() {
    if (!currentMidiData) {
        currentSongDataForSave = {title: "Error", content: "No song data available."};
        return;
    }

    const {title, bpm, timeSignatureChanges, sections, fullKeyName} = currentMidiData;
    const mood = document.getElementById('mood').value;
    const styleNote = (typeof MOOD_PROFILES !== 'undefined' && MOOD_PROFILES[mood]) ? MOOD_PROFILES[mood].styleNotes : "Experiment.";
    const TPQN_TEXT = typeof TICKS_PER_QUARTER_NOTE_REFERENCE !== 'undefined' ? TICKS_PER_QUARTER_NOTE_REFERENCE : 128;

    let songDataText = `${title}\n\n`;
    songDataText += `Mood: ${mood.replace(/_/g, ' ')}\n`;
    songDataText += `Key: ${fullKeyName || "N/A"}\n`;
    songDataText += `BPM: ${bpm}\n`;

    if (timeSignatureChanges && timeSignatureChanges.length === 1) {
        songDataText += `Meter: ${timeSignatureChanges[0].ts[0]}/${timeSignatureChanges[0].ts[1]}\n`;
    } else if (timeSignatureChanges && timeSignatureChanges.length > 1) {
        let uniqueTimeSignatures = new Set(timeSignatureChanges.map(tc => `${tc.ts[0]}/${tc.ts[1]}`));
        songDataText += `Meter: Variable (starts ${[...uniqueTimeSignatures].join(', ')})\n`;
    } else {
        songDataText += `Meter: N/A\n`;
    }

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
    songDataText += `Estimated Duration: ${minutes} min ${seconds < 10 ? '0' : ''}${seconds} sec\n`;

    songDataText += `Style Notes: ${styleNote}\n\n`;
    songDataText += `--- SONG STRUCTURE ---\n`;

    sections.forEach(sectionData => {
        songDataText += `\n${sectionData.name.toUpperCase()} (${sectionData.measures} bars in ${sectionData.timeSignature[0]}/${sectionData.timeSignature[1]})\n`;
        if (sectionData.baseChords && sectionData.baseChords.length > 0) {
            songDataText += `Chords: [ ${sectionData.baseChords.join(' | ')} ]\n`;
        }
    });
    currentSongDataForSave = {title: title, content: songDataText};
}

function handleSaveSong() {
    buildSongDataForTextFile();
    if(!currentSongDataForSave || !currentSongDataForSave.content) {
        alert("No song data to save. Please generate a song first.");
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

function downloadSingleTrackMidi(trackName, midiEvents, fileName, bpm, timeSignatureChangesArray, instrumentId = 0, isDrumTrack = false) {
    if (!isDrumTrack && (!midiEvents || midiEvents.length === 0)) {
         alert("No MIDI events generated for this track.");
         return;
    }
    if (typeof MidiWriter === 'undefined') {
        alert("Internal Error: MIDI library not found.");
        return;
    }

    const track = new MidiWriter.Track();
    track.setTempo(bpm, 0);
    track.addTrackName(trackName);

    const actualTimeSignatures = (currentMidiData && currentMidiData.timeSignatureChanges && currentMidiData.timeSignatureChanges.length > 0)
                                 ? currentMidiData.timeSignatureChanges
                                 : (timeSignatureChangesArray && timeSignatureChangesArray.length > 0 ? timeSignatureChangesArray : [{tick: 0, ts: [4,4]}]);

    actualTimeSignatures.forEach(tsEvent => {
        track.addEvent(new MidiWriter.TimeSignatureEvent(tsEvent.ts[0], tsEvent.ts[1]), {tick: Math.round(tsEvent.tick)});
    });

    if (midiEvents && midiEvents.length > 0) {
        midiEvents.forEach(event => {
            if (!event || typeof event.pitch === 'undefined' || !event.duration || typeof event.startTick === 'undefined') return;
            const pitchArray = Array.isArray(event.pitch) ? event.pitch : [event.pitch];
            const durationString = typeof event.duration === 'string' && event.duration.startsWith('T') ? event.duration : `T${Math.round(event.duration)}`;

            const noteEventArgs = {
                pitch: pitchArray.filter(p => p !== null && p >=0 && p <=127),
                duration: durationString,
                startTick: Math.round(event.startTick),
                velocity: event.velocity || (isDrumTrack ? 90 : 70),
                channel: isDrumTrack ? 10 : 1
            };
            if (noteEventArgs.pitch.length === 0) return;

            try {
                track.addEvent(new MidiWriter.NoteEvent(noteEventArgs));
            } catch (e) {
                console.error("Error adding NoteEvent:", e, "Event data:", noteEventArgs);
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

function handleGenerateSingleTrackChordMidi(helpers) {
    if (!currentMidiData || !currentMidiData.sections) { alert("Please generate a song first."); return; }
    const { title, bpm, sections, timeSignatureChanges } = currentMidiData;
    const { getChordNotes, getChordRootAndType, NOTE_NAMES, CHORD_LIB } = helpers;
    const chordMIDIEvents = [];

    sections.forEach(sectionData => {
        if (sectionData.mainChordSlots && sectionData.mainChordSlots.length > 0) {
            let lastChordName = null;
            let lastChordStartTick = 0;
            let lastChordDuration = 0;

            sectionData.mainChordSlots.forEach((slot, index) => {
                if (slot.chordName && slot.effectiveDurationTicks > 0) {
                    if (slot.chordName !== lastChordName) {
                        if (lastChordName) {
                            const chordDefinition = CHORD_LIB[lastChordName] || (typeof getChordNotes === 'function' ? getChordNotes(getChordRootAndType(lastChordName).root, getChordRootAndType(lastChordName).type) : null);
                            if (chordDefinition && chordDefinition.notes && chordDefinition.notes.length > 0) {
                                const midiNoteNumbers = chordDefinition.notes.map(noteName => {
                                    let note = noteName.charAt(0).toUpperCase() + noteName.slice(1);
                                    if (note.length > 1 && (note.charAt(1) === 'b')) { note = note.charAt(0) + 'b'; }
                                    let pitch = NOTE_NAMES.indexOf(note);
                                    if (pitch === -1) {
                                        const sharpMap = {"Db":"C#", "Eb":"D#", "Fb":"E", "Gb":"F#", "Ab":"G#", "Bb":"A#", "Cb":"B"};
                                        pitch = NOTE_NAMES.indexOf(sharpMap[noteName] || noteName);
                                    }
                                    return (pitch !== -1) ? pitch + 48 : null;
                                }).filter(n => n !== null);

                                if (midiNoteNumbers.length > 0) {
                                    chordMIDIEvents.push({
                                        pitch: midiNoteNumbers,
                                        duration: `T${Math.round(lastChordDuration)}`,
                                        startTick: lastChordStartTick,
                                        velocity: 60,
                                    });
                                }
                            }
                        }
                        lastChordName = slot.chordName;
                        lastChordStartTick = sectionData.startTick + slot.effectiveStartTickInSection;
                        lastChordDuration = slot.effectiveDurationTicks;
                    } else {
                        lastChordDuration += slot.effectiveDurationTicks;
                    }
                }

                if (index === sectionData.mainChordSlots.length - 1 && lastChordName) {
                    const chordDefinition = CHORD_LIB[lastChordName] || (typeof getChordNotes === 'function' ? getChordNotes(getChordRootAndType(lastChordName).root, getChordRootAndType(lastChordName).type) : null);
                    if (chordDefinition && chordDefinition.notes && chordDefinition.notes.length > 0) {
                        const midiNoteNumbers = chordDefinition.notes.map(noteName => {
                            let note = noteName.charAt(0).toUpperCase() + noteName.slice(1);
                            if (note.length > 1 && (note.charAt(1) === 'b')) { note = note.charAt(0) + 'b'; }
                            let pitch = NOTE_NAMES.indexOf(note);
                            if (pitch === -1) {
                                const sharpMap = {"Db":"C#", "Eb":"D#", "Fb":"E", "Gb":"F#", "Ab":"G#", "Bb":"A#", "Cb":"B"};
                                pitch = NOTE_NAMES.indexOf(sharpMap[noteName] || noteName);
                            }
                            return (pitch !== -1) ? pitch + 48 : null;
                        }).filter(n => n !== null);

                        if (midiNoteNumbers.length > 0) {
                            chordMIDIEvents.push({
                                pitch: midiNoteNumbers,
                                duration: `T${Math.round(lastChordDuration)}`,
                                startTick: lastChordStartTick,
                                velocity: 60,
                            });
                        }
                    }
                }
            });
            if (lastChordName && chordMIDIEvents.length > 0 && chordMIDIEvents[chordMIDIEvents.length - 1].pitch.join(',') !== getChordNotes(getChordRootAndType(lastChordName).root, getChordRootAndType(lastChordName).type).notes.map(noteName => NOTE_NAMES.indexOf(noteName) + 48).join(',')) {
                const chordDefinition = CHORD_LIB[lastChordName] || (typeof getChordNotes === 'function' ? getChordNotes(getChordRootAndType(lastChordName).root, getChordRootAndType(lastChordName).type) : null);
                if (chordDefinition && chordDefinition.notes && chordDefinition.notes.length > 0) {
                    const midiNoteNumbers = chordDefinition.notes.map(noteName => {
                        let note = noteName.charAt(0).toUpperCase() + noteName.slice(1);
                        if (note.length > 1 && (note.charAt(1) === 'b')) { note = note.charAt(0) + 'b'; }
                        let pitch = NOTE_NAMES.indexOf(note);
                        if (pitch === -1) {
                            const sharpMap = {"Db":"C#", "Eb":"D#", "Fb":"E", "Gb":"F#", "Ab":"G#", "Bb":"A#", "Cb":"B"};
                            pitch = NOTE_NAMES.indexOf(sharpMap[noteName] || noteName);
                        }
                        return (pitch !== -1) ? pitch + 48 : null;
                    }).filter(n => n !== null);

                    if (midiNoteNumbers.length > 0) {
                        chordMIDIEvents.push({
                            pitch: midiNoteNumbers,
                            duration: `T${Math.round(lastChordDuration)}`,
                            startTick: lastChordStartTick,
                            velocity: 60,
                        });
                    }
                }
            });
        }
    });
    const midiFileNameST = `${title.replace(/[^a-zA-Z0-9_]/g, '_')}_Pad.mid`;
    downloadSingleTrackMidi(`Pad for ${title}`, chordMIDIEvents, midiFileNameST, bpm, timeSignatureChanges, 0);
}

function handleGenerateRhythmChords(helpers) {
    if (!currentMidiData || !currentMidiData.sections) { alert("Please generate a song first."); return; }
    if (typeof generateRhythmChordsForSong !== "function") { alert("Internal Error: Rhythm Chords generator not found."); return; }

    const rhythmChordsBtn = document.getElementById('rhythmChordsButton');
    if (rhythmChordsBtn) { rhythmChordsBtn.disabled = true; rhythmChordsBtn.textContent = "Creating Rhythm..."; }

    try {
        const rhythmChordsEvents = generateRhythmChordsForSong(currentMidiData, helpers, sectionCache);

        if (rhythmChordsEvents && rhythmChordsEvents.length > 0) {
            const fileName = `${currentMidiData.title.replace(/[^a-zA-Z0-9_]/g, '_')}_Rhythm_Chords.mid`;
            downloadSingleTrackMidi(`Rhythm Chords for ${currentMidiData.title}`, rhythmChordsEvents, fileName, currentMidiData.bpm, currentMidiData.timeSignatureChanges, 0);
        } else {
            alert("Could not generate rhythm chords with the current data.");
        }
    } catch (e) {
        console.error("Error during rhythm chords generation:", e, e.stack);
        alert("Critical error during rhythm chords generation. Check the console.");
    } finally {
        if (rhythmChordsBtn) { rhythmChordsBtn.disabled = false; rhythmChordsBtn.textContent = "Rhythm Chords"; }
    }
}

function handleGenerateArpeggiator(helpers) {
    if (!currentMidiData || !currentMidiData.sections) { alert("Please generate a song first."); return; }
    if (typeof generateArpeggioEvents !== "function") { alert("Internal Error: Arpeggiator function not found."); return; }

    const arpeggiatorBtn = document.getElementById('arpeggiatorButton');
    if (arpeggiatorBtn) { arpeggiatorBtn.disabled = true; arpeggiatorBtn.textContent = "Creating Arpeggio..."; }

    try {
        let allArpeggioEvents = [];
        const { CHORD_LIB, NOTE_NAMES } = helpers;

        currentMidiData.sections.forEach(section => {
            if (section.mainChordSlots && section.mainChordSlots.length > 0) {
                section.mainChordSlots.forEach(slot => {
                    const slotContext = {
                        chordName: slot.chordName,
                        startTickAbsolute: section.startTick + slot.effectiveStartTickInSection,
                        durationTicks: slot.effectiveDurationTicks,
                        timeSignature: slot.timeSignature
                    };
                    const eventsForThisSlot = generateArpeggioEvents(currentMidiData, CHORD_LIB, NOTE_NAMES, helpers, slotContext, sectionCache);
                    if (eventsForThisSlot) {
                        allArpeggioEvents.push(...eventsForThisSlot);
                    }
                });
            }
        });

        if (allArpeggioEvents.length > 0) {
            const fileName = `${currentMidiData.title.replace(/[^a-zA-Z0-9_]/g, '_')}_Arpeggio.mid`;
            downloadSingleTrackMidi(`Arpeggio for ${currentMidiData.title}`, allArpeggioEvents, fileName, currentMidiData.bpm, currentMidiData.timeSignatureChanges, 0);
        } else {
            alert("Could not generate arpeggio with the current data.");
        }
    } catch (e) {
        console.error("Error during arpeggio generation:", e, e.stack);
        alert("Critical error during arpeggio generation. Check the console.");
    } finally {
        if (arpeggiatorBtn) { arpeggiatorBtn.disabled = false; arpeggiatorBtn.textContent = "Arpeggiator"; }
    }
}

function handleGenerateMelody(helpers) {
    if (!currentMidiData || !currentMidiData.sections || !currentMidiData.mainScaleNotes || currentMidiData.mainScaleNotes.length === 0) {
        alert("Song data is missing. Please generate a full structure first."); return;
    }
    if (typeof generateMelodyForSong !== "function") { alert("Internal Error: Melody generator not found."); return; }
    const { CHORD_LIB, scales, NOTE_NAMES, allNotesWithFlats, getChordNotes, getNoteName, getRandomElement, getChordRootAndType } = helpers;

    const melodyBtn = document.getElementById('generateMelodyButton');
    if(melodyBtn) { melodyBtn.disabled = true; melodyBtn.textContent = "Creating Melody...";}
    try {
        const generatedMelody = generateMelodyForSong(currentMidiData, currentMidiData.mainScaleNotes, currentMidiData.mainScaleRoot, CHORD_LIB, scales, NOTE_NAMES, allNotesWithFlats, getChordNotes, getNoteName, getRandomElement, getChordRootAndType, sectionCache);
        if (generatedMelody && generatedMelody.length > 0) {
            const fileName = `${currentMidiData.title.replace(/[^a-zA-Z0-9_]/g, '_')}_Melody.mid`;
            downloadSingleTrackMidi(`Melody for ${currentMidiData.title}`, generatedMelody, fileName, currentMidiData.bpm, currentMidiData.timeSignatureChanges, 0);
        } else { alert("Could not generate a melody with the current data."); }
    } catch (e) {
        console.error("Critical error during melody generation:", e, e.stack);
        alert("Critical error during melody generation. Check the console.");
    }
    finally { if(melodyBtn){ melodyBtn.disabled = false; melodyBtn.textContent = "Inspiration (Melody)"; } }
}

function handleGenerateVocalLine(helpers) {
    if (!currentMidiData || !currentMidiData.sections || !currentMidiData.mainScaleNotes || currentMidiData.mainScaleNotes.length === 0) {
        alert("Song data is missing. Please generate a full structure first."); return;
    }
    if (typeof generateVocalLineForSong !== "function") { alert("Internal Error: Vocal generator not found."); return; }
    const { CHORD_LIB, scales, NOTE_NAMES, allNotesWithFlats, getChordNotes, getNoteName, getRandomElement, getChordRootAndType } = helpers;

    const vocalBtn = document.getElementById('generateVocalLineButton');
    if (vocalBtn) { vocalBtn.disabled = true; vocalBtn.textContent = "Creating Vocal Line..."; }
    try {
        const options = { globalRandomActivationProbability: 0.6 };
        const vocalLine = generateVocalLineForSong(currentMidiData, currentMidiData.mainScaleNotes, currentMidiData.mainScaleRoot, CHORD_LIB, scales, NOTE_NAMES, allNotesWithFlats, getChordNotes, getNoteName, getRandomElement, getChordRootAndType, options, sectionCache);
        if (vocalLine && vocalLine.length > 0) {
            const fileName = `${currentMidiData.title.replace(/[^a-zA-Z0-9_]/g, '_')}_Vocal.mid`;
            downloadSingleTrackMidi(`Vocal for ${currentMidiData.title}`, vocalLine, fileName, currentMidiData.bpm, currentMidiData.timeSignatureChanges, 0);
        } else { alert("Could not generate a vocal line with the current data."); }
    } catch (e) {
        console.error("Error during vocal line generation:", e, e.stack);
        alert("Critical error during vocal line generation. Check the console.");
    }
    finally { if (vocalBtn) { vocalBtn.disabled = false; vocalBtn.textContent = "Vocal Shame Machine"; } }
}

function handleGenerateBassLine(helpers) {
    if (!currentMidiData || !currentMidiData.sections || !currentMidiData.mainScaleNotes || currentMidiData.mainScaleNotes.length === 0) {
        alert("Song data is missing. Please generate a full structure first."); return;
    }
    if (typeof generateBassLineForSong !== "function") { alert("Internal Error: Bass generator not found."); return; }

    const bassBtn = document.getElementById('generateBassLineButton');
    if (bassBtn) { bassBtn.disabled = true; bassBtn.textContent = "Creating Bass Line..."; }
    try {
        const bassLine = generateBassLineForSong(currentMidiData, helpers, sectionCache);
        if (bassLine && bassLine.length > 0) {
            const fileName = `${currentMidiData.title.replace(/[^a-zA-Z0-9_]/g, '_')}_Bass.mid`;
            downloadSingleTrackMidi(`Bass for ${currentMidiData.title}`, bassLine, fileName, currentMidiData.bpm, currentMidiData.timeSignatureChanges, 0);
        } else { alert("Could not generate a bass line with the current data."); }
    } catch (e) {
        console.error("Error during bass line generation:", e, e.stack);
        alert("Critical error during bass line generation. Check the console.");
    }
    finally { if (bassBtn) { bassBtn.disabled = false; bassBtn.textContent = "Deekonizer (bass)"; } }
}

function handleGenerateDrumTrack(helpers) {
    if (!currentMidiData || !currentMidiData.sections || currentMidiData.sections.length === 0 || !currentMidiData.bpm || !currentMidiData.timeSignatureChanges) {
        alert("Song data is missing. Please generate a full structure first."); return;
    }
    if (typeof generateDrumTrackForSong !== "function") { alert("Internal Error: Drum generator not found."); return; }
    const { CHORD_LIB, NOTE_NAMES, getRandomElement } = helpers;

    const drumBtn = document.getElementById('generateDrumTrackButton');
    if (drumBtn) { drumBtn.disabled = true; drumBtn.textContent = "Creating Drum Track..."; }

    try {
        const drumTrackOptions = { globalRandomActivationProbability: 0.6, fillFrequency: 0.25 };
        const drumEvents = generateDrumTrackForSong(currentMidiData, currentMidiData.bpm, null, currentMidiData.sections, CHORD_LIB, NOTE_NAMES, getRandomElement, drumTrackOptions, sectionCache);
        if (drumEvents && drumEvents.length > 0) {
            const fileName = `${currentMidiData.title.replace(/[^a-zA-Z0-9_]/g, '_')}_Drums.mid`;
            downloadSingleTrackMidi(`Drums for ${currentMidiData.title}`, drumEvents, fileName, currentMidiData.bpm, currentMidiData.timeSignatureChanges, 0, true);
        } else { alert("Could not generate a drum track with the current data."); }
    } catch (e) {
        console.error("Error during drum track generation:", e, e.stack);
        alert("Critical error during drum track generation: " + e.message);
    }
    finally { if (drumBtn) { drumBtn.disabled = false; drumBtn.textContent = "LingoStarr (drum)"; } }
}
