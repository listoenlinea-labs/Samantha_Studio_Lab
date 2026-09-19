function routePendiente(nombre) {
    return (req, res) => {
        res.status(501).json({
            ok: false,
            mensaje: `La ruta "${nombre}" ya existe, pero aún no está conectada a MySQL.`
        });
    };
}

module.exports = routePendiente;