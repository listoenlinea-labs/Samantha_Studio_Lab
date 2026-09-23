-- Datos completamente ficticios. Ejecutar manualmente en phpMyAdmin de la base elegida.
-- Se pueden volver a ejecutar: correo y fecha impiden insertar duplicados.
-- Los correos .invalid no entregan mensajes. No incluye contraseñas ni usuarios.

INSERT INTO pacientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, correo, como_nos_conocio, activo)
SELECT 'Itzel', 'Navarro', 'Mejía', '2016-04-19', 'F', 'paciente01@ejemplo.invalid', 'Registro ficticio de demostración', 1
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE correo = 'paciente01@ejemplo.invalid');

INSERT INTO historias_clinicas (id_paciente, motivo_consulta, antecedentes_medicos, diagnostico_general, observaciones, vigente)
SELECT p.id_paciente, 'Consulta odontopediátrica ficticia', 'Sin antecedentes reportados para este ejemplo', 'Valoración preventiva y revisión de higiene oral.', 'Expediente de prueba. No corresponde a una persona real.', 1
FROM pacientes p WHERE p.correo = 'paciente01@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM historias_clinicas h WHERE h.id_paciente = p.id_paciente);

INSERT INTO citas (id_paciente, inicio_at, fin_at, doctor, motivo, estado, comentario)
SELECT p.id_paciente, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 0 DAY), '09:00:00'),
       TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 0 DAY), '09:00:00') + INTERVAL 45 MINUTE,
       'Dra. Sofía Mendoza', 'Valoración inicial', 'CONFIRMADA', 'Cita de prueba; paciente ficticio.'
FROM pacientes p WHERE p.correo = 'paciente01@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM citas c WHERE c.id_paciente = p.id_paciente
AND DATE(c.inicio_at) = DATE_ADD(CURDATE(), INTERVAL 0 DAY) AND c.motivo = 'Valoración inicial');

INSERT INTO pacientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, correo, como_nos_conocio, activo)
SELECT 'Gael', 'Serrano', 'López', '2018-07-12', 'M', 'paciente02@ejemplo.invalid', 'Registro ficticio de demostración', 1
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE correo = 'paciente02@ejemplo.invalid');

INSERT INTO historias_clinicas (id_paciente, motivo_consulta, antecedentes_medicos, diagnostico_general, observaciones, vigente)
SELECT p.id_paciente, 'Consulta odontopediátrica ficticia', 'Sin antecedentes reportados para este ejemplo', 'Seguimiento de erupción dental y plan preventivo.', 'Expediente de prueba. No corresponde a una persona real.', 1
FROM pacientes p WHERE p.correo = 'paciente02@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM historias_clinicas h WHERE h.id_paciente = p.id_paciente);

INSERT INTO citas (id_paciente, inicio_at, fin_at, doctor, motivo, estado, comentario)
SELECT p.id_paciente, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 0 DAY), '10:30:00'),
       TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 0 DAY), '10:30:00') + INTERVAL 45 MINUTE,
       'Dra. Sofía Mendoza', 'Seguimiento clínico', 'CONFIRMADA', 'Cita de prueba; paciente ficticio.'
FROM pacientes p WHERE p.correo = 'paciente02@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM citas c WHERE c.id_paciente = p.id_paciente
AND DATE(c.inicio_at) = DATE_ADD(CURDATE(), INTERVAL 0 DAY) AND c.motivo = 'Seguimiento clínico');

INSERT INTO pacientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, correo, como_nos_conocio, activo)
SELECT 'Ximena', 'Ríos', 'Castillo', '2014-10-03', 'F', 'paciente03@ejemplo.invalid', 'Registro ficticio de demostración', 1
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE correo = 'paciente03@ejemplo.invalid');

