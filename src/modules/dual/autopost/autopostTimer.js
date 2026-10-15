// dev: cashholy (carti) | module: autopostTimer

const {
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} = require('discord.js');
const { fetchPfps } = require('../../../services/pfpApi');
const autopostDb = require('../../../database/autopost');

const REAL_CATEGORIES = ['female', 'male', 'anime'];
const POST_INTERVAL = 45 * 1000;

const imageQueues = new Map();
const seenUrls = new Map();

function timerKey(guildId, category) {
    return `${guildId}:${category}`;
}

async function getNextImageUrl(key, category) {
    if (!imageQueues.has(key) || imageQueues.get(key).length === 0) {
        const cat = category === 'random'
            ? REAL_CATEGORIES[Math.floor(Math.random() * REAL_CATEGORIES.length)]
            : category;
        const urls = await fetchPfps(cat);
        if (!urls || urls.length === 0) return null;

        const seen = seenUrls.get(key) || new Set();
        let fresh = urls.filter(u => !seen.has(u));

        if (fresh.length === 0) {
            seenUrls.set(key, new Set());
            fresh = [...urls];
        }

        imageQueues.set(key, fresh);
    }

    const queue = imageQueues.get(key);
    const url = queue.shift();

    if (url) {
        if (!seenUrls.has(key)) seenUrls.set(key, new Set());
        seenUrls.get(key).add(url);
    }

    return url || null;
}

function startAutopostTimer(client, guildId, category, channelId) {
    if (!client.autopostTimers) client.autopostTimers = new Map();

    const key = timerKey(guildId, category);
    if (client.autopostTimers.has(key)) {
        clearInterval(client.autopostTimers.get(key));
    }

    imageQueues.delete(key);
    seenUrls.delete(key);

    const timer = setInterval(async () => {
        try {
            const config = await autopostDb.getConfig(guildId, category);
            if (!config) {
                clearInterval(timer);
                client.autopostTimers.delete(key);
                imageQueues.delete(key);
                return;
            }

            const guild = client.guilds.cache.get(guildId);
            if (!guild) return;

            const channel = guild.channels.cache.get(config.channelId);
            if (!channel) return;

            const imageUrl = await getNextImageUrl(key, category);
            if (!imageUrl) return;

            const container = new ContainerBuilder()
                .setAccentColor(0x2B2D31)
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL(imageUrl)
                    )
                );

            await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error(`[Autopost] Error posting for guild ${guildId} category ${category}:`, error);
        }
    }, POST_INTERVAL);

    client.autopostTimers.set(key, timer);
}

function stopAutopostTimer(client, guildId, category) {
    if (!client.autopostTimers) return;
    const key = timerKey(guildId, category);
    if (client.autopostTimers.has(key)) {
        clearInterval(client.autopostTimers.get(key));
        client.autopostTimers.delete(key);
        imageQueues.delete(key);
        seenUrls.delete(key);
    }
}

function stopAllAutopostTimers(client, guildId) {
    if (!client.autopostTimers) return;
    for (const [key, timer] of client.autopostTimers.entries()) {
        if (key.startsWith(`${guildId}:`)) {
            clearInterval(timer);
            client.autopostTimers.delete(key);
            imageQueues.delete(key);
            seenUrls.delete(key);
        }
    }
}

module.exports = { startAutopostTimer, stopAutopostTimer, stopAllAutopostTimers };
