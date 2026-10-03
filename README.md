# Rapid Market

Aplicacion de gestion con frontend React/Vite y backend Django REST Framework.

## Requisitos

- Python 3.12 o posterior
- Node.js compatible con Vite 8
- PostgreSQL
- Git

## Primera instalacion en Windows

1. Clona el repositorio y abre una terminal en la carpeta del proyecto.
2. Crea tu configuracion local copiando `.env.example` a `.env`:

	```powershell
	Copy-Item .env.example .env
	```

3. Edita `.env`: define una `DJANGO_SECRET_KEY` unica y coloca la contrasena local de PostgreSQL en `DB_PASSWORD`. No compartas este archivo.

	Puedes generar una clave con:

	```powershell
	python -c "from secrets import token_urlsafe; print(token_urlsafe(50))"
	```

4. Crea la base de datos `rapid_market` en PostgreSQL. Por ejemplo, desde pgAdmin, crea una base con ese nombre.
5. Crea un entorno e instala las dependencias de Python:

	```powershell
	python -m venv .venv
	.\.venv\Scripts\python.exe -m pip install -r requirements.txt
	```

6. Solo para una base nueva, inicializa las tablas propias de Rapid Market con el esquema versionado:

	```powershell
	psql -U postgres -d rapid_market -f database_schema.sql
	```

	Si `psql` no esta en el PATH, ejecuta `database_schema.sql` desde pgAdmin (Query Tool). El archivo contiene estructura, no filas ni cuentas. Si ya usas una base compartida que contiene estas tablas, no vuelvas a importar el esquema.

7. Crea las tablas de Django:

	```powershell
	.\.venv\Scripts\python.exe manage.py migrate
	```

	En bases existentes, haz primero un respaldo: esta migracion de datos no es reversible. Mueve las referencias de compras, ventas y gastos a usuarios de Django Auth; conserva las cuentas anteriores como cuentas archivadas e inactivas, crea grupos a partir de los roles y vacia las tablas `usuarios` y `roles`. Las cuentas archivadas no permiten iniciar sesion.

8. Instala las dependencias del frontend:

	```powershell
	npm ci
	```

9. Cuando quieras habilitar el acceso, crea la cuenta administradora de Django Auth:

	```powershell
	.\.venv\Scripts\python.exe manage.py createsuperuser
	```

	La cuenta debe ser superusuario para tener acceso completo al API y al panel de Django. Los grupos y permisos del API se administran desde el panel de Django.

## Ejecutar el sistema

Asegurate de que PostgreSQL este iniciado. Abre dos terminales en la carpeta del proyecto.

En la primera:

```powershell
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

En la segunda:

```powershell
npm run dev
```

Abre la URL que indique Vite, normalmente `http://localhost:5173`.

## Siguientes ejecuciones

No vuelvas a crear el entorno ni a instalar dependencias. Inicia PostgreSQL y ejecuta los dos comandos de servidor en terminales separadas.

## Archivos locales y secretos

- `.env` guarda configuracion local y no debe subirse a GitHub.
- `.env.example` es una plantilla sin credenciales reales y si se sube.
- `.venv`, `venv`, `node_modules` y `dist` se generan localmente y estan excluidos por `.gitignore`.
- `database_schema.sql` contiene solo el esquema. No incluyas respaldos con usuarios, hashes de contrasenas o datos reales.
- `package-lock.json` y `requirements.txt` se versionan para reproducir las dependencias.

## Vite template notes

The React + Vite template documentation follows.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
