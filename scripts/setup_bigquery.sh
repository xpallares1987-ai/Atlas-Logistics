#!/bin/bash
# Script para configurar Datastream de Cloud SQL a BigQuery para Atlas Logistics Analytics

PROJECT_ID="gen-lang-client-0393063451"
REGION="europe-west1"
DB_INSTANCE="gen-lang-client-0393063451-2-instance"

echo "Habilitando APIs necesarias..."
gcloud services enable datastream.googleapis.com bigquery.googleapis.com \
    --project=$PROJECT_ID

echo "Creando Dataset en BigQuery..."
bq --location=$REGION mk -d \
    --description "Dataset analítico para ESG Carbon Tracker y Profitability" \
    $PROJECT_ID:atlas_analytics

echo "Configurando perfil de conexión de origen (Cloud SQL PostgreSQL)..."
# Nota: La base de datos requiere decodificación lógica (logical decoding) habilitada.
gcloud datastream connection-profiles create atlas-pg-source \
    --location=$REGION \
    --type=postgresql \
    --postgresql-hostname=$(gcloud sql instances describe $DB_INSTANCE --format="value(ipAddresses[0].ipAddress)") \
    --postgresql-port=5432 \
    --postgresql-username=postgres \
    --postgresql-password=TU_PASSWORD_SEGURO \
    --postgresql-database=atlas_db \
    --display-name="Atlas PostgreSQL Source" \
    --project=$PROJECT_ID

echo "Configurando perfil de conexión de destino (BigQuery)..."
gcloud datastream connection-profiles create atlas-bq-destination \
    --location=$REGION \
    --type=bigquery \
    --display-name="Atlas BigQuery Destination" \
    --project=$PROJECT_ID

echo "¡Listo! La infraestructura básica de Datastream está creada."
echo "IMPORTANTE: Para iniciar la replicación CDC (Change Data Capture), crea un flujo (Stream) en la consola de GCP conectando ambos perfiles."
