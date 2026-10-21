// Pruebas de la API de libros (se corren con: npm test)
// Uso solo módulos de Node (assert y fetch) para no instalar nada más

import assert from "node:assert/strict";
import { spawn } from "node:child_process";

// Pongo NODE_ENV=test antes de importar la app para que no levante el puerto 3000
// y para que el rate limit no bloquee las pruebas normales

process.env.NODE_ENV = "test";

const { default: app } = await import("../src/app.js");
const { reiniciarLibros } = await import("../src/data/libros.db.js");

const servidor = app.listen(0);
const base = `http://localhost:${servidor.address().port}`;

const libroValido = { titulo: "Nuevo libro", autor: "Autor Uno", genero: "Novela", anio: 2000, precio: 10 };

// Función corta para hacer peticiones con JSON

const pedir = async (ruta, metodo = "GET", body) => {
    const res = await fetch(base + ruta, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body)
    });
    return { status: res.status, json: await res.json(), headers: res.headers };
};

let pasaron = 0;

const prueba = async (nombre, fn) => {
    reiniciarLibros();
    await fn();
    pasaron++;
    console.log(`  ok - ${nombre}`);
};

console.log("Pruebas del CRUD");

await prueba("GET /api/libros lista los libros", async () => {
    const { status, json } = await pedir("/api/libros");
    assert.equal(status, 200);
    assert.equal(json.total, 4);
});

await prueba("GET /api/libros/:id devuelve un libro", async () => {
    const { status, json } = await pedir("/api/libros/2");
    assert.equal(status, 200);
    assert.equal(json.libro.titulo, "El Principito");
});

await prueba("GET con id inválido responde 400", async () => {
    assert.equal((await pedir("/api/libros/abc")).status, 400);
    assert.equal((await pedir("/api/libros/3abc")).status, 400);
});

await prueba("GET con id que no existe responde 404", async () => {
    assert.equal((await pedir("/api/libros/999")).status, 404);
});

await prueba("POST crea un libro y manda Location", async () => {
    const { status, json, headers } = await pedir("/api/libros", "POST", libroValido);
    assert.equal(status, 201);
    assert.equal(json.libro.id, 5);
    assert.equal(headers.get("location"), "/api/libros/5");
});

await prueba("POST repetido responde 409", async () => {
    await pedir("/api/libros", "POST", libroValido);
    assert.equal((await pedir("/api/libros", "POST", libroValido)).status, 409);
});

await prueba("POST con datos malos responde 400", async () => {
    assert.equal((await pedir("/api/libros", "POST", { titulo: "Solo titulo" })).status, 400);
    assert.equal((await pedir("/api/libros", "POST", { ...libroValido, precio: null })).status, 400);
    assert.equal((await pedir("/api/libros", "POST", { ...libroValido, anio: 3000 })).status, 400);
});

await prueba("POST con JSON roto responde 400", async () => {
    assert.equal((await pedir("/api/libros", "POST", "{mal")).status, 400);
});

await prueba("PUT actualiza y no deja cambiar el id", async () => {
    const { status, json } = await pedir("/api/libros/1", "PUT", { ...libroValido, id: 99 });
    assert.equal(status, 200);
    assert.equal(json.libro.id, 1);
    assert.equal(json.libro.titulo, "Nuevo libro");
});

await prueba("DELETE elimina un libro", async () => {
    assert.equal((await pedir("/api/libros/4", "DELETE")).status, 200);
    assert.equal((await pedir("/api/libros/4")).status, 404);
});

await prueba("ruta que no existe responde 404", async () => {
    assert.equal((await pedir("/api/otra-cosa")).status, 404);
});

await prueba("la página /tienda y sus archivos se sirven", async () => {
    for (const archivo of ["/tienda/", "/tienda/estilos.css", "/tienda/app.js"]) {
        assert.equal((await fetch(base + archivo)).status, 200, archivo);
    }
});

servidor.close();


// Prueba del rate limit
// En test el límite está apagado, así que levanto el servidor real aparte con un límite de 3 escrituras

console.log("Prueba del rate limit");

const puerto = 3997;
const env = { ...process.env, PORT: String(puerto), RATE_LIMIT_WRITE: "3" };
delete env.NODE_ENV;

const hijo = spawn(process.execPath, ["src/app.js"], { env, stdio: ["ignore", "pipe", "inherit"] });

try {
    // Espero a que el servidor diga que ya arrancó
    await new Promise((resolve, reject) => {
        hijo.on("error", reject);
        hijo.stdout.on("data", (d) => String(d).includes("iniciado") && resolve());
        setTimeout(() => reject(new Error("El servidor no arrancó")), 5000);
    });

    // Mando POST con títulos distintos para que no den 409 por repetidos
    const codigos = [];
    for (let i = 0; i < 4; i++) {
        const res = await fetch(`http://localhost:${puerto}/api/libros`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...libroValido, titulo: `Libro ${i}` })
        });
        codigos.push(res.status);
        if (res.status === 429) {
            const json = await res.json();
            assert.ok(json.reintentar_en_segundos >= 1);
        }
    }

    // Los 3 primeros se crean y el cuarto ya lo frena el limitador
    assert.deepEqual(codigos, [201, 201, 201, 429]);

    // Las lecturas no se ven afectadas por el límite de escrituras
    assert.equal((await fetch(`http://localhost:${puerto}/api/libros`)).status, 200);

    pasaron++;
    console.log("  ok - la 4ta escritura responde 429");
} finally {
    hijo.kill();
}

console.log(`\n${pasaron} pruebas pasaron`);
