<div align="center">

#  hope 

###  a multipurpose Discord bot — moderation, security, community & AI 

![node](https://img.shields.io/badge/node-%E2%89%A5%2020-5a67d8?style=for-the-badge)
![discord.js](https://img.shields.io/badge/discord.js-v14-7289da?style=for-the-badge)
![database](https://img.shields.io/badge/database-PostgreSQL-336791?style=for-the-badge)
![license](https://img.shields.io/badge/license-ISC-2ea44f?style=for-the-badge)

** Developed & maintained by [cashholy (carti)](#-about-the-developer) **

</div>

---

##  Overview

**hope** is a feature-rich, multipurpose Discord bot built on **discord.js v14** with a
**PostgreSQL** (Sequelize) backend. It ships with slash commands, prefix commands and
*hybrid* commands that answer to both, a polished **Components V2** interface, an anti-nuke
and auto-moderation suite, a full ticket system, giveaways, AI chat, server
statistics and **13 languages**.

##  Features

| | Area | What you get |
|---|---|---|
| 🛡️ | **Security** | Anti-nuke protection, auto-moderation (spam, links, caps, invites, mass mentions, bad words), whitelists |
| 🔨 | **Moderation** | Ban, kick, mute, softban, temp-ban, temp-role, warnings, slowmode, purge, channel lock / hide / nuke / clone |
| 🪄 | **Community** | Welcome & farewell panels, boost messages, reaction roles, vanity roles, auto-roles, autoreact |
| 🎟️ | **Tickets** | Panels, automation and management for support tickets |
| 🎁 | **Giveaways** | Start, end and reroll giveaways with live handling |
| 🎙️ | **Voicemaster** | Private voice rooms that members control themselves |
| 🤖 | **AI** | AI chat channels, analysis, text-to-speech, image generation, web search |
| 📊 | **Stats** | Server, role, channel, join-position, emoji and message/voice/invite statistics with charts |
| 🪞 | **Profiles** | Customizable profile cards with badges and backgrounds |
| 🧶 | **Utility** | Snipe / editsnipe, AFK, reminders, todo list, embed & container builders, news, Wikipedia, GitHub, YouTube |
| 🪼 | **Fun** | Animal pictures & facts, roleplay GIFs, ship cards, profile-picture galleries |
| 🌐 | **Languages** | English, Hindi, Spanish, French, German, Portuguese (BR), Russian, Turkish, Indonesian, Japanese, Korean, Chinese (Simplified), Arabic |

> 🔮 Most features are available as **slash**, **prefix** and **hybrid** commands. Use `/help`
> (or `<prefix>help`) in Discord to browse everything that is currently loaded.

## 🛸 Requirements

- 🟢 **Node.js 20 or newer** (22 LTS recommended)
- 🐘 A **PostgreSQL** database (Neon, Supabase, Railway, or your own server)
- 🤖 A Discord application with a bot user
- ⚙️ **Privileged intents** enabled in the Developer Portal: **Server Members**, **Presence** and **Message Content**

## 🪐 Quick start

```bash
# 1. install dependencies
npm install

# 2. create your environment file
cp .env.example .env        # then open .env and fill in your values

# 3. start the bot
npm start
```

On first boot the bot connects to the database, creates/syncs all tables automatically,
registers slash commands globally (only when the command set changed) and logs in.

## 🗝️ Environment variables

All tokens and keys are read from the environment — **nothing sensitive lives in the source code**.
Copy `.env.example` to `.env` (which is git-ignored) and fill it in.
If a required value is missing the bot stops immediately with a clear message.

| Variable | Required | Purpose |
|---|:---:|---|
| `BOT_TOKEN` | ✅ | Discord bot token |
| `CLIENT_ID` | ✅ | Application (client) ID |
| `OWNER_ID` | ✅ | Your Discord user ID — unlocks owner-only commands |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `BOT_NAME` | — | Display name (default `hope`) |
| `PREFIX` | — | Default text-command prefix (default `,`) |
| `STATUS`, `STATUS_ROTATE_SECONDS` | — | Presence status and activity rotation speed |
| `SUPPORT_SERVER`, `WEBSITE` | — | Links used by the help / invite buttons |
| `GROQ_API_KEY` (`_2` … `_6`) | — | AI chat & TTS (extra keys are rotated) |
| `SERPAPI_API_KEY` | — | `/google` web search |
| `BYTEZ_API_KEY` | — | Image generation command |
| `GUARD_AI_MODEL` | — | Override for the moderation guard model |
| `OPENROUTER_API_KEY`, `GENIUS_API_KEY`, `SPOTIFY_*`, `CLOUDFLARE_API_TOKEN` | — | Optional integrations |

> 🧿 **Security tip:** if a token or key was ever shared, committed or pasted anywhere public,
> regenerate it in its provider's dashboard before going live.

## 🪢 Project structure

```text
hope/
├── src/
│   ├── bootstrap.js        🚀 entry point (startup flow)
│   ├── settings/           ⚙️  env-driven configuration (+ log-channel settings)
│   ├── modules/
│   │   ├── interactions/   ✨ slash commands
│   │   ├── text/           💬 prefix commands
│   │   └── dual/           🔀 hybrid commands (slash + prefix)
│   ├── events/             📡 gateway events, anti-nuke, automod, logging, interaction handlers
│   ├── services/           🧰 shared helpers: UI builders, cards, loaders, AI utils, logging
│   ├── database/           🗄️  Sequelize connection + data-access modules
│   │   └── schemas/        📐 database models
│   ├── localization/       🌐 i18n engine and locale files
│   ├── media/              🖼️  fonts, badges, image & emoji data
│   └── bundled/            📦 bundled static assets
├── tools/                  🔧 i18n check / test scripts
├── .env.example            🗝️  environment template
├── .gitignore
├── LICENSE
└── package.json
```

## 🧬 Useful scripts

| Command | What it does |
|---|---|
| `npm start` | Starts the bot |
| `npm run check:i18n` | Verifies that all locale files are complete |
| `npm run test:i18n` | Runs the localization tests |

## 🪆 Troubleshooting

- **`Missing required environment variable(s)`** — create `.env` from `.env.example` and fill in the required values.
- **`Database initialization failed`** — check that `DATABASE_URL` is correct, reachable from your host, and includes `?sslmode=require` if your provider needs SSL.
- **Slash commands don't show up** — they are registered globally and may take a short while to appear; the bot only re-registers when its command set changes.
- **`libuuid.so.1: cannot open shared object file`** (Linux) — install the system library, e.g. `sudo apt install libuuid1`.
- **Missing member / message data** — make sure the three privileged intents are enabled for your bot.

## 🏮 About the developer

<div align="center">

**🪩 cashholy (carti) 🪩**
*creator & maintainer of hope*

</div>

hope is designed, built and maintained by **cashholy (carti)**.
If you fork, modify or redistribute this project, please **keep the credit notices intact**:
the developer credit at the top of every source file, the `LICENSE`, and this section.

## 📜 License

Released under the **ISC License** — see [`LICENSE`](./LICENSE) for the full text,
including third-party notices.

Two files, `src/database/schemas/AFK.js` and `src/database/schemas/Todo.js`, retain the
original copyright notice of their author (**kenndeclouv**) and must keep it.

---

<div align="center">

🪬 *crafted with care by* **cashholy (carti)** 🪬

</div>
