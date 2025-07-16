// File: gen/phalbo-title-generator.js
// Generatore di titoli casuali e surreali per CapricEngine.

const phalboForms = [
    'Phalbo', 'el Phalbo', 'Phalbo-san', 'der Phalbo', 'il Phalbo', 'Phalbo.exe', 'Phalbo AI',
    'Capriccio di Phalbo', 'Phalbo in Love', 'Phalbo del Futuro', 'Signor Phalbo', 'Dr. Phalbo',
    'P. Halbo', 'Phalbo & Co.', 'Monsieur Phalbo', 'La mente di Phalbo', 'P_H4L80', 'Phalbo™',
    'Phalbo.midi', 'L’Erranza di Phalbo', 'Zio Phalbo', 'Phalbo Returns', 'Phalbo’s Revenge',
    'The Phalbo Paradox', 'Phalbo Begins', 'Phalbo Again', 'Phalbo!', 'Phalbo?', 'Phalbo…',
    'Phalbo Project', 'Phalbo Experience', 'Phalbo Collective', 'Phalbo vs. The World',
    'Super Phalbo', 'Phalbo 64', 'Phalbo: A Space Odyssey', 'The Last Phalbo', 'Phalbo Rising',
    'Phalbo Unchained', 'Digital Phalbo', 'Phalbo’s Lament', 'Electric Phalbo', 'Phalbo.ROM'
];

const articles = ['The', 'A', 'Il', 'La', 'Un', 'Una', 'Das', 'Der', 'Die', 'Le'];
const adjectives = [
    'Electric', 'Cosmic', 'Digital', 'Lost', 'Forgotten', 'Red', 'Blue', 'Green', 'Silent',
    'Invisible', 'Broken', 'Abstract', 'Surreal', 'Quantum', 'Glitchy', 'Ethereal', 'Subtle',
    'Heavy', 'Light', 'Dark', 'Bright', 'Weird', 'Strange', 'Peculiar', 'Odd', 'Unusual'
];
const nouns = [
    'Dream', 'Machine', 'Void', 'Echo', 'Mirage', 'Ghost', 'Signal', 'Code', 'Data', 'Ritual',
    'Requiem', 'Sonata', 'Nocturne', 'Fugue', 'Glitch', 'System', 'Network', 'Matrix', 'Core'
];
const connectors = ['of', 'in', 'for', 'with', 'without', 'de', 'von', 'pour', 'con', 'senza'];
const suffixes = ['(remix)', '(live)', '(demo)', '.part1', '.part2', '(instrumental)', '(vocal mix)'];

function generatePhalboTitle() {
    if (typeof chance === 'undefined') {
        console.error("chance.js non è stato caricato. Impossibile generare un titolo.");
        return "Phalbo Caprice (Error)";
    }
    const chanceInstance = new Chance();

    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const structures = [
        () => `${getRandom(articles)} ${getRandom(adjectives)} ${getRandom(nouns)} ${getRandom(connectors)} ${getRandom(phalboForms)} ${getRandom(suffixes)}`,
        () => `${getRandom(phalboForms)} ${getRandom(connectors)} ${getRandom(adjectives)} ${getRandom(nouns)}`,
        () => `${getRandom(phalboForms)}: ${chanceInstance.word({ syllables: 3 })} ${getRandom(suffixes)}`,
        () => `${getRandom(articles)} ${getRandom(nouns)} ${getRandom(connectors)} ${getRandom(phalboForms)}`,
        () => `${getRandom(phalboForms)} ${getRandom(connectors)} ${chanceInstance.word()}`,
        () => `${getRandom(phalboForms)}: The ${chanceInstance.animal()} Session`,
        () => `A ${getRandom(nouns)} for ${getRandom(phalboForms)}`,
    ];

    const randomStructure = getRandom(structures);
    let title = randomStructure();

    // Rimuove eventuali caratteri speciali non desiderati, tranne quelli in phalboForms
    title = title.replace(/[^\w\s\.\-™:()]/g, '');

    return title;
}