INSERT INTO historias_clinicas (id_paciente, motivo_consulta, antecedentes_medicos, diagnostico_general, observaciones, vigente)
SELECT p.id_paciente, 'Consulta odontopediátrica ficticia', 'Sin antecedentes reportados para este ejemplo', 'Consulta de ortopedia preventiva.', 'Expediente de prueba. No corresponde a una persona real.', 1
FROM pacientes p WHERE p.correo = 'paciente03@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM historias_clinicas h WHERE h.id_paciente = p.id_paciente);

INSERT INTO citas (id_paciente, inicio_at, fin_at, doctor, motivo, estado, comentario)
SELECT p.id_paciente, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 0 DAY), '11:00:00'),
       TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 0 DAY), '11:00:00') + INTERVAL 45 MINUTE,
       'Dra. Sofía Mendoza', 'Higiene oral', 'PROGRAMADA', 'Cita de prueba; paciente ficticio.'
FROM pacientes p WHERE p.correo = 'paciente03@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM citas c WHERE c.id_paciente = p.id_paciente
AND DATE(c.inicio_at) = DATE_ADD(CURDATE(), INTERVAL 0 DAY) AND c.motivo = 'Higiene oral');

INSERT INTO pacientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, correo, como_nos_conocio, activo)
SELECT 'Emiliano', 'Cárdenas', 'Solís', '2017-01-25', 'M', 'paciente04@ejemplo.invalid', 'Registro ficticio de demostración', 1
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE correo = 'paciente04@ejemplo.invalid');

INSERT INTO historias_clinicas (id_paciente, motivo_consulta, antecedentes_medicos, diagnostico_general, observaciones, vigente)
SELECT p.id_paciente, 'Consulta odontopediátrica ficticia', 'Sin antecedentes reportados para este ejemplo', 'Valoración inicial y recomendaciones de higiene.', 'Expediente de prueba. No corresponde a una persona real.', 1
FROM pacientes p WHERE p.correo = 'paciente04@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM historias_clinicas h WHERE h.id_paciente = p.id_paciente);

INSERT INTO citas (id_paciente, inicio_at, fin_at, doctor, motivo, estado, comentario)
SELECT p.id_paciente, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 0 DAY), '12:30:00'),
       TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 0 DAY), '12:30:00') + INTERVAL 45 MINUTE,
       'Dra. Sofía Mendoza', 'Revisión preventiva', 'CONFIRMADA', 'Cita de prueba; paciente ficticio.'
FROM pacientes p WHERE p.correo = 'paciente04@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM citas c WHERE c.id_paciente = p.id_paciente
AND DATE(c.inicio_at) = DATE_ADD(CURDATE(), INTERVAL 0 DAY) AND c.motivo = 'Revisión preventiva');

INSERT INTO pacientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, correo, como_nos_conocio, activo)
SELECT 'Mariana', 'Beltrán', 'Vega', '2015-11-18', 'F', 'paciente05@ejemplo.invalid', 'Registro ficticio de demostración', 1
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE correo = 'paciente05@ejemplo.invalid');

INSERT INTO historias_clinicas (id_paciente, motivo_consulta, antecedentes_medicos, diagnostico_general, observaciones, vigente)
SELECT p.id_paciente, 'Consulta odontopediátrica ficticia', 'Sin antecedentes reportados para este ejemplo', 'Valoración preventiva y revisión de higiene oral.', 'Expediente de prueba. No corresponde a una persona real.', 1
FROM pacientes p WHERE p.correo = 'paciente05@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM historias_clinicas h WHERE h.id_paciente = p.id_paciente);

INSERT INTO citas (id_paciente, inicio_at, fin_at, doctor, motivo, estado, comentario)
SELECT p.id_paciente, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 0 DAY), '13:00:00'),
       TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 0 DAY), '13:00:00') + INTERVAL 45 MINUTE,
       'Dra. Sofía Mendoza', 'Valoración inicial', 'CONFIRMADA', 'Cita de prueba; paciente ficticio.'
FROM pacientes p WHERE p.correo = 'paciente05@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM citas c WHERE c.id_paciente = p.id_paciente
AND DATE(c.inicio_at) = DATE_ADD(CURDATE(), INTERVAL 0 DAY) AND c.motivo = 'Valoración inicial');

