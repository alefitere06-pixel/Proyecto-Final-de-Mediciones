// =============================================================================
// Módulo 4 · Citas (TAS dinámico)
// Abierto a todo el grupo · Rama: mejora-citas
// -----------------------------------------------------------------------------
// Compara tres situaciones para el día elegido:
//   Sin TAS · TAS clásico (capacidad fija por franja) · TAS dinámico (nuestra propuesta:
//   capacidad por franja = μ·c × 0,85 − camiones sin cita previstos).
// La redistribución está en redistribuirTAS (js/escenarios.js); los KPI se calculan
// con las fórmulas del curso (cola, Wq, ρ, desborde, cumplimiento y no-show).
// =============================================================================

const CITAS_ESTADO = {
  pctCita: 70, puntualidad: 85, noShow: 10, capacidadFija: 60, flexibilidadH: 2,
  modoGrafico: "dinamica",
};

function escTAS(modo) {
  const c = CITAS_ESTADO;
  return escenario({ tas: { activo: true, modo, pctCita: c.pctCita, puntualidad: c.puntualidad,
    noShow: c.noShow, capacidadFija: c.capacidadFija, flexibilidadH: c.flexibilidadH } });
}

MODULOS.push({
  id: "citas",
  titulo: "Citas (TAS)",
  dueno: "Todo el grupo",
  rama: "mejora-citas",

  render(contenedor, estado) {
    const c = CITAS_ESTADO;
    contenedor.innerHTML = `
      <h2>Sistema de citas (TAS) · clásico vs dinámico</h2>
      <div class="rejilla-2">
        <div class="panel-control">
          <h3>Supuestos del TAS</h3>
          ${htmlSlider("tas-cita", "Camiones con cita", 0, 100, 5, c.pctCita, " %")}
          ${htmlSlider("tas-punt", "Puntualidad (llegan en su franja)", 50, 100, 5, c.puntualidad, " %")}
          ${htmlSlider("tas-noshow", "No-show (citas no usadas)", 0, 50, 5, c.noShow, " %")}
          ${htmlSlider("tas-flex", "Flexibilidad del transportista (mover la cita ±)", 0, 4, 1, c.flexibilidadH, " h")}
          ${htmlSlider("tas-fija", "TAS clásico: capacidad fija por franja", 20, 100, 5, c.capacidadFija, " camiones/h")}
          <label class="slider"><span>Mostrar en los gráficos</span>
            <select id="tas-modo">
              <option value="dinamica">TAS dinámico (propuesta)</option>
              <option value="fija">TAS clásico (capacidad fija)</option>
            </select></label>
          <p class="suave nota"><strong>TAS dinámico:</strong> cada hora ofrece tantas citas como
          μ·c × 0,85 menos los camiones sin cita que se esperan. Así la franja no se llena por encima de la meta de ρ.
          Un transportista solo acepta mover su cita unas horas (flexibilidad); si no hay espacio, llega a su hora.</p>
        </div>
        <div>
          <div id="tas-tabla"></div>
          <div class="contenedor-grafico"><canvas id="graf-tas-cola"></canvas></div>
        </div>
      </div>
      <div id="tas-respuesta" class="respuesta"></div>
      <div class="rejilla-2 parejo">
        <div><h3>Llegadas por hora: sin TAS vs con TAS</h3>
          <div class="contenedor-grafico bajo"><canvas id="graf-tas-llegadas"></canvas></div></div>
        <div><h3>¿Qué pasa si el no-show es alto? (promedio días de buque)</h3>
          <div class="contenedor-grafico bajo"><canvas id="graf-tas-noshow"></canvas></div></div>
      </div>
      <p class="suave nota">Datos simulados. Supuestos del modelo en el README (los no-show y los impuntuales llegan a su hora original, sin cita).</p>`;

    contenedor.querySelector("#tas-modo").value = c.modoGrafico;
    contenedor.querySelector("#tas-modo").addEventListener("change", (e) => {
      c.modoGrafico = e.target.value; this.actualizar(contenedor, estado);
    });
    const act = () => this.actualizar(contenedor, estado);
    conectarSlider(contenedor, "tas-cita", (v) => { c.pctCita = v; act(); });
    conectarSlider(contenedor, "tas-punt", (v) => { c.puntualidad = v; act(); });
    conectarSlider(contenedor, "tas-noshow", (v) => { c.noShow = v; act(); });
    conectarSlider(contenedor, "tas-flex", (v) => { c.flexibilidadH = v; act(); });
    conectarSlider(contenedor, "tas-fija", (v) => { c.capacidadFija = v; act(); });
    this.actualizar(contenedor, estado);
  },

  actualizar(contenedor, estado) {
    const M = KPI.METAS;
    const c = CITAS_ESTADO;
    const sin = simularDia(estado.dia, escenario());
    const fija = simularDia(estado.dia, escTAS("fija"));
    const din = simularDia(estado.dia, escTAS("dinamica"));
    const con = c.modoGrafico === "fija" ? fija : din;
    const capVia = DATOS.supuestos.capacidad_via_camiones;

    // --- Tabla comparativa ---
    const fila = (nombre, f, meta, cumple, dec = 0) => `<tr><td>${nombre}</td>
      ${[sin, fija, din].map((k) => {
        const v = f(k);
        const ok = v === undefined ? "" : cumple(v) ? "mejor" : "peor";
        return `<td class="${ok}">${v === undefined ? "—" : fmt(v, dec)}</td>`;
      }).join("")}<td>${meta}</td></tr>`;
    contenedor.querySelector("#tas-tabla").innerHTML = `<div class="tabla-scroll"><table class="tabla-horas">
      <tr><th>KPI · día ${estado.dia}</th><th>Sin TAS</th><th>TAS clásico</th><th>TAS dinámico</th><th>Meta</th></tr>
      ${fila("Espera promedio Wq (min)", (k) => k.wqPromedio, `≤ ${M.wq_min}`, (v) => v <= M.wq_min)}
      ${fila("Cola máxima Lq (camiones)", (k) => k.lqMax, `≤ ${M.lq_max}`, (v) => v <= M.lq_max)}
      ${fila("Horas con desborde", (k) => k.horasDesborde, "0", (v) => v <= M.desborde_h)}
      ${fila("ρ en hora pico (%)", (k) => k.rhoPico, `≤ ${M.rho_pct}`, (v) => v <= M.rho_pct)}
      ${fila("Camiones en vía pública (máx)", (k) => k.viaPublicaMax, "0", (v) => v <= 0)}
      ${fila("Cumplimiento de citas (%)", (k) => k.cumplimiento, `≥ ${M.cumplimiento_pct}`, (v) => v >= M.cumplimiento_pct, 1)}
      ${fila("No-show (%)", (k) => k.noShow, `≤ ${M.noshow_pct}`, (v) => v <= M.noshow_pct, 1)}
    </table></div>`;

    const horas = Array.from({ length: 19 }, (_, i) => i + 4);
    const nombreCon = c.modoGrafico === "fija" ? "con TAS clásico" : "con TAS dinámico";

    // --- Gráfico como la maqueta: cola sin TAS (barras) vs con TAS (línea) ---
    crearGrafico("graf-tas-cola", {
      data: {
        labels: horas.map(horaTexto),
        datasets: [
          { type: "bar", label: "Cola sin TAS", data: horas.map((h) => Math.round(sin.colas[h])), backgroundColor: "#b9c4cf", order: 3 },
          { type: "line", label: "Cola " + nombreCon, data: horas.map((h) => Math.round(con.colas[h])), borderColor: color("primario"), backgroundColor: color("primario"), tension: 0.3, order: 1 },
          { type: "line", label: "Límite vía de acceso", data: horas.map(() => capVia), borderColor: color("alerta"), borderDash: [6, 4], pointRadius: 0, order: 2 },
        ],
      },
      options: {
        plugins: { title: { display: true, text: `Camiones en cola por hora · sin TAS vs ${nombreCon}` } },
        scales: { y: { beginAtZero: true, title: { display: true, text: "camiones" } } },
      },
    });

    // --- Llegadas redistribuidas ---
    crearGrafico("graf-tas-llegadas", {
      data: {
        labels: horas.map(horaTexto),
        datasets: [
          { type: "bar", label: "Llegadas sin TAS", data: horas.map((h) => Math.round(sin.llegadas[h])), backgroundColor: "#b9c4cf" },
          { type: "bar", label: "Llegadas " + nombreCon, data: horas.map((h) => Math.round(con.llegadas[h])), backgroundColor: color("primario") },
          { type: "line", label: "Capacidad μ·c", data: horas.map((h) => Math.round(sin.capacidades[h])), borderColor: color("alerta"), borderDash: [6, 4], pointRadius: 0, stepped: "middle" },
        ],
      },
      options: { scales: { y: { beginAtZero: true, title: { display: true, text: "camiones/h" } } } },
    });

    // --- Sensibilidad al no-show (días de buque) ---
    const niveles = [0, 10, 20, 30, 40, 50];
    const sens = niveles.map((ns) => simularPeriodo(diasConBuque(), escenario({ tas: {
      activo: true, modo: c.modoGrafico, pctCita: c.pctCita, puntualidad: c.puntualidad,
      noShow: ns, capacidadFija: c.capacidadFija, flexibilidadH: c.flexibilidadH } })));
    const sinBuque = simularPeriodo(diasConBuque(), escenario());
    crearGrafico("graf-tas-noshow", {
      type: "line",
      data: {
        labels: niveles.map((n) => n + " %"),
        datasets: [
          { label: "Wq " + nombreCon + " (min)", data: sens.map((s) => Math.round(s.wqPromedio * 10) / 10), borderColor: color("primario"), backgroundColor: color("primario"), yAxisID: "y" },
          { label: "Wq sin TAS (min)", data: niveles.map(() => Math.round(sinBuque.wqPromedio * 10) / 10), borderColor: "#8a96a3", borderDash: [4, 4], pointRadius: 0, yAxisID: "y" },
          { label: "Horas con desborde", data: sens.map((s) => Math.round(s.horasDesborde * 10) / 10), borderColor: color("alerta"), backgroundColor: color("alerta"), yAxisID: "y2" },
        ],
      },
      options: {
        scales: {
          x: { title: { display: true, text: "no-show" } },
          y: { beginAtZero: true, title: { display: true, text: "minutos" } },
          y2: { beginAtZero: true, position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "h/día" } },
        },
      },
    });

    // --- Respuestas ---
    const alto = sens[sens.length - 1];
    contenedor.querySelector("#tas-respuesta").innerHTML = `
      <strong>¿Cuánto bajan la espera y el desborde con un TAS?</strong>
      Día ${estado.dia}: Wq pasa de <strong>${fmt(sin.wqPromedio)}</strong> min a
      <strong>${fmt(fija.wqPromedio)}</strong> (TAS clásico) y <strong class="mejor">${fmt(din.wqPromedio)}</strong> (TAS dinámico);
      horas con desborde: ${fmt(sin.horasDesborde)} → ${fmt(fija.horasDesborde)} → <strong class="mejor">${fmt(din.horasDesborde)}</strong>.
      El TAS clásico ofrece las mismas citas todas las horas y no mira los camiones sin cita; el dinámico ajusta las citas
      a la capacidad real de cada hora.<br>
      <strong>¿Y si el no-show es alto?</strong> Con 50 % de no-show (días de buque) la espera sube a
      <strong>${fmt(alto.wqPromedio)}</strong> min y el desborde a <strong>${fmt(alto.horasDesborde, 1)}</strong> h/día:
      las franjas reservadas quedan vacías y esos camiones llegan igual a la hora pico sin estar previstos.
      Por eso la propuesta incluye <strong>penalizar el no-show</strong> y liberar la cita si no se confirma 2 h antes.`;
  },
});
