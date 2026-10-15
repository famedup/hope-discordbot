// [dev] cashholy (carti) :: database/schemas/TicketPanel.js

// hope — ticket panels.
//
// One row per panel ("support", "billing" …). A server can have several, each with
// its own channel, roles, options, automation and messages. Everything configurable
// lives in `data` (JSONB, merged over the defaults in services/ticketStore.js), so adding
// a new setting never needs a database migration.

const { DataTypes } = require('sequelize');
const BaseModel = require('../BaseModel');

class TicketPanel extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false },
                name: { type: DataTypes.STRING(40), allowNull: false },
                panelChannelId: { type: DataTypes.STRING, allowNull: true },
                panelMessageId: { type: DataTypes.STRING, allowNull: true },
                caseCounter: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                data: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
            },
            {
                sequelize,
                modelName: 'TicketPanel',
                tableName: 'ticket_panels',
                timestamps: true,
                indexes: [
                    { unique: true, fields: ['guildId', 'name'] },
                    { fields: ['guildId'] },
                ],
            }
        );
        return this;
    }
}

module.exports = TicketPanel;
