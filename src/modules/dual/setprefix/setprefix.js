// [dev] cashholy (carti) :: modules/dual/setprefix/setprefix.js

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const GuildPrefix = require('../../../database/schemas/GuildPrefix');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setprefix')
        .setDescription('Set a custom prefix for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option
                .setName('prefix')
                .setDescription('The prefix to set (1-5 characters)')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(5)
        ),

    name: 'setprefix',
    aliases: ['prefix'],
    description: 'Set a custom prefix for this server',

    async execute(interactionOrMessage, args = []) {
        let prefix;
        let isSlash = interactionOrMessage.isCommand?.();

        if (isSlash) {
            prefix = interactionOrMessage.options.getString('prefix');
        } else {
            if (!args.length) {
                const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Please provide a prefix.\n\n**Usage:** `prefix <new_prefix>`')
                    );
                return interactionOrMessage.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }
            prefix = args[0];
        }

        try {
            const guildId = isSlash ? interactionOrMessage.guildId : interactionOrMessage.guildId;

            if (prefix.length > 5) {
                const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Prefix must be 5 characters or less!')
                    );
                return interactionOrMessage.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }

            await GuildPrefix.setPrefix(guildId, prefix);

            const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### Prefix Updated`)
                )
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`Server prefix is now: \`${prefix}\``)
                );

            return interactionOrMessage.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: isSlash ? true : false
            });
        } catch (error) {
            console.error('SetPrefix Error:', error);

            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Error setting prefix. Please try again.')
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
    }
};
