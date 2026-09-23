# Pacientes ficticios para probar el consultorio

`006_pacientes_ficticios.sql` agrega ocho pacientes inventados, una historia
clínica y una cita para cada uno. También agrega tareas y presupuestos ficticios.
No crea usuarios ni contraseñas. Usa correos `.invalid`, que no reciben mensajes.

1. En Hostinger, abre phpMyAdmin y selecciona `u327351184_sam_studio`.
2. Abre la pestaña **SQL** y pega el contenido de `006_pacientes_ficticios.sql`.
3. Ejecuta una sola vez. El script comprueba correos y registros para que
   ejecutarlo nuevamente el mismo día no duplique los datos.
4. Abre Inicio, Agenda, Pacientes, Jornada clínica, Seguimientos y Finanzas.
   En Inicio aparece la cantidad de pacientes de prueba; cada cita, tarea y
   presupuesto de prueba está marcado como ficticio.

El script mezcla datos ficticios con los existentes en la misma base. No debe
usarse para reportes clínicos o financieros reales. Los pacientes se pueden
identificar por su correo terminado en `@ejemplo.invalid`.
