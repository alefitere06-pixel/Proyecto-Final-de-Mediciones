// =============================================================================
// Módulo 1 · Llegadas
// Abierto a todo el grupo · Rama: mejora-llegadas
// -----------------------------------------------------------------------------
// Muestra la demanda: cuántos camiones llegan (λ) por hora y por día.
// KPI usados (ver docs/fichas_kpi.md): Llegadas por hora (λ) y Capacidad (μ·c).
// No calcula fórmulas nuevas: λ sale de DATOS.horas y μ·c de kpiDelDia (js/kpi.js).
// =============================================================================

const LLEGADAS_ESTADO = {
  transaccion: "todas",      // "todas" | "importacion" | "exportacion" | "vacio"
  compararPromedio: true,    // mostrar línea del promedio de los 30 días
};

const DIAS_SEMANA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const NOMBRE_TRANSACCION = { todas: "todas", importacion: "importación", exportacion: "exportación", vacio: "vacío" };
const HORAS_VISIBLES = Array.from({ length: 18 }, (_, i) => i + 4); // 04:00 a 21:00

// Llegadas de un registro horario según el filtro de transacción
function llegadasFiltradas(registro, transaccion) {
  return transaccion === "todas" ? registro.llegadas : registro[transaccion];
}

// Total de llegadas de un día según el filtro
function totalDia(dia, transaccion) {
  return registrosDelDia(dia).reduce((s, r) => s + llegadasFiltradas(r, transaccion), 0);
}

// Promedio de llegadas por hora de los 30 días (según filtro)
function promedioPorHora(transaccion) {
  const suma = new Array(24).fill(0);
  DATOS.horas.forEach((r) => { suma[r.hora] += llegadasFiltradas(r, transaccion); });
  return suma.map((s) => s / DATOS.dias.length);
}

// Promedio de llegadas por día de la semana, separado con buque / sin buque
function promedioPorDiaSemana(transaccion) {
  const resultado = { conBuque: [], sinBuque: [], nCon: [], nSin: [] };
  DIAS_SEMANA.forEach((nombre) => {
    const con = DATOS.dias.filter((d) => d.dia_semana === nombre && d.dia_buque);
    const sin = DATOS.dias.filter((d) => d.dia_semana === nombre && !d.dia_buque);
    resultado.conBuque.push(con.length ? promedio(con.map((d) => totalDia(d.dia, transaccion))) : null);
    resultado.sinBuque.push(sin.length ? promedio(sin.map((d) => totalDia(d.dia, transaccion))) : null);
    resultado.nCon.push(con.length);
    resultado.nSin.push(sin.length);
  });
  return resultado;
}

