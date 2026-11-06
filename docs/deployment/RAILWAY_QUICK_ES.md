# ⚡ RAILWAY - RESUMEN ULTRA RÁPIDO

**Tiempo total:** 5-10 minutos  
**Costo:** Gratis

---

## 🎯 LOS 5 PASOS

### 1️⃣ CREAR CUENTA (2 min)
```
railway.app → Sign up → GitHub
```

### 2️⃣ CONECTAR REPO (1 min)
```
"New Project" → "Deploy from GitHub"
→ Seleccionar: atlas-logistics
→ Main branch
→ "Deploy now"
```

### 3️⃣ VARIABLES DE ENTORNO (2 min)
```
Variables → Add Variable → Agregar:

NODE_ENV=production
JWT_SECRET=[tu_clave_fase_2]
REDIS_PASSWORD=[tu_clave_fase_2]
DATABASE_URL=file:/data/atlas-prod.db
VITE_API_URL=https://[railway-url]
VITE_WS_URL=wss://[railway-url]

(El resto con valores por defecto)
```

### 4️⃣ ESPERAR DEPLOY (3-5 min)
```
Deployments → Ver progreso
🟡 Building...
🟡 Deploying...
✅ Success ← Esperar esto
```

### 5️⃣ VERIFICAR (1 min)
```
curl https://[tu-app-url].up.railway.app/api/health

Response:
{
  "status": "ok",
  "database": {"status": "up"},
  "redis": {"status": "up"}
}

✅ ¡Listo!
```

---

## 📊 CHECKLIST

```
☐ Registrado en railway.app
☐ GitHub conectado
☐ Repo atlas-logistics conectado
☐ Variables de entorno configuradas
☐ Deploy completado (Status: Success)
☐ Health check respondiendo
☐ Frontend cargando en navegador
```

---

## 🔗 TU APP VIVIRÁ EN

```
https://[random-id].up.railway.app

Ejemplo:
https://atlas-logistics-prod-xyz123.up.railway.app
```

---

## ❓ SI ALGO FALLA

### Build Error
```
Solución: Commit pnpm-lock.yaml → push main → redeploy
```

### App Not Responding
```
Solución: Ve a "Variables" → Verifica todas presentes → Redeploy
```

### Database Error
```
Solución: Agregar PostgreSQL desde Railway (+ Add Service)
```

---

## 💰 COSTO

```
Crédito gratuito: 5$ / mes

Atlas Logistics usa: ~$3-4/mes
(Frontend + Backend + Redis)

Resultado: ¡GRATIS!
```

---

## ✅ ¿YA HICISTE TODO?

```
Sí → Dame el URL de Railway:
     https://[tu-app].up.railway.app
     
     Te verifico que funciona

No → Dime en qué paso estás atascado
     Te ayudo
```

---

**Guía completa:** RAILWAY_DEPLOYMENT_GUIDE_ES.md

