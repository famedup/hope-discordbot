/*! © 2026 cashholy (carti) !*/

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');
const axios = require('axios');

module.exports = {
  name: 'rizz',
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    
    await interaction.deferReply();

    let rizzLine;
    try {
      const response = await axios.get('https://rizz-api.vercel.app/api/random');
      rizzLine = response.data.text || response.data.line;
    } catch (error) {
      console.error('Error fetching rizz from API:', error);
      const fallbackRizz = [
        "Are you a magician? Because whenever I look at you, everyone else disappears.",
        "Do you have a map? I just keep getting lost in your eyes.",
        "Are you a Wi-Fi router? Because I'm feeling a strong connection.",
        "If you were a vegetable, you'd be a 'cute-cumber'.",
      ];
      rizzLine = fallbackRizz[Math.floor(Math.random() * fallbackRizz.length)];
    }
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Rizz Logic`)
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${target.id === interaction.user.id ? '' : `Hey ${target}, `}${rizzLine}`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(target.displayAvatarURL({ size: 128 }))
          )
      );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
