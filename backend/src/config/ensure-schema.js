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

async function asegurarEsquema(pool) {
    if (await existeTablaPacienteFotos(pool)) return;

    await pool.query(crearTablaPacienteFotos);

    if (!(await existeTablaPacienteFotos(pool))) {
        throw new Error('No se pudo verificar la tabla paciente_fotos.');
    }
}

module.exports = asegurarEsquema;
