// =============================================================================
// Acceso por correo y código de un solo uso para GateFlow.
// Las cuentas y sesiones se validan en el servidor; el navegador solo conserva
// el token temporal de la sesión actual.
// =============================================================================

const GateFlowAcceso = (() => {
  const CLAVE_SESION = "gateflow_sesion_segura_v2";

  function leerSesion() {
    try { return JSON.parse(sessionStorage.getItem(CLAVE_SESION) || "null"); }
    catch (_) { return null; }
  }

  function guardarSesion(usuario, token, vence) {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify({
      id: usuario.id,
      nombre: usuario.name,
      correo: usuario.email,
      rol: usuario.role,
      puedeAdministrarUsuarios: Boolean(usuario.canManageUsers),
      token,
      vence,
    }));
  }

  function usuarioActual(rol) {
    const sesion = leerSesion();
    if (!sesion || (rol && sesion.rol !== rol)) return null;
    if (sesion.vence && Date.parse(sesion.vence) <= Date.now()) {
      sessionStorage.removeItem(CLAVE_SESION);
      return null;
    }
    return sesion;
  }

  function escapar(valor) {
    return String(valor ?? "").replace(/[&<>'"]/g, (caracter) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
    })[caracter]);
  }

  async function api(ruta, opciones = {}) {
    const sesion = leerSesion();
    const headers = { accept: "application/json" };
    if (opciones.body) headers["content-type"] = "application/json";
    if (sesion?.token) headers.authorization = `Bearer ${sesion.token}`;
    const respuesta = await fetch(ruta, {
      method: opciones.method || (opciones.body ? "POST" : "GET"),
      headers,
      body: opciones.body ? JSON.stringify(opciones.body) : undefined,
      cache: "no-store",
    });
    let datos = {};
    try { datos = await respuesta.json(); } catch (_) { datos = {}; }
    if (!respuesta.ok) throw new Error(datos.message || "No fue posible completar la operación.");
    return datos;
  }

  async function validarSesion(rol) {
    const sesion = leerSesion();
    if (!sesion || (rol && sesion.rol !== rol)) return null;
    try {
      const datos = await api("/api/auth/session");
      if (!datos.authenticated || !datos.user || (rol && datos.user.role !== rol)) throw new Error("SESSION_INVALID");
      guardarSesion(datos.user, sesion.token, sesion.vence);
      return usuarioActual(rol);
    } catch (_) {
      sessionStorage.removeItem(CLAVE_SESION);
      return null;
    }
  }

  function cerrarSesion(alCerrar) {
    const sesion = leerSesion();
    sessionStorage.removeItem(CLAVE_SESION);
    if (sesion?.token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { authorization: `Bearer ${sesion.token}`, accept: "application/json" },
      }).catch(() => {});
    }
    if (alCerrar) alCerrar();
  }

  function mostrarAccesoTerminal(contenedor, alEntrar) {
    contenedor.innerHTML = `
      <section class="acceso-gate acceso-terminal">
        <div class="acceso-presentacion">
          <span class="seccion-etiqueta">ACCESO OPERATIVO · GATEFLOW</span>
          <h2>Terminal User</h2>
          <p>El dashboard operativo está reservado al personal aprobado previamente. GateFlow solo enviará el código cuando el correo figure como autorizado por la terminal.</p>
          <div class="acceso-seguridad">
            <span aria-hidden="true">●</span>
            <div><strong>Código personal y temporal</strong><small>Vence en 10 minutos, admite hasta cinco intentos y solo puede utilizarse una vez.</small></div>
          </div>
        </div>
        <div class="acceso-panel acceso-correo-panel">
          <span class="seccion-etiqueta">IDENTIDAD DEL TERMINAL</span>
          <h3>Recibe tu código de acceso</h3>
          <p>Primero la administración autoriza el correo; después el colaborador puede solicitar su código temporal.</p>
          <div class="acceso-correo-identidad" data-terminal-identidad>
            <span>Correo autorizado</span><strong>Comprobando tu sesión…</strong><small>También puedes escribir el correo manualmente.</small>
          </div>
          <form class="acceso-formulario" data-terminal-solicitar>
            <label>Correo electrónico<input name="correo" type="email" autocomplete="email" required placeholder="usuario@empresa.com"></label>
            <button class="boton acceso-principal" type="submit">Enviar código por correo</button>
          </form>
          <form class="acceso-formulario acceso-codigo-form" data-terminal-verificar hidden>
            <label>Código de seis dígitos<input name="codigo" type="text" inputmode="numeric" autocomplete="one-time-code" minlength="6" maxlength="6" pattern="[0-9]{6}" required placeholder="000000"></label>
            <button class="boton acceso-principal" type="submit">Verificar y abrir dashboard</button>
            <button class="acceso-regresar" type="button" data-terminal-regresar>Cambiar correo o reenviar</button>
          </form>
          <p class="acceso-mensaje" data-acceso-mensaje aria-live="polite"></p>
          <p class="acceso-nota">Control previo obligatorio: autorización administrativa → código temporal → acceso al dashboard. El código no reemplaza la autorización.</p>
        </div>
      </section>`;

    const mensaje = contenedor.querySelector("[data-acceso-mensaje]");
    const identidad = contenedor.querySelector("[data-terminal-identidad]");
    const solicitar = contenedor.querySelector("[data-terminal-solicitar]");
    const verificar = contenedor.querySelector("[data-terminal-verificar]");
    const correoInput = solicitar.elements.correo;
    let correoPendiente = "";

    const mostrarMensaje = (texto, tipo = "") => {
      mensaje.textContent = texto;
      mensaje.className = `acceso-mensaje ${tipo}`.trim();
    };

    fetch("/api/terminal-session", { headers: { accept: "application/json" }, cache: "no-store" })
      .then((respuesta) => respuesta.json())
      .then((perfil) => {
        if (perfil.authenticated) correoInput.value = perfil.email || "";
        identidad.innerHTML = perfil.authenticated
          ? `<span>Correo verificado en esta sesión</span><strong>${escapar(perfil.email)}</strong><small>${perfil.authorized ? "Autorizado para recibir el código" : "Todavía no está en la lista del terminal"}</small>`
          : `<span>Correo del terminal</span><strong>Escríbelo para continuar</strong><small>GateFlow comprobará la autorización antes de enviar el código.</small>`;
      })
      .catch(() => {
        identidad.innerHTML = `<span>Correo del terminal</span><strong>Escríbelo para continuar</strong><small>GateFlow comprobará la autorización antes de enviar el código.</small>`;
      });

    solicitar.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      correoPendiente = String(new FormData(solicitar).get("correo") || "").trim().toLowerCase();
      const boton = solicitar.querySelector("button[type='submit']");
      boton.disabled = true;
      mostrarMensaje("Enviando código…");
      try {
        const datos = await api("/api/auth/request-code", { body: { email: correoPendiente, role: "terminal", purpose: "login" } });
        solicitar.hidden = true;
        verificar.hidden = false;
        verificar.elements.codigo.focus();
        mostrarMensaje(datos.message, "ok");
      } catch (error) {
        mostrarMensaje(error.message, "error");
      } finally {
        boton.disabled = false;
      }
    });

    verificar.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const codigo = String(new FormData(verificar).get("codigo") || "").trim();
      const boton = verificar.querySelector("button[type='submit']");
      boton.disabled = true;
      mostrarMensaje("Validando código…");
      try {
        const datos = await api("/api/auth/verify-code", { body: { email: correoPendiente, role: "terminal", purpose: "login", code: codigo } });
        guardarSesion(datos.user, datos.token, datos.expiresAt);
        mostrarMensaje("Acceso autorizado.", "ok");
        alEntrar();
      } catch (error) {
        mostrarMensaje(error.message, "error");
      } finally {
        boton.disabled = false;
      }
    });

    contenedor.querySelector("[data-terminal-regresar]").addEventListener("click", () => {
      verificar.hidden = true;
      solicitar.hidden = false;
      verificar.reset();
      mostrarMensaje("");
      correoInput.focus();
    });
  }

  function prepararFormularioCodigo(formulario, configuracion, alEntrar, mostrarMensaje) {
    const principal = formulario.querySelector("[data-acceso-principal]");
    const codigoGrupo = formulario.querySelector("[data-acceso-codigo]");
    const regresar = formulario.querySelector("[data-acceso-regresar]");
    const correoInput = formulario.elements.correo;
    const nombreInput = formulario.elements.nombre;
    let correoPendiente = "";

    const reiniciar = () => {
      formulario.dataset.etapa = "solicitar";
      codigoGrupo.hidden = true;
      regresar.hidden = true;
      correoInput.disabled = false;
      if (nombreInput) nombreInput.disabled = false;
      principal.textContent = configuracion.textoSolicitar;
      formulario.elements.codigo.value = "";
      mostrarMensaje("");
    };

    formulario.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const datosFormulario = new FormData(formulario);
      principal.disabled = true;
      try {
        if (formulario.dataset.etapa !== "verificar") {
          correoPendiente = String(datosFormulario.get("correo") || "").trim().toLowerCase();
          const respuesta = await api("/api/auth/request-code", {
            body: {
              email: correoPendiente,
              name: String(datosFormulario.get("nombre") || "").trim(),
              role: "cliente",
              purpose: configuracion.proposito,
            },
          });
          formulario.dataset.etapa = "verificar";
          codigoGrupo.hidden = false;
          regresar.hidden = false;
          correoInput.disabled = true;
          if (nombreInput) nombreInput.disabled = true;
          principal.textContent = configuracion.textoVerificar;
          formulario.elements.codigo.focus();
          mostrarMensaje(respuesta.message, "ok");
        } else {
          const respuesta = await api("/api/auth/verify-code", {
            body: {
              email: correoPendiente,
              role: "cliente",
              purpose: configuracion.proposito,
              code: String(datosFormulario.get("codigo") || "").trim(),
            },
          });
          guardarSesion(respuesta.user, respuesta.token, respuesta.expiresAt);
          mostrarMensaje("Acceso autorizado.", "ok");
          alEntrar();
        }
      } catch (error) {
        mostrarMensaje(error.message, "error");
      } finally {
        principal.disabled = false;
      }
    });

    regresar.addEventListener("click", reiniciar);
    reiniciar();
    return reiniciar;
  }

  function mostrarAccesoCliente(contenedor, alEntrar) {
    const sesion = leerSesion();
    contenedor.innerHTML = `
      <section class="acceso-gate acceso-cliente">
        <div class="acceso-presentacion">
          <span class="seccion-etiqueta">PORTAL DE SERVICIO · GATEFLOW</span>
          <h2>Customer User</h2>
          <p>Crea tu cuenta para gestionar movimientos, citas y el Pase QR desde un solo lugar.</p>
          <div class="acceso-seguridad"><span aria-hidden="true">●</span><div><strong>Acceso sin contraseñas</strong><small>Cada ingreso se confirma mediante un código enviado al correo registrado.</small></div></div>
          <div class="acceso-ruta-breve" aria-label="Pasos para entrar a Customer User">
            <div><span>1</span><strong>Crear usuario</strong><small>Nombre, correo y consentimiento.</small></div>
            <div><span>2</span><strong>Revisar el correo</strong><small>Recibir el código de seis dígitos.</small></div>
            <div><span>3</span><strong>Entrar</strong><small>La sesión permanece activa hasta 12 horas.</small></div>
          </div>
        </div>
        <div class="acceso-panel">
          <div class="acceso-tabs" role="tablist" aria-label="Opciones de acceso">
            <button type="button" class="activo" data-acceso-vista="ingresar">Iniciar sesión</button>
            <button type="button" data-acceso-vista="registro">Crear usuario</button>
          </div>
          ${sesion && sesion.rol !== "cliente" ? `<div class="acceso-aviso">La sesión actual corresponde a <strong>Terminal User</strong>. Cierra esa sesión antes de entrar como cliente.</div>` : ""}
          <form class="acceso-formulario" data-acceso-form="ingresar" data-etapa="solicitar">
            <label>Correo electrónico<input name="correo" type="email" autocomplete="email" required placeholder="usuario@empresa.com"></label>
            <label data-acceso-codigo hidden>Código de seis dígitos<input name="codigo" type="text" inputmode="numeric" autocomplete="one-time-code" minlength="6" maxlength="6" pattern="[0-9]{6}" placeholder="000000"></label>
            <button class="boton acceso-principal" type="submit" data-acceso-principal>Enviar código de acceso</button>
            <button class="acceso-regresar" type="button" data-acceso-regresar hidden>Cambiar correo o reenviar</button>
          </form>
          <form class="acceso-formulario" data-acceso-form="registro" data-etapa="solicitar" hidden>
            <label>Nombre completo<input name="nombre" autocomplete="name" minlength="3" required placeholder="Nombre y apellido"></label>
            <label>Correo electrónico<input name="correo" type="email" autocomplete="email" required placeholder="usuario@empresa.com"></label>
            <label data-acceso-codigo hidden>Código de verificación<input name="codigo" type="text" inputmode="numeric" autocomplete="one-time-code" minlength="6" maxlength="6" pattern="[0-9]{6}" placeholder="000000"></label>
            <label class="acceso-aceptar"><input type="checkbox" required> Acepto el uso de mis datos para crear la cuenta y gestionar mis solicitudes en GateFlow.</label>
            <button class="boton acceso-principal" type="submit" data-acceso-principal>Enviar código y crear usuario</button>
            <button class="acceso-regresar" type="button" data-acceso-regresar hidden>Cambiar datos o reenviar</button>
          </form>
          <p class="acceso-mensaje" data-acceso-mensaje aria-live="polite"></p>
          <p class="acceso-nota">La cuenta queda registrada en GateFlow. El código vence en 10 minutos y la sesión dura hasta 12 horas.</p>
        </div>
      </section>`;

    const mensaje = contenedor.querySelector("[data-acceso-mensaje]");
    const mostrarMensaje = (texto, tipo = "") => {
      mensaje.textContent = texto;
      mensaje.className = `acceso-mensaje ${tipo}`.trim();
    };

    const reiniciarIngreso = prepararFormularioCodigo(
      contenedor.querySelector("[data-acceso-form='ingresar']"),
      { proposito: "login", textoSolicitar: "Enviar código de acceso", textoVerificar: "Verificar y entrar" },
      alEntrar,
      mostrarMensaje,
    );
    const reiniciarRegistro = prepararFormularioCodigo(
      contenedor.querySelector("[data-acceso-form='registro']"),
      { proposito: "register", textoSolicitar: "Enviar código y crear usuario", textoVerificar: "Verificar y crear cuenta" },
      alEntrar,
      mostrarMensaje,
    );

    contenedor.querySelectorAll("[data-acceso-vista]").forEach((boton) => boton.addEventListener("click", () => {
      const vista = boton.dataset.accesoVista;
      contenedor.querySelectorAll("[data-acceso-vista]").forEach((otro) => otro.classList.toggle("activo", otro === boton));
      contenedor.querySelectorAll("[data-acceso-form]").forEach((formulario) => { formulario.hidden = formulario.dataset.accesoForm !== vista; });
      reiniciarIngreso();
      reiniciarRegistro();
    }));
  }

  function mostrarAcceso(contenedor, rol, alEntrar) {
    return rol === "terminal" ? mostrarAccesoTerminal(contenedor, alEntrar) : mostrarAccesoCliente(contenedor, alEntrar);
  }

  return { usuarioActual, validarSesion, mostrarAcceso, cerrarSesion, escapar, api };
})();
