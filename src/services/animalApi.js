/* ⌁ crafted by cashholy (carti) ⌁ */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const JSON_FILE = path.join(__dirname, '../media/animal-images.json');

let pool = {};

function loadPool() {
    try {
        if (fs.existsSync(JSON_FILE)) {
            pool = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
        }
    } catch (err) {
        pool = {};
    }
}

loadPool();

const FALLBACK_QUERIES = {
    cat: ['cute cat photo', 'adorable kitten photo', 'cat aesthetic photo'],
    dog: ['cute dog photo', 'adorable puppy photo', 'dog aesthetic'],
    fox: ['cute fox photo', 'wild fox photo', 'fox in nature photo'],
    duck: ['cute duck photo', 'duckling photo', 'baby duck cute'],
    panda: ['giant panda photo', 'cute panda photo', 'baby panda photo'],
    redpanda: ['red panda photo', 'cute red panda photo', 'red panda aesthetic'],
    bird: ['beautiful bird photo', 'colorful bird photo', 'cute bird photo'],
    bunny: ['cute bunny photo', 'adorable rabbit photo', 'fluffy bunny photo'],
    bear: ['cute bear photo', 'bear in nature photo', 'grizzly bear photo'],
    pig: ['cute pig photo', 'adorable piglet photo', 'mini pig cute'],
    possum: ['cute possum photo', 'opossum photo cute', 'baby possum photo'],
    sheep: ['cute sheep photo', 'fluffy sheep photo', 'lamb photo cute'],
    snake: ['beautiful snake photo', 'colorful snake photo', 'cute snake photo'],
    squirrel: ['cute squirrel photo', 'adorable squirrel photo', 'squirrel in nature']
};

const liveCache = {};
const LIVE_TTL = 5 * 60 * 1000;

async function fetchLive(animal) {
    const entry = liveCache[animal];
    if (entry && Date.now() - entry.at < LIVE_TTL && entry.urls.length > 0) {
        return entry.urls[Math.floor(Math.random() * entry.urls.length)];
    }
    const queries = FALLBACK_QUERIES[animal] || [`cute ${animal} photo`];
    const query = queries[Math.floor(Math.random() * queries.length)];
    try {
        const res = await axios.get('https://apidl.asepharyana.tech/api/search/pinterest', {
            params: { query },
            timeout: 15000
        });
        const urls = (Array.isArray(res.data) ? res.data : [])
            .filter(p => p.directLink)
            .map(p => p.directLink);
        if (urls.length > 0) {
            liveCache[animal] = { urls, at: Date.now() };
            return urls[Math.floor(Math.random() * urls.length)];
        }
    } catch {}
    return null;
}

async function fetchAnimalImage(animal) {
    const images = pool[animal];
    if (images && images.length > 0) {
        return images[Math.floor(Math.random() * images.length)];
    }
    return fetchLive(animal);
}

function startBackgroundRefresh() {}

module.exports = { fetchAnimalImage, startBackgroundRefresh };
