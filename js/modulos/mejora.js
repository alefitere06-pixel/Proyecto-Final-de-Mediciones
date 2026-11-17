// =============================================================================
// Módulo 5 · Mejora (A3 Lean) · Propuesta "Gate Inteligente: 3 palancas"
// Abierto a todo el grupo · Rama: mejora-propuesta-a3
// -----------------------------------------------------------------------------
//   Palanca 1: TAS dinámico (js/escenarios.js · redistribuirTAS)
//   Palanca 2: Cola virtual con pre-estacionamiento fuera de la vía + llamada por app
//   Palanca 3: Incentivo de doble transacción (menos visitas por contenedor)
// El gráfico cascada aplica las palancas una tras otra y mide cuánto aporta cada una.
// =============================================================================

const MEJORA_ESTADO = {
  alcance: "buque",        // "buque" | "dia" | "todos"
  tas: true, colaVirtual: true, doble: true,
  capacidadPreEst: 60,
  pctDoble: 30,
};

function diasDelAlcance(estado) {
  if (MEJORA_ESTADO.alcance === "dia") return [estado.dia];
  if (MEJORA_ESTADO.alcance === "todos") return todosLosDias();
  return diasConBuque();
}

// Escenario con las palancas indicadas (usa los parámetros del módulo 4 para el TAS)
function escPalancas(p) {
  const c = typeof CITAS_ESTADO !== "undefined" ? CITAS_ESTADO : ESCENARIO_BASE.tas;
  return escenario({
    tas: { activo: !!p.tas, modo: "dinamica", pctCita: c.pctCita, puntualidad: c.puntualidad,
      noShow: c.noShow, flexibilidadH: c.flexibilidadH },
    colaVirtual: { activo: !!p.colaVirtual, capacidadPreEst: MEJORA_ESTADO.capacidadPreEst },
    doble: { activo: !!p.doble, pct: MEJORA_ESTADO.pctDoble },
  });
}

// Pasos de la cascada: actual → +palanca → +palanca ... → propuesta
// Orden: TAS (nivela llegadas) → cola virtual (saca de la vía lo que queda) → doble transacción (menos visitas).
// OJO: el aporte de cada palanca depende del orden (la primera "se lleva" más).
function pasosCascada(dias) {
  const orden = [
    { clave: "tas", nombre: "TAS dinámico" },
    { clave: "colaVirtual", nombre: "Cola virtual" },
    { clave: "doble", nombre: "Doble transacción" },
  ].filter((p) => MEJORA_ESTADO[p.clave]);
  const activas = {};
  const pasos = [{ nombre: "Situación actual", r: simularPeriodo(dias, escPalancas({})) }];
  orden.forEach((p) => {
    activas[p.clave] = true;
    pasos.push({ nombre: "+ " + p.nombre, r: simularPeriodo(dias, escPalancas(activas)) });
  });
  return pasos;
}

function graficoCascada(idCanvas, pasos, campo, titulo, unidad) {
  const labels = [...pasos.map((p) => p.nombre), "Propuesta"];
  const valores = pasos.map((p) => p.r[campo]);
  const data = [[0, valores[0]]];
  const colores = ["#8a96a3"];
  for (let i = 1; i < valores.length; i++) {
    data.push([valores[i - 1], valores[i]]);
    colores.push(valores[i] <= valores[i - 1] ? color("ok") : color("alerta"));
  }
  data.push([0, valores[valores.length - 1]]);
  colores.push(color("primario"));
  crearGrafico(idCanvas, {
    type: "bar",
    data: { labels, datasets: [{ label: titulo, data, backgroundColor: colores }] },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: true, text: titulo },
        tooltip: { callbacks: { label: (ctx) => {
          const [a, b] = ctx.raw;
          const i = ctx.dataIndex;
          return i === 0 || i === labels.length - 1 ? `${fmt(b, 1)} ${unidad}` : `${b - a <= 0 ? "" : "+"}${fmt(b - a, 1)} ${unidad}`;
        } } },
      },
      scales: { y: { beginAtZero: true, title: { display: true, text: unidad } } },
    },
  });
}

