// [dev] cashholy (carti) :: modules/dual/settings/settings.js

// hope — /settings (alias: customize)
//
// One dropdown-driven panel to customise the bot inside a single server:
// name, avatar, banner, bio (+ support link), name style, accent colour,
// prefix, mention reply, reset. The main dropdown stays on every screen.

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ComponentType,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  REST,
  Routes,
} = require('discord.js');
const ui = require('../../../services/ui');
const config = require('../../../settings');
const branding = require('../../../services/branding');
const emojis = require('../../../media/emojis.json');
const { BotCustomization, GuildPrefix } = require('../../../database/schemas');

const V2 = MessageFlags.IsComponentsV2;
const SUPPORT = config.SUPPORT_SERVER;
const BIO_MAX = 190;

/* ── name style data (see Bot-NameStyles guide) ────────────────────── */

const FONTS = [
  [11, 'Default'], [1, 'Bangers'], [2, 'BioRhyme'], [3, 'Cherry Bomb'], [4, 'Chicle'], [5, 'Compagnon'],
  [6, 'MuseoModerno'], [7, 'Neo-Castel'], [8, 'Pixelify Sans'], [9, 'Ribes'], [10, 'Sinistre'], [12, 'Zilla Slab'],
];
const EFFECTS = [[1, 'Solid'], [2, 'Gradient'], [3, 'Neon'], [4, 'Toon'], [5, 'Pop'], [6, 'Glow']];
const fontName = (id) => FONTS.find(f => f[0] === id)?.[1] ?? `#${id}`;
const effectName = (id) => EFFECTS.find(e => e[0] === id)?.[1] ?? `#${id}`;

const COLOR_ONE = {
  white: ['White', 0xFFFFFF], blurple: ['Blurple', 0x5865F2], green: ['Green', 0x57F287], red: ['Red', 0xED4245],
  yellow: ['Yellow', 0xFEE75C], pink: ['Pink', 0xFF00FF], purple: ['Purple', 0x800080], blue: ['Blue', 0x0016E9],
  gold: ['Gold', 0xFFD700], cyan: ['Cyan', 0x00FFFF], black: ['Black', 0x000000],
};
const COLOR_TWO = {
  sunset: ['Sunset', 0xFF512F, 0xF09819], ocean: ['Ocean', 0x2193B0, 0x6DD5ED], aurora: ['Aurora', 0x00C9FF, 0x92FE9D],
  candy: ['Candy', 0xFF00FF, 0x00FFFF], ember: ['Ember', 0xED4245, 0xFEE75C],
};

const ACCENTS = {
  default: ['Default grey', null], blurple: ['Blurple', 0x5865F2], green: ['Green', 0x57F287], red: ['Red', 0xED4245],
  orange: ['Orange', 0xFFA500], yellow: ['Yellow', 0xFEE75C], pink: ['Pink', 0xFF69B4], purple: ['Purple', 0x9B59B6],
  blue: ['Blue', 0x3B82F6], cyan: ['Cyan', 0x00D9FF], gold: ['Gold', 0xFFD700], white: ['White', 0xE6E6E6],
};

/* ── helpers ───────────────────────────────────────────────────────── */

const hex = (n) => '#' + n.toString(16).padStart(6, '0').toUpperCase();
const parseHex = (s) => (/^#?[0-9a-f]{6}$/i.test(String(s).trim()) ? parseInt(String(s).trim().replace('#', ''), 16) : null);

function lighten(n, f = 0.45) {
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => Math.round(c + (255 - c) * f));
  return (ch[0] << 16) | (ch[1] << 8) | ch[2];
}

const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));

function composeBio(userBio) {
  const room = BIO_MAX - SUPPORT.length - 1;
  const text = (userBio || '').trim().slice(0, room);
  return text ? `${text}\n${SUPPORT}` : null; // null → the bot's default bio
}

function describeStyle(s) {
  if (!s) return 'None';
  return `${fontName(s.font)} · ${effectName(s.effect)} · ${s.colors.map(hex).join(' ')}`;
}

