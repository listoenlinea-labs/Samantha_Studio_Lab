const app = require('./app');
const pool = require('./config/database');
const asegurarEsquema = require('./config/ensure-schema');

const port = Number(process.env.PORT || 3000);

const endpoints = [
    ['GET', '/api/health', 'Estado de API y conexión a MySQL'],
    ['GET', '/api/pacientes', 'Directorio de pacientes'],
    ['GET', '/api/tratamientos', 'Catálogo real de tratamientos'],
    ['POST', '/api/tratamientos', 'Crear tratamiento'],
    ['PATCH', '/api/tratamientos/:id', 'Editar tratamiento'],
    ['POST', '/api/pacientes', 'Crear paciente'],
    ['GET', '/api/pacientes/:id/foto', 'Descargar foto desde MySQL'],
    ['GET', '/api/pacientes/:id', 'Consultar paciente'],
    ['PATCH', '/api/pacientes/:id', 'Editar paciente'],
    ['PATCH', '/api/pacientes/:id/estado', 'Cambiar estado de paciente'],
    ['GET', '/api/pacientes/:id/resumen', 'Cabecera del expediente clínico'],
    ['GET/POST', '/api/pacientes/:id/citas', 'Citas del panel rápido'],
    ['GET/PATCH', '/api/pacientes/:id/filiacion', 'Filiación del paciente'],
    ['GET/POST', '/api/pacientes/:id/presupuestos', 'Presupuestos del paciente'],
    ['GET/POST', '/api/pacientes/:id/tareas', 'Tareas manuales y automáticas'],
    ['GET/PUT', '/api/pacientes/:id/historia-clinica', 'Historia clínica versionada'],
    ['GET/POST', '/api/pacientes/:id/odontogramas', 'Odontogramas del paciente'],
    ['GET/POST', '/api/odontogramas/:id/hallazgos', 'Hallazgos por pieza dental'],
    ['GET/POST', '/api/pacientes/:id/periodontogramas', 'Periodontogramas del paciente'],
    ['GET', '/api/periodontogramas/:id', 'Detalle y mediciones periodontales'],
    ['PUT', '/api/periodontogramas/:id/mediciones', 'Guardar mediciones completas']
];

async function iniciarServidor() {
    try {
        // Esta consulta confirma una conexión REAL con Hostinger/MySQL.
        await pool.query('SELECT 1 AS conexion_ok');
        await asegurarEsquema(pool);

        console.log('\n✅ Base de datos MySQL conectada correctamente');
        console.log('✅ Esquema de pacientes y expediente clínico disponible');
        console.log(`✅ Entorno: ${process.env.NODE_ENV || 'development'}`);

        app.listen(port, '0.0.0.0', () => {
            console.log(`✅ API escuchando en http://localhost:${port}\n`);
            console.log('Endpoints registrados:');
            console.table(
                endpoints.map(([metodo, ruta, descripcion]) => ({
                    Método: metodo,
                    Ruta: ruta,
                    Descripción: descripcion
                }))
            );
        });
    } catch (error) {
        console.error('\n❌ No fue posible iniciar la API con MySQL.');
        console.error(`Motivo: ${error.message}`);
        process.exit(1);
    }
}

iniciarServidor();
