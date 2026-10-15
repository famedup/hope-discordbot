// ▛▀ cashholy (carti) ▀▜

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class AutomodWhitelist extends BaseModel {
    static CACHE_KEYS = [['guildId', 'targetId']];

    static MODULES = {
        antiSpam: 'Anti-Spam',
        antiLink: 'Anti-Link',
        antiInvite: 'Anti-Invite',
        antiBadWords: 'Anti-Bad Words',
        antiMassMention: 'Anti-Mass Mention',
        antiCaps: 'Anti-Caps'
    };

    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, comment: 'Discord Guild ID' },
                targetId: { type: DataTypes.STRING, allowNull: false, comment: 'User/Role/Channel ID' },
                targetType: { type: DataTypes.STRING, allowNull: false, comment: 'user, role, or channel' },
                modules: { type: DataTypes.TEXT, defaultValue: '[]', comment: 'JSON array of exempt modules' },
            },
            {
                sequelize,
                modelName: 'AutomodWhitelist',
                tableName: 'automod_whitelist',
                timestamps: true,
                indexes: [
                    {
                        unique: true,
                        fields: ['guildId', 'targetId'],
                    },
                    {
                        fields: ['guildId'],
                    },
                ],
            }
        );
        return this;
    }

    getModules() {
        try {
            return JSON.parse(this.modules || '[]');
        } catch {
            return [];
        }
    }

    async setModules(modules) {
        this.modules = JSON.stringify(modules);
        await this.save();
    }
}

module.exports = AutomodWhitelist;
