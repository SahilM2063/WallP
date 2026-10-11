# API image. Build from the repository root, because the API imports packages/shared:
#   docker build -f apps/api/Dockerfile -t wallp-api .
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

# Workspace manifests first, so dependency install is cached until they change.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared/package.json packages/shared/
# Only the API and shared workspaces; tsx (a dev dependency) runs the TypeScript directly.
RUN npm ci --include=dev -w @wallp/api -w @wallp/shared

COPY packages/shared packages/shared
COPY apps/api apps/api

WORKDIR /app/apps/api
ENV PORT=4000 HOST=0.0.0.0
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Apply any new migrations, then serve.
CMD ["sh", "-c", "npx tsx src/migrate.ts && exec npx tsx src/server.ts"]
