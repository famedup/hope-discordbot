/**
 * ┌ cashholy (carti)
 * └ services/pagination.js
 */

const {
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const emojis = require('../media/emojis.json');

function createPaginationSession(options) {
  const {
    interactionOrMessage,
    pages,
    renderPage,
    userId = null,
    initialPage = 0,
    timeout = 300000,
    ephemeral = false,
    onPageChange = null,
    totalPages = null,
    getAttachment = null,
    useEdit = false,
  } = options;

  
  if (!interactionOrMessage) {
    throw new Error('interactionOrMessage is required');
  }
  if (!pages) {
    throw new Error('pages is required');
  }
  if (!renderPage || typeof renderPage !== 'function') {
    throw new Error('renderPage must be a function');
  }

  
  const sessionId = uuidv4().substring(0, 8);

  
  const state = {
    currentPage: initialPage,
    totalPages: totalPages !== null ? totalPages : (Array.isArray(pages) ? pages.length : 0),
    pages: Array.isArray(pages) ? pages : [],
    sessionId,
    userId,
    collector: null,
    message: null,
    lastContainer: null,
  };

    async function getPageData(pageIndex) {
    if (Array.isArray(pages)) {
      return pages[pageIndex];
    } else if (typeof pages === 'function') {
      return await pages(pageIndex);
    }
    throw new Error('Invalid pages type');
  }

    function createPaginationButtons(currentPage, totalPages) {
    const actionRow = new ActionRowBuilder();

    
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`${sessionId}_first`)
        .setEmoji(emojis.leftArrow)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0)
    );

    
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`${sessionId}_prev`)
        .setEmoji(emojis.ArrowLeft)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0)
    );

    
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`${sessionId}_next`)
        .setEmoji(emojis.ArrowRight)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages - 1)
    );

    
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`${sessionId}_last`)
        .setEmoji(emojis.rightArrow)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages - 1)
    );

    return actionRow;
  }

    async function renderCurrentPage(pageIndex) {
    const pageData = await getPageData(pageIndex);
    const container = await renderPage(pageIndex, pageData, state);

    
    if (state.totalPages > 1) {
      const paginationButtons = createPaginationButtons(pageIndex, state.totalPages);
      container.addActionRowComponents(paginationButtons);
    }

    state.lastContainer = container;
    return container;
  }

    function attachCollector(message) {
    if (!message || state.totalPages <= 1) return;

    state.message = message;

    const filter = (i) => {
      
      if (!i.customId.startsWith(sessionId)) return false;

      
      if (userId && i.user.id !== userId) {
        i.reply({ content: "You cannot interact with this pagination.", ephemeral: true }).catch(() => {});
        return false;
      }

      return true;
    };

    state.collector = message.createMessageComponentCollector({
      filter,
      componentType: ComponentType.Button,
      time: timeout,
    });

    state.collector.on('collect', async (i) => {
      try {
        const action = i.customId.split('_')[1];

        let newPage = state.currentPage;

        switch (action) {
          case 'first':
            newPage = 0;
            break;
          case 'prev':
            newPage = Math.max(0, state.currentPage - 1);
            break;
          case 'next':
            newPage = Math.min(state.totalPages - 1, state.currentPage + 1);
            break;
          case 'last':
            newPage = state.totalPages - 1;
            break;
          default:
            return;
        }

        
        state.currentPage = newPage;

        
        if (onPageChange && typeof onPageChange === 'function') {
          await onPageChange(newPage, state);
        }

        
        const container = await renderCurrentPage(newPage);

        
        const attachment = getAttachment ? await getAttachment(newPage) : null;
        const files = attachment ? [attachment] : [];

        
        await i.update({
          components: [container],
          files: files,
          flags: MessageFlags.IsComponentsV2,
        });
      } catch (error) {
        console.error('Pagination interaction error:', error);
        try {
          await i.reply({ content: 'An error occurred while changing pages.', ephemeral: true });
        } catch {}
      }
    });

    state.collector.on('end', async () => {
      try {
        const container = state.lastContainer;
        if (!container) return;

        const components = container.data.components;
        const lastComponent = components[components.length - 1];

        if (lastComponent && lastComponent.components) {
          lastComponent.components.forEach(button => {
            if (button.data) {
              button.data.disabled = true;
            }
          });
        }

        await state.message.edit({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        }).catch(() => {});
      } catch (error) {
        
      }
    });
  }

    async function renderInitial() {
    const container = await renderCurrentPage(state.currentPage);

    
    const attachment = getAttachment ? await getAttachment(state.currentPage) : null;
    const files = attachment ? [attachment] : [];

    let message;

    
    if (useEdit && interactionOrMessage.edit) {
      message = await interactionOrMessage.edit({
        components: [container],
        files: files,
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { users: [] },
      });
    } else if (interactionOrMessage.deferred || interactionOrMessage.replied) {
      
      message = await interactionOrMessage.editReply({
        components: [container],
        files: files,
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { users: [] },
      });
    } else if (interactionOrMessage.reply) {
      
      message = await interactionOrMessage.reply({
        components: [container],
        files: files,
        flags: MessageFlags.IsComponentsV2,
        ephemeral,
        fetchReply: true,
        allowedMentions: { users: [] },
      });
    } else {
      
      message = await interactionOrMessage.channel.send({
        components: [container],
        files: files,
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { users: [] },
      });
    }

    
    if (state.totalPages > 1) {
      attachCollector(message);
    }

    return message;
  }

    function stop() {
    if (state.collector) {
      state.collector.stop();
    }
  }

    function getState() {
    return {
      currentPage: state.currentPage,
      totalPages: state.totalPages,
      sessionId: state.sessionId,
    };
  }

  
  return {
    renderInitial,
    attachCollector,
    stop,
    getState,
  };
}

module.exports = {
  createPaginationSession,
};
