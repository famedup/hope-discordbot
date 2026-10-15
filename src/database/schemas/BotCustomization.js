/* ⌁ crafted by cashholy (carti) ⌁ */

// hope — per-server bot customisation (accent colour, bio, name style, …)

const { DataTypes } = require('sequelize');
const BaseModel = require('../BaseModel');

const cache = new Map();

class BotCustomization extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, unique: true },
                accentColor: { type: DataTypes.INTEGER, allowNull: true },
                userBio: { type: DataTypes.TEXT, allowNull: true },
                nameStyle: { type: DataTypes.JSON, allowNull: true },
                mentionReply: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            },
            {
                sequelize,
                modelName: 'BotCustomization',
                tableName: 'bot_customization',
                timestamps: true,
            }
        );
        return this;
    }

    /** Plain object with defaults; never null. */
    static async read(guildId) {
        if (cache.has(guildId)) return cache.get(guildId);
        const row = await this.findOne({ where: { guildId } });
        const val = row
            ? { accentColor: row.accentColor, userBio: row.userBio, nameStyle: row.nameStyle, mentionReply: row.mentionReply }
            : { accentColor: null, userBio: null, nameStyle: null, mentionReply: true };
        cache.set(guildId, val);
        return val;
    }

    static async write(guildId, patch) {
        const [row] = await this.findOrCreate({ where: { guildId }, defaults: { guildId } });
        Object.assign(row, patch);
        await row.save();
        cache.delete(guildId);
        return this.read(guildId);
    }

    static async clear(guildId) {
        await this.destroy({ where: { guildId } });
        cache.delete(guildId);
    }

    /** Guild ids → accent colour for every server that set one. */
    static async allAccents() {
        const rows = await this.findAll({ where: {}, attributes: ['guildId', 'accentColor'] });
        return rows.filter(r => r.accentColor != null).map(r => [r.guildId, r.accentColor]);
    }
}

module.exports = BotCustomization;
