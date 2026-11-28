// =============================================================================
// Customer User · vinculación segura, seguimiento y gestiones de carga
// =============================================================================

const CLIENTE_SOLICITUD_ACTIVA = "gateflow_solicitud_activa_v1";
const CLIENTE_ESTADOS_GESTIONABLES = new Set(["verified", "customs", "ready", "scheduled"]);

function fechaCliente(valor, incluirHora = false) {
  if (!valor) return "Sin fecha informada";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-PA", incluirHora
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(fecha);
}

async function renderCustomerUser(contenedor, estado) {
  const modulo = MODULOS.find((item) => item.id === "cliente");
  const sesionLocal = GateFlowAcceso.usuarioActual("cliente");
  if (!sesionLocal) {
    GateFlowAcceso.mostrarAcceso(contenedor, "cliente", () => modulo.render(contenedor, estado));
    return;
  }

  contenedor.innerHTML = `<section class="cliente-validando" aria-live="polite">Validando tu cuenta Customer User…</section>`;
  const usuario = await GateFlowAcceso.validarSesion("cliente");
  if (!usuario) {
    GateFlowAcceso.mostrarAcceso(contenedor, "cliente", () => modulo.render(contenedor, estado));
    return;
  }

  let cargas = [];
  let solicitudes = [];
  let vistaActiva = "seguimiento";

  contenedor.innerHTML = `
    <section class="cliente-hero">
      <div>
        <span class="seccion-etiqueta">GATEFLOW · VISIBILIDAD DE CARGA</span>
        <h2>Customer User</h2>
        <p>Vincula tus contenedores con referencias verificables y consulta cada avance sin exponer información sensible.</p>
      </div>
      <div class="cliente-sesion">
        <span>Cuenta verificada</span>
        <strong data-cliente-usuario></strong>
        <small data-cliente-correo></small>
        <button type="button" data-cliente-salir>Cerrar sesión</button>
      </div>
    </section>

    <nav class="cliente-subnav" aria-label="Áreas de Customer User">
      <button type="button" class="activo" data-cliente-vista="seguimiento">Mis cargas</button>
      <button type="button" data-cliente-vista="vincular">Vincular carga</button>
      <button type="button" data-cliente-vista="gestiones">Gestiones y citas</button>
    </nav>

    <section class="cliente-resumen" aria-label="Resumen de mi cuenta">
      <article><span>Cargas vinculadas</span><strong data-cliente-cargas>—</strong><small>Asociadas a esta cuenta</small></article>
      <article><span>En validación</span><strong data-cliente-validacion>—</strong><small>Revisión de titularidad</small></article>
      <article><span>Disponibles</span><strong data-cliente-disponibles>—</strong><small>Listas para coordinar retiro</small></article>
      <article><span>Gestiones</span><strong data-cliente-total>—</strong><small data-cliente-pendientes>Solicitudes guardadas</small></article>
    </section>

    <section class="cliente-vista" data-cliente-contenido></section>

    <section class="cliente-acciones">
      <a href="#pase"><span>Acceso expedito</span><strong>Completar Pase QR</strong><small>Continúa cuando la carga y la cita estén autorizadas.</small><b>Preparar pase →</b></a>
      <a href="#mapa"><span>Antes de salir</span><strong>Consultar acceso a Balboa</strong><small>Revisa el mapa, las vías próximas y el estado general del acceso.</small><b>Abrir mapa →</b></a>
      <a href="#inicio"><span>GateFlow</span><strong>Volver al centro de servicio</strong><small>Consulta cómo se conectan buque, flujo, garita y terminal.</small><b>Ir al inicio →</b></a>
    </section>
    <p class="cliente-referencia">El número de contenedor permite localizar la operación, pero no concede acceso. GateFlow exige una cuenta verificada y referencias adicionales. Los estados operativos deben ser confirmados por la terminal o por una integración oficial.</p>`;

  const panel = contenedor.querySelector("[data-cliente-contenido]");

  const pintarResumen = () => {
    const pendientes = cargas.filter((item) => item.status === "pending").length;
    const disponibles = cargas.filter((item) => item.status === "ready").length;
    const solicitudesPendientes = solicitudes.filter((item) => item.status === "Pendiente de validación").length;
    contenedor.querySelector("[data-cliente-cargas]").textContent = cargas.length;
    contenedor.querySelector("[data-cliente-validacion]").textContent = pendientes;
    contenedor.querySelector("[data-cliente-disponibles]").textContent = disponibles;
    contenedor.querySelector("[data-cliente-total]").textContent = solicitudes.length;
    contenedor.querySelector("[data-cliente-pendientes]").textContent = `${solicitudesPendientes} ${solicitudesPendientes === 1 ? "pendiente" : "pendientes"}`;
  };

  const renderSeguimiento = () => {
    panel.innerHTML = `
      <section class="cliente-seccion-cabecera">
        <div><span class="seccion-etiqueta">SEGUIMIENTO PROTEGIDO</span><h3>Mis cargas vinculadas</h3><p>Cada evento proviene de tu solicitud o de un usuario autorizado del terminal.</p></div>
        <button type="button" class="boton" data-ir-vincular>Vincular otra carga</button>
      </section>
      <div class="cliente-cargas">
        ${cargas.length ? cargas.map((carga) => `
          <article class="cliente-carga estado-${GateFlowAcceso.escapar(carga.status)}">
            <header>
              <div><span>${GateFlowAcceso.escapar(carga.id)}</span><h4>${GateFlowAcceso.escapar(carga.container_number)}</h4></div>
              <b>${GateFlowAcceso.escapar(carga.status_label)}</b>
            </header>
            <div class="cliente-carga-datos">
              <div><span>Booking</span><strong>${GateFlowAcceso.escapar(carga.booking_reference)}</strong></div>
              <div><span>${GateFlowAcceso.escapar(carga.document_type)}</span><strong>${GateFlowAcceso.escapar(carga.document_reference_masked)}</strong></div>
              <div><span>Ubicación / etapa</span><strong>${GateFlowAcceso.escapar(carga.current_location)}</strong></div>
              <div><span>Fecha estimada</span><strong>${GateFlowAcceso.escapar(carga.eta || "Pendiente de terminal")}</strong></div>
            </div>
            <div class="cliente-linea-tiempo">
              ${(carga.events || []).map((evento, indice) => `
                <div class="cliente-evento ${indice === carga.events.length - 1 ? "actual" : ""}">
                  <i aria-hidden="true"></i>
                  <div><span>${GateFlowAcceso.escapar(fechaCliente(evento.event_at, true))}</span><strong>${GateFlowAcceso.escapar(evento.title)}</strong><p>${GateFlowAcceso.escapar(evento.detail)}</p></div>
                </div>`).join("")}
            </div>
            ${CLIENTE_ESTADOS_GESTIONABLES.has(carga.status) ? `<button type="button" class="cliente-carga-accion" data-ir-gestiones="${GateFlowAcceso.escapar(carga.id)}">Coordinar movimiento →</button>` : ""}
          </article>`).join("") : `
          <div class="cliente-vacio"><strong>Todavía no has vinculado una carga</strong><p>Agrega el contenedor, booking y una segunda referencia. La terminal confirmará la titularidad antes de mostrar detalles.</p><button type="button" class="boton" data-ir-vincular>Vincular mi primera carga</button></div>`}
      </div>`;
    panel.querySelectorAll("[data-ir-vincular]").forEach((boton) => boton.addEventListener("click", () => cambiarVista("vincular")));
    panel.querySelectorAll("[data-ir-gestiones]").forEach((boton) => boton.addEventListener("click", () => cambiarVista("gestiones", boton.dataset.irGestiones)));
  };

  const renderVincular = () => {
    panel.innerHTML = `
      <section class="cliente-seccion-cabecera">
        <div><span class="seccion-etiqueta">VINCULACIÓN SEGURA</span><h3>Agregar una carga a mi cuenta</h3><p>El contenedor identifica la operación; el booking y la segunda referencia demuestran tu relación con ella.</p></div>
        <span class="cliente-seguro">Validación en dos referencias</span>
      </section>
      <section class="cliente-vinculacion-grid">
        <form class="cliente-formulario-panel cliente-vincular-form" data-cliente-vincular>
          <label>Número de contenedor<input name="contenedor" required minlength="11" maxlength="14" placeholder="ABCD1234567" autocomplete="off"></label>
          <label>Booking o reserva<input name="booking" required minlength="4" maxlength="40" placeholder="BOOKING / RESERVA" autocomplete="off"></label>
          <label>Segunda referencia
            <select name="tipoDocumento" required>
              <option value="Bill of Lading">Bill of Lading</option>
              <option value="PIN de retiro">PIN de retiro</option>
              <option value="Referencia aduanera">Referencia aduanera</option>
            </select>
          </label>
          <label>Número de la segunda referencia<input name="documento" required minlength="4" maxlength="50" placeholder="BL / PIN / referencia" autocomplete="off"></label>
          <label class="cliente-confirmacion"><input type="checkbox" required> Confirmo que estoy autorizado para consultar esta carga y que los datos suministrados son correctos.</label>
          <button class="boton cliente-enviar" type="submit">Solicitar vinculación</button>
          <p class="cliente-mensaje" data-cliente-vincular-mensaje aria-live="polite"></p>
        </form>
        <aside class="cliente-proteccion">
          <span class="seccion-etiqueta">PROTECCIÓN DE INFORMACIÓN</span>
          <h4>Lo que GateFlow comprueba</h4>
          <ol>
            <li><b>Formato del contenedor</b><span>Cuatro letras y siete números.</span></li>
            <li><b>Coincidencia documental</b><span>Booking más BL, PIN o referencia aduanera.</span></li>
            <li><b>Confirmación del terminal</b><span>El seguimiento completo se habilita después de la validación.</span></li>
          </ol>
          <p>La segunda referencia se muestra enmascarada al cliente después de guardarla.</p>
        </aside>
      </section>`;

    panel.querySelector("[data-cliente-vincular]").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const datos = new FormData(evento.currentTarget);
      const boton = evento.currentTarget.querySelector("button[type='submit']");
      const mensaje = panel.querySelector("[data-cliente-vincular-mensaje]");
      boton.disabled = true;
      mensaje.textContent = "Registrando vinculación segura…";
      try {
        const respuesta = await GateFlowAcceso.api("/api/customer/cargo-links", { body: {
          container: String(datos.get("contenedor") || "").trim().toUpperCase(),
          bookingReference: String(datos.get("booking") || "").trim().toUpperCase(),
          documentType: String(datos.get("tipoDocumento") || ""),
          documentReference: String(datos.get("documento") || "").trim().toUpperCase(),
        } });
        evento.currentTarget.reset();
        mensaje.textContent = respuesta.message;
        mensaje.className = "cliente-mensaje ok";
        await cargarDatos();
        cambiarVista("seguimiento");
      } catch (error) {
        mensaje.textContent = error.message;
        mensaje.className = "cliente-mensaje error";
      } finally {
        boton.disabled = false;
      }
    });
  };

  const renderGestiones = (cargaPreferida = "") => {
    const elegibles = cargas.filter((carga) => CLIENTE_ESTADOS_GESTIONABLES.has(carga.status));
    panel.innerHTML = `
      <section class="cliente-seccion-cabecera">
        <div><span class="seccion-etiqueta">GESTIÓN DE MOVIMIENTO</span><h3>Coordinar cita y operación</h3><p>Solo una carga validada por la terminal puede generar una solicitud de movimiento.</p></div>
        <span class="cliente-seguro">Cuenta y carga verificadas</span>
      </section>
      <section class="cliente-paneles cliente-gestiones-grid">
        <article class="cliente-formulario-panel">
          ${elegibles.length ? `
            <form class="cliente-formulario" data-cliente-formulario>
              <label>Carga vinculada
                <select name="carga" required>
                  ${elegibles.map((carga) => `<option value="${GateFlowAcceso.escapar(carga.id)}" ${carga.id === cargaPreferida ? "selected" : ""}>${GateFlowAcceso.escapar(carga.container_number)} · ${GateFlowAcceso.escapar(carga.booking_reference)}</option>`).join("")}
                </select>
              </label>
              <label>Operación
                <select name="operacion" required>
                  <option value="Retiro de importación">Retiro de importación</option>
                  <option value="Entrega de exportación">Entrega de exportación</option>
                  <option value="Vacío / devolución">Vacío / devolución</option>
                  <option value="Doble transacción">Doble transacción</option>
                </select>
              </label>
              <label>Fecha preferida<input name="fecha" type="date" required min="${new Date().toISOString().slice(0, 10)}"></label>
              <label>Franja de llegada
                <select name="franja" required>
                  <option value="06:00–08:00">06:00–08:00</option><option value="08:00–10:00">08:00–10:00</option>
                  <option value="10:00–12:00">10:00–12:00</option><option value="13:00–15:00">13:00–15:00</option>
                  <option value="15:00–17:00">15:00–17:00</option><option value="17:00–19:00">17:00–19:00</option>
                </select>
              </label>
              <button class="boton cliente-enviar" type="submit">Enviar solicitud</button>
            </form>
            <p class="cliente-mensaje" data-cliente-mensaje aria-live="polite"></p>` : `
            <div class="cliente-vacio"><strong>No hay cargas habilitadas</strong><p>Vincula una carga y espera que la terminal valide la titularidad antes de solicitar una cita.</p><button type="button" class="boton" data-ir-vincular>Vincular carga</button></div>`}
        </article>
        <article class="cliente-solicitudes-panel">
          <div class="cliente-panel-cabecera"><div><span class="seccion-etiqueta">HISTORIAL</span><h3>Mis solicitudes</h3></div></div>
          <div class="cliente-solicitudes">
            ${solicitudes.length ? solicitudes.map((item) => `
              <article class="cliente-solicitud">
                <div><strong>${GateFlowAcceso.escapar(item.id)}</strong><span>${GateFlowAcceso.escapar(item.status)}</span></div>
                <p>${GateFlowAcceso.escapar(item.operation)} · ${GateFlowAcceso.escapar(item.container_number)}</p>
                <small>${GateFlowAcceso.escapar(item.preferred_date)} · ${GateFlowAcceso.escapar(item.time_slot)} · Ref. ${GateFlowAcceso.escapar(item.reference)}</small>
                <button type="button" data-cliente-continuar="${GateFlowAcceso.escapar(item.id)}">Continuar al expediente y Pase QR →</button>
              </article>`).join("") : `<div class="cliente-vacio"><strong>Sin gestiones creadas</strong><p>Las solicitudes de cita y movimiento aparecerán aquí.</p></div>`}
          </div>
        </article>
      </section>`;

    panel.querySelectorAll("[data-ir-vincular]").forEach((boton) => boton.addEventListener("click", () => cambiarVista("vincular")));
    panel.querySelectorAll("[data-cliente-continuar]").forEach((boton) => boton.addEventListener("click", () => {
      const solicitud = solicitudes.find((item) => item.id === boton.dataset.clienteContinuar);
      if (!solicitud) return;
      sessionStorage.setItem(CLIENTE_SOLICITUD_ACTIVA, JSON.stringify(solicitud));
      location.hash = "#pase";
    }));

    const formulario = panel.querySelector("[data-cliente-formulario]");
    if (formulario) formulario.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const datos = new FormData(evento.currentTarget);
      const carga = cargas.find((item) => item.id === datos.get("carga"));
      const boton = evento.currentTarget.querySelector("button[type='submit']");
      const mensaje = panel.querySelector("[data-cliente-mensaje]");
      boton.disabled = true;
      mensaje.textContent = "Guardando solicitud…";
      try {
        const respuesta = await GateFlowAcceso.api("/api/customer/requests", { body: {
          container: carga.container_number,
          reference: carga.booking_reference,
          operation: String(datos.get("operacion")),
          preferredDate: String(datos.get("fecha")),
          timeSlot: String(datos.get("franja")),
        } });
        mensaje.textContent = `${respuesta.message} Puedes continuar al expediente y Pase QR.`;
        mensaje.className = "cliente-mensaje ok";
        await cargarDatos();
        renderGestiones(carga.id);
      } catch (error) {
        mensaje.textContent = error.message;
        mensaje.className = "cliente-mensaje error";
      } finally {
        boton.disabled = false;
      }
    });
  };

  function cambiarVista(vista, cargaPreferida = "") {
    vistaActiva = vista;
    contenedor.querySelectorAll("[data-cliente-vista]").forEach((boton) => {
      const activo = boton.dataset.clienteVista === vista;
      boton.classList.toggle("activo", activo);
      if (activo) boton.setAttribute("aria-current", "page"); else boton.removeAttribute("aria-current");
    });
    if (vista === "vincular") renderVincular();
    else if (vista === "gestiones") renderGestiones(cargaPreferida);
    else renderSeguimiento();
  }

  async function cargarDatos() {
    const [cargasRespuesta, solicitudesRespuesta] = await Promise.all([
      GateFlowAcceso.api("/api/customer/cargo-links"),
      GateFlowAcceso.api("/api/customer/requests"),
    ]);
    cargas = Array.isArray(cargasRespuesta.cargo) ? cargasRespuesta.cargo : [];
    solicitudes = Array.isArray(solicitudesRespuesta.requests) ? solicitudesRespuesta.requests : [];
    pintarResumen();
  }

  contenedor.querySelector("[data-cliente-usuario]").textContent = usuario.nombre;
  contenedor.querySelector("[data-cliente-correo]").textContent = usuario.correo;
  contenedor.querySelector("[data-cliente-salir]").addEventListener("click", () => GateFlowAcceso.cerrarSesion(() => modulo.render(contenedor, estado)));
  contenedor.querySelectorAll("[data-cliente-vista]").forEach((boton) => boton.addEventListener("click", () => cambiarVista(boton.dataset.clienteVista)));

  panel.innerHTML = `<div class="cliente-vacio"><strong>Cargando tus operaciones…</strong><p>GateFlow está consultando tus cargas y gestiones protegidas.</p></div>`;
  try {
    await cargarDatos();
    cambiarVista(vistaActiva);
  } catch (error) {
    panel.innerHTML = `<div class="cliente-vacio cliente-error"><strong>No pudimos cargar tu cuenta</strong><p>${GateFlowAcceso.escapar(error.message)}</p></div>`;
  }
}

MODULOS.push({
  id: "cliente",
  titulo: "Customer User",
  dueno: "tejadaoperaciones-star",
  rama: "codex/tejada-simulador-cola",
  render: renderCustomerUser,
});
