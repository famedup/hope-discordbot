/*! © 2026 cashholy (carti) !*/

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    SeparatorSpacingSize,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const { insertOrUpdateConfig, getConfig } = require('../../../../database/vanityRoles');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        try {
            const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
            const message = isSlashCommand ? interactionOrMessage : interactionOrMessage;
            const guild = message.guild;
            const userId = isSlashCommand ? message.user.id : message.author.id;

            const existing = await getConfig(guild.id);
            if (existing) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Already Configured'))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Use `vanity config` to modify or `vanity reset` to start over.'));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
            }

            
            if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("# Permission Denied\nI need the ManageRoles permission to set up vanity roles")
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("Please grant me this permission and try again.")
                    );
                
                return message.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }

            
            const roles = guild.roles.cache
                .filter(role => 
                    role.id !== guild.id && 
                    !role.managed && 
                    role.position < guild.members.me.roles.highest.position
                )
                .sort((a, b) => b.position - a.position)
                .first(25);

            if (roles.length === 0) {
                const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("### No Available Roles")
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("> Create a role below the bot's highest role\n> The role must not be managed by an app")
                    );
                
                return message.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }

            
            const roleSelectMenu = new StringSelectMenuBuilder()
                .setCustomId('vr_role_select')
                .setPlaceholder('Select the role to grant')
                .addOptions(
                    roles.map(role => 
                        new StringSelectMenuOptionBuilder()
                            .setLabel(role.name)
                            .setDescription(`Grant when vanity code is in status`)
                            .setValue(role.id)
                    )
                );

            const setupContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# Vanity Roles Setup\nGrant role when vanity code appears in user status")
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**Step 1:** Select which role to grant")
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(roleSelectMenu)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**Step 2:** Set the vanity code (next)")
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**How it works**\n- Detects: discord.gg/vanitycode, .gg/vanitycode, /vanitycode\n- Grants role when found in status\n- Removes role when status is cleared")
                );

            const msg = await message.reply({
                components: [setupContainer],
                flags: MessageFlags.IsComponentsV2
            });

            let selectedRole = null;

            
            const collector = msg.createMessageComponentCollector({
                filter: (interaction) => interaction.user.id === userId,
                time: 300000 
            });

            collector.on('collect', async (interaction) => {
                try {
                    if (interaction.customId === 'vr_role_select') {
                        selectedRole = interaction.values[0];
                        
                        
                        const modal = new ModalBuilder()
                            .setCustomId('vr_code_modal')
                            .setTitle('Vanity Code');

                        const codeInput = new TextInputBuilder()
                            .setCustomId('code_input')
                            .setLabel('Enter the vanity code')
                            .setPlaceholder('e.g., "coolserver" for discord.gg/coolserver')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(50);

                        modal.addComponents(new ActionRowBuilder().addComponents(codeInput));

                        try {
                            await interaction.showModal(modal);
                        } catch (error) {
                            console.error('Modal error:', error);
                            return;
                        }

                        
                        try {
                            const modalSubmit = await interaction.awaitModalSubmit({
                                time: 300000
                            });

                            const vanityCode = modalSubmit.fields.getTextInputValue('code_input').toLowerCase().trim();

                            
                            await insertOrUpdateConfig(guild.id, selectedRole, vanityCode);

                            const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(`### Setup Complete`)
                                )
                                .addSeparatorComponents(
                                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                                )
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `**Role:** <@&${selectedRole}>\n` +
                                        `**Vanity Code:** ${vanityCode}\n` +
                                        `> Users with "${vanityCode}" in their status will receive the role automatically`
                                    )
                                );

                            await modalSubmit.reply({
                                components: [successContainer],
                                flags: MessageFlags.IsComponentsV2
                            });

                            collector.stop();
                        } catch (error) {
                            if (error.code !== 'InteractionCollectorError') {
                                console.error('Modal error:', error);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Setup error:', error);
                }
            });

            collector.on('end', () => {
                
            });

        } catch (error) {
            console.error('Setup command error:', error);
            const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# Error\nFailed to setup vanity roles")
                );
            
            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
    }
};