MODULOS.push({
  id: "llegadas",
  titulo: "¿Cuántos llegan?",
  intro: "Cuántos camiones llegan cada hora y qué días hay más. Las barras naranjas son las horas con más camiones.",
  dueno: "Todo el grupo",
  rama: "mejora-llegadas",

  render(contenedor, estado) {
    const filtro = LLEGADAS_ESTADO.transaccion;
    const registros = registrosDelDia(estado.dia);
    const kpi = kpiDelDia(registros);            // para μ·c por hora
    const lambdaDia = registros.map((r) => llegadasFiltradas(r, filtro));
    const lambdaTotal = registros.map((r) => r.llegadas);

    // --- Horas pico: las 3 horas con más llegadas (según filtro) ---
    const pico = [...HORAS_VISIBLES].sort((a, b) => lambdaDia[b] - lambdaDia[a]).slice(0, 3);
    const horaMax = pico[0];

    // --- Horas en que llegan más camiones de los que la garita atiende (λ > μ·c) ---
    // Siempre con el total de llegadas: la capacidad atiende a todos los tipos.
    const horasCola = HORAS_VISIBLES.filter((h) => lambdaTotal[h] > kpi.capacidades[h]);

    // --- Días con buque vs sin buque (promedio del total diario, según filtro) ---
    const promCon = promedio(DATOS.dias.filter((d) => d.dia_buque).map((d) => totalDia(d.dia, filtro)));
    const promSin = promedio(DATOS.dias.filter((d) => !d.dia_buque).map((d) => totalDia(d.dia, filtro)));
    const difBuque = promSin > 0 ? ((promCon - promSin) / promSin) * 100 : 0;

    // --- Mezcla de transacciones del día ---
    const tot = registros.reduce((s, r) => s + r.llegadas, 0);
    const mezcla = ["importacion", "exportacion", "vacio"].map((t) =>
      registros.reduce((s, r) => s + r[t], 0));

    contenedor.innerHTML = `
      <h2>¿Cuántos camiones llegan y a qué hora?</h2>
      <div class="controles-fila">
        <label>Tipo de transacción
          <select id="lleg-transaccion">
            <option value="todas">Todas</option>
            <option value="importacion">Importación</option>
            <option value="exportacion">Exportación</option>
            <option value="vacio">Vacío</option>
          </select>
        </label>
        <label class="check">
          <input type="checkbox" id="lleg-promedio" ${LLEGADAS_ESTADO.compararPromedio ? "checked" : ""}>
          Comparar con el promedio de los 30 días
        </label>
      </div>

      <div class="rejilla-2">
        <div>
          <table class="tabla-resumen">
            <tr><th colspan="2">Resumen del día ${estado.dia}</th></tr>
            <tr><td>Llegadas del día${filtro === "todas" ? "" : " (" + NOMBRE_TRANSACCION[filtro] + ")"}</td>
                <td><strong>${fmt(lambdaDia.reduce((a, b) => a + b, 0))}</strong> camiones</td></tr>
            <tr><td>Hora con más camiones${ayuda("pico")}</td>
                <td><strong>${horaTexto(horaMax)}</strong> · λ = ${fmt(lambdaDia[horaMax])} camiones/h</td></tr>
            <tr><td>Horas en que llegan más de los que la puerta atiende<br><span class="suave">(ahí empieza la fila)</span></td>
                <td class="${horasCola.length ? "texto-alerta" : "texto-ok"}">
                  ${horasCola.length ? horasCola.map((h) => horaTexto(h) +
                    (kpi.capacidades[h] === 0 ? " (garita cerrada)" : "")).join(", ") : "Ninguna"}</td></tr>
            <tr><td>Días con barco grande vs sin barco${ayuda("buque")}</td>
                <td><strong>${difBuque >= 0 ? "+" : ""}${fmt(difBuque, 1)} %</strong> llegadas
                <br><span class="suave">${fmt(promCon)} vs ${fmt(promSin)} camiones/día</span></td></tr>
            <tr><td>Mezcla del día</td>
                <td>Imp. ${fmt(mezcla[0] / tot * 100)} % · Exp. ${fmt(mezcla[1] / tot * 100)} % ·
                    Vacío ${fmt(mezcla[2] / tot * 100)} %</td></tr>
          </table>
          <p class="suave nota">Las horas pico (3 con más llegadas) se resaltan en el gráfico.
          Cuando la barra pasa la línea roja, llegan más camiones de los que la puerta puede atender: ahí crece la fila.</p>
        </div>
        <div>
          <div class="contenedor-grafico"><canvas id="graf-llegadas-hora"></canvas></div>
        </div>
      </div>

      <details class="mas"><summary>Ver más: ¿qué días de la semana llegan más camiones?</summary>
      <h3>¿Qué días llegan más camiones? (promedio)</h3>
      <div class="contenedor-grafico bajo"><canvas id="graf-llegadas-semana"></canvas></div>
      </details>
      <p class="suave nota">Datos simulados · 30 días · data/generar_datos.py</p>`;

    // --- Controles ---
    const sel = contenedor.querySelector("#lleg-transaccion");
    sel.value = filtro;
    sel.addEventListener("change", () => {
      LLEGADAS_ESTADO.transaccion = sel.value;
      this.render(contenedor, estado);
    });
    contenedor.querySelector("#lleg-promedio").addEventListener("change", (e) => {
      LLEGADAS_ESTADO.compararPromedio = e.target.checked;
      this.render(contenedor, estado);
    });

    // --- Gráfico 1: llegadas por hora ---
    const css = getComputedStyle(document.documentElement);
    const cPrimario = css.getPropertyValue("--primario").trim();
    const cPico = css.getPropertyValue("--aviso").trim();
    const cAlerta = css.getPropertyValue("--alerta").trim();
    const prom = promedioPorHora(filtro);

    const series = [{
      type: "bar",
      label: "Camiones que llegan",
      data: HORAS_VISIBLES.map((h) => lambdaDia[h]),
      backgroundColor: HORAS_VISIBLES.map((h) => (pico.includes(h) ? cPico : cPrimario)),
      order: 3,
    }];
    if (LLEGADAS_ESTADO.compararPromedio) {
      series.push({
        type: "line", label: "Promedio 30 días",
        data: HORAS_VISIBLES.map((h) => Math.round(prom[h] * 10) / 10),
        borderColor: "#6b7785", backgroundColor: "#6b7785", pointRadius: 2, tension: 0.3, order: 1,
      });
    }
    if (filtro === "todas") {
      series.push({
        type: "line", label: "Lo que la puerta puede atender",
        data: HORAS_VISIBLES.map((h) => Math.round(kpi.capacidades[h] * 10) / 10),
        borderColor: cAlerta, borderDash: [6, 4], pointRadius: 0, stepped: "middle", order: 2,
      });
    }
    crearGrafico("graf-llegadas-hora", {
      data: { labels: HORAS_VISIBLES.map(horaTexto), datasets: series },
      options: {
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: `Llegadas por hora · día ${estado.dia} (barras naranjas = horas pico)` },
        },
        scales: { y: { beginAtZero: true, title: { display: true, text: "camiones/h" } } },
      },
    });

    // --- Gráfico 2: por día de la semana ---
    const sem = promedioPorDiaSemana(filtro);
    crearGrafico("graf-llegadas-semana", {
      type: "bar",
      data: {
        labels: DIAS_SEMANA,
        datasets: [
          { label: "Con barco grande", data: sem.conBuque, backgroundColor: cPico },
          { label: "Sin barco", data: sem.sinBuque, backgroundColor: cPrimario },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                const n = ctx.datasetIndex === 0 ? sem.nCon[ctx.dataIndex] : sem.nSin[ctx.dataIndex];
                return `promedio de ${n} día(s)`;
              },
            },
          },
        },
        scales: { y: { beginAtZero: true, title: { display: true, text: "camiones/día" } } },
      },
    });
  },
});
