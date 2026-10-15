// @cashholy(carti) — tts

const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    AttachmentBuilder,
} = require('discord.js');
const config = require('../../../settings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tts')
        .setDescription('Convert text to speech using AI')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The text to convert to speech')
                .setRequired(true)
                .setMaxLength(1000)
        )
        .addStringOption(option =>
            option.setName('voice')
                .setDescription('Voice to use')
                .setRequired(false)
                .addChoices(
                    { name: 'Arista (Female)', value: 'Arista-PlayAI' },
                    { name: 'Atlas (Male)', value: 'Atlas-PlayAI' },
                    { name: 'Basil (Male)', value: 'Basil-PlayAI' },
                    { name: 'Briggs (Male)', value: 'Briggs-PlayAI' },
                    { name: 'Calum (Male)', value: 'Calum-PlayAI' },
                    { name: 'Celeste (Female)', value: 'Celeste-PlayAI' },
                    { name: 'Cheyenne (Female)', value: 'Cheyenne-PlayAI' },
                    { name: 'Chip (Male)', value: 'Chip-PlayAI' },
                    { name: 'Cillian (Male)', value: 'Cillian-PlayAI' },
                    { name: 'Deedee (Female)', value: 'Deedee-PlayAI' },
                    { name: 'Fritz (Male)', value: 'Fritz-PlayAI' },
                    { name: 'Gail (Female)', value: 'Gail-PlayAI' },
                    { name: 'Indigo (Female)', value: 'Indigo-PlayAI' },
                    { name: 'Mamaw (Female)', value: 'Mamaw-PlayAI' },
                    { name: 'Mason (Male)', value: 'Mason-PlayAI' },
                    { name: 'Mikail (Male)', value: 'Mikail-PlayAI' },
                    { name: 'Mitch (Male)', value: 'Mitch-PlayAI' },
                    { name: 'Quinn (Female)', value: 'Quinn-PlayAI' },
                    { name: 'Thunder (Male)', value: 'Thunder-PlayAI' },
                    { name: 'Timo (Male)', value: 'Timo-PlayAI' }
                )
        ),

    name: 'tts',
    aliases: ['speak', 'texttospeech'],
    description: 'Convert text to speech using AI',

    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
        
        let text, voice;
        
        if (isSlashCommand) {
            await interactionOrMessage.deferReply();
            text = interactionOrMessage.options.getString('text');
            voice = interactionOrMessage.options.getString('voice') || 'Fritz-PlayAI';
        } else {
            if (!args || args.length === 0) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Text to Speech')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            '**Usage:** `tts <text>`\n' +
                            '**Aliases:** speak, texttospeech\n\n' +
                            '**Example:** `tts Hello, how are you today?`'
                        )
                    );
                
                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }
            
            const thinkingMsg = await interactionOrMessage.reply({
                content: 'Generating speech...',
            });
            
            text = args.join(' ');
            voice = 'Fritz-PlayAI';
            
            interactionOrMessage.editReply = async (options) => {
                return thinkingMsg.edit(options);
            };
        }

        if (!config.GROQ?.API_KEY) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Error**\n\nGroq API key is not configured.')
                );

            return await interactionOrMessage.editReply({
                content: '',
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (text.length > 1000) {
            text = text.substring(0, 1000);
        }

        try {
            const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.GROQ.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'playai-tts',
                    input: text,
                    voice: voice,
                    response_format: 'mp3'
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Groq TTS API Error:', errorData);
                
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**Error**\n\nFailed to generate speech. ${errorData.error?.message || 'Please try again later.'}`)
                    );

                return await interactionOrMessage.editReply({
                    content: '',
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const audioBuffer = await response.arrayBuffer();
            const attachment = new AttachmentBuilder(Buffer.from(audioBuffer), { name: 'speech.mp3' });

            await interactionOrMessage.editReply({
                content: '',
                files: [attachment]
            });

        } catch (error) {
            console.error('TTS command error:', error);

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Error**\n\nAn unexpected error occurred while generating speech.')
                );

            await interactionOrMessage.editReply({
                content: '',
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
