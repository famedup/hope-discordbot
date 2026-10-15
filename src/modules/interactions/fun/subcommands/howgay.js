// ▛▀ cashholy (carti) ▀▜

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../../media/emojis.json');

function createProgressBar(percentage) {
  if (percentage === 0) {
    return emojis.progressEmpty.repeat(10);
  }
  if (percentage === 100) {
    return emojis.progressLeft + emojis.progressCenter.repeat(8) + emojis.progressRight;
  }
  const filled = Math.round((percentage / 100) * 9);
  let bar = emojis.progressLeft;
  for (let i = 1; i < 10; i++) {
    if (i < filled) bar += emojis.progressCenter;
    else bar += emojis.progressEmpty;
  }
  return bar;
}

function getReaction(rate) {
  if (rate === 0) return "Completely straight";
  if (rate <= 20) return "Barely any rainbow vibes";
  if (rate <= 40) return "A little fruity...";
  if (rate <= 60) return "Definitely questioning";
  if (rate <= 80) return "Rainbow flag unlocked";
  if (rate < 100) return "Pride parade organizer";
  return "Maximum gay achieved!";
}

module.exports = {
  name: 'howgay',
  description: 'Shows How Member Gay Is!',
  
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const gayrate = Math.floor(Math.random() * 101);
    const progressBar = createProgressBar(gayrate);
    const reaction = getReaction(gayrate);

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Gay Rate Checker')
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${user} is ${gayrate}% gay!**\n${progressBar}\n\n*${reaction}*`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 128 }))
          )
      );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
