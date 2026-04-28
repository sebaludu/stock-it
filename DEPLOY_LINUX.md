# Despliegue en Oracle Linux Server 9.6 (RHEL/Fedora-based)

El backend corre con `uvicorn` gestionado por `systemd`.  
El frontend se sirve como archivos estáticos desde `nginx`.  
La base de datos puede ser SQLite (simple) o PostgreSQL (recomendado).

---

## 1. Requisitos previos en el servidor

```bash
sudo dnf update -y
sudo dnf install -y git curl tar
```

### Python 3.11

```bash
sudo dnf install -y python3.11 python3.11-pip
python3.11 --version   # Python 3.11.x
```

### Node.js 20

```bash
# Habilitar módulo Node.js 20 desde AppStream
sudo dnf module reset nodejs -y
sudo dnf module enable nodejs:20 -y
sudo dnf install -y nodejs
node -v    # v20.x.x
npm -v
```

### Nginx

```bash
sudo dnf install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
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
deactivate
```

### 3.2 Archivo de configuración `.env`

```bash
nano /opt/stock-it/backend/.env
```

Contenido (ajustar los valores):

```env
# Base de datos — opción A: SQLite (sin instalar nada más)
DATABASE_URL=sqlite:///./stock_it.db

# Base de datos — opción B: PostgreSQL (recomendado para producción)
# DATABASE_URL=postgresql://stockuser:PASSWORD@localhost/stockit

# JWT
SECRET_KEY=reemplazar_con_clave_generada
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS — URL que verá el navegador del usuario
ALLOWED_ORIGINS=http://IP_DEL_SERVIDOR
# Con dominio: ALLOWED_ORIGINS=https://stock.tudominio.com
```

Generar una `SECRET_KEY` segura:

```bash
python3.11 -c "import secrets; print(secrets.token_hex(32))"
```

### 3.3 (Opcional) PostgreSQL

```bash
sudo dnf install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql

sudo -u postgres psql -c "CREATE DATABASE stockit;"
sudo -u postgres psql -c "CREATE USER stockuser WITH PASSWORD 'PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE stockit TO stockuser;"
```

En `/var/lib/pgsql/data/pg_hba.conf`, cambiar el método de `ident` a `md5` para conexiones locales:

```
# Buscar la línea:
host    all    all    127.0.0.1/32    ident
# Cambiar a:
host    all    all    127.0.0.1/32    md5
```

```bash
sudo systemctl restart postgresql
```

Luego usar la opción B en `.env`.

### 3.4 Probar manualmente

```bash
cd /opt/stock-it/backend
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
# Ctrl+C para detener una vez verificado
```

```bash
curl http://127.0.0.1:8000/health
# {"status":"ok","users_in_db":2}
```

### 3.5 Permisos para el usuario nginx

```bash
sudo chown -R nginx:nginx /opt/stock-it/backend
sudo chmod 750 /opt/stock-it/backend
sudo chmod 640 /opt/stock-it/backend/.env
```

### 3.6 Servicio systemd

```bash
sudo nano /etc/systemd/system/stockit-api.service
```

Contenido:

```ini
[Unit]
Description=Stock IT API (FastAPI)
After=network.target

[Service]
User=nginx
Group=nginx
WorkingDirectory=/opt/stock-it/backend
Environment="PATH=/opt/stock-it/backend/venv/bin"
EnvironmentFile=/opt/stock-it/backend/.env
ExecStart=/opt/stock-it/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable stockit-api
sudo systemctl start stockit-api
sudo systemctl status stockit-api
```

Ver logs:

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
# Nginx actúa de proxy: /api → backend en 127.0.0.1:8000
VITE_API_URL=http://IP_DEL_SERVIDOR/api

