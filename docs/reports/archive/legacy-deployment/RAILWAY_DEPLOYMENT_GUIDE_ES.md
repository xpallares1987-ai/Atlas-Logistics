# 🚀 RAILWAY DEPLOYMENT - GUÍA COMPLETA

**Tiempo:** 5-10 minutos  
**Costo:** Gratis (5$ crédito/mes)  
**Dificultad:** Muy fácil

---

## 📋 PASO 1: Crear Cuenta Railway

### 1.1 Ir a Railway

```
Abre: https://railway.app
```

### 1.2 Sign Up con GitHub

```
1. Haz clic en "Sign up"
2. Elige "Continue with GitHub"
3. Autoriza Railway en GitHub
4. ¡Listo! Ya estás registrado
```

---

## 🔗 PASO 2: Conectar Repositorio

### 2.1 Crear Nuevo Proyecto

```
1. En Railway dashboard, haz clic en "New Project"
2. Selecciona "Deploy from GitHub repo"
```

### 2.2 Conectar Atlas Logistics

```
1. Busca: "atlas-logistics"
   (o el nombre exacto de tu repo)
2. Haz clic en el repo
3. Selecciona rama: "main"
4. Haz clic en "Deploy now"

Railway automáticamente:
✅ Detecta package.json
✅ Instala dependencias (pnpm)
✅ Ejecuta `pnpm build`
✅ Inicia la aplicación
✅ Asigna URL pública
```

---

## ⚙️ PASO 3: Configurar Variables de Entorno

### 3.1 Acceder a Configuración

```
1. En el proyecto Railway
2. Ir a "Variables" en la parte superior
3. Haz clic en "Add Variable"
```

### 3.2 Agregar Variables

Copia y pega estas variables (una por una):

```
NODE_ENV                 production
DEBUG                    false
LOG_LEVEL                info
DATABASE_URL             file:/data/atlas-prod.db
JWT_SECRET               [TU_CLAVE_32_BYTES_DE_FASE_2]
REDIS_PASSWORD           [TU_CLAVE_32_BYTES_DE_FASE_2]
COOKIE_SECRET            [TU_CLAVE_32_BYTES_DE_FASE_2]
REDIS_URL                redis://redis:6379
VITE_API_URL             https://tu-app-[random].up.railway.app
VITE_WS_URL              wss://tu-app-[random].up.railway.app
PROMETHEUS_ENABLED       true
GRAFANA_ADMIN_PASSWORD   [TU_CONTRASEÑA]
```

**IMPORTANTE:**
- `JWT_SECRET`, `REDIS_PASSWORD`, `COOKIE_SECRET` → Usa valores de Fase 2
- `VITE_API_URL` y `VITE_WS_URL` → Railway te dará el dominio automático

---

## 🔍 PASO 4: Esperar Deploy & Verificar

### 4.1 Ver Progreso

```
1. En Railway, ve a "Deployments"
2. Deberías ver un deploy en progreso
3. Espera a que termine (2-5 minutos)

Estados:
🟡 Building...     → Compilando
🟡 Deploying...    → Desplegando
✅ Success         → Listo!
❌ Failed          → Error (revisa logs)
```

### 4.2 Ver Logs (Si hay error)

```
1. Haz clic en el deployment
2. Ve a "Logs"
3. Mira los errores
4. Si necesitas ayuda, comparte los logs conmigo
```

### 4.3 Obtener URL Pública

```
1. Ve a "Settings" en el proyecto
2. Busca "Domain"
3. Copiar el dominio público:
   https://tu-app-xyz12345.up.railway.app
```

---

## ✅ PASO 5: Verificar que Funciona

### 5.1 Probar Backend

```bash
# Prueba el health endpoint:
curl https://tu-app-xyz12345.up.railway.app/api/health

# Deberías ver respuesta JSON:
{
  "status": "ok",
  "database": { "status": "up", "latency": 1 },
  "redis": { "status": "up", "latency": 0 },
  "uptime": 42.123
}
```

### 5.2 Probar Frontend

```
Abre en navegador:
https://tu-app-xyz12345.up.railway.app

Deberías ver:
✅ Atlas Logistics frontend cargándose
✅ Sin errores SSL
✅ Puedes hacer login
```

### 5.3 Verificar Base de Datos

```
Deberías poder:
✅ Crear shipment
✅ Guardar datos
✅ Recuperar datos después
```

---

## 🎯 PASO 6: Conectar Dominio Personal (Opcional)

Si quieres usar tu propio dominio (`yourdomain.com`):

### 6.1 En Railway

```
1. Project Settings
2. Busca "Domain"
3. Haz clic en "Add Custom Domain"
4. Ingresa: yourdomain.com
5. Railway te dará instrucciones DNS
```

### 6.2 En tu Proveedor de Dominio

```
1. Accede a tu registrador (Namecheap, GoDaddy, etc.)
2. Busca "DNS Settings" o "DNS Records"
3. Agrega registro CNAME:
   Nombre: yourdomain.com (o alias)
   Valor: tu-app-xyz12345.up.railway.app
4. Espera 5-30 minutos para propagación
```

### 6.3 Verificar

```
Después de 30 minutos:
https://yourdomain.com

Deberías ver tu app!
```

