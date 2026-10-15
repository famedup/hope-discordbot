/* ⌁ crafted by cashholy (carti) ⌁ */

const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'media', 'pfps');

const FILE_MAP = {
    female: 'female.json',
    male:   'males.json',
    anime:  'anime.json',
    random: 'random.json'
};

const cache = {};

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function loadCategory(category) {
    if (cache[category]) return cache[category];
    const file = FILE_MAP[category];
    if (!file) {
        cache[category] = [];
        return cache[category];
    }
    try {
        const data = require(path.join(ASSETS_DIR, file));
        const urls = Array.isArray(data) ? data : (Array.isArray(data?.urls) ? data.urls : []);
        cache[category] = urls.filter(u => typeof u === 'string' && u.startsWith('http'));
    } catch (err) {
        console.error(`[pfpApi] Failed to load ${category}: ${err.message}`);
        cache[category] = [];
    }
    return cache[category];
}

function startBackgroundRefresh() {
    for (const category of Object.keys(FILE_MAP)) loadCategory(category);
}

async function fetchPfps(category) {
    const urls = loadCategory(category);
    if (!urls || urls.length === 0) return [];
    return shuffle([...urls]);
}

module.exports = { fetchPfps, startBackgroundRefresh };
