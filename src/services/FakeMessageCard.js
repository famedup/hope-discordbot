/*
 * Developed by cashholy (carti)
 * File: services/FakeMessageCard.js
 */

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

class FakeMessageCard {
    constructor() {
        this.fontsRegistered = false;
        this.registerFonts();
    }

    registerFonts() {
        if (this.fontsRegistered) return;
        
        try {
            const fontPaths = [
                { path: path.join(process.cwd(), 'fonts'), context: 'root' },
                { path: path.join(process.cwd(), 'media', 'fonts'), context: 'media' },
                { path: path.join(process.cwd(), 'extras', 'fonts'), context: 'extras' },
            ];

            for (const fontPath of fontPaths) {
                try {
                    GlobalFonts.registerFromPath(
                        path.join(fontPath.path, 'Inter-Bold.ttf'),
                        'Inter Bold'
                    );
                    GlobalFonts.registerFromPath(
                        path.join(fontPath.path, 'Inter-SemiBold.ttf'),
                        'Inter SemiBold'
                    );
                    GlobalFonts.registerFromPath(
                        path.join(fontPath.path, 'Inter-Medium.ttf'),
                        'Inter Medium'
                    );
                    GlobalFonts.registerFromPath(
                        path.join(fontPath.path, 'Inter-Regular.ttf'),
                        'Inter'
                    );
                    this.fontsRegistered = true;
                    break;
                } catch (e) {
                    continue;
                }
            }
        } catch (e) {
            console.error('[FakeMessageCard] Font registration error:', e);
        }
    }

    static getThemes() {
        return {
            dark: {
                name: 'Dark',
                background: '#313338',
                text: '#DBDEE1',
                username: '#F2F3F5',
                timestamp: '#949BA4',
                badge: '#5865F2'
            },
            light: {
                name: 'Light',
                background: '#FFFFFF',
                text: '#313338',
                username: '#060607',
                timestamp: '#5C5E66',
                badge: '#5865F2'
            },
            amoled: {
                name: 'AMOLED',
                background: '#000000',
                text: '#DCDDDE',
                username: '#FFFFFF',
                timestamp: '#72767D',
                badge: '#5865F2'
            },
            midnight: {
                name: 'Midnight',
                background: '#0D1117',
                text: '#C9D1D9',
                username: '#F0F6FC',
                timestamp: '#8B949E',
                badge: '#5865F2'
            },
            forest: {
                name: 'Forest',
                background: '#1A2F1A',
                text: '#C8E6C9',
                username: '#E8F5E9',
                timestamp: '#81C784',
                badge: '#4CAF50'
            },
            ocean: {
                name: 'Ocean',
                background: '#0D1B2A',
                text: '#B8C5D6',
                username: '#E0E8F0',
                timestamp: '#6B8CAE',
                badge: '#1E88E5'
            },
            sunset: {
                name: 'Sunset',
                background: '#2D1B1B',
                text: '#F5D6C6',
                username: '#FFE8DC',
                timestamp: '#D4A088',
                badge: '#FF7043'
            },
            purple: {
                name: 'Purple',
                background: '#1E1B2E',
                text: '#D4C6F5',
                username: '#EDE8FF',
                timestamp: '#9D88D4',
                badge: '#9C27B0'
            }
        };
    }

    static getThemeChoices() {
        const themes = FakeMessageCard.getThemes();
        return Object.entries(themes).map(([key, value]) => ({
            name: value.name,
            value: key
        }));
    }

