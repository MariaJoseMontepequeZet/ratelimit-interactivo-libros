// Valida el body de los libros antes de llegar a la ruta (POST y PUT)


// Revisa que el valor sea un texto que no esté vacío
// Lo uso para titulo, autor y genero y así no repito el mismo if

const esTextoValido = (valor) => typeof valor === "string" && valor.trim().length > 0;


// Respuesta 400 con el mismo formato de error del resto de la API

const error400 = (res, mensaje) => res.status(400).json({ exito: false, error: mensaje });


export function validarLibro(req, res, next) {

    // En Express 5 req.body es undefined si no mandan JSON, por eso se revisa primero

    if (!req.body || typeof req.body !== "object") {
        return error400(res, "Se requiere enviar un cuerpo JSON válido en la solicitud.");
    }

    const { titulo, autor, genero, anio, precio } = req.body;

    if (!esTextoValido(titulo)) {
        return error400(res, "El campo 'titulo' del libro es obligatorio.");
    }

    if (!esTextoValido(autor)) {
        return error400(res, "El campo 'autor' es obligatorio.");
    }

    if (!esTextoValido(genero)) {
        return error400(res, "El campo 'genero' es obligatorio (ej: Novela, Fábula, Ciencia ficción).");
    }

    // El año tiene que ser entero y no puede ser mayor al año actual
    // Number(null) da 0 y Number("") también, por eso reviso el tipo antes

    const anioNum = Number(anio);
    const anioActual = new Date().getFullYear();

    if (anio === undefined || anio === null || anio === "" || !Number.isInteger(anioNum) || anioNum < 1 || anioNum > anioActual) {
        return error400(res, `El campo 'anio' debe ser un número entero entre 1 y ${anioActual}.`);
    }

    // Mismo cuidado con el precio: null y "" se convertirían en 0 y pasarían como válidos

    const precioNum = Number(precio);

    if (precio === undefined || precio === null || precio === "" || !Number.isFinite(precioNum) || precioNum < 0) {
        return error400(res, "El campo 'precio' debe ser un número válido mayor o igual a 0.");
    }

    // Si todo está bien pasamos a la ruta

    next();
}