# Con dominio y HTTPS:
# VITE_API_URL=https://stock.tudominio.com/api
```

### 4.2 Compilar

```bash
cd /opt/stock-it/frontend
npm install
npm run build
# Genera la carpeta dist/
```

### 4.3 Copiar al directorio web

```bash
sudo mkdir -p /var/www/stockit
sudo cp -r /opt/stock-it/frontend/dist/* /var/www/stockit/
sudo chown -R nginx:nginx /var/www/stockit
```

---

## 5. SELinux

Oracle Linux 9 tiene SELinux en modo **enforcing** por defecto. Sin estos pasos, nginx no puede hacer el proxy al backend ni leer los archivos.

```bash
# Permitir que nginx haga conexiones de red salientes (proxy inverso)
sudo setsebool -P httpd_can_network_connect 1

# Etiqueta SELinux para los archivos del frontend
sudo semanage fcontext -a -t httpd_sys_content_t "/var/www/stockit(/.*)?"
sudo restorecon -Rv /var/www/stockit

# Etiqueta SELinux para el backend (archivos leídos por nginx indirectamente)
sudo semanage fcontext -a -t httpd_sys_content_t "/opt/stock-it/backend(/.*)?"
sudo restorecon -Rv /opt/stock-it/backend
```

> Si `semanage` no está disponible: `sudo dnf install -y policycoreutils-python-utils`

Verificar que SELinux no esté bloqueando nada:

```bash
sudo ausearch -m avc -ts recent | grep nginx
```

---

## 6. Firewall

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https   # si vas a usar SSL
sudo firewall-cmd --reload
sudo firewall-cmd --list-services
```

---

## 7. Nginx

En Oracle Linux / RHEL, la configuración va en `/etc/nginx/conf.d/` (no existe `sites-available`).

```bash
sudo nano /etc/nginx/conf.d/stockit.conf
```

Contenido:

```nginx
server {
    listen 80;
    server_name IP_DEL_SERVIDOR;  # o tu dominio: stock.tudominio.com

    # Frontend — archivos estáticos
    root /var/www/stockit;
    index index.html;

    # SPA: todas las rutas van al index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy inverso al backend
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Caché de archivos estáticos
    location ~* \.(js|css|png|jpg|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo nginx -t           # debe decir "syntax is ok"
sudo systemctl reload nginx
```

---

## 8. Verificación final

Abrir en el navegador: `http://IP_DEL_SERVIDOR`

Credenciales iniciales:
- `admin` / `Admin123!`
- `soporte` / `Soporte123!`

> **Cambiar contraseñas por defecto** desde el menú Usuarios antes de compartir el acceso.

---

## 9. (Opcional) HTTPS con Let's Encrypt

Solo si tenés un dominio apuntando al servidor:

```bash
sudo dnf install -y epel-release
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d stock.tudominio.com
sudo systemctl enable certbot-renew.timer
```

---

## 10. Actualizaciones futuras

```bash
cd /opt/stock-it
sudo git pull origin main

# --- Backend ---
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate
sudo chown -R nginx:nginx /opt/stock-it/backend
sudo systemctl restart stockit-api

# --- Frontend ---
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /var/www/stockit/
sudo chown -R nginx:nginx /var/www/stockit
sudo restorecon -Rv /var/www/stockit
```

---

## Resumen de rutas y comandos útiles

| Componente | Ubicación |
|-----------|-----------|
| Código fuente | `/opt/stock-it/` |
| Backend `.env` | `/opt/stock-it/backend/.env` |
| Base de datos SQLite | `/opt/stock-it/backend/stock_it.db` |
| Frontend compilado | `/var/www/stockit/` |
| Config nginx | `/etc/nginx/conf.d/stockit.conf` |
| Servicio backend | `systemctl [start\|stop\|restart\|status] stockit-api` |
| Logs backend | `journalctl -u stockit-api -f` |
| Logs nginx | `tail -f /var/log/nginx/error.log` |

---

## Solución de problemas

**502 Bad Gateway:**
```bash
sudo systemctl status stockit-api
sudo journalctl -u stockit-api -n 50
```

**403 Forbidden al cargar el frontend:**
```bash
# Revisar contexto SELinux
ls -Z /var/www/stockit/
sudo restorecon -Rv /var/www/stockit
```

**nginx no puede conectar al backend (proxy falla):**
```bash
sudo setsebool -P httpd_can_network_connect 1
sudo ausearch -m avc -ts recent | grep nginx
```

**Puerto 80 no accesible desde afuera:**
```bash
sudo firewall-cmd --list-services   # debe incluir http
sudo firewall-cmd --permanent --add-service=http && sudo firewall-cmd --reload
```

**Error CORS en el navegador:**
Verificar que `ALLOWED_ORIGINS` en `.env` coincida exactamente con la URL del navegador (protocolo + host + puerto si no es 80/443).

**Cambios en `.env` no se aplican:**
```bash
sudo systemctl restart stockit-api
```
