
// File: app-setup.js - v1.34
// Responsabile dell'impostazione iniziale, creazione UI dinamica, listeners principali.

let currentSongDataForSave = null;
let glossaryChordData = {};
let CHORD_LIB = {};
let currentMidiData = null; // Dati della canzone attualmente generata
let sectionCache = {}; // Cache per le progressioni e altri dati delle sezioni
let midiSectionTitleElement = null; // Elemento H3 per il titolo della sezione download MIDI


document.addEventListener('DOMContentLoaded', () => {
    const generateButton = document.getElementById('generateButton');
    const songOutputDiv = document.getElementById('songOutput');
    const songOutputContainer = document.getElementById('song-output-container');
  const keySelectionDropdown = document.getElementById('keySelection');
    const structureDropdown = document.getElementById('songStructure');

    // --- Creazione dinamica dei pulsanti di azione ---
    const actionButtonsContainer = document.createElement('div');
    actionButtonsContainer.id = 'actionButtonsContainer';
    actionButtonsContainer.className = 'action-buttons-container';

    const saveSongButton = document.createElement('button');
    saveSongButton.id = 'saveSongButton'; saveSongButton.textContent = 'Save Details';
    saveSongButton.style.display = 'none'; saveSongButton.type = 'button';
    actionButtonsContainer.appendChild(saveSongButton);

    const downloadSingleTrackChordMidiButton = document.createElement('button');
    downloadSingleTrackChordMidiButton.id = 'downloadSingleTrackChordMidiButton';
    downloadSingleTrackChordMidiButton.textContent = 'Chord Pad';
    downloadSingleTrackChordMidiButton.style.display = 'none'; downloadSingleTrackChordMidiButton.type = 'button';
    actionButtonsContainer.appendChild(downloadSingleTrackChordMidiButton);

    const rhythmChordsButton = document.createElement('button');
    rhythmChordsButton.id = 'rhythmChordsButton';
    rhythmChordsButton.textContent = 'Rhythm Chords';
    rhythmChordsButton.style.display = 'none'; rhythmChordsButton.type = 'button';
    actionButtonsContainer.appendChild(rhythmChordsButton);

    const arpeggiatorButton = document.createElement('button');
    arpeggiatorButton.id = 'arpeggiatorButton';
    arpeggiatorButton.textContent = 'Arpeggiator';
    arpeggiatorButton.style.display = 'none'; arpeggiatorButton.type = 'button';
    actionButtonsContainer.appendChild(arpeggiatorButton);

    // Rimuovi esplicitamente il vecchio pulsante "Chords (multitrack)" se esistesse nel DOM
    // Questo previene che un vecchio elemento HTML interferisca.
    const oldMultiTrackButton = document.getElementById('downloadMidiButton');
    if (oldMultiTrackButton && oldMultiTrackButton.parentNode) {
        oldMultiTrackButton.parentNode.removeChild(oldMultiTrackButton);
    }


    const generateMelodyButton = document.createElement('button');
    generateMelodyButton.id = 'generateMelodyButton';
    generateMelodyButton.textContent = 'Inspiration (Melody)';
    generateMelodyButton.style.display = 'none'; generateMelodyButton.type = 'button';
    actionButtonsContainer.appendChild(generateMelodyButton);

    const generateVocalLineButton = document.createElement('button');
    generateVocalLineButton.id = 'generateVocalLineButton';
    generateVocalLineButton.textContent = 'Vocal line Generator';
    generateVocalLineButton.style.display = 'none'; generateVocalLineButton.type = 'button';
    actionButtonsContainer.appendChild(generateVocalLineButton);

    const generateBassLineButton = document.createElement('button');
    generateBassLineButton.id = 'generateBassLineButton';
    generateBassLineButton.textContent = 'Deekonizer (bass)';
    generateBassLineButton.style.display = 'none'; generateBassLineButton.type = 'button';
    actionButtonsContainer.appendChild(generateBassLineButton);

    const generateDrumTrackButton = document.createElement('button');
    generateDrumTrackButton.id = 'generateDrumTrackButton';
    generateDrumTrackButton.textContent = 'LingoStarr (drum)';
    generateDrumTrackButton.style.display = 'none'; generateDrumTrackButton.type = 'button';
    actionButtonsContainer.appendChild(generateDrumTrackButton);

    // Inserimento dei pulsanti nel DOM
    if (songOutputContainer) {
        if (!midiSectionTitleElement) {
            midiSectionTitleElement = document.createElement('h3');
            midiSectionTitleElement.id = 'midiDownloadTitle';
            midiSectionTitleElement.className = 'chord-glossary-title';
            midiSectionTitleElement.textContent = 'Download your global hit in MIDI format';
            midiSectionTitleElement.style.display = 'none';
            midiSectionTitleElement.style.marginTop = '30px';
            songOutputContainer.insertBefore(midiSectionTitleElement, songOutputDiv.nextSibling);
        }
        songOutputContainer.insertBefore(actionButtonsContainer, midiSectionTitleElement.nextSibling);

    } else if (songOutputDiv && songOutputDiv.parentNode) {
        songOutputDiv.parentNode.insertBefore(actionButtonsContainer, songOutputDiv.nextSibling);
    } else {
        document.body.appendChild(actionButtonsContainer);
    }

    // --- Popolamento dropdown tonalità ---
   if (keySelectionDropdown && typeof possibleKeysAndModes !== 'undefined' && possibleKeysAndModes.length > 0) {
        possibleKeysAndModes.forEach(keyInfoLoop => {
            const option = document.createElement('option');
            option.value = `${keyInfoLoop.root}_${keyInfoLoop.mode}`;
            option.textContent = keyInfoLoop.name;
            keySelectionDropdown.appendChild(option);
        });
        const randomOption = keySelectionDropdown.querySelector('option[value="random"]');
        if (randomOption) randomOption.textContent = "Random";
    }


    const moodDropdown = document.getElementById('mood');

    const populateStructures = (mood = null) => {
        structureDropdown.innerHTML = '<option value="random" selected>Random (based on Mood)</option>'; // Pulisce e aggiunge l'opzione random

        let templates = SONG_STRUCTURE_TEMPLATES;
        if (mood) {
            templates = SONG_STRUCTURE_TEMPLATES.filter(t => t.mood === mood);

        }


        templates.forEach(template => {
            const opt = document.createElement('option');
            opt.value = template.id;
            opt.textContent = template.name;
            structureDropdown.appendChild(opt);
        });
    };

    if (typeof loadSongStructures === 'function') {
        loadSongStructures().then(() => {
            populateStructures(moodDropdown.value); // Popola inizialmente con il mood selezionato
        }).catch(() => {
            console.error("Could not load structures for dropdown.");
        });

    }


    moodDropdown.addEventListener('change', (event) => {
        populateStructures(event.target.value);
    });

    // --- Inizializzazione libreria accordi ---
    if (typeof buildChordLibrary === "function") {
        CHORD_LIB = buildChordLibrary();
    } else {
        console.error("buildChordLibrary function not found! Chord functionalities will be limited.");
    }

    const helpers = {
        getRandomElement,
        getNoteName,
        getChordRootAndType,
        getChordNotes,
        getScaleNotesText,
        getDiatonicChords,
        colorizeChord,
        generateSectionMeasures,
        generateBPM,
        getInversionNotes,
        getWeightedRandom,
        NOTE_NAMES,
        allNotesWithFlats,
        scales,
        CHORD_LIB
    };

    // --- Event Listener principale ---
    if (generateButton) {
        if (typeof generateSongArchitecture === "function") {
            generateButton.addEventListener('click', () => generateSongArchitecture(helpers));
        } else {
            console.error("generateSongArchitecture function not found! Generation will not work.");
            generateButton.disabled = true;
            generateButton.textContent = 'Error: Setup Incomplete';
        }
    }

    // Definisci attachActionListenersGlobal per essere chiamata dopo la generazione della UI
    window.attachActionListenersGlobal = function() {
        const saveBtn = document.getElementById('saveSongButton');
        if (saveBtn && typeof handleSaveSong === "function") {
            saveBtn.onclick = () => handleSaveSong();
        }

        const singleTrackChordBtn = document.getElementById('downloadSingleTrackChordMidiButton');
        if (singleTrackChordBtn && typeof handleGenerateSingleTrackChordMidi === "function") {
            singleTrackChordBtn.onclick = () => handleGenerateSingleTrackChordMidi(helpers);
        }

        const rhythmChordsBtn = document.getElementById('rhythmChordsButton');
        if (rhythmChordsBtn && typeof handleGenerateRhythmChords === "function") {
            rhythmChordsBtn.onclick = () => handleGenerateRhythmChords(helpers);
        }

        // Listener per il nuovo pulsante "Arpeggiator"
        const arpeggiatorBtn = document.getElementById('arpeggiatorButton'); // Usa il nuovo ID
        if (arpeggiatorBtn && typeof handleGenerateArpeggiator === "function") {
            arpeggiatorBtn.onclick = () => handleGenerateArpeggiator(helpers);
        } else if(arpeggiatorBtn) {
            console.warn("handleGenerateArpeggiator function not found for 'Arpeggiator' button.");
        }

        const melodyBtn = document.getElementById('generateMelodyButton');
        if (melodyBtn && typeof handleGenerateMelody === "function") {
            melodyBtn.onclick = () => handleGenerateMelody(helpers);
        }

        const vocalBtn = document.getElementById('generateVocalLineButton');
        if (vocalBtn && typeof handleGenerateVocalLine === "function") {
            vocalBtn.onclick = () => handleGenerateVocalLine(helpers);
        }

        const bassBtn = document.getElementById('generateBassLineButton');
        if (bassBtn && typeof handleGenerateBassLine === "function") {
            bassBtn.onclick = () => handleGenerateBassLine(helpers);
        }

        const drumBtn = document.getElementById('generateDrumTrackButton');
        if (drumBtn && typeof handleGenerateDrumTrack === "function") {
            drumBtn.onclick = () => handleGenerateDrumTrack(helpers);
        }

        document.querySelectorAll('.shape-select').forEach(selectElement => {
            const newSelect = selectElement.cloneNode(true);
            selectElement.parentNode.replaceChild(newSelect, selectElement);
            if (typeof handleShapeChange === "function") { // handleShapeChange è in app-ui-render.js
                newSelect.addEventListener('change', (event) => handleShapeChange(event, helpers));
            }
        });
    };
});

