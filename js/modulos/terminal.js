// =============================================================================
// Terminal User · centro de control operativo protegido de GateFlow
// =============================================================================

const TERMINAL_PLANES_CLAVE = "gateflow_planes_terminal_v1";
const TERMINAL_DWELL_ALIADO_URL = "https://osmarborel16-hub.github.io/Proyecto-semestral-de-mediciones-y-rendimiento-portuario/?v=c8d62d4&utm_source=gateflow&utm_medium=partner_link";
const TERMINAL_ESTADO = {
  vista: "resumen",
  carriles: 5,
  servicioMin: 4,
  demandaPicoPct: 0,
  tas: false,
  colaVirtual: false,
  doble: false,
  mensaje: "",
};

const TERMINAL_VISTAS = [
  { id: "resumen", nombre: "Dashboard" },
  { id: "llegadas", nombre: "Llegadas" },
  { id: "dwell", nombre: "Dwell Time · Aliado" },
  { id: "operacion", nombre: "Capacidad y cola" },
  { id: "ttt", nombre: "TTT" },
  { id: "citas", nombre: "Citas TAS" },
  { id: "mejora", nombre: "Mejora A3" },
];

function turnoTerminalActual() {
  const hora = new Date().getHours();
  if (hora >= 6 && hora < 14) return "Turno A · 06:00–14:00";
  if (hora >= 14 && hora < 22) return "Turno B · 14:00–22:00";
  return "Turno nocturno · 22:00–06:00";
}

function leerPlanesTerminal() {
  try { return JSON.parse(localStorage.getItem(TERMINAL_PLANES_CLAVE) || "[]"); }
  catch (_) { return []; }
}

function guardarPlanTerminal(plan) {
  const planes = leerPlanesTerminal();
  planes.push(plan);
  localStorage.setItem(TERMINAL_PLANES_CLAVE, JSON.stringify(planes.slice(-20)));
}

function escenarioControlTerminal() {
  const citas = typeof CITAS_ESTADO !== "undefined" ? CITAS_ESTADO : ESCENARIO_BASE.tas;
  return escenario({
    carriles: TERMINAL_ESTADO.carriles,
    servicioMin: TERMINAL_ESTADO.servicioMin,
    extraPicoPct: TERMINAL_ESTADO.demandaPicoPct,
    tas: {
      activo: TERMINAL_ESTADO.tas,
      modo: "dinamica",
      pctCita: citas.pctCita,
      puntualidad: citas.puntualidad,
      noShow: citas.noShow,
      flexibilidadH: citas.flexibilidadH,
    },
    colaVirtual: { activo: TERMINAL_ESTADO.colaVirtual, capacidadPreEst: 60 },
    doble: { activo: TERMINAL_ESTADO.doble, pct: 30 },
  });
}

function estadoOperacionTerminal(k) {
  const critico = k.horasDesborde > 0 || k.rhoPico >= 100;
  const advertencia = !critico && (k.wqPromedio > KPI.METAS.wq_min || k.rhoPico > KPI.METAS.rho_pct);
  return {
    clase: critico ? "critico" : advertencia ? "advertencia" : "estable",
    texto: critico ? "Atención operativa" : advertencia ? "Operación bajo vigilancia" : "Operación estable",
  };
}

function recomendacionesTerminal(actual, propuesta) {
  const alertas = [];
  if (propuesta.rhoPico > KPI.METAS.rho_pct) alertas.push({ tipo: "alta", titulo: "Capacidad insuficiente", texto: `La utilización proyectada queda en ${fmt(propuesta.rhoPico)} %. Aumente capacidad o distribuya las llegadas con citas.` });
  if (propuesta.wqPromedio > KPI.METAS.wq_min) alertas.push({ tipo: "media", titulo: "Espera sobre la meta", texto: `El escenario reduce la espera a ${fmt(propuesta.wqPromedio)} min, pero la meta es ${KPI.METAS.wq_min} min.` });
  if (propuesta.horasDesborde > 0) alertas.push({ tipo: "alta", titulo: "Riesgo en la vía pública", texto: `Todavía se proyectan ${fmt(propuesta.horasDesborde)} horas de desborde y hasta ${fmt(propuesta.viaPublicaMax)} camiones fuera del acceso.` });
  if (propuesta.tttPromedio > KPI.METAS.ttt_min) alertas.push({ tipo: "media", titulo: "TTT requiere intervención", texto: `El Truck Turn Time proyectado es ${fmt(propuesta.tttPromedio)} min frente a la meta de ${KPI.METAS.ttt_min} min.` });
  if (propuesta.wqPromedio > actual.wqPromedio || propuesta.lqMax > actual.lqMax) alertas.push({ tipo: "alta", titulo: "El cambio empeora la operación", texto: "No guarde este escenario como plan. Restablezca los controles o active medidas adicionales." });
  if (!alertas.length) alertas.push({ tipo: "ok", titulo: "Escenario dentro de las metas", texto: "Los indicadores principales quedan controlados. El plan puede pasar a revisión del supervisor." });
  return alertas;
}

