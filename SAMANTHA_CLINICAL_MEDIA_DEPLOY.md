# Samantha Studio Lab — Archivos PDF y Radiografías/Tomografías

## Paridad con Yerena incorporada

- Pestañas del expediente: **Archivos PDF** y **Radiografías y tomografías**, con las mismas categorías que Yerena.
- Subir, listar, ver y descargar PDFs privados, imágenes (JPEG/PNG/WEBP/BMP/TIFF) y archivos DICOM (Part 10). BMP/TIFF se conservan y descargan si el navegador no puede previsualizarlos.
- Visor DICOM 2D adaptado de Yerena: revisión local, controles de ventanas/contraste, zoom y navegación por frames cuando el formato es compatible.
- Controles de zoom, orientación, rotación e inclinación de imágenes radiográficas, también adaptados de Yerena.
- Tomografías CBCT: carga local de ZIP o carpeta con cortes DICOM; vistas 2D, 3D exploratoria y panorámica **solo con geometría espacial válida**; se usa el mismo núcleo de Yerena (incluido lector ZIP, motor volumétrico y visor).
- Guardar ZIP (hasta 14 MB) o cortes individuales de una serie CBCT en MySQL; se enlazan por SeriesInstanceUID y pueden reabrirse como serie cuando hay 12–400 cortes.
- Una tabla nueva, `archivos_clinicos_ssl`, conserva los bytes por paciente. No modifica ni borra registros previos de pacientes, historias, odontogramas o recetas.

## Restricciones deliberadas

- **No diagnóstico:** los visores de DICOM/CBCT son de consulta y no están certificados para diagnóstico, mediciones terapéuticas ni planeación quirúrgica. No se inventan volúmenes 3D a partir de radiografías 2D.
- DICOM individual máximo 14 MB; PDF/imágenes máximo 5 MB; ZIP almacenado máximo 14 MB. El lector local de series permite hasta 256 MB / 400 cortes según validación del módulo, pero los archivos grandes no se guardan automáticamente en MySQL.
- Algunos formatos DICOM comprimidos requieren un PACS externo; se conserva la descarga del original. ZIP cifrados, series incompletas o sin orientación válida no se fuerzan.
- **Privacidad:** las imágenes de pacientes no se envían a servicios de terceros para reconstruir; el navegador procesa DICOM/CBCT localmente. Si se pulsa Guardar, los archivos se transfieren al backend privado del mismo dominio.
- El backend heredado de Samantha utiliza HTTP Basic compartido; **no es equivalente a los roles y la auditoría real de Yerena**. La eliminación se deja desactivada por defecto con `CLINICAL_FILE_DELETE_ENABLED=false` hasta implementar autorización administrativa real. No basta el selector visual 'Administrador'.

## Despliegue Hostinger

1. Hacer respaldo de la base de datos de Samantha antes de fusionar.
2. Fusionar la rama tras revisión, desplegar Node.js con el frontend `docs/` actualizado y reiniciar. `asegurarEsquema` crea únicamente `archivos_clinicos_ssl` con FK compatible con el tipo real de `pacientes.id_paciente`.
3. Confirmar que MySQL tenga permisos CREATE y límites `max_allowed_packet` adecuados para los archivos. Si Hostinger tiene cuota de almacenamiento pequeña, limitar el número de series guardadas.
4. Abrir el expediente de **un paciente ficticio**; subir un PDF pequeño y una imagen ficticia, comprobar listado, vista previa y descarga; confirmar que los archivos no aparecen en otro paciente.
5. Probar DICOM Part 10 sintético / anonimizado y una serie de cortes CBCT sin datos identificatorios. Verificar zoom, contraste, reconstrucción si la geometría es válida, guardado y re-apertura.
6. Verificar en móvil el desplazamiento de listas y herramientas de imagen. Comprobar además el caso de archivo mayor al límite para recibir HTTP 413 (no 500).
7. No habilitar el borrado clínico para usuarios generales. La variable `CLINICAL_FILE_DELETE_ENABLED=true` sólo se considerará después de un sistema de autenticación y roles de backend revisado.

## Nota de pruebas

Se incluyen pruebas unitarias de validación de archivos en `backend/test/clinical-files.test.js`. No se desplegó ni se utilizó información clínica real desde este PR.
