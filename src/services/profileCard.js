/** @author cashholy (carti) */

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

const profileImagesPath = path.join(__dirname, '../media/profile-image.files.json');
let profileImages = { otherImgs: {}, statusImgs: {} };
try {
    profileImages = JSON.parse(fs.readFileSync(profileImagesPath, 'utf8'));
} catch {
    // profile-image.files.json not present — profile card image generation will be unavailable
}

const FONTS_DIR = path.join(__dirname, '../media/fonts');

const FONTS = {
    HELVETICA: {
        regular: 'Helvetica',
        bold: 'Helvetica Bold',
        paths: { regular: 'Helvetica.ttf', bold: 'HelveticaBold.ttf' },
    },
    NOTO_SANS: {
        regular: 'Noto Sans',
        bold: 'Noto Sans Bold',
        paths: { regular: 'NotoSans_SemiCondensed-Regular.ttf', bold: 'NotoSans_SemiCondensed-Bold.ttf' },
    },
    ROBOTO: {
        regular: 'Roboto',
        bold: 'Roboto Bold',
        paths: { regular: 'RobotoCondensed-Regular.ttf', bold: 'RobotoCondensed-Bold.ttf' },
    },
    OPEN_SANS: {
        regular: 'Open Sans',
        bold: 'Open Sans Bold',
        paths: { regular: 'OpenSans_SemiCondensed-Regular.ttf', bold: 'OpenSans_SemiCondensed-Bold.ttf' },
    },
    MONTSERRAT: {
        regular: 'Montserrat',
        bold: 'Montserrat Bold',
        paths: { regular: 'Montserrat-Regular.ttf', bold: 'Montserrat-Bold.ttf' },
    },
};

const alphaValue = 0.4;
const registeredFonts = new Set();

function registerFonts(selectedFont = 'HELVETICA') {
    const font = FONTS[selectedFont];
    if (!font) return FONTS.HELVETICA;
    
    if (!registeredFonts.has(selectedFont)) {
        try {
            GlobalFonts.registerFromPath(path.join(FONTS_DIR, font.paths.regular), font.regular);
            GlobalFonts.registerFromPath(path.join(FONTS_DIR, font.paths.bold), font.bold);
            registeredFonts.add(selectedFont);
        } catch (err) {
            console.error(`Failed to register font ${selectedFont}:`, err);
        }
    }
    return font;
}

function parseUsername(username, ctx, font, size, maxLength, isBold = false) {
    username = username && username.replace(/\s/g, '') ? username : '?????';
    let usernameChars = username.split('');
    let finalUsername = '';
    let newSize = +size;
    let textLength;
    let finalized = false;

    while (!finalized) {
        const editableUsername = usernameChars.join('');
        ctx.font = `${isBold ? 'bold ' : ''}${newSize}px ${font}`;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFFFFF';
        const actualLength = ctx.measureText(editableUsername).width;
        
        if (actualLength >= maxLength) {
            if (newSize > 60) newSize -= 1;
            else usernameChars.pop();
        }
        if (actualLength <= maxLength) {
            finalUsername = usernameChars.join('');
            textLength = actualLength;
            finalized = true;
        }
    }
    return { username: finalUsername, newSize, textLength };
}

