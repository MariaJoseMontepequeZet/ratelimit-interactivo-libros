// Script de "npm run dev": levanta el servidor con --watch y abre la interfaz en el navegador

import { spawn } from "node:child_process";

const PORT = process.env.PORT || 3000;
const URL_TIENDA = `http://localhost:${PORT}/tienda/`;


// Arranco el servidor con --watch para que se reinicie al guardar cambios
// Lo hago desde aquí y no con la opción de app.js porque así el navegador se abre una sola vez
// (si se abriera dentro de app.js, se abriría de nuevo en cada reinicio)

const servidor = spawn(process.execPath, ["--watch", "src/app.js"], { stdio: "inherit" });

servidor.on("exit", (codigo) => process.exit(codigo ?? 0));

for (const senal of ["SIGINT", "SIGTERM"]) {
    process.on(senal, () => servidor.kill());
}


// Abre la URL con el comando de cada sistema operativo

function abrirNavegador(url) {
    if (process.platform === "win32") {
        spawn("cmd", ["/c", "start", "", url], { stdio: "ignore" }).unref();
    } else if (process.platform === "darwin") {
        spawn("open", [url], { stdio: "ignore" }).unref();
    } else {
        spawn("xdg-open", [url], { stdio: "ignore" }).unref();
    }
}


// Espero a que el servidor responda antes de abrir, si no el navegador mostraría error
// Pruebo cada medio segundo, máximo 10 segundos

for (let intento = 0; intento < 20; intento++) {
    try {
        await fetch(URL_TIENDA);
        abrirNavegador(URL_TIENDA);
        break;
    } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
}
