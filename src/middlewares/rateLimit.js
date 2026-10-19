// Rate limit para que no nos tiren el server con ataques ni spameen peticiones

import { rateLimit } from "express-rate-limit";


// Los valores se pueden cambiar con variables de entorno, si no existen se usan los que tengamos por defecto.
// ¿Por qué así? 
//      Porque el límite ideal cambia según el entorno (desarrollo, producción, pruebas de carga) y de esta forma se ajusta sin tocar el código ni volver a hacer deploy del archivo.

const VENTANA_MS = Number(process.env.RATE_WINDOW_MS) || 60 * 1000;


// ¿Por qué 100? 
//      Con 5 por minuto (lo que había antes) un cliente normal que lista libros y abre un par de detalles ya se pasa y la API queda inutilizable. 100/min frena abusos pero deja usarla.
const LIMITE_API = Number(process.env.RATE_LIMIT_API) || 100;


// ¿Por qué 10? 
//      Escribir (POST/PUT/DELETE) cambia datos y es más costoso/riesgoso que leer, así que se limita mucho más. Aun así 10/min deja trabajar a una persona real sin problema.
const LIMITE_ESCRITURA = Number(process.env.RATE_LIMIT_WRITE) || 10;


// Cuando se pasan del límite respondemos siempre con el mismo formato JSON y le decimos cuántos segundos faltan para poder volver a intentar.
// ¿Por qué un handler y no 'message'? 
//      Porque con 'message' el texto es fijo  y no se puede calcular el tiempo de espera real para cada cliente.
// ¿Por qué una función que devuelve otra función? 
//      Para reutilizar la misma lógica en los dos limitadores y que solo cambien los textos.

const crearHandler = (error, detalle) => (req, res) => {
    // resetTime es cuándo se reinicia la ventana; Math.max evita devolver 0 o negativos por desfase de reloj
    const segundos = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));

    res.status(429).json({
        exito: false,
        status: 429,
        error,
        detalle,
        reintentar_en_segundos: segundos
    });
};


// Configuración común para los dos limitadores (así no se repite y no se desincronizan)
// - draft-7: 
//      Manda los headers estándar RateLimit-* y Retry-After, que es lo que entienden los clientes modernos.
// - legacyHeaders false: 
//      los X-RateLimit-* viejos duplicaban la información y ya no hacen falta.
// - skip en test: 
//      las pruebas hacen muchas peticiones seguidas desde la misma IP y se bloquearían entre ellas.
// - skip en OPTIONS: 
//      Es el preflight de CORS, el navegador lo manda solo y no debería gastar el cupo del usuario.

const base = {
    windowMs: VENTANA_MS,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === "test" || req.method === "OPTIONS"
};


// Límite general de la API por IP.
// ¿Por qué general? 
//      Es la primera barrera contra spam/DoS simple sobre cualquier ruta de /api/.
//      Las lecturas (GET) son baratas, por eso el tope es holgado.

export const apiLimiter = rateLimit({
    ...base,
    limit: LIMITE_API,
    handler: crearHandler(
        "Demasiadas solicitudes a la API desde la misma IP.",
        `Superaste las ${LIMITE_API} peticiones permitidas por ventana. Espera unos segundos e inténtalo de nuevo.`
    )
});


// Límite más estricto solo para las operaciones que modifican datos (POST, PUT, DELETE).
// ¿Por qué aparte del general? 
//      Porque se aplica ADEMÁS del general, solo en las rutas que escriben, y así se puede ser permisivo leyendo y estricto escribiendo sin que un límite afecte al otro.
// ¿Por qué no solo POST como antes? 
//      Porque PUT y DELETE también modifican/borran datos y quedaban sin protección extra (se podían borrar todos los libros a ritmo de 100/min). Se usa en las rutas: router.post("/", escrituraLimiter, ...)

export const escrituraLimiter = rateLimit({
    ...base,
    limit: LIMITE_ESCRITURA,
    handler: crearHandler(
        "Límite de escritura alcanzado.",
        `Solo puedes crear, actualizar o eliminar libros ${LIMITE_ESCRITURA} veces por ventana de tiempo.`
    )
});


// Se deja el nombre anterior como alias para no romper imports viejos que usen crearJuegoLimiter.

export const crearJuegoLimiter = escrituraLimiter;
