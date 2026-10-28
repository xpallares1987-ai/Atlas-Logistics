@echo off
REM ==============================================================================
REM ATLAS LOGISTICS — Docker Setup Script for Windows
REM ==============================================================================
REM Usage: docker-setup.bat [dev|prod]
REM ==============================================================================

setlocal enabledelayedexpansion

if "%1"=="" (
    echo Usage: docker-setup.bat [dev^|prod]
    echo.
    echo Commands:
    echo   dev     Setup development environment (.env.local^)
    echo   prod    Setup production environment (.env.production^) with secrets
    echo.
    echo Examples:
    echo   docker-setup.bat dev
    echo   docker-setup.bat prod
    exit /b 1
)

if /i "%1"=="dev" (
    echo.
    echo ===============================================================================
    echo Setting up Development Environment
    echo ===============================================================================
    echo.
    
    if exist .env.local (
        echo WARNING: .env.local already exists. Skipping.
        exit /b 0
    )
    
    if not exist .env.local.example (
        echo ERROR: .env.local.example not found
        exit /b 1
    )
    
    copy .env.local.example .env.local >nul
    echo [OK] Created .env.local from template
    echo.
    echo Development environment variables set to defaults:
    echo   NODE_ENV: development
    echo   DATABASE_URL: file:./data/dev.db
    echo   REDIS_URL: redis://redis:6379
    echo   JWT_SECRET: dev-super-secret-jwt-key-change-in-production
    echo.
    echo Next steps:
    echo   1. Review .env.local and update any custom values
    echo   2. Run: docker compose up --pull always
    echo   3. Access: http://localhost:8080 (frontend^)
    echo   4. Access: http://localhost:3001/docs (API docs^)
    echo.
) else if /i "%1"=="prod" (
    echo.
    echo ===============================================================================
    echo Setting up Production Environment
    echo ===============================================================================
    echo.
    
    if exist .env.production (
        set /p overwrite="WARNING: .env.production already exists. Overwrite? (y/N) "
        if /i not "!overwrite!"=="y" exit /b 0
    )
    
    if not exist .env.production.example (
        echo ERROR: .env.production.example not found
        exit /b 1
    )
    
    copy .env.production.example .env.production >nul
    echo [OK] Created .env.production from template
    echo.
    echo WARNING: Before deploying to production:
    echo   1. Edit .env.production with your production values
    echo   2. Update VITE_API_URL, PROMETHEUS_EXTERNAL_URL, GRAFANA_EXTERNAL_URL
    echo   3. Generate strong secrets:
    echo      - JWT_SECRET: 32-byte random hex
    echo      - REDIS_PASSWORD: 32-byte random hex
    echo      - GRAFANA_ADMIN_PASSWORD: 32-byte random
    echo   4. Store secrets securely (Docker Secrets, Vault, etc.)
    echo   5. Enable HTTPS/TLS on reverse proxy
    echo.
    echo To generate secrets on Windows, install:
    echo   - Windows Subsystem for Linux (WSL^) and run: openssl rand -hex 32
    echo   - Or use Python: python -c "import os,binascii; print(binascii.hexlify(os.urandom(32)).decode()^)"
    echo.
    echo Next steps:
    echo   1. Edit .env.production with your values
    echo   2. Run: docker compose -f docker-compose.prod.yml build
    echo   3. Run: docker compose -f docker-compose.prod.yml up -d
    echo.
) else (
    echo ERROR: Unknown command: %1
    echo Usage: docker-setup.bat [dev^|prod]
    exit /b 1
)

echo ===============================================================================
echo Setup Complete!
echo ===============================================================================
echo.
