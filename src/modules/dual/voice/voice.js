// ─── cashholy (carti) · developer ───

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice')
        .setDescription('Voice channel management commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub
            .setName('kick')
            .setDescription('Kick a user from their voice channel')
            .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('kickall')
            .setDescription('Kick all users from a voice channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Voice channel to clear').setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('mute')
            .setDescription('Server mute a user in voice')
            .addUserOption(opt => opt.setName('user').setDescription('User to mute').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('muteall')
            .setDescription('Server mute all users in a voice channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Voice channel').setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('unmute')
            .setDescription('Server unmute a user in voice')
            .addUserOption(opt => opt.setName('user').setDescription('User to unmute').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('unmuteall')
            .setDescription('Server unmute all users in a voice channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Voice channel').setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('deafen')
            .setDescription('Server deafen a user in voice')
            .addUserOption(opt => opt.setName('user').setDescription('User to deafen').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('deafenall')
            .setDescription('Server deafen all users in a voice channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Voice channel').setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('undeafen')
            .setDescription('Server undeafen a user in voice')
            .addUserOption(opt => opt.setName('user').setDescription('User to undeafen').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('undeafenall')
            .setDescription('Server undeafen all users in a voice channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Voice channel').setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('move')
            .setDescription('Move a user to another voice channel')
            .addUserOption(opt => opt.setName('user').setDescription('User to move').setRequired(true))
            .addChannelOption(opt => opt.setName('channel').setDescription('Destination channel').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('moveall')
            .setDescription('Move all users from one voice channel to another')
            .addChannelOption(opt => opt.setName('from').setDescription('Source channel').setRequired(true))
            .addChannelOption(opt => opt.setName('to').setDescription('Destination channel').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('pull')
            .setDescription('Pull a user to your voice channel')
            .addUserOption(opt => opt.setName('user').setDescription('User to pull').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('pullall')
            .setDescription('Pull all users from a channel to your voice channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Source channel').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('lock')
            .setDescription('Lock a voice channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Voice channel to lock').setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('unlock')
            .setDescription('Unlock a voice channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Voice channel to unlock').setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('private')
            .setDescription('Make a voice channel private (hidden)')
            .addChannelOption(opt => opt.setName('channel').setDescription('Voice channel').setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('unprivate')
            .setDescription('Make a voice channel public (visible)')
            .addChannelOption(opt => opt.setName('channel').setDescription('Voice channel').setRequired(false))
        ),

    name: 'voice',
    aliases: ['vc'],
    category: 'moderation',

    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = !!interactionOrMessage.isChatInputCommand;
        const member = interactionOrMessage.member;

        if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Permission Denied')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('You need **Manage Server** or **Administrator** permission to use this command.')
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const subcommandsPath = path.join(__dirname, 'subcommands');
        const subcommandFiles = fs.readdirSync(subcommandsPath).filter(file => file.endsWith('.js'));

        let subcommandName;

        if (isSlashCommand) {
            subcommandName = interactionOrMessage.options.getSubcommand();
        } else {
            subcommandName = args[0]?.toLowerCase();
            if (!subcommandName) {
                return require('../../../services/helpMenu').sendHelp('voice', interactionOrMessage);
            }
        }

        const subcommandFile = subcommandFiles.find(file => file === `${subcommandName}.js`);

        if (!subcommandFile) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Unknown Subcommand')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`Subcommand \`${subcommandName}\` not found. Use \`voice\` to see available commands.`)
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const subcommand = require(path.join(subcommandsPath, subcommandFile));
        await subcommand.execute(interactionOrMessage, args.slice(1));
    }
};
