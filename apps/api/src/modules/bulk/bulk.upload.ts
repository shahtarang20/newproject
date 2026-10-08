import multer, { MulterError } from 'multer';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '@/common/errors';
import { MAX_FILE_BYTES } from './bulk.csv';

const CSV_MIMES = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream']);

const instance = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 10 },
  fileFilter: (_req, file, cb) => {
    const okName = /\.csv$/i.test(file.originalname);
    if (!okName || !CSV_MIMES.has(file.mimetype)) return cb(new AppError(400, 'UPLOAD_INVALID_TYPE', 'Please upload a .csv file'));
    return cb(null, true);
  },
});

const mapMulterError: ErrorRequestHandler = (err, _req, _res, next) => {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError(413, 'UPLOAD_TOO_LARGE', 'CSV file must be 5MB or smaller'));
    return next(new AppError(400, 'VALIDATION_ERROR', `Upload error: ${err.message}`));
  }
  return next(err);
};

/** Single CSV upload in multipart field `file`, ≤ 5MB. */
export const csvUpload: Array<RequestHandler | ErrorRequestHandler> = [instance.single('file'), mapMulterError];
