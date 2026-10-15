// @cashholy(carti) — AntinukeWhitelist

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class AntinukeWhitelist extends BaseModel {
    static CACHE_KEYS = [['guildId', 'userId']];
    
    static EVENTS = {
        ban: 'Anti Ban',
        kick: 'Anti Kick',
        channel_create: 'Anti Channel Create',
        channel_delete: 'Anti Channel Delete',
        role_create: 'Anti Role Create',
        role_delete: 'Anti Role Delete',
        role_update: 'Anti Role Update',
        webhook_create: 'Anti Webhook',
        bot_add: 'Anti Bot',
        guild_update: 'Anti Guild Update'
    };

    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, comment: 'Discord Guild ID' },
                userId: { type: DataTypes.STRING, allowNull: false, comment: 'Whitelisted User ID' },
                addedBy: { type: DataTypes.STRING, allowNull: false, comment: 'Who added this user' },
                events: { 
                    type: DataTypes.TEXT, 
                    allowNull: true, 
                    defaultValue: null,
                    comment: 'JSON array of whitelisted events, null means all events',
                    get() {
                        const value = this.getDataValue('events');
                        return value ? JSON.parse(value) : null;
                    },
                    set(value) {
                        this.setDataValue('events', value ? JSON.stringify(value) : null);
                    }
                },
            },
            {
                sequelize,
                modelName: 'AntinukeWhitelist',
                tableName: 'antinuke_whitelist',
                timestamps: true,
                indexes: [
                    {
                        unique: true,
                        fields: ['guildId', 'userId'],
                    },
                ],
            }
        );
        return this;
    }
}

module.exports = AntinukeWhitelist;
