// Manejador de errores global (va al final de app.js, después de las rutas)
// Express sabe que es de errores porque tiene 4 parámetros, aunque no use next


export function errorHandler(err, req, res, next) {

    // Si ya se empezó a responder no se puede mandar otra respuesta, se la pasa a Express

    if (res.headersSent) {
        return next(err);
    }

    // Si mandan un JSON mal escrito, express.json() lanza este error
    // Es culpa del cliente, por eso es 400 y no 500

    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            exito: false,
            error: "El JSON enviado no es válido, revisa comas y comillas."
        });
    }

    const codigo = err.statusCode || err.status || 500;

    console.error("🚨 Error en el servidor:", err.message || err);

    // En los errores 500 no muestro el mensaje real para no dar detalles internos al cliente

    res.status(codigo).json({
        exito: false,
        error: codigo === 500 ? "Error interno en el servidor de libros." : err.message
    });
}