function renderResumenTerminal(panel, estado, usuario) {
  const actual = simularDia(estado.dia, escenario());
  const propuesta = simularDia(estado.dia, escenarioControlTerminal());
  const dia = DATOS.dias[estado.dia - 1];
  const citasDia = DATOS.citas_piloto.find((item) => item.dia === estado.dia);
  const cumplimientoActual = KPI.cumplimientoCitas(citasDia.dentro_franja, citasDia.usadas);
  const noShowActual = KPI.noShow(citasDia.reservadas - citasDia.usadas, citasDia.reservadas);
  const cumplimiento = propuesta.cumplimiento ?? cumplimientoActual;
  const noShow = propuesta.noShow ?? noShowActual;
  const horaPico = propuesta.horaPico;
  const lambdaPico = propuesta.llegadas[horaPico];
  const capacidadPico = propuesta.capacidades[horaPico];
  const alertas = recomendacionesTerminal(actual, propuesta);
  const cumplePlan = propuesta.rhoPico <= KPI.METAS.rho_pct
    && propuesta.wqPromedio <= KPI.METAS.wq_min
    && propuesta.lqMax <= KPI.METAS.lq_max
    && propuesta.tttPromedio <= KPI.METAS.ttt_min
    && propuesta.horasDesborde <= KPI.METAS.desborde_h;
  const horas = registrosDelDia(estado.dia).filter((item) => item.hora >= 5 && item.hora <= 22).map((item) => item.hora);
  const planes = leerPlanesTerminal().slice(-3).reverse();

  const tarjeta = (nombre, simbolo, valor, detalle, cumple) => `
    <article class="terminal-kpi ${cumple ? "bien" : "fuera"}">
      <span>${nombre}${simbolo ? ` · ${simbolo}` : ""}</span><strong>${valor}</strong><small>${detalle}</small>
    </article>`;

  panel.innerHTML = `
    <section class="terminal-kpis terminal-kpis-completos" aria-label="Indicadores operativos del escenario">
      ${tarjeta("Llegadas en hora pico", "λ", `${fmt(lambdaPico)} cam/h`, `${horaTexto(horaPico)} · antes ${fmt(actual.llegadas[actual.horaPico])}`, lambdaPico <= capacidadPico)}
      ${tarjeta("Capacidad de garita", "μ·c", `${fmt(capacidadPico)} cam/h`, `${TERMINAL_ESTADO.carriles} ventanillas · ${fmt(TERMINAL_ESTADO.servicioMin, 1)} min`, capacidadPico >= lambdaPico)}
      ${tarjeta("Utilización", "ρ", `${fmt(propuesta.rhoPico)} %`, `Antes ${fmt(actual.rhoPico)} % · meta ≤ ${KPI.METAS.rho_pct} %`, propuesta.rhoPico <= KPI.METAS.rho_pct)}
      ${tarjeta("Cola máxima", "Lq", `${fmt(propuesta.lqMax)} cam.`, `Antes ${fmt(actual.lqMax)} · meta ≤ ${KPI.METAS.lq_max}`, propuesta.lqMax <= KPI.METAS.lq_max)}
      ${tarjeta("Espera promedio", "Wq", `${fmt(propuesta.wqPromedio)} min`, `Antes ${fmt(actual.wqPromedio)} · meta ≤ ${KPI.METAS.wq_min}`, propuesta.wqPromedio <= KPI.METAS.wq_min)}
      ${tarjeta("Truck Turn Time", "TTT", `${fmt(propuesta.tttPromedio)} min`, `Antes ${fmt(actual.tttPromedio)} · meta ≤ ${KPI.METAS.ttt_min}`, propuesta.tttPromedio <= KPI.METAS.ttt_min)}
      ${tarjeta("Desborde vial", "", `${fmt(propuesta.horasDesborde)} h`, `${fmt(propuesta.viaPublicaMax)} camiones fuera · meta 0`, propuesta.horasDesborde <= KPI.METAS.desborde_h)}
      ${tarjeta("Cumplimiento de citas", "", `${fmt(cumplimiento, 1)} %`, `No-show ${fmt(noShow, 1)} % · meta ≥ ${KPI.METAS.cumplimiento_pct} %`, cumplimiento >= KPI.METAS.cumplimiento_pct)}
    </section>

    <section class="terminal-operacion-grid">
      <article class="terminal-controles-panel">
        <div class="terminal-panel-cabecera"><div><span class="seccion-etiqueta">ESCENARIO OPERATIVO</span><h3>Probar cambios antes de decidir</h3></div><span class="terminal-dia">Día ${estado.dia} · ${dia.dia_semana}</span></div>
        <div class="terminal-controles">
          <label><span>Ventanillas abiertas <strong data-terminal-valor="carriles">${TERMINAL_ESTADO.carriles}</strong></span><input type="range" min="3" max="6" step="1" value="${TERMINAL_ESTADO.carriles}" data-terminal-control="carriles"></label>
          <label><span>Tiempo por atención <strong data-terminal-valor="servicioMin">${fmt(TERMINAL_ESTADO.servicioMin, 1)} min</strong></span><input type="range" min="2.5" max="6" step="0.5" value="${TERMINAL_ESTADO.servicioMin}" data-terminal-control="servicioMin"></label>
          <label><span>Variación de demanda pico <strong data-terminal-valor="demandaPicoPct">${TERMINAL_ESTADO.demandaPicoPct} %</strong></span><input type="range" min="-20" max="30" step="5" value="${TERMINAL_ESTADO.demandaPicoPct}" data-terminal-control="demandaPicoPct"></label>
        </div>
        <div class="terminal-palancas">
          <label><input type="checkbox" data-terminal-check="tas" ${TERMINAL_ESTADO.tas ? "checked" : ""}> Citas TAS dinámicas</label>
          <label><input type="checkbox" data-terminal-check="colaVirtual" ${TERMINAL_ESTADO.colaVirtual ? "checked" : ""}> Cola virtual</label>
          <label><input type="checkbox" data-terminal-check="doble" ${TERMINAL_ESTADO.doble ? "checked" : ""}> Doble transacción</label>
        </div>
        <div class="terminal-acciones-operacion">
          <button type="button" class="boton" data-terminal-recomendado>Usar recomendación</button>
          <button type="button" class="boton secundario" data-terminal-restablecer>Restablecer</button>
        </div>
        <p class="terminal-control-nota">Los controles recalculan el día completo con las fórmulas KPI del proyecto. No modifican sistemas oficiales.</p>
      </article>

      <article class="terminal-decision-panel">
        <span class="seccion-etiqueta">DECISIÓN DEL TURNO</span>
        <div class="terminal-decision ${cumplePlan ? "aprobable" : "revisar"}"><i></i><div><strong>${cumplePlan ? "Escenario listo para revisión" : "Ajuste adicional requerido"}</strong><p>${cumplePlan ? "Los cinco límites operativos principales cumplen la meta configurada." : `${alertas.filter((item) => item.tipo !== "ok").length} condiciones necesitan atención antes de aprobar el plan.`}</p></div></div>
        <div class="terminal-alertas">${alertas.map((alerta) => `<div class="terminal-alerta ${alerta.tipo}"><i></i><div><strong>${alerta.titulo}</strong><p>${alerta.texto}</p></div></div>`).join("")}</div>
        <button type="button" class="boton terminal-guardar-plan" data-terminal-guardar ${cumplePlan ? "" : "disabled"}>Guardar plan para aprobación</button>
        <p class="terminal-mensaje-plan" data-terminal-mensaje>${TERMINAL_ESTADO.mensaje}</p>
      </article>
    </section>

    <section class="terminal-paneles terminal-graficas-decision">
      <article class="terminal-grafico-panel">
        <div class="terminal-panel-cabecera"><div><span class="seccion-etiqueta">FLUJO Y COLA</span><h3>Llegadas, capacidad y cola por hora</h3></div></div>
        <div class="terminal-grafico"><canvas id="terminal-flujo-grafico"></canvas></div>
        <div class="terminal-leyenda"><span><i class="llegadas"></i>Llegadas</span><span><i class="capacidad"></i>Capacidad</span><span><i class="cola"></i>Cola proyectada</span></div>
      </article>
      <article class="terminal-grafico-panel">
        <div class="terminal-panel-cabecera"><div><span class="seccion-etiqueta">IMPACTO DE LA DECISIÓN</span><h3>Actual frente al escenario</h3></div></div>
        <div class="terminal-grafico"><canvas id="terminal-impacto-grafico"></canvas></div>
        <p class="terminal-control-nota">Las unidades se muestran en cada indicador: minutos, camiones, porcentaje y horas.</p>
      </article>
    </section>

    <section class="terminal-historial">
      <div class="terminal-panel-cabecera"><div><span class="seccion-etiqueta">TRAZABILIDAD</span><h3>Planes guardados para aprobación</h3></div></div>
      <div class="terminal-planes">${planes.length ? planes.map((plan) => `
        <article><div><strong>${GateFlowAcceso.escapar(plan.id)}</strong><span>${GateFlowAcceso.escapar(plan.estado)}</span></div><p>Día ${plan.dia} · ${plan.carriles} ventanillas · ${fmt(plan.servicioMin, 1)} min por atención</p><small>${GateFlowAcceso.escapar(plan.autor)} · ${new Date(plan.creado).toLocaleString("es-PA")}</small></article>`).join("") : `<p class="terminal-sin-planes">Todavía no hay planes guardados en este navegador.</p>`}</div>
    </section>
    <p class="terminal-referencia">Centro de decisión del prototipo académico GateFlow. Para operar en producción se requiere integración autorizada con los sistemas de la terminal.</p>`;

  panel.querySelectorAll("[data-terminal-control]").forEach((input) => {
    const clave = input.dataset.terminalControl;
    const salida = panel.querySelector(`[data-terminal-valor="${clave}"]`);
    input.addEventListener("input", () => {
      salida.textContent = clave === "carriles" ? input.value : clave === "servicioMin" ? `${Number(input.value).toFixed(1)} min` : `${input.value} %`;
    });
    input.addEventListener("change", () => {
      TERMINAL_ESTADO[clave] = Number(input.value);
      renderTerminalUser(panel.closest("#contenido-modulo") || panel.parentElement, estado);
    });
  });
  panel.querySelectorAll("[data-terminal-check]").forEach((input) => input.addEventListener("change", () => {
    TERMINAL_ESTADO[input.dataset.terminalCheck] = input.checked;
    renderTerminalUser(panel.closest("#contenido-modulo") || panel.parentElement, estado);
  }));
  panel.querySelector("[data-terminal-recomendado]").addEventListener("click", () => {
    Object.assign(TERMINAL_ESTADO, { carriles: 6, servicioMin: 3.5, demandaPicoPct: 0, tas: true, colaVirtual: true, doble: true, mensaje: "Recomendación cargada. Revise los KPI antes de guardar." });
    renderTerminalUser(panel.closest("#contenido-modulo") || panel.parentElement, estado);
  });
  panel.querySelector("[data-terminal-restablecer]").addEventListener("click", () => {
    Object.assign(TERMINAL_ESTADO, { carriles: 5, servicioMin: 4, demandaPicoPct: 0, tas: false, colaVirtual: false, doble: false, mensaje: "Escenario restablecido." });
    renderTerminalUser(panel.closest("#contenido-modulo") || panel.parentElement, estado);
  });
  panel.querySelector("[data-terminal-guardar]").addEventListener("click", () => {
    const plan = {
      id: `PLAN-${Date.now().toString(36).toUpperCase().slice(-7)}`,
      estado: "Pendiente de aprobación",
      dia: estado.dia,
      autor: usuario.nombre,
      usuarioId: usuario.id,
      carriles: TERMINAL_ESTADO.carriles,
      servicioMin: TERMINAL_ESTADO.servicioMin,
      demandaPicoPct: TERMINAL_ESTADO.demandaPicoPct,
      tas: TERMINAL_ESTADO.tas,
      colaVirtual: TERMINAL_ESTADO.colaVirtual,
      doble: TERMINAL_ESTADO.doble,
      kpi: { rhoPico: propuesta.rhoPico, wqPromedio: propuesta.wqPromedio, lqMax: propuesta.lqMax, tttPromedio: propuesta.tttPromedio, horasDesborde: propuesta.horasDesborde },
      creado: new Date().toISOString(),
    };
    guardarPlanTerminal(plan);
    TERMINAL_ESTADO.mensaje = `${plan.id} guardado para revisión del supervisor.`;
    renderTerminalUser(panel.closest("#contenido-modulo") || panel.parentElement, estado);
  });

  crearGrafico("terminal-flujo-grafico", {
    type: "bar",
    data: {
      labels: horas.map(horaTexto),
      datasets: [
        { label: "Llegadas", data: horas.map((hora) => propuesta.llegadas[hora]), backgroundColor: "rgba(243,179,64,.78)", borderRadius: 4, maxBarThickness: 22, yAxisID: "y" },
        { type: "line", label: "Capacidad", data: horas.map((hora) => propuesta.capacidades[hora]), borderColor: "#65d3c9", backgroundColor: "#65d3c9", pointRadius: 2, tension: .25, yAxisID: "y" },
        { type: "line", label: "Cola", data: horas.map((hora) => propuesta.colas[hora]), borderColor: "#f46b6b", backgroundColor: "rgba(244,107,107,.16)", fill: true, pointRadius: 2, tension: .25, yAxisID: "yCola" },
      ],
    },
    options: {
      plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 9, color: "rgba(255,255,255,.62)" } },
        y: { beginAtZero: true, position: "left", title: { display: true, text: "camiones/h", color: "rgba(255,255,255,.55)" }, grid: { color: "rgba(255,255,255,.08)" }, ticks: { color: "rgba(255,255,255,.62)" } },
        yCola: { beginAtZero: true, position: "right", title: { display: true, text: "cola", color: "rgba(255,255,255,.55)" }, grid: { drawOnChartArea: false }, ticks: { color: "rgba(255,255,255,.62)" } },
      },
    },
  });

  crearGrafico("terminal-impacto-grafico", {
    type: "bar",
    data: {
      labels: ["Espera", "Cola", "Utilización", "TTT", "Desborde"],
      datasets: [
        { label: "Actual", data: [actual.wqPromedio, actual.lqMax, actual.rhoPico, actual.tttPromedio, actual.horasDesborde], backgroundColor: "rgba(255,255,255,.25)", borderRadius: 5 },
        { label: "Escenario", data: [propuesta.wqPromedio, propuesta.lqMax, propuesta.rhoPico, propuesta.tttPromedio, propuesta.horasDesborde], backgroundColor: "rgba(101,211,201,.78)", borderRadius: 5 },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { labels: { color: "rgba(255,255,255,.70)" } } },
      scales: {
        x: { beginAtZero: true, grid: { color: "rgba(255,255,255,.08)" }, ticks: { color: "rgba(255,255,255,.62)" } },
        y: { grid: { display: false }, ticks: { color: "rgba(255,255,255,.72)" } },
      },
    },
  });
}

