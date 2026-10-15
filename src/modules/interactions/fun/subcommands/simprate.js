// @cashholy(carti) — simprate

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

function getReaction(rate) {
  if (rate === 0) return "Completely immune to simping";
  if (rate <= 20) return "Strong and independent";
  if (rate <= 40) return "Only simps a little bit...";
  if (rate <= 60) return "Down bad occasionally";
  if (rate <= 80) return "Would donate their life savings";
  if (rate < 100) return "Professional simp certified";
  return "Ultimate simp lord detected";
}

module.exports = {
  name: 'simprate',
  description: 'Check how much of a simp someone is',
  
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const Result = Math.floor(Math.random() * 101);
    const reaction = getReaction(Result);

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Simp Rate Checker')
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${targetUser.username} is ${Result}% simp!**\n\n*${reaction}*`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ size: 128 }))
          )
      );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
