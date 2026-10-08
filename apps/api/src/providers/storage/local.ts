import fs from 'fs/promises';
import path from 'path';
import { env } from '@/config/env';
import { UPLOADS_DIR_NAME } from '@/config/constants';
import type { StorageProvider, StorageUploadInput, StorageUploadResult } from './StorageProvider';

/** Absolute directory served statically at /uploads by app.ts (apps/api/uploads). */
export const LOCAL_UPLOAD_ROOT = path.resolve(__dirname, '../../../', UPLOADS_DIR_NAME);

function safeJoin(key: string): string {
  const full = path.resolve(LOCAL_UPLOAD_ROOT, key);
  if (!full.startsWith(LOCAL_UPLOAD_ROOT + path.sep)) throw new Error('Invalid storage key');
  return full;
}

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local';

  async upload({ buffer, key }: StorageUploadInput): Promise<StorageUploadResult> {
    const full = safeJoin(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buffer);
    return { url: this.publicUrl(key), key, size: buffer.length };
  }

  async delete(key: string): Promise<void> {
    await fs.rm(safeJoin(key), { force: true });
  }

  publicUrl(key: string): string {
    return `${env.BACKEND_URL.replace(/\/$/, '')}/${UPLOADS_DIR_NAME}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }
}