---

## ⚡ RESUMEN RÁPIDO

| Paso | Acción | Tiempo |
|------|--------|--------|
| 1 | Crear cuenta Railway | 2 min |
| 2 | Conectar GitHub repo | 1 min |
| 3 | Agregar variables de entorno | 2 min |
| 4 | Esperar deploy | 3-5 min |
| 5 | Verificar salud | 1 min |
| 6 | Conectar dominio (opcional) | 2 min |
| **TOTAL** | **Tu app viva** | **~10 min** |

---

## 🆘 TROUBLESHOOTING

### ❌ Build Fallido

```
Causa: Falta pnpm-lock.yaml en repo
Solución: 
1. Commitea pnpm-lock.yaml a GitHub
2. Push a main
3. Reactiva deploy en Railway
```

### ❌ Build Exitoso pero App No Responde

```
Causa: Variables de entorno faltantes
Solución:
1. Ve a "Variables" en Railway
2. Verifica todas las variables están presentes
3. Haz clic en "Trigger Redeploy"
4. Espera 2-3 minutos
```

### ❌ Error de Base de Datos

```
Causa: SQLite no tiene permiso de escritura
Solución:
1. Railway usa sistema de archivos temporal
2. Datos se pierden cuando redeploy
3. Necesitas PostgreSQL o MongoDB en Railway

Para agregar PostgreSQL gratis:
1. En proyecto Railway
2. "+ Add Service"
3. "PostgreSQL"
4. Configurar DATABASE_URL
5. Redeploy
```

### ❌ Error de Redis

```
Causa: Redis no configurado en Railway
Solución:
1. "+ Add Service"
2. "Redis"
3. Copiar DATABASE_URL (que es REDIS_URL)
4. Actualizar variable REDIS_URL
5. Redeploy
```

---

## 🔄 MANTENER LA APP EN VIVO

### Auto-Deploy desde GitHub

Railway automáticamente redeploy cuando:
```
✅ Haces push a main
✅ Creas pull request
✅ Merges a main
```

Esto significa:
- Cambios en código → Auto deploy
- No necesitas hacer nada manual
- Tu app siempre está actualizada

---

## 📊 MONITOREO EN RAILWAY

### Ver Métricas

```
1. Ve a "Metrics" en Railway
2. Verás:
   - CPU usage
   - Memory usage
   - Network in/out
   - Logs en tiempo real
```

### Ver Logs

```
1. Ve a "Logs"
2. Mira errores en tiempo real
3. Útil para debugging
```

---

## 💡 LÍMITES DE RAILWAY (Importante)

```
Crédito gratuito: 5$ / mes

Uso típico de Atlas Logistics:
- Frontend Nginx: ~$0.50/mes
- Backend Node.js: ~$1.00/mes
- Redis: ~$0.50/mes
- PostgreSQL (si usas): ~$1.00/mes
─────────────────────────────
Total: ~$3-4/mes (GRATIS con crédito 5$)

Si usas más de 5$:
→ Necesitas agregar tarjeta de crédito
→ Se cobra la diferencia
```

---

## ✅ SIGUIENTE: PRÓXIMOS PASOS

Después de que Deploy sea exitoso:

### Opción A: Conectar Dominio Personal

```
Si tienes dominio propio:
1. Seguir Paso 6 (arriba)
2. Cambiar VITE_API_URL y VITE_WS_URL
3. Redeploy
```

### Opción B: Agregar PostgreSQL (Mejor que SQLite)

```
Si quieres persistencia real:
1. En Railway: "+ Add Service"
2. Seleccionar "PostgreSQL"
3. Cambiar DATABASE_URL
4. Redeploy
```

### Opción C: Agregar Redis

```
Para colas y cache:
1. En Railway: "+ Add Service"
2. Seleccionar "Redis"
3. Cambiar REDIS_URL
4. Redeploy
```

### Opción D: Agregar Monitoreo

```
Ver Grafana dashboards:
1. Railway tiene métricas integradas
2. Ir a "Metrics" en Railway
3. Ver CPU, memoria, etc.
```

---

## 🎉 ¡LISTO!

Tu app ahora vive en:
```
https://tu-app-xyz12345.up.railway.app
```

### ¿Qué hizo Railway?

✅ Detectó que usas pnpm + monorepo  
✅ Instaló dependencias  
✅ Ejecutó `pnpm build`  
✅ Inició el servidor  
✅ Asignó dominio público  
✅ Configuró SSL/HTTPS automático  
✅ Configuró auto-deploy desde GitHub  

**Todo sin que hagas nada de Linux!** 🚀

---

## 📞 PRÓXIMOS PASOS CONMIGO

Una vez que el deploy sea exitoso en Railway:

```
1. Dame el URL de Railway:
   https://tu-app-xyz12345.up.railway.app

2. Pruebo que funciona:
   - Frontend carga
   - API responde
   - Base de datos OK

3. Si quieres dominio personal:
   - Te guío para conectarlo

4. Si quieres mejor persistencia:
   - Te guío para agregar PostgreSQL
```

---

**Estoy listo para guiarte!**

**¿Empezamos? ¿Ya estás en railway.app?**

