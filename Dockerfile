# Multi-stage Dockerfile for SpillTheory (Fullstack 4D Digital Twin)
# Stage 1: Build Frontend SPA
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json tsconfig*.json vite.config.ts tailwind.config.js postcss.config.js ./
RUN npm ci --prefer-offline || npm install
COPY index.html ./
COPY public ./public
COPY src ./src
RUN npm run build

# Stage 2: Python Backend Runtime
FROM python:3.11-slim AS runtime
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0

# Install system dependencies if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY backend ./backend
COPY sar ./sar
COPY eo ./eo
COPY demo_data ./demo_data
COPY models ./models

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 8000

CMD ["python", "backend/run_server.py"]
