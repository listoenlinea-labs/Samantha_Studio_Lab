-- Samantha's Studio Lab
-- Esquema base MySQL 8.0 compatible con MySQL Workbench.
-- No contiene información real de pacientes.

CREATE DATABASE IF NOT EXISTS samantha_studio_lab
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE samantha_studio_lab;

SET time_zone = '-06:00';

CREATE TABLE roles (
  id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE permissions (
  id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  role_id TINYINT UNSIGNED NOT NULL,
  permission_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id)
) ENGINE=InnoDB;

CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  role_id TINYINT UNSIGNED NOT NULL,
  username VARCHAR(80) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE families (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  display_name VARCHAR(140) NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE guardians (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  family_id BIGINT UNSIGNED NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(140) NOT NULL,
  phone_e164 VARCHAR(20) NULL,
  email VARCHAR(190) NULL,
  relationship VARCHAR(60) NULL,
  whatsapp_consent_at DATETIME NULL,
  privacy_notice_accepted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_guardians_phone (phone_e164),
  CONSTRAINT fk_guardians_family FOREIGN KEY (family_id) REFERENCES families(id)
) ENGINE=InnoDB;

CREATE TABLE patients (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  family_id BIGINT UNSIGNED NULL,
  primary_guardian_id BIGINT UNSIGNED NULL,
  clinical_number VARCHAR(40) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(140) NOT NULL,
  birth_date DATE NULL,
  sex_at_birth ENUM('F','M','X','NO_ESPECIFICADO') NOT NULL DEFAULT 'NO_ESPECIFICADO',
  photo_object_key VARCHAR(500) NULL,
  allergies TEXT NULL,
  medical_alerts TEXT NULL,
  handling_notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_patients_name (last_name, first_name),
  CONSTRAINT fk_patients_family FOREIGN KEY (family_id) REFERENCES families(id),
  CONSTRAINT fk_patients_guardian FOREIGN KEY (primary_guardian_id) REFERENCES guardians(id)
) ENGINE=InnoDB;

CREATE TABLE specialties (
  id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE practitioners (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  specialty_id SMALLINT UNSIGNED NULL,
  display_name VARCHAR(160) NOT NULL,
  license_number VARCHAR(80) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_practitioners_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_practitioners_specialty FOREIGN KEY (specialty_id) REFERENCES specialties(id)
) ENGINE=InnoDB;

CREATE TABLE treatment_categories (
  id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE treatments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  category_id SMALLINT UNSIGNED NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  default_duration_minutes SMALLINT UNSIGNED NULL,
  requires_odontogram BOOLEAN NOT NULL DEFAULT FALSE,
  requires_xray BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_treatments_category FOREIGN KEY (category_id) REFERENCES treatment_categories(id)
) ENGINE=InnoDB;

CREATE TABLE treatment_price_versions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  treatment_id BIGINT UNSIGNED NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NULL,
  current_price DECIMAL(12,2) NULL,
  hourly_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  material_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  desired_margin DECIMAL(7,4) NOT NULL DEFAULT 0.3000,
  suggested_price DECIMAL(12,2)
    GENERATED ALWAYS AS (
      CASE WHEN desired_margin < 1
        THEN ROUND((hourly_cost + material_cost) / (1 - desired_margin), 2)
        ELSE NULL END
    ) STORED,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_treatment_price_start (treatment_id, valid_from),
  CONSTRAINT fk_price_treatment FOREIGN KEY (treatment_id) REFERENCES treatments(id),
  CONSTRAINT fk_price_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE appointments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  practitioner_id BIGINT UNSIGNED NULL,
  treatment_id BIGINT UNSIGNED NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  status ENUM('BORRADOR','POR_CONFIRMAR','CONFIRMADA','EN_ESPERA','EN_ATENCION','FINALIZADA','CANCELADA','NO_ASISTIO') NOT NULL DEFAULT 'POR_CONFIRMAR',
  complexity ENUM('NORMAL','TIEMPO_EXTRA','COMPLEJA') NOT NULL DEFAULT 'NORMAL',
  reception_note TEXT NULL,
  google_event_id VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_appointments_day (starts_at, status),
  INDEX idx_appointments_patient (patient_id, starts_at),
  CONSTRAINT chk_appointment_time CHECK (ends_at > starts_at),
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
  CONSTRAINT fk_appointments_practitioner FOREIGN KEY (practitioner_id) REFERENCES practitioners(id),
  CONSTRAINT fk_appointments_treatment FOREIGN KEY (treatment_id) REFERENCES treatments(id),
  CONSTRAINT fk_appointments_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE encounters (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  appointment_id BIGINT UNSIGNED NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  practitioner_id BIGINT UNSIGNED NULL,
  opened_at DATETIME NOT NULL,
  closed_at DATETIME NULL,
  chief_complaint TEXT NULL,
  clinical_notes MEDIUMTEXT NULL,
  indications MEDIUMTEXT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_encounters_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  CONSTRAINT fk_encounters_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
  CONSTRAINT fk_encounters_practitioner FOREIGN KEY (practitioner_id) REFERENCES practitioners(id),
  CONSTRAINT fk_encounters_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_encounters_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE encounter_procedures (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  encounter_id BIGINT UNSIGNED NOT NULL,
  treatment_id BIGINT UNSIGNED NOT NULL,
  tooth_number TINYINT UNSIGNED NULL,
  surfaces SET('M','D','O','V','L','I','C') NULL,
  diagnosis VARCHAR(255) NULL,
  detail TEXT NULL,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_procedures_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id),
  CONSTRAINT fk_procedures_treatment FOREIGN KEY (treatment_id) REFERENCES treatments(id),
  CONSTRAINT fk_procedures_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE odontogram_events (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  encounter_id BIGINT UNSIGNED NULL,
  tooth_number TINYINT UNSIGNED NOT NULL,
  surface ENUM('DIENTE','M','D','O','V','L','I','C') NOT NULL DEFAULT 'DIENTE',
  condition_code ENUM('SANO','CARIES','TRATADO','AUSENTE','SELLADOR','CORONA','RESTAURACION','ENDODONCIA','OBSERVACION') NOT NULL,
  notes VARCHAR(500) NULL,
  recorded_by BIGINT UNSIGNED NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_odontogram_patient (patient_id, recorded_at),
  CONSTRAINT fk_odontogram_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
  CONSTRAINT fk_odontogram_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id),
  CONSTRAINT fk_odontogram_user FOREIGN KEY (recorded_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE clinical_files (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  encounter_id BIGINT UNSIGNED NULL,
  file_kind ENUM('FOTO','CONSENTIMIENTO','RECETA','DOCUMENTO','OTRO') NOT NULL,
  object_key VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  sha256 CHAR(64) NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinical_files_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
  CONSTRAINT fk_clinical_files_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id),
  CONSTRAINT fk_clinical_files_user FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE xray_studies (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  encounter_id BIGINT UNSIGNED NULL,
  requested_by BIGINT UNSIGNED NULL,
  study_type VARCHAR(100) NOT NULL,
  performed_at DATETIME NOT NULL,
  technician_name VARCHAR(160) NULL,
  dicom_study_uid VARCHAR(128) NULL UNIQUE,
  object_key VARCHAR(500) NOT NULL,
  thumbnail_object_key VARCHAR(500) NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(60) NULL,
  origin VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_xray_patient (patient_id, performed_at),
  CONSTRAINT fk_xray_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
  CONSTRAINT fk_xray_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id),
  CONSTRAINT fk_xray_practitioner FOREIGN KEY (requested_by) REFERENCES practitioners(id)
) ENGINE=InnoDB;

CREATE TABLE material_categories (
  id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE materials (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  category_id SMALLINT UNSIGNED NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  base_unit VARCHAR(60) NOT NULL,
  package_cost DECIMAL(12,4) NULL,
  units_per_package DECIMAL(12,4) NULL,
  unit_cost DECIMAL(12,4)
    GENERATED ALWAYS AS (
      CASE WHEN package_cost IS NOT NULL AND units_per_package > 0
        THEN ROUND(package_cost / units_per_package, 4)
        ELSE NULL END
    ) STORED,
  minimum_quantity DECIMAL(14,4) NULL,
  optimal_quantity DECIMAL(14,4) NULL,
  reorder_point_pct DECIMAL(7,4) NOT NULL DEFAULT 0.2500,
  supplier VARCHAR(180) NULL,
  is_measurable BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_materials_category FOREIGN KEY (category_id) REFERENCES material_categories(id)
) ENGINE=InnoDB;

CREATE TABLE treatment_materials (
  treatment_id BIGINT UNSIGNED NOT NULL,
  material_id BIGINT UNSIGNED NOT NULL,
  quantity_per_procedure DECIMAL(14,4) NOT NULL,
  PRIMARY KEY (treatment_id, material_id),
  CONSTRAINT fk_treatment_material_treatment FOREIGN KEY (treatment_id) REFERENCES treatments(id),
  CONSTRAINT fk_treatment_material_material FOREIGN KEY (material_id) REFERENCES materials(id)
) ENGINE=InnoDB;

CREATE TABLE inventory_movements (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  material_id BIGINT UNSIGNED NOT NULL,
  encounter_procedure_id BIGINT UNSIGNED NULL,
  movement_type ENUM('ENTRADA','CONSUMO','AJUSTE','CADUCIDAD','MERMA') NOT NULL,
  quantity_delta DECIMAL(14,4) NOT NULL,
  unit_cost DECIMAL(12,4) NULL,
  notes VARCHAR(500) NULL,
  recorded_by BIGINT UNSIGNED NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inventory_material_date (material_id, recorded_at),
  CONSTRAINT fk_inventory_material FOREIGN KEY (material_id) REFERENCES materials(id),
  CONSTRAINT fk_inventory_procedure FOREIGN KEY (encounter_procedure_id) REFERENCES encounter_procedures(id),
  CONSTRAINT fk_inventory_user FOREIGN KEY (recorded_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE VIEW current_inventory AS
SELECT
  m.id AS material_id,
  m.name,
  m.base_unit,
  COALESCE(SUM(im.quantity_delta), 0) AS current_quantity,
  m.minimum_quantity,
  m.optimal_quantity,
  CASE
    WHEN COALESCE(SUM(im.quantity_delta), 0) <= 0 THEN 'COMPRAR'
    WHEN m.minimum_quantity IS NOT NULL
      AND COALESCE(SUM(im.quantity_delta), 0) <= m.minimum_quantity THEN 'BAJO'
    WHEN m.optimal_quantity IS NOT NULL
      AND COALESCE(SUM(im.quantity_delta), 0) <= m.optimal_quantity * m.reorder_point_pct THEN 'REORDENAR'
    ELSE 'OK'
  END AS status
FROM materials m
LEFT JOIN inventory_movements im ON im.material_id = m.id
WHERE m.is_active = TRUE
GROUP BY m.id, m.name, m.base_unit, m.minimum_quantity, m.optimal_quantity, m.reorder_point_pct;

CREATE TABLE follow_up_rules (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  treatment_id BIGINT UNSIGNED NULL,
  name VARCHAR(160) NOT NULL,
  trigger_type ENUM('ANTES_CITA','DESPUES_CITA','DESPUES_PROCEDIMIENTO','FECHA_PAGO') NOT NULL,
  offset_minutes INT NOT NULL,
  channel ENUM('WHATSAPP','EMAIL','SMS','LLAMADA') NOT NULL DEFAULT 'WHATSAPP',
  template_code VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_follow_rule_treatment FOREIGN KEY (treatment_id) REFERENCES treatments(id)
) ENGINE=InnoDB;

CREATE TABLE scheduled_messages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  guardian_id BIGINT UNSIGNED NULL,
  appointment_id BIGINT UNSIGNED NULL,
  encounter_id BIGINT UNSIGNED NULL,
  rule_id BIGINT UNSIGNED NULL,
  scheduled_for DATETIME NOT NULL,
  status ENUM('PROGRAMADO','ENVIANDO','ENVIADO','ENTREGADO','LEIDO','FALLIDO','CANCELADO') NOT NULL DEFAULT 'PROGRAMADO',
  destination VARCHAR(190) NOT NULL,
  provider_message_id VARCHAR(255) NULL,
  error_detail VARCHAR(500) NULL,
  sent_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_scheduled_messages_queue (status, scheduled_for),
  CONSTRAINT fk_messages_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
  CONSTRAINT fk_messages_guardian FOREIGN KEY (guardian_id) REFERENCES guardians(id),
  CONSTRAINT fk_messages_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  CONSTRAINT fk_messages_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id),
  CONSTRAINT fk_messages_rule FOREIGN KEY (rule_id) REFERENCES follow_up_rules(id)
) ENGINE=InnoDB;

CREATE TABLE receivable_plans (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  guardian_id BIGINT UNSIGNED NULL,
  treatment_id BIGINT UNSIGNED NULL,
  practitioner_id BIGINT UNSIGNED NULL,
  started_on DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  down_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('SIN_FECHA','AL_CORRIENTE','ESTA_SEMANA','VENCIDO','LIQUIDADO','CANCELADO') NOT NULL DEFAULT 'SIN_FECHA',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_receivable_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
  CONSTRAINT fk_receivable_guardian FOREIGN KEY (guardian_id) REFERENCES guardians(id),
  CONSTRAINT fk_receivable_treatment FOREIGN KEY (treatment_id) REFERENCES treatments(id),
  CONSTRAINT fk_receivable_practitioner FOREIGN KEY (practitioner_id) REFERENCES practitioners(id),
  CONSTRAINT fk_receivable_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE receivable_installments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  plan_id BIGINT UNSIGNED NOT NULL,
  due_date DATE NOT NULL,
  expected_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_at DATETIME NULL,
  payment_method ENUM('EFECTIVO','TRANSFERENCIA','TARJETA_DEBITO','TARJETA_CREDITO','MERCADOPAGO','OTRO') NULL,
  bank_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  INDEX idx_installments_due (due_date, paid_at),
  CONSTRAINT fk_installment_plan FOREIGN KEY (plan_id) REFERENCES receivable_plans(id)
) ENGINE=InnoDB;

CREATE TABLE external_lab_orders (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  remittance_number VARCHAR(80) NOT NULL UNIQUE,
  patient_id BIGINT UNSIGNED NOT NULL,
  practitioner_id BIGINT UNSIGNED NULL,
  appliance_or_job VARCHAR(200) NOT NULL,
  sent_on DATE NOT NULL,
  expected_delivery DATE NULL,
  actual_delivery DATE NULL,
  lab_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  lab_advance DECIMAL(12,2) NOT NULL DEFAULT 0,
  patient_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  patient_advance DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('EN_PROCESO','VENCIDO','ENTREGADO','CANCELADO') NOT NULL DEFAULT 'EN_PROCESO',
  notes TEXT NULL,
  CONSTRAINT fk_lab_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
  CONSTRAINT fk_lab_practitioner FOREIGN KEY (practitioner_id) REFERENCES practitioners(id)
) ENGINE=InnoDB;

CREATE TABLE specialist_settlements (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  practitioner_id BIGINT UNSIGNED NOT NULL,
  encounter_procedure_id BIGINT UNSIGNED NOT NULL,
  clinic_percentage DECIMAL(7,4) NOT NULL,
  practitioner_percentage DECIMAL(7,4) NOT NULL,
  material_supplied_by ENUM('CLINICA','DOCTORA','COMPARTIDO') NOT NULL DEFAULT 'CLINICA',
  gross_amount DECIMAL(12,2) NOT NULL,
  clinic_amount DECIMAL(12,2) NOT NULL,
  practitioner_amount DECIMAL(12,2) NOT NULL,
  paid_at DATETIME NULL,
  CONSTRAINT chk_settlement_percentages CHECK (clinic_percentage + practitioner_percentage = 1),
  CONSTRAINT fk_settlement_practitioner FOREIGN KEY (practitioner_id) REFERENCES practitioners(id),
  CONSTRAINT fk_settlement_procedure FOREIGN KEY (encounter_procedure_id) REFERENCES encounter_procedures(id)
) ENGINE=InnoDB;

CREATE TABLE expenses (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  expense_date DATE NOT NULL,
  category VARCHAR(120) NOT NULL,
  concept VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(60) NULL,
  receipt_object_key VARCHAR(500) NULL,
  recorded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expenses_month (expense_date, category),
  CONSTRAINT fk_expenses_user FOREIGN KEY (recorded_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE monthly_goals (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  valid_from DATE NOT NULL UNIQUE,
  income_minimum DECIMAL(12,2) NOT NULL DEFAULT 0,
  income_target DECIMAL(12,2) NOT NULL DEFAULT 0,
  income_ambitious DECIMAL(12,2) NOT NULL DEFAULT 0,
  patients_per_day_minimum SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  patients_per_day_target SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  ticket_minimum DECIMAL(12,2) NOT NULL DEFAULT 0,
  ticket_target DECIMAL(12,2) NOT NULL DEFAULT 0,
  materials_pct_minimum DECIMAL(7,4) NOT NULL DEFAULT 0,
  materials_pct_maximum DECIMAL(7,4) NOT NULL DEFAULT 0,
  net_profit_minimum DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_goals_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE audit_log (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NOT NULL,
  action ENUM('CREATE','READ','UPDATE','DELETE','LOGIN','EXPORT') NOT NULL,
  changed_fields JSON NULL,
  ip_address VARBINARY(16) NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity_type, entity_id, occurred_at),
  INDEX idx_audit_user (user_id, occurred_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

INSERT INTO roles (code, name, description) VALUES
  ('ADMIN', 'Administrador', 'Acceso clínico, operativo, económico y de configuración.'),
  ('ASSISTANT', 'Asistente', 'Captura clínica detallada, agenda del día, RX e inventario.'),
  ('RECEPTION', 'Recepcionista', 'Registro frontal, agenda, historial y anotación básica.');

INSERT INTO permissions (code, description) VALUES
  ('agenda.manage', 'Crear y administrar citas'),
  ('patients.manage', 'Administrar datos de pacientes y tutores'),
  ('history.read', 'Consultar historial clínico'),
  ('clinical.basic', 'Registrar procedimiento básico'),
  ('clinical.detail', 'Registrar detalle clínico y odontograma'),
  ('xray.manage', 'Consultar y adjuntar estudios radiográficos'),
  ('inventory.manage', 'Registrar consumos y conteos de inventario'),
  ('finance.manage', 'Administrar ingresos, gastos y cuentas por cobrar'),
  ('reports.read', 'Consultar reportes administrativos'),
  ('users.manage', 'Administrar usuarios, roles e integraciones');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = 'ADMIN';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.code IN ('agenda.manage','patients.manage','history.read','clinical.basic','clinical.detail','xray.manage','inventory.manage')
WHERE r.code = 'ASSISTANT';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.code IN ('agenda.manage','patients.manage','history.read','clinical.basic')
WHERE r.code = 'RECEPTION';

-- Registro ficticio para validar el cálculo por uso. Sustituir en la importación privada.
INSERT INTO material_categories (name) VALUES ('Material dental');
INSERT INTO materials (
  category_id, code, name, base_unit, package_cost, units_per_package,
  minimum_quantity, optimal_quantity, reorder_point_pct, is_measurable
)
SELECT id, 'CONSUMIBLE_DEMO', 'Consumible clínico demo', 'uso', 1.00, 1, NULL, NULL, 0.2500, TRUE
FROM material_categories WHERE name = 'Material dental';

-- Las metas privadas se insertan después de crear el primer usuario administrador.
