const clinicalSchemaStatements = require('./clinical-schema');

const crearTablaPacienteFotos = `
    CREATE TABLE IF NOT EXISTS paciente_fotos (
        id_foto BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        id_paciente INT UNSIGNED NOT NULL,
        nombre_original VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        tamano_bytes INT UNSIGNED NOT NULL,
        contenido MEDIUMBLOB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id_foto),
        UNIQUE KEY uq_paciente_fotos_paciente (id_paciente),
        CONSTRAINT fk_paciente_fotos_paciente
            FOREIGN KEY (id_paciente)
            REFERENCES pacientes (id_paciente)
            ON UPDATE CASCADE
            ON DELETE CASCADE
    ) ENGINE=InnoDB
      DEFAULT CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci
`;

async function existeTablaPacienteFotos(pool) {
    const [tablas] = await pool.query(
        `
            SELECT COUNT(*) AS existe
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
              AND table_name = 'paciente_fotos'
        `
    );

    return Number(tablas[0]?.existe) === 1;
}

async function asegurarColumna(pool, tabla, columna, definicion) {
    const [rows] = await pool.query(
        `SELECT COUNT(*) AS existe
         FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [tabla, columna]
    );
    if (Number(rows[0]?.existe) === 0) {
        await pool.query(`ALTER TABLE \`${tabla}\` ADD COLUMN \`${columna}\` ${definicion}`);
    }
}

async function asegurarCompatibilidadCatalogoAnterior(pool) {
    const [columns] = await pool.query(
        `SELECT COLUMN_TYPE AS columnType, IS_NULLABLE AS isNullable, COLUMN_DEFAULT AS columnDefault
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'odontograma_hallazgos'
           AND column_name = 'id_hallazgo_catalogo'`
    );
    const legacyColumn = columns[0];
    if (!legacyColumn || (legacyColumn.isNullable === 'YES' && legacyColumn.columnDefault === null)) return;

    // La columna antigua sigue apuntando a su catálogo original. Los nuevos
    // hallazgos usan id_catalogo_hallazgo y dejan esta referencia en NULL.
    // La FK anterior y todos los valores históricos se conservan.
    if (!/^(?:tinyint|smallint|mediumint|int|bigint)(?:\(\d+\))?(?: unsigned)?$/i.test(legacyColumn.columnType)) {
        throw new Error('El tipo de id_hallazgo_catalogo no permite una migración automática segura.');
    }
    await pool.query(
        `ALTER TABLE odontograma_hallazgos MODIFY COLUMN id_hallazgo_catalogo ${legacyColumn.columnType} NULL DEFAULT NULL`
    );
}

