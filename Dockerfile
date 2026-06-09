# Stage 1: builder — full install + Next.js static export
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

# Stage 2: runner — nginx:alpine serves the static export; no Node.js in the final image
FROM nginx:alpine AS runner
COPY --from=builder /app/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