MODULOS.push({
  id: "mejora",
  titulo: "Mejora",
  dueno: "Todo el grupo",
  rama: "mejora-propuesta-a3",

  render(contenedor, estado) {
    const m = MEJORA_ESTADO;
    contenedor.innerHTML = `
      <h2>5 · Propuesta de mejora · A3 "Gate Inteligente"</h2>
      <div class="controles-fila">
        <label>Analizar
          <select id="mej-alcance">
            <option value="buque">Promedio de los días con buque</option>
            <option value="todos">Promedio de los 30 días</option>
            <option value="dia">Solo el día elegido (${estado.dia})</option>
          </select></label>
        <label class="check"><input type="checkbox" id="mej-tas" ${m.tas ? "checked" : ""}> 1 · TAS dinámico</label>
        <label class="check"><input type="checkbox" id="mej-virtual" ${m.colaVirtual ? "checked" : ""}> 2 · Cola virtual</label>
        <label class="check"><input type="checkbox" id="mej-doble" ${m.doble ? "checked" : ""}> 3 · Doble transacción</label>
      </div>
      <div class="rejilla-2 parejo">
        ${htmlSlider("mej-pct-doble", "Camiones import/export que combinan entrega + retiro", 0, 60, 5, m.pctDoble, " %")}
        ${htmlSlider("mej-preest", "Capacidad del pre-estacionamiento (cola virtual)", 0, 150, 10, m.capacidadPreEst, " camiones")}
      </div>
      <p class="suave">Los supuestos del TAS (citas, puntualidad, no-show) se toman del módulo 4.</p>
      <div id="mej-a3"></div>`;

    contenedor.querySelector("#mej-alcance").value = m.alcance;
    const act = () => this.actualizar(contenedor, estado);
    contenedor.querySelector("#mej-alcance").addEventListener("change", (e) => { m.alcance = e.target.value; act(); });
    contenedor.querySelector("#mej-tas").addEventListener("change", (e) => { m.tas = e.target.checked; act(); });
    contenedor.querySelector("#mej-doble").addEventListener("change", (e) => { m.doble = e.target.checked; act(); });
    contenedor.querySelector("#mej-virtual").addEventListener("change", (e) => { m.colaVirtual = e.target.checked; act(); });
    conectarSlider(contenedor, "mej-pct-doble", (v) => { m.pctDoble = v; act(); });
    conectarSlider(contenedor, "mej-preest", (v) => { m.capacidadPreEst = v; act(); });
    act();
  },

  actualizar(contenedor, estado) {
    const M = KPI.METAS;
    const dias = diasDelAlcance(estado);
    const pasos = pasosCascada(dias);
    const a = pasos[0].r;
    const p = pasos[pasos.length - 1].r;
    const nombreAlcance = { buque: "días con buque", todos: "los 30 días", dia: `el día ${estado.dia}` }[MEJORA_ESTADO.alcance];
    const capVia = DATOS.supuestos.capacidad_via_camiones;

    const filaKPI = (nombre, campo, meta, cumple, dec = 0) => {
      const va = a[campo], vp = p[campo];
      return `<tr><td>${nombre}</td>
        <td class="${va === undefined || cumple(va) === undefined ? "" : cumple(va) ? "mejor" : "peor"}">${va === undefined ? "—" : fmt(va, dec)}</td>
        <td class="${vp === undefined || cumple(vp) === undefined ? "" : cumple(vp) ? "mejor" : "peor"}">${vp === undefined ? "—" : fmt(vp, dec)}</td>
        <td>${meta}</td></tr>`;
    };
    const ningunaPalanca = pasos.length === 1;

    contenedor.querySelector("#mej-a3").innerHTML = `
      <div class="rejilla-a3">
        <section>
          <h3>1 · Problema</h3>
          <p>En horas pico la cola de camiones para entrar a la garita de Balboa no cabe en la vía de acceso
          (≈ ${capVia} camiones) y ocupa la vía pública cerca del Puente de las Américas.</p>
          <p>En ${nombreAlcance}: espera promedio <strong class="peor">${fmt(a.wqPromedio)} min</strong> (meta ≤ ${M.wq_min}),
          cola máxima <strong class="peor">${fmt(a.lqMax)}</strong> camiones,
          <strong class="peor">${fmt(a.horasDesborde, 1)} h/día</strong> con desborde y hasta
          <strong class="peor">${fmt(a.viaPublicaMax)}</strong> camiones en la vía pública.</p>
        </section>
        <section>
          <h3>2 · Causa raíz (5 porqués)</h3>
          <ol>
            <li>¿Por qué hay camiones en la vía pública? Porque la cola supera la vía de acceso.</li>
            <li>¿Por qué crece la cola? Porque en horas pico llegan más camiones (λ) de los que la garita atiende (μ·c): ρ pico ≈ ${fmt(a.rhoPico)} %.</li>
            <li>¿Por qué llegan todos a la vez? Porque no hay citas: cada transportista elige la misma hora (inicio de turno, días de buque).</li>
            <li>¿Por qué no se abren más carriles? Hay 6 instalados y en el peor día harían falta más de 10 (módulo 2).</li>
            <li>¿Por qué la cola sale a la calle? <strong>Diseño de la terminal:</strong> no existe un área de espera fuera de la vía.</li>
          </ol>
        </section>
        <section>
          <h3>3 · Desperdicio (Lean)</h3>
          <p><strong>Espera</strong>: el camión pasa ${fmt(a.wqPromedio)} min parado afuera sin agregar valor;
          es la mayor parte del TTT (${fmt(a.tttPromedio)} min, módulo 3).
          <strong>Transporte innecesario</strong>: viajes separados para entregar exportación y retirar importación.
          <strong>Desnivelación (mura)</strong>: picos de llegada que saturan la garita mientras otras horas sobra capacidad.</p>
        </section>
        <section>
          <h3>4 · Contramedidas · Gate Inteligente</h3>
          <ul>
            <li><strong>TAS dinámico</strong> (heijunka): citas por franja = μ·c × 0,85 − camiones sin cita previstos. Penalidad al no-show y liberar la cita si no se confirma 2 h antes.</li>
            <li><strong>Doble transacción</strong>: descuento a quien entrega exportación y retira importación en la misma visita (${MEJORA_ESTADO.pctDoble} %).</li>
            <li><strong>Cola virtual</strong>: pre-estacionamiento de ${MEJORA_ESTADO.capacidadPreEst} camiones fuera de la vía; la app llama al camión cuando hay espacio.</li>
            <li>Apoyo: pre-registro en línea y OCR en la garita para bajar el tiempo de servicio (prueben en el módulo 2).</li>
          </ul>
        </section>
      </div>

      <h3>5 · Resultado esperado (${nombreAlcance})</h3>
      ${ningunaPalanca ? `<p class="peor">Activen al menos una palanca para ver la propuesta.</p>` : ""}
      <div class="rejilla-2 parejo">
        <div class="tabla-scroll"><table class="tabla-horas">
          <tr><th>KPI</th><th>Actual</th><th>Propuesta</th><th>Meta</th></tr>
          ${filaKPI("Espera promedio Wq (min)", "wqPromedio", `≤ ${M.wq_min}`, (v) => v <= M.wq_min)}
          ${filaKPI("Cola máxima Lq (camiones)", "lqMax", `≤ ${M.lq_max}`, (v) => v <= M.lq_max)}
          ${filaKPI("ρ en hora pico (%)", "rhoPico", `≤ ${M.rho_pct}`, (v) => v <= M.rho_pct)}
          ${filaKPI("Truck Turn Time (min)", "tttPromedio", `≤ ${M.ttt_min}`, (v) => v <= M.ttt_min)}
          ${filaKPI("Horas con desborde (h/día)", "horasDesborde", "0", (v) => v <= M.desborde_h, 1)}
          ${filaKPI("Camiones en vía pública (máx)", "viaPublicaMax", "0", (v) => v <= 0)}
          ${filaKPI("Llegadas por día (camiones)", "totalLlegadas", "—", () => undefined)}
          ${filaKPI("Cumplimiento de citas (%)", "cumplimiento", `≥ ${M.cumplimiento_pct}`, (v) => v >= M.cumplimiento_pct, 1)}
          ${filaKPI("No-show (%)", "noShow", `≤ ${M.noshow_pct}`, (v) => v <= M.noshow_pct, 1)}
        </table></div>
        <div class="respuesta">
          <strong>Mensaje para la Gerencia:</strong> con ${pasos.length - 1} palanca(s) activa(s), la espera promedio baja de
          <strong>${fmt(a.wqPromedio)}</strong> a <strong class="mejor">${fmt(p.wqPromedio)} min</strong>
          (−${fmt(a.wqPromedio - p.wqPromedio)} min por camión), el TTT de ${fmt(a.tttPromedio)} a ${fmt(p.tttPromedio)} min
          y los camiones en la vía pública de ${fmt(a.viaPublicaMax)} a <strong class="mejor">${fmt(p.viaPublicaMax)}</strong>.
          Sin construir carriles nuevos: se usa mejor la capacidad que ya existe.
        </div>
      </div>
      <div class="rejilla-2 parejo">
        <div class="contenedor-grafico"><canvas id="graf-cascada-wq"></canvas></div>
        <div class="contenedor-grafico"><canvas id="graf-cascada-via"></canvas></div>
      </div>

      <div class="rejilla-a3">
        <section>
          <h3>6 · Plan de implementación</h3>
          <ol>
            <li>Mes 1–2: piloto del TAS dinámico con los transportistas de exportación (días de buque).</li>
            <li>Mes 2–3: habilitar pre-estacionamiento y app de llamado; medir camiones en vía pública.</li>
            <li>Mes 3–4: tarifa con descuento para doble transacción.</li>
            <li>Mes 4+: TAS obligatorio en horas pico y penalidad por no-show.</li>
          </ol>
        </section>
        <section>
          <h3>7 · Seguimiento (KPI y metas)</h3>
          <p>Revisión semanal de este dashboard: Wq ≤ ${M.wq_min} min, ρ pico ≤ ${M.rho_pct} %, 0 h de desborde,
          0 camiones en vía pública, cumplimiento ≥ ${M.cumplimiento_pct} % y no-show ≤ ${M.noshow_pct} %.
          Si el no-show supera la meta, aplicar la penalidad (ver sensibilidad en el módulo 4).</p>
        </section>
      </div>
      <p class="suave nota">Datos simulados. Resultados del modelo con supuestos del grupo (README); no son una predicción exacta.</p>`;

    graficoCascada("graf-cascada-wq", pasos, "wqPromedio", "Aporte de cada palanca a la espera Wq", "min");
    graficoCascada("graf-cascada-via", pasos, "viaPublicaMax", "Aporte de cada palanca a los camiones en vía pública", "camiones");
  },
});
