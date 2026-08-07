import { log } from './logger.js';

export class MetadataManager {
  static BOT_TAG = '[ManagedByBot]';

  static embedMetadata(descriptionOrTopic, logicalId) {
    const base = descriptionOrTopic || '';
    if (base.includes(this.BOT_TAG)) return base;
    return `${base} ${this.BOT_TAG} {id:${logicalId}}`.trim();
  }

  static extractLogicalId(descriptionOrTopic) {
    if (!descriptionOrTopic) return null;
    const match = descriptionOrTopic.match(/\{id:(.+?)\}/);
    return match ? match[1] : null;
  }

  static isManagedByBot(entity, cachedLogicalId = null) {
    if (cachedLogicalId) return true;
    const text = entity.topic || entity.description || '';
    return text.includes(this.BOT_TAG);
  }
}