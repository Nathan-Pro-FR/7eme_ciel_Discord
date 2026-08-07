import fs from 'fs';
import path from 'path';

export class Exporter {
  static async exportGuildTemplate(guild, outputDir = 'exported-template') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await guild.roles.fetch();
    await guild.channels.fetch();

    const serverJson = {
      schemaVersion: "1.0.0",
      nom: guild.name,
      verification_level: guild.verificationLevel,
      explicit_content_filter: guild.explicitContentFilter,
      afk_timeout: guild.afkTimeout,
      icon: guild.iconURL() || null,
      banner: guild.bannerURL() || null
    };

    const rolesJson = {
      schemaVersion: "1.0.0",
      roles: guild.roles.cache.filter(r => !r.managed).map(r => ({
        id: `role_${r.id}`,
        nom: r.name,
        couleur: r.hexColor,
        position: r.position,
        permissions: r.permissions.toArray(),
        mentionnable: r.mentionnable,
        affiche_separement: r.hoist
      }))
    };

    const categoriesJson = {
      schemaVersion: "1.0.0",
      categories: guild.channels.cache.filter(c => c.type === 4).map(c => ({
        id: `cat_${c.id}`,
        nom: c.name,
        position: c.position
      }))
    };

    const channelsJson = {
      schemaVersion: "1.0.0",
      channels: guild.channels.cache.filter(c => c.type !== 4).map(c => ({
        id: `chan_${c.id}`,
        nom: c.name,
        type: c.type,
        categorie_id: c.parentId ? `cat_${c.parentId}` : null,
        position: c.position,
        topic: c.topic || undefined,
        slowmode: c.rateLimitPerUser || 0
      }))
    };

    fs.writeFileSync(path.join(outputDir, 'server.json'), JSON.stringify(serverJson, null, 2));
    fs.writeFileSync(path.join(outputDir, 'roles.json'), JSON.stringify(rolesJson, null, 2));
    fs.writeFileSync(path.join(outputDir, 'categories.json'), JSON.stringify(categoriesJson, null, 2));
    fs.writeFileSync(path.join(outputDir, 'channels.json'), JSON.stringify(channelsJson, null, 2));

    return outputDir;
  }
}