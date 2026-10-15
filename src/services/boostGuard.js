// @cashholy(carti) — boostGuard

// A first boost raises two events (member update + system message); this lets only one through.

const recent = new Map();
const WINDOW = 20000;

function claim(guildId, userId) {
    const key = `${guildId}:${userId}`;
    const now = Date.now();
    for (const [k, t] of recent) if (now - t > WINDOW) recent.delete(k);
    if (recent.has(key)) return false;
    recent.set(key, now);
    return true;
}

module.exports = { claim };
