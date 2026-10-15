// ▛▀ cashholy (carti) ▀▜

const fs   = require('fs');
const path = require('path');
const { REST } = require('discord.js');
const { spawn } = require('child_process');
const {
    printLoading,
    printSuccess,
    printError,
    printInfo,
    printWarn,
} = require('./consoleLogger');

const ASSETS_DIR  = path.join(__dirname, '..', '..', 'tempassets');
const EMOJIS_PATH = path.join(__dirname, '..', 'media', 'emojis.json');
const EMOJI_REGEX = /^<(a?):(\w+):(\d+)>$/;

const SUPPORTED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

const col = {
    tag:    '\x1b[38;2;170;115;210m\x1b[1m',
    reset:  '\x1b[0m',
    white:  '\x1b[97m',
    green:  '\x1b[92m',
    yellow: '\x1b[93m',
    red:    '\x1b[91m',
    cyan:   '\x1b[96m',
    gray:   '\x1b[90m',
    dim:    '\x1b[2m',
};

const TAG  = `${col.tag}  [EmojiSync]${col.reset}`;
const LINE = `${col.tag}  ${'─'.repeat(50)}${col.reset}`;

function log(color, symbol, name, msg) {
    process.stdout.write(`${TAG} ${color}  ${symbol} ${col.white}${name}${color}${msg ? ` — ${msg}` : ''}${col.reset}\n`);
}

function decodeClientId(token) {
    try {
        const decoded = Buffer.from(token.split('.')[0], 'base64').toString('utf8');
        if (/^\d{17,20}$/.test(decoded)) return decoded;
        return null;
    } catch {
        return null;
    }
}

function deleteAssetsDir() {
    try {
        fs.rmSync(ASSETS_DIR, { recursive: true, force: true });
        printSuccess('tempassets/ removed successfully');
    } catch (err) {
        printWarn(`Could not remove tempassets/: ${err.message}`);
    }
}

function restartProcess() {
    process.stdout.write(`\n${TAG} ${col.cyan}  ↻ Restarting bot to apply new emoji IDs...${col.reset}\n`);
    process.stdout.write(`${LINE}\n\n`);

    const child = spawn(process.execPath, [process.argv[1]], {
        detached: true,
        stdio:    'inherit',
        env:      process.env,
    });
    child.unref();

    setTimeout(() => process.exit(0), 300);
}

