# Multi-stage build for RankPilot
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
WORKDIR /app/packages/prisma
RUN npx prisma generate --schema=prisma/schema.prisma

# Build the API
WORKDIR /app/apps/api
# Copy node_modules to API directory and skip npm install
RUN cp -r ../../node_modules .
RUN npm run build

# Build the web app
WORKDIR /app/apps/web
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder
COPY --from=builder /app/apps/web/public ./apps/web/public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Copy API build and dependencies
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Copy Prisma schema and migrations
COPY --from=builder /app/packages/prisma ./packages/prisma

USER nextjs

EXPOSE 3000 4001

ENV PORT=3000
ENV API_PORT=4001

# Start both services
CMD ["sh", "-c", "cd apps/api && npm start & cd apps/web && npm start"] 