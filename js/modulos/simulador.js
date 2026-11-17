// =============================================================================
// Módulo 2 · Simulador de cola
// Abierto a todo el grupo · Rama: mejora-simulador
// -----------------------------------------------------------------------------
// El usuario cambia carriles, tiempo de servicio, llegadas en hora pico y la
// capacidad de la vía de acceso. Se recalcula la cola hora por hora con
// Cola(t+1) = máx[0; Cola(t) + λ(t) − μc], Wq (Little) y ρ (js/kpi.js), usando
// simularDia de js/escenarios.js.
// =============================================================================

const SIM_ESTADO = {
  carriles: 5,
  servicioMin: null,   // null = el promedio real del día (no se toca)
  extraPicoPct: 0,
  capacidadVia: 40,
};

// Carriles mínimos para que ρ quede ≤ meta en la hora pico de un día
function carrilesNecesarios(dia, servicioMin, extraPicoPct) {
  for (let c = 1; c <= 12; c++) {
    const k = simularDia(dia, escenario({ carriles: c, servicioMin, extraPicoPct }));
    if (k.rhoPico <= KPI.METAS.rho_pct) return { carriles: c, kpi: k };
  }
  return { carriles: null };
}

MODULOS.push({
  id: "simulador",
  titulo: "Simulador de cola",
  dueno: "Todo el grupo",
  rama: "mejora-simulador",

  render(contenedor, estado) {
    const regs = registrosDelDia(estado.dia);
    const servReal = promedio(regs.filter((r) => r.garita_abierta).map((r) => r.servicio_min));
    const serv = SIM_ESTADO.servicioMin ?? Math.round(servReal * 10) / 10;

    contenedor.innerHTML = `
      <h2>2 · Simulador de cola</h2>
      <div class="rejilla-2">
        <div class="panel-control">
          <h3>Escenario (controles)</h3>
          ${htmlSlider("sim-carriles", "Carriles de garita abiertos", 1, 6, 1, SIM_ESTADO.carriles)}
          ${htmlSlider("sim-servicio", "Tiempo de servicio promedio", 2, 6, 0.1, serv, " min")}
          ${htmlSlider("sim-pico", "Llegadas extra en hora pico", 0, 50, 5, SIM_ESTADO.extraPicoPct, " %")}
          ${htmlSlider("sim-via", "Capacidad de la vía de acceso", 20, 80, 5, SIM_ESTADO.capacidadVia, " camiones")}
          <button id="sim-reset" class="boton">Volver a la situación actual</button>
          <p class="suave nota">Situación actual: 5 carriles, servicio real del día
          (${fmt(servReal, 2)} min en promedio), vía de 40 camiones.</p>
        </div>
        <div>
          <div id="sim-tarjetas"></div>
          <div class="contenedor-grafico"><canvas id="graf-sim-cola"></canvas></div>
        </div>
      </div>
      <div id="sim-respuesta" class="respuesta"></div>
      <h3>Llegadas (λ) vs capacidad de la garita (μ·c)</h3>
      <div class="contenedor-grafico bajo"><canvas id="graf-sim-lambda"></canvas></div>
      <h3>Detalle hora por hora</h3>
      <div class="tabla-scroll" id="sim-tabla"></div>
      <p class="suave nota">Datos simulados. Filas en rojo = horas con desborde (la cola no cabe en la vía de acceso).</p>`;

    const actualizar = () => this.actualizar(contenedor, estado);
    conectarSlider(contenedor, "sim-carriles", (v) => { SIM_ESTADO.carriles = v; actualizar(); });
    conectarSlider(contenedor, "sim-servicio", (v) => { SIM_ESTADO.servicioMin = v; actualizar(); });
    conectarSlider(contenedor, "sim-pico", (v) => { SIM_ESTADO.extraPicoPct = v; actualizar(); });
    conectarSlider(contenedor, "sim-via", (v) => { SIM_ESTADO.capacidadVia = v; actualizar(); });
    contenedor.querySelector("#sim-reset").addEventListener("click", () => {
      Object.assign(SIM_ESTADO, { carriles: 5, servicioMin: null, extraPicoPct: 0, capacidadVia: 40 });
      this.render(contenedor, estado);
    });
    actualizar();
  },

  actualizar(contenedor, estado) {
    const M = KPI.METAS;
    const esc = escenario({
      carriles: SIM_ESTADO.carriles,
      servicioMin: SIM_ESTADO.servicioMin,
      extraPicoPct: SIM_ESTADO.extraPicoPct,
      capacidadVia: SIM_ESTADO.capacidadVia,
    });
    const k = simularDia(estado.dia, esc);
    const capVia = SIM_ESTADO.capacidadVia;
    const horas = Array.from({ length: 19 }, (_, i) => i + 4); // 04:00 a 22:00

    // --- Tarjetas del escenario ---
    contenedor.querySelector("#sim-tarjetas").innerHTML = htmlTarjetas([
      { nombre: "Wq promedio", valor: fmt(k.wqPromedio) + " min", meta: `meta ≤ ${M.wq_min}`, cumple: k.wqPromedio <= M.wq_min },
      { nombre: "Wq máximo", valor: fmt(k.wqMax) + " min", meta: "peor hora" },
      { nombre: "Cola máxima (Lq)", valor: fmt(k.lqMax), meta: `vía ${capVia}`, cumple: k.lqMax <= capVia },
      { nombre: `ρ pico (${horaTexto(k.horaPico)})`, valor: fmt(k.rhoPico) + " %", meta: `meta ≤ ${M.rho_pct} %`, cumple: k.rhoPico <= M.rho_pct },
      { nombre: "Horas con desborde", valor: fmt(k.horasDesborde) + " h", meta: "meta 0", cumple: k.horasDesborde <= M.desborde_h },
      { nombre: "Camiones en vía pública", valor: fmt(k.viaPublicaMax), meta: "máximo · meta 0", cumple: k.viaPublicaMax <= 0 },
    ]).replace('class="tarjetas"', 'class="tarjetas compactas"');

    // --- Gráfico de cola ---
    crearGrafico("graf-sim-cola", {
      data: {
        labels: horas.map(horaTexto),
        datasets: [
          { type: "bar", label: "Camiones en cola (Lq)", data: horas.map((h) => Math.round(k.colas[h])),
            backgroundColor: horas.map((h) => (k.colas[h] > capVia ? color("alerta") : color("primario"))), order: 2 },
          { type: "line", label: `Límite vía de acceso (${capVia})`, data: horas.map(() => capVia),
            borderColor: color("aviso"), borderDash: [6, 4], pointRadius: 0, order: 1 },
        ],
      },
      options: {
        plugins: { title: { display: true, text: `Cola por hora · día ${estado.dia} (rojo = desborde)` } },
        scales: { y: { beginAtZero: true, title: { display: true, text: "camiones" } } },
      },
    });

    // --- Gráfico λ vs μ·c ---
    crearGrafico("graf-sim-lambda", {
      type: "line",
      data: {
        labels: horas.map(horaTexto),
        datasets: [
          { label: "Llegadas (λ)", data: horas.map((h) => Math.round(k.llegadas[h])), borderColor: color("primario"), backgroundColor: color("primario"), tension: 0.3 },
          { label: "Capacidad (μ·c)", data: horas.map((h) => Math.round(k.capacidades[h])), borderColor: color("alerta"), borderDash: [6, 4], pointRadius: 0, stepped: "middle" },
          { label: "85 % de la capacidad (meta ρ)", data: horas.map((h) => Math.round(k.capacidades[h] * 0.85)), borderColor: color("ok"), borderDash: [2, 3], pointRadius: 0, stepped: "middle" },
        ],
      },
      options: { scales: { y: { beginAtZero: true, title: { display: true, text: "camiones/h" } } } },
    });

    // --- Tabla hora por hora ---
    const filas = horas.map((h) => {
      const desb = k.colas[h] > capVia;
      return `<tr class="${desb ? "desborde" : ""}">
        <td>${horaTexto(h)}</td><td>${fmt(k.llegadas[h])}</td><td>${fmt(k.capacidades[h], 1)}</td>
        <td>${k.capacidades[h] > 0 ? fmt(k.rho[h]) + " %" : "cerrada"}</td>
        <td>${fmt(k.colas[h], 1)}</td><td>${fmt(k.esperas[h], 1)}</td>
        <td>${fmt(KPI.camionesEnViaPublica(k.colas[h], capVia))}</td></tr>`;
    }).join("");
    contenedor.querySelector("#sim-tabla").innerHTML = `<table class="tabla-horas">
      <tr><th>Hora</th><th>λ</th><th>μ·c</th><th>ρ</th><th>Lq</th><th>Wq (min)</th><th>En vía pública</th></tr>
      ${filas}</table>`;

    // --- Respuestas a las preguntas del enunciado ---
    const necesarioDia = carrilesNecesarios(estado.dia, SIM_ESTADO.servicioMin, SIM_ESTADO.extraPicoPct);
    let peor = { dia: null, carriles: 0 };
    DATOS.dias.forEach((d) => {
      const n = carrilesNecesarios(d.dia, SIM_ESTADO.servicioMin, SIM_ESTADO.extraPicoPct).carriles ?? 99;
      if (n > peor.carriles) peor = { dia: d.dia, carriles: n };
    });
    const horasCola = horas.filter((h) => k.colas[h] > 0.5);
    contenedor.querySelector("#sim-respuesta").innerHTML = `
      <strong>¿En qué horas se forma la cola?</strong>
      ${horasCola.length ? `${tramosHorarios(horasCola)}
        (máximo ${fmt(k.lqMax)} camiones; ${fmt(k.viaPublicaMax)} quedan en la vía pública).` : "No se forma cola con este escenario."}<br>
      <strong>¿Cuántos carriles hacen falta para ρ ≤ ${M.rho_pct} % en la hora pico?</strong>
      Este día: <strong>${necesarioDia.carriles ?? "más de 12"}</strong> carriles.
      Peor día de los 30 (día ${peor.dia}): <strong>${peor.carriles > 12 ? "más de 12" : peor.carriles}</strong> carriles
      ${peor.carriles > 6 ? `— <span class="peor">la garita solo tiene 6 instalados: abrir carriles no alcanza</span>.` : "."}`;
  },
});
