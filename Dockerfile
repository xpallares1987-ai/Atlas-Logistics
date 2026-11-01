# ============================================================================
# ATLAS LOGISTICS — FRONTEND PRODUCTION DOCKERFILE
# Multi-stage optimized: Pre-built production assets served via Nginx Alpine
# ============================================================================
FROM nginx:alpine AS production

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy pre-built frontend distribution
COPY packages/frontend/dist /usr/share/nginx/html

EXPOSE 8080

# Healthcheck with built-in wget
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
    CMD ["/bin/sh", "-c", "wget --quiet --tries=1 --spider http://localhost:8080/healthz || exit 1"]

CMD ["nginx", "-g", "daemon off;"]
