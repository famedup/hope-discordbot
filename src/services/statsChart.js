// ▛▀ cashholy (carti) ▀▜

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

const FONTS_DIR = path.join(__dirname, '../media/fonts');
let fontsRegistered = false;
function ensureFonts() {
    if (fontsRegistered) return;
    try {
        GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'NotoSans_SemiCondensed-Regular.ttf'), 'Stats Sans');
        GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'NotoSans_SemiCondensed-Bold.ttf'), 'Stats Sans Bold');
    } catch {
        // Fonts unavailable - canvas will fall back to a system default.
    }
    fontsRegistered = true;
}

const COLORS = {
    bg: '#0b0b0d',
    card: '#111113',
    cardBorder: '#232327',
    pill: '#1a1a1d',
    text: '#e8e8ea',
    subtext: '#8a8a90',
    faint: '#5a5a60',
    messages: '#5b93f5',
    reactions: '#f0a83c',
    voice: '#b389f0',
    joins: '#34d399',
    leaves: '#f0555a',
};

function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, color) {
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
}

function strokeRoundRect(ctx, x, y, w, h, r, color, lineWidth = 1) {
    roundRect(ctx, x, y, w, h, r);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

function text(ctx, str, x, y, { font = '20px "Stats Sans"', color = COLORS.text, align = 'left' } = {}) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x, y);
}

