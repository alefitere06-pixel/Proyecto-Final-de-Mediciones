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

function correosAdministradoresTerminal(env) {
  const configurados = String(env.TERMINAL_ADMIN_EMAILS || env.TERMINAL_ALLOWED_EMAILS || "");
  return new Set(configurados.split(",").map((item) => correoNormalizado(item)).filter(Boolean));
}

function esAdministradorTerminal(env, correo) {
  return correosAdministradoresTerminal(env).has(correoNormalizado(correo));
}

async function estaAutorizadoTerminal(env, correo) {
  const normalizado = correoNormalizado(correo);
  if (correosTerminal(env).has(normalizado)) return true;
  const autorizacion = await env.DB.prepare(
    "SELECT status FROM terminal_authorizations WHERE email = ? LIMIT 1",
  ).bind(normalizado).first();
  return autorizacion?.status === "active";
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

function bytesBase64(bytes) {
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario);
}

function base64Bytes(valor) {
  const binario = atob(valor);
  return Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));
}

function comparacionConstante(a, b) {
  const izquierda = String(a || "");
  const derecha = String(b || "");
  let diferencia = izquierda.length ^ derecha.length;
  const longitud = Math.max(izquierda.length, derecha.length);
  for (let i = 0; i < longitud; i += 1) diferencia |= (izquierda.charCodeAt(i) || 0) ^ (derecha.charCodeAt(i) || 0);
  return diferencia === 0;
}

