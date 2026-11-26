// =============================================================================
// Acceso demostrativo por rol para GateFlow.
// Los usuarios y la sesión se guardan únicamente en este navegador. No sustituye
// un sistema corporativo de identidad ni debe utilizarse con datos reales.
// =============================================================================

const GateFlowAcceso = (() => {
  const CLAVE_USUARIOS = "gateflow_usuarios_demo_v1";
  const CLAVE_SESION = "gateflow_sesion_demo_v1";

  function leerUsuarios() {
    try { return JSON.parse(localStorage.getItem(CLAVE_USUARIOS) || "[]"); }
    catch (_) { return []; }
  }

  function guardarUsuarios(usuarios) {
    localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(usuarios));
  }

  function leerSesion() {
    try { return JSON.parse(sessionStorage.getItem(CLAVE_SESION) || "null"); }
    catch (_) { return null; }
  }

  function guardarSesion(usuario) {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify({
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    }));
  }

  async function huella(clave) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const bytes = new TextEncoder().encode(clave);
      const resumen = await window.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(resumen)).map((n) => n.toString(16).padStart(2, "0")).join("");
    }
    let valor = 2166136261;
    for (let i = 0; i < clave.length; i += 1) {
      valor ^= clave.charCodeAt(i);
      valor = Math.imul(valor, 16777619);
    }
    return `demo-${(valor >>> 0).toString(16)}`;
  }

  function usuarioActual(rol) {
    const sesion = leerSesion();
    return sesion && (!rol || sesion.rol === rol) ? sesion : null;
  }

  function escapar(valor) {
    return String(valor ?? "").replace(/[&<>'"]/g, (caracter) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
    })[caracter]);
  }

  function cerrarSesion(alCerrar) {
    sessionStorage.removeItem(CLAVE_SESION);
    if (alCerrar) alCerrar();
  }

  function mostrarAccesoTerminal(contenedor, alEntrar) {
    const sesion = leerSesion();
    contenedor.innerHTML = `
      <section class="acceso-gate acceso-terminal">
        <div class="acceso-presentacion">
          <span class="seccion-etiqueta">ACCESO OPERATIVO · GATEFLOW</span>
          <h2>Terminal User</h2>
          <p>Dashboard protegido para personal autorizado. El acceso se valida con el correo de tu sesión, sin códigos fijos visibles en la página.</p>
          <div class="acceso-seguridad">
            <span aria-hidden="true">●</span>
            <div><strong>Correo verificado + lista autorizada</strong><small>La validación se realiza en el servidor antes de abrir el dashboard.</small></div>
          </div>
        </div>
        <div class="acceso-panel acceso-correo-panel">
          <span class="seccion-etiqueta">IDENTIDAD DEL TERMINAL</span>
          <h3>Entra con tu correo verificado</h3>
          <p>GateFlow comprobará el correo asociado a tu sesión de ChatGPT y permitirá el acceso únicamente si está autorizado para Terminal User.</p>
          <div class="acceso-correo-identidad" data-terminal-identidad>
            <span>Correo de la sesión</span><strong>Comprobando identidad…</strong><small>No compartimos tu correo con otros usuarios.</small>
          </div>
          <button class="boton acceso-principal" type="button" data-terminal-verificar>Verificar correo y abrir dashboard</button>
          <a class="acceso-chatgpt" href="/signin-with-chatgpt?return_to=%2F%23terminal" data-terminal-iniciar hidden>Iniciar sesión con ChatGPT</a>
          <p class="acceso-mensaje" data-acceso-mensaje aria-live="polite"></p>
          <p class="acceso-nota">Esta verificación reemplaza el antiguo código general. Para enviar códigos OTP por correo se deberá conectar posteriormente un servicio empresarial de correo.</p>
          ${sesion ? `<button type="button" class="acceso-cerrar-sesion" data-acceso-cerrar>Cerrar sesión actual</button>` : ""}
        </div>
      </section>`;

    const mensaje = contenedor.querySelector("[data-acceso-mensaje]");
    const identidad = contenedor.querySelector("[data-terminal-identidad]");
    const boton = contenedor.querySelector("[data-terminal-verificar]");
    const iniciar = contenedor.querySelector("[data-terminal-iniciar]");
    let perfil = null;

    const mostrarMensaje = (texto, tipo = "") => {
      mensaje.textContent = texto;
      mensaje.className = `acceso-mensaje ${tipo}`.trim();
    };

    async function comprobar() {
      boton.disabled = true;
      mostrarMensaje("Comprobando tu correo…");
      try {
        const respuesta = await fetch("/api/terminal-session", { headers: { accept: "application/json" }, cache: "no-store" });
        perfil = await respuesta.json();
        if (!perfil.authenticated) {
          identidad.innerHTML = `<span>Correo de la sesión</span><strong>No has iniciado sesión</strong><small>Inicia sesión con ChatGPT para verificar tu correo.</small>`;
          iniciar.hidden = false;
          mostrarMensaje("Necesitas iniciar sesión con ChatGPT para continuar.", "error");
          return;
        }
        identidad.innerHTML = `<span>Correo verificado</span><strong>${escapar(perfil.email)}</strong><small>${perfil.authorized ? "Autorizado para Terminal User" : "Este correo no está en la lista del terminal"}</small>`;
        iniciar.hidden = true;
        if (!perfil.authorized) {
          mostrarMensaje("Tu correo está verificado, pero todavía no tiene permiso de Terminal User.", "error");
          return;
        }
        mostrarMensaje("Correo autorizado. Ya puedes abrir el dashboard.", "ok");
        boton.disabled = false;
        boton.textContent = "Abrir dashboard de Terminal User";
      } catch (_) {
        identidad.innerHTML = `<span>Estado del acceso</span><strong>No fue posible verificar</strong><small>Intenta nuevamente en unos segundos.</small>`;
        mostrarMensaje("No pudimos verificar tu correo en este momento.", "error");
        boton.disabled = false;
        boton.textContent = "Reintentar verificación";
      }
    }

    boton.addEventListener("click", () => {
      if (!perfil || !perfil.authorized) return comprobar();
      guardarSesion({
        id: perfil.id || `GFU-${Date.now().toString(36).toUpperCase()}`,
        nombre: perfil.name || perfil.email.split("@")[0],
        correo: perfil.email,
        rol: "terminal",
      });
      mostrarMensaje("Acceso autorizado.", "ok");
      alEntrar();
    });

    const cerrar = contenedor.querySelector("[data-acceso-cerrar]");
    if (cerrar) cerrar.addEventListener("click", () => cerrarSesion(() => mostrarAccesoTerminal(contenedor, alEntrar)));
    comprobar();
  }

  function mostrarAcceso(contenedor, rol, alEntrar) {
    const esTerminal = rol === "terminal";
    if (esTerminal) return mostrarAccesoTerminal(contenedor, alEntrar);
    const sesion = leerSesion();
    const nombreRol = esTerminal ? "Terminal User" : "Customer User";
    const descripcion = esTerminal
      ? "Centro de control para el personal operativo. Una cuenta habilita Dashboard, Llegadas, Capacidad, TTT, Citas y Mejora."
      : "Portal para transportistas, conductores y clientes de carga.";

    contenedor.innerHTML = `
      <section class="acceso-gate acceso-${rol}">
        <div class="acceso-presentacion">
          <span class="seccion-etiqueta">ACCESO CONTROLADO · GATEFLOW</span>
          <h2>${nombreRol}</h2>
          <p>${descripcion}</p>
          <div class="acceso-seguridad">
            <span aria-hidden="true">●</span>
            <div><strong>Área protegida por rol</strong><small>La sesión permanece solamente en este dispositivo.</small></div>
          </div>
        </div>
        <div class="acceso-panel">
          <div class="acceso-tabs" role="tablist" aria-label="Opciones de acceso">
            <button type="button" class="activo" data-acceso-vista="ingresar">Iniciar sesión</button>
            <button type="button" data-acceso-vista="registro">Crear usuario</button>
          </div>
          ${sesion && sesion.rol !== rol ? `<div class="acceso-aviso">La sesión actual corresponde a <strong>${sesion.rol === "terminal" ? "Terminal User" : "Customer User"}</strong>. Cierra esa sesión para entrar en esta área.</div>` : ""}
          <form class="acceso-formulario" data-acceso-form="ingresar">
            <label>Correo electrónico<input name="correo" type="email" autocomplete="username" required placeholder="usuario@empresa.com"></label>
            <label>Contraseña<input name="clave" type="password" autocomplete="current-password" minlength="8" required placeholder="Mínimo 8 caracteres"></label>
            <button class="boton acceso-principal" type="submit">Entrar a ${nombreRol}</button>
          </form>
          <form class="acceso-formulario" data-acceso-form="registro" hidden>
            <label>Nombre completo<input name="nombre" autocomplete="name" required placeholder="Nombre y apellido"></label>
            <label>Correo electrónico<input name="correo" type="email" autocomplete="email" required placeholder="usuario@empresa.com"></label>
            <label>Contraseña<input name="clave" type="password" autocomplete="new-password" minlength="8" required placeholder="Mínimo 8 caracteres"></label>
            <label class="acceso-aceptar"><input type="checkbox" required> Acepto usar información de demostración y no ingresar datos sensibles.</label>
            <button class="boton acceso-principal" type="submit">Crear ${nombreRol}</button>
          </form>
          <p class="acceso-mensaje" data-acceso-mensaje aria-live="polite"></p>
          <p class="acceso-nota">Registro habilitado para el proyecto académico. La cuenta se guarda en este navegador y no sustituye una autenticación corporativa.</p>
          ${sesion ? `<button type="button" class="acceso-cerrar-sesion" data-acceso-cerrar>Cerrar sesión actual</button>` : ""}
        </div>
      </section>`;

    const mensaje = contenedor.querySelector("[data-acceso-mensaje]");
    const mostrarMensaje = (texto, tipo = "") => {
      mensaje.textContent = texto;
      mensaje.className = `acceso-mensaje ${tipo}`.trim();
    };

    contenedor.querySelectorAll("[data-acceso-vista]").forEach((boton) => boton.addEventListener("click", () => {
      const vista = boton.dataset.accesoVista;
      contenedor.querySelectorAll("[data-acceso-vista]").forEach((otro) => otro.classList.toggle("activo", otro === boton));
      contenedor.querySelectorAll("[data-acceso-form]").forEach((formulario) => { formulario.hidden = formulario.dataset.accesoForm !== vista; });
      mostrarMensaje("");
    }));

    contenedor.querySelector("[data-acceso-form='ingresar']").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const datos = new FormData(evento.currentTarget);
      const correo = String(datos.get("correo")).trim().toLowerCase();
      const clave = await huella(String(datos.get("clave")));
      const usuario = leerUsuarios().find((item) => item.correo === correo && item.huella === clave);
      if (!usuario) return mostrarMensaje("Correo o contraseña incorrectos.", "error");
      if (usuario.rol !== rol) return mostrarMensaje(`Esta cuenta no tiene acceso a ${nombreRol}.`, "error");
      guardarSesion(usuario);
      mostrarMensaje("Acceso autorizado.", "ok");
      alEntrar();
    });

    contenedor.querySelector("[data-acceso-form='registro']").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const datos = new FormData(evento.currentTarget);
      const nombre = String(datos.get("nombre")).trim();
      const correo = String(datos.get("correo")).trim().toLowerCase();
      const claveOriginal = String(datos.get("clave"));
      const usuarios = leerUsuarios();
      if (usuarios.some((item) => item.correo === correo)) return mostrarMensaje("Ya existe un usuario con este correo.", "error");
      const usuario = {
        id: `GFU-${Date.now().toString(36).toUpperCase()}`,
        nombre,
        correo,
        rol,
        huella: await huella(claveOriginal),
        creado: new Date().toISOString(),
      };
      usuarios.push(usuario);
      guardarUsuarios(usuarios);
      guardarSesion(usuario);
      mostrarMensaje("Usuario creado. Acceso autorizado.", "ok");
      alEntrar();
    });

    const cerrar = contenedor.querySelector("[data-acceso-cerrar]");
    if (cerrar) cerrar.addEventListener("click", () => cerrarSesion(() => mostrarAcceso(contenedor, rol, alEntrar)));
  }

  return { usuarioActual, mostrarAcceso, cerrarSesion, escapar };
})();
