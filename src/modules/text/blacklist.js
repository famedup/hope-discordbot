/* ⌁ crafted by cashholy (carti) ⌁ */

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('../../settings');

module.exports = {
  name: 'blacklist',
  description: 'Manage blacklist',
  aliases: ['bl'],
  ownerOnly: true,

  async execute(message, args) {
    try {
      if (message.author.id !== config.OWNER_ID) {
        return message.reply('❌ Owner only');
      }

      let models;
      try {
        models = require('../../database/schemas');
      } catch (e) {
        console.error('Failed to load models:', e);
        return message.reply('❌ Database error: ' + e.message);
      }

      if (!models || !models.Blacklist || !models.Blacklist.model) {
        console.error('Blacklist model missing');
        return message.reply('❌ Blacklist model not initialized');
      }

      const BlacklistModel = models.Blacklist.model;
      const subcommand = args[0];
      const action = args[1];
      let targetId = args[2];
      
      if (targetId) {
        const mentionMatch = targetId.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
          targetId = mentionMatch[1];
        }
      }

      if (subcommand === 'guild' && action === 'add') {
        if (!targetId) {
          const c = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Missing ID'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('Usage: `blacklist guild add <id>`'));
          return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }
        
        try {
          await BlacklistModel.findOrCreate({
            where: { type: 'guild', entityId: targetId },
            defaults: { type: 'guild', entityId: targetId }
          });
          
          const c = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Guild Blacklisted'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Added \`${targetId}\` to blacklist`));
          return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        } catch (e) {
          return message.reply('❌ ' + e.message);
        }
      }

      if (subcommand === 'guild' && action === 'remove') {
        if (!targetId) {
          const c = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Missing ID'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('Usage: `blacklist guild remove <id>`'));
          return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }
        
        try {
          const deleted = await BlacklistModel.destroy({ where: { type: 'guild', entityId: targetId } });
          const c = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(deleted ? '### Guild Removed' : '### Not Found'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(deleted ? `Removed \`${targetId}\` from blacklist` : `Guild \`${targetId}\` is not blacklisted`));
          return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        } catch (e) {
          return message.reply('❌ ' + e.message);
        }
      }

      if (subcommand === 'guild' && action === 'list') {
        try {
          const list = await BlacklistModel.findAll({ where: { type: 'guild' } });
          const c = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Blacklisted Guilds`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
          
          if (list.length === 0) {
            c.addTextDisplayComponents(new TextDisplayBuilder().setContent('No guilds blacklisted'));
          } else {
            c.addTextDisplayComponents(new TextDisplayBuilder().setContent(list.map((x, i) => `${i+1}. \`${x.entityId}\``).join('\n')));
          }
          return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        } catch (e) {
          return message.reply('❌ ' + e.message);
        }
      }

      if (subcommand === 'user' && action === 'add') {
        if (!targetId) {
          const c = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Missing ID'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('Usage: `blacklist user add <id>`'));
          return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }
        
        try {
          await BlacklistModel.findOrCreate({
            where: { type: 'user', entityId: targetId },
            defaults: { type: 'user', entityId: targetId }
          });
          
          const c = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### User Blacklisted'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Added <@${targetId}> to blacklist`));
          return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        } catch (e) {
          return message.reply('❌ ' + e.message);
        }
      }

      if (subcommand === 'user' && action === 'remove') {
        if (!targetId) {
          const c = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Missing ID'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('Usage: `blacklist user remove <id>`'));
          return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }
        
        try {
          const deleted = await BlacklistModel.destroy({ where: { type: 'user', entityId: targetId } });
          const c = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(deleted ? '### User Removed' : '### Not Found'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(deleted ? `Removed <@${targetId}> from blacklist` : `User is not blacklisted`));
          return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        } catch (e) {
          return message.reply('❌ ' + e.message);
        }
      }

      if (subcommand === 'user' && action === 'list') {
        try {
          const list = await BlacklistModel.findAll({ where: { type: 'user' } });
          const c = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Blacklisted Users`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
          
          if (list.length === 0) {
            c.addTextDisplayComponents(new TextDisplayBuilder().setContent('No users blacklisted'));
          } else {
            c.addTextDisplayComponents(new TextDisplayBuilder().setContent(list.map((x, i) => `${i+1}. <@${x.entityId}>`).join('\n')));
          }
          return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        } catch (e) {
          return message.reply('❌ ' + e.message);
        }
      }

      return require('../../services/helpMenu').sendHelp('blacklist', message);

    } catch (error) {
      console.error('FATAL blacklist error:', error);
      return message.reply('❌ Fatal: ' + error.message);
    }
  }
};
