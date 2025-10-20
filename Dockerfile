FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && npx playwright install --with-deps chromium

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Install tsx for TypeScript execution
RUN npm install -g tsx

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Railway will override this with the start command from railway.json
CMD ["tsx", "src/scheduler.ts"]
