// @cashholy(carti) — GuardSettings

// hope — extra security settings (AI guard / AI moderation) stored as JSON per
// guild and scope. A new table, so existing databases need no migration.

const { DataTypes } = require('sequelize');
const BaseModel = require('../BaseModel');

const DEFAULTS = {
  antinuke: { ai: false, level: 'balanced', extraOwners: [], admins: [] },
  automod: { ai: false, level: 'balanced', categories: ['toxicity', 'hate', 'scam', 'threat'], action: 'delete' },
};

const cache = new Map();
const key = (g, s) => `${g}:${s}`;

class GuardSettings extends BaseModel {
  static init(sequelize) {
    super.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        guildId: { type: DataTypes.STRING, allowNull: false },
        scope: { type: DataTypes.STRING, allowNull: false },
        data: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
      },
      {
        sequelize,
        modelName: 'GuardSettings',
        tableName: 'guard_settings',
        timestamps: true,
        indexes: [{ unique: true, fields: ['guildId', 'scope'] }],
      }
    );
    return this;
  }

  /** Always returns a full object (defaults merged in). Cached for 60s. */
  static async read(guildId, scope) {
    const hit = cache.get(key(guildId, scope));
    if (hit && Date.now() - hit.ts < 60_000) return hit.val;
    const row = await this.findOne({ where: { guildId, scope } }).catch(() => null);
    const val = { ...DEFAULTS[scope], ...(row?.data ?? {}) };
    cache.set(key(guildId, scope), { val, ts: Date.now() });
    return val;
  }

  static async write(guildId, scope, patch) {
    const current = await this.read(guildId, scope);
    const next = { ...current, ...patch };
    const [row] = await this.findOrCreate({ where: { guildId, scope }, defaults: { guildId, scope, data: next } });
    row.data = next;
    row.changed('data', true);
    await row.save();
    cache.set(key(guildId, scope), { val: next, ts: Date.now() });
    return next;
  }

  static async clear(guildId, scope) {
    await this.destroy({ where: { guildId, scope } });
    cache.delete(key(guildId, scope));
  }
}

GuardSettings.DEFAULTS = DEFAULTS;
module.exports = GuardSettings;
