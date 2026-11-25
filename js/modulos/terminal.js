// =============================================================================
// Terminal User · centro de control operativo de GateFlow
// =============================================================================

function turnoTerminalActual() {
  const hora = new Date().getHours();
  if (hora >= 6 && hora < 14) return "Turno A · 06:00–14:00";
  if (hora >= 14 && hora < 22) return "Turno B · 14:00–22:00";
  return "Turno nocturno · 22:00–06:00";
}

function renderTerminalUser(contenedor, estado) {
  const modulo = MODULOS.find((item) => item.id === "terminal");
  const usuario = GateFlowAcceso.usuarioActual("terminal");
  if (!usuario) {
    GateFlowAcceso.mostrarAcceso(contenedor, "terminal", () => modulo.render(contenedor, estado));
    return;
  }

  const registros = registrosDelDia(estado.dia);
  const k = kpiDelDia(registros);
  const propuesta = simularDia(estado.dia, escPropuesta());
  const dia = DATOS.dias[estado.dia - 1];
  const citas = DATOS.citas_piloto.find((item) => item.dia === estado.dia);
  const cumplimiento = KPI.cumplimientoCitas(citas.dentro_franja, citas.usadas);
  const noShow = KPI.noShow(citas.reservadas - citas.usadas, citas.reservadas);
  const servicio = promedio(registros.filter((item) => item.garita_abierta).map((item) => item.servicio_min));
  const carrilesPico = registros[k.horaPico]?.carriles_abiertos ?? 5;
  const critico = k.horasDesborde > 0 || k.rhoPico >= 100;
  const advertencia = !critico && (k.wqPromedio > KPI.METAS.wq_min || k.rhoPico > KPI.METAS.rho_pct);
  const estadoClase = critico ? "critico" : advertencia ? "advertencia" : "estable";
  const estadoTexto = critico ? "Atención operativa" : advertencia ? "Operación bajo vigilancia" : "Operación estable";
  const horas = registros.filter((item) => item.hora >= 5 && item.hora <= 22).map((item) => item.hora);

  const alertas = [];
  if (k.rhoPico > KPI.METAS.rho_pct) alertas.push({ tipo: "alta", titulo: "Capacidad en hora pico", texto: `La utilización alcanza ${fmt(k.rhoPico)} % a las ${horaTexto(k.horaPico)}. Evaluar la sexta ventanilla.` });
  if (k.horasDesborde > 0) alertas.push({ tipo: "alta", titulo: "Riesgo en la vía pública", texto: `${fmt(k.horasDesborde)} horas presentan desborde y hasta ${fmt(k.viaPublicaMax)} camiones quedarían fuera del acceso.` });
  if (k.tttPromedio > KPI.METAS.ttt_min) alertas.push({ tipo: "media", titulo: "Truck Turn Time sobre meta", texto: `El recorrido total promedia ${fmt(k.tttPromedio)} min frente a la meta de ${KPI.METAS.ttt_min} min.` });
  if (noShow > KPI.METAS.noshow_pct) alertas.push({ tipo: "media", titulo: "Citas sin utilizar", texto: `El no-show es ${fmt(noShow, 1)} %. Confirmar citas antes de liberar capacidad.` });
  if (!alertas.length) alertas.push({ tipo: "ok", titulo: "Sin alertas críticas", texto: "La garita opera dentro de las metas configuradas para el día seleccionado." });

  contenedor.innerHTML = `
    <section class="terminal-hero">
      <div>
        <span class="seccion-etiqueta">GATEFLOW · CONTROL OPERATIVO</span>
        <h2>Terminal User</h2>
        <p>Vista integral de llegadas, capacidad de garita, cola, citas y tiempo total del camión.</p>
      </div>
      <div class="terminal-sesion">
        <span class="terminal-estado ${estadoClase}"><i></i>${estadoTexto}</span>
        <strong data-terminal-usuario></strong>
        <small>${turnoTerminalActual()}</small>
        <button type="button" data-terminal-salir>Cerrar sesión</button>
      </div>
    </section>

    <section class="terminal-kpis" aria-label="Indicadores operativos">
      <article class="terminal-kpi ${k.rhoPico > KPI.METAS.rho_pct ? "fuera" : "bien"}"><span>Utilización de garita</span><strong>${fmt(k.rhoPico)} %</strong><small>Meta ≤ ${KPI.METAS.rho_pct} % · ${horaTexto(k.horaPico)}</small></article>
      <article class="terminal-kpi ${k.wqPromedio > KPI.METAS.wq_min ? "fuera" : "bien"}"><span>Espera promedio</span><strong>${fmt(k.wqPromedio)} min</strong><small>Meta ≤ ${KPI.METAS.wq_min} min</small></article>
      <article class="terminal-kpi ${k.lqMax > KPI.METAS.lq_max ? "fuera" : "bien"}"><span>Cola máxima</span><strong>${fmt(k.lqMax)}</strong><small>camiones · capacidad ${KPI.METAS.lq_max}</small></article>
      <article class="terminal-kpi ${k.horasDesborde > 0 ? "fuera" : "bien"}"><span>Desborde</span><strong>${fmt(k.horasDesborde)} h</strong><small>${fmt(k.viaPublicaMax)} camiones fuera del acceso</small></article>
      <article class="terminal-kpi ${k.tttPromedio > KPI.METAS.ttt_min ? "fuera" : "bien"}"><span>Truck Turn Time</span><strong>${fmt(k.tttPromedio)} min</strong><small>Meta ≤ ${KPI.METAS.ttt_min} min</small></article>
      <article class="terminal-kpi ${cumplimiento < KPI.METAS.cumplimiento_pct ? "fuera" : "bien"}"><span>Cumplimiento de citas</span><strong>${fmt(cumplimiento, 1)} %</strong><small>No-show ${fmt(noShow, 1)} %</small></article>
    </section>

    <section class="terminal-paneles">
      <article class="terminal-grafico-panel">
        <div class="terminal-panel-cabecera">
          <div><span class="seccion-etiqueta">FLUJO HORARIO</span><h3>Llegadas frente a capacidad</h3></div>
          <span class="terminal-dia">Día ${estado.dia} · ${dia.dia_semana}${dia.dia_buque ? " · operación de buque" : ""}</span>
        </div>
        <div class="terminal-grafico"><canvas id="terminal-flujo-grafico"></canvas></div>
        <div class="terminal-leyenda"><span><i class="llegadas"></i>Llegadas</span><span><i class="capacidad"></i>Capacidad de garita</span></div>
      </article>

      <article class="terminal-alertas-panel">
        <div class="terminal-panel-cabecera"><div><span class="seccion-etiqueta">CENTRO DE ALERTAS</span><h3>Decisiones del turno</h3></div></div>
        <div class="terminal-alertas">${alertas.map((alerta) => `<div class="terminal-alerta ${alerta.tipo}"><i></i><div><strong>${alerta.titulo}</strong><p>${alerta.texto}</p></div></div>`).join("")}</div>
        <div class="terminal-proyeccion"><span>Con la estrategia GateFlow</span><strong>${fmt(propuesta.wqPromedio)} min</strong><small>espera estimada · hoy ${fmt(k.wqPromedio)} min</small></div>
      </article>
    </section>

    <div class="terminal-seccion-titulo"><div><span class="seccion-etiqueta">OPERACIÓN COMPLETA</span><h3>Áreas de control</h3></div><p>Abre cada área para consultar detalles o ajustar la operación.</p></div>
    <section class="terminal-areas">
      <a href="#llegadas"><span>01</span><strong>Llegadas</strong><small>${fmt(dia.llegadas)} camiones programados · pico ${horaTexto(k.horaPico)}</small><b>Ver perfil →</b></a>
      <a href="#simulador"><span>02</span><strong>Garita y capacidad</strong><small>${carrilesPico} de 6 ventanillas · ${fmt(servicio, 1)} min por atención</small><b>Ajustar capacidad →</b></a>
      <a href="#mapa"><span>03</span><strong>Cola y vía pública</strong><small>Máximo ${fmt(k.lqMax)} camiones · ${fmt(k.horasDesborde)} h de desborde</small><b>Ver recorrido →</b></a>
      <a href="#ttt"><span>04</span><strong>Truck Turn Time</strong><small>${fmt(k.tttPromedio)} min entre llegada, patio y salida</small><b>Analizar etapas →</b></a>
      <a href="#citas"><span>05</span><strong>Citas TAS</strong><small>${fmt(cumplimiento, 1)} % dentro de la franja asignada</small><b>Gestionar franjas →</b></a>
      <a href="#mejora"><span>06</span><strong>Mejora continua</strong><small>Causa raíz, acciones Lean y metas operativas</small><b>Consultar A3 →</b></a>
    </section>
    <p class="terminal-referencia">Valores operativos de referencia para el prototipo académico GateFlow.</p>`;

  contenedor.querySelector("[data-terminal-usuario]").textContent = usuario.nombre;
  contenedor.querySelector("[data-terminal-salir]").addEventListener("click", () => {
    GateFlowAcceso.cerrarSesion(() => modulo.render(contenedor, estado));
  });

  crearGrafico("terminal-flujo-grafico", {
    type: "bar",
    data: {
      labels: horas.map(horaTexto),
      datasets: [
        { label: "Llegadas", data: horas.map((hora) => k.llegadas[hora]), backgroundColor: "rgba(243,179,64,.82)", borderRadius: 5, maxBarThickness: 24 },
        { label: "Capacidad", data: horas.map((hora) => k.capacidades[hora]), backgroundColor: "rgba(101,211,201,.64)", borderRadius: 5, maxBarThickness: 24 },
      ],
    },
    options: {
      plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
      scales: {
        x: { stacked: false, grid: { display: false }, ticks: { maxTicksLimit: 9, color: "rgba(255,255,255,.62)" } },
        y: { beginAtZero: true, grid: { color: "rgba(255,255,255,.08)" }, ticks: { color: "rgba(255,255,255,.62)" } },
      },
    },
  });
}

MODULOS.push({
  id: "terminal",
  titulo: "Terminal User",
  dueno: "tejadaoperaciones-star",
  rama: "codex/tejada-simulador-cola",
  render: renderTerminalUser,
});
