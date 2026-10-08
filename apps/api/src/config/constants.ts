export const API_PREFIX = '/api';
export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/api/auth';
export const ACCESS_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;

export const BCRYPT_ROUNDS = 12;
export const DEFAULT_TRIAL_DAYS = 14;
export const ANALYTICS_EVENT_TTL_DAYS = 400;
export const PUBLIC_CACHE_TTL_MS = 30_000;

export const UPLOAD_LIMITS = {
  imageMaxBytes: 10 * 1024 * 1024,
  videoMaxBytes: 100 * 1024 * 1024,
  imageMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  videoMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
} as const;

export const UPLOADS_DIR_NAME = 'uploads';
export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
export const MAX_JSON_BODY = '1mb';