INSERT INTO pacientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, correo, como_nos_conocio, activo)
SELECT 'Mateo', 'Orozco', 'Pineda', '2019-03-07', 'M', 'paciente06@ejemplo.invalid', 'Registro ficticio de demostración', 1
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE correo = 'paciente06@ejemplo.invalid');

INSERT INTO historias_clinicas (id_paciente, motivo_consulta, antecedentes_medicos, diagnostico_general, observaciones, vigente)
SELECT p.id_paciente, 'Consulta odontopediátrica ficticia', 'Sin antecedentes reportados para este ejemplo', 'Seguimiento de erupción dental y plan preventivo.', 'Expediente de prueba. No corresponde a una persona real.', 1
FROM pacientes p WHERE p.correo = 'paciente06@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM historias_clinicas h WHERE h.id_paciente = p.id_paciente);

INSERT INTO citas (id_paciente, inicio_at, fin_at, doctor, motivo, estado, comentario)
SELECT p.id_paciente, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:30:00'),
       TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:30:00') + INTERVAL 45 MINUTE,
       'Dra. Sofía Mendoza', 'Seguimiento clínico', 'PROGRAMADA', 'Cita de prueba; paciente ficticio.'
FROM pacientes p WHERE p.correo = 'paciente06@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM citas c WHERE c.id_paciente = p.id_paciente
AND DATE(c.inicio_at) = DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND c.motivo = 'Seguimiento clínico');

INSERT INTO pacientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, correo, como_nos_conocio, activo)
SELECT 'Regina', 'Valdés', 'Mora', '2013-06-21', 'F', 'paciente07@ejemplo.invalid', 'Registro ficticio de demostración', 1
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE correo = 'paciente07@ejemplo.invalid');

INSERT INTO historias_clinicas (id_paciente, motivo_consulta, antecedentes_medicos, diagnostico_general, observaciones, vigente)
SELECT p.id_paciente, 'Consulta odontopediátrica ficticia', 'Sin antecedentes reportados para este ejemplo', 'Consulta de ortopedia preventiva.', 'Expediente de prueba. No corresponde a una persona real.', 1
FROM pacientes p WHERE p.correo = 'paciente07@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM historias_clinicas h WHERE h.id_paciente = p.id_paciente);

INSERT INTO citas (id_paciente, inicio_at, fin_at, doctor, motivo, estado, comentario)
SELECT p.id_paciente, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00'),
       TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00') + INTERVAL 45 MINUTE,
       'Dra. Sofía Mendoza', 'Higiene oral', 'CONFIRMADA', 'Cita de prueba; paciente ficticio.'
FROM pacientes p WHERE p.correo = 'paciente07@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM citas c WHERE c.id_paciente = p.id_paciente
AND DATE(c.inicio_at) = DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND c.motivo = 'Higiene oral');

INSERT INTO pacientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, correo, como_nos_conocio, activo)
SELECT 'Diego', 'Alvarado', 'Luna', '2020-02-14', 'M', 'paciente08@ejemplo.invalid', 'Registro ficticio de demostración', 1
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE correo = 'paciente08@ejemplo.invalid');

INSERT INTO historias_clinicas (id_paciente, motivo_consulta, antecedentes_medicos, diagnostico_general, observaciones, vigente)
SELECT p.id_paciente, 'Consulta odontopediátrica ficticia', 'Sin antecedentes reportados para este ejemplo', 'Valoración inicial y recomendaciones de higiene.', 'Expediente de prueba. No corresponde a una persona real.', 1
FROM pacientes p WHERE p.correo = 'paciente08@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM historias_clinicas h WHERE h.id_paciente = p.id_paciente);

