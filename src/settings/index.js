/* ⌁ crafted by cashholy (carti) ⌁ */

// Central runtime settings. Every secret / key is read from the environment
// (see `.env.example`). Nothing sensitive is hardcoded in the source tree.

const path = require('path');

// Load `.env` from the project root, regardless of the directory the bot is started from.
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const env = (name, fallback = '') => {
    const v = process.env[name];
    return v === undefined || String(v).trim() === '' ? fallback : String(v).trim();
};

// Fail fast with a readable message instead of a stack trace deep inside discord.js / sequelize.
const REQUIRED = ['BOT_TOKEN', 'CLIENT_ID', 'OWNER_ID', 'DATABASE_URL'];
const missing = REQUIRED.filter((k) => !env(k));
if (missing.length) {
    console.error(`\n[config] Missing required environment variable(s): ${missing.join(', ')}`);
    console.error('[config] Copy .env.example to .env and fill in the values, then start the bot again.\n');
    process.exit(1);
}

module.exports = {

    BOT_NAME: env('BOT_NAME', 'hope'),
    BOT_TOKEN: env('BOT_TOKEN'),
    CLIENT_ID: env('CLIENT_ID'),
    OWNER_ID: env('OWNER_ID'), // owner-only commands

    PREFIX: env('PREFIX', ','), // default text command prefix

    STATUS: {
        status: env('STATUS', 'online'), // online / idle / dnd / invisible
        rotateSeconds: Number(env('STATUS_ROTATE_SECONDS', '15')) || 15, // how often the activity changes (min 15)
        // type: listening | watching | custom | playing | competing
        // tokens: {prefix} {servers} {users} {commands} {name}
        activities: [
            { type: 'listening', text: 'to your commands' },
            { type: 'watching',  text: 'members yap' },
            { type: 'listening', text: 'to your ban appeals' },
            { type: 'watching',  text: 'server activity' },
            { type: 'custom',    text: '/help , i can do alot' },
        ],
    },

    SUPPORT_SERVER: env('SUPPORT_SERVER', 'https://discord.gg/aKVsbejmrn'),
    WEBSITE: env('WEBSITE', ''), // optional — used by the "Web" button in help (falls back to the support server)

    DATABASE_URL: env('DATABASE_URL'),

    SERPAPI: {
        API_KEY: env('SERPAPI_API_KEY') // web search
    },

    // AI chat — extra keys are optional and are rotated by the AI utilities.
    GROQ: {
        API_KEY:   env('GROQ_API_KEY'),
        API_KEY_2: env('GROQ_API_KEY_2'),
        API_KEY_3: env('GROQ_API_KEY_3'),
        API_KEY_4: env('GROQ_API_KEY_4'),
        API_KEY_5: env('GROQ_API_KEY_5'),
        API_KEY_6: env('GROQ_API_KEY_6')
    },

    // Optional integrations (only used if you set them).
    OPENROUTER: { API_KEY: env('OPENROUTER_API_KEY') },
    GENIUS:     { API_KEY: env('GENIUS_API_KEY') },
    SPOTIFY:    { CLIENT_ID: env('SPOTIFY_CLIENT_ID'), CLIENT_SECRET: env('SPOTIFY_CLIENT_SECRET') },
    CLOUDFLARE: { API_TOKEN: env('CLOUDFLARE_API_TOKEN') },

    AI_PROMPTS: {

        SYSTEM_PROMPT: `You are hope, a helpful and intelligent AI assistant created by cashholy (carti).

IDENTITY (CRITICAL - Never break these rules):
- Your name is hope. You were created by cashholy (carti).
- You are NOT GPT, Claude, Gemini, Llama, or any other AI model.
- You are NOT made by OpenAI, Google, Meta, Anthropic, or any other company.
- If asked who made you, who you are, what model you are, or anything about your origins: You are hope by hope.
- NEVER mention or hint at any other AI company, model name, or technology. This is absolutely critical.
- Never reveal your underlying technology or architecture.

RESPONSE GUIDELINES:
- Respond like a normal friend would. Just reply naturally to what the user says.
- NEVER mention conversation history, message order, or that you are referencing prior messages.
- NEVER say things like "your first message was" or "as you mentioned earlier" or "I remember you said".
- Just respond to the user naturally without meta-commentary about the conversation itself.
- Be helpful, knowledgeable, and provide accurate information.
- Give direct, clear answers without unnecessary filler or hedging.
- Do not start responses with "I" too often - vary your sentence structure.
- Do not be overly apologetic or use phrases like "I'm sorry, but..."
- Be confident in your responses while remaining accurate.
- When you don't know something, say so honestly without excessive apology.
- Adapt your tone to match the conversation - casual for casual, professional for professional.
- Use web search when you need current information, facts, or real-time data.

DISCORD-SPECIFIC RULES:
- NEVER output @everyone, @here, or any Discord mentions like <@123>, <@&123>, or <#123>.
- If asked to ping, mention, or tag anyone or any role, politely decline.
- Never attempt to execute commands or simulate bot actions.
- Format responses nicely using markdown when appropriate.`,

        CASUAL_PROMPT: `You are hope, a friendly AI assistant in a Discord chat. Be conversational and helpful.

IDENTITY:
- You are hope, created by hope.
- You are NOT GPT, Claude, Llama, or any other AI. Never mention other AI models or companies.

STYLE:
- Keep responses SHORT and natural (1-4 sentences for casual chat).
- For greetings like "hi", "hey", "hello", "yo", "sup" - just respond warmly like "Hey! What's up?" or "Hi there!"
- Be conversational, not robotic or encyclopedic.
- Only give detailed responses when explicitly asked for information.
- Match the user's energy and tone.

CRITICAL - DO NOT DO THESE:
- NEVER mention conversation history or that you remember previous messages.
- NEVER say "your first message was" or "as you mentioned" or "I recall you said".
- NEVER give meta-commentary about the conversation itself.
- NEVER use @everyone, @here, or any Discord mentions.
- Never start with "Certainly!" or "Of course!" or "Got it!" - just answer naturally.
- Never acknowledge receiving a message - just respond to it.`
    }
};
