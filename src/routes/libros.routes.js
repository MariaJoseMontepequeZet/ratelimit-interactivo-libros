import { Router } from "express";
import { libros } from "../data/libros.db.js";
import { validarLibro } from "../middlewares/validator.js";
import { escrituraLimiter } from "../middlewares/rateLimit.js";

/**
 * Enrutador modular de Libros (express.Router)
 * --------------------------------------------
 * Gestiona los 5 endpoints CRUD operando sobre el arreglo de libros en memoria.
 * Se monta en src/app.js bajo el prefijo "/api/libros".
 *
 * ¿Por qué un Router separado y no rutas sueltas en app.js?
 * Para que app.js solo se encargue de armar el servidor (middlewares globales, 404, errores)
 * y toda la lógica del recurso "libros" viva en un solo archivo fácil de encontrar y de probar.
 *
 * Límites de peticiones: el apiLimiter (general, por IP) ya se aplica en app.js sobre /api/,
 * así que aquí solo se agrega el escrituraLimiter (más estricto) a las rutas que modifican datos.
 */
const router = Router();


// Revisa que el ID de la URL sea un número entero positivo y busca el libro UNA sola vez.
// ¿Por qué router.param y no repetir el código en cada ruta? Antes el mismo bloque de
// parseInt + isNaN + findIndex estaba copiado 3 veces (GET, PUT y DELETE); si había que
// corregir algo se corregía en un lugar y se olvidaba en los otros.
// ¿Por qué Number.isInteger y /^\d+$/ y no solo parseInt? Porque parseInt("3abc") devuelve 3
// y aceptaría IDs mal escritos como si fueran válidos.
// Deja en req.indice la posición del libro, que PUT y DELETE necesitan para modificar el arreglo.
router.param("id", (req, res, next, valor) => {
    const id = /^\d+$/.test(valor) ? Number(valor) : NaN;

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            exito: false,
            error: "El parámetro ID debe ser un número entero positivo válido."
        });
    }

    const indice = libros.findIndex((l) => l.id === id);

    if (indice === -1) {
        return res.status(404).json({
            exito: false,
            error: `No existe ningún libro con el ID ${id}.`
        });
    }

    req.libroId = id;
    req.indice = indice;
    next();
});


// Arma el objeto libro con solo los campos permitidos.
// ¿Por qué no guardar req.body completo? Porque el cliente podría mandar campos extra
// (como "id" o "admin") y se guardarían en el arreglo; así solo entra lo que nosotros definimos.
// ¿Por qué trim y Number aquí? Para que en el arreglo siempre queden textos limpios y el precio
// como número, aunque llegue como "29.99" desde un formulario.
const armarLibro = ({ titulo, autor, genero, anio, precio }) => ({
    titulo: titulo.trim(),
    autor: autor.trim(),
    genero: genero.trim(),
    anio: Number(anio),
    precio: Number(precio)
});


// Busca si ya existe un libro con el mismo título y autor (ignorando mayúsculas).
// ¿Por qué? Un catálogo con el mismo libro repetido es un error de datos, no una variante válida.
// El parámetro "ignorarId" sirve para que al actualizar un libro no choque consigo mismo.
const existeDuplicado = ({ titulo, autor }, ignorarId = null) =>
    libros.some(
        (l) =>
            l.id !== ignorarId &&
            l.titulo.toLowerCase() === titulo.toLowerCase() &&
            l.autor.toLowerCase() === autor.toLowerCase()
    );


// 1. [GET] /api/libros - Listar todos los libros del arreglo
// ¿Por qué se incluye rateLimitInfo? Es un proyecto para aprender rate limit: así se ve en
// cada respuesta cuántas peticiones quedan sin tener que mirar los headers.
router.get("/", (req, res) => {
    res.status(200).json({
        exito: true,
        total: libros.length,
        rateLimitInfo: req.rateLimit
            ? {
                limiteVentana: req.rateLimit.limit,
                usados: req.rateLimit.used,
                tokensRestantes: req.rateLimit.remaining
            }
            : undefined,
        datos: libros
    });
});


// 2. [GET] /api/libros/:id - Buscar un libro por su ID
// El ID ya viene validado y buscado por router.param, aquí solo se responde.
router.get("/:id", (req, res) => {
    res.status(200).json({
        exito: true,
        mensaje: "Libro encontrado exitosamente.",
        libro: libros[req.indice]
    });
});


// 3. [POST] /api/libros - Crear un nuevo libro en el arreglo
// Orden de los middlewares: primero el limitador (si ya se pasó del cupo ni se gasta tiempo
// validando) y después el validador del body.
router.post("/", escrituraLimiter, validarLibro, (req, res) => {
    const datos = armarLibro(req.body);

    // 409 Conflict: la petición está bien escrita pero choca con un dato que ya existe
    if (existeDuplicado(datos)) {
        return res.status(409).json({
            exito: false,
            error: `Ya existe el libro '${datos.titulo}' del autor '${datos.autor}'.`
        });
    }

    // Se calcula el siguiente ID con reduce y no con Math.max(...arreglo): el spread
    // revienta con arreglos muy grandes. Usar length + 1 tampoco sirve porque tras borrar
    // un libro se repetirían IDs.
    const nuevoId = libros.reduce((max, l) => Math.max(max, l.id), 0) + 1;

    const nuevoLibro = { id: nuevoId, ...datos };
    libros.push(nuevoLibro);

    // Se devuelve el header Location con la URL del recurso creado, como pide REST para un 201
    res.status(201)
        .location(`${req.baseUrl}/${nuevoId}`)
        .json({
            exito: true,
            mensaje: "Libro agregado exitosamente al catálogo en memoria.",
            libro: nuevoLibro
        });
});


// 4. [PUT] /api/libros/:id - Actualizar un libro existente (reemplazo completo)
// PUT reemplaza el recurso entero, por eso el validador exige todos los campos.
// Lleva escrituraLimiter porque modifica datos igual que el POST.
router.put("/:id", escrituraLimiter, validarLibro, (req, res) => {
    const datos = armarLibro(req.body);

    if (existeDuplicado(datos, req.libroId)) {
        return res.status(409).json({
            exito: false,
            error: `No se puede actualizar: ya existe otro libro '${datos.titulo}' del autor '${datos.autor}'.`
        });
    }

    // El id se toma de la URL y no del body para que nadie pueda cambiarlo al actualizar
    libros[req.indice] = { id: req.libroId, ...datos };

    res.status(200).json({
        exito: true,
        mensaje: `Libro con ID ${req.libroId} actualizado correctamente.`,
        libro: libros[req.indice]
    });
});


// 5. [DELETE] /api/libros/:id - Eliminar un libro del arreglo
// Lleva escrituraLimiter porque borrar es la operación más destructiva: sin él se podría
// vaciar el catálogo completo a ritmo del límite general.
router.delete("/:id", escrituraLimiter, (req, res) => {
    const [libroEliminado] = libros.splice(req.indice, 1);

    res.status(200).json({
        exito: true,
        mensaje: `Libro con ID ${req.libroId} eliminado del catálogo.`,
        libro: libroEliminado
    });
});


export default router;