function renderAnalisisTerminal(panel, vista, estado) {
  const mapa = { llegadas: "llegadas", operacion: "simulador", ttt: "ttt", citas: "citas", mejora: "mejora" };
  const modulo = MODULOS.find((item) => item.id === mapa[vista]);
  panel.className = "terminal-vista terminal-modulo-embebido";
  if (!modulo) {
    panel.innerHTML = "<p>No se encontró el área operativa solicitada.</p>";
    return;
  }
  modulo.render.call(modulo, panel, estado);
}

function renderDwellAliadoTerminal(panel) {
  panel.className = "terminal-vista terminal-aliado-vista";
  panel.innerHTML = `
    <section class="terminal-aliado">
      <div class="terminal-aliado-contenido">
        <span class="seccion-etiqueta">PROYECTO ALIADO · PATIO EN FLUJO</span>
        <h3>Dwell Time y ocupación del patio</h3>
        <p>GateFlow se conecta con el dashboard del equipo aliado para consultar permanencia de contenedores, antigüedad, densidad del patio y planificación de camiones sin duplicar esos análisis dentro de esta plataforma.</p>
        <div class="terminal-aliado-alcance" aria-label="Relación entre los proyectos">
          <article><span>01</span><div><strong>Patio en Flujo</strong><small>Explica cuánto tiempo permanecen los contenedores y qué categorías presionan el patio.</small></div></article>
          <article><span>02</span><div><strong>GateFlow</strong><small>Convierte la demanda de retiro en citas, fila virtual, notificaciones y autorización QR.</small></div></article>
          <article><span>03</span><div><strong>Decisión conectada</strong><small>La terminal puede revisar el patio y regresar a GateFlow para coordinar el acceso de los camiones.</small></div></article>
        </div>
        <div class="terminal-aliado-acciones">
          <a class="boton terminal-aliado-abrir" href="${TERMINAL_DWELL_ALIADO_URL}" target="_blank" rel="noopener noreferrer">Abrir dashboard Dwell Time <span aria-hidden="true">↗</span></a>
          <a class="terminal-aliado-volver" href="#pase">Ir al Pase QR de GateFlow</a>
        </div>
        <p class="terminal-aliado-nota">Recurso externo de referencia. El dashboard aliado identifica sus datos como simulados y conserva su propia metodología y autoría.</p>
      </div>
      <aside class="terminal-aliado-ficha" aria-label="Complemento operativo">
        <span>CONEXIÓN OPERATIVA</span>
        <strong>Patio → camiones → gate</strong>
        <p>Dwell Time determina la presión de retiro. GateFlow organiza cuándo debe acercarse cada camión.</p>
        <div><i></i> Enlace verificado</div>
      </aside>
    </section>`;
}

