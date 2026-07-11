FROM mcr.microsoft.com/devcontainers/typescript-node:22-bookworm

# Install PostgreSQL directly to avoid GHCR feature resolution issues in prebuilds
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        postgresql \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*
