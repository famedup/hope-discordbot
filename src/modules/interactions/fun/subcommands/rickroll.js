// ▛▀ cashholy (carti) ▀▜

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  MessageFlags,
} = require('discord.js');
const axios = require('axios');

module.exports = {
  name: 'rickroll',
  description: 'Detects if provided url is a rick-roll',
  
  async execute(interaction) {
    const url = interaction.options.getString('url');

    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlRegex.test(url)) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Invalid URL`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('The provided URL format is invalid!')
        );
      return await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    const loadingContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Analyzing URL`)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Checking for Rick Roll content...')
      );
    
    await interaction.reply({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2
    });

    try {
      const response = await axios.get(url, {
        maxRedirects: 5,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const phrases = [
        "rickroll", "rick roll", "rick astley", "never gonna give you up"
      ];

      const source = response.data.toLowerCase();
      const rickRoll = phrases.some(phrase => source.includes(phrase));

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Rick Roll Detector`)
        )
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**URL:** ${url}`),
              new TextDisplayBuilder().setContent(`**Status:** ${rickRoll ? 'Rick Roll DETECTED!' : 'Safe - No Rick Roll found'}`),
              new TextDisplayBuilder().setContent(rickRoll ? 
                `You were about to get Rick Rolled!` : 
                `This URL appears to be Rick Roll free!`
              )
            )
        );

      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });

    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### URL Check Failed`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Failed to check the URL. It might be invalid, unreachable, or protected.')
        );
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