function parseHex(hexString) {
    const hexRegex = /^(#)?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;
    if (!hexRegex.test(hexString)) return '#FFFFFF';
    if (!hexString.startsWith('#')) hexString = '#' + hexString;
    return hexString;
}

function getDateString(timestamp, locale = 'en') {
    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(timestamp).toLocaleDateString(locale, dateOptions);
}

function abbreviateNumber(number) {
    const numString = `${number}`;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const abbreviations = ['', 'K', 'M', 'B', 'T'].concat(
        new Array(letters.length).fill('AA').map((_, i) => letters[i].repeat(2))
    );
    const selectedAbbr = abbreviations[Math.floor((numString.length - 1) / 3)] ?? '??';
    const digits = ((numString.length - 1) % 3) + 1;
    if (numString.length < 4) return numString;
    const decimal = numString.slice(digits, digits + 1);
    const firstDigits = `${numString.slice(0, digits)}${decimal == '0' || decimal == '00' || digits == 3 ? '' : `.${decimal.replace(/0$/g, '')}`}`;
    return `${firstDigits}${selectedAbbr}`;
}

function addShadow(canvasToEdit) {
    const canvas = createCanvas(885, 303);
    const ctx = canvas.getContext('2d');
    ctx.filter = 'drop-shadow(0px 4px 4px #000)';
    ctx.globalAlpha = alphaValue;
    ctx.drawImage(canvasToEdit, 0, 0);
    return canvas;
}

async function genBase(options, avatarURL, bannerURL) {
    const canvas = createCanvas(885, 303);
    const ctx = canvas.getContext('2d');
    
    let cardBackground;
    let isBannerLoaded = true;
    
    const backgroundToLoad = options?.customBackground || bannerURL || avatarURL;
    
    try {
        cardBackground = await loadImage(backgroundToLoad);
    } catch (err) {
        try {
            cardBackground = await loadImage(avatarURL);
            isBannerLoaded = false;
        } catch {
            ctx.fillStyle = '#18191c';
            ctx.fillRect(0, 0, 885, 303);
            return canvas;
        }
    }

    const condAvatar = options?.customBackground ? true : !isBannerLoaded ? false : bannerURL !== null;
    const wX = condAvatar ? 885 : 900;
    const wY = condAvatar ? 303 : wX;
    const cY = condAvatar ? 0 : -345;

    ctx.fillStyle = '#18191c';
    ctx.fillRect(0, 0, 885, 303);
    
    ctx.filter = (options?.moreBackgroundBlur ? 'blur(9px)' : options?.disableBackgroundBlur ? 'blur(0px)' : 'blur(3px)') +
        (options?.backgroundBrightness ? ` brightness(${options.backgroundBrightness + 100}%)` : '');
    
    ctx.drawImage(cardBackground, 0, cY, wX, wY);
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#2a2d33';
    ctx.fillRect(0, 0, 885, 303);
    
    return canvas;
}

async function genFrame(badgesLength, options) {
    const canvas = createCanvas(885, 303);
    const ctx = canvas.getContext('2d');
    
    const cardFrame = await loadImage(Buffer.from(profileImages.otherImgs.frame, 'base64'));
    ctx.globalCompositeOperation = 'source-out';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(cardFrame, 0, 0, 885, 303);
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alphaValue;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.roundRect(696, 248, 165, 33, [12]);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (options?.badgesFrame && badgesLength > 0 && !options?.removeBadges) {
        ctx.fillStyle = '#000';
        ctx.globalAlpha = alphaValue;
        ctx.beginPath();
        ctx.roundRect(857 - badgesLength * 59, 15, 59 * badgesLength + 8, 61, [17]);
        ctx.fill();
    }
    
    return canvas;
}

async function genBorder(options) {
    const canvas = createCanvas(885, 303);
    const ctx = canvas.getContext('2d');
    
    const borderColors = Array.isArray(options.borderColor) ? options.borderColor : [options.borderColor];
    
    const gradX = options.borderAllign === 'vertical' ? 0 : 885;
    const gradY = options.borderAllign === 'vertical' ? 303 : 0;
    const grd = ctx.createLinearGradient(0, 0, gradX, gradY);
    
    for (let i = 0; i < borderColors.length; i++) {
        const stop = i / (borderColors.length - 1 || 1);
        grd.addColorStop(stop, parseHex(borderColors[i]));
    }
    
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 885, 303);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.roundRect(9, 9, 867, 285, [25]);
    ctx.fill();
    
    return canvas;
}

