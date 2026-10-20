# API de Libros con Rate Limit

API REST hecha con Express para practicar `express-rate-limit`. Los libros se guardan en un arreglo en memoria, así que se reinician al apagar el servidor.

## Instalación

```bash
npm install
npm start
```

El servidor queda en `http://localhost:3000`. Para desarrollo con recarga automática se usa `npm run dev`.

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/` | Información de la API |
| GET | `/api/libros` | Listar libros |
| GET | `/api/libros/:id` | Buscar un libro |
| POST | `/api/libros` | Crear un libro |
| PUT | `/api/libros/:id` | Reemplazar un libro |
| DELETE | `/api/libros/:id` | Eliminar un libro |

Ejemplo de body para POST y PUT:

```json
{
  "titulo": "El Principito",
  "autor": "Antoine de Saint-Exupéry",
  "genero": "Fábula",
  "anio": 1943,
  "precio": 9.99
}
```

## Rate limit

- **General:** 100 peticiones por minuto por IP en todo `/api/`.
- **Escrituras:** 10 por minuto por IP en POST, PUT y DELETE.
- Si se pasan responde `429` con `reintentar_en_segundos`.
- Las respuestas traen los headers `RateLimit-*`.

Se puede cambiar con variables de entorno:

| Variable | Por defecto |
| --- | --- |
| `RATE_WINDOW_MS` | `60000` |
| `RATE_LIMIT_API` | `100` |
| `RATE_LIMIT_WRITE` | `10` |
| `PORT` | `3000` |

## Códigos de respuesta

- `200` / `201`: todo bien
- `400`: ID inválido, datos incorrectos o JSON mal escrito
- `404`: el libro o la ruta no existe
- `409`: el libro ya existe (mismo título y autor)
- `429`: demasiadas peticiones

## Pruebas

```bash
npm test
```

## Estructura

```
src/
  app.js                 servidor y middlewares globales
  routes/libros.routes.js  endpoints de libros
  data/libros.db.js        arreglo de libros en memoria
  middlewares/             logger, rateLimit, validator, errorHandler
test/test-api.js         pruebas
```
