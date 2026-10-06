# Controles OWASP aplicados

Rapid Market es un proyecto académico local. Esta lista documenta controles concretos inspirados en OWASP API Security Top 10 (2023) y en controles de verificación ASVS; no declara una certificación ni una auditoría formal de cumplimiento.

## Controles implementados

- **Autenticación y contraseñas (API2, ASVS V2):** login con errores genéricos y límite de cinco intentos por minuto según la IP; las contraseñas se verifican con los hashers de Django. Se eliminó la compatibilidad que aceptaba contraseñas en texto plano. Los scripts de alta y cambio de contraseña aplican longitud mínima de 12 caracteres y los validadores de contraseña de Django.
- **Tokens:** JWT de acceso de una hora; refresh de un día con rotación y lista de revocación. El backend vuelve a consultar al usuario y su estado/rol en cada petición autenticada. El frontend mantiene los tokens solo en memoria y renueva el acceso con el refresh.
- **Autorización por rol (API1, API5):** todas las rutas de datos requieren JWT. Administrador puede consultar y administrar todas las áreas. Vendedor puede consultar productos/stock y registrar ventas; solo recibe sus propias ventas y no recibe compras, gastos, reportes ni costos de compra. La API bloquea la lectura de compras y reportes para Vendedor; el frontend también oculta esas secciones. La protección está en el backend, así que ocultar botones no es la única barrera.
- **Validación y consultas (API3, API8):** datos numéricos, nombres, ids, fechas y cantidades se validan en el backend. El SQL parametriza valores. Las ventas y la recepción de compras son transaccionales; las ventas bloquean y consumen lotes disponibles ordenados por vencimiento/antigüedad.
- **Configuración:** secretos y conexión PostgreSQL se leen desde `.env` ignorado por Git; `DEBUG` está apagado en `.env.example`; CORS queda limitado a los orígenes de Vite; se habilitan cabeceras de seguridad. HTTPS/HSTS deben configurarse al desplegar con TLS.
- **Uso de recursos y errores (API4, API7):** el backend limita líneas por operación a 100, longitud de campos y tamaño lógico de credenciales, y valida acciones/estados antes de modificar datos. Los errores de autenticación no revelan si existe una cuenta.

## Límites conocidos antes de publicar en Internet

- Configurar HTTPS, `DJANGO_ALLOWED_HOSTS`, CORS y variables de producción en el servidor real; activar HSTS solo después de que HTTPS funcione.
- La limitación de login usa caché local en memoria. En un despliegue con varios procesos debe sustituirse por caché compartida y añadirse monitoreo/alertas.
- Las listas no tienen paginación todavía; añadirla antes de cargar un volumen grande de operaciones.
- El proyecto usa un usuario/rol propio en `usuarios`, separado del usuario de Django Admin. Administrar altas, bajas y cambios de rol requiere procedimientos internos protegidos.
- Mantener PostgreSQL actualizado, restringir la cuenta de conexión a los permisos mínimos, hacer copias de seguridad protegidas y evitar guardar credenciales reales en capturas, logs o repositorios.
- Realizar una revisión de seguridad y pruebas de autorización con cada rol antes de cualquier despliegue público.

## Matriz de acceso

| Función | Administrador | Vendedor |
| --- | --- | --- |
| Ver productos y stock | Sí | Sí |
| Crear o editar productos | Sí | No |
| Registrar ventas | Sí | Sí |
| Ver historial de ventas | Todas | Solo las propias |
| Ver costos de compra en ventas | Sí | No |
| Ver compras, gastos y reportes | Sí | No |
| Registrar compras o gastos | Sí | No |

El script `crear_usuario_app.py` permite elegir el rol al crear una cuenta. Ejecuta `seed_initial_data` para asegurar que exista el catálogo de roles antes de crear la cuenta.
