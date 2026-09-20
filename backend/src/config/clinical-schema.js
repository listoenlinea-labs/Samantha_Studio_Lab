const odontogramCatalog = require('./odontogram-catalog');

const catalogValues = odontogramCatalog.map((item) => [
    item.codigo,
    item.nombre,
    item.clasificacion,
    item.icono,
    item.variantes,
    item.orden,
    item.requiereSuperficie
]);

const clinicalSchemaStatements = [
    `CREATE TABLE IF NOT EXISTS historias_clinicas (
        id_historia BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        id_paciente INT UNSIGNED NOT NULL,
        motivo_consulta TEXT NULL,
        alergias TEXT NULL,
        antecedentes_medicos TEXT NULL,
        antecedentes_odontologicos TEXT NULL,
        medicamentos_actuales TEXT NULL,
        diagnostico_general TEXT NULL,
        observaciones TEXT NULL,
        vigente TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id_historia),
        INDEX idx_historias_paciente_vigente (id_paciente, vigente),
        CONSTRAINT fk_historias_paciente FOREIGN KEY (id_paciente)
            REFERENCES pacientes (id_paciente) ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS tratamientos_paciente (
        id_tratamiento_paciente BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        id_paciente INT UNSIGNED NOT NULL,
        nombre VARCHAR(160) NOT NULL,
        descripcion TEXT NULL,
        estado VARCHAR(30) NOT NULL DEFAULT 'PLANIFICADO',
        fecha_inicio DATE NULL,
        fecha_fin DATE NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id_tratamiento_paciente),
        INDEX idx_tratamientos_paciente (id_paciente, estado),
        CONSTRAINT fk_tratamientos_paciente FOREIGN KEY (id_paciente)
            REFERENCES pacientes (id_paciente) ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS sesiones_tratamiento (
        id_sesion BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        id_paciente INT UNSIGNED NOT NULL,
        id_tratamiento_paciente BIGINT UNSIGNED NULL,
        fecha_sesion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        evolucion TEXT NOT NULL,
        indicaciones TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_sesion),
        INDEX idx_sesiones_paciente_fecha (id_paciente, fecha_sesion),
        CONSTRAINT fk_sesiones_paciente FOREIGN KEY (id_paciente)
            REFERENCES pacientes (id_paciente) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_sesiones_tratamiento FOREIGN KEY (id_tratamiento_paciente)
            REFERENCES tratamientos_paciente (id_tratamiento_paciente) ON UPDATE CASCADE ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS odontogramas (
        id_odontograma BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        id_paciente INT UNSIGNED NOT NULL,
        fase VARCHAR(20) NOT NULL DEFAULT 'INICIAL',
        tipo_denticion VARCHAR(20) NOT NULL DEFAULT 'ADULTO',
        nomenclatura VARCHAR(20) NOT NULL DEFAULT 'FDI',
        observaciones TEXT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        finalizado_at DATETIME NULL,
        PRIMARY KEY (id_odontograma),
        INDEX idx_odontogramas_paciente_fase (id_paciente, fase, created_at),
        CONSTRAINT fk_odontogramas_paciente FOREIGN KEY (id_paciente)
            REFERENCES pacientes (id_paciente) ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS catalogo_hallazgos (
        id_catalogo_hallazgo INT UNSIGNED NOT NULL AUTO_INCREMENT,
        codigo VARCHAR(50) NOT NULL,
        nombre VARCHAR(120) NOT NULL,
        clasificacion VARCHAR(20) NOT NULL DEFAULT 'MALO',
        icono VARCHAR(40) NOT NULL DEFAULT 'punto',
        variantes VARCHAR(80) NOT NULL DEFAULT 'MALO',
        orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        requiere_superficie TINYINT(1) NOT NULL DEFAULT 0,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (id_catalogo_hallazgo),
        UNIQUE KEY uq_catalogo_hallazgos_codigo (codigo)
    ) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS odontograma_hallazgos (
        id_hallazgo BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        id_odontograma BIGINT UNSIGNED NOT NULL,
        id_catalogo_hallazgo INT UNSIGNED NOT NULL,
        pieza VARCHAR(4) NOT NULL,
        superficie VARCHAR(30) NULL,
        estado_visual VARCHAR(20) NOT NULL DEFAULT 'MALO',
        variante VARCHAR(40) NULL,
        datos_json JSON NULL,
        observaciones TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_hallazgo),
        INDEX idx_hallazgos_odontograma (id_odontograma, pieza),
        CONSTRAINT fk_hallazgos_odontograma FOREIGN KEY (id_odontograma)
            REFERENCES odontogramas (id_odontograma) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_hallazgos_catalogo FOREIGN KEY (id_catalogo_hallazgo)
            REFERENCES catalogo_hallazgos (id_catalogo_hallazgo) ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS periodontogramas (
        id_periodontograma BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        id_paciente INT UNSIGNED NOT NULL,
        observaciones TEXT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        finalizado_at DATETIME NULL,
        PRIMARY KEY (id_periodontograma),
        INDEX idx_periodontogramas_paciente (id_paciente, created_at),
        CONSTRAINT fk_periodontogramas_paciente FOREIGN KEY (id_paciente)
            REFERENCES pacientes (id_paciente) ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS periodontograma_mediciones (
        id_medicion BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        id_periodontograma BIGINT UNSIGNED NOT NULL,
        pieza VARCHAR(4) NOT NULL,
        cara VARCHAR(20) NOT NULL,
        punto VARCHAR(20) NOT NULL,
        profundidad_sondaje TINYINT UNSIGNED NOT NULL DEFAULT 0,
        margen_gingival TINYINT NOT NULL DEFAULT 0,
        sangrado TINYINT(1) NOT NULL DEFAULT 0,
        placa TINYINT(1) NOT NULL DEFAULT 0,
        movilidad TINYINT UNSIGNED NOT NULL DEFAULT 0,
        furcacion TINYINT UNSIGNED NOT NULL DEFAULT 0,
        supuracion TINYINT(1) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id_medicion),
        UNIQUE KEY uq_medicion_sitio (id_periodontograma, pieza, cara, punto),
        CONSTRAINT fk_mediciones_periodontograma FOREIGN KEY (id_periodontograma)
            REFERENCES periodontogramas (id_periodontograma) ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

    {
        sql: `INSERT INTO catalogo_hallazgos
                (codigo, nombre, clasificacion, icono, variantes, orden, requiere_superficie)
              VALUES ?
              ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre), clasificacion = VALUES(clasificacion),
                icono = VALUES(icono), variantes = VALUES(variantes),
                orden = VALUES(orden), requiere_superficie = VALUES(requiere_superficie), activo = 1`,
        values: [catalogValues]
    }
];

module.exports = clinicalSchemaStatements;
