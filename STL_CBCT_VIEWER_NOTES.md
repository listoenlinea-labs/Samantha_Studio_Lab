# PR — Tomografías CBCT y modelos STL 3D

## Qué corrige
- La pantalla dejaba el botón de visualizar deshabilitado y parecía detenerse en `Construyendo volumen 80/80`. Después de contabilizar cortes, todavía quedaban cálculos síncronos de contraste y normalización; ahora el ensamblado cooperativo libera el hilo UI en bloques y emite fases separadas: **Construyendo volumen**, **Calculando contraste**, **Normalizando intensidades**, **Volumen listo**.
- Los botones de visualizar y guardar no pueden ejecutarse en paralelo durante el procesamiento; al fallar reciben un mensaje descriptivo y se reactivan cuando corresponde.
- Se muestra barra de progreso durante extracción, lectura y construcción de series DICOM.

## Soporte STL
- El selector de Radiografías/Tomografías acepta `.stl` además de ZIP / DICOM.
- Parser de **STL binario y STL ASCII** con validación de geometría y cantidades de triángulos.
- Visor WebGL de malla 3D, con arrastre para girar, rueda para zoom, botones acercar/alejar/restablecer y vista adaptable a móvil.
- Acepta un `.zip` que contenga **un único STL**; si hay cortes DICOM dentro, mantiene el flujo de CBCT. Varios STL dentro de ZIP requieren extraer el modelo deseado.
- Guardado opcional en MySQL asociado al paciente como categoría RADIOGRAFIA y MIME `model/stl`, o ZIP si el modelo estaba comprimido. Puede consultarse y descargarse posteriormente desde el expediente.
- Preview local hasta **40 MB** y 450,000 triángulos; almacenamiento en MySQL hasta **14 MB** (mismo límite existente para DICOM y ZIP). Archivos más grandes requieren simplificar la malla o usar visor especializado.
- **Diferencia fundamental:** STL representa una superficie 3D, no contiene los cortes radiográficos ni permite reconstruir vistas axial/sagital/panorámica a partir de la malla. Los visores CBCT permanecen independientes.

## Protección y seguridad
- No se modifican esquemas MySQL, datos previos ni credenciales. Se usa la ruta privada de documentos clínicos existente con validación de bytes y extensión.
- Archivos STL se envían como descarga al acceder directamente al endpoint, para evitar servir contenido activo.
- No se añaden librerías externas ni carga a proveedores de terceros. La malla se procesa localmente; solo se envía al backend si se pulsa guardar.
- Los visores son orientativos y **no están certificados para diagnóstico ni mediciones clínicas**.

## Validación y pruebas
- `backend/test/stl-models.test.js`: STL binario, ASCII, contenido inválido, extensión y rechazo de archivos excesivos.
- `backend/test/cbct-progress.test.js`: volumen sintético de 12 cortes, etapas de progreso y rechazo de una sola radiografía 2D.
- Se ejecutaron verificaciones directas en el entorno del PR con mallas STL y un volumen sintético: parseo binario/ASCII y etapas de progreso CBCT completaron.
- Sigue pendiente prueba interactiva real en navegador e iPhone y ensayo con el ZIP de 80 cortes de la captura, que no se ha adjuntado como archivo. La imagen por sí sola no permite validar la geometría DICOM real.

## Verificación tras desplegar
1. Abrir expediente de un paciente **ficticio**, entrar a Radiografías y tomografías.
2. Seleccionar un STL ASCII/binarizado de prueba: comprobar detección, visor, rotación/zoom y guardar/descargar (menos de 14 MB).
3. Seleccionar ZIP DICOM anonimizados de 12–400 cortes: observar progreso tras el último corte, confirmar vistas 2D/3D/panorámica.
4. Probar un ZIP que contenga solo un STL y confirmar que abra el modelo en vez de intentar ensamblar CBCT.
5. Probar archivo inválido: mostrar error y permitir volver a seleccionar otra opción sin recargar la página.

Sin merge automático.