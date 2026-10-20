import { Router } from "express";
import { libros } from "../data/libros.db.js";
import { validarLibro } from "../middlewares/validator.js";
import { escrituraLimiter } from "../middlewares/rateLimit.js";

// Enrutador modular de Libros (express.Router)

const router = Router();


// Valida el ID de la URL y busca el libro una sola vez
// Uso router.param para no repetir el mismo código en cada ruta
// Uso /^\d+$/ porque parseInt("3abc") daría 3 y eso estaría mal

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


// Arma el libro solo con los campos permitidos
// No guardo req.body completo para que no se cuelen campos extra
// trim y Number para guardar textos limpios y números

const armarLibro = ({ titulo, autor, genero, anio, precio }) => ({
    titulo: titulo.trim(),
    autor: autor.trim(),
    genero: genero.trim(),
    anio: Number(anio),
    precio: Number(precio)
});


// Revisa si ya existe un libro con el mismo título y autor
// ignorarId sirve para que al actualizar no choque consigo mismo
const existeDuplicado = ({ titulo, autor }, ignorarId = null) =>
    libros.some(
        (l) =>
            l.id !== ignorarId &&
            l.titulo.toLowerCase() === titulo.toLowerCase() &&
            l.autor.toLowerCase() === autor.toLowerCase()
    );


// 1. [GET] /api/libros - Listar todos los libros del arreglo
// rateLimitInfo muestra cuántas peticiones quedan, para ver el rate limit en acción
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
// El ID ya lo validó router.param
router.get("/:id", (req, res) => {
    res.status(200).json({
        exito: true,
        mensaje: "Libro encontrado exitosamente.",
        libro: libros[req.indice]
    });
});


// 3. [POST] /api/libros - Crear un nuevo libro en el arreglo
// Primero el limitador y después el validador
router.post("/", escrituraLimiter, validarLibro, (req, res) => {
    const datos = armarLibro(req.body);

    // 409 porque el libro ya existe
    if (existeDuplicado(datos)) {
        return res.status(409).json({
            exito: false,
            error: `Ya existe el libro '${datos.titulo}' del autor '${datos.autor}'.`
        });
    }

    // Saco el mayor id y le sumo 1 (con length + 1 se repetirían ids al borrar)
    const nuevoId = libros.reduce((max, l) => Math.max(max, l.id), 0) + 1;

    const nuevoLibro = { id: nuevoId, ...datos };
    libros.push(nuevoLibro);

    // Location con la URL del libro nuevo
    res.status(201)
        .location(`${req.baseUrl}/${nuevoId}`)
        .json({
            exito: true,
            mensaje: "Libro agregado exitosamente al catálogo en memoria.",
            libro: nuevoLibro
        });
});


// 4. [PUT] /api/libros/:id - Actualizar un libro existente (reemplazo completo)
// PUT reemplaza todo el libro, por eso se validan todos los campos
// Lleva escrituraLimiter porque modifica datos
router.put("/:id", escrituraLimiter, validarLibro, (req, res) => {
    const datos = armarLibro(req.body);

    if (existeDuplicado(datos, req.libroId)) {
        return res.status(409).json({
            exito: false,
            error: `No se puede actualizar: ya existe otro libro '${datos.titulo}' del autor '${datos.autor}'.`
        });
    }

    // El id sale de la URL para que no lo puedan cambiar
    libros[req.indice] = { id: req.libroId, ...datos };

    res.status(200).json({
        exito: true,
        mensaje: `Libro con ID ${req.libroId} actualizado correctamente.`,
        libro: libros[req.indice]
    });
});


// 5. [DELETE] /api/libros/:id - Eliminar un libro del arreglo
// Lleva escrituraLimiter para que no borren todo muy rápido
router.delete("/:id", escrituraLimiter, (req, res) => {
    const [libroEliminado] = libros.splice(req.indice, 1);

    res.status(200).json({
        exito: true,
        mensaje: `Libro con ID ${req.libroId} eliminado del catálogo.`,
        libro: libroEliminado
    });
});


export default router;
