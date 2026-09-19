# Base de datos

`schema.sql` es la base relacional propuesta para MySQL 8.0 y puede abrirse o ejecutarse desde MySQL Workbench.

## Alcance

El esquema conecta:

- usuarios, roles y permisos;
- pacientes, tutores y familias;
- agenda, consultas y procedimientos;
- historial y eventos del odontograma;
- archivos clínicos y estudios de Samantha Studio RX;
- tratamientos, precios, materiales y consumos;
- inventario por movimientos y alertas de reposición;
- seguimientos y cola de mensajes;
- cuentas por cobrar y calendario de pagos;
- laboratorio externo, especialistas, gastos y metas;
- bitácora de auditoría.

## Uso con Workbench

1. Crear una conexión MySQL 8 con un usuario de migraciones.
2. Abrir `schema.sql` y revisar el nombre de la base `samantha_studio_lab`.
3. Ejecutar el script completo en un ambiente de desarrollo.
4. Crear el primer usuario administrador desde el backend; nunca insertar contraseñas sin hash.
5. Importar los catálogos y existencias desde los Excel originales mediante un proceso privado del backend. `docs/assets/js/clinic-seed.js` contiene solamente datos demostrativos seguros.

## Decisiones importantes

- El inventario se calcula a partir de movimientos, no de una cantidad sobrescrita.
- Cada tratamiento puede tener una receta de materiales; al cerrar el procedimiento se generan consumos.
- El punto de reposición es configurable por material. El valor inicial es 25%, pero el mínimo y la unidad mandan cuando están definidos.
- Los precios, porcentajes y metas se versionan para no alterar reportes históricos.
- Los archivos clínicos y DICOM no se guardan dentro de MySQL; la tabla conserva una clave hacia almacenamiento cifrado.
- WhatsApp y Google Calendar requieren procesos de servidor, credenciales y reintentos. La interfaz no debe invocar esas APIs directamente.
- Toda consulta, exportación o cambio sensible debe registrarse en `audit_log`.

No ejecutes este esquema directamente sobre producción sin respaldo, revisión de privacidad y una migración versionada.

## Migraciones incrementales

Si la base ya existe, ejecuta únicamente las migraciones pendientes en orden.
Para habilitar las fotos de perfil almacenadas en MySQL, ejecuta
`migrations/003_paciente_fotos.sql` antes de iniciar esta versión de la API.
