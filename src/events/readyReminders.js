/** @author cashholy (carti) */

const { Events, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const remindersDb = require('../database/reminders');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        setInterval(async () => {
            try {
                const now = Date.now();
                const due = await remindersDb.getPendingReminders(now);

                for (const reminder of due) {
                    await remindersDb.deleteReminder(reminder.id);

                    const setAt = Math.floor(Number(reminder.createdAt) / 1000);
                    const body = `> **Message:** ${reminder.message}\n> Set <t:${setAt}:f>`;

                    const dmContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('**Reminder Ended**')
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(body)
                        );

                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`<@${reminder.userId}> **Reminder Ended**`)
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(body)
                        );

                    try {
                        const user = await client.users.fetch(reminder.userId).catch(() => null);
                        if (user) {
                            await user.send({
                                components: [dmContainer],
                                flags: MessageFlags.IsComponentsV2,
                            });
                            continue;
                        }
                    } catch (_) {}

                    try {
                        const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
                        if (channel && channel.isTextBased()) {
                            await channel.send({
                                components: [container],
                                flags: MessageFlags.IsComponentsV2,
                                allowedMentions: { users: [reminder.userId] },
                            });
                        }
                    } catch (_) {}
                }
            } catch (error) {
                console.error('[Reminders] Error processing reminders:', error);
            }
        }, 10000);
    }
};