module.exports = async function runEmojiSync() {
    if (!fs.existsSync(ASSETS_DIR)) return;

    process.stdout.write(`\n${LINE}\n`);
    process.stdout.write(`${TAG} ${col.white}\x1b[1m Starting emoji sync from tempassets/...${col.reset}\n`);
    process.stdout.write(`${LINE}\n`);

    const config = require('../settings');
    const token  = config.BOT_TOKEN;

    if (!token) {
        printError('BOT_TOKEN is not set in .env — cannot sync emojis');
        deleteAssetsDir();
        return;
    }

    let emojis;
    try {
        emojis = JSON.parse(fs.readFileSync(EMOJIS_PATH, 'utf8'));
    } catch (err) {
        printError(`Failed to read emojis.json: ${err.message}`);
        return;
    }

    const clientId = decodeClientId(token);
    if (!clientId) {
        printError('Could not decode client ID from BOT_TOKEN — verify BOT_TOKEN in .env');
        return;
    }

    process.stdout.write(`${TAG} ${col.gray}  Client ID decoded from token: ${col.white}${clientId}${col.reset}\n`);

    let imageFiles;
    try {
        imageFiles = fs.readdirSync(ASSETS_DIR).filter(f => {
            const ext = path.extname(f).toLowerCase();
            return SUPPORTED_EXT.has(ext) && !f.startsWith('.');
        });
    } catch (err) {
        printError(`Failed to read tempassets/: ${err.message}`);
        return;
    }

    if (imageFiles.length === 0) {
        printInfo('tempassets/ is empty — nothing to upload, removing folder');
        deleteAssetsDir();
        return;
    }

    process.stdout.write(`${TAG} ${col.gray}  Found ${col.white}${imageFiles.length}${col.gray} image(s) in tempassets/  |  ${col.white}${Object.keys(emojis).length}${col.gray} entries in emojis.json${col.reset}\n`);
    process.stdout.write(`${LINE}\n`);

    const rest = new REST({ version: '10' }).setToken(token);

    let appEmojis = [];
    try {
        const res = await rest.get(`/applications/${clientId}/emojis`);
        appEmojis = Array.isArray(res) ? res : (res.items ?? []);
        process.stdout.write(`${TAG} ${col.gray}  Application currently has ${col.white}${appEmojis.length}${col.gray} emoji(s) uploaded${col.reset}\n`);
        process.stdout.write(`${LINE}\n`);
    } catch (err) {
        printError(`Failed to fetch application emojis: ${err.message}`);
        return;
    }

    const nameToNewEmoji = {};
    let uploaded = 0;
    let skipped  = 0;
    let failed   = 0;

    for (const file of imageFiles) {
        const ext      = path.extname(file).toLowerCase();
        const name     = path.basename(file, ext);
        const animated = ext === '.gif';

        const existing = appEmojis.find(e => e.name === name);

        if (existing) {
            nameToNewEmoji[name] = {
                id:       existing.id,
                name:     existing.name,
                animated: existing.animated ?? false,
            };
            skipped++;
            log(col.green, '✓', name, 'already on application — skipped upload');
            continue;
        }

        log(col.cyan, '↑', name, 'uploading...');

        let imageBuffer;
        try {
            imageBuffer = fs.readFileSync(path.join(ASSETS_DIR, file));
        } catch (err) {
            log(col.red, '✗', name, `could not read file: ${err.message}`);
            failed++;
            continue;
        }

        const mimeMap = {
            '.png':  'image/png',
            '.jpg':  'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.gif':  'image/gif',
        };
        const mimeType = mimeMap[ext] || 'image/png';
        const image    = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

        try {
            const newEmoji = await rest.post(`/applications/${clientId}/emojis`, {
                body: { name, image },
            });
            nameToNewEmoji[name] = {
                id:       newEmoji.id,
                name:     newEmoji.name,
                animated: newEmoji.animated ?? animated,
            };
            uploaded++;
            log(col.green, '✓', name, `uploaded — new ID: ${newEmoji.id}`);
        } catch (err) {
            log(col.red, '✗', name, `upload failed: ${err.message}`);
            failed++;
        }
    }

    process.stdout.write(`${LINE}\n`);

    let updated     = false;
    const result    = { ...emojis };
    let fixedCount  = 0;

    for (const [key, emojiStr] of Object.entries(emojis)) {
        const match = emojiStr.match(EMOJI_REGEX);
        if (!match) continue;

        const emojiName = match[2];
        const newData   = nameToNewEmoji[emojiName];
        if (!newData) continue;

        const correct = newData.animated
            ? `<a:${newData.name}:${newData.id}>`
            : `<:${newData.name}:${newData.id}>`;

        if (result[key] !== correct) {
            result[key] = correct;
            updated = true;
            fixedCount++;
        }
    }

    if (updated) {
        try {
            fs.writeFileSync(EMOJIS_PATH, JSON.stringify(result, null, 2));
            printSuccess(`emojis.json updated — ${fixedCount} key(s) rewritten with new IDs`);
        } catch (err) {
            printError(`Failed to save emojis.json: ${err.message}`);
        }
    } else {
        printInfo('emojis.json already up to date — no changes needed');
    }

    const parts = [
        uploaded ? `${col.cyan}${uploaded} uploaded${col.reset}` : null,
        skipped  ? `${col.green}${skipped} skipped${col.reset}`  : null,
        failed   ? `${col.red}${failed} failed${col.reset}`      : null,
    ].filter(Boolean);

    process.stdout.write(`${TAG}  ${parts.join(`  ${col.dim}·${col.reset}  `)}\n`);
    process.stdout.write(`${LINE}\n`);

    deleteAssetsDir();

    if (updated) {
        restartProcess();
        await new Promise(r => setTimeout(r, 2000));
    }
};