async function hashClaveCliente(env, clave, saltBase64) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${String(env.OTP_PEPPER || "")}:${clave}`),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: base64Bytes(saltBase64),
    iterations: 120000,
  }, material, 256);
  return bytesBase64(new Uint8Array(bits));
}

function claveClienteValida(clave) {
  return typeof clave === "string" && clave.length >= 8 && clave.length <= 128
    && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(clave) && /[0-9]/.test(clave);
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
    db.prepare(`CREATE TABLE IF NOT EXISTS customer_cargo_links (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      container_number TEXT NOT NULL,
      booking_reference TEXT NOT NULL,
      document_type TEXT NOT NULL,
      document_reference TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      current_location TEXT NOT NULL DEFAULT 'Pendiente de validación con terminal',
      eta TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS customer_credentials (
      user_id TEXT PRIMARY KEY,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS cargo_events (
      id TEXT PRIMARY KEY,
      cargo_link_id TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'GateFlow',
      event_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS terminal_authorizations (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      authorized_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_otp_email_created ON otp_codes(email, created_at)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_customer_requests_user_created ON customer_requests(user_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_customer_requests_container ON customer_requests(container_number)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_customer_cargo_user_created ON customer_cargo_links(user_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_customer_cargo_container_status ON customer_cargo_links(container_number, status)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_cargo_owner_booking ON customer_cargo_links(user_id, container_number, booking_reference)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_cargo_events_link_event ON cargo_events(cargo_link_id, event_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_terminal_authorizations_status_updated ON terminal_authorizations(status, updated_at)"),
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
  const autorizadoTerminal = rol === "terminal" && await estaAutorizadoTerminal(env, correo);

  if (rol === "terminal" && !autorizadoTerminal) {
    return respuestaJson({ ok: false, message: "Este correo requiere aprobación previa de un administrador de la terminal." }, 403);
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
  if (rol === "terminal" && !(await estaAutorizadoTerminal(env, correo))) {
    return respuestaJson({ ok: false, message: "La autorización de este correo no está activa." }, 403);
  }
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
    if (rol === "terminal" && !(await estaAutorizadoTerminal(env, correo))) return respuestaJson({ ok: false, message: "Este correo no está autorizado para Terminal User." }, 403);
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
    user: {
      id: usuario.id,
      name: usuario.name,
      email: usuario.email,
      role: usuario.role,
      canManageUsers: usuario.role === "terminal" && esAdministradorTerminal(env, usuario.email),
    },
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

async function crearSesionRespuesta(env, usuario, estado = 200) {
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
    user: { id: usuario.id, name: usuario.name, email: usuario.email, role: usuario.role, canManageUsers: false },
  }, estado);
}

async function registrarClienteConClave(request, env) {
  const datos = await leerJson(request);
  if (!datos) return respuestaJson({ ok: false, message: "Solicitud inválida." }, 400);
  const nombre = textoSeguro(datos.name, 100);
  const correo = correoNormalizado(datos.email);
  const clave = String(datos.password || "");
  if (nombre.length < 3) return respuestaJson({ ok: false, message: "Escribe tu nombre completo." }, 400);
  if (!correoValido(correo)) return respuestaJson({ ok: false, message: "Escribe un correo válido." }, 400);
  if (!claveClienteValida(clave)) return respuestaJson({ ok: false, message: "La clave debe tener entre 8 y 128 caracteres, con al menos una letra y un número." }, 400);

  await asegurarEsquema(env);
  let usuario = await env.DB.prepare("SELECT id, name, email, role, status FROM users WHERE email = ? LIMIT 1").bind(correo).first();
  if (usuario && usuario.role !== "cliente") return respuestaJson({ ok: false, message: "Este correo está reservado para Terminal User." }, 409);
  if (usuario) {
    const credencial = await env.DB.prepare("SELECT user_id FROM customer_credentials WHERE user_id = ? LIMIT 1").bind(usuario.id).first();
    if (credencial) return respuestaJson({ ok: false, message: "Ya existe una cuenta con este correo. Utiliza Iniciar sesión." }, 409);
    return respuestaJson({ ok: false, message: "Este correo pertenece a una cuenta anterior creada por código. Para protegerla, utiliza otro correo o solicita su migración al administrador." }, 409);
  }

  const ahora = new Date().toISOString();
  const id = `GFU-${crypto.randomUUID()}`;
  await env.DB.prepare("INSERT INTO users (id, name, email, role, status, created_at) VALUES (?, ?, ?, 'cliente', 'active', ?)")
    .bind(id, nombre, correo, ahora).run();
  usuario = { id, name: nombre, email: correo, role: "cliente", status: "active" };

  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const saltBase64 = bytesBase64(salt);
  const claveHash = await hashClaveCliente(env, clave, saltBase64);
  await env.DB.prepare(`INSERT INTO customer_credentials
    (user_id, password_salt, password_hash, failed_attempts, locked_until, created_at, updated_at)
    VALUES (?, ?, ?, 0, NULL, ?, ?)`)
    .bind(usuario.id, saltBase64, claveHash, ahora, ahora).run();
  return crearSesionRespuesta(env, usuario, 201);
}

async function iniciarClienteConClave(request, env) {
  const datos = await leerJson(request);
  if (!datos) return respuestaJson({ ok: false, message: "Solicitud inválida." }, 400);
  const correo = correoNormalizado(datos.email);
  const clave = String(datos.password || "");
  if (!correoValido(correo) || !clave) return respuestaJson({ ok: false, message: "Escribe tu correo y clave." }, 400);
  await asegurarEsquema(env);
  const usuario = await env.DB.prepare(`SELECT u.id, u.name, u.email, u.role, u.status,
      c.password_salt, c.password_hash, c.failed_attempts, c.locked_until
    FROM users u JOIN customer_credentials c ON c.user_id = u.id
    WHERE u.email = ? AND u.role = 'cliente' LIMIT 1`).bind(correo).first();
  if (!usuario || usuario.status !== "active") return respuestaJson({ ok: false, message: "Correo o clave incorrectos." }, 401);
  if (usuario.locked_until && Date.parse(usuario.locked_until) > Date.now()) {
    return respuestaJson({ ok: false, message: "Acceso bloqueado temporalmente por varios intentos. Espera 15 minutos." }, 429);
  }

  const calculado = await hashClaveCliente(env, clave, usuario.password_salt);
  if (!comparacionConstante(calculado, usuario.password_hash)) {
    const intentos = Number(usuario.failed_attempts || 0) + 1;
    const bloquear = intentos >= 5;
    const bloqueo = bloquear ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    await env.DB.prepare("UPDATE customer_credentials SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE user_id = ?")
      .bind(bloquear ? 0 : intentos, bloqueo, new Date().toISOString(), usuario.id).run();
    return respuestaJson({ ok: false, message: bloquear ? "Acceso bloqueado durante 15 minutos por varios intentos." : "Correo o clave incorrectos." }, bloquear ? 429 : 401);
  }

  await env.DB.prepare("UPDATE customer_credentials SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE user_id = ?")
    .bind(new Date().toISOString(), usuario.id).run();
  return crearSesionRespuesta(env, usuario);
}

async function terminalSesionPlataforma(request, env) {
  const email = correoNormalizado(request.headers.get("oai-authenticated-user-email"));
  const userId = String(request.headers.get("oai-authenticated-user-id") || "").trim();
  const name = nombreSesion(request);
  const authenticated = Boolean(email && userId);
  await asegurarEsquema(env);
  const authorized = authenticated && await estaAutorizadoTerminal(env, email);
  return respuestaJson({
    authenticated,
    authorized,
    email: authenticated ? email : "",
    id: authorized ? userId : "",
    name: authorized ? name : "",
  }, authenticated ? (authorized ? 200 : 403) : 401);
}

async function requerirAdministradorTerminal(request, env) {
  const sesion = await obtenerSesion(request, env);
  if (!sesion || sesion.status !== "active" || sesion.role !== "terminal") return null;
  if (!(await estaAutorizadoTerminal(env, sesion.email))) return null;
  return esAdministradorTerminal(env, sesion.email) ? sesion : null;
}

async function listarAutorizacionesTerminal(request, env) {
  const administrador = await requerirAdministradorTerminal(request, env);
  if (!administrador) return respuestaJson({ ok: false, message: "Solo un administrador puede gestionar accesos del terminal." }, 403);

  const resultado = await env.DB.prepare(`SELECT a.email, a.name, a.status, a.authorized_by,
      a.created_at, a.updated_at, u.id AS user_id, u.status AS user_status
    FROM terminal_authorizations a
    LEFT JOIN users u ON u.email = a.email AND u.role = 'terminal'
    ORDER BY CASE a.status WHEN 'active' THEN 0 ELSE 1 END, a.updated_at DESC`).all();
  const autorizaciones = (resultado.results || []).map((item) => ({ ...item, configured: false }));
  const registrados = new Set(autorizaciones.map((item) => item.email));

  for (const email of correosTerminal(env)) {
    if (registrados.has(email)) continue;
    const usuario = await env.DB.prepare(
      "SELECT id, name, status FROM users WHERE email = ? AND role = 'terminal' LIMIT 1",
    ).bind(email).first();
    autorizaciones.unshift({
      email,
      name: usuario?.name || email.split("@")[0],
      status: "active",
      authorized_by: "Configuración maestra",
      created_at: "",
      updated_at: "",
      user_id: usuario?.id || null,
      user_status: usuario?.status || null,
      configured: true,
    });
  }

  return respuestaJson({ ok: true, authorizations: autorizaciones });
}

async function gestionarAutorizacionTerminal(request, env) {
  const administrador = await requerirAdministradorTerminal(request, env);
  if (!administrador) return respuestaJson({ ok: false, message: "Solo un administrador puede gestionar accesos del terminal." }, 403);

  const datos = await leerJson(request);
  if (!datos) return respuestaJson({ ok: false, message: "Solicitud inválida." }, 400);
  const correo = correoNormalizado(datos.email);
  const nombre = textoSeguro(datos.name, 100);
  const accion = datos.action === "revoke" ? "revoke" : "authorize";
  if (!correoValido(correo)) return respuestaJson({ ok: false, message: "Escribe un correo válido." }, 400);
  if (accion === "authorize" && nombre.length < 3) return respuestaJson({ ok: false, message: "Escribe el nombre del colaborador." }, 400);

  const usuario = await env.DB.prepare(
    "SELECT id, role, status FROM users WHERE email = ? LIMIT 1",
  ).bind(correo).first();
  if (usuario && usuario.role !== "terminal") {
    return respuestaJson({ ok: false, message: "Este correo ya pertenece a una cuenta Customer User." }, 409);
  }

  if (accion === "revoke") {
    if (correo === correoNormalizado(administrador.email) || correosTerminal(env).has(correo)) {
      return respuestaJson({ ok: false, message: "El acceso maestro no puede revocarse desde el panel." }, 400);
    }
    const ahora = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO terminal_authorizations
        (email, name, status, authorized_by, created_at, updated_at)
        VALUES (?, ?, 'revoked', ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET status = 'revoked', authorized_by = excluded.authorized_by, updated_at = excluded.updated_at`)
        .bind(correo, nombre || correo.split("@")[0], administrador.email, ahora, ahora),
      env.DB.prepare("UPDATE users SET status = 'suspended' WHERE email = ? AND role = 'terminal'").bind(correo),
      env.DB.prepare("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = ? AND role = 'terminal')").bind(correo),
    ]);
    return respuestaJson({ ok: true, message: "Acceso revocado y sesiones cerradas." });
  }

  const ahora = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO terminal_authorizations
      (email, name, status, authorized_by, created_at, updated_at)
      VALUES (?, ?, 'active', ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET name = excluded.name, status = 'active', authorized_by = excluded.authorized_by, updated_at = excluded.updated_at`)
      .bind(correo, nombre, administrador.email, ahora, ahora),
    env.DB.prepare("UPDATE users SET name = ?, status = 'active' WHERE email = ? AND role = 'terminal'").bind(nombre, correo),
  ]);
  return respuestaJson({ ok: true, message: "Correo autorizado. Ya puede solicitar su código de acceso." }, 201);
}

function textoSeguro(valor, maximo) {
  return String(valor || "").trim().slice(0, maximo);
}

function contenedorValido(valor) {
  return /^[A-Z]{4}[0-9]{7}$/.test(valor);
}

const ESTADOS_CARGA = {
  pending: {
    label: "Pendiente de validación",
    location: "Validación documental GateFlow",
    detail: "La solicitud fue recibida y espera confirmación de titularidad por la terminal.",
  },
  verified: {
    label: "Titularidad validada",
    location: "Expediente confirmado",
    detail: "La terminal confirmó la relación entre el cliente, la reserva y el contenedor.",
  },
  customs: {
    label: "En revisión aduanera",
    location: "Proceso documental de Aduanas",
    detail: "La carga se encuentra en revisión documental. GateFlow todavía no autoriza el retiro.",
  },
  ready: {
    label: "Disponible para retiro",
    location: "Terminal portuaria · carga disponible",
    detail: "La carga está disponible para coordinar cita, transportista y pase de acceso.",
  },
  scheduled: {
    label: "Retiro coordinado",
    location: "Cita y acceso en preparación",
    detail: "La operación tiene una gestión de retiro coordinada en GateFlow.",
  },
  completed: {
    label: "Carga retirada",
    location: "Operación completada",
    detail: "El movimiento fue marcado como completado por la terminal.",
  },
  observed: {
    label: "Requiere corrección",
    location: "Validación documental observada",
    detail: "La terminal necesita que el cliente revise las referencias suministradas.",
  },
};

function referenciaCarga(valor, maximo = 50) {
  return textoSeguro(valor, maximo).toUpperCase().replace(/\s+/g, "");
}

function referenciaEnmascarada(valor) {
  const limpia = String(valor || "");
  if (limpia.length <= 4) return "••••";
  return `${"•".repeat(Math.min(8, limpia.length - 4))}${limpia.slice(-4)}`;
}

async function exigirSesionCliente(request, env) {
  const sesion = await obtenerSesion(request, env);
  if (!sesion || sesion.status !== "active" || sesion.role !== "cliente") return null;
  return sesion;
}

async function exigirSesionTerminal(request, env) {
  const sesion = await obtenerSesion(request, env);
  if (!sesion || sesion.status !== "active" || sesion.role !== "terminal") return null;
  if (!(await estaAutorizadoTerminal(env, sesion.email))) return null;
  return sesion;
}

async function listarCargasCliente(request, env) {
  const sesion = await exigirSesionCliente(request, env);
  if (!sesion) return respuestaJson({ ok: false, message: "Inicia sesión como Customer User." }, 401);

  const resultado = await env.DB.prepare(`SELECT id, container_number, booking_reference,
      document_type, document_reference, status, current_location, eta, created_at, updated_at
    FROM customer_cargo_links WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`)
    .bind(sesion.id).all();
  const cargas = [];
  for (const item of resultado.results || []) {
    const eventos = await env.DB.prepare(`SELECT id, status, title, detail, source, event_at
      FROM cargo_events WHERE cargo_link_id = ? ORDER BY event_at ASC, id ASC LIMIT 50`)
      .bind(item.id).all();
    const estado = ESTADOS_CARGA[item.status] || ESTADOS_CARGA.pending;
    cargas.push({
      id: item.id,
      container_number: item.container_number,
      booking_reference: item.booking_reference,
      document_type: item.document_type,
      document_reference_masked: referenciaEnmascarada(item.document_reference),
      status: item.status,
      status_label: estado.label,
      current_location: item.current_location || estado.location,
      eta: item.eta || "",
      created_at: item.created_at,
      updated_at: item.updated_at,
      events: eventos.results || [],
    });
  }
  return respuestaJson({ ok: true, cargo: cargas });
}

async function vincularCargaCliente(request, env) {
  const sesion = await exigirSesionCliente(request, env);
  if (!sesion) return respuestaJson({ ok: false, message: "Inicia sesión como Customer User." }, 401);
  const datos = await leerJson(request);
  if (!datos) return respuestaJson({ ok: false, message: "Solicitud inválida." }, 400);

  const contenedor = referenciaCarga(datos.container, 14);
  const booking = referenciaCarga(datos.bookingReference, 40);
  const tipoDocumento = textoSeguro(datos.documentType, 20);
  const documento = referenciaCarga(datos.documentReference, 50);
  const tipos = new Set(["Bill of Lading", "PIN de retiro", "Referencia aduanera"]);
  if (!contenedorValido(contenedor)) return respuestaJson({ ok: false, message: "El contenedor debe tener cuatro letras y siete números." }, 400);
  if (booking.length < 4) return respuestaJson({ ok: false, message: "Escribe un booking válido." }, 400);
  if (!tipos.has(tipoDocumento) || documento.length < 4) {
    return respuestaJson({ ok: false, message: "Selecciona y completa una segunda referencia de seguridad." }, 400);
  }

  const existente = await env.DB.prepare(`SELECT id FROM customer_cargo_links
    WHERE user_id = ? AND container_number = ? AND booking_reference = ? LIMIT 1`)
    .bind(sesion.id, contenedor, booking).first();
  if (existente) return respuestaJson({ ok: false, message: "Esta carga ya está vinculada a tu cuenta." }, 409);

  const ahora = new Date().toISOString();
  const id = `GFC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const eventoId = `GFE-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO customer_cargo_links
      (id, user_id, container_number, booking_reference, document_type, document_reference,
       status, current_location, eta, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, '', ?, ?)`)
      .bind(id, sesion.id, contenedor, booking, tipoDocumento, documento, ESTADOS_CARGA.pending.location, ahora, ahora),
    env.DB.prepare(`INSERT INTO cargo_events
      (id, cargo_link_id, status, title, detail, source, event_at)
      VALUES (?, ?, 'pending', ?, ?, 'Customer User', ?)`)
      .bind(eventoId, id, "Solicitud de vinculación recibida", ESTADOS_CARGA.pending.detail, ahora),
  ]);
  return respuestaJson({ ok: true, message: "Carga vinculada. La terminal debe validar las referencias antes de habilitar el seguimiento completo.", id }, 201);
}

async function consultaPublicaCarga(url, env) {
  await asegurarEsquema(env);
  const contenedor = referenciaCarga(url.searchParams.get("container"), 14);
  if (!contenedorValido(contenedor)) return respuestaJson({ ok: false, message: "Escribe un número de contenedor válido." }, 400);
  const carga = await env.DB.prepare(`SELECT status, updated_at FROM customer_cargo_links
    WHERE container_number = ? ORDER BY updated_at DESC LIMIT 1`).bind(contenedor).first();
  if (!carga) {
    return respuestaJson({ ok: true, found: false, message: "No hay un estado público disponible. El titular puede iniciar sesión y vincular la carga." });
  }
  const estado = ESTADOS_CARGA[carga.status] || ESTADOS_CARGA.pending;
  return respuestaJson({
    ok: true,
    found: true,
    container: contenedor,
    status: estado.label,
    message: carga.status === "observed" ? "El seguimiento detallado requiere acceso del titular." : estado.detail,
    updatedAt: carga.updated_at,
  });
}

async function listarCargasTerminal(request, env) {
  const sesion = await exigirSesionTerminal(request, env);
  if (!sesion) return respuestaJson({ ok: false, message: "Se requiere acceso autorizado de Terminal User." }, 403);
  const resultado = await env.DB.prepare(`SELECT c.id, c.container_number, c.booking_reference,
      c.document_type, c.document_reference, c.status, c.current_location, c.eta,
      c.created_at, c.updated_at, u.name AS customer_name, u.email AS customer_email
    FROM customer_cargo_links c JOIN users u ON u.id = c.user_id
    ORDER BY CASE c.status WHEN 'pending' THEN 0 WHEN 'observed' THEN 1 ELSE 2 END, c.updated_at DESC
    LIMIT 150`).all();
  return respuestaJson({ ok: true, cargo: (resultado.results || []).map((item) => ({
    ...item,
    status_label: (ESTADOS_CARGA[item.status] || ESTADOS_CARGA.pending).label,
  })) });
}

async function actualizarCargaTerminal(request, env) {
  const sesion = await exigirSesionTerminal(request, env);
  if (!sesion) return respuestaJson({ ok: false, message: "Se requiere acceso autorizado de Terminal User." }, 403);
  const datos = await leerJson(request);
  if (!datos) return respuestaJson({ ok: false, message: "Solicitud inválida." }, 400);
  const id = textoSeguro(datos.id, 40);
  const estadoClave = textoSeguro(datos.status, 20);
  const estado = ESTADOS_CARGA[estadoClave];
  const nota = textoSeguro(datos.note, 220);
  const ubicacion = textoSeguro(datos.currentLocation, 100) || estado?.location || "";
  const eta = textoSeguro(datos.eta, 32);
  if (!id || !estado) return respuestaJson({ ok: false, message: "Selecciona una carga y un estado válido." }, 400);
  const carga = await env.DB.prepare("SELECT id FROM customer_cargo_links WHERE id = ? LIMIT 1").bind(id).first();
  if (!carga) return respuestaJson({ ok: false, message: "La carga solicitada no existe." }, 404);

  const ahora = new Date().toISOString();
  const eventoId = `GFE-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;
  await env.DB.batch([
    env.DB.prepare(`UPDATE customer_cargo_links SET status = ?, current_location = ?, eta = ?, updated_at = ? WHERE id = ?`)
      .bind(estadoClave, ubicacion, eta, ahora, id),
    env.DB.prepare(`INSERT INTO cargo_events
      (id, cargo_link_id, status, title, detail, source, event_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(eventoId, id, estadoClave, estado.label, nota || estado.detail, sesion.email, ahora),
  ]);
  return respuestaJson({ ok: true, message: `Estado actualizado: ${estado.label}.` });
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

  const cargaVinculada = await env.DB.prepare(`SELECT id, status FROM customer_cargo_links
    WHERE user_id = ? AND container_number = ? AND booking_reference = ? LIMIT 1`)
    .bind(sesion.id, contenedor, referencia.replace(/\s+/g, "")).first();
  if (!cargaVinculada || !new Set(["verified", "customs", "ready", "scheduled"]).has(cargaVinculada.status)) {
    return respuestaJson({ ok: false, message: "Primero vincula la carga y espera la validación de la terminal antes de solicitar el movimiento." }, 409);
  }

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
      if (ruta === "/api/customer/register" && request.method === "POST") return registrarClienteConClave(request, env);
      if (ruta === "/api/customer/login" && request.method === "POST") return iniciarClienteConClave(request, env);
      if (ruta === "/api/auth/request-code" && request.method === "POST") return solicitarCodigo(request, env);
      if (ruta === "/api/auth/verify-code" && request.method === "POST") return verificarCodigo(request, env);
      if (ruta === "/api/auth/session" && request.method === "GET") {
        const sesion = await obtenerSesion(request, env);
        if (!sesion || sesion.status !== "active") return respuestaJson({ authenticated: false }, 401);
        if (sesion.role === "terminal" && !(await estaAutorizadoTerminal(env, sesion.email))) {
          const token = tokenAutorizacion(request);
          const tokenHash = await hashHex(String(env.OTP_PEPPER || "") + ":session:" + token);
          await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
          return respuestaJson({ authenticated: false, message: "La autorización de esta cuenta fue revocada." }, 403);
        }
        return respuestaJson({
          authenticated: true,
          user: {
            id: sesion.id,
            name: sesion.name,
            email: sesion.email,
            role: sesion.role,
            canManageUsers: sesion.role === "terminal" && esAdministradorTerminal(env, sesion.email),
          },
        });
      }
      if (ruta === "/api/auth/logout" && request.method === "POST") return cerrarSesionApi(request, env);
      if (ruta === "/api/public/cargo-status" && request.method === "GET") return consultaPublicaCarga(url, env);
      if (ruta === "/api/terminal/authorizations" && request.method === "GET") return listarAutorizacionesTerminal(request, env);
      if (ruta === "/api/terminal/authorizations" && request.method === "POST") return gestionarAutorizacionTerminal(request, env);
      if (ruta === "/api/terminal/cargo-links" && request.method === "GET") return listarCargasTerminal(request, env);
      if (ruta === "/api/terminal/cargo-links" && request.method === "POST") return actualizarCargaTerminal(request, env);
      if (ruta === "/api/customer/cargo-links" && request.method === "GET") return listarCargasCliente(request, env);
      if (ruta === "/api/customer/cargo-links" && request.method === "POST") return vincularCargaCliente(request, env);
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
