# Samantha's Studio Lab — paleta, expediente, recetas y recordatorios

## Alcance implementado

- Hoja final de tema lavanda **#DACCE6**, obtenida del color predominante del logotipo enviado; variantes de contraste para texto y botones.
- Expediente adaptado a la presentación de Yerena: encabezado, menú lateral plegable, ficha de paciente, filiación, controles odontograma y bloques periodontales desplazables en móvil. Se mantienen las API existentes de odontograma y periodontograma y su histórico clínico.
- Filiación: domicilio, ocupación, tutor, emergencia, observaciones y consentimiento por canal.
- Recetas privadas: texto libre, folio, registro por paciente, PDF de media carta generado en Node.js con PDFKit, guardado en MySQL; consulta, descarga, impresión y eliminación desde Prescripciones.
- Recordatorios: preferencias de 1–3 días y de 1–3 horas, registro de envíos por cita/canal/ventana, correo SMTP y plantillas de WhatsApp Business Meta.
- Navegación hacia **recordatorios.html**, estado de proveedores y últimos envíos.

## Despliegue controlado

1. Haz respaldo de MySQL en Hostinger.
2. Instala dependencias del backend con \`npm ci\` en \`backend\`, despliega la rama tras aprobar el PR y reinicia Node.js. La función \`asegurarEsquema\` agrega columnas y crea tablas faltantes sin borrar datos. Si el usuario MySQL no tiene permisos de \`ALTER\` o \`CREATE\`, aplica las migraciones bajo una cuenta autorizada.
3. Comprueba que \`recetas_clinicas\`, \`recordatorios_config\` y \`recordatorios_envios\` existan y que la API responda.
4. Mantén \`REMINDERS_ENABLED=false\` durante pruebas. Completa \`SMTP_*\`, \`WHATSAPP_*\` y autentica acceso al sitio con \`SITE_USER\`/\`SITE_PASSWORD\`.
5. Configura una plantilla **aprobada** por Meta con cinco parámetros: paciente, fecha, hora, profesional y dirección; no sirve \`hello_world\` para recordatorios.
6. En \`recordatorios.html\`, ajusta periodos y activa canales. En el expediente de cada paciente, Filiación, registra el consentimiento explícito por canal y el dato correcto de correo/teléfono.
7. Solo con controles y proveedores revisados establece \`REMINDERS_ENABLED=true\` en producción y reinicia la aplicación.
8. Comprueba el historial de envíos; \`FALLIDO\` requiere revisión manual para no enviar duplicados si hubo un error ambiguo del proveedor.

## Privacidad y límites

La plataforma existente utiliza autenticación HTTP Basic compartida en producción; para operación clínica real conviene migrar a usuarios y roles antes de dar acceso a todo el personal. Los recordatorios omiten diagnósticos y datos clínicos. El PDF no inventa nombre ni cédula profesional; antes de entregar debe revisarse y firmarse por el profesional responsable. No colocar credenciales ni datos de pacientes en GitHub.

Este PR **no migra automáticamente** Google Calendar, visor CBCT, usuarios/roles, radiografías u otros módulos propios de Yerena. Requieren adaptación y validación específica a la base de Samantha. La paridad visual y las funciones citadas arriba no implican que ambos sistemas tengan todos sus módulos idénticos.
