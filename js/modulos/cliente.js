// =============================================================================
// Customer User · portal de solicitudes, citas y pases GateFlow
// =============================================================================

const CLIENTE_SOLICITUD_ACTIVA = "gateflow_solicitud_activa_v1";

function renderCustomerUser(contenedor, estado) {
  const modulo = MODULOS.find((item) => item.id === "cliente");
  const usuario = GateFlowAcceso.usuarioActual("cliente");
  if (!usuario) {
    GateFlowAcceso.mostrarAcceso(contenedor, "cliente", () => modulo.render(contenedor, estado));
    return;
  }

  const registros = registrosDelDia(estado.dia);
  const k = kpiDelDia(registros);
  const dia = DATOS.dias[estado.dia - 1];
  const citas = DATOS.citas_piloto.find((item) => item.dia === estado.dia);
  const cumplimiento = KPI.cumplimientoCitas(citas.dentro_franja, citas.usadas);
  let solicitudes = [];
  const estadoGarita = k.rhoPico > 100 ? "Alta demanda" : k.rhoPico > KPI.METAS.rho_pct ? "Demanda moderada" : "Flujo disponible";

  contenedor.innerHTML = `
    <section class="cliente-hero">
      <div>
        <span class="seccion-etiqueta">GATEFLOW · PORTAL DE SERVICIO</span>
        <h2>Customer User</h2>
        <p>Organiza el retiro o entrega de carga, solicita una franja y prepara tu pase en un solo recorrido.</p>
      </div>
      <div class="cliente-sesion">
        <span>Cuenta activa</span>
        <strong data-cliente-usuario></strong>
        <small data-cliente-correo></small>
        <button type="button" data-cliente-salir>Cerrar sesión</button>
      </div>
    </section>

    <section class="cliente-resumen" aria-label="Estado del servicio">
      <article><span>Estado de garita</span><strong>${estadoGarita}</strong><small>Día ${estado.dia} · pico ${horaTexto(k.horaPico)}</small></article>
      <article><span>Espera de referencia</span><strong>${fmt(k.wqPromedio)} min</strong><small>Antes de ingresar a la terminal</small></article>
      <article><span>Cumplimiento de citas</span><strong>${fmt(cumplimiento, 1)} %</strong><small>Referencia del piloto TAS</small></article>
      <article><span>Mis solicitudes</span><strong data-cliente-total>—</strong><small data-cliente-pendientes>Cargando movimientos</small></article>
    </section>

    <section class="cliente-ruta" aria-label="Ruta de servicio GateFlow">
      <div><span>1</span><strong>Solicita</strong><small>Registra el contenedor y la operación.</small></div>
      <i aria-hidden="true">→</i>
      <div><span>2</span><strong>Coordina</strong><small>Selecciona fecha y franja de llegada.</small></div>
      <i aria-hidden="true">→</i>
      <div><span>3</span><strong>Valida</strong><small>Consolida cita, naviera, Aduanas y terminal.</small></div>
      <i aria-hidden="true">→</i>
      <div><span>4</span><strong>Accede</strong><small>Presenta el QR autorizado en la garita.</small></div>
    </section>

    <section class="cliente-paneles">
      <article class="cliente-formulario-panel">
        <div class="cliente-panel-cabecera">
          <div><span class="seccion-etiqueta">NUEVA GESTIÓN</span><h3>Solicitud de movimiento</h3></div>
          <span class="cliente-seguro">Canal protegido</span>
        </div>
        <form class="cliente-formulario" data-cliente-formulario>
          <label>Contenedor<input name="contenedor" required minlength="11" maxlength="14" placeholder="ABCD1234567" autocomplete="off"></label>
          <label>Booking o referencia<input name="referencia" required maxlength="24" placeholder="Reserva / BL" autocomplete="off"></label>
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
              <option value="06:00–08:00">06:00–08:00</option>
              <option value="08:00–10:00">08:00–10:00</option>
              <option value="10:00–12:00">10:00–12:00</option>
              <option value="13:00–15:00">13:00–15:00</option>
              <option value="15:00–17:00">15:00–17:00</option>
              <option value="17:00–19:00">17:00–19:00</option>
            </select>
          </label>
          <button class="boton cliente-enviar" type="submit">Enviar solicitud</button>
        </form>
        <p class="cliente-mensaje" data-cliente-mensaje aria-live="polite"></p>
      </article>

      <article class="cliente-solicitudes-panel">
        <div class="cliente-panel-cabecera"><div><span class="seccion-etiqueta">SEGUIMIENTO</span><h3>Mis movimientos</h3></div></div>
        <div class="cliente-solicitudes" data-cliente-lista></div>
      </article>
    </section>

    <section class="cliente-acciones">
      <a href="#cliente" data-cliente-enfoque><span>Calendario</span><strong>Solicitar una franja</strong><small>Selecciona fecha y horario dentro de tu solicitud de movimiento.</small><b>Completar solicitud ↑</b></a>
      <a href="#pase"><span>Acceso expedito</span><strong>Completar expediente y Pase QR</strong><small>Consolida las validaciones requeridas para la garita.</small><b>Preparar pase →</b></a>
      <a href="#mapa"><span>Antes de salir</span><strong>Ver acceso al Puerto de Balboa</strong><small>Consulta el recorrido, la zona y el estado de referencia.</small><b>Abrir mapa →</b></a>
    </section>
    <p class="cliente-referencia">Las solicitudes se guardan en la cuenta Customer User y quedan disponibles al volver a iniciar sesión. La conexión con sistemas oficiales de naviera, Aduanas y terminal requiere autorización de cada entidad.</p>`;

  const pintarLista = () => {
    const lista = contenedor.querySelector("[data-cliente-lista]");
    contenedor.querySelector("[data-cliente-total]").textContent = solicitudes.length;
    const pendientes = solicitudes.filter((item) => item.status === "Pendiente de validación").length;
    contenedor.querySelector("[data-cliente-pendientes]").textContent = `${pendientes} ${pendientes === 1 ? "pendiente" : "pendientes"}`;
    lista.innerHTML = solicitudes.length ? solicitudes.map((item) => `
      <article class="cliente-solicitud">
        <div><strong>${GateFlowAcceso.escapar(item.id)}</strong><span>${GateFlowAcceso.escapar(item.status)}</span></div>
        <p>${GateFlowAcceso.escapar(item.operation)} · ${GateFlowAcceso.escapar(item.container_number)}</p>
        <small>${GateFlowAcceso.escapar(item.preferred_date)} · ${GateFlowAcceso.escapar(item.time_slot)} · Ref. ${GateFlowAcceso.escapar(item.reference)}</small>
        <button type="button" data-cliente-continuar="${GateFlowAcceso.escapar(item.id)}">Continuar al expediente y Pase QR →</button>
      </article>`).join("") : `
      <div class="cliente-vacio"><strong>Aún no tienes movimientos</strong><p>Crea tu primera solicitud para comenzar el trámite unificado.</p></div>`;

    lista.querySelectorAll("[data-cliente-continuar]").forEach((boton) => boton.addEventListener("click", () => {
      const solicitud = solicitudes.find((item) => item.id === boton.dataset.clienteContinuar);
      if (!solicitud) return;
      sessionStorage.setItem(CLIENTE_SOLICITUD_ACTIVA, JSON.stringify(solicitud));
      location.hash = "#pase";
    }));
  };

  const cargarSolicitudes = async () => {
    const lista = contenedor.querySelector("[data-cliente-lista]");
    lista.innerHTML = `<div class="cliente-vacio"><strong>Cargando movimientos…</strong><p>Consultando tu cuenta GateFlow.</p></div>`;
    try {
      const datos = await GateFlowAcceso.api("/api/customer/requests");
      solicitudes = Array.isArray(datos.requests) ? datos.requests : [];
      pintarLista();
    } catch (error) {
      lista.innerHTML = `<div class="cliente-vacio cliente-error"><strong>No pudimos cargar tus movimientos</strong><p>${GateFlowAcceso.escapar(error.message)}</p></div>`;
      contenedor.querySelector("[data-cliente-total]").textContent = "—";
      contenedor.querySelector("[data-cliente-pendientes]").textContent = "Intenta nuevamente";
    }
  };

  contenedor.querySelector("[data-cliente-usuario]").textContent = usuario.nombre;
  contenedor.querySelector("[data-cliente-correo]").textContent = usuario.correo;
  contenedor.querySelector("[data-cliente-salir]").addEventListener("click", () => {
    GateFlowAcceso.cerrarSesion(() => modulo.render(contenedor, estado));
  });
  contenedor.querySelector("[data-cliente-enfoque]").addEventListener("click", (evento) => {
    evento.preventDefault();
    contenedor.querySelector("[data-cliente-formulario]").scrollIntoView({ behavior: "smooth", block: "center" });
    contenedor.querySelector("[name='contenedor']").focus({ preventScroll: true });
  });
  contenedor.querySelector("[data-cliente-formulario]").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const boton = evento.currentTarget.querySelector("button[type='submit']");
    const mensaje = contenedor.querySelector("[data-cliente-mensaje]");
    boton.disabled = true;
    mensaje.textContent = "Guardando solicitud…";
    try {
      const respuesta = await GateFlowAcceso.api("/api/customer/requests", { body: {
        container: String(datos.get("contenedor")).trim().toUpperCase(),
        reference: String(datos.get("referencia")).trim().toUpperCase(),
        operation: String(datos.get("operacion")),
        preferredDate: String(datos.get("fecha")),
        timeSlot: String(datos.get("franja")),
      } });
      evento.currentTarget.reset();
      mensaje.textContent = `${respuesta.message} Ahora puedes continuar al expediente y Pase QR.`;
      await cargarSolicitudes();
    } catch (error) {
      mensaje.textContent = error.message;
    } finally {
      boton.disabled = false;
    }
  });

  cargarSolicitudes();
}

MODULOS.push({
  id: "cliente",
  titulo: "Customer User",
  dueno: "tejadaoperaciones-star",
  rama: "codex/tejada-simulador-cola",
  render: renderCustomerUser,
});
