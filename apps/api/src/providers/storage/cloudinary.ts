import { v2 as cloudinary } from 'cloudinary';
import { env } from '@/config/env';
import type { StorageProvider, StorageUploadInput, StorageUploadResult } from './StorageProvider';

export class CloudinaryStorageProvider implements StorageProvider {
  readonly name = 'cloudinary';

  constructor() {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary storage selected but CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET are not set');
    }
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  private resourceType(contentType: string): 'image' | 'video' {
    return contentType.startsWith('video/') ? 'video' : 'image';
  }

  async upload({ buffer, key, contentType }: StorageUploadInput): Promise<StorageUploadResult> {
    // Cloudinary public_id = key without extension; resource type is encoded in the stored key prefix for deletion.
    const publicId = key.replace(/\.[^./]+$/, '');
    const resourceType = this.resourceType(contentType);
    const result = await new Promise<{ secure_url: string; bytes: number }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { public_id: publicId, resource_type: resourceType, overwrite: true },
        (err, res) => (err || !res ? reject(err ?? new Error('Cloudinary upload failed')) : resolve(res)),
      );
      stream.end(buffer);
    });
    return { url: result.secure_url, key: `${resourceType}:${publicId}`, size: result.bytes };
  }

  async delete(key: string): Promise<void> {
    const [type, ...rest] = key.split(':');
    const isTyped = type === 'image' || type === 'video';
    await cloudinary.uploader.destroy(isTyped ? rest.join(':') : key, { resource_type: isTyped ? type : 'image', invalidate: true });
  }

  publicUrl(key: string): string {
    const [type, ...rest] = key.split(':');
    const isTyped = type === 'image' || type === 'video';
    return cloudinary.url(isTyped ? rest.join(':') : key, { secure: true, resource_type: isTyped ? type : 'image' });
  }
}
