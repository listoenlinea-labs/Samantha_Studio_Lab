# Revisión de competencia: visualización de estudios odontológicos

Fecha de revisión: 14 de noviembre de 2026. Investigación de funciones anunciadas por los proveedores; **no** son resultados de pruebas en sus aplicaciones ni auditoría comparativa de rendimiento.

| Plataforma | Funciones publicadas | Aplicación en Samantha |
|---|---|---|
| 3Shape Unite | Biblioteca del paciente con impresiones digitales, CT, fotografías, documentos y videos, con filtros por tipo. | Biblioteca multimedia unificada por paciente; búsqueda/filtro de formatos y previsualización. |
| Medit Link | Previsualiza STL, OBJ, PLY; imágenes PNG/JPG/GIF/TIFF; videos MP4/MKV/AVI/WMV, con visibilidad y opacidad ajustables. | OBJ/PLY en el visor STL existente, paletas/opacidad del visor y video web MP4/WebM. No prometer MKV/WMV/AVI ni TIFF reproducibles en navegador. |
| Carestream CS Imaging 8 | Unifica imágenes 2D/3D y CAD/CAM, comparación de imágenes y galería. | Vista única con comparación de dos fotografías clínicas y zoom conjunto. No sustituye software de diagnóstico. |
| Dentalink | Adjuntos de radiografías, fotografías, recetas y documentos ligados a la ficha, con filtros por usuario/fecha y agrupación. | Archivos ligados al expediente y filtros por nombre/formato. Metadatos nuevos de tratamiento, autor y comparaciones longitudinales quedan como segunda fase. |
| DentalMonitoring | Compara fotos desde ángulos distintos, documenta evolución y monitorización clínica remota. | Comparación visual manual sin IA, predicción de resultados ni mediciones clínicas. |

Fuentes oficiales consultadas:
- 3Shape Unite biblioteca: https://support.3shape.com/products-unite-software-how-to/how-use-patient-media-library-unite
- 3Shape actualizaciones: https://support.3shape.com/en_US/trios-unite-release-notes/whats-new-in-trios-unite-251-copy-63
- Medit: https://support.medit.com/hc/en-us/articles/25971308306457--File-Viewer
- Carestream CS Imaging: https://www.carestreamdental.com/es-americas/discover/clinical-software/imaging-software/cs-imaging-v8/
- Dentalink: https://ayuda.softwaredentalink.com/es/articles/9493233-como-respaldar-imagenes-y-archivos-de-tus-pacientes
- DentalMonitoring: https://dentalmonitoring.com/dental-monitoring/

## Implementado en este PR

- Nueva opción **Biblioteca multimedia** dentro del expediente del paciente, junto a las vistas anteriores de Archivos PDF y Radiografías (no se eliminan).
- Reutiliza la API y la tabla existentes `archivos_clinicos_ssl` (categoría PDF para PDF, categoría RADIOGRAFIA para otros estudios; **sin migración**, con tipo real identificado por MIME/extensión).
- Listado con búsqueda local instantánea por nombre/descripción y filtro por PDF, foto/radiografía, video, audio, modelo 3D, DICOM, ZIP CBCT.
- Visores privados mediante Blob del mismo origen: PDF integrado, fotos JPG/PNG/WebP/GIF con controles existentes, HTML5 MP4/WebM, audio MP3/WAV/OGG y archivos DICOM/CBCT/STL existentes.
- Nuevo parser local de OBJ y PLY ASCII / PLY binario little-endian: normaliza coordenadas y envía triángulos al visor STL WebGL ya existente (materiales, zoom, rotación y desplazamiento). Modelos con texturas/colores por vértice no se reproducen en esta versión.
- Comparación de dos imágenes con zoom sincronizado. Es visual: **no alinea automáticamente imágenes ni efectúa mediciones**.
- Vista previa local de archivos sin subir; útil para archivos mayores de 14 MB que no caben en MySQL. Subida: PDFs e imágenes máximo 5 MB; DICOM, ZIP, STL/OBJ/PLY, video y audio hasta 14 MB.
- Clasificación y validación en backend por firmas básicas y extensión. Se evita admitir HTML/SVG/JS como medios clínicos. Contenido adjunto se envía como descarga, no contenido activo.
- Diseño móvil responsivo con colores lavanda de Samantha y vista previa de video con controles nativos, sin autoplay.

## Formatos de esta versión

| Formato | Vista previa local | Guardar en MySQL | Visualizar guardado |
|---|---|---|---|
| PDF | Sí | Hasta 5 MB | Sí, visor del navegador |
| JPG/PNG/WebP/GIF | Sí | Hasta 5 MB | Sí |
| TIFF/BMP | Descarga sin vista nativa asegurada | Hasta 5 MB | Descarga original |
| MP4/WebM | Sí, si códec compatible | Hasta 14 MB | HTML5 con controles (sin autoplay) |
| MP3/WAV/OGG | Sí, si códec compatible | Hasta 14 MB | HTML5 con controles |
| STL/OBJ/PLY | Sí | Hasta 14 MB | 3D WebGL |
| DICOM y ZIP CBCT | Sí, según sintaxis/códec del archivo | Hasta 14 MB por archivo | Visor de consulta existente |
| MOV/MKV/AVI/WMV, JPEG2000 clínico, NIfTI, archivos propietarios | No | No | Requiere motor/conversión especializada |

## Próximas mejoras recomendadas (NO incluidas)

1. Almacenamiento de objetos cifrado, permisos reales por rol, bitácora y enlaces temporales antes de uso con información médica sensible. Actualmente se conserva la protección Basic de despliegues productivos que ya existía, no se desarrolla un IAM completo.
2. Subidas segmentadas/resumibles y almacenamiento de videos >14 MB sin cargar todo a MySQL; posibles costos adicionales de infraestructura.
3. Miniaturas y extracción de metadatos (fecha de toma, odontólogo, tipo de imagen, motivo de la toma, episodio/tratamiento) para una línea de tiempo y comparación antes/después estructurada.
4. Reproducción y renderizado seguro de TIFF multiframe, DICOM con compresión JPEG2000 y otros códecs mediante motor especializado.
5. Soporte de modelos con texturas/colores reales, alineación automática 3D, superposiciones CAD y planeación clínica solo con tecnología regulatoria apropiada.

## Seguridad y límites honestos

- El renderizado visual para consulta no reemplaza PACS/DICOM certificado, diagnóstico ni dispositivos médicos regulados.
- Se mantiene límite de almacenamiento de Hostinger/MySQL. **No** se implementan streaming byte-range ni transcodificación de video en backend. La reproducción depende del códec del navegador.
- Los datos de un paciente nunca se comparan con los de otro: selección de imágenes y archivos permanece dentro del ID de expediente y se descartan vistas obsoletas al cambiar sección.
- Antes de uso clínico real, revisar controles de acceso de usuarios, consentimiento, cifrado y cumplimiento de datos de salud de México.

## Verificación

- Pruebas unitarias sintéticas de OBJ, PLY ASCII y PLY binario little-endian con una cara triangular: pasan.
- Pendiente validar modelos y videos reales en Chrome, Safari/iOS, Android, y el almacenamiento con límites exactos de MySQL en Hostinger.