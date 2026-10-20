// Registra en consola cada petición que llega al servidor

export function logger(req, res, next) {
    const inicio = Date.now();

    // Espero al evento "finish" para poder mostrar el status y cuánto tardó
    // Si lo imprimo antes de next() todavía no se sabe qué respondió la ruta

    res.on("finish", () => {
        const duracion = Date.now() - inicio;
        const fecha = new Date().toISOString();

        console.log(`[${fecha}] 📚 ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duracion}ms)`);
    });

    // Obligatorio llamar a next() o la petición se queda colgada

    next();
}
