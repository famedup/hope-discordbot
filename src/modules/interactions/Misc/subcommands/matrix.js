// @cashholy(carti) — matrix

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  AttachmentBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const emojis = require('../../../../media/emojis.json');

module.exports = {
  name: 'matrix',
  description: 'Generate a dot matrix of an image',
  
  async execute(interaction) {
    await interaction.deferReply();
    
    let imageUrl;
    const urlOption = interaction.options.getString('url');
    const userOption = interaction.options.getUser('user');

    if (userOption) {
      imageUrl = userOption.displayAvatarURL({ extension: 'png', size: 256 });
    } else if (urlOption) {
      imageUrl = urlOption;
      if (!imageUrl.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Invalid URL\n*Error occurred*`)
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Please provide a valid image URL!')
          );
        return await interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
    } else {
      imageUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });
    }

    const tempDir = path.join(__dirname, '../../../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFile = path.join(tempDir, `temp_${Date.now()}.png`);

    try {
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'stream',
        maxContentLength: 10 * 1024 * 1024,
        timeout: 15000
      });

      const writer = fs.createWriteStream(tempFile);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const img = await loadImage(tempFile);
      
      const aspectRatio = img.width / img.height;
      let matrixWidth = 120;
      let matrixHeight = Math.round(matrixWidth / aspectRatio);
      
      if (matrixHeight > 120) {
        matrixHeight = 120;
        matrixWidth = Math.round(matrixHeight * aspectRatio);
      }
      
      const dotSize = 3;
      const spacing = 5;
      
      const canvasWidth = matrixWidth * spacing;
      const canvasHeight = matrixHeight * spacing;
      
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      const tempCanvas = createCanvas(matrixWidth, matrixHeight);
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(img, 0, 0, matrixWidth, matrixHeight);
      
      const imageData = tempCtx.getImageData(0, 0, matrixWidth, matrixHeight);
      const pixels = imageData.data;
      
      for (let y = 0; y < matrixHeight; y++) {
        for (let x = 0; x < matrixWidth; x++) {
          const offset = (y * matrixWidth + x) * 4;
          const r = pixels[offset];
          const g = pixels[offset + 1];
          const b = pixels[offset + 2];
          const brightness = (r + g + b) / 3;
          
          if (brightness > 10) {
            const dotOpacity = Math.pow(brightness / 255, 0.8);
            const grayValue = Math.floor(brightness * 0.95);
            
            ctx.fillStyle = `rgba(${grayValue}, ${grayValue}, ${grayValue}, ${dotOpacity})`;
            ctx.beginPath();
            ctx.arc(
              x * spacing + spacing / 2,
              y * spacing + spacing / 2,
              (dotSize / 2) * (0.7 + (brightness / 255) * 0.3),
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
      }
      
      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: 'matrix.png' });

      const resultContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Dot Matrix Generated`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL(`attachment://matrix.png`)
              .setDescription('Dot Matrix Image')
          )
        );

      await interaction.editReply({
        components: [resultContainer],
        files: [attachment],
        flags: MessageFlags.IsComponentsV2
      });

    } catch (error) {
      console.error('Matrix error:', error);
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Generation Failed\n*Error occurred*`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Failed to generate dot matrix. Please check the image URL and try again.')
        );
      await interaction.editReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    } finally {
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }
    }
  },
};
