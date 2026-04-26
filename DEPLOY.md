# Guía de Despliegue — Stock IT GEASA

Stack de producción 100% gratuito, sin tarjeta de crédito:

| Servicio | Rol | Límite gratuito |
|----------|-----|----------------|
| [Neon](https://neon.tech) | Base de datos PostgreSQL | 500 MB, sin vencimiento |
| [Render](https://render.com) | Backend FastAPI | 1 web service (duerme tras 15 min sin tráfico) |
| [Netlify](https://netlify.com) | Frontend React | Ancho de banda ilimitado, repos privados incluidos |

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
   - Region: elegir la más cercana (US East suele tener buena latencia desde Argentina)
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
3. Conectar el repositorio de GitHub
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

5. En la sección **Environment Variables** agregar:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | La connection string de Neon del Paso 1 |
   | `SECRET_KEY` | Generar con: `python -c "import secrets; print(secrets.token_hex(32))"` |
   | `PYTHON_VERSION` | `3.11.9` |
   | `ALLOWED_ORIGINS` | `https://stock-it.netlify.app` (actualizar con la URL real después del Paso 3) |

6. Hacer clic en **Create Web Service** y esperar el deploy (~3 minutos)
7. Render asigna una URL como:
   ```
   https://stock-it-api.onrender.com
   ```
   > Guardar esta URL, se usa en el Paso 3.

8. Verificar en el navegador:
   ```
   https://stock-it-api.onrender.com/health
   ```
   Debe responder: `{"status": "ok"}`

---

## Paso 3 — Frontend en Netlify

1. Ir a **https://netlify.com** → Sign up (con GitHub, sin tarjeta)
2. En el dashboard hacer clic en **Add new site → Import an existing project**
3. Elegir **GitHub** y seleccionar el repositorio
4. Netlify detecta el `netlify.toml` automáticamente. Verificar la configuración:

   | Campo | Valor (detectado automáticamente) |
   |-------|----------------------------------|
   | Base directory | `frontend` |
   | Build command | `npm install && npm run build` |
   | Publish directory | `dist` |

5. Expandir **Environment variables** y agregar:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | La URL del backend de Render, ej. `https://stock-it-api.onrender.com` |

6. Hacer clic en **Deploy site**
7. Netlify asigna una URL aleatoria como:
   ```
   https://nombre-aleatorio.netlify.app
   ```
   Se puede renombrar desde **Site configuration → Change site name**.

---

## Paso 4 — Actualizar CORS en Render

Con la URL real de Netlify, actualizarla en Render:

1. Ir a **render.com** → servicio `stock-it-api` → **Environment → Edit**
2. Actualizar:

   | Key | Value |
   |-----|-------|
   | `ALLOWED_ORIGINS` | `https://tu-sitio.netlify.app` (la URL real de Netlify) |

3. Guardar → Render redesplega automáticamente (~1 minuto)

---

## Paso 5 — Verificación final

1. Abrir la URL de Netlify en el navegador
2. Iniciar sesión con las credenciales iniciales:
   - Usuario: `admin` / Contraseña: `Admin123!`
   - Usuario: `soporte` / Contraseña: `Soporte123!`
3. Verificar que el dashboard cargue y muestre los activos de ejemplo

> **Cambiar las contraseñas por defecto** desde Usuarios → editar, antes de compartir el acceso.

---

## Actualizaciones futuras

Cada `git push origin main` dispara un redeploy automático en Render y Netlify.

```bash
git add .
git commit -m "descripción del cambio"
git push origin main
# Render y Netlify redesplegan solos en ~2 minutos
```

---

## Solución de problemas comunes

### El backend no responde en el primer acceso
Render free pone el servicio a dormir tras 15 minutos sin tráfico. El primer request tarda ~30 segundos en despertar. Es normal.

### Error de build en Render (maturin / cargo)
Verificar que la variable de entorno `PYTHON_VERSION=3.11.9` esté configurada en Render.

### Error 401 al intentar login
Verificar que `VITE_API_URL` en Netlify apunte exactamente a la URL de Render (sin barra `/` al final).

### Error CORS en el navegador
Verificar que `ALLOWED_ORIGINS` en Render contenga exactamente la URL de Netlify, con `https://` y sin barra al final.

### El frontend muestra pantalla en blanco al navegar
El `netlify.toml` incluye la regla de redirect para SPA. Si se eliminó ese archivo, recrearlo con el contenido original.

### La base de datos no persiste entre deploys
Con Neon (PostgreSQL), los datos persisten indefinidamente. El SQLite local es solo para desarrollo.

---

## Variables de entorno — resumen completo

### Backend (configurar en Render)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Connection string de Neon | `postgresql://user:pass@host/db?sslmode=require` |
| `SECRET_KEY` | Clave secreta para JWT (32 bytes hex) | `a1b2c3d4...` |
| `ALGORITHM` | Algoritmo JWT (no cambiar) | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Expiración de sesión en minutos | `480` |
| `PYTHON_VERSION` | Versión de Python para Render | `3.11.9` |
| `ALLOWED_ORIGINS` | URL del frontend en Netlify | `https://stock-it.netlify.app` |

### Frontend (configurar en Netlify)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL del backend en Render | `https://stock-it-api.onrender.com` |
