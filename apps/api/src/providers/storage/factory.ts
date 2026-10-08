import { env } from '@/config/env';
import type { StorageProvider } from './StorageProvider';
import { LocalStorageProvider } from './local';
import { CloudinaryStorageProvider } from './cloudinary';
import { S3StorageProvider } from './s3';

let instance: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (instance) return instance;
  switch (env.STORAGE_PROVIDER) {
    case 'cloudinary':
      instance = new CloudinaryStorageProvider();
      break;
    case 's3':
      instance = new S3StorageProvider('s3');
      break;
    case 'r2':
      instance = new S3StorageProvider('r2');
      break;
    default:
      instance = new LocalStorageProvider();
  }
  return instance;
}
