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
  titulo: "Simulador de la fila",
  intro: "Muevan los controles y miren qué pasa con la fila. Por ejemplo: ¿y si abrimos una ventanilla más?",
  dueno: "Todo el grupo",
  rama: "mejora-simulador",

  render(contenedor, estado) {
    const regs = registrosDelDia(estado.dia);
    const servReal = promedio(regs.filter((r) => r.garita_abierta).map((r) => r.servicio_min));
    const serv = SIM_ESTADO.servicioMin ?? Math.round(servReal * 10) / 10;

    contenedor.innerHTML = `
      <h2>Simulador: ¿qué pasa si cambiamos algo?</h2>
      <div class="rejilla-2">
        <div class="panel-control">
          <h3>Muevan los controles 👇</h3>
          ${htmlSlider("sim-carriles", "Ventanillas abiertas en la puerta", 1, 6, 1, SIM_ESTADO.carriles)}
          ${htmlSlider("sim-servicio", "Minutos para revisar cada camión", 2, 6, 0.1, serv, " min")}
          ${htmlSlider("sim-pico", "Camiones extra en horas de más tráfico", 0, 50, 5, SIM_ESTADO.extraPicoPct, " %")}
          ${htmlSlider("sim-via", "Camiones que caben en el carril de espera", 20, 80, 5, SIM_ESTADO.capacidadVia, " camiones")}
          <button id="sim-reset" class="boton">Volver a como está hoy</button>
          <p class="suave nota">Hoy: 5 ventanillas abiertas, cada camión tarda unos
          ${fmt(servReal, 1)} min en la puerta y caben 40 camiones en el carril de espera.</p>
        </div>
        <div>
          <div id="sim-tarjetas"></div>
          <div class="contenedor-grafico"><canvas id="graf-sim-cola"></canvas></div>
        </div>
      </div>
      <div id="sim-respuesta" class="respuesta"></div>
      <details class="mas"><summary>Ver más: llegadas vs lo que puede atender, y la tabla hora por hora</summary>
      <h3>Camiones que llegan vs camiones que la puerta puede atender</h3>
      <div class="contenedor-grafico bajo"><canvas id="graf-sim-lambda"></canvas></div>
      <h3>Hora por hora</h3>
      <div class="tabla-scroll" id="sim-tabla"></div>
      </details>
      <p class="suave nota">Datos simulados. Filas en rojo = la fila no cupo en su carril y salió a la calle.</p>`;

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
      { nombre: "Espera promedio", ayuda: "espera", valor: fmt(k.wqPromedio) + " min", meta: `ideal: ${M.wq_min} min o menos`, cumple: k.wqPromedio <= M.wq_min },
      { nombre: "Espera en la peor hora", valor: fmt(k.wqMax) + " min", meta: "quien llega en la peor hora" },
      { nombre: "Camiones esperando (máx.)", ayuda: "fila", valor: fmt(k.lqMax), meta: `caben ${capVia} en el carril`, cumple: k.lqMax <= capVia },
      { nombre: `Qué tan llena está la puerta (${horaTexto(k.horaPico)})`, ayuda: "ocupacion", valor: fmt(k.rhoPico) + " %", meta: `sano: ${M.rho_pct} % o menos`, cumple: k.rhoPico <= M.rho_pct },
      { nombre: "Horas con fila en la calle", ayuda: "desborde", valor: fmt(k.horasDesborde) + " h", meta: "ideal: 0", cumple: k.horasDesborde <= M.desborde_h },
      { nombre: "Camiones en la calle", ayuda: "calle", valor: fmt(k.viaPublicaMax), meta: "máximo · ideal: 0", cumple: k.viaPublicaMax <= 0 },
    ]).replace('class="tarjetas"', 'class="tarjetas compactas"');

    // --- Gráfico de cola ---
    crearGrafico("graf-sim-cola", {
      data: {
        labels: horas.map(horaTexto),
        datasets: [
          { type: "bar", label: "Camiones esperando", data: horas.map((h) => Math.round(k.colas[h])),
            backgroundColor: horas.map((h) => (k.colas[h] > capVia ? color("alerta") : color("primario"))), order: 2 },
          { type: "line", label: `Caben en el carril de espera (${capVia})`, data: horas.map(() => capVia),
            borderColor: color("aviso"), borderDash: [6, 4], pointRadius: 0, order: 1 },
        ],
      },
      options: {
        plugins: { title: { display: true, text: `Camiones esperando por hora · día ${estado.dia} (rojo = la fila salió a la calle)` } },
        scales: { y: { beginAtZero: true, title: { display: true, text: "camiones" } } },
      },
    });

    // --- Gráfico λ vs μ·c ---
    crearGrafico("graf-sim-lambda", {
      type: "line",
      data: {
        labels: horas.map(horaTexto),
        datasets: [
          { label: "Llegan", data: horas.map((h) => Math.round(k.llegadas[h])), borderColor: color("primario"), backgroundColor: color("primario"), tension: 0.3 },
          { label: "La puerta puede atender", data: horas.map((h) => Math.round(k.capacidades[h])), borderColor: color("alerta"), borderDash: [6, 4], pointRadius: 0, stepped: "middle" },
          { label: "Límite sano (85 %)", data: horas.map((h) => Math.round(k.capacidades[h] * 0.85)), borderColor: color("ok"), borderDash: [2, 3], pointRadius: 0, stepped: "middle" },
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
      <tr><th>Hora</th><th>Llegan</th><th>Puede atender</th><th>Qué tan llena</th><th>Esperando</th><th>Espera (min)</th><th>En la calle</th></tr>
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
      <strong>¿A qué hora hay fila?</strong>
      ${horasCola.length ? `${tramosHorarios(horasCola)}
        (máximo ${fmt(k.lqMax)} camiones; ${fmt(k.viaPublicaMax)} quedan en la calle).` : "Con estos valores no se forma fila."}<br>
      <strong>¿Cuántas ventanillas harían falta para que la puerta no pase del ${M.rho_pct} % en la hora de más tráfico?</strong>
      Este día: <strong>${necesarioDia.carriles ?? "más de 12"}</strong> ventanillas.
      Peor día de los 30 (día ${peor.dia}): <strong>${peor.carriles > 12 ? "más de 12" : peor.carriles}</strong> ventanillas
      ${peor.carriles > 6 ? `— <span class="peor">la puerta solo tiene 6: abrir más ventanillas no alcanza</span>.` : "."}`;
  },
});
