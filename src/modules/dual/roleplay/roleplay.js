// [dev] cashholy (carti) :: modules/dual/roleplay/roleplay.js

// hope — roleplay (hybrid). GIFs come from github.com/itsfizys/gifcdn.
//   slash   /roleplay action:<autocomplete> user:<optional>
//   prefix  ,hug @user   ,wave   ,roleplay kiss @user   ,rp pat <id>
// Every action is a prefix command of its own; `run` stays with the owner
// `eval` alias, so use `,rp run` for that one.

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const ui = require('../../../services/ui');
const { buildRoleplayResponse, roleplayActions, actionNames } = require('../../../services/roleplayHelper');

const RESERVED = new Set(['run']); // already an alias of another command

const NO_MENTIONS = { parse: [] };

/** Resolve the target from a mention, an id, or the message being replied to. */
async function targetFromMessage(message, args) {
  const mention = message.mentions.users.first();
  if (mention) return mention;
  const id = args.find(a => /^\d{17,20}$/.test(a));
  if (id) return message.client.users.fetch(id).catch(() => null);
  if (message.reference?.messageId) {
    const ref = await message.fetchReference().catch(() => null);
    if (ref) return ref.author;
  }
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleplay')
    .setDescription('Send an anime roleplay GIF')
    .addStringOption(o => o.setName('action').setDescription('What to do').setRequired(true).setAutocomplete(true))
    .addUserOption(o => o.setName('user').setDescription('Who to do it to (optional)')),

  name: 'roleplay',
  description: 'Send an anime roleplay GIF',
  aliases: ['rp', ...actionNames.filter(a => !RESERVED.has(a))],
  category: 'fun',

  async autocomplete(interaction) {
    const q = interaction.options.getFocused().toLowerCase().trim();
    const list = actionNames.filter(n => n.includes(q)).sort((a, b) => Number(b.startsWith(q)) - Number(a.startsWith(q)));
    await interaction.respond(list.slice(0, 25).map(n => ({ name: n, value: n })));
  },

  async execute(ctx, args = []) {
    const isSlash = ctx.isChatInputCommand?.();
    let action; let target = null; let author;

    if (isSlash) {
      action = ctx.options.getString('action').toLowerCase();
      target = ctx.options.getUser('user');
      author = ctx.user;
    } else {
      author = ctx.author;
      const used = (ctx.invokedAs || '').split(' ')[0];
      const rest = [...args];
      action = roleplayActions[used] ? used : (rest.shift() || '').toLowerCase();
      target = await targetFromMessage(ctx, rest);

      // users with no-prefix mode: a bare word like "yes please" must not fire a GIF
      if (roleplayActions[used] && !ctx.usedPrefix && !ctx.mentions.users.size) return;
    }

    if (!roleplayActions[action]) {
      const hint = actionNames.filter(n => n.startsWith(action.slice(0, 2))).slice(0, 8).map(n => `\`${n}\``).join(', ');
      return ui.say.error(ctx, `Unknown action${hint ? `. Try ${hint}` : ''}`);
    }

    const box = await buildRoleplayResponse(action, author, target, true);
    if (!box) return ui.say.error(ctx, 'Could not load a GIF, try again');

    const body = { components: [box], flags: MessageFlags.IsComponentsV2, allowedMentions: NO_MENTIONS };
    return ctx.reply(body);
  },
};