function errorText(err) {
  const code = err?.status ?? err?.rawError?.code;
  const raw = err?.rawError?.message ?? err?.message ?? 'Something went wrong';
  if (err?.status === 403 || code === 50013) return 'I am missing the **Change Nickname** permission';
  if (err?.status === 429) return 'Rate limited — try again in a moment';
  return clip(raw, 140);
}

const PRIVATE_HOST = /^(localhost|127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?f[cd][0-9a-f]{2}:)/i;

async function toDataUri(link) {
  let url;
  try { url = new URL(link.trim()); } catch (_) { throw new Error('Enter a valid image link'); }
  if (!/^https?:$/.test(url.protocol) || PRIVATE_HOST.test(url.hostname)) throw new Error('Enter a public image link');
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Could not download the image (${res.status})`);
  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!/^image\/(png|jpe?g|gif|webp)$/.test(type)) throw new Error('Use a png, jpg, gif or webp image');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 8 * 1024 * 1024) throw new Error('Image is larger than 8 MB');
  return `data:${type};base64,${buf.toString('base64')}`;
}

function textModal(id, title, label, { value, placeholder, max = 100, min = 0, paragraph = false, required = false } = {}) {
  const input = new TextInputBuilder()
    .setCustomId('value')
    .setLabel(label)
    .setStyle(paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short)
    .setRequired(required)
    .setMaxLength(max)
    .setMinLength(min);
  if (value) input.setValue(String(value).slice(0, max));
  if (placeholder) input.setPlaceholder(placeholder);
  return new ModalBuilder().setCustomId(id).setTitle(title).addComponents(new ActionRowBuilder().addComponents(input));
}

/* ── command ───────────────────────────────────────────────────────── */

const ID = {
  main: 'hope_set_main', font: 'hope_set_font', effect: 'hope_set_effect', color: 'hope_set_color',
  accent: 'hope_set_accent', reset: 'hope_set_reset',
};

const MAIN_OPTIONS = (state, data) => [
  { label: 'Name', value: 'name', description: 'Server nickname' },
  { label: 'Avatar', value: 'avatar', description: 'Server avatar from an image link' },
  { label: 'Banner', value: 'banner', description: 'Server banner from an image link' },
  { label: 'Bio', value: 'bio', description: 'Your text, then the support link' },
  { label: 'Name style', value: 'style', description: 'Font, effect and colours' },
  { label: 'Accent colour', value: 'accent', description: 'Colour of my replies in this server' },
  { label: 'Prefix', value: 'prefix', description: `Currently ${data.prefix}` },
  { label: `Mention reply: ${data.cust.mentionReply ? 'On' : 'Off'}`, value: 'mention', description: 'Greet when I am mentioned alone' },
  { label: 'Reset', value: 'reset', description: 'Back to defaults' },
].map(o => ({ ...o, default: o.value === state.view }));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Customize the bot for this server')
    .setDMPermission(false),

  name: 'settings',
  aliases: ['customize', 'custom'],
  description: 'Customize the bot for this server',
  category: 'general',

  async execute(ctx) {
    const guild = ctx.guild;
    const user = ctx.user ?? ctx.author;
    if (!guild) return ui.say.error(ctx, 'Use this in a server');

    const member = ctx.member ?? (await guild.members.fetch(user.id).catch(() => null));
    const allowed = guild.ownerId === user.id || member?.permissions?.has(PermissionFlagsBits.Administrator);
    if (!allowed) return ui.say.error(ctx, 'Only server administrators can use this');

    const client = ctx.client;
    const rest = new REST({ version: '10' }).setToken(client.token);
    const patchMe = (body) => rest.patch(Routes.guildMember(guild.id, '@me'), { body });

    const state = { view: 'home', style: null, note: null };
    let data = { cust: { accentColor: null, userBio: null, nameStyle: null, mentionReply: true }, prefix: config.PREFIX, nick: null, avatar: null };

    async function refresh() {
      const [cust, prefix, me] = await Promise.all([
        BotCustomization.read(guild.id),
        GuildPrefix.getPrefix(guild.id),
        Promise.resolve(guild.members.fetchMe ? guild.members.fetchMe({ force: true }) : guild.members.me).catch(() => guild.members.me),
      ]);
      data = {
        cust,
        prefix: prefix || config.PREFIX,
        nick: me?.nickname ?? null,
        avatar: (me ?? client.user).displayAvatarURL({ size: 128 }),
      };
      state.style = cust.nameStyle ? { ...cust.nameStyle, colors: [...cust.nameStyle.colors] } : state.style;
    }

    /* ── rendering ─────────────────────────────────────────────────── */

    function build(disabled = false) {
      const c = ui.box();
      c.addTextDisplayComponents(ui.text('## Customize\nChange my name, look, bio and behaviour in this server.'));
      c.addSeparatorComponents(ui.sep());
      c.addActionRowComponents(ui.row(ui.select(ID.main, 'Choose what to customize…', MAIN_OPTIONS(state, data), { disabled })));

      if (state.view === 'style') {
        const st = state.style;
        c.addSeparatorComponents(ui.sep(false));
        c.addTextDisplayComponents(ui.text(`**Name style**\n-# ${describeStyle(st)}`));
        c.addActionRowComponents(ui.row(ui.select(ID.font, 'Font', [
          { label: 'None (remove style)', value: 'none' },
          ...FONTS.map(([id, name]) => ({ label: name, value: String(id), default: st?.font === id })),
        ], { disabled })));
        c.addActionRowComponents(ui.row(ui.select(ID.effect, 'Effect', EFFECTS.map(([id, name]) => ({
          label: name, value: String(id), default: st?.effect === id, description: id === 2 ? 'Uses two colours' : undefined,
        })), { disabled })));
        const cur = st?.colors ?? [];
        const colorOpts = [
          ...Object.entries(COLOR_ONE).map(([k, [name, v]]) => ({ label: name, value: `c:${k}`, default: cur.length === 1 && cur[0] === v })),
          ...Object.entries(COLOR_TWO).map(([k, [name, a, b]]) => ({
            label: name, value: `g:${k}`, description: `${hex(a)} → ${hex(b)}`, default: cur.length === 2 && cur[0] === a && cur[1] === b,
          })),
          { label: 'Custom hex…', value: 'custom', description: 'One or two hex codes' },
        ];
        c.addActionRowComponents(ui.row(ui.select(ID.color, 'Colours', colorOpts, { disabled })));
      }

      if (state.view === 'accent') {
        const cur = data.cust.accentColor;
        c.addSeparatorComponents(ui.sep(false));
        c.addTextDisplayComponents(ui.text(`**Accent colour**\n-# Applies to my replies in this server`));
        const opts = [
          ...Object.entries(ACCENTS).map(([k, [name, v]]) => ({
            label: name, value: k, description: v == null ? undefined : hex(v), default: (cur ?? null) === v,
          })),
          { label: 'Custom hex…', value: 'custom', description: 'Any 6-digit hex code' },
        ];
        c.addActionRowComponents(ui.row(ui.select(ID.accent, 'Pick a colour…', opts, { disabled })));
      }

      if (state.view === 'reset') {
        c.addSeparatorComponents(ui.sep(false));
        c.addTextDisplayComponents(ui.text('**Reset everything?**\n-# Name, avatar, banner, bio, style, accent and prefix'));
        c.addActionRowComponents(ui.row(ui.select(ID.reset, 'Confirm…', [
          { label: 'Reset everything', value: 'yes' },
          { label: 'Keep my settings', value: 'no' },
        ], { disabled })));
      }

      if (state.note) {
        c.addSeparatorComponents(ui.sep(false));
        c.addTextDisplayComponents(ui.text(state.note));
      }
      return c;
    }

    const panel = (disabled = false) => branding.withGuild(guild.id, () => build(disabled));
    const ok = (t) => { state.note = `${emojis.success} ${t}`; };
    const bad = (t) => { state.note = `${emojis.error} ${t}`; };

    await refresh();
    const msg = await ui.send(ctx, panel());
    if (!msg?.createMessageComponentCollector) return msg;

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: ui.onlyUser(user.id),
      time: 600000,
    });

    /** Run `work` after acknowledging, then redraw the panel. */
    async function act(i, work) {
      await i.deferUpdate();
      try { await work(); } catch (err) { bad(errorText(err)); }
      try { await refresh(); } catch (_) {}
      await i.editReply({ components: [panel()], flags: V2 }).catch(() => {});
    }

    /** Show a modal, wait for it, then run `work(value)` and redraw. */
    async function ask(i, modal, work) {
      await i.showModal(modal);
      const sub = await i.awaitModalSubmit({
        time: 180000,
        filter: (m) => m.customId === modal.data.custom_id && m.user.id === user.id,
      }).catch(() => null);
      if (!sub) return;
      await sub.deferUpdate();
      try { await work(sub.fields.getTextInputValue('value').trim()); } catch (err) { bad(errorText(err)); }
      try { await refresh(); } catch (_) {}
      await sub.editReply({ components: [panel()], flags: V2 }).catch(() => {});
    }

    const modalId = (k) => `hope_set_modal_${k}_${msg.id}_${Date.now()}`;

    /* ── actions ───────────────────────────────────────────────────── */

    async function applyStyle() {
      const st = state.style;
      if (!st) return;
      if (st.effect === 2 && st.colors.length < 2) st.colors = [st.colors[0], lighten(st.colors[0])];
      await patchMe({ display_name_font_id: st.font, display_name_effect_id: st.effect, display_name_colors: st.colors });
      await BotCustomization.write(guild.id, { nameStyle: st });
      ok('Name style applied');
    }

    async function setAccent(color) {
      await BotCustomization.write(guild.id, { accentColor: color });
      branding.setAccent(guild.id, color);
      ok(color == null ? 'Accent reset' : `Accent ${hex(color)}`);
    }

    async function setImage(field, link) {
      if (!link) { await patchMe({ [field]: null }); ok(`${field === 'avatar' ? 'Avatar' : 'Banner'} removed`); return; }
      await patchMe({ [field]: await toDataUri(link) });
      ok(`${field === 'avatar' ? 'Avatar' : 'Banner'} updated`);
    }

    async function resetAll() {
      let memberError = null;
      try {
        await patchMe({
          nick: null, avatar: null, banner: null, bio: null, // null = fall back to the bot's own default bio
         
          display_name_font_id: null, display_name_effect_id: null, display_name_colors: null,
        });
      } catch (err) { memberError = err; }
      await BotCustomization.clear(guild.id);
      branding.setAccent(guild.id, null);
      await GuildPrefix.setPrefix(guild.id, config.PREFIX);
      state.style = null;
      if (memberError) bad(`Saved settings cleared, profile not reset: ${errorText(memberError)}`);
      else ok('Everything reset');
    }

    /* ── routing ───────────────────────────────────────────────────── */

    collector.on('collect', async (i) => {
      state.note = null;
      try {
        const v = i.values[0];

        if (i.customId === ID.main) {
          state.view = v;
          switch (v) {
            case 'name':
              state.view = 'home';
              return await ask(i, textModal(modalId('name'), 'Server name', 'Name (empty = reset)', { value: data.nick, max: 32 }),
                async (val) => { await patchMe({ nick: val || null }); ok(val ? 'Name updated' : 'Name reset'); });
            case 'avatar':
            case 'banner':
              state.view = 'home';
              return await ask(i, textModal(modalId(v), `Server ${v}`, 'Image link (empty = remove)', { placeholder: 'https://…/image.png', max: 500 }),
                (val) => setImage(v, val));
            case 'bio':
              state.view = 'home';
              return await ask(i, textModal(modalId('bio'), 'Server bio', 'Bio (empty = my default bio)', {
                value: data.cust.userBio, max: BIO_MAX - SUPPORT.length - 1, paragraph: true,
              }), async (val) => {
                // empty text = reset to the bot's default bio; otherwise your text + support link
                await patchMe({ bio: val ? composeBio(val) : null });
                await BotCustomization.write(guild.id, { userBio: val || null });
                ok(val ? 'Bio updated' : 'Bio reset to default');
              });
            case 'prefix':
              state.view = 'home';
              return await ask(i, textModal(modalId('prefix'), 'Prefix', 'Prefix (1-5 characters)', { value: data.prefix, max: 5, min: 1, required: true }),
                async (val) => {
                  if (!val || /\s/.test(val)) throw new Error('Prefix cannot be empty or contain spaces');
                  await GuildPrefix.setPrefix(guild.id, val);
                  ok(`Prefix set to \`${val}\``);
                });
            case 'mention':
              state.view = 'home';
              return await act(i, async () => {
                await BotCustomization.write(guild.id, { mentionReply: !data.cust.mentionReply });
                ok(`Mention reply ${data.cust.mentionReply ? 'off' : 'on'}`);
              });
            case 'style':
              if (!state.style && data.cust.nameStyle) state.style = { ...data.cust.nameStyle, colors: [...data.cust.nameStyle.colors] };
              return await act(i, async () => {});
            default:
              return await act(i, async () => {});
          }
        }

        if (i.customId === ID.font) {
          if (v === 'none') {
            return await act(i, async () => {
              await patchMe({ display_name_font_id: null, display_name_effect_id: null, display_name_colors: null });
              await BotCustomization.write(guild.id, { nameStyle: null });
              state.style = null;
              ok('Name style removed');
            });
          }
          return await act(i, async () => {
            const prev = state.style ?? { effect: 1, colors: [0xFFFFFF] };
            state.style = { font: Number(v), effect: prev.effect, colors: prev.colors };
            await applyStyle();
          });
        }

        if (i.customId === ID.effect) {
          return await act(i, async () => {
            const prev = state.style ?? { font: 11, colors: [0xFFFFFF] };
            state.style = { font: prev.font, effect: Number(v), colors: prev.colors };
            await applyStyle();
          });
        }

        if (i.customId === ID.color) {
          if (v === 'custom') {
            return await ask(i, textModal(modalId('color'), 'Name colours', 'Hex codes (one or two)', { placeholder: '#ff0000 #00ff00', max: 20, required: true }),
              async (val) => {
                const parts = val.split(/[\s,]+/).filter(Boolean).map(parseHex);
                if (!parts.length || parts.length > 2 || parts.some(p => p === null)) throw new Error('Enter one or two 6-digit hex codes');
                const prev = state.style ?? { font: 11, effect: 1 };
                state.style = { font: prev.font, effect: prev.effect, colors: parts };
                await applyStyle();
              });
          }
          return await act(i, async () => {
            const [kind, key] = v.split(':');
            const colors = kind === 'g' ? [COLOR_TWO[key][1], COLOR_TWO[key][2]] : [COLOR_ONE[key][1]];
            const prev = state.style ?? { font: 11, effect: 1 };
            const effect = kind === 'g' && prev.effect === 1 ? 2 : prev.effect;
            state.style = { font: prev.font, effect, colors };
            await applyStyle();
          });
        }

        if (i.customId === ID.accent) {
          if (v === 'custom') {
            return await ask(i, textModal(modalId('accent'), 'Accent colour', 'Hex code', { placeholder: '#5865F2', max: 7, min: 6, required: true }),
              async (val) => {
                const n = parseHex(val);
                if (n === null) throw new Error('Enter a 6-digit hex code');
                await setAccent(n);
              });
          }
          return await act(i, () => setAccent(ACCENTS[v][1]));
        }

        if (i.customId === ID.reset) {
          if (v === 'yes') { state.view = 'home'; return await act(i, resetAll); }
          state.view = 'home';
          return await act(i, async () => {});
        }
      } catch (err) {
        console.error('[settings]', err);
      }
    });

    collector.on('end', async () => {
      try { await msg.edit({ components: [panel(true)], flags: V2 }); } catch (_) {}
    });

    return msg;
  },
};
