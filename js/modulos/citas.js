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
  titulo: "Sistema de citas",
  intro: "Si cada camión reserva una hora para llegar (como un turno en el médico), no llegan todos juntos.",
  dueno: "Todo el grupo",
  rama: "mejora-citas",

  render(contenedor, estado) {
    const c = CITAS_ESTADO;
    contenedor.innerHTML = `
      <h2>Sistema de citas: reservar una hora para llegar${ayuda("citas")}</h2>
      <div class="rejilla-2">
        <div class="panel-control">
          <h3>Muevan los controles 👇</h3>
          ${htmlSlider("tas-cita", "Camiones que reservan cita", 0, 100, 5, c.pctCita, " %")}
          ${htmlSlider("tas-punt", "Llegan a su hora", 50, 100, 5, c.puntualidad, " %")}
          ${htmlSlider("tas-noshow", "Reservan y no llegan", 0, 50, 5, c.noShow, " %")}
          ${htmlSlider("tas-flex", "Horas que el chofer acepta mover su cita", 0, 4, 1, c.flexibilidadH, " h")}
          ${htmlSlider("tas-fija", "Citas normales: cupos fijos por hora", 20, 100, 5, c.capacidadFija, " camiones/h")}
          <label class="slider"><span>Mostrar en los gráficos</span>
            <select id="tas-modo">
              <option value="dinamica">Citas inteligentes (nuestra propuesta)</option>
              <option value="fija">Citas normales (cupos fijos)</option>
            </select></label>
          <p class="suave nota"><strong>Citas inteligentes:</strong> cada hora solo ofrece los cupos que la puerta puede atender
          (sin pasar del 85 %), restando los camiones que vienen sin cita.
          Un transportista solo acepta mover su cita unas horas (flexibilidad); si no hay espacio, llega a su hora.</p>
        </div>
        <div>
          <div id="tas-tabla"></div>
          <div class="contenedor-grafico"><canvas id="graf-tas-cola"></canvas></div>
        </div>
      </div>
      <div id="tas-respuesta" class="respuesta"></div>
      <details class="mas"><summary>Ver más: a qué hora llegan con citas, y qué pasa si muchos no llegan</summary>
      <div class="rejilla-2 parejo">
        <div><h3>A qué hora llegan: sin citas vs con citas</h3>
          <div class="contenedor-grafico bajo"><canvas id="graf-tas-llegadas"></canvas></div></div>
        <div><h3>¿Y si muchos reservan y no llegan? (días con barco grande)</h3>
          <div class="contenedor-grafico bajo"><canvas id="graf-tas-noshow"></canvas></div></div>
      </div>
      </details>
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
      <tr><th>Día ${estado.dia}</th><th>Sin citas</th><th>Citas normales</th><th>Citas inteligentes</th><th>Ideal</th></tr>
      ${fila("Espera promedio (min)", (k) => k.wqPromedio, `≤ ${M.wq_min}`, (v) => v <= M.wq_min)}
      ${fila("Camiones esperando (máx.)", (k) => k.lqMax, `≤ ${M.lq_max}`, (v) => v <= M.lq_max)}
      ${fila("Horas con fila en la calle", (k) => k.horasDesborde, "0", (v) => v <= M.desborde_h)}
      ${fila("Qué tan llena está la puerta (%)", (k) => k.rhoPico, `≤ ${M.rho_pct}`, (v) => v <= M.rho_pct)}
      ${fila("Camiones en la calle (máx.)", (k) => k.viaPublicaMax, "0", (v) => v <= 0)}
      ${fila("Llegan a su hora (%)", (k) => k.cumplimiento, `≥ ${M.cumplimiento_pct}`, (v) => v >= M.cumplimiento_pct, 1)}
      ${fila("Reservan y no llegan (%)", (k) => k.noShow, `≤ ${M.noshow_pct}`, (v) => v <= M.noshow_pct, 1)}
    </table></div>`;

    const horas = Array.from({ length: 19 }, (_, i) => i + 4);
    const nombreCon = c.modoGrafico === "fija" ? "con citas normales" : "con citas inteligentes";

    // --- Gráfico como la maqueta: cola sin TAS (barras) vs con TAS (línea) ---
    crearGrafico("graf-tas-cola", {
      data: {
        labels: horas.map(horaTexto),
        datasets: [
          { type: "bar", label: "Fila sin citas", data: horas.map((h) => Math.round(sin.colas[h])), backgroundColor: "#b9c4cf", order: 3 },
          { type: "line", label: "Fila " + nombreCon, data: horas.map((h) => Math.round(con.colas[h])), borderColor: color("primario"), backgroundColor: color("primario"), tension: 0.3, order: 1 },
          { type: "line", label: "Caben en el carril de espera", data: horas.map(() => capVia), borderColor: color("alerta"), borderDash: [6, 4], pointRadius: 0, order: 2 },
        ],
      },
      options: {
        plugins: { title: { display: true, text: `Camiones esperando por hora · sin citas vs ${nombreCon}` } },
        scales: { y: { beginAtZero: true, title: { display: true, text: "camiones" } } },
      },
    });

    // --- Llegadas redistribuidas ---
    crearGrafico("graf-tas-llegadas", {
      data: {
        labels: horas.map(horaTexto),
        datasets: [
          { type: "bar", label: "Sin citas", data: horas.map((h) => Math.round(sin.llegadas[h])), backgroundColor: "#b9c4cf" },
          { type: "bar", label: nombreCon[0].toUpperCase() + nombreCon.slice(1), data: horas.map((h) => Math.round(con.llegadas[h])), backgroundColor: color("primario") },
          { type: "line", label: "La puerta puede atender", data: horas.map((h) => Math.round(sin.capacidades[h])), borderColor: color("alerta"), borderDash: [6, 4], pointRadius: 0, stepped: "middle" },
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
          { label: "Espera " + nombreCon + " (min)", data: sens.map((s) => Math.round(s.wqPromedio * 10) / 10), borderColor: color("primario"), backgroundColor: color("primario"), yAxisID: "y" },
          { label: "Espera sin citas (min)", data: niveles.map(() => Math.round(sinBuque.wqPromedio * 10) / 10), borderColor: "#8a96a3", borderDash: [4, 4], pointRadius: 0, yAxisID: "y" },
          { label: "Horas con fila en la calle", data: sens.map((s) => Math.round(s.horasDesborde * 10) / 10), borderColor: color("alerta"), backgroundColor: color("alerta"), yAxisID: "y2" },
        ],
      },
      options: {
        scales: {
          x: { title: { display: true, text: "% que reserva y no llega" } },
          y: { beginAtZero: true, title: { display: true, text: "minutos" } },
          y2: { beginAtZero: true, position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "h/día" } },
        },
      },
    });

    // --- Respuestas ---
    const alto = sens[sens.length - 1];
    contenedor.querySelector("#tas-respuesta").innerHTML = `
      <strong>¿Cuánto ayudan las citas?</strong>
      Día ${estado.dia}: la espera pasa de <strong>${fmt(sin.wqPromedio)}</strong> min a
      <strong>${fmt(fija.wqPromedio)}</strong> (citas normales) y <strong class="mejor">${fmt(din.wqPromedio)}</strong> (citas inteligentes);
      horas con fila en la calle: ${fmt(sin.horasDesborde)} → ${fmt(fija.horasDesborde)} → <strong class="mejor">${fmt(din.horasDesborde)}</strong>.
      Las citas normales ofrecen los mismos cupos todas las horas; las inteligentes ofrecen solo los cupos
      que la puerta puede atender en cada hora.<br>
      <strong>¿Y si muchos reservan y no llegan?</strong> Si la mitad no llega (días con barco grande) la espera sube a
      <strong>${fmt(alto.wqPromedio)}</strong> min y la fila en la calle a <strong>${fmt(alto.horasDesborde, 1)}</strong> h al día:
      los cupos reservados quedan vacíos y esos camiones llegan igual, a la hora de más tráfico.
      Por eso proponemos <strong>cobrar una multa a quien no llega</strong> y liberar la cita si no se confirma 2 h antes.`;
  },
});
