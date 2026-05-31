# Stage 1: deps — install production-only deps (layer-cached separately from dev deps)
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: builder — full install + Next.js production build
# BUILD_VERSION and GIT_SHA are passed as --build-arg so the prebuild script
# (tsx scripts/generate-build-info.ts) can bake them into public/build-info.json.
FROM node:24-alpine AS builder
WORKDIR /app
ARG BUILD_VERSION
ARG GIT_SHA
ENV BUILD_VERSION=$BUILD_VERSION
ENV GIT_SHA=$GIT_SHA
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: runner — minimal image; standalone bundles its own node_modules
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone output + static assets + public files (build-info.json is inside public/)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
