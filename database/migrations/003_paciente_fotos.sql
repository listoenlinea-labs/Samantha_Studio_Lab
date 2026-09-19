-- Guarda una sola foto de perfil por paciente directamente en MySQL.
-- MEDIUMBLOB admite hasta 16 MiB; la API limita cada archivo a 5 MiB.
-- Esta migración solo crea una tabla nueva y no elimina datos existentes.

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
  COLLATE utf8mb4_unicode_ci;
