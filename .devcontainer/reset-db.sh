#!/bin/bash
# Resetea la base de datos de desarrollo a un estado limpio,
# eliminando todas las tablas públicas y recreando el schema desde cero.
# Útil dentro del devcontainer o con una BD local.

set -e # Sale inmediatamente si un comando falla

# Configuración — se puede sobreescribir con variables de entorno
DB_NAME="${DATABASE_NAME:-atlas_dev}"
DB_USER="${DATABASE_USER:-postgres}"
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"

SCHEMA_SCRIPT="$(dirname "$0")/init-scripts/01-schema.sql"

echo "⚠️  Preparando reset de la base de datos '$DB_NAME' en $DB_HOST:$DB_PORT..."

# Elimina todos los tipos y tablas del schema public (con CASCADE para FKs)
PGPASSWORD="${DATABASE_PASSWORD:-changeme}" psql \
  -X \
  -v ON_ERROR_STOP=1 \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" <<-EOSQL
    -- Eliminar todas las tablas en orden inverso de dependencias
    DO \$\$
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            RAISE NOTICE 'Tabla eliminada: %', r.tablename;
        END LOOP;
    END;
    \$\$;

    -- Eliminar enums personalizados
    DROP TYPE IF EXISTS shipment_status CASCADE;
    DROP TYPE IF EXISTS quote_status CASCADE;
    DROP TYPE IF EXISTS invoice_status CASCADE;
    DROP TYPE IF EXISTS invoice_type CASCADE;

    RAISE NOTICE 'Schema limpiado correctamente.';
EOSQL

echo "📄 Aplicando schema inicial desde $SCHEMA_SCRIPT..."
PGPASSWORD="${DATABASE_PASSWORD:-changeme}" psql \
  -X \
  -v ON_ERROR_STOP=1 \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f "$SCHEMA_SCRIPT"

echo "✅ Base de datos '$DB_NAME' reseteada correctamente."
echo "👉 Ejecuta 'pnpm run db:seed' para poblar con datos de prueba."