function renderTerminalUser(contenedor, estado) {
  const modulo = MODULOS.find((item) => item.id === "terminal");
  const usuario = GateFlowAcceso.usuarioActual("terminal");
  if (!usuario) {
    GateFlowAcceso.mostrarAcceso(contenedor, "terminal", () => modulo.render(contenedor, estado));
    return;
  }

  const actual = simularDia(estado.dia, escenario());
  const estadoOperacion = estadoOperacionTerminal(actual);
  const vistaValida = TERMINAL_VISTAS.some((item) => item.id === TERMINAL_ESTADO.vista);
  if (!vistaValida) TERMINAL_ESTADO.vista = "resumen";

  contenedor.innerHTML = `
    <section class="terminal-hero">
      <div><span class="seccion-etiqueta">GATEFLOW · CONTROL OPERATIVO</span><h2>Terminal User</h2><p>Dashboard protegido para analizar indicadores, probar cambios y preparar decisiones del turno.</p></div>
      <div class="terminal-sesion"><span class="terminal-estado ${estadoOperacion.clase}"><i></i>${estadoOperacion.texto}</span><strong data-terminal-usuario></strong><small>${turnoTerminalActual()}</small><button type="button" data-terminal-salir>Cerrar sesión</button></div>
    </section>
    <nav class="terminal-subnav" aria-label="Áreas de Terminal User">
      ${TERMINAL_VISTAS.map((vista) => `<button type="button" class="${vista.id === TERMINAL_ESTADO.vista ? "activo" : ""}" data-terminal-vista="${vista.id}">${vista.nombre}</button>`).join("")}
    </nav>
    <section class="terminal-vista" data-terminal-contenido></section>`;

  contenedor.querySelector("[data-terminal-usuario]").textContent = usuario.nombre;
  contenedor.querySelector("[data-terminal-salir]").addEventListener("click", () => GateFlowAcceso.cerrarSesion(() => modulo.render(contenedor, estado)));
  contenedor.querySelectorAll("[data-terminal-vista]").forEach((boton) => boton.addEventListener("click", () => {
    TERMINAL_ESTADO.vista = boton.dataset.terminalVista;
    modulo.render(contenedor, estado);
  }));

  const panel = contenedor.querySelector("[data-terminal-contenido]");
  if (TERMINAL_ESTADO.vista === "resumen") renderResumenTerminal(panel, estado, usuario);
  else if (TERMINAL_ESTADO.vista === "dwell") renderDwellAliadoTerminal(panel);
  else renderAnalisisTerminal(panel, TERMINAL_ESTADO.vista, estado);
}

MODULOS.push({
  id: "terminal",
  titulo: "Terminal User",
  dueno: "tejadaoperaciones-star",
  rama: "codex/tejada-simulador-cola",
  render: renderTerminalUser,
});
