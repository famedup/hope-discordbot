/**
 * @file bypass.js
 * @developer cashholy (carti)
 */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits
} = require('discord.js');
const { addBypass, removeBypass, getBypass, getAllBypasses, getBypassCount } = require('../../../../database/mediaDb');

module.exports = {
  async execute(interactionOrMessage, args = []) {
    const isSlash = interactionOrMessage.isCommand?.();
    const member = interactionOrMessage.member;
    const guild = interactionOrMessage.guild;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Permission Denied**`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('You need Administrator permission to use this command.'));
      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    let option, user;

    if (isSlash) {
      option = interactionOrMessage.options.getString('option');
      user = interactionOrMessage.options.getUser('user');
    } else {
      option = args[0]?.toLowerCase();
      user = interactionOrMessage.mentions.users.first();
    }

    if (!option || !['add', 'remove', 'show'].includes(option)) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Invalid Usage**`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Usage: `media bypass <add|remove|show> [@user]`'));
      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    if (option === 'show') {
      const bypasses = await getAllBypasses(guild.id);

      if (!bypasses || bypasses.length === 0) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Media Bypass List**`));
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**No Users Found**\n\nThere are no users in the bypass list.`));
        return interactionOrMessage.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const userList = bypasses.map(b => `<@${b.user_id}>`).join('\n');
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Media Bypass List**`));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Total Users:** ${bypasses.length}/25`));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Bypassed Users:**\n${userList}`));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent('*These users can send messages in the media-only channel.*'));

      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { users: [] }
      });
    }

    if (!user) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Invalid Usage**`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Please mention a user to ${option} from the bypass list.\n\n**Usage:** \`media bypass ${option} <@user>\``));
      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    if (option === 'add') {
      const count = await getBypassCount(guild.id);
      if (count >= 25) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Bypass List Full**`))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('The bypass list can only hold up to 25 users.'));
        return interactionOrMessage.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const existing = await getBypass(guild.id, user.id);
      if (existing) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**User Already Bypassed**`))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${user} is already in the bypass list.`));
        return interactionOrMessage.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      try {
        await addBypass(guild.id, user.id);
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**User Added to Bypass**`));
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**User:** ${user}\n` +
            `**Status:** Added to bypass list\n` +
            `**Can now:** Send messages in media channel`
          )
        );
        await interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (error) {
        console.error('Error adding bypass:', error);
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Error**`))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('Failed to add user to bypass list. Please try again.'));
        await interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }
    }

    if (option === 'remove') {
      const existing = await getBypass(guild.id, user.id);
      if (!existing) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**User Not in Bypass List**`))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${user} is not in the bypass list.`));
        return interactionOrMessage.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      try {
        await removeBypass(guild.id, user.id);
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**User Removed from Bypass**`));
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**User:** ${user}\n` +
            `**Status:** Removed from bypass list\n` +
            `**Restriction:** Can no longer send messages in media channel`
          )
        );
        await interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (error) {
        console.error('Error removing bypass:', error);
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Error**`))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('Failed to remove user from bypass list. Please try again.'));
        await interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }
    }
  }
};