INSERT INTO citas (id_paciente, inicio_at, fin_at, doctor, motivo, estado, comentario)
SELECT p.id_paciente, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '11:30:00'),
       TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '11:30:00') + INTERVAL 45 MINUTE,
       'Dra. Sofía Mendoza', 'Revisión preventiva', 'CONFIRMADA', 'Cita de prueba; paciente ficticio.'
FROM pacientes p WHERE p.correo = 'paciente08@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM citas c WHERE c.id_paciente = p.id_paciente
AND DATE(c.inicio_at) = DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND c.motivo = 'Revisión preventiva');

INSERT INTO tareas_paciente (id_paciente, nombre, descripcion, estado, tipo)
SELECT p.id_paciente, 'Recordatorio preventivo ficticio 01', 'Seguimiento de prueba sin envío automático', 'PENDIENTE', 'MANUAL'
FROM pacientes p WHERE p.correo = 'paciente01@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM tareas_paciente t WHERE t.id_paciente = p.id_paciente AND t.nombre = 'Recordatorio preventivo ficticio 01');

INSERT INTO presupuestos (id_paciente, concepto, total, estado, observaciones)
SELECT p.id_paciente, 'Plan preventivo ficticio 01', 1025, 'BORRADOR', 'Importe ficticio para pruebas; no es un cobro real.'
FROM pacientes p WHERE p.correo = 'paciente01@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM presupuestos pr WHERE pr.id_paciente = p.id_paciente AND pr.concepto = 'Plan preventivo ficticio 01');

INSERT INTO tareas_paciente (id_paciente, nombre, descripcion, estado, tipo)
SELECT p.id_paciente, 'Recordatorio preventivo ficticio 02', 'Seguimiento de prueba sin envío automático', 'PENDIENTE', 'MANUAL'
FROM pacientes p WHERE p.correo = 'paciente02@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM tareas_paciente t WHERE t.id_paciente = p.id_paciente AND t.nombre = 'Recordatorio preventivo ficticio 02');

INSERT INTO presupuestos (id_paciente, concepto, total, estado, observaciones)
SELECT p.id_paciente, 'Plan preventivo ficticio 02', 1200, 'BORRADOR', 'Importe ficticio para pruebas; no es un cobro real.'
FROM pacientes p WHERE p.correo = 'paciente02@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM presupuestos pr WHERE pr.id_paciente = p.id_paciente AND pr.concepto = 'Plan preventivo ficticio 02');

INSERT INTO tareas_paciente (id_paciente, nombre, descripcion, estado, tipo)
SELECT p.id_paciente, 'Recordatorio preventivo ficticio 03', 'Seguimiento de prueba sin envío automático', 'PENDIENTE', 'MANUAL'
FROM pacientes p WHERE p.correo = 'paciente03@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM tareas_paciente t WHERE t.id_paciente = p.id_paciente AND t.nombre = 'Recordatorio preventivo ficticio 03');

INSERT INTO presupuestos (id_paciente, concepto, total, estado, observaciones)
SELECT p.id_paciente, 'Plan preventivo ficticio 03', 1375, 'BORRADOR', 'Importe ficticio para pruebas; no es un cobro real.'
FROM pacientes p WHERE p.correo = 'paciente03@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM presupuestos pr WHERE pr.id_paciente = p.id_paciente AND pr.concepto = 'Plan preventivo ficticio 03');

INSERT INTO tareas_paciente (id_paciente, nombre, descripcion, estado, tipo)
SELECT p.id_paciente, 'Recordatorio preventivo ficticio 04', 'Seguimiento de prueba sin envío automático', 'PENDIENTE', 'MANUAL'
FROM pacientes p WHERE p.correo = 'paciente04@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM tareas_paciente t WHERE t.id_paciente = p.id_paciente AND t.nombre = 'Recordatorio preventivo ficticio 04');

INSERT INTO presupuestos (id_paciente, concepto, total, estado, observaciones)
SELECT p.id_paciente, 'Plan preventivo ficticio 04', 1550, 'BORRADOR', 'Importe ficticio para pruebas; no es un cobro real.'
FROM pacientes p WHERE p.correo = 'paciente04@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM presupuestos pr WHERE pr.id_paciente = p.id_paciente AND pr.concepto = 'Plan preventivo ficticio 04');

