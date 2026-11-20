# Production image for the VPS (see docs/deploy-vps.md). Built by deploy.sh.

# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
# Node 22: pdfjs (inside unpdf) needs process.getBuiltinModule, which Node 20.11 lacks.
FROM node:22.17.0-alpine AS builder

WORKDIR /app

# libc6-compat is required for native Node.js modules on Alpine Linux
RUN apk add --no-cache libc6-compat

# Same major as the pnpm that wrote pnpm-lock.yaml
RUN npm install -g pnpm@10.28.1

# Manifest + lockfile first, so install only re-runs when they change.
# The Prisma schema too: postinstall runs `prisma generate`.
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile --unsafe-perm

COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* values are inlined into the bundle at build time, so they come in as
# build args (deploy.sh reads them from .env.production). Everything else is runtime env.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPPORT_EMAIL
ARG NEXT_PUBLIC_DEMO_MODE
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPPORT_EMAIL=$NEXT_PUBLIC_SUPPORT_EMAIL
ENV NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE

ENV NODE_OPTIONS="--max-old-space-size=6144"

RUN pnpm build

# ─── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM node:22.17.0-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Standalone output carries only the traced dependencies; no node_modules copy needed
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
