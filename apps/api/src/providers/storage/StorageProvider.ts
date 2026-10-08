export interface StorageUploadInput {
  buffer: Buffer;
  /** Provider-relative key, e.g. `<shopId>/products/<id>/<file>.webp`. */
  key: string;
  contentType: string;
}

export interface StorageUploadResult {
  url: string;
  key: string;
  size: number;
}

export interface StorageProvider {
  name: string;
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}
