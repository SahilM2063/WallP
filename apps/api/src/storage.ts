import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
export interface ArtStorage {
  put(key: string, bytes: Buffer): Promise<void>;
  remove(key: string): Promise<void>;
  url(key: string): string;
}
export function createStorage(env: NodeJS.ProcessEnv): ArtStorage {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
  });
  return {
    put: async (Key, Body) => {
      await client.send(
        new PutObjectCommand({
          Bucket: env.R2_BUCKET,
          Key,
          Body,
          ContentType: 'image/jpeg',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    },
    remove: async (Key) => {
      await client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key }));
    },
    url: (key) => `${env.R2_PUBLIC_URL!.replace(/\/$/, '')}/${key}`,
  };
}
