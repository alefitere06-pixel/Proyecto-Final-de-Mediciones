// =============================================================================
// Módulo 3 · Truck Turn Time
// Abierto a todo el grupo · Rama: mejora-ttt
// -----------------------------------------------------------------------------
// TTT = espera afuera + gate de entrada + patio + gate de salida  (KPI.ttt)
// Espera = Wq de cada hora (Little). Gate de entrada = tiempo de servicio de la hora.
// Muestra dónde se pierde el tiempo (desperdicio Lean: la espera).
// =============================================================================

const TTT_ESTADO = { verPropuesta: false };
const ETAPAS_TTT = ["Esperando afuera", "Pasando la puerta", "Adentro (carga/descarga)", "Saliendo"];

// Desglose del TTT por hora y promedio ponderado por llegadas para un día
function desgloseTTT(dia, esc) {
  const regs = registrosDelDia(dia);
  const k = simularDia(dia, esc);
  const porHora = regs.map((r, h) => {
    const espera = k.esperas[h] ?? 0;
    return {
      hora: r.hora, llegadas: k.llegadas[h],
      etapas: [espera, r.servicio_min, r.patio_min, r.gate_salida_min],
      ttt: KPI.ttt(espera, r.servicio_min, r.patio_min, r.gate_salida_min),
    };
  });
  const conLlegadas = porHora.filter((x) => x.llegadas > 0);
  const n = conLlegadas.reduce((s, x) => s + x.llegadas, 0);
  const etapas = [0, 1, 2, 3].map((i) => conLlegadas.reduce((s, x) => s + x.etapas[i] * x.llegadas, 0) / n);
  return { porHora, etapas, ttt: etapas.reduce((a, b) => a + b, 0) };
}

// Promedio del desglose sobre varios días
function desgloseTTTPeriodo(dias, esc) {
  const r = dias.map((d) => desgloseTTT(d, esc));
  const etapas = [0, 1, 2, 3].map((i) => promedio(r.map((x) => x.etapas[i])));
  return { etapas, ttt: etapas.reduce((a, b) => a + b, 0) };
}

const ESC_PROPUESTA = () => escPropuesta();

MODULOS.push({
  id: "ttt",
  titulo: "Tiempo total del camión",
  dueno: "Todo el grupo",
  rama: "mejora-ttt",

  render(contenedor, estado) {
    const M = KPI.METAS;
    const esc = TTT_ESTADO.verPropuesta ? ESC_PROPUESTA() : escenario();
    const d = desgloseTTT(estado.dia, esc);
    const actual = desgloseTTT(estado.dia, escenario());
    const propuesta = desgloseTTT(estado.dia, ESC_PROPUESTA());
    const iMax = d.etapas.indexOf(Math.max(...d.etapas));
    const horas = d.porHora.filter((x) => x.hora >= 4 && x.hora <= 20);

    const buque = desgloseTTTPeriodo(diasConBuque(), escenario());
    const sinBuque = desgloseTTTPeriodo(DATOS.dias.filter((x) => !x.dia_buque).map((x) => x.dia), escenario());
    const filaPeriodo = (nombre, p) => `<tr><td>${nombre}</td>${p.etapas.map((e) => `<td>${fmt(e, 1)}</td>`).join("")}
      <td class="${p.ttt <= M.ttt_min ? "mejor" : "peor"}">${fmt(p.ttt, 1)}</td></tr>`;

    contenedor.innerHTML = `
      <h2>¿Cuánto tiempo pasa un camión en total?${ayuda("ttt")}</h2>
      <label class="check"><input type="checkbox" id="ttt-propuesta" ${TTT_ESTADO.verPropuesta ? "checked" : ""}>
        Ver cómo quedaría con nuestra propuesta</label>
      ${htmlTarjetas([
        { nombre: "Tiempo total promedio", ayuda: "ttt", valor: fmt(d.ttt) + " min", meta: `meta ≤ ${M.ttt_min} min`, cumple: d.ttt <= M.ttt_min },
        ...ETAPAS_TTT.map((nombre, i) => ({ nombre, valor: fmt(d.etapas[i], 1) + " min",
          meta: fmt(d.etapas[i] / d.ttt * 100) + " % del TTT" })),
      ]).replace('class="tarjetas"', 'class="tarjetas compactas"')}
      <div class="respuesta"><strong>¿En qué se pierde el tiempo?</strong>
        La etapa más larga es <strong>${ETAPAS_TTT[iMax].toLowerCase()}</strong> (${fmt(d.etapas[iMax], 1)} min).
        Esperar afuera es <strong>tiempo perdido</strong>${ayuda("lean")}: nadie gana nada mientras el camión está parado.
        Con la propuesta, el TTT del día pasa de <strong>${fmt(actual.ttt)}</strong> a <strong class="mejor">${fmt(propuesta.ttt)} min</strong>
        (−${fmt(actual.ttt - propuesta.ttt)} min por camión).</div>
      <div class="rejilla-2">
        <div><div class="contenedor-grafico"><canvas id="graf-ttt-dona"></canvas></div></div>
        <div><div class="contenedor-grafico"><canvas id="graf-ttt-horas"></canvas></div></div>
      </div>
      <h3>Días con barco grande vs sin barco (minutos, hoy sin cambios)</h3>
      <div class="tabla-scroll"><table class="tabla-horas">
        <tr><th>Grupo</th>${ETAPAS_TTT.map((e) => `<th>${e}</th>`).join("")}<th>Total</th></tr>
        ${filaPeriodo("Días con barco grande", buque)}
        ${filaPeriodo("Días sin barco", sinBuque)}
      </table></div>
      <p class="suave nota">Datos simulados. TTT ponderado por llegadas (las horas con más camiones pesan más).</p>`;

    contenedor.querySelector("#ttt-propuesta").addEventListener("change", (e) => {
      TTT_ESTADO.verPropuesta = e.target.checked;
      this.render(contenedor, estado);
    });

    const colores = [color("alerta"), color("primario"), "#6b8fa6", "#a9bccb"];
    crearGrafico("graf-ttt-dona", {
      type: "doughnut",
      data: { labels: ETAPAS_TTT, datasets: [{ data: d.etapas.map((e) => Math.round(e * 10) / 10), backgroundColor: colores }] },
      options: { plugins: { title: { display: true, text: `Composición del TTT · día ${estado.dia}` }, legend: { position: "bottom" } } },
    });
    crearGrafico("graf-ttt-horas", {
      type: "bar",
      data: {
        labels: horas.map((x) => horaTexto(x.hora)),
        datasets: [
          ...ETAPAS_TTT.map((nombre, i) => ({ label: nombre, data: horas.map((x) => Math.round(x.etapas[i] * 10) / 10), backgroundColor: colores[i], stack: "ttt" })),
          { type: "line", label: `Meta ${M.ttt_min} min`, data: horas.map(() => M.ttt_min), borderColor: color("aviso"), borderDash: [6, 4], pointRadius: 0 },
        ],
      },
      options: {
        plugins: { title: { display: true, text: "Tiempo total según la hora en que llega el camión" } },
        scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: "minutos" } } },
      },
    });
  },
});
