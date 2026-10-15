/*
 * Developed by cashholy (carti)
 * File: modules/dual/leaderboard/leaderboard.js
 */

const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb'],
    description: 'View server leaderboards',
    
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View server leaderboards')
        .addSubcommand(subcommand =>
            subcommand
                .setName('messages')
                .setDescription('View all-time message leaderboard')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('invites')
                .setDescription('View invite leaderboard')
        ),

    async execute(interactionOrMessage, args = []) {
        try {
            const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
            
            let subcommand;
            if (isSlashCommand) {
                subcommand = interactionOrMessage.options.getSubcommand();
            } else {
                subcommand = args[0]?.toLowerCase();
                if (!subcommand) {
                    return require('../../../services/helpMenu').sendHelp('leaderboard', interactionOrMessage);
                }
            }

            
            const aliasMap = {
                'm': 'messages',
                'msgs': 'messages',
                'i': 'invites',
                'inv': 'invites'
            };

            
            if (aliasMap[subcommand]) {
                subcommand = aliasMap[subcommand];
            }

            
            const subcommandPath = path.join(__dirname, 'subcommands', `${subcommand}.js`);
            
            if (!fs.existsSync(subcommandPath)) {
                const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Invalid Subcommand\nSubcommand not found')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Available subcommands: messages, invites')
                    );

                return interactionOrMessage.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }

            const subcommandModule = require(subcommandPath);
            const subArgs = isSlashCommand ? [] : args.slice(1);
            
            return await subcommandModule.execute(interactionOrMessage, subArgs);

        } catch (error) {
            console.error('Leaderboard command error:', error);
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Error\nFailed to load leaderboard')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Please try again later or contact support.')
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
    }
};
