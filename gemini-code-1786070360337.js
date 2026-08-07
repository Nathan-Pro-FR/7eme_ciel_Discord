import fs from 'fs';
import path from 'path';

export class AssetResolver {
  static resolve(assetPath) {
    if (!assetPath) return null;
    if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
      return assetPath;
    }

    const localPath = path.resolve(assetPath);
    if (fs.existsSync(localPath)) {
      return localPath;
    }

    const fallbackInAssets = path.resolve('assets', assetPath);
    if (fs.existsSync(fallbackInAssets)) {
      return fallbackInAssets;
    }

    return null;
  }
}