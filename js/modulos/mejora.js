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
    carrilExtraPico: !!p.carrilExtraPico,
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
    { clave: "tas", nombre: "Citas" },
    { clave: "colaVirtual", nombre: "Estacionamiento" },
    { clave: "doble", nombre: "Dos trámites" },
  ].filter((p) => MEJORA_ESTADO[p.clave]);
  const activas = {};
  const pasos = [{ nombre: "Hoy", r: simularPeriodo(dias, escPalancas({})) }];
  orden.forEach((p) => {
    activas[p.clave] = true;
    pasos.push({ nombre: "+ " + p.nombre, r: simularPeriodo(dias, escPalancas(activas)) });
  });
  return pasos;
}

function graficoCascada(idCanvas, pasos, campo, titulo, unidad) {
  const labels = [...pasos.map((p) => p.nombre), "Con propuesta"];
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
  titulo: "Análisis técnico A3",
  intro: "Nuestras 3 ideas y cuánto ayuda cada una. Marquen o desmarquen cada idea para ver la diferencia.",
  dueno: "Todo el grupo",
  rama: "mejora-propuesta-a3",

  render(contenedor, estado) {
    const m = MEJORA_ESTADO;
    contenedor.innerHTML = `
      <h2>Nuestra propuesta: "Gate Inteligente"</h2>
      <div class="controles-fila">
        <label>Analizar
          <select id="mej-alcance">
            <option value="buque">Días con barco grande (los peores)</option>
            <option value="todos">Todos los 30 días</option>
            <option value="dia">Solo el día elegido (${estado.dia})</option>
          </select></label>
        <label class="check"><input type="checkbox" id="mej-tas" ${m.tas ? "checked" : ""}> 1 · Citas inteligentes</label>
        <label class="check"><input type="checkbox" id="mej-virtual" ${m.colaVirtual ? "checked" : ""}> 2 · Estacionamiento de espera</label>
        <label class="check"><input type="checkbox" id="mej-doble" ${m.doble ? "checked" : ""}> 3 · Dos trámites en un viaje</label>
      </div>
      <div class="rejilla-2 parejo">
        ${htmlSlider("mej-pct-doble", "Camiones que hacen dos trámites en un solo viaje", 0, 60, 5, m.pctDoble, " %")}
        ${htmlSlider("mej-preest", "Camiones que caben en el estacionamiento de espera", 0, 150, 10, m.capacidadPreEst, " camiones")}
      </div>
      <p class="suave">Los valores de las citas (cuántos reservan, cuántos llegan a su hora) se cambian en la pestaña "Sistema de citas".</p>
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
    const nombreAlcance = { buque: "los días con barco grande", todos: "los 30 días", dia: `el día ${estado.dia}` }[MEJORA_ESTADO.alcance];
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
      <details class="mas"><summary>Ver el análisis completo: el problema, por qué pasa, qué se desperdicia y qué proponemos</summary>
      <div class="rejilla-a3">
        <section>
          <h3>1 · ¿Cuál es el problema?</h3>
          <p>En las horas de más tráfico, la fila de camiones para entrar al puerto de Balboa no cabe en su carril de espera
          (caben unos ${capVia}) y los camiones quedan en la calle, cerca del Puente de las Américas.</p>
          <p>En ${nombreAlcance}: cada camión espera <strong class="peor">${fmt(a.wqPromedio)} min</strong> (lo ideal son ${M.wq_min}),
          llegan a esperar <strong class="peor">${fmt(a.lqMax)}</strong> camiones a la vez, hay
          <strong class="peor">${fmt(a.horasDesborde, 1)} horas al día</strong> con fila en la calle y hasta
          <strong class="peor">${fmt(a.viaPublicaMax)}</strong> camiones en la calle.</p>
        </section>
        <section>
          <h3>2 · ¿Por qué pasa? (preguntamos "¿por qué?" 5 veces)</h3>
          <ol>
            <li>¿Por qué hay camiones en la calle? Porque la fila no cabe en su carril.</li>
            <li>¿Por qué crece la fila? Porque en ciertas horas llegan más camiones de los que la puerta puede revisar (la puerta llega a estar al ${fmt(a.rhoPico)} %).</li>
            <li>¿Por qué llegan todos a la vez? Porque no hay citas: todos eligen la misma hora.</li>
            <li>¿Por qué no abren más ventanillas? Solo hay 6, y el peor día harían falta más de 10.</li>
            <li>¿Por qué la fila sale a la calle? <strong>Así se construyó el puerto:</strong> no hay un lugar para esperar fuera de la calle.</li>
          </ol>
        </section>
        <section>
          <h3>3 · ¿Qué se está desperdiciando?${ayuda("lean")}</h3>
          <p><strong>Tiempo esperando:</strong> el camión pasa ${fmt(a.wqPromedio)} min parado sin hacer nada; es la parte más grande de su
          tiempo total (${fmt(a.tttPromedio)} min).
          <strong>Viajes de más:</strong> un camión viene a dejar un contenedor y otro viene a recoger, cuando podría ser uno solo.
          <strong>Todo a la misma hora:</strong> en unas horas la puerta no da abasto y en otras está casi vacía.</p>
        </section>
        <section>
          <h3>4 · ¿Qué proponemos? · Gate Inteligente</h3>
          <ul>
            <li><strong>Citas inteligentes</strong>${ayuda("citasDinamicas")}: cada camión reserva una hora; cada hora solo ofrece los cupos que la puerta puede atender. Multa a quien reserva y no llega.</li>
            <li><strong>Estacionamiento de espera</strong>${ayuda("preEst")}: lugar para ${MEJORA_ESTADO.capacidadPreEst} camiones fuera de la calle; una app los llama cuando hay espacio.</li>
            <li><strong>Dos trámites en un viaje</strong>${ayuda("doble")}: descuento a quien deja un contenedor y se lleva otro en la misma visita (${MEJORA_ESTADO.pctDoble} % de los camiones).</li>
            <li>Extra: registrarse en línea antes de llegar y lectores automáticos de placas en la puerta, para revisar más rápido.</li>
          </ul>
        </section>
      </div>
      </details>

      <h3>5 · ¿Qué ganamos? (${nombreAlcance})</h3>
      ${ningunaPalanca ? `<p class="peor">Marquen al menos una idea arriba para ver el resultado.</p>` : ""}
      <div class="rejilla-2 parejo">
        <div class="tabla-scroll"><table class="tabla-horas">
          <tr><th>Indicador</th><th>Hoy</th><th>Con propuesta</th><th>Ideal</th></tr>
          ${filaKPI("Espera promedio (min)", "wqPromedio", `≤ ${M.wq_min}`, (v) => v <= M.wq_min)}
          ${filaKPI("Camiones esperando (máx.)", "lqMax", `≤ ${M.lq_max}`, (v) => v <= M.lq_max)}
          ${filaKPI("Qué tan llena está la puerta (%)", "rhoPico", `≤ ${M.rho_pct}`, (v) => v <= M.rho_pct)}
          ${filaKPI("Tiempo total del camión (min)", "tttPromedio", `≤ ${M.ttt_min}`, (v) => v <= M.ttt_min)}
          ${filaKPI("Horas con fila en la calle", "horasDesborde", "0", (v) => v <= M.desborde_h, 1)}
          ${filaKPI("Camiones en la calle (máx.)", "viaPublicaMax", "0", (v) => v <= 0)}
          ${filaKPI("Camiones que llegan al día", "totalLlegadas", "—", () => undefined)}
          ${filaKPI("Llegan a su hora (%)", "cumplimiento", `≥ ${M.cumplimiento_pct}`, (v) => v >= M.cumplimiento_pct, 1)}
          ${filaKPI("Reservan y no llegan (%)", "noShow", `≤ ${M.noshow_pct}`, (v) => v <= M.noshow_pct, 1)}
        </table></div>
        <div class="respuesta">
          <strong>En una frase:</strong> con ${pasos.length - 1} idea(s), cada camión pasa de esperar
          <strong>${fmt(a.wqPromedio)}</strong> a <strong class="mejor">${fmt(p.wqPromedio)} minutos</strong>,
          su tiempo total baja de ${fmt(a.tttPromedio)} a ${fmt(p.tttPromedio)} min
          y los camiones en la calle bajan de ${fmt(a.viaPublicaMax)} a <strong class="mejor">${fmt(p.viaPublicaMax)}</strong>.
          Todo sin construir una puerta nueva: solo se organiza mejor lo que ya existe.
        </div>
      </div>
      <div class="rejilla-2 parejo">
        <div class="contenedor-grafico"><canvas id="graf-cascada-wq"></canvas></div>
        <div class="contenedor-grafico"><canvas id="graf-cascada-via"></canvas></div>
      </div>

      <details class="mas"><summary>Ver cómo lo haríamos y cómo sabríamos que funciona</summary>
      <div class="rejilla-a3">
        <section>
          <h3>6 · ¿Cómo lo haríamos?</h3>
          <ol>
            <li>Meses 1–2: probar las citas con algunas empresas de camiones, en días con barco grande.</li>
            <li>Meses 2–3: abrir el estacionamiento de espera y la app que llama a los camiones.</li>
            <li>Meses 3–4: descuento por hacer dos trámites en un viaje.</li>
            <li>Mes 4 en adelante: citas obligatorias en horas de más tráfico y multa a quien no llega.</li>
          </ol>
        </section>
        <section>
          <h3>7 · ¿Cómo sabremos que funciona?</h3>
          <p>Revisar este tablero cada semana: espera de ${M.wq_min} min o menos, puerta llena al ${M.rho_pct} % o menos,
          cero horas con fila en la calle, ${M.cumplimiento_pct} % o más llegando a su hora y ${M.noshow_pct} % o menos de citas sin usar.
          Si muchos reservan y no llegan, aplicar la multa.</p>
        </section>
      </div>
      </details>
      <p class="suave nota">Números simulados con supuestos del grupo (ver README): muestran la tendencia, no son una predicción exacta.</p>`;

    graficoCascada("graf-cascada-wq", pasos, "wqPromedio", "¿Cuántos minutos de espera quita cada idea?", "min");
    graficoCascada("graf-cascada-via", pasos, "viaPublicaMax", "¿Cuántos camiones saca de la calle cada idea?", "camiones");
  },
});
