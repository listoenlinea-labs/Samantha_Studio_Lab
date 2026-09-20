const app = require('./app');
const pool = require('./config/database');
const asegurarEsquema = require('./config/ensure-schema');

const port = Number(process.env.PORT || 3000);

const endpoints = [
    ['GET', '/api/health', 'Estado de API y conexión a MySQL'],
    ['GET', '/api/pacientes', 'Directorio de pacientes'],
    ['POST', '/api/pacientes', 'Crear paciente'],
    ['GET', '/api/pacientes/:id/foto', 'Descargar foto desde MySQL'],
    ['GET', '/api/pacientes/:id', 'Consultar paciente'],
    ['PATCH', '/api/pacientes/:id', 'Editar paciente'],
    ['PATCH', '/api/pacientes/:id/estado', 'Cambiar estado de paciente']
];

async function iniciarServidor() {
    try {
        // Esta consulta confirma una conexión REAL con Hostinger/MySQL.
        await pool.query('SELECT 1 AS conexion_ok');
        await asegurarEsquema(pool);

        console.log('\n✅ Base de datos MySQL conectada correctamente');
        console.log('✅ Tabla paciente_fotos disponible');
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
