/*
 * Developed by cashholy (carti)
 * File: modules/interactions/Misc/subcommands/calc.js
 */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ComponentType,
} = require('discord.js');
const emojis = require('../../../../media/emojis.json');

module.exports = {
  name: 'calc',
  description: 'Interactive calculator with buttons',
  
  async execute(interaction) {
    const calculatorId = `calc-${interaction.user.id}-${Date.now()}`;
    const calculatorState = {
      display: '0',
      currentValue: '0',
      operator: null,
      previousValue: null,
      userId: interaction.user.id
    };

    const rows = createCalculatorButtons(calculatorId);

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Calculator`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`\`\`\`\n${calculatorState.display}\n\`\`\``)
      )
      .addActionRowComponents(...rows);

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return buttonInteraction.reply({
          content: 'This calculator is not for you! Use /misc calc to create your own.',
          ephemeral: true
        });
      }

      const action = buttonInteraction.customId.replace(`${calculatorId}_`, '');
      handleCalculatorAction(calculatorState, action);

      const newContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Calculator`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`\`\`\`\n${calculatorState.display}\n\`\`\``)
        )
        .addActionRowComponents(...rows);

      await buttonInteraction.update({
        components: [newContainer],
        flags: MessageFlags.IsComponentsV2
      });
    });

    collector.on('end', async () => {
      const disabledRows = rows.map(row => {
        const newRow = new ActionRowBuilder();
        row.components.forEach(button => {
          newRow.addComponents(
            ButtonBuilder.from(button).setDisabled(true)
          );
        });
        return newRow;
      });

      const finalContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Calculator`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`\`\`\`\n${calculatorState.display}\n\`\`\`\n*Calculator expired*`)
        )
        .addActionRowComponents(...disabledRows);

      try {
        await interaction.editReply({
          components: [finalContainer],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        console.error('[CALC] Failed to update calculator on timeout:', error.message);
      }
    });
  },
};

function createCalculatorButtons(calculatorId) {
  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_clear`)
        .setLabel('C')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_divide`)
        .setLabel('÷')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_multiply`)
        .setLabel('×')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_delete`)
        .setLabel('⌫')
        .setStyle(ButtonStyle.Secondary)
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_7`)
        .setLabel('7')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_8`)
        .setLabel('8')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_9`)
        .setLabel('9')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_subtract`)
        .setLabel('-')
        .setStyle(ButtonStyle.Primary)
    );

  const row3 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_4`)
        .setLabel('4')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_5`)
        .setLabel('5')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_6`)
        .setLabel('6')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_add`)
        .setLabel('+')
        .setStyle(ButtonStyle.Primary)
    );

  const row4 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_1`)
        .setLabel('1')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_2`)
        .setLabel('2')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_3`)
        .setLabel('3')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_equals`)
        .setLabel('=')
        .setStyle(ButtonStyle.Success)
    );

  const row5 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_0`)
        .setLabel('0')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_decimal`)
        .setLabel('.')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_00`)
        .setLabel('00')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${calculatorId}_percent`)
        .setLabel('%')
        .setStyle(ButtonStyle.Primary)
    );

  return [row1, row2, row3, row4, row5];
}

function handleCalculatorAction(calc, action) {
  if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(action)) {
    if (calc.currentValue === '0' || calc.display === 'Error') {
      calc.currentValue = action;
      if (calc.operator === null) {
        calc.display = action;
      } else {
        calc.display += action;
      }
    } else {
      calc.currentValue += action;
      calc.display += action;
    }
  } else if (action === '00') {
    if (calc.currentValue !== '0') {
      calc.currentValue += '00';
      calc.display += '00';
    }
  } else if (action === 'decimal') {
    if (!calc.currentValue.includes('.')) {
      if (calc.currentValue === '0') {
        calc.currentValue = '0.';
        if (calc.operator === null) {
          calc.display = '0.';
        } else {
          calc.display += '0.';
        }
      } else {
        calc.currentValue += '.';
        calc.display += '.';
      }
    }
  } else if (action === 'clear') {
    calc.display = '0';
    calc.currentValue = '0';
    calc.operator = null;
    calc.previousValue = null;
  } else if (action === 'delete') {
    if (calc.currentValue.length > 1) {
      calc.currentValue = calc.currentValue.slice(0, -1);
      calc.display = calc.display.slice(0, -1);
    } else {
      calc.currentValue = '0';
      if (calc.operator === null) {
        calc.display = '0';
      } else {
        calc.display = calc.display.slice(0, -1);
      }
    }
  } else if (['add', 'subtract', 'multiply', 'divide'].includes(action)) {
    if (calc.operator && calc.previousValue !== null && calc.currentValue !== '0') {
      performCalculation(calc);
    }
    calc.previousValue = parseFloat(calc.currentValue);
    calc.operator = action;
    calc.display += ` ${getOperatorSymbol(action)} `;
    calc.currentValue = '0';
  } else if (action === 'equals') {
    if (calc.operator && calc.previousValue !== null) {
      performCalculation(calc);
      calc.operator = null;
      calc.previousValue = null;
    }
  } else if (action === 'percent') {
    const num = parseFloat(calc.currentValue);
    const result = num / 100;
    calc.currentValue = String(result);
    if (calc.operator === null) {
      calc.display = String(result);
    } else {
      const parts = calc.display.split(/\s[+\-×÷]\s/);
      calc.display = parts[0] + calc.display.substring(parts[0].length, calc.display.length - calc.currentValue.length + result.toString().length) + String(result);
    }
  }
}

function performCalculation(calc) {
  const prev = calc.previousValue;
  const current = parseFloat(calc.currentValue);
  let result;

  try {
    switch (calc.operator) {
      case 'add':
        result = prev + current;
        break;
      case 'subtract':
        result = prev - current;
        break;
      case 'multiply':
        result = prev * current;
        break;
      case 'divide':
        if (current === 0) {
          calc.display = 'Error: Division by zero';
          calc.currentValue = '0';
          return;
        }
        result = prev / current;
        break;
      default:
        return;
    }

    result = Math.round(result * 1000000000) / 1000000000;
    calc.display = String(result);
    calc.currentValue = String(result);
  } catch (error) {
    calc.display = 'Error';
    calc.currentValue = '0';
  }
}

function getOperatorSymbol(operator) {
  const symbols = {
    add: '+',
    subtract: '-',
    multiply: '×',
    divide: '÷'
  };
  return symbols[operator] || '';
}
