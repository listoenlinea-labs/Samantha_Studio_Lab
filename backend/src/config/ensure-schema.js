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
        ['odontograma_hallazgos', 'superficie', 'VARCHAR(30) NULL'],
        ['odontograma_hallazgos', 'estado_visual', "VARCHAR(20) NOT NULL DEFAULT 'MALO'"],
        ['odontograma_hallazgos', 'variante', 'VARCHAR(40) NULL'],
        ['odontograma_hallazgos', 'datos_json', 'JSON NULL'],
        ['odontograma_hallazgos', 'observaciones', 'TEXT NULL'],
        ['odontograma_hallazgos', 'created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP']
    ];
    for (const [table, column, definition] of columns) {
        await asegurarColumna(pool, table, column, definition);
    }

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
