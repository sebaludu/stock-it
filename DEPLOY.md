# Guía de Despliegue — Stock IT GEASA

Stack de producción 100% gratuito, sin tarjeta de crédito:

| Servicio | Rol | Límite gratuito |
|----------|-----|----------------|
| [Neon](https://neon.tech) | Base de datos PostgreSQL | 500 MB, sin vencimiento |
| [Render](https://render.com) | Backend FastAPI | 1 web service (duerme tras 15 min sin tráfico) |
| [Vercel](https://vercel.com) | Frontend React | Ancho de banda ilimitado |

---

## Prerrequisito — Subir el código a GitHub

Todo el proceso de despliegue parte de un repositorio en GitHub.

```bash
# Desde la raíz del proyecto (Stock_IT/)
git init
git add .
git commit -m "Stock IT - versión inicial"
```

Luego en github.com:
1. Crear un repositorio nuevo (puede ser privado)
2. Copiar los comandos que GitHub muestra para "push an existing repository"

```bash
git remote add origin https://github.com/TU_USUARIO/stock-it.git
git branch -M main
git push -u origin main
```

---

## Paso 1 — Base de datos en Neon

1. Ir a **https://neon.tech** → Sign up (con Google o email, sin tarjeta)
2. Hacer clic en **Create a project**
   - Project name: `stock-it`
   - Region: elegir la más cercana (ej. US East para Argentina suele tener buena latencia)
3. Una vez creado, ir a **Dashboard → Connection Details**
4. Copiar la **Connection string** que tiene este formato:
   ```
   postgresql://usuario:password@ep-nombre-region.aws.neon.tech/neondb?sslmode=require
   ```
   > Guardar este string, se usa en el Paso 2.

---

## Paso 2 — Backend en Render

1. Ir a **https://render.com** → Sign up (con GitHub, sin tarjeta)
2. En el dashboard hacer clic en **New → Web Service**
3. Conectar el repositorio de GitHub recién creado
4. Completar la configuración:

   | Campo | Valor |
   |-------|-------|
   | Name | `stock-it-api` |
   | Region | Oregon (US West) o el más cercano |
   | Branch | `main` |
   | Root Directory | `backend` |
   | Runtime | `Python 3` |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
   | Instance Type | **Free** |

5. Bajar hasta la sección **Environment Variables** y agregar las siguientes:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | La connection string de Neon del Paso 1 |
   | `SECRET_KEY` | Generar con: `python -c "import secrets; print(secrets.token_hex(32))"` |
   | `ALLOWED_ORIGINS` | `https://stock-it.vercel.app` (actualizar con la URL real después del Paso 3) |

6. Hacer clic en **Create Web Service**
7. Esperar el primer deploy (tarda ~3 minutos)
8. Una vez completado, Render muestra la URL del servicio, algo como:
   ```
   https://stock-it-api.onrender.com
   ```
   > Guardar esta URL, se usa en el Paso 3.

9. Verificar que el backend esté funcionando abriendo en el navegador:
   ```
   https://stock-it-api.onrender.com/health
   ```
   Debe responder: `{"status": "ok"}`

   La documentación de la API queda disponible en:
   ```
   https://stock-it-api.onrender.com/docs
   ```

---

## Paso 3 — Frontend en Vercel

1. Ir a **https://vercel.com** → Sign up (con GitHub, sin tarjeta)
2. En el dashboard hacer clic en **Add New → Project**
3. Importar el repositorio de GitHub
4. Vercel detecta automáticamente que es un proyecto Vite. Verificar la configuración:

   | Campo | Valor |
   |-------|-------|
   | Framework Preset | Vite |
   | Root Directory | `frontend` |
   | Build Command | `npm run build` (detectado automáticamente) |
   | Output Directory | `dist` (detectado automáticamente) |

5. Expandir la sección **Environment Variables** y agregar:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | La URL del backend de Render del Paso 2, ej. `https://stock-it-api.onrender.com` |

6. Hacer clic en **Deploy**
7. Una vez completado, Vercel muestra la URL del frontend, algo como:
   ```
   https://stock-it.vercel.app
   ```

---

## Paso 4 — Actualizar CORS en Render

Ahora que se conoce la URL real del frontend, hay que actualizarla en Render:

1. Ir a **render.com** → entrar al servicio `stock-it-api`
2. Ir a **Environment → Edit**
3. Actualizar la variable:

   | Key | Value |
   |-----|-------|
   | `ALLOWED_ORIGINS` | `https://stock-it.vercel.app` (la URL real de Vercel) |

4. Guardar → Render hace un redeploy automático (~1 minuto)

---

## Paso 5 — Verificación final

1. Abrir `https://stock-it.vercel.app` en el navegador
2. Iniciar sesión con las credenciales iniciales:
   - Usuario: `admin` / Contraseña: `Admin123!`
   - Usuario: `soporte` / Contraseña: `Soporte123!`
3. Verificar que el dashboard cargue y muestre los activos de ejemplo

> **Cambiar las contraseñas por defecto** desde Usuarios → editar, antes de compartir el acceso.

---

## Actualizaciones futuras

Cada vez que se haga `git push origin main`, Render y Vercel detectan el cambio y redesplegan automáticamente (CI/CD sin configuración adicional).

```bash
# Flujo de trabajo habitual
git add .
git commit -m "descripción del cambio"
git push origin main
# Render y Vercel redesplegan solos en ~2 minutos
```

---

## Solución de problemas comunes

### El backend no responde (primer acceso lento)
Render free tier pone el servicio a dormir tras 15 minutos sin tráfico. El primer request después de ese período tarda ~30 segundos en despertar. Es normal.

### Error 401 al intentar login
Verificar que `VITE_API_URL` en Vercel apunte exactamente a la URL de Render (sin barra `/` al final).

### Error CORS en el navegador
Verificar que `ALLOWED_ORIGINS` en Render contenga exactamente la URL de Vercel, incluyendo `https://` y sin barra al final.

### El frontend muestra pantalla en blanco
Verificar que `vercel.json` esté presente en la carpeta `frontend/` (ya está incluido en el proyecto).

### La base de datos no persiste entre deploys
Con Neon (PostgreSQL), los datos persisten indefinidamente. Si se usa SQLite localmente para desarrollo, esos datos no se sincronizan con producción, que usa Neon.

---

## Variables de entorno — resumen completo

### Backend (configurar en Render)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Connection string de Neon | `postgresql://user:pass@host/db?sslmode=require` |
| `SECRET_KEY` | Clave secreta para JWT (32 bytes hex) | `a1b2c3d4...` |
| `ALGORITHM` | Algoritmo JWT (no cambiar) | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Expiración de sesión en minutos | `480` |
| `ALLOWED_ORIGINS` | URL del frontend en Vercel | `https://stock-it.vercel.app` |

### Frontend (configurar en Vercel)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL del backend en Render | `https://stock-it-api.onrender.com` |
