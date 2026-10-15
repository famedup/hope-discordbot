// ─── cashholy (carti) · developer ───

const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vanity')
        .setDescription('Manage vanity roles that grant when users display vanity code in status')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Configure vanity roles for your server')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('View vanity roles configuration')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset all vanity role data')
        ),

    name: 'vanity',
    aliases: [],
    description: 'Manage vanity roles',

    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
        const subcommandsPath = path.join(__dirname, 'subcommands');
        const subcommandFiles = fs.readdirSync(subcommandsPath).filter(file => file.endsWith('.js'));

        let subcommandName;
        
        if (isSlashCommand) {
            subcommandName = interactionOrMessage.options.getSubcommand();
        } else {
            subcommandName = args[0];
            if (!subcommandName) {
                const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Vanity Roles Commands')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            'Available subcommands:\n' +
                            '- vanity setup - Configure role granting\n' +
                            '- vanity config - View configuration\n' +
                            '- vanity reset - Delete all data\n\n' +
                            'Features:\n' +
                            '- Grants role when user has vanity code in status\n' +
                            '- Detects: discord.gg/vanitycode, .gg/vanitycode, /vanitycode\n' +
                            '- Removes role when status is cleared'
                        )
                    );
                
                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        const subcommandFile = subcommandFiles.find(file => file === `${subcommandName}.js`);
        
        if (!subcommandFile) {
            const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`Unknown subcommand: ${subcommandName}`)
                );
            
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        const subcommand = require(path.join(subcommandsPath, subcommandFile));
        await subcommand.execute(interactionOrMessage, args.slice(1));
    }
};
