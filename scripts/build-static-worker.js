// Empaqueta el sitio HTML/CSS/JS como un Worker estático para su publicación.
// No requiere dependencias externas: todos los recursos quedan incluidos.
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
const salida = path.join(raiz, "dist", "server", "index.js");
const archivos = ["index.html", "data/llegadas.js"];

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

const codigo = `const RECURSOS = ${JSON.stringify(recursos)};
const TIPOS = ${JSON.stringify(tipos)};

function decodificar(base64) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let ruta = decodeURIComponent(url.pathname);
    if (ruta === "/" || ruta.endsWith("/")) ruta += "index.html";
    const recurso = RECURSOS[ruta];
    if (!recurso) return new Response("Página no encontrada", { status: 404 });

    const punto = ruta.lastIndexOf(".");
    const extension = punto >= 0 ? ruta.slice(punto).toLowerCase() : "";
    const html = extension === ".html";
    return new Response(decodificar(recurso), {
      headers: {
        "content-type": TIPOS[extension] || "application/octet-stream",
        "cache-control": html ? "no-cache" : "public, max-age=604800, immutable",
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin",
      },
    });
  },
};
`;

fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, codigo, "utf8");
console.log(`Worker creado: ${archivos.length} recursos, ${fs.statSync(salida).size} bytes`);