function formatNumber(n) {
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`.replace('.0k', 'k');
    return String(n);
}

function formatHours(seconds) {
    return (seconds / 3600).toFixed(2);
}

function dateLabel(dateStr) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// ---- shared header / footer ----

async function drawHeader(ctx, { icon, title, subtitleAvatar, subtitleText, width, legend }) {
    text(ctx, icon, 34, 54, { font: '26px "Stats Sans"', color: COLORS.subtext });
    text(ctx, title, 70, 56, { font: '600 30px "Stats Sans Bold"' });

    if (subtitleAvatar) {
        try {
            const img = await loadImage(subtitleAvatar);
            ctx.save();
            roundRect(ctx, 34, 70, 24, 24, 12);
            ctx.clip();
            ctx.drawImage(img, 34, 70, 24, 24);
            ctx.restore();
        } catch { /* ignore avatar load failures */ }
    }
    text(ctx, subtitleText, subtitleAvatar ? 64 : 34, 88, { font: '18px "Stats Sans"', color: COLORS.subtext });

    if (legend?.length) {
        let lx = width - 34;
        for (let i = legend.length - 1; i >= 0; i--) {
            const item = legend[i];
            const valueStr = `${item.value}`;
            ctx.font = '18px "Stats Sans"';
            const valueW = ctx.measureText(valueStr).width;
            ctx.font = '18px "Stats Sans Bold"';
            const labelW = ctx.measureText(item.label).width;
            const dotW = 10;
            const segmentW = dotW + 8 + labelW + 8 + valueW;
            lx -= segmentW;

            ctx.beginPath();
            ctx.arc(lx + dotW / 2, 52, dotW / 2, 0, Math.PI * 2);
            ctx.fillStyle = item.color;
            ctx.fill();

            text(ctx, item.label, lx + dotW + 8, 58, { font: '18px "Stats Sans Bold"' });
            text(ctx, valueStr, lx + dotW + 8 + labelW + 8, 58, { font: '18px "Stats Sans"', color: COLORS.subtext });

            lx -= 24;
        }
    }
}

function drawFooter(ctx, { width, height, rangeLabel, botName }) {
    text(ctx, `Range: ${rangeLabel}  —  Timezone: UTC`, 34, height - 22, { font: '15px "Stats Sans"', color: COLORS.faint });
    text(ctx, `Powered by ${botName}`, width - 34, height - 22, { font: '15px "Stats Sans"', color: COLORS.faint, align: 'right' });
}

// ---- line/area chart, shared by Activity + Membership tabs ----

function drawSmoothLine(ctx, points) {
    if (points.length < 2) return;
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
}

function drawSeries(ctx, values, { x, y, w, h, color, max }) {
    if (!values.length) return;
    const stepX = w / Math.max(values.length - 1, 1);
    const points = values.map((v, i) => ({
        x: x + i * stepX,
        y: y + h - (max > 0 ? (v / max) * h : 0),
    }));

    // Gradient fill under the curve.
    const gradient = ctx.createLinearGradient(0, y, 0, y + h);
    gradient.addColorStop(0, `${color}55`);
    gradient.addColorStop(1, `${color}02`);

    ctx.beginPath();
    ctx.moveTo(points[0].x, y + h);
    drawSmoothLine(ctx, points);
    ctx.lineTo(points[points.length - 1].x, y + h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    drawSmoothLine(ctx, points);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
}

async function renderChart({ icon, title, botName, botAvatarURL, series, lines, width = 1000, height = 560, rangeLabel = 'Last 30 days' }) {
    ensureFonts();
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    const legend = lines.map(l => ({
        color: l.color,
        label: l.label,
        value: l.formatTotal(series.reduce((sum, p) => sum + p[l.key], 0)),
    }));

    await drawHeader(ctx, { icon, title, subtitleAvatar: botAvatarURL, subtitleText: botName, width, legend });

    const chartX = 34;
    const chartY = 120;
    const chartW = width - 68;
    const chartH = height - 220;

    fillRoundRect(ctx, chartX, chartY, chartW, chartH, 12, COLORS.card);
    strokeRoundRect(ctx, chartX, chartY, chartW, chartH, 12, COLORS.cardBorder);

    const padX = 20;
    const padY = 20;
    const innerX = chartX + padX;
    const innerY = chartY + padY;
    const innerW = chartW - padX * 2;
    const innerH = chartH - padY * 2 - 24; // leave room for date labels

    const maxVal = Math.max(1, ...lines.map(l => Math.max(...series.map(p => p[l.key]))));

    ctx.save();
    roundRect(ctx, chartX, chartY, chartW, chartH, 12);
    ctx.clip();
    for (const line of lines) {
        drawSeries(ctx, series.map(p => p[line.key]), { x: innerX, y: innerY, w: innerW, h: innerH, color: line.color, max: maxVal });
    }
    ctx.restore();

    // Date labels: start, middle, end.
    const labelY = innerY + innerH + 24;
    text(ctx, dateLabel(series[0].date), innerX, labelY, { font: '14px "Stats Sans"', color: COLORS.faint });
    text(ctx, dateLabel(series[Math.floor(series.length / 2)].date), innerX + innerW / 2, labelY, { font: '14px "Stats Sans"', color: COLORS.faint, align: 'center' });
    text(ctx, dateLabel(series[series.length - 1].date), innerX + innerW, labelY, { font: '14px "Stats Sans"', color: COLORS.faint, align: 'right' });

    drawFooter(ctx, { width, height, rangeLabel, botName });

    return canvas.toBuffer('image/png');
}

// ---- grid/card style tabs (Overview + Messages) ----

function drawStatBox(ctx, { x, y, w, h, label, rows, iconChar }) {
    fillRoundRect(ctx, x, y, w, h, 12, COLORS.card);
    strokeRoundRect(ctx, x, y, w, h, 12, COLORS.cardBorder);
    text(ctx, label, x + 18, y + 34, { font: '600 17px "Stats Sans Bold"' });
    if (iconChar) text(ctx, iconChar, x + w - 30, y + 34, { font: '16px "Stats Sans"', color: COLORS.subtext });

    let ry = y + 60;
    const rowH = (h - 76) / rows.length;
    for (const row of rows) {
        fillRoundRect(ctx, x + 16, ry, w - 32, rowH - 10, 8, COLORS.pill);
        text(ctx, row.tag, x + 30, ry + rowH / 2 - 2, { font: '13px "Stats Sans Bold"', color: COLORS.subtext });
        text(ctx, row.value, x + 30 + 34, ry + rowH / 2 + 5, { font: '18px "Stats Sans Bold"' });
        text(ctx, row.unit, x + w - 30, ry + rowH / 2 + 5, { font: '13px "Stats Sans"', color: COLORS.faint, align: 'right' });
        ry += rowH;
    }
}

function drawBigNumberBox(ctx, { x, y, w, h, label, value, sub, iconChar }) {
    fillRoundRect(ctx, x, y, w, h, 12, COLORS.card);
    strokeRoundRect(ctx, x, y, w, h, 12, COLORS.cardBorder);
    text(ctx, label, x + 18, y + 34, { font: '600 17px "Stats Sans Bold"' });
    if (iconChar) text(ctx, iconChar, x + w - 30, y + 34, { font: '16px "Stats Sans"', color: COLORS.subtext });

    text(ctx, value, x + w / 2, y + h / 2 + 20, { font: '700 46px "Stats Sans Bold"', align: 'center' });
    text(ctx, sub, x + w / 2, y + h / 2 + 48, { font: '14px "Stats Sans"', color: COLORS.subtext, align: 'center' });
}

function drawListBox(ctx, { x, y, w, h, label, items, iconChar }) {
    fillRoundRect(ctx, x, y, w, h, 12, COLORS.card);
    strokeRoundRect(ctx, x, y, w, h, 12, COLORS.cardBorder);
    text(ctx, label, x + 18, y + 34, { font: '600 17px "Stats Sans Bold"' });
    if (iconChar) text(ctx, iconChar, x + w - 30, y + 34, { font: '16px "Stats Sans"', color: COLORS.subtext });

    let ry = y + 54;
    const rowH = Math.min(46, (h - 66) / Math.max(items.length, 1));
    for (const item of items) {
        fillRoundRect(ctx, x + 16, ry, w - 32, rowH - 8, 8, COLORS.pill);
        text(ctx, item.name, x + 30, ry + rowH / 2 - 1, { font: '15px "Stats Sans Bold"' });
        text(ctx, `${item.value} ${item.unit || 'messages'}`, x + w - 30, ry + rowH / 2 - 1, { font: '13px "Stats Sans"', color: COLORS.faint, align: 'right' });
        ry += rowH;
    }
    if (!items.length) {
        text(ctx, 'No data yet', x + 18, ry + 10, { font: '14px "Stats Sans"', color: COLORS.faint });
    }
}

async function drawMiniChart(ctx, { x, y, w, h, series, lines }) {
    fillRoundRect(ctx, x, y, w, h, 12, COLORS.card);
    strokeRoundRect(ctx, x, y, w, h, 12, COLORS.cardBorder);
    text(ctx, 'Charts', x + 18, y + 30, { font: '600 15px "Stats Sans Bold"' });

    let lx = x + w - 18;
    for (let i = lines.length - 1; i >= 0; i--) {
        const l = lines[i];
        ctx.font = '12px "Stats Sans Bold"';
        const labelW = ctx.measureText(l.label).width;
        lx -= labelW;
        text(ctx, l.label, lx, y + 30, { font: '12px "Stats Sans Bold"' });
        ctx.beginPath();
        ctx.arc(lx - 10, y + 26, 4, 0, Math.PI * 2);
        ctx.fillStyle = l.color;
        ctx.fill();
        lx -= 24;
    }

    const innerX = x + 16;
    const innerY = y + 44;
    const innerW = w - 32;
    const innerH = h - 60;
    const maxVal = Math.max(1, ...lines.map(l => Math.max(...series.map(p => p[l.key]))));

    ctx.save();
    roundRect(ctx, x, y, w, h, 12);
    ctx.clip();
    for (const line of lines) {
        drawSeries(ctx, series.map(p => p[line.key]), { x: innerX, y: innerY, w: innerW, h: innerH, color: line.color, max: maxVal });
    }
    ctx.restore();
}

async function renderOverviewCard({ botName, botAvatarURL, guildName, guildIconURL, memberCount, createdAt, ranges, topChannels, series, lines, width = 1000, height = 830, rangeLabel = 'Last 30 days' }) {
    ensureFonts();
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    // Header: guild icon + name + member count, created/members pills top-right.
    if (guildIconURL) {
        try {
            const img = await loadImage(guildIconURL);
            ctx.save();
            roundRect(ctx, 34, 30, 56, 56, 16);
            ctx.clip();
            ctx.drawImage(img, 34, 30, 56, 56);
            ctx.restore();
        } catch { /* ignore */ }
    }
    text(ctx, guildName, 104, 58, { font: '700 26px "Stats Sans Bold"' });
    text(ctx, `${formatNumber(memberCount)} members`, 104, 82, { font: '16px "Stats Sans"', color: COLORS.subtext });

    const pillW = 150, pillH = 46;
    fillRoundRect(ctx, width - 34 - pillW * 2 - 12, 30, pillW, pillH, 10, COLORS.card);
    strokeRoundRect(ctx, width - 34 - pillW * 2 - 12, 30, pillW, pillH, 10, COLORS.cardBorder);
    text(ctx, 'CREATED', width - 34 - pillW * 2 - 12 + 14, 48, { font: '11px "Stats Sans Bold"', color: COLORS.faint });
    text(ctx, createdAt, width - 34 - pillW * 2 - 12 + 14, 68, { font: '15px "Stats Sans Bold"' });

    fillRoundRect(ctx, width - 34 - pillW, 30, pillW, pillH, 10, COLORS.card);
    strokeRoundRect(ctx, width - 34 - pillW, 30, pillW, pillH, 10, COLORS.cardBorder);
    text(ctx, 'MEMBERS', width - 34 - pillW + 14, 48, { font: '11px "Stats Sans Bold"', color: COLORS.faint });
    text(ctx, formatNumber(memberCount), width - 34 - pillW + 14, 68, { font: '15px "Stats Sans Bold"' });

    const topY = 108;
    const boxW = (width - 68 - 24) / 3;
    const boxH = 210;

    drawStatBox(ctx, {
        x: 34, y: topY, w: boxW, h: boxH, label: 'Messages', iconChar: '#',
        rows: [
            { tag: '1d', value: formatNumber(ranges.messages[0]), unit: 'messages' },
            { tag: '7d', value: formatNumber(ranges.messages[1]), unit: 'messages' },
            { tag: '30d', value: formatNumber(ranges.messages[2]), unit: 'messages' },
        ],
    });
    drawStatBox(ctx, {
        x: 34 + boxW + 12, y: topY, w: boxW, h: boxH, label: 'Reactions', iconChar: '♥',
        rows: [
            { tag: '1d', value: formatNumber(ranges.reactions[0]), unit: 'reactions' },
            { tag: '7d', value: formatNumber(ranges.reactions[1]), unit: 'reactions' },
            { tag: '30d', value: formatNumber(ranges.reactions[2]), unit: 'reactions' },
        ],
    });
    drawStatBox(ctx, {
        x: 34 + (boxW + 12) * 2, y: topY, w: boxW, h: boxH, label: 'Voice Activity', iconChar: '🎙',
        rows: [
            { tag: '1d', value: formatHours(ranges.voice[0]), unit: 'hours' },
            { tag: '7d', value: formatHours(ranges.voice[1]), unit: 'hours' },
            { tag: '30d', value: formatHours(ranges.voice[2]), unit: 'hours' },
        ],
    });

    const bottomY = topY + boxH + 16;
    const bottomH = height - bottomY - 50;
    const leftW = (width - 68) * 0.44;
    const rightW = (width - 68) - leftW - 16;

    drawListBox(ctx, {
        x: 34, y: bottomY, w: leftW, h: bottomH, label: 'Top Channels', iconChar: '#',
        items: topChannels,
    });
    await drawMiniChart(ctx, { x: 34 + leftW + 16, y: bottomY, w: rightW, h: bottomH, series, lines });

    drawFooter(ctx, { width, height, rangeLabel, botName });

    return canvas.toBuffer('image/png');
}

async function renderMessagesCard({ botName, botAvatarURL, totals, topMembers, topChannels, resolveMemberName, resolveChannelName, width = 1000, height = 830, rangeLabel = 'Last 30 days' }) {
    ensureFonts();
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    await drawHeader(ctx, { icon: '#', title: 'Messages', subtitleAvatar: botAvatarURL, subtitleText: botName, width, legend: [] });

    const topY = 108;
    const boxW = (width - 68 - 24) / 3;
    const boxH = 210;

    drawBigNumberBox(ctx, {
        x: 34, y: topY, w: boxW, h: boxH, label: 'Server Lookback', iconChar: '↻',
        value: formatNumber(totals.messages[2]), sub: 'messages',
    });
    drawStatBox(ctx, {
        x: 34 + boxW + 12, y: topY, w: boxW, h: boxH, label: 'Messages', iconChar: '#',
        rows: [
            { tag: '1d', value: formatNumber(totals.messages[0]), unit: 'messages' },
            { tag: '7d', value: formatNumber(totals.messages[1]), unit: 'messages' },
            { tag: '30d', value: formatNumber(totals.messages[2]), unit: 'messages' },
        ],
    });
    drawStatBox(ctx, {
        x: 34 + (boxW + 12) * 2, y: topY, w: boxW, h: boxH, label: 'Daily Average', iconChar: '📈',
        rows: [
            { tag: '1d', value: formatNumber(totals.messages[0]), unit: '/ day' },
            { tag: '7d', value: formatNumber(Math.round(totals.messages[1] / 7)), unit: '/ day' },
            { tag: '30d', value: formatNumber(Math.round(totals.messages[2] / 30)), unit: '/ day' },
        ],
    });

    const bottomY = topY + boxH + 16;
    const bottomH = height - bottomY - 50;
    const colW = (width - 68 - 16) / 2;

    drawListBox(ctx, {
        x: 34, y: bottomY, w: colW, h: bottomH, label: 'Top Message Members', iconChar: '#',
        items: topMembers.map(m => ({ name: resolveMemberName(m.userId), value: formatNumber(Number(m.total)), unit: 'messages' })),
    });
    drawListBox(ctx, {
        x: 34 + colW + 16, y: bottomY, w: colW, h: bottomH, label: 'Top Message Channels', iconChar: '#',
        items: topChannels.map(c => ({ name: resolveChannelName(c.channelId), value: formatNumber(Number(c.total)), unit: 'messages' })),
    });

    drawFooter(ctx, { width, height, rangeLabel, botName });

    return canvas.toBuffer('image/png');
}

module.exports = {
    COLORS,
    formatNumber,
    formatHours,
    renderChart,
    renderOverviewCard,
    renderMessagesCard,
};
