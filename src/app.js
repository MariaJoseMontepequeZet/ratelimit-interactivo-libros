import express from "express";
import { logger } from "./middlewares/logger.js";
import { apiLimiter } from "./middlewares/rateLimit.js";
import {errorHandler} from "./middlewares/errorHandler.js";
import librosRouter from "./routes/libros.routes.js";

// Creo la constante app llamando a express para poder usar sus funciones después

const app = express();
const PORT = process.env.PORT || 3000;


// Aca ponemos los middlewares para que reconozca los JSON y registrar lo que va pasando

app.use(express.json());
app.use(logger);


// Ruta principal/home (cualquiera puede entrar sin restricción)

app.get("/", (req, res) => {
    res.status(200).json({
        mensaje: "Bienvenido a la API de Libros protegida con express-rate-limit (Campuslands)",
        seguridad: "Middleware express-rate-limit activo en /api/ (Máx. 100 peticiones por minuto por IP, 10 en escrituras)",
        almacenamiento: "Arreglo de Libros en memoria RAM (sin base de datos externa)",
        endpoints: {
            listar_libros: "GET /api/libros",
            buscar_por_id: "GET /api/libros/:id",
            crear_libro: "POST /api/libros",
            actualizar_libro: "PUT /api/libros/:id",
            eliminar_libro: "DELETE /api/libros/:id"
        }
    });
});


// Limitar cuántas peticiones pueden hacer a la API para que no nos tiren el server

app.use("/api/", apiLimiter);


// Aca cargo todas las rutas de los juegos / videojuegos

app.use("/api/libros", librosRouter);


// Si alguien entra a una URL que no existe, lo mandamos acá para que devuelva un 404

app.use((req, res) => {
    res.status(404).json({
        exito: false,
        error: `La ruta '${req.method} ${req.originalUrl}' no existe en el servidor de libros.`
    });
});


// Manejador de errores global. 
// IMPORTANTE: 
//      Tiene que llevar (err, req, res, next) aunque no use 'next', si no Express no se da cuenta que es de error.

app.use(errorHandler);


// Si estamos corriendo tests no levantamos el server para que no tire error de puerto ocupado

if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`\n=============================================================`);
        console.log(`Servidor de libros iniciado en http://localhost:${PORT}`);
        console.log(`Rate Limit activo en /api/libros (Máx: 100 req / min, 10 escrituras / min)`);
        console.log(`=============================================================\n`);
    });
}

export default app;