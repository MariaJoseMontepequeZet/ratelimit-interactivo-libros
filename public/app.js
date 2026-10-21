// Lógica de la página de la tienda (habla con la API en /api/libros)

const API = "/api/libros";

const tabla = document.getElementById("tabla");
const total = document.getElementById("total");
const form = document.getElementById("form-libro");
const mensaje = document.getElementById("mensaje");
const aviso = document.getElementById("aviso");
const medidorTexto = document.getElementById("medidor-texto");
const medidorBarra = document.getElementById("medidor-barra");
const btnGuardar = document.getElementById("btn-guardar");
const btnCancelar = document.getElementById("btn-cancelar");

let temporizador = null;


// Lee el header RateLimit (ej: "limit=120, remaining=119, reset=60") y actualiza el medidor
// Este header sale en cada respuesta, por eso se llama desde pedir()

function actualizarMedidor(headers) {
    const valor = headers.get("RateLimit");
    if (!valor) return;

    const datos = Object.fromEntries(valor.split(",").map((parte) => parte.trim().split("=")));
    const limite = Number(datos.limit);
    const restantes = Number(datos.remaining);
    const porcentaje = (restantes / limite) * 100;

    medidorTexto.textContent = `Peticiones restantes: ${restantes} / ${limite} (se reinicia en ${datos.reset}s)`;
    medidorBarra.style.width = `${porcentaje}%`;
    medidorBarra.className = porcentaje < 20 ? "bajo" : porcentaje < 50 ? "medio" : "";
}


// Cuando llega un 429 muestro el aviso con cuenta regresiva y bloqueo los botones

function mostrarLimite(segundos) {
    clearInterval(temporizador);
    document.querySelectorAll("button").forEach((b) => (b.disabled = true));

    const tick = () => {
        if (segundos <= 0) {
            clearInterval(temporizador);
            aviso.classList.add("oculto");
            document.querySelectorAll("button").forEach((b) => (b.disabled = false));
            return;
        }
        aviso.textContent = `Demasiadas peticiones. Puedes intentar de nuevo en ${segundos}s`;
        aviso.classList.remove("oculto");
        segundos--;
    };

    tick();
    temporizador = setInterval(tick, 1000);
}


// Función para hacer todas las peticiones y manejar el 429 en un solo lugar
// Devuelve { ok, datos }, nunca lanza error para que las funciones de abajo sean simples

async function pedir(ruta, opciones = {}) {
    try {
        const res = await fetch(API + ruta, {
            headers: { "Content-Type": "application/json" },
            ...opciones
        });
        actualizarMedidor(res.headers);

        const datos = await res.json();

        if (res.status === 429) {
            mostrarLimite(datos.reintentar_en_segundos || 60);
        }

        return { ok: res.ok, datos };
    } catch {
        return { ok: false, datos: { error: "No se pudo conectar con el servidor." } };
    }
}


function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo}`;
}


// Dibuja la tabla
// Uso textContent y no innerHTML para que un título con código raro no se ejecute en la página

function dibujarTabla(libros) {
    tabla.replaceChildren();
    total.textContent = libros.length;

    for (const libro of libros) {
        const fila = document.createElement("tr");

        for (const campo of [libro.id, libro.titulo, libro.autor, libro.genero, libro.anio, `$${libro.precio.toFixed(2)}`]) {
            const celda = document.createElement("td");
            celda.textContent = campo;
            fila.appendChild(celda);
        }

        const acciones = document.createElement("td");
        acciones.className = "acciones";

        const btnEditar = document.createElement("button");
        btnEditar.textContent = "Editar";
        btnEditar.className = "secundario";
        btnEditar.addEventListener("click", () => editar(libro));

        const btnEliminar = document.createElement("button");
        btnEliminar.textContent = "Eliminar";
        btnEliminar.className = "peligro";
        btnEliminar.addEventListener("click", () => eliminar(libro));

        acciones.append(btnEditar, btnEliminar);
        fila.appendChild(acciones);
        tabla.appendChild(fila);
    }
}


async function cargarLibros() {
    const { ok, datos } = await pedir("");
    if (ok) {
        dibujarTabla(datos.datos);
    } else {
        mostrarMensaje(datos.error || "No se pudo cargar el catálogo.", "error");
    }
}


// Pasa los datos del libro al formulario para editarlo

function editar(libro) {
    document.getElementById("libro-id").value = libro.id;
    document.getElementById("titulo").value = libro.titulo;
    document.getElementById("autor").value = libro.autor;
    document.getElementById("genero").value = libro.genero;
    document.getElementById("anio").value = libro.anio;
    document.getElementById("precio").value = libro.precio;

    document.getElementById("form-titulo").textContent = `Editar libro #${libro.id}`;
    btnCancelar.classList.remove("oculto");
    mostrarMensaje("", "");
}


function limpiarFormulario() {
    form.reset();
    document.getElementById("libro-id").value = "";
    document.getElementById("form-titulo").textContent = "Agregar libro";
    btnCancelar.classList.add("oculto");
}


async function eliminar(libro) {
    if (!confirm(`¿Eliminar "${libro.titulo}"?`)) return;

    const { ok, datos } = await pedir(`/${libro.id}`, { method: "DELETE" });

    if (ok) {
        mostrarMensaje(datos.mensaje, "ok");
        cargarLibros();
    } else {
        mostrarMensaje(datos.error, "error");
    }
}


// Si hay id en el formulario es PUT (editar), si no es POST (crear)

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("libro-id").value;
    const libro = {
        titulo: document.getElementById("titulo").value,
        autor: document.getElementById("autor").value,
        genero: document.getElementById("genero").value,
        anio: document.getElementById("anio").value,
        precio: document.getElementById("precio").value
    };

    btnGuardar.disabled = true;
    const { ok, datos } = await pedir(id ? `/${id}` : "", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(libro)
    });
    btnGuardar.disabled = false;

    if (ok) {
        mostrarMensaje(datos.mensaje, "ok");
        limpiarFormulario();
        cargarLibros();
    } else {
        mostrarMensaje(datos.error, "error");
    }
});

btnCancelar.addEventListener("click", limpiarFormulario);
document.getElementById("btn-recargar").addEventListener("click", cargarLibros);

cargarLibros();
