// ▛▀ cashholy (carti) ▀▜

// hope — per-user language preference.
//
// One row per Discord USER (never per guild), so the choice follows the user
// into every server and DM, and two members of the same server can use
// different languages without ever touching each other's setting.
//
//   source = 'auto'   → detected from the Discord client locale (re-detected
//                       whenever the user's Discord language changes)
//   source = 'manual' → the user picked it in /language (never overwritten)

const { DataTypes } = require('sequelize');
const BaseModel = require('../BaseModel');

class UserLanguage extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                userId:   { type: DataTypes.STRING, primaryKey: true, allowNull: false },
                language: { type: DataTypes.STRING(10), allowNull: false },
                source:   { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'auto' },
            },
            {
                sequelize,
                modelName: 'UserLanguage',
                tableName: 'user_language',
                timestamps: true,
            }
        );
        return this;
    }

    /** Every saved preference as [userId, language, source] (loaded once at startup). */
    static async allRows() {
        const rows = await this.findAll({ attributes: ['userId', 'language', 'source'], raw: true });
        return rows.map(r => [r.userId, r.language, r.source]);
    }

    static async save(userId, language, source) {
        await this.upsert({ userId, language, source });
    }
}

module.exports = UserLanguage;
