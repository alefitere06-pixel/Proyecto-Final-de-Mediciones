const RECURSOS = __RECURSOS__;
const TIPOS = __TIPOS__;

const CABECERAS_JSON = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

function respuestaJson(datos, estado = 200) {
  return new Response(JSON.stringify(datos), { status: estado, headers: CABECERAS_JSON });
}

function decodificar(base64) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function correoNormalizado(valor) {
  return String(valor || "").trim().toLowerCase();
}

function correoValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) && valor.length <= 190;
}

function correosTerminal(env) {
  return new Set(String(env.TERMINAL_ALLOWED_EMAILS || "")
    .split(",").map((item) => correoNormalizado(item)).filter(Boolean));
}

async function leerJson(request) {
  try { return await request.json(); }
  catch (_) { return null; }
}

async function hashHex(valor) {
  const bytes = new TextEncoder().encode(valor);
  const resumen = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(resumen), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function codigoSeisDigitos() {
  const valores = new Uint32Array(1);
  crypto.getRandomValues(valores);
  return String(valores[0] % 1000000).padStart(6, "0");
}

function tokenSeguro() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function asegurarEsquema(env) {
  if (!env.DB) throw new Error("DB_UNAVAILABLE");
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      purpose TEXT NOT NULL,
      requested_name TEXT NOT NULL DEFAULT '',
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      consumed_at TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS customer_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      container_number TEXT NOT NULL,
      reference TEXT NOT NULL,
      operation TEXT NOT NULL,
      preferred_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendiente de validación',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_otp_email_created ON otp_codes(email, created_at)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_customer_requests_user_created ON customer_requests(user_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_customer_requests_container ON customer_requests(container_number)"),
  ]);
}

async function limpiarExpirados(env) {
  const ahora = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM otp_codes WHERE expires_at < ? OR consumed_at IS NOT NULL").bind(ahora),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(ahora),
  ]);
}

function nombreSesion(request) {
  const codificado = request.headers.get("oai-authenticated-user-full-name") || "";
  const encoding = request.headers.get("oai-authenticated-user-full-name-encoding") || "";
  if (!codificado || encoding !== "percent-encoded-utf-8") return "";
  try { return decodeURIComponent(codificado); }
  catch (_) { return ""; }
}

