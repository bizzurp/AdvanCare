import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Hono } from 'hono';
import * as v from 'valibot';
import type { AppEnv, Bindings } from '../env';
import { ApiError } from '../lib/errors';
import { validate } from '../lib/validation';

const MB = 1024 * 1024;
export const UPLOAD_URL_EXPIRY_SECONDS = 15 * 60;

/** Whitelisted upload types: extension and maximum size. */
export const UPLOAD_TYPES = {
  'image/jpeg': { ext: 'jpg', maxBytes: 5 * MB },
  'image/png': { ext: 'png', maxBytes: 5 * MB },
  'application/pdf': { ext: 'pdf', maxBytes: 10 * MB },
} as const;
type UploadType = keyof typeof UPLOAD_TYPES;

const UPLOAD_KEY = /^uploads\/\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|pdf)$/;

export const UploadUrlRequest = v.pipe(
  v.strictObject({
    contentType: v.picklist(Object.keys(UPLOAD_TYPES) as [UploadType, ...UploadType[]], 'Only JPEG, PNG and PDF files are accepted.'),
    contentLength: v.pipe(v.number(), v.integer(), v.minValue(1, 'The file is empty.')),
  }),
  v.forward(
    v.check(
      (input) => input.contentLength <= UPLOAD_TYPES[input.contentType].maxBytes,
      'The file is too large. Images may be up to 5 MB and PDFs up to 10 MB.',
    ),
    ['contentLength'],
  ),
);

export const storage = new Hono<AppEnv>();

/**
 * Presigned R2 PUT. The signature covers Content-Type and Content-Length, so the
 * client must upload exactly the declared type and size or R2 rejects the PUT.
 */
storage.post('/storage/upload-url', validate('json', UploadUrlRequest), async (c) => {
  const { contentType, contentLength } = c.req.valid('json');
  const client = s3Client(c.env);
  const now = new Date();
  const key = `uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${UPLOAD_TYPES[contentType].ext}`;

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: c.env.R2_BUCKET_NAME, Key: key, ContentType: contentType, ContentLength: contentLength }),
    { expiresIn: UPLOAD_URL_EXPIRY_SECONDS, signableHeaders: new Set(['content-type', 'content-length']) },
  );

  return c.json(
    {
      key,
      uploadUrl,
      method: 'PUT',
      headers: { 'Content-Type': contentType, 'Content-Length': String(contentLength) },
      expiresAt: new Date(now.getTime() + UPLOAD_URL_EXPIRY_SECONDS * 1000).toISOString(),
    },
    201,
  );
});

// TODO(ADV-AUTH-001): gate both storage routes on an authenticated session and record ownership.
storage.get('/storage/file/:key{.+}', async (c) => {
  const key = c.req.param('key');
  if (!UPLOAD_KEY.test(key)) throw new ApiError(404, 'FILE_NOT_FOUND', 'File not found.');

  const object = await c.env.UPLOADS.get(key);
  if (!object) throw new ApiError(404, 'FILE_NOT_FOUND', 'File not found.');

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Content-Length', String(object.size));
  // Clinical documents: never cache in shared caches, never let the browser sniff types.
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Disposition', 'inline');
  return new Response(object.body, { headers });
});

function s3Client(env: Bindings): S3Client {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new ApiError(503, 'STORAGE_UNCONFIGURED', 'File uploads are not available right now.');
  }
  return new S3Client({
    region: 'auto',
    forcePathStyle: true,
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
}
