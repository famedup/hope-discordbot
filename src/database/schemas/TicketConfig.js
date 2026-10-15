//
//  Made with care by cashholy (carti)
//

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class TicketConfig extends BaseModel {
    static CACHE_KEYS = [['guildId']];
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, unique: true },
                setupType: { type: DataTypes.STRING, allowNull: false, defaultValue: 'single' },
                panelChannelId: { type: DataTypes.STRING, allowNull: false },
                supportRoleId: { type: DataTypes.STRING, allowNull: false },
                additionalRoleIds: { type: DataTypes.TEXT, allowNull: true, defaultValue: '[]' },
                defaultCategoryId: { type: DataTypes.STRING, allowNull: false },
                logChannelId: { type: DataTypes.STRING, allowNull: false },
                panelTitle: { type: DataTypes.STRING, allowNull: true, defaultValue: 'Support Tickets' },
                panelDescription: { type: DataTypes.TEXT, allowNull: true, defaultValue: 'Select a category to create a support ticket' },
                panelColor: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0x2b2d31 },
                panelImage: { type: DataTypes.STRING, allowNull: true },
                panelThumbnail: { type: DataTypes.STRING, allowNull: true },
                panelMessageId: { type: DataTypes.STRING, allowNull: true },
            },
            {
                sequelize,
                modelName: 'TicketConfig',
                tableName: 'ticket_config',
                timestamps: true,
                indexes: [{ unique: true, fields: ['guildId'] }],
            }
        );
        return this;
    }
}

module.exports = TicketConfig;
