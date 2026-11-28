// Empaqueta el sitio HTML/CSS/JS como un Worker estático para su publicación.
// La lógica de API vive en worker-runtime.js y los secretos solo se inyectan
// desde el entorno de Sites.
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
const salida = path.join(raiz, "dist", "server", "index.js");
const runtime = path.join(__dirname, "worker-runtime.js");
const archivos = ["index.html", "data/llegadas.js", "data/patio_aliado.js"];

function agregarDirectorio(directorio) {
  const absoluto = path.join(raiz, directorio);
  for (const entrada of fs.readdirSync(absoluto, { withFileTypes: true })) {
    const relativo = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) agregarDirectorio(relativo);
    else archivos.push(relativo);
  }
}

["css", "js", "img"].forEach(agregarDirectorio);

const recursos = {};
for (const archivo of archivos.sort()) {
  const rutaWeb = "/" + archivo.split(path.sep).join("/");
  recursos[rutaWeb] = fs.readFileSync(path.join(raiz, archivo)).toString("base64");
}

const tipos = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const plantilla = fs.readFileSync(runtime, "utf8");
const codigo = plantilla
  .replace("__RECURSOS__", JSON.stringify(recursos))
  .replace("__TIPOS__", JSON.stringify(tipos));

fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, codigo, "utf8");
console.log(`Worker creado: ${archivos.length} recursos, ${fs.statSync(salida).size} bytes`);