async function enviarCodigo(env, correo, codigo, rol) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) throw new Error("EMAIL_UNAVAILABLE");
  const destino = rol === "terminal" ? "Terminal User" : "Customer User";
  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: "Bearer " + env.RESEND_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [correo],
      subject: "Tu código de acceso a GateFlow",
      text: "Tu código de acceso a " + destino + " es " + codigo + ". Vence en 10 minutos. Si no solicitaste este acceso, ignora este mensaje.",
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#082c3b">
        <div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#c8172c">GATEFLOW · ACCESO SEGURO</div>
        <h1 style="margin:14px 0 8px;font-size:25px">Código de acceso</h1>
        <p style="line-height:1.6;color:#465b64">Utiliza este código para entrar a <strong>${destino}</strong>.</p>
        <div style="margin:22px 0;padding:18px;border-radius:12px;background:#082c3b;color:white;text-align:center;font-size:32px;font-weight:800;letter-spacing:.22em">${codigo}</div>
        <p style="font-size:13px;color:#60747c">Vence en 10 minutos y solo puede utilizarse una vez.</p>
      </div>`,
    }),
  });
  if (!respuesta.ok) throw new Error("EMAIL_REJECTED");
}

async function solicitarCodigo(request, env) {
  const datos = await leerJson(request);
  if (!datos) return respuestaJson({ ok: false, message: "Solicitud inválida." }, 400);

  const correo = correoNormalizado(datos.email);
  const rol = datos.role === "terminal" ? "terminal" : "cliente";
  const proposito = datos.purpose === "register" ? "register" : "login";
  const nombreSolicitado = String(datos.name || "").trim().slice(0, 100);
  if (!correoValido(correo)) return respuestaJson({ ok: false, message: "Escribe un correo válido." }, 400);
  if (proposito === "register" && rol !== "cliente") return respuestaJson({ ok: false, message: "Los usuarios del terminal requieren autorización administrativa." }, 403);
  if (proposito === "register" && nombreSolicitado.length < 3) return respuestaJson({ ok: false, message: "Escribe el nombre completo." }, 400);

  await asegurarEsquema(env);
  await limpiarExpirados(env);
  const usuario = await env.DB.prepare("SELECT id, name, email, role, status FROM users WHERE email = ? LIMIT 1").bind(correo).first();
  const autorizadoTerminal = rol === "terminal" && correosTerminal(env).has(correo);

  if (rol === "terminal" && !autorizadoTerminal && (!usuario || usuario.role !== "terminal" || usuario.status !== "active")) {
    return respuestaJson({ ok: false, message: "Este correo todavía no está autorizado para Terminal User." }, 403);
  }
  if (proposito === "register" && usuario) return respuestaJson({ ok: false, message: "Ya existe un usuario con este correo. Utiliza Iniciar sesión." }, 409);
  if (proposito === "login" && rol === "cliente" && (!usuario || usuario.role !== "cliente" || usuario.status !== "active")) {
    return respuestaJson({ ok: false, message: "No existe una cuenta Customer User con este correo." }, 404);
  }

  const ultimo = await env.DB.prepare("SELECT created_at FROM otp_codes WHERE email = ? AND role = ? ORDER BY created_at DESC LIMIT 1").bind(correo, rol).first();
  if (ultimo && Date.now() - Date.parse(ultimo.created_at) < 45000) {
    return respuestaJson({ ok: false, message: "Espera 45 segundos antes de solicitar otro código." }, 429);
  }

  const codigo = codigoSeisDigitos();
  const id = crypto.randomUUID();
  const creado = new Date().toISOString();
  const vence = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const hash = await hashHex(String(env.OTP_PEPPER || "") + ":" + correo + ":" + rol + ":" + proposito + ":" + codigo);
  const nombre = nombreSolicitado || nombreSesion(request) || correo.split("@")[0];

  await env.DB.prepare(`INSERT INTO otp_codes
    (id, email, role, purpose, requested_name, code_hash, expires_at, attempts, consumed_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)`)
    .bind(id, correo, rol, proposito, nombre, hash, vence, creado).run();

  try {
    await enviarCodigo(env, correo, codigo, rol);
  } catch (_) {
    await env.DB.prepare("DELETE FROM otp_codes WHERE id = ?").bind(id).run();
    return respuestaJson({
      ok: false,
      message: "No fue posible enviar el código. Mientras GateFlow usa el remitente de prueba, solo el correo propietario de Resend puede recibirlo.",
    }, 502);
  }

  return respuestaJson({ ok: true, message: "Código enviado. Revisa tu correo; vence en 10 minutos." });
}

async function verificarCodigo(request, env) {
  const datos = await leerJson(request);
  if (!datos) return respuestaJson({ ok: false, message: "Solicitud inválida." }, 400);
  const correo = correoNormalizado(datos.email);
  const rol = datos.role === "terminal" ? "terminal" : "cliente";
  const proposito = datos.purpose === "register" ? "register" : "login";
  const codigo = String(datos.code || "").replace(/\D/g, "").slice(0, 6);
  if (!correoValido(correo) || codigo.length !== 6) return respuestaJson({ ok: false, message: "Escribe el código de seis dígitos." }, 400);

  await asegurarEsquema(env);
  const registro = await env.DB.prepare(`SELECT id, requested_name, code_hash, expires_at, attempts
    FROM otp_codes WHERE email = ? AND role = ? AND purpose = ? AND consumed_at IS NULL
    ORDER BY created_at DESC LIMIT 1`).bind(correo, rol, proposito).first();
  if (!registro) return respuestaJson({ ok: false, message: "Solicita un código nuevo." }, 404);
  if (Date.parse(registro.expires_at) < Date.now()) return respuestaJson({ ok: false, message: "El código venció. Solicita uno nuevo." }, 410);
  if (Number(registro.attempts) >= 5) return respuestaJson({ ok: false, message: "Superaste el número de intentos. Solicita otro código." }, 429);

  const esperado = await hashHex(String(env.OTP_PEPPER || "") + ":" + correo + ":" + rol + ":" + proposito + ":" + codigo);
  if (esperado !== registro.code_hash) {
    await env.DB.prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?").bind(registro.id).run();
    return respuestaJson({ ok: false, message: "El código no es correcto." }, 401);
  }

  await env.DB.prepare("UPDATE otp_codes SET consumed_at = ? WHERE id = ?").bind(new Date().toISOString(), registro.id).run();
  let usuario = await env.DB.prepare("SELECT id, name, email, role, status FROM users WHERE email = ? LIMIT 1").bind(correo).first();

  if (!usuario) {
    if (rol === "terminal" && !correosTerminal(env).has(correo)) return respuestaJson({ ok: false, message: "Este correo no está autorizado para Terminal User." }, 403);
    if (rol === "cliente" && proposito !== "register") return respuestaJson({ ok: false, message: "Primero debes crear tu usuario." }, 404);
    const idUsuario = "GFU-" + crypto.randomUUID();
    const creado = new Date().toISOString();
    await env.DB.prepare("INSERT INTO users (id, name, email, role, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)")
      .bind(idUsuario, registro.requested_name || correo.split("@")[0], correo, rol, creado).run();
    usuario = { id: idUsuario, name: registro.requested_name || correo.split("@")[0], email: correo, role: rol, status: "active" };
  }

  if (usuario.role !== rol || usuario.status !== "active") return respuestaJson({ ok: false, message: "La cuenta no tiene permiso para esta sección." }, 403);
  const token = tokenSeguro();
  const tokenHash = await hashHex(String(env.OTP_PEPPER || "") + ":session:" + token);
  const creado = new Date().toISOString();
  const vence = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), usuario.id, tokenHash, vence, creado).run();

  return respuestaJson({
    ok: true,
    token,
    expiresAt: vence,
    user: { id: usuario.id, name: usuario.name, email: usuario.email, role: usuario.role },
  });
}

function tokenAutorizacion(request) {
  const cabecera = request.headers.get("authorization") || "";
  return cabecera.startsWith("Bearer ") ? cabecera.slice(7).trim() : "";
}

async function obtenerSesion(request, env) {
  const token = tokenAutorizacion(request);
  if (!token) return null;
  await asegurarEsquema(env);
  const tokenHash = await hashHex(String(env.OTP_PEPPER || "") + ":session:" + token);
  return env.DB.prepare(`SELECT u.id, u.name, u.email, u.role, u.status, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? LIMIT 1`)
    .bind(tokenHash, new Date().toISOString()).first();
}

async function cerrarSesionApi(request, env) {
  const token = tokenAutorizacion(request);
  if (token && env.DB) {
    const tokenHash = await hashHex(String(env.OTP_PEPPER || "") + ":session:" + token);
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  }
  return respuestaJson({ ok: true });
}

async function terminalSesionPlataforma(request, env) {
  const email = correoNormalizado(request.headers.get("oai-authenticated-user-email"));
  const userId = String(request.headers.get("oai-authenticated-user-id") || "").trim();
  const name = nombreSesion(request);
  const authenticated = Boolean(email && userId);
  const authorized = authenticated && correosTerminal(env).has(email);
  return respuestaJson({
    authenticated,
    authorized,
    email: authenticated ? email : "",
    id: authorized ? userId : "",
    name: authorized ? name : "",
  }, authenticated ? (authorized ? 200 : 403) : 401);
}

function textoSeguro(valor, maximo) {
  return String(valor || "").trim().slice(0, maximo);
}

function contenedorValido(valor) {
  return /^[A-Z]{4}[0-9]{7}$/.test(valor);
}

async function listarSolicitudesCliente(request, env) {
  const sesion = await obtenerSesion(request, env);
  if (!sesion || sesion.status !== "active" || sesion.role !== "cliente") {
    return respuestaJson({ ok: false, message: "Inicia sesión como Customer User." }, 401);
  }
  const resultado = await env.DB.prepare(`SELECT id, container_number, reference, operation,
      preferred_date, time_slot, status, created_at, updated_at
    FROM customer_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`)
    .bind(sesion.id).all();
  return respuestaJson({ ok: true, requests: resultado.results || [] });
}

async function crearSolicitudCliente(request, env) {
  const sesion = await obtenerSesion(request, env);
  if (!sesion || sesion.status !== "active" || sesion.role !== "cliente") {
    return respuestaJson({ ok: false, message: "Inicia sesión como Customer User." }, 401);
  }
  const datos = await leerJson(request);
  if (!datos) return respuestaJson({ ok: false, message: "Solicitud inválida." }, 400);

  const contenedor = textoSeguro(datos.container, 14).toUpperCase().replace(/\s/g, "");
  const referencia = textoSeguro(datos.reference, 24).toUpperCase();
  const operacion = textoSeguro(datos.operation, 40);
  const fecha = textoSeguro(datos.preferredDate, 10);
  const franja = textoSeguro(datos.timeSlot, 20);
  const operaciones = new Set(["Retiro de importación", "Entrega de exportación", "Vacío / devolución", "Doble transacción"]);
  const franjas = new Set(["06:00–08:00", "08:00–10:00", "10:00–12:00", "13:00–15:00", "15:00–17:00", "17:00–19:00"]);
  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !Number.isNaN(Date.parse(`${fecha}T00:00:00Z`));

  if (!contenedorValido(contenedor)) return respuestaJson({ ok: false, message: "El contenedor debe tener cuatro letras y siete números." }, 400);
  if (referencia.length < 3) return respuestaJson({ ok: false, message: "Escribe un booking o referencia válido." }, 400);
  if (!operaciones.has(operacion) || !franjas.has(franja) || !fechaValida) return respuestaJson({ ok: false, message: "Revisa la operación, fecha y franja seleccionadas." }, 400);

  const ahora = new Date().toISOString();
  const id = `GFR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  await env.DB.prepare(`INSERT INTO customer_requests
    (id, user_id, container_number, reference, operation, preferred_date, time_slot, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente de validación', ?, ?)`)
    .bind(id, sesion.id, contenedor, referencia, operacion, fecha, franja, ahora, ahora).run();
  return respuestaJson({ ok: true, message: "Solicitud registrada y guardada en GateFlow.", id }, 201);
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    let ruta = decodeURIComponent(url.pathname);

    try {
      if (ruta === "/api/maps-config") {
        const apiKey = env.GOOGLE_MAPS_API_KEY || "";
        const mapId = env.GOOGLE_MAP_ID || "";
        return respuestaJson({ enabled: Boolean(apiKey && mapId), apiKey, mapId });
      }
      if (ruta === "/api/terminal-session") return terminalSesionPlataforma(request, env);
      if (ruta === "/api/auth/request-code" && request.method === "POST") return solicitarCodigo(request, env);
      if (ruta === "/api/auth/verify-code" && request.method === "POST") return verificarCodigo(request, env);
      if (ruta === "/api/auth/session" && request.method === "GET") {
        const sesion = await obtenerSesion(request, env);
        if (!sesion || sesion.status !== "active") return respuestaJson({ authenticated: false }, 401);
        return respuestaJson({ authenticated: true, user: { id: sesion.id, name: sesion.name, email: sesion.email, role: sesion.role } });
      }
      if (ruta === "/api/auth/logout" && request.method === "POST") return cerrarSesionApi(request, env);
      if (ruta === "/api/customer/requests" && request.method === "GET") return listarSolicitudesCliente(request, env);
      if (ruta === "/api/customer/requests" && request.method === "POST") return crearSolicitudCliente(request, env);
    } catch (error) {
      const sinBase = error && error.message === "DB_UNAVAILABLE";
      return respuestaJson({ ok: false, message: sinBase ? "El registro todavía se está habilitando. Intenta nuevamente en unos minutos." : "No fue posible completar la operación." }, 503);
    }

    if (ruta === "/" || ruta.endsWith("/")) ruta += "index.html";
    const recurso = RECURSOS[ruta];
    if (!recurso) return new Response("Página no encontrada", { status: 404 });
    const punto = ruta.lastIndexOf(".");
    const extension = punto >= 0 ? ruta.slice(punto).toLowerCase() : "";
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
