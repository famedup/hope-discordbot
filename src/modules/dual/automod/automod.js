//
//  Made with care by cashholy (carti)
//

// hope — /automod. Opens the control panel; `on` / `off` flip it without opening it.

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ui = require('../../../services/ui');
const panel = require('../../../services/automodPanel');
const { AutomodConfig } = require('../../../database/schemas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Filter spam, links and abuse automatically')
    .addStringOption(o => o.setName('action').setDescription('What to do')
      .addChoices({ name: 'Open panel', value: 'panel' }, { name: 'Turn on', value: 'on' }, { name: 'Turn off', value: 'off' })),

  name: 'automod',
  aliases: ['am', 'automoderation'],
  description: 'Filter spam, links and abuse automatically',
  category: 'security',

  async execute(ctx, args = []) {
    const slash = ctx.isChatInputCommand?.();
    const action = String((slash ? ctx.options.getString('action') : args[0]) ?? 'panel').toLowerCase();
    const guild = ctx.guild;
    if (!guild) return ui.say.error(ctx, 'Use this in a server');

    if (['on', 'enable', 'off', 'disable'].includes(action)) {
      const user = ctx.user ?? ctx.author;
      const member = ctx.member ?? await guild.members.fetch(user.id).catch(() => null);
      if (guild.ownerId !== user.id && !member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return ui.say.error(ctx, 'You need **Manage Server** to use automod');
      }
      const row = await AutomodConfig.findOne({ where: { guildId: guild.id } });
      if (!row) return panel.open(ctx);
      const on = action === 'on' || action === 'enable';
      await row.update({ enabled: on });
      require('../../../events/automod/automodEvents').bust(guild.id);
      return ui.say.success(ctx, on ? 'Automod is on' : 'Automod is off');
    }
    return panel.open(ctx);
  },
};
