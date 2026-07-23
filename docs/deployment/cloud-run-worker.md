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
  --region us-central1 \
  --min-instances 1 \
  --max-instances 10 \
  --cpu 1 \
  --memory 512Mi \
  --no-allow-unauthenticated \
  --set-env-vars="ZEEBE_MAX_JOBS=20,ZEEBE_JOB_TIMEOUT=60000" \
  --service-account=worker-sa@tu-proyecto-id.iam.gserviceaccount.com
```

### 3. Consideraciones Adicionales
- **Concurrencia vs Peticiones HTTP**: A diferencia del servicio web que escala por peticiones HTTP simultáneas, este worker realiza _Long Polling_ hacia Camunda (SaaS) y mantiene conexiones con PubSub. Configura el escalado de Cloud Run basado en uso de CPU (CPU Utilization) para los contenedores que hacen background processing.
- **Graceful Shutdown**: El código captura `SIGTERM`. Cloud Run envía esta señal cuando va a apagar un contenedor (ej. por scale to zero o redespliegue). El nodo tiene 10 segundos para cerrar conexiones antes del SIGKILL.
- **Sin puerto expuesto**: Aunque Cloud Run asignará una URL interna, los procesos asíncronos en este caso se comunican de forma saliente (outbound) hacia Camunda, por lo que no es necesario exponerlo a internet (`--no-allow-unauthenticated`).
