// =============================================================================
// Customer User · portal de solicitudes, citas y pases GateFlow
// =============================================================================

const CLIENTE_SOLICITUDES_CLAVE = "gateflow_solicitudes_cliente_v1";

function leerSolicitudesCliente() {
  try { return JSON.parse(localStorage.getItem(CLIENTE_SOLICITUDES_CLAVE) || "[]"); }
  catch (_) { return []; }
}

function guardarSolicitudesCliente(solicitudes) {
  localStorage.setItem(CLIENTE_SOLICITUDES_CLAVE, JSON.stringify(solicitudes));
}

function idSolicitudCliente() {
  return `GFR-${Date.now().toString(36).toUpperCase().slice(-7)}`;
}

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
  const solicitudes = leerSolicitudesCliente().filter((item) => item.usuarioId === usuario.id);
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
      <article><span>Mis solicitudes</span><strong>${solicitudes.length}</strong><small>${solicitudes.filter((item) => item.estado === "Pendiente de validación").length} pendientes</small></article>
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
    <p class="cliente-referencia">Portal funcional de demostración. Las solicitudes permanecen en este navegador y no se envían a sistemas oficiales.</p>`;

  const pintarLista = () => {
    const lista = contenedor.querySelector("[data-cliente-lista]");
    const propias = leerSolicitudesCliente().filter((item) => item.usuarioId === usuario.id).reverse();
    lista.innerHTML = propias.length ? propias.map((item) => `
      <article class="cliente-solicitud">
        <div><strong>${GateFlowAcceso.escapar(item.id)}</strong><span>${GateFlowAcceso.escapar(item.estado)}</span></div>
        <p>${GateFlowAcceso.escapar(item.operacion)} · ${GateFlowAcceso.escapar(item.contenedor)}</p>
        <small>${GateFlowAcceso.escapar(item.fecha)} · ${GateFlowAcceso.escapar(item.franja)} · Ref. ${GateFlowAcceso.escapar(item.referencia)}</small>
      </article>`).join("") : `
      <div class="cliente-vacio"><strong>Aún no tienes movimientos</strong><p>Crea tu primera solicitud para comenzar el trámite unificado.</p></div>`;
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
  contenedor.querySelector("[data-cliente-formulario]").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const todas = leerSolicitudesCliente();
    todas.push({
      id: idSolicitudCliente(),
      usuarioId: usuario.id,
      contenedor: String(datos.get("contenedor")).trim().toUpperCase(),
      referencia: String(datos.get("referencia")).trim().toUpperCase(),
      operacion: String(datos.get("operacion")),
      fecha: String(datos.get("fecha")),
      franja: String(datos.get("franja")),
      estado: "Pendiente de validación",
      creado: new Date().toISOString(),
    });
    guardarSolicitudesCliente(todas);
    evento.currentTarget.reset();
    contenedor.querySelector("[data-cliente-mensaje]").textContent = "Solicitud registrada. El siguiente paso es completar las validaciones y generar el Pase QR.";
    pintarLista();
  });

  pintarLista();
}

MODULOS.push({
  id: "cliente",
  titulo: "Customer User",
  dueno: "tejadaoperaciones-star",
  rama: "codex/tejada-simulador-cola",
  render: renderCustomerUser,
});