async function genTextAndAvatar(user, options, avatarURL) {
    const canvas = createCanvas(885, 303);
    const ctx = canvas.getContext('2d');
    
    const globalName = user.globalName || user.displayName || user.username;
    const username = user.username;
    const createdTimestamp = user.createdTimestamp;
    const isBot = user.bot;
    
    const pixelLength = isBot ? 470 : 555;
    const fixedUsername = options?.customUsername || globalName;
    
    const font = options?.font ? FONTS[options.font] : FONTS.HELVETICA;
    const boldFont = font.bold;
    const regularFont = font.regular;
    
    const { username: parsedUsername, newSize, textLength } = parseUsername(fixedUsername, ctx, boldFont, '80', pixelLength, true);
    
    if (options?.customSubtitle && !options.rankData) {
        ctx.globalAlpha = alphaValue;
        ctx.fillStyle = '#2a2d33';
        ctx.beginPath();
        ctx.roundRect(304, 248, 380, 33, [12]);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.font = `23px ${regularFont}`;
        ctx.textAlign = 'left';
        ctx.fillStyle = options?.color || '#dadada';
        ctx.fillText(options.customSubtitle, 314, 273);
    }
    
    const createdDateString = options?.customDate || getDateString(createdTimestamp, options?.localDateType);
    const tag = options?.customTag || `@${username}`;
    
    ctx.font = `bold ${newSize}px ${regularFont}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = options?.usernameColor ? parseHex(options.usernameColor) : '#FFFFFF';
    ctx.fillText(parsedUsername, 300, 155);
    
    if (!options?.rankData) {
        ctx.font = `60px ${regularFont}`;
        ctx.fillStyle = options?.tagColor ? parseHex(options.tagColor) : '#dadada';
        ctx.fillText(tag, 300, 215);
    }
    
    ctx.font = `23px ${regularFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#dadada';
    ctx.fillText(createdDateString, 775, 273);
    
    try {
        const cardAvatar = await loadImage(avatarURL);
        const roundValue = options?.squareAvatar ? 30 : 225;
        ctx.beginPath();
        ctx.roundRect(47, 39, 225, 225, [roundValue]);
        ctx.clip();
        ctx.fillStyle = '#292b2f';
        ctx.fillRect(47, 39, 225, 225);
        ctx.drawImage(cardAvatar, 47, 39, 225, 225);
    } catch (err) {
        ctx.fillStyle = '#292b2f';
        ctx.beginPath();
        ctx.roundRect(47, 39, 225, 225, [225]);
        ctx.fill();
    }
    
    if (options?.presenceStatus) {
        return await genStatus(canvas, options);
    }
    
    return canvas;
}

async function genStatus(canvasToEdit, options) {
    const canvas = createCanvas(885, 303);
    const ctx = canvas.getContext('2d');
    
    const validStatus = ['idle', 'dnd', 'online', 'invisible', 'offline', 'streaming', 'phone'];
    if (!validStatus.includes(options.presenceStatus)) return canvasToEdit;
    
    const statusString = options.presenceStatus === 'offline' ? 'invisible' : options.presenceStatus;
    const status = await loadImage(Buffer.from(profileImages.statusImgs[statusString], 'base64'));
    
    const cX = options.presenceStatus === 'phone' ? 224.5 : 212;
    const cY = options.presenceStatus === 'phone' ? 202 : 204;
    
    ctx.drawImage(canvasToEdit, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    if (options.presenceStatus === 'phone') {
        ctx.roundRect(cX - 8, cY - 8, 57, 78, [10]);
    } else {
        ctx.roundRect(212, 204, 62, 62, [62]);
    }
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(status, cX, cY);
    
    return canvas;
}

async function genAvatarDecoration(user, options) {
    const canvas = createCanvas(885, 303);
    const ctx = canvas.getContext('2d');
    
    const decorationData = user.avatarDecorationData;
    if (!decorationData || !decorationData.asset) return null;
    
    const decorationURL = `https://cdn.discordapp.com/avatar-decoration-presets/${decorationData.asset}.png?size=240&passthrough=true`;
    
    try {
        const decoration = await loadImage(decorationURL);
        ctx.drawImage(decoration, 25, 18, 269, 269);
        
        if (options?.presenceStatus) {
            return await cutAvatarStatus(canvas, options);
        }
        
        return canvas;
    } catch (err) {
        return null;
    }
}

async function cutAvatarStatus(canvasToEdit, options) {
    const canvas = createCanvas(885, 303);
    const ctx = canvas.getContext('2d');
    
    const cX = options.presenceStatus === 'phone' ? 224.5 : 212;
    const cY = options.presenceStatus === 'phone' ? 202 : 204;
    
    ctx.drawImage(canvasToEdit, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    if (options.presenceStatus === 'phone') {
        ctx.roundRect(cX - 8, cY - 8, 57, 78, [10]);
    } else {
        ctx.roundRect(212, 204, 62, 62, [62]);
    }
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    
    return canvas;
}

async function genBadges(badges) {
    const canvas = createCanvas(885, 303);
    const ctx = canvas.getContext('2d');
    let x = 800;
    
    for (const badge of badges) {
        const { canvas: badgeCanvas, x: bX, y, w } = badge;
        ctx.drawImage(badgeCanvas, x + bX, y, w, w);
        x -= 59;
    }
    
    return canvas;
}

async function genClanTag(clanData, options) {
    const canvas = createCanvas(885, 303);
    const ctx = canvas.getContext('2d');
    
    if (!clanData || !clanData.tag) return null;
    
    const font = options?.font ? FONTS[options.font] : FONTS.MONTSERRAT;
    registerFonts(options?.font || 'MONTSERRAT');
    const boldFont = font.bold;
    
    const rawTag = clanData.tag;
    const tag = rawTag.normalize('NFKC');
    const guildId = clanData.identity_guild_id;
    const badgeHash = clanData.badge;
    
    ctx.font = `bold 28px ${boldFont}`;
    const tagWidth = ctx.measureText(tag).width;
    const totalWidth = badgeHash ? tagWidth + 45 : tagWidth;
    const startX = 857 - totalWidth - 15;
    
    ctx.fillStyle = '#000';
    ctx.globalAlpha = alphaValue;
    ctx.beginPath();
    ctx.roundRect(startX - 10, 15, totalWidth + 25, 50, [17]);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    if (badgeHash && guildId) {
        try {
            const badgeURL = `https://cdn.discordapp.com/clan-badges/${guildId}/${badgeHash}.png?size=64`;
            const clanBadge = await loadImage(badgeURL);
            ctx.drawImage(clanBadge, startX, 20, 40, 40);
            
            ctx.font = `bold 28px ${boldFont}`;
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'left';
            ctx.fillText(tag, startX + 48, 50);
        } catch (err) {
            console.error('[ProfileCard] Failed to load clan badge:', err.message);
            ctx.font = `bold 28px ${boldFont}`;
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'left';
            ctx.fillText(tag, startX, 50);
        }
    } else {
        ctx.font = `bold 28px ${boldFont}`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText(tag, startX, 50);
    }
    
    return canvas;
}

async function fetchUserBadges(userId, botToken) {
    try {
        const axios = require('axios');
        
        const profileResponse = await axios.get(`https://discord.com/api/v10/users/${userId}/profile`, {
            headers: {
                'Authorization': `Bot ${botToken}`
            },
            params: {
                with_mutual_guilds: false,
                with_mutual_friends: false
            }
        }).catch(() => null);
        
        if (profileResponse?.data) {
            return profileResponse.data;
        }
        
        const response = await axios.get(`https://discord.com/api/v10/users/${userId}`, {
            headers: {
                'Authorization': `Bot ${botToken}`
            }
        });
        return response.data;
    } catch (err) {
        console.error('[ProfileCard] Failed to fetch user badges:', err.message);
        return null;
    }
}

const BADGES_DIR = path.join(__dirname, '../media/badges');

async function getBadges(user, options) {
    const badges = [];
    
    let userData = null;
    if (options?.botToken) {
        userData = await fetchUserBadges(user.id, options.botToken);
    }
    
    const clanData = userData?.clan || userData?.primary_guild || null;
    
    if (clanData && clanData.tag) {
        return { badges: [], clanData, userData };
    }
    
    const userFlags = user.flags?.toArray() || [];
    
    const flagToBadgeFile = {
        'Staff': 'staff.png',
        'Partner': 'partner.png',
        'Hypesquad': 'hypesquad.png',
        'BugHunterLevel1': 'bughunter1.png',
        'BugHunterLevel2': 'bughunter2.png',
        'HypeSquadOnlineHouse1': 'hypesquad_bravery.png',
        'HypeSquadOnlineHouse2': 'hypesquad_brilliance.png',
        'HypeSquadOnlineHouse3': 'hypesquad_balance.png',
        'PremiumEarlySupporter': 'early_supporter.png',
        'VerifiedDeveloper': 'verified_developer.png',
        'CertifiedModerator': 'certified_moderator.png',
        'ActiveDeveloper': 'active_developer.png',
        'QuestCompleted': 'quest.png',
    };
    
    const publicFlagsToBadge = [
        { flag: 1n, name: 'Staff' },
        { flag: 2n, name: 'Partner' },
        { flag: 4n, name: 'Hypesquad' },
        { flag: 8n, name: 'BugHunterLevel1' },
        { flag: 64n, name: 'HypeSquadOnlineHouse1' },
        { flag: 128n, name: 'HypeSquadOnlineHouse2' },
        { flag: 256n, name: 'HypeSquadOnlineHouse3' },
        { flag: 512n, name: 'PremiumEarlySupporter' },
        { flag: 16384n, name: 'BugHunterLevel2' },
        { flag: 131072n, name: 'VerifiedDeveloper' },
        { flag: 262144n, name: 'CertifiedModerator' },
        { flag: 4194304n, name: 'ActiveDeveloper' },
        { flag: 17592186044416n, name: 'QuestCompleted' },
    ];
    
    const addedFlags = new Set();
    
    if (userData?.public_flags) {
        const userPublicFlags = BigInt(userData.public_flags);
        for (const { flag, name: flagName } of publicFlagsToBadge) {
            if ((userPublicFlags & flag) !== 0n) {
                if (flagToBadgeFile[flagName] && !addedFlags.has(flagName)) {
                    try {
                        const badgePath = path.join(BADGES_DIR, flagToBadgeFile[flagName]);
                        const badgeImg = await loadImage(badgePath);
                        badges.push({ canvas: badgeImg, x: 0, y: 15, w: 60 });
                        addedFlags.add(flagName);
                    } catch (err) {
                        console.error('[ProfileCard] Failed to load badge:', flagName, err.message);
                    }
                }
            }
        }
    }
    
    for (const flag of userFlags) {
        if (flagToBadgeFile[flag] && !addedFlags.has(flag)) {
            try {
                const badgePath = path.join(BADGES_DIR, flagToBadgeFile[flag]);
                const badgeImg = await loadImage(badgePath);
                badges.push({ canvas: badgeImg, x: 0, y: 15, w: 60 });
                addedFlags.add(flag);
            } catch (err) {
                console.error('[ProfileCard] Failed to load badge:', flag, err.message);
            }
        }
    }
    
    const legacyUsername = userData?.legacy_username;
    if (legacyUsername) {
        try {
            const legacyPath = path.join(BADGES_DIR, 'originally_known_as.png');
            const legacyBadge = await loadImage(legacyPath);
            badges.push({ canvas: legacyBadge, x: 0, y: 15, w: 60 });
        } catch (err) {
            console.error('[ProfileCard] Failed to load legacy username badge:', err.message);
        }
    }
    
    if (userData?.premium_type) {
        try {
            const nitroFile = userData.premium_type === 1 ? 'nitro_basic.png' : 'nitro.png';
            const nitroPath = path.join(BADGES_DIR, nitroFile);
            const nitroBadge = await loadImage(nitroPath);
            badges.push({ canvas: nitroBadge, x: 0, y: 15, w: 60 });
        } catch (err) {
            console.error('[ProfileCard] Failed to load nitro badge:', err.message);
        }
    } else if (userData?.avatar_decoration_data || userData?.collectibles) {
        try {
            const nitroPath = path.join(BADGES_DIR, 'nitro.png');
            const nitroBadge = await loadImage(nitroPath);
            badges.push({ canvas: nitroBadge, x: 0, y: 15, w: 60 });
        } catch (err) {
            console.error('[ProfileCard] Failed to load nitro badge:', err.message);
        }
    }
    
    if (options?.customBadges?.length) {
        if (options.overwriteBadges) badges.splice(0, badges.length);
        for (const customBadge of options.customBadges) {
            try {
                const badgeImg = await loadImage(customBadge);
                badges.push({ canvas: badgeImg, x: 10, y: 22, w: 46 });
            } catch {}
        }
    }
    
    return { badges, clanData: null, userData };
}

async function genBotBadge(user, options, textLength) {
    const canvas = createCanvas(885, 303);
    const ctx = canvas.getContext('2d');
    
    const badgeName = user.flags?.has('VerifiedBot') ? 'botVerif' : 'botNoVerif';
    const botBadge = await loadImage(Buffer.from(profileImages.otherImgs[badgeName], 'base64'));
    ctx.drawImage(botBadge, textLength + 310, 110);
    
    return canvas;
}

function genXpBar(options) {
    const { currentXp, requiredXp, level, rank, barColor, levelColor, autoColorRank } = options.rankData;
    
    const canvas = createCanvas(885, 303);
    const ctx = canvas.getContext('2d');
    const mY = 8;
    
    ctx.fillStyle = '#000';
    ctx.globalAlpha = alphaValue;
    ctx.beginPath();
    ctx.roundRect(304, 248, 380, 33, [12]);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    const rankString = !isNaN(rank) ? `RANK #${abbreviateNumber(rank)}` : '';
    const lvlString = !isNaN(level) ? `Lvl ${abbreviateNumber(level)}` : '';
    
    const font = options?.font ? FONTS[options.font] : FONTS.HELVETICA;
    const boldFont = font.bold;
    const regularFont = font.regular;
    
    ctx.font = `21px ${regularFont}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#dadada';
    ctx.fillText(`${abbreviateNumber(currentXp)} / ${abbreviateNumber(requiredXp)} XP`, 314, 273);
    
    const rankColors = { gold: '#F1C40F', silver: '#a1a4c9', bronze: '#AD8A56', current: '#dadada' };
    const rankMapping = { 'RANK #1': rankColors.gold, 'RANK #2': rankColors.silver, 'RANK #3': rankColors.bronze };
    
    if (autoColorRank && rankMapping[rankString]) rankColors.current = rankMapping[rankString];
    
    ctx.font = `bold 21px ${boldFont}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = rankColors.current;
    ctx.fillText(rankString, 674 - ctx.measureText(lvlString).width - 10, 273);
    
    ctx.fillStyle = levelColor ? parseHex(levelColor) : '#dadada';
    ctx.fillText(lvlString, 674, 273);
    
    ctx.globalAlpha = alphaValue;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.roundRect(304, 187 - mY, 557, 36, [14]);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    ctx.beginPath();
    ctx.roundRect(304, 187 - mY, 557, 36, [14]);
    ctx.clip();
    
    const barColors = Array.isArray(barColor) ? barColor : [barColor || '#fff'];
    const barWidth = Math.round((currentXp * 556) / requiredXp);
    const grd = ctx.createLinearGradient(304, 197, 860, 197);
    
    for (let i = 0; i < barColors.length; i++) {
        const stop = i / (barColors.length - 1 || 1);
        grd.addColorStop(stop, parseHex(barColors[i]));
    }
    
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.roundRect(304, 187 - mY, barWidth, 36, [14]);
    ctx.fill();
    
    return canvas;
}

async function profileImage(user, options = {}) {
    registerFonts(options.font || 'HELVETICA');
    
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 512 });
    const bannerURL = user.bannerURL ? user.bannerURL({ extension: 'png', size: 512 }) : null;
    
    const canvas = createCanvas(885, 303);
    const ctx = canvas.getContext('2d');
    
    if (options.removeBorder) {
        ctx.roundRect(9, 9, 867, 285, [26]);
    } else {
        ctx.roundRect(0, 0, 885, 303, [34]);
    }
    ctx.clip();
    
    const badgeResult = await getBadges(user, options);
    const { badges, clanData } = badgeResult;
    
    const cardBase = await genBase(options, avatarURL, bannerURL);
    ctx.drawImage(cardBase, 0, 0);
    
    const hasClan = clanData && clanData.tag;
    const cardFrame = await genFrame(hasClan ? 0 : badges.length, options);
    ctx.drawImage(cardFrame, 0, 0);
    
    const cardTextAndAvatar = await genTextAndAvatar(user, options, avatarURL);
    const textAvatarShadow = addShadow(cardTextAndAvatar);
    ctx.drawImage(textAvatarShadow, 0, 0);
    ctx.drawImage(cardTextAndAvatar, 0, 0);
    
    if (options.borderColor) {
        const border = await genBorder(options);
        ctx.drawImage(border, 0, 0);
    }
    
    if (user.bot) {
        const tempCanvas = createCanvas(885, 303);
        const tempCtx = tempCanvas.getContext('2d');
        const font = options?.font ? FONTS[options.font] : FONTS.HELVETICA;
        const { textLength } = parseUsername(options?.customUsername || user.globalName || user.username, tempCtx, font.bold, '80', 470, true);
        
        const botBadge = await genBotBadge(user, options, textLength);
        const shadowBadge = addShadow(botBadge);
        ctx.drawImage(shadowBadge, 0, 0);
        ctx.drawImage(botBadge, 0, 0);
    }
    
    if (hasClan) {
        const clanTagCanvas = await genClanTag(clanData, options);
        if (clanTagCanvas) {
            const clanShadow = addShadow(clanTagCanvas);
            ctx.drawImage(clanShadow, 0, 0);
            ctx.drawImage(clanTagCanvas, 0, 0);
        }
    } else if (!options.removeBadges && badges.length > 0) {
        const cardBadges = await genBadges(badges);
        const badgesShadow = addShadow(cardBadges);
        ctx.drawImage(badgesShadow, 0, 0);
        ctx.drawImage(cardBadges, 0, 0);
    }
    
    if (options.rankData) {
        const xpBar = genXpBar(options);
        ctx.drawImage(xpBar, 0, 0);
    }
    
    if (!options.removeAvatarDecoration) {
        const avatarDecoration = await genAvatarDecoration(user, options);
        if (avatarDecoration) {
            ctx.drawImage(avatarDecoration, 0, 0);
        }
    }
    
    return canvas.toBuffer('image/png');
}

module.exports = { profileImage, FONTS };
