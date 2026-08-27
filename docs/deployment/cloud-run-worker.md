# Despliegue del Worker Node en Google Cloud Run

Este documento describe cómo desplegar los workers de Camunda y PubSub como un servicio independiente en Google Cloud Run, permitiéndoles escalar horizontalmente basándose en el uso de CPU o métricas personalizadas sin afectar el rendimiento de la API principal.

## Estrategia

Usaremos la misma imagen de contenedor (`Dockerfile.backend`) pero inyectaremos un comando de inicio diferente. De esta forma, mantenemos un único artefacto de build en nuestro CI/CD.

## Pasos de Despliegue

### 1. Construir la Imagen (Opcional si se hace vía CI/CD)

```bash
gcloud builds submit --tag gcr.io/tu-proyecto-id/atlas-backend:latest -f Dockerfile.backend .
```

### 2. Desplegar el Worker Service

Al desplegar en Cloud Run, vamos a sobreescribir el comando (`--command`) y los argumentos (`--args`) para apuntar al entrypoint de los workers.

```bash
gcloud run deploy atlas-worker \
  --image gcr.io/tu-proyecto-id/atlas-backend:latest \
  --command "node" \
  --args "--import,tsx/esm,src/worker-node.ts" \
  --region europe-west1 \
  --min-instances 1 \
  --max-instances 10 \
  --cpu 1 \
  --memory 512Mi \
  --no-allow-unauthenticated \
  --add-cloudsql-instances="tu-proyecto-id:europe-west1:gen-lang-client-0393063451-2-instance" \
  --set-env-vars="REDIS_URL=redis://your-redis-host:6379,DATABASE_URL=postgresql://user:password@localhost/gen-lang-client-0393063451-2-database?host=/cloudsql/tu-proyecto-id:europe-west1:gen-lang-client-0393063451-2-instance" \
  --service-account=worker-sa@tu-proyecto-id.iam.gserviceaccount.com
```

### 3. Consideraciones Adicionales

- **Concurrencia vs Peticiones HTTP**: A diferencia del servicio web que escala por peticiones HTTP simultáneas, este worker realiza el procesamiento en background procesando tareas de **BullMQ**. Configura el escalado de Cloud Run basado en uso de CPU (CPU Utilization) para los contenedores que hacen background processing.
- **Graceful Shutdown**: El código captura `SIGTERM`. Cloud Run envía esta señal cuando va a apagar un contenedor (ej. por scale to zero o redespliegue). El nodo tiene 10 segundos para cerrar conexiones antes del SIGKILL.
- **Sin puerto expuesto**: Este servicio no necesita exponer un puerto web porque solo se conecta a Redis y a la base de datos de manera saliente (`--no-allow-unauthenticated`).