    async generate(options) {
        const {
            username,
            message,
            avatarURL,
            avatarDecorationURL = null,
            theme = 'dark',
            timestamp = null,
            bot = false,
            verified = false
        } = options;

        const themes = FakeMessageCard.getThemes();
        const themeConfig = themes[theme] || themes.dark;

        const scale = 2;
        const padding = 16 * scale;
        const avatarSize = 40 * scale;
        const decorationSize = 52 * scale;
        const lineHeight = 22 * scale;
        const maxWidth = 600 * scale;
        const textAreaWidth = maxWidth - padding * 2 - avatarSize - 16 * scale;

        const tempCanvas = createCanvas(1, 1);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = `${16 * scale}px "Inter", "Segoe UI", Arial, sans-serif`;

        const words = message.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = tempCtx.measureText(testLine);
            
            if (metrics.width > textAreaWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }

        const textHeight = lines.length * lineHeight;
        const decorationOffset = (decorationSize - avatarSize) / 2;
        const height = Math.max(padding * 2 + avatarSize + decorationOffset, padding * 2 + 24 * scale + textHeight);
        
        const canvas = createCanvas(maxWidth, height);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = themeConfig.background;
        ctx.fillRect(0, 0, maxWidth, height);

        const avatarX = padding;
        const avatarY = padding;
        const avatarCenterX = avatarX + avatarSize / 2;
        const avatarCenterY = avatarY + avatarSize / 2;

        try {
            const avatar = await loadImage(avatarURL);
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();
        } catch (e) {
            ctx.fillStyle = themeConfig.badge;
            ctx.beginPath();
            ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold ${18 * scale}px "Inter Bold", "Segoe UI", Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(username.charAt(0).toUpperCase(), avatarCenterX, avatarCenterY);
        }

        if (avatarDecorationURL) {
            try {
                const decoration = await loadImage(avatarDecorationURL);
                const decoX = avatarCenterX - decorationSize / 2;
                const decoY = avatarCenterY - decorationSize / 2;
                ctx.drawImage(decoration, decoX, decoY, decorationSize, decorationSize);
            } catch (e) {
                console.error('[FakeMessageCard] Failed to load avatar decoration:', e.message);
            }
        }

        const textX = avatarX + avatarSize + 16 * scale;
        let currentY = padding + 4 * scale;

        ctx.font = `bold ${16 * scale}px "Inter Bold", "Segoe UI", Arial, sans-serif`;
        ctx.fillStyle = themeConfig.username;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const usernameMetrics = ctx.measureText(username);
        ctx.fillText(username, textX, currentY);
        
        let badgeX = textX + usernameMetrics.width + 6 * scale;

        if (bot) {
            const badgeText = 'APP';
            ctx.font = `${10 * scale}px "Inter SemiBold", "Segoe UI", Arial, sans-serif`;
            const textWidth = ctx.measureText(badgeText).width;
            const checkmarkSpace = 12 * scale;
            const badgeWidth = textWidth + checkmarkSpace + 10 * scale;
            const badgeHeight = 15 * scale;
            
            ctx.fillStyle = '#5865F2';
            ctx.beginPath();
            ctx.roundRect(badgeX, currentY + 2 * scale, badgeWidth, badgeHeight, 3 * scale);
            ctx.fill();
            
            const checkX = badgeX + 5 * scale;
            const checkY = currentY + 9 * scale;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5 * scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(checkX, checkY);
            ctx.lineTo(checkX + 2.5 * scale, checkY + 2.5 * scale);
            ctx.lineTo(checkX + 6 * scale, checkY - 2 * scale);
            ctx.stroke();
            
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'left';
            ctx.fillText(badgeText, badgeX + checkmarkSpace + 2 * scale, currentY + 5 * scale);
            
            badgeX += badgeWidth + 6 * scale;
        }

        if (verified) {
            ctx.fillStyle = '#5865F2';
            ctx.beginPath();
            ctx.arc(badgeX + 7 * scale, currentY + 9 * scale, 7 * scale, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2 * scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(badgeX + 4 * scale, currentY + 9 * scale);
            ctx.lineTo(badgeX + 6 * scale, currentY + 11 * scale);
            ctx.lineTo(badgeX + 10 * scale, currentY + 7 * scale);
            ctx.stroke();
            
            badgeX += 20 * scale;
        }

        const displayTimestamp = timestamp || this.getCurrentTimestamp();
        ctx.font = `${12 * scale}px "Inter", "Segoe UI", Arial, sans-serif`;
        ctx.fillStyle = themeConfig.timestamp;
        ctx.textAlign = 'left';
        ctx.fillText(displayTimestamp, badgeX, currentY + 3 * scale);

        currentY += 22 * scale;

        ctx.font = `${16 * scale}px "Inter", "Segoe UI", Arial, sans-serif`;
        ctx.fillStyle = themeConfig.text;
        ctx.textAlign = 'left';

        for (const line of lines) {
            ctx.fillText(line, textX, currentY);
            currentY += lineHeight;
        }

        return canvas.toBuffer('image/png');
    }

    getCurrentTimestamp() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `Today at ${displayHours}:${minutes} ${ampm}`;
    }
}

const instance = new FakeMessageCard();
instance.getThemes = FakeMessageCard.getThemes;
instance.getThemeChoices = FakeMessageCard.getThemeChoices;
module.exports = instance;
