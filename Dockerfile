# ============================================================================
# ATLAS LOGISTICS — FRONTEND PRODUCTION DOCKERFILE
# Multi-stage optimized: Pre-built production assets served via Nginx Alpine
# ============================================================================
ARG NODE_VERSION=22
ARG PNPM_VERSION=11.5.1

FROM nginx:alpine AS production

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy pre-built frontend distribution
COPY packages/frontend/dist /usr/share/nginx/html

# Create non-root user for security
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

USER nginx

EXPOSE 8080

# Healthcheck with built-in wget
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
    CMD ["/bin/sh", "-c", "wget --quiet --tries=1 --spider http://localhost:8080/healthz || exit 1"]

CMD ["nginx", "-g", "daemon off;"]
