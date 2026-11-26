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
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    let ruta = decodeURIComponent(url.pathname);

    if (ruta === "/api/maps-config") {
      const apiKey = env.GOOGLE_MAPS_API_KEY || "";
      const mapId = env.GOOGLE_MAP_ID || "";
      return new Response(JSON.stringify({
        enabled: Boolean(apiKey && mapId),
        apiKey,
        mapId,
      }), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store, max-age=0",
          "x-content-type-options": "nosniff",
          "referrer-policy": "strict-origin-when-cross-origin",
        },
      });
    }

    if (ruta === "/api/terminal-session") {
      const email = (request.headers.get("oai-authenticated-user-email") || "").trim().toLowerCase();
      const userId = (request.headers.get("oai-authenticated-user-id") || "").trim();
      const nombreCodificado = request.headers.get("oai-authenticated-user-full-name") || "";
      const nombreEncoding = request.headers.get("oai-authenticated-user-full-name-encoding") || "";
      let name = "";
      if (nombreCodificado && nombreEncoding === "percent-encoded-utf-8") {
        try { name = decodeURIComponent(nombreCodificado); } catch (_) { name = ""; }
      }
      const autorizados = new Set(String(env.TERMINAL_ALLOWED_EMAILS || "")
        .split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
      const authenticated = Boolean(email && userId);
      const authorized = authenticated && autorizados.has(email);
      return new Response(JSON.stringify({
        authenticated,
        authorized,
        email: authenticated ? email : "",
        id: authorized ? userId : "",
        name: authorized ? name : "",
      }), {
        status: authenticated ? (authorized ? 200 : 403) : 401,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store, max-age=0",
          "x-content-type-options": "nosniff",
          "referrer-policy": "no-referrer",
        },
      });
    }

    if (ruta === "/" || ruta.endsWith("/")) ruta += "index.html";
    const recurso = RECURSOS[ruta];
    if (!recurso) return new Response("Página no encontrada", { status: 404 });

    const punto = ruta.lastIndexOf(".");
    const extension = punto >= 0 ? ruta.slice(punto).toLowerCase() : "";
    const html = extension === ".html";
    return new Response(decodificar(recurso), {
      headers: {
        "content-type": TIPOS[extension] || "application/octet-stream",
        "cache-control": "no-cache",
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
