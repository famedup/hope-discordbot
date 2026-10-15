/** @author cashholy (carti) */

const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');

const EMOJI_FULL_REGEX = /<(a?):([a-zA-Z0-9_]+):(\d+)>/g;

function extractEmojis(text) {
  const found = [];
  const seen = new Set();
  let match;
  EMOJI_FULL_REGEX.lastIndex = 0;
  while ((match = EMOJI_FULL_REGEX.exec(text)) !== null) {
    const animated = match[1] === 'a';
    const name = match[2];
    const id = match[3];
    if (!seen.has(id)) {
      seen.add(id);
      found.push({ animated, name, id });
    }
  }
  return found;
}

function cdnUrl(emoji) {
  return `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`;
}

function errorContainer(text) {
  return new ContainerBuilder()
    .setAccentColor(0x2B2D31)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('**Steal Emojis**')
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(text)
    );
}

async function runSteal(target, emojis, guild, member, isSlash, source) {
  const missingUserPerm = !member.permissions.has(PermissionFlagsBits.ManageGuildExpressions);
  const missingBotPerm = !guild.members.me.permissions.has(PermissionFlagsBits.ManageGuildExpressions);

  if (missingUserPerm || missingBotPerm) {
    const who = missingUserPerm ? 'You need' : 'I need';
    const container = errorContainer(`> ${who} the **Manage Expressions** permission to steal emojis.`);
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2 };
    if (isSlash) return target.editReply(opts);
    return target.reply(opts);
  }

  if (emojis.length === 0) {
    const tip = isSlash
      ? 'Paste custom emojis into the `emojis` option.'
      : 'Provide custom emojis in your message or reply to one that has them.';
    const container = errorContainer(`> No custom emojis found. ${tip}`);
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2 };
    if (isSlash) return target.editReply(opts);
    return target.reply(opts);
  }

  const results = [];

  for (const emoji of emojis) {
    try {
      const created = await guild.emojis.create({
        attachment: cdnUrl(emoji),
        name: emoji.name,
      });
      results.push({ name: emoji.name, success: true, tag: `<${created.animated ? 'a' : ''}:${created.name}:${created.id}>` });
    } catch (err) {
      let reason = err.message || 'Unknown error';
      if (err.code === 30008) reason = 'Server emoji limit reached';
      else if (err.code === 50013) reason = 'Missing permissions';
      else if (err.code === 50035) reason = 'Invalid emoji or unsupported format';
      else if (reason.length > 60) reason = reason.slice(0, 60) + '...';
      results.push({ name: emoji.name, success: false, reason });
    }
  }

  const added = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  const lines = results.map(r =>
    r.success
      ? `- ${r.tag} — added`
      : `- **${r.name}** — failed: ${r.reason}`
  ).join('\n');

  const summary = added.length > 0 && failed.length > 0
    ? `-# **${added.length}** stolen  ·  **${failed.length}** failed`
    : added.length > 0
      ? `-# All **${added.length}** emoji(s) stolen successfully`
      : `-# All **${failed.length}** emoji(s) failed`;

  const container = new ContainerBuilder()
    .setAccentColor(0x2B2D31)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('**Steal Emojis**')
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`> Attempted to steal **${emojis.length}** emoji(s)${source ? ` from ${source}` : ''}\n${lines}`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(summary)
    );

  const opts = { components: [container], flags: MessageFlags.IsComponentsV2 };
  if (isSlash) return target.editReply(opts);
  return target.reply(opts);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('steal')
    .setDescription('Steal emojis and add them to this server')
    .addStringOption(option =>
      option
        .setName('emojis')
        .setDescription('Paste one or more custom emojis (e.g. :Kek: :pog: :sadge:)')
        .setRequired(true)
    ),

  name: 'steal',
  aliases: ['stealemoji', 'stealmoji', 'addemoji'],
  description: 'Steal emojis and add them to this server',
  category: 'general',

  async execute(interactionOrMessage, args = []) {
    const isSlash = interactionOrMessage.isChatInputCommand?.();
    const guild = interactionOrMessage.guild;
    const member = isSlash ? interactionOrMessage.member : interactionOrMessage.member;

    if (!guild) {
      const container = errorContainer('> This command can only be used inside a server.');
      const opts = { components: [container], flags: MessageFlags.IsComponentsV2 };
      if (isSlash) return interactionOrMessage.reply({ ...opts, ephemeral: true });
      return interactionOrMessage.reply(opts);
    }

    if (isSlash) {
      await interactionOrMessage.deferReply();
      const input = interactionOrMessage.options.getString('emojis');
      const emojis = extractEmojis(input);
      return runSteal(interactionOrMessage, emojis, guild, member, true, null);
    }

    // --- Prefix path ---
    const message = interactionOrMessage;
    const inlineText = args.join(' ');
    const inlineEmojis = extractEmojis(inlineText);

    // Also check replied message for emojis
    let replyEmojis = [];
    let source = null;
    if (message.reference?.messageId) {
      try {
        const replied = await message.channel.messages.fetch(message.reference.messageId);
        replyEmojis = extractEmojis(replied.content);
        if (replyEmojis.length > 0) source = `replied message`;
      } catch { /* ignore */ }
    }

    // Merge: inline first, then reply (dedup by ID)
    const seen = new Set(inlineEmojis.map(e => e.id));
    const combined = [...inlineEmojis];
    for (const e of replyEmojis) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        combined.push(e);
      }
    }

    return runSteal(message, combined, guild, member, false, source);
  }
};
