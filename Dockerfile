# ไทยโครงสร้าง — เว็บแอปออนไลน์ (หน้าเว็บ + API ในที่เดียว)
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_URL=""
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data TRUST_PROXY=1
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=web /web/dist ./public
VOLUME /data
EXPOSE 8080
CMD ["node", "server.js"]
