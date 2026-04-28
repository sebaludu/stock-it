# Despliegue en servidor Linux (Ubuntu 22.04 / Debian 12)

El backend corre con `uvicorn` gestionado por `systemd`.
El frontend se sirve como archivos estáticos desde `nginx`.
La base de datos puede ser SQLite (simple) o PostgreSQL (recomendado para producción).

---

## 1. Requisitos previos en el servidor

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.11 python3.11-venv python3-pip git nginx curl
```

Verificar versiones:
```bash
python3.11 --version   # Python 3.11.x
nginx -v               # nginx/1.x.x
```

Instalar Node.js 20 (para compilar el frontend):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x.x
```

---

## 2. Clonar el repositorio

```bash
cd /opt
sudo git clone https://github.com/sebaludu/stock-it.git
sudo chown -R $USER:$USER /opt/stock-it
cd /opt/stock-it
```

---

## 3. Backend

### 3.1 Entorno virtual e instalación de dependencias

```bash
cd /opt/stock-it/backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 3.2 Archivo de configuración `.env`

```bash
nano /opt/stock-it/backend/.env
```

Contenido (ajustar según tu entorno):

```env
# Base de datos — opción A: SQLite (simple, sin instalar nada más)
DATABASE_URL=sqlite:///./stock_it.db

# Base de datos — opción B: PostgreSQL (recomendado)
# DATABASE_URL=postgresql://stockuser:PASSWORD@localhost/stockit

# JWT
SECRET_KEY=cambia_esto_por_una_clave_secreta_larga_y_aleatoria
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS: URL donde va a estar el frontend
# Si nginx sirve todo en el mismo dominio/IP:
ALLOWED_ORIGINS=http://IP_DEL_SERVIDOR
# Con dominio:
# ALLOWED_ORIGINS=https://stock.tudominio.com
```

Generar una `SECRET_KEY` segura:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 3.3 (Opcional) PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE DATABASE stockit;"
sudo -u postgres psql -c "CREATE USER stockuser WITH PASSWORD 'PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE stockit TO stockuser;"
```

Luego usar la opción B en `.env`.

### 3.4 Probar que arranca correctamente

```bash
cd /opt/stock-it/backend
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
# Ctrl+C para detener una vez verificado
```

Abrir en el navegador (desde el servidor o con curl):
```bash
curl http://127.0.0.1:8000/health
# {"status":"ok","users_in_db":2}
```

### 3.5 Servicio systemd para el backend

```bash
sudo nano /etc/systemd/system/stockit-api.service
```

Contenido:
```ini
[Unit]
Description=Stock IT API (FastAPI)
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/stock-it/backend
Environment="PATH=/opt/stock-it/backend/venv/bin"
EnvironmentFile=/opt/stock-it/backend/.env
ExecStart=/opt/stock-it/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Ajustar permisos y activar:
```bash
sudo chown -R www-data:www-data /opt/stock-it/backend
sudo chmod 750 /opt/stock-it/backend

sudo systemctl daemon-reload
sudo systemctl enable stockit-api
sudo systemctl start stockit-api
sudo systemctl status stockit-api
```

Verificar que esté activo (`Active: active (running)`).

Ver logs en tiempo real:
```bash
sudo journalctl -u stockit-api -f
```

---

## 4. Frontend

### 4.1 Configurar la URL del backend

```bash
nano /opt/stock-it/frontend/.env.production
```

Contenido:
```env
# Si nginx está en el mismo servidor (recomendado):
VITE_API_URL=http://IP_DEL_SERVIDOR/api

# Con dominio y SSL:
# VITE_API_URL=https://stock.tudominio.com/api
```

### 4.2 Compilar

```bash
cd /opt/stock-it/frontend
npm install
npm run build
# Genera la carpeta dist/
```

### 4.3 Copiar archivos al directorio web

```bash
sudo mkdir -p /var/www/stockit
sudo cp -r /opt/stock-it/frontend/dist/* /var/www/stockit/
sudo chown -R www-data:www-data /var/www/stockit
```

---

## 5. Nginx

### 5.1 Configuración del sitio

```bash
sudo nano /etc/nginx/sites-available/stockit
```

Contenido:
```nginx
server {
    listen 80;
    server_name IP_DEL_SERVIDOR;  # o tu dominio: stock.tudominio.com

    # Frontend (archivos estáticos)
    root /var/www/stockit;
    index index.html;

    # SPA: todas las rutas van al index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API (proxy inverso)
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Archivos estáticos: caché agresiva
    location ~* \.(js|css|png|jpg|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5.2 Activar y verificar

```bash
sudo ln -s /etc/nginx/sites-available/stockit /etc/nginx/sites-enabled/
sudo nginx -t          # debe decir "syntax is ok"
sudo systemctl reload nginx
```

---

## 6. Verificación final

Abrir en el navegador: `http://IP_DEL_SERVIDOR`

Credenciales iniciales:
- `admin` / `Admin123!`
- `soporte` / `Soporte123!`

> **Importante:** cambiar las contraseñas por defecto inmediatamente desde Usuarios.

---

## 7. (Opcional) HTTPS con Let's Encrypt

Solo si tenés un dominio apuntando al servidor:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d stock.tudominio.com
```

Certbot actualiza nginx automáticamente. Renovación automática:
```bash
sudo systemctl enable certbot.timer
```

---

## 8. Actualizaciones futuras

Cada vez que haya cambios en el repositorio:

```bash
cd /opt/stock-it
git pull origin main

# Actualizar dependencias del backend si cambiaron
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart stockit-api

# Recompilar y redesplegar el frontend
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /var/www/stockit/
```

---

## Resumen de puertos y rutas

| Componente | Ubicación |
|-----------|-----------|
| Backend (interno) | `127.0.0.1:8000` |
| Frontend (archivos) | `/var/www/stockit/` |
| Nginx → frontend | `http://servidor/` |
| Nginx → API | `http://servidor/api/` |
| Logs del backend | `journalctl -u stockit-api` |
| Logs de nginx | `/var/log/nginx/error.log` |
| Base de datos SQLite | `/opt/stock-it/backend/stock_it.db` |

---

## Solución de problemas

**El frontend carga pero la API no responde:**
```bash
sudo systemctl status stockit-api
sudo journalctl -u stockit-api -n 50
```

**Error 502 Bad Gateway:**
El backend no está corriendo. Revisar con `systemctl status stockit-api`.

**Error CORS:**
Verificar que `ALLOWED_ORIGINS` en `.env` coincida exactamente con la URL que usa el navegador (con o sin puerto, con o sin dominio).

**Nginx no sirve las rutas del frontend (404 en refresh):**
Verificar que la directiva `try_files $uri $uri/ /index.html` esté presente en el bloque `location /`.

**Cambios en el .env no se aplican:**
```bash
sudo systemctl restart stockit-api
```
