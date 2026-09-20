-- Catálogo visual completo y variantes persistentes del odontograma.
-- Migración aditiva: no elimina expedientes ni hallazgos existentes.

ALTER TABLE catalogo_hallazgos
  ADD COLUMN IF NOT EXISTS icono VARCHAR(40) NOT NULL DEFAULT 'punto',
  ADD COLUMN IF NOT EXISTS variantes VARCHAR(80) NOT NULL DEFAULT 'MALO',
  ADD COLUMN IF NOT EXISTS orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requiere_superficie TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE odontograma_hallazgos
  ADD COLUMN IF NOT EXISTS id_catalogo_hallazgo INT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS estado_visual VARCHAR(20) NOT NULL DEFAULT 'MALO',
  ADD COLUMN IF NOT EXISTS variante VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS datos_json JSON NULL;

INSERT INTO catalogo_hallazgos
  (codigo, nombre, clasificacion, icono, variantes, orden, requiere_superficie)
VALUES
  ('CARIES','Caries','MALO','caries','MALO',10,1),
  ('RESTAURACION_DEFICIENTE','Restauración deficiente','MALO','restauracion','MALO',20,1),
  ('RESTAURACION','Restauración','BUENO','restauracion','BUENO',30,1),
  ('DIENTE_SANO','Diente sano','BUENO','sano','BUENO',40,0),
  ('PIEZA_AUSENTE','Pieza dentaria ausente','BUENO','ausente','BUENO',50,0),
  ('SUPERFICIE_DESGASTADA','Superficie desgastada','MALO','superficie','MALO',60,1),
  ('EXTRACCION','Extracción','MALO','extraccion','MALO',70,0),
  ('ENDODONCIA','Endodoncia','BUENO','endodoncia','BUENO,MALO',80,0),
  ('CORONA','Corona','NEUTRO','corona','MALO,BUENO,NEUTRO',90,0),
  ('FRACTURA','Fractura','MALO','fractura','MALO',100,0),
  ('LESION_CERVICAL','Lesión cervical','MALO','lesion-cervical','BUENO,MALO',110,0),
  ('DEFECTO_ESMALTE','Defectos de desarrollo de esmalte','NEUTRO','defecto-esmalte','NEUTRO',120,0),
  ('IMPACTACION','Impactación','MALO','impactacion','MALO',130,0),
  ('IMPLANTE_BUENO','Implante dental en buen estado','BUENO','implante','BUENO',140,0),
  ('IMPLANTE_MALO','Implante dental en mal estado','MALO','implante','MALO',150,0),
  ('EDENTULO_TOTAL','Edéntulo total','BUENO','linea','BUENO',160,0),
  ('GINGIVITIS','Gingivitis','MALO','gingivitis','MALO',170,0),
  ('PIEZA_ERUPCION','Pieza dentaria en erupción','BUENO','erupcion','BUENO',180,0),
  ('FISURA','Fisura','MALO','fisura','MALO',190,0),
  ('REMANENTE_RADICULAR','Remanente radicular','MALO','remanente','MALO',200,0),
  ('PERIODONTITIS','Periodontitis','MALO','periodontitis','MALO',210,0),
  ('PERNO_FIBRA','Perno de fibra','BUENO','perno-fibra','BUENO,MALO',220,0),
  ('FRENILLO_CORTO','Frenillo corto','MALO','frenillo','MALO',230,0),
  ('FOSA_FISURA_PROFUNDA','Fosa y fisuras profundas','MALO','ffp','BUENO,MALO',240,0),
  ('APARATO_FIJO','Aparato ortodóntico fijo','BUENO','aparato-fijo','BUENO,MALO',250,0),
  ('FUSION','Fusión','BUENO','fusion','BUENO',260,0),
  ('APARATO_REMOVIBLE','Aparato ortodóntico removible','BUENO','aparato-removible','BUENO,MALO',270,0),
  ('GEMINACION','Geminación','BUENO','geminacion','BUENO',280,0),
  ('BOLSA_PERIODONTAL','Bolsa periodontal','MALO','bolsa','MALO',290,0),
  ('GINGIVECTOMIA','Gingivectomía','BUENO','gingivectomia','MALO,BUENO',300,0),
  ('CARILLA','Carilla','BUENO','carilla','MALO,BUENO',310,0),
  ('CARILLAS','Carillas','BUENO','carillas','MALO,BUENO',320,0),
  ('GIROVERSION','Giroversión','BUENO','giroversion','BUENO',330,0),
  ('COMPROMISO_FURCA','Compromiso de furca','MALO','furca','MALO',340,0),
  ('DIASTEMA','Diastema','BUENO','diastema','BUENO',350,0),
  ('PERNO_METALICO','Perno metálico','BUENO','perno-metalico','BUENO,MALO',360,0),
  ('INTRUIDA_ANQUILOSIS','Pieza dental intruida - anquilosis','BUENO','flecha-arriba','BUENO',370,0),
  ('PIEZA_ECTOPICA','Pieza dentaria ectópica','MALO','ectopica','MALO',380,0),
  ('PIEZA_CLAVIJA','Pieza dentaria en clavija','BUENO','clavija','BUENO',390,0),
  ('PIEZA_EXTRUIDA','Pieza dentaria extruida','BUENO','flecha-abajo','BUENO',400,0),
  ('PIEZA_INTRUIDA','Pieza dentaria intruida','BUENO','flecha-arriba','BUENO',410,0),
  ('PROTESIS_COMPLETA','Prótesis dental completa','BUENO','linea','BUENO,MALO',420,0),
  ('PROTESIS_PARCIAL_FIJA','Prótesis dental parcial fija','BUENO','puente','BUENO,MALO',430,0),
  ('PROTESIS_REMOVIBLE','Prótesis removible','BUENO','linea','BUENO,MALO',440,0),
  ('PULPECTOMIA','Pulpectomía','BUENO','pulpectomia','BUENO,MALO',450,0),
  ('PULPOTOMIA','Pulpotomía','BUENO','pulpotomia','BUENO,MALO',460,0),
  ('SELLANTES','Sellantes','BUENO','sellante','BUENO,MALO',470,1),
  ('TRATAMIENTO_CONDUCTO','Tratamiento de conducto','BUENO','conducto','BUENO,MALO',480,0)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre), clasificacion = VALUES(clasificacion),
  icono = VALUES(icono), variantes = VALUES(variantes), orden = VALUES(orden),
  requiere_superficie = VALUES(requiere_superficie), activo = 1;

UPDATE odontograma_hallazgos h
INNER JOIN catalogo_hallazgos c ON c.id_catalogo_hallazgo = h.id_catalogo_hallazgo
SET h.estado_visual = c.clasificacion
WHERE h.variante IS NULL;