async function asegurarEsquema(pool) {
    if (!(await existeTablaPacienteFotos(pool))) {
        await pool.query(crearTablaPacienteFotos);

        if (!(await existeTablaPacienteFotos(pool))) {
            throw new Error('No se pudo verificar la tabla paciente_fotos.');
        }
    }

    for (const statement of clinicalSchemaStatements.filter((item) => typeof item === 'string')) {
        await pool.query(statement);
    }

    // Las recetas usan una fila por documento: contenido y PDF se guardan juntos.
    await pool.query(`CREATE TABLE IF NOT EXISTS recetas_clinicas (
        id_receta BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        id_paciente INT UNSIGNED NOT NULL,
        folio VARCHAR(45) NOT NULL UNIQUE,
        titulo VARCHAR(120) NOT NULL,
        texto TEXT NOT NULL,
        profesional VARCHAR(160) NULL,
        cedula VARCHAR(60) NULL,
        pdf_documento MEDIUMBLOB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_recetas_paciente (id_paciente, id_receta),
        CONSTRAINT fk_recetas_paciente FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // Recordatorios: configuración clínica y bitácora idempotente por cita/canal/ventana.
    await pool.query(`CREATE TABLE IF NOT EXISTS recordatorios_config (
        id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        nombre_consultorio VARCHAR(120) NOT NULL DEFAULT 'Samantha Studio Lab',
        direccion_consultorio VARCHAR(300) NULL,
        dias_antes VARCHAR(80) NOT NULL DEFAULT '[1,3]',
        horas_antes VARCHAR(80) NOT NULL DEFAULT '[1,3]',
        hora_envio TINYINT UNSIGNED NOT NULL DEFAULT 9,
        email_habilitado TINYINT(1) NOT NULL DEFAULT 0,
        whatsapp_habilitado TINYINT(1) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await pool.query("INSERT IGNORE INTO recordatorios_config (id) VALUES (1)");
    // 'citas' puede ser una tabla antigua cuyo id_cita es INT en vez de BIGINT.
    // MySQL exige que la FK coincida en tipo, tamaño y signo con la columna padre.
    // Leer el tipo real evita ALTER/DROP sobre las citas existentes de producción.
    const [citaColumns] = await pool.query(
        `SELECT COLUMN_TYPE AS tipo
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'citas' AND COLUMN_NAME = 'id_cita'
         LIMIT 1`
    );
    const citaIdType = String(citaColumns[0]?.tipo || '').trim().toUpperCase();
    if (!/^(?:TINYINT|SMALLINT|MEDIUMINT|INT|INTEGER|BIGINT)(?:\([0-9]+\))?(?: UNSIGNED)?$/.test(citaIdType)) {
        throw new Error('No se pudo validar el tipo de citas.id_cita para crear recordatorios_envios.');
    }
    await pool.query(`CREATE TABLE IF NOT EXISTS recordatorios_envios (
        id_envio BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        id_cita ${citaIdType} NOT NULL,
        canal ENUM('EMAIL','WHATSAPP') NOT NULL,
        ventana VARCHAR(8) NOT NULL,
        cita_inicio DATETIME NOT NULL,
        estado ENUM('ENVIANDO','ENVIADO','FALLIDO') NOT NULL DEFAULT 'ENVIANDO',
        detalle_error VARCHAR(240) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_recordatorio_unico (id_cita, canal, ventana, cita_inicio),
        INDEX idx_recordatorios_estado_fecha (estado, created_at),
        CONSTRAINT fk_recordatorio_cita FOREIGN KEY (id_cita) REFERENCES citas(id_cita) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    const columns = [
        ['catalogo_hallazgos', 'clasificacion', "VARCHAR(20) NOT NULL DEFAULT 'MALO'"],
        ['catalogo_hallazgos', 'activo', 'TINYINT(1) NOT NULL DEFAULT 1'],
        ['catalogo_hallazgos', 'icono', "VARCHAR(40) NOT NULL DEFAULT 'punto'"],
        ['catalogo_hallazgos', 'variantes', "VARCHAR(80) NOT NULL DEFAULT 'MALO'"],
        ['catalogo_hallazgos', 'orden', 'SMALLINT UNSIGNED NOT NULL DEFAULT 0'],
        ['catalogo_hallazgos', 'requiere_superficie', 'TINYINT(1) NOT NULL DEFAULT 0'],
        ['odontogramas', 'fase', "VARCHAR(20) NOT NULL DEFAULT 'INICIAL'"],
        ['odontogramas', 'tipo_denticion', "VARCHAR(20) NOT NULL DEFAULT 'ADULTO'"],
        ['odontogramas', 'nomenclatura', "VARCHAR(20) NOT NULL DEFAULT 'FDI'"],
        ['odontogramas', 'observaciones', 'TEXT NULL'],
        ['odontogramas', 'estado', "VARCHAR(20) NOT NULL DEFAULT 'BORRADOR'"],
        ['odontogramas', 'created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'],
        ['odontogramas', 'finalizado_at', 'DATETIME NULL'],
        // Algunas instalaciones ya tenían odontograma_hallazgos con el esquema
        // anterior. CREATE TABLE IF NOT EXISTS no agrega columnas a esas tablas.
        // Se mantiene nullable para no inventar un diagnóstico en registros legados.
        ['odontograma_hallazgos', 'id_catalogo_hallazgo', 'INT UNSIGNED NULL'],
        ['odontograma_hallazgos', 'pieza', 'VARCHAR(4) NULL'],
        ['odontograma_hallazgos', 'superficie', 'VARCHAR(30) NULL'],
        ['odontograma_hallazgos', 'estado_visual', "VARCHAR(20) NOT NULL DEFAULT 'MALO'"],
        ['odontograma_hallazgos', 'variante', 'VARCHAR(40) NULL'],
        ['odontograma_hallazgos', 'datos_json', 'JSON NULL'],
        ['odontograma_hallazgos', 'observaciones', 'TEXT NULL'],
        ['odontograma_hallazgos', 'created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'],
        ['pacientes', 'adicional', 'VARCHAR(255) NULL'],
        ['pacientes', 'grupo', 'VARCHAR(100) NULL'],
        ['pacientes', 'linea_negocio', 'VARCHAR(100) NULL'],
        ['pacientes', 'domicilio', 'VARCHAR(255) NULL'],
        ['pacientes', 'ocupacion', 'VARCHAR(160) NULL'],
        ['pacientes', 'tutor_responsable', 'VARCHAR(160) NULL'],
        ['pacientes', 'contacto_emergencia', 'VARCHAR(160) NULL'],
        ['pacientes', 'telefono_emergencia', 'VARCHAR(35) NULL'],
        ['pacientes', 'observaciones_filiacion', 'TEXT NULL'],
        ['pacientes', 'recordatorio_correo_consentido', 'TINYINT(1) NOT NULL DEFAULT 0'],
        ['pacientes', 'recordatorio_whatsapp_consentido', 'TINYINT(1) NOT NULL DEFAULT 0'],
        ['citas', 'doctor', 'VARCHAR(160) NULL'],
        ['citas', 'motivo', "VARCHAR(255) NOT NULL DEFAULT 'Consulta'"],
        ['citas', 'comentario', 'TEXT NULL'],
        ['citas', 'fin_at', 'DATETIME NULL'],
        ['citas', 'created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'],
        ['presupuestos', 'concepto', "VARCHAR(255) NOT NULL DEFAULT 'Tratamiento dental'"],
        ['presupuestos', 'observaciones', 'TEXT NULL'],
        ['presupuestos', 'created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'],
        ['tareas_paciente', 'nombre', "VARCHAR(180) NOT NULL DEFAULT 'Seguimiento'"],
        ['tareas_paciente', 'descripcion', 'TEXT NULL'],
        ['tareas_paciente', 'responsable', 'VARCHAR(160) NULL'],
        ['tareas_paciente', 'tipo', "VARCHAR(20) NOT NULL DEFAULT 'MANUAL'"],
        ['tareas_paciente', 'fecha_envio', 'DATETIME NULL'],
        ['tareas_paciente', 'plantilla', 'VARCHAR(180) NULL'],
        ['tareas_paciente', 'created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP']
    ];
    for (const [table, column, definition] of columns) {
        await asegurarColumna(pool, table, column, definition);
    }

    await asegurarCompatibilidadCatalogoAnterior(pool);

    for (const statement of clinicalSchemaStatements.filter((item) => typeof item !== 'string')) {
        await pool.query(statement.sql, statement.values);
    }

    await pool.query(
        `UPDATE odontograma_hallazgos h
         INNER JOIN catalogo_hallazgos c
            ON c.id_catalogo_hallazgo = h.id_catalogo_hallazgo
         SET h.estado_visual = c.clasificacion
         WHERE h.variante IS NULL`
    );
}

module.exports = asegurarEsquema;