INSERT INTO tareas_paciente (id_paciente, nombre, descripcion, estado, tipo)
SELECT p.id_paciente, 'Recordatorio preventivo ficticio 05', 'Seguimiento de prueba sin envío automático', 'PENDIENTE', 'MANUAL'
FROM pacientes p WHERE p.correo = 'paciente05@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM tareas_paciente t WHERE t.id_paciente = p.id_paciente AND t.nombre = 'Recordatorio preventivo ficticio 05');

INSERT INTO presupuestos (id_paciente, concepto, total, estado, observaciones)
SELECT p.id_paciente, 'Plan preventivo ficticio 05', 1725, 'BORRADOR', 'Importe ficticio para pruebas; no es un cobro real.'
FROM pacientes p WHERE p.correo = 'paciente05@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM presupuestos pr WHERE pr.id_paciente = p.id_paciente AND pr.concepto = 'Plan preventivo ficticio 05');

INSERT INTO tareas_paciente (id_paciente, nombre, descripcion, estado, tipo)
SELECT p.id_paciente, 'Recordatorio preventivo ficticio 06', 'Seguimiento de prueba sin envío automático', 'PENDIENTE', 'MANUAL'
FROM pacientes p WHERE p.correo = 'paciente06@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM tareas_paciente t WHERE t.id_paciente = p.id_paciente AND t.nombre = 'Recordatorio preventivo ficticio 06');

INSERT INTO presupuestos (id_paciente, concepto, total, estado, observaciones)
SELECT p.id_paciente, 'Plan preventivo ficticio 06', 1900, 'BORRADOR', 'Importe ficticio para pruebas; no es un cobro real.'
FROM pacientes p WHERE p.correo = 'paciente06@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM presupuestos pr WHERE pr.id_paciente = p.id_paciente AND pr.concepto = 'Plan preventivo ficticio 06');

INSERT INTO tareas_paciente (id_paciente, nombre, descripcion, estado, tipo)
SELECT p.id_paciente, 'Recordatorio preventivo ficticio 07', 'Seguimiento de prueba sin envío automático', 'PENDIENTE', 'MANUAL'
FROM pacientes p WHERE p.correo = 'paciente07@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM tareas_paciente t WHERE t.id_paciente = p.id_paciente AND t.nombre = 'Recordatorio preventivo ficticio 07');

INSERT INTO presupuestos (id_paciente, concepto, total, estado, observaciones)
SELECT p.id_paciente, 'Plan preventivo ficticio 07', 2075, 'BORRADOR', 'Importe ficticio para pruebas; no es un cobro real.'
FROM pacientes p WHERE p.correo = 'paciente07@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM presupuestos pr WHERE pr.id_paciente = p.id_paciente AND pr.concepto = 'Plan preventivo ficticio 07');

INSERT INTO tareas_paciente (id_paciente, nombre, descripcion, estado, tipo)
SELECT p.id_paciente, 'Recordatorio preventivo ficticio 08', 'Seguimiento de prueba sin envío automático', 'PENDIENTE', 'MANUAL'
FROM pacientes p WHERE p.correo = 'paciente08@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM tareas_paciente t WHERE t.id_paciente = p.id_paciente AND t.nombre = 'Recordatorio preventivo ficticio 08');

INSERT INTO presupuestos (id_paciente, concepto, total, estado, observaciones)
SELECT p.id_paciente, 'Plan preventivo ficticio 08', 2250, 'BORRADOR', 'Importe ficticio para pruebas; no es un cobro real.'
FROM pacientes p WHERE p.correo = 'paciente08@ejemplo.invalid'
AND NOT EXISTS (SELECT 1 FROM presupuestos pr WHERE pr.id_paciente = p.id_paciente AND pr.concepto = 'Plan preventivo ficticio 08');
