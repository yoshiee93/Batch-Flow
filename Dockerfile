# Use a lighter node image for production
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the app (assuming 'npm run build' outputs to dist/)
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 reactjs

# Copy built artifacts
COPY --from=builder --chown=reactjs:nodejs /app/dist ./dist
COPY --from=builder --chown=reactjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=reactjs:nodejs /app/package.json ./package.json

USER reactjs

EXPOSE 5000

ENV PORT 5000
# Assuming the entrypoint is a simple node server or serving static files
CMD ["npm", "start"]
