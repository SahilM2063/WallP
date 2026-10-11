# Cloudflare R2 setup

1. In [Cloudflare Dashboard](https://dash.cloudflare.com/), open R2 and create bucket `wallp-artworks`.
2. Create R2 S3 API credentials with **Object Read & Write**, restricted to that bucket.
3. Copy the Account ID, Access Key ID, and Secret Access Key into `apps/api/.env`:
   ```dotenv
   R2_ACCOUNT_ID=your-account-id
   R2_ACCESS_KEY_ID=your-bucket-scoped-key
   R2_SECRET_ACCESS_KEY=your-secret
   R2_BUCKET=wallp-artworks
   R2_PUBLIC_URL=https://art.yourdomain.com
   ```
4. Add a custom domain to the bucket's Public access settings for production image delivery. Use the dashboard-provided `r2.dev` public URL only for development. Set `R2_PUBLIC_URL` to the delivery base URL, without a trailing slash.
5. The app uploads bytes through the owner-only API. The API validates image format, size, dimensions, strips metadata, encodes JPEG, generates a thumbnail, and stores both. R2 credentials stay on the server.
6. Public delivery is read-only to anyone with an image URL. Never put private files in this bucket. Studio visibility controls publishing, not secrecy of already published artwork bytes.
7. This MVP does not upload directly from the browser to R2, so R2 PUT CORS rules are not required. If using cross-origin browser canvas/tools later, permit GET/HEAD for your exact preview/production origins. Do not treat CORS as authentication.
8. For browser preview configure API `CORS_ORIGINS=http://localhost:8081,http://localhost:8082`; production should list exact trusted origins. Native HTTP is not governed by browser CORS.
9. Sign in as owner → You → Studio → choose a portrait image of at least 1080 × 1920 and at most 20 MB → provide two different art styles and confirm abstract content/rights → Publish.
10. Check both original and thumbnail R2 objects and database metadata. API upload failure must leave no published database row.

Object paths are generated UUID paths, not filenames supplied by the client. Delivery uses immutable cache headers. Archive removes artwork from public queries but retains stored objects; add a lifecycle/cleanup process for old orphaned assets before a large catalog launch.

[S3 API](https://developers.cloudflare.com/r2/api/s3/api/) · [Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) · [CORS](https://developers.cloudflare.com/r2/buckets/cors/) · [Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
