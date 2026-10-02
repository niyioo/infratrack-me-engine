# ── Build ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Baked into the bundle at build time (Vite inlines VITE_* variables).
ARG VITE_PUBLIC_API_BASE_URL=http://localhost:8000/api/public
ENV VITE_PUBLIC_API_BASE_URL=$VITE_PUBLIC_API_BASE_URL
RUN npm run build

# ── Serve ────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# The nginx image renders /etc/nginx/templates/*.template with envsubst at startup,
# substituting only variables that exist in the environment (so $uri etc. survive).
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Origin of the API, used in the Content-Security-Policy connect-src.
ENV PUBLIC_API_ORIGIN=http://localhost:8000

EXPOSE 80
