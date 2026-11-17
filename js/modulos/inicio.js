// =============================================================================
// Módulo · Inicio (portada del dashboard)
// -----------------------------------------------------------------------------
// Resumen del día elegido en una sola pantalla. Su diseño cambia con el estilo
// elegido (js/temas.js): A · Logística, B · Técnico, C · Ejecutivo.
// Todos los números salen de kpiDelDia / simularDia (fórmulas del curso).
// =============================================================================

let CACHE_KPI_DIAS = null;
function kpiTodosLosDias() {
  if (!CACHE_KPI_DIAS) CACHE_KPI_DIAS = DATOS.dias.map((d) => kpiDelDia(registrosDelDia(d.dia)));
  return CACHE_KPI_DIAS;
}

function irADia(dia) {
  ESTADO.dia = dia;
  document.getElementById("filtro-dia").value = dia;
  refrescar();
}

function datosInicio(dia) {
  const regs = registrosDelDia(dia);
  const k = kpiDelDia(regs);
  const p = simularDia(dia, escPropuesta());
  const info = DATOS.dias[dia - 1];
  const capVia = DATOS.supuestos.capacidad_via_camiones;
  const horaCola = k.colas.indexOf(Math.max(...k.colas));
  const servicio = promedio(regs.filter((r) => r.garita_abierta).map((r) => r.servicio_min));
  const citas = DATOS.citas_piloto[dia - 1];
  return { regs, k, p, info, capVia, horaCola, servicio, citas };
}

const HORAS_INI = Array.from({ length: 19 }, (_, i) => i + 4); // 04:00–22:00

MODULOS.unshift({
  id: "inicio",
  titulo: "Inicio",
  dueno: "Todo el grupo",
  rama: "mejora-estilos",
  render(contenedor, estado) {
    const tema = document.documentElement.dataset.tema;
    if (tema === "tecnico") return renderTecnico(contenedor, estado);
    if (tema === "ejecutivo") return renderEjecutivo(contenedor, estado);
    return renderLogistica(contenedor, estado);
  },
});

// -----------------------------------------------------------------------------
// A · Logística
// -----------------------------------------------------------------------------
function renderLogistica(contenedor, estado) {
  const D = datosInicio(estado.dia);
  const { k, p, info, capVia } = D;
  const M = KPI.METAS;
  const todos = kpiTodosLosDias();
  const okDias = todos.filter((x) => x.wqPromedio <= M.wq_min).length;
  const maxWq = Math.max(...todos.map((x) => x.wqPromedio));
  const estadoDia = k.horasDesborde > 0 ? `<span class="pill mal">Desborde</span>` : `<span class="pill ok">Fluido</span>`;

  // Estado de cada hora para la tabla
  const filas = HORAS_INI.map((h) => {
    const cola = k.colas[h];
    const estadoH = k.capacidades[h] === 0 && cola > 0 ? "Garita cerrada"
      : cola > capVia ? "Desborde" : cola > 0.5 ? "En cola" : "Fluido";
    return { h, cola, estadoH };
  });
  const cuenta = (e) => filas.filter((f) => f.estadoH === e).length;

  contenedor.innerHTML = `
    <div class="lg-rejilla">
      <div class="lg-izq">
        <div class="ini-tarjeta">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="ini-medio">#Día-${String(estado.dia).padStart(2, "0")}</span>${estadoDia}
          </div>
          <div class="ini-sub" style="display:flex;justify-content:space-between;margin-top:8px">
            <span>${fmt(info.llegadas)} camiones</span><span>${info.dia_semana}${info.dia_buque ? " · buque" : ""}</span><span>pico ${horaTexto(k.horaPico)}</span>
          </div>
          <div class="lg-barra-dia"><i style="width:${((D.horaCola - 4) / 18 * 100).toFixed(0)}%"></i>
            <b style="left:calc(${((D.horaCola - 4) / 18 * 100).toFixed(0)}% - 4px)"></b></div>
          <div class="lg-ruta"><span>Vía de acceso · ${capVia} camiones</span><br><span>Garita Balboa · cola máx. ${horaTexto(D.horaCola)}</span></div>
        </div>
        <div class="ini-tarjeta">
          <div style="display:flex;justify-content:space-between"><h3>Desempeño</h3><span class="ini-sub">últimos 30 días</span></div>
          <div style="display:flex;align-items:flex-end;gap:10px">
            <div class="lg-minibarras" style="flex:1">${todos.map((x, i) =>
              `<i class="${i + 1 === estado.dia ? "hoy" : x.wqPromedio > M.wq_min ? "mal" : ""}" style="height:${Math.max(6, x.wqPromedio / maxWq * 100)}%" title="Día ${i + 1}: Wq ${fmt(x.wqPromedio)} min"></i>`).join("")}</div>
            <strong>${fmt(okDias / todos.length * 100)}%</strong>
          </div>
          <div class="ini-sub">días con espera ≤ ${M.wq_min} min</div>
        </div>
        <div class="ini-tarjeta" style="display:flex;align-items:center;gap:10px">
          <div class="pill morado" style="font-size:1.1rem;padding:8px 10px">⛩</div>
          <div style="flex:1"><strong style="font-size:.88rem">Garita Balboa</strong><div class="ini-sub">5 de 6 carriles · ${fmt(D.servicio, 1)} min por camión</div></div>
          <button class="boton secundario" data-ir="simulador" title="Abrir simulador">⚙</button>
        </div>
      </div>

      <div class="lg-centro">${svgCamion(Math.min(1, k.lqMax / (capVia * 3)))}</div>

      <div class="lg-der">
        <div class="lg-der-arriba">
          <div class="ini-tarjeta lg-cola ${k.lqMax > capVia ? "mal" : ""}">
            <div style="font-size:1.6rem">🚛</div>
            <div class="ini-medio">${fmt(k.lqMax)}/${capVia}</div>
            <div class="ini-sub">cola máx. / vía de acceso</div>
          </div>
          <div class="ini-tarjeta">
            <h3>Utilización pico</h3><div class="ini-sub">ρ en la hora pico · meta ${M.rho_pct} %</div>
            ${svgMedidor({ valor: k.rhoPico, max: 200, meta: M.rho_pct, color: k.rhoPico > M.rho_pct ? color("aviso") : color("ok"), texto: fmt(k.rhoPico) + "%", sub: horaTexto(k.horaPico) })}
          </div>
        </div>
        <div class="ini-tarjeta" style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div><h3 style="margin:0">Espera por hora</h3><span class="ini-grande">${fmt(k.wqPromedio)} min</span></div>
            <div style="text-align:right"><span class="ini-sub">con Gate Inteligente</span><br><strong style="color:var(--primario)">${fmt(p.wqPromedio)} min</strong></div>
          </div>
          <div class="ini-grafico"><canvas id="lg-graf-espera"></canvas></div>
        </div>
      </div>
    </div>

    <div class="lg-tira">${DATOS.dias.map((d) => {
      const kd = todos[d.dia - 1];
      return `<button class="lg-dia ${d.dia === estado.dia ? "activo" : ""}" data-dia="${d.dia}">
        <span><strong>#Día-${String(d.dia).padStart(2, "0")}</strong><span class="ini-sub">${d.dia_semana} · ${fmt(d.llegadas)} cam.</span></span>
        <span class="pill ${kd.horasDesborde ? "mal" : "ok"}">${fmt(kd.wqPromedio)}′</span></button>`;
    }).join("")}</div>

    <div class="lg-abajo">
      <div class="ini-tarjeta">
        <div style="display:flex;justify-content:space-between"><h3>Mapa de calor de la cola</h3><span class="ini-sub">promedio por día y hora</span></div>
        <div id="lg-calor" class="lg-calor"></div>
        <div style="display:flex;justify-content:space-between;margin-top:12px;align-items:flex-end">
          <div><span class="ini-sub">Camiones en 30 días</span><div class="ini-medio">${fmt(DATOS.dias.reduce((s, d) => s + d.llegadas, 0))}</div></div>
          <div><span class="ini-sub">Días con desborde</span><div class="ini-medio">${todos.filter((x) => x.horasDesborde > 0).length}</div></div>
          <div class="ini-sub"><span class="pill morado">poca cola</span> <span class="pill mal">mucha</span></div>
        </div>
      </div>
      <div class="ini-tarjeta">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <h3 style="margin:0">Horas del día <span class="pill morado">${filas.length}</span></h3>
          <div class="lg-filtros" id="lg-filtros">
            ${["Todas", "Desborde", "En cola", "Fluido"].map((e, i) =>
              `<button data-f="${e}" class="${i === 0 ? "activo" : ""}">${e}<em>${e === "Todas" ? filas.length : cuenta(e)}</em></button>`).join("")}
          </div>
        </div>
        <div class="lg-tabla-caja"><table class="lg-tabla" id="lg-tabla"></table></div>
      </div>
    </div>`;

  // Tabla filtrable
  const pintarTabla = (f) => {
    const pillDe = { "Desborde": "mal", "En cola": "aviso", "Fluido": "ok", "Garita cerrada": "morado" };
    contenedor.querySelector("#lg-tabla").innerHTML = `
      <tr><th>Hora</th><th>Llegan (λ)</th><th>Atiende (μ·c)</th><th>Cola</th><th>Espera</th><th style="text-align:right">Estado</th></tr>
      ${filas.filter((x) => f === "Todas" || x.estadoH === f).map((x) => `<tr>
        <td><strong>${horaTexto(x.h)}</strong></td><td>${fmt(k.llegadas[x.h])}</td><td>${fmt(k.capacidades[x.h])}</td>
        <td>${fmt(x.cola)}</td><td>${fmt(k.esperas[x.h])} min</td>
        <td><span class="pill ${pillDe[x.estadoH]}">${x.estadoH}</span></td></tr>`).join("")}`;
  };
  pintarTabla("Todas");
  contenedor.querySelectorAll("#lg-filtros button").forEach((b) => b.addEventListener("click", () => {
    contenedor.querySelectorAll("#lg-filtros button").forEach((x) => x.classList.toggle("activo", x === b));
    pintarTabla(b.dataset.f);
  }));

  // Mapa de calor: día de la semana × hora
  const semana = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  const horasCalor = Array.from({ length: 18 }, (_, i) => i + 4);
  const prom = semana.map((s) => {
    const ds = DATOS.dias.filter((d) => d.dia_semana === s).map((d) => todos[d.dia - 1]);
    return horasCalor.map((h) => promedio(ds.map((x) => x.colas[h])));
  });
  const maxC = Math.max(...prom.flat(), 1);
  const celda = (v) => {
    if (v < 0.5) return "#eeeef3";
    const t = v / maxC;
    return t > 0.5 ? `rgba(229,72,77,${0.35 + t * 0.6})` : `rgba(124,92,255,${0.2 + t * 1.2})`;
  };
  contenedor.querySelector("#lg-calor").innerHTML =
    `<span></span>${horasCalor.map((h) => `<span>${h % 3 === 1 ? String(h).padStart(2, "0") : ""}</span>`).join("")}` +
    semana.map((s, i) => `<span>${s.slice(0, 3)}</span>${prom[i].map((v, j) =>
      `<i style="background:${celda(v)}" title="${s} ${horaTexto(horasCalor[j])}: ${fmt(v)} camiones en cola"></i>`).join("")}`).join("");

  contenedor.querySelectorAll("[data-dia]").forEach((b) => b.addEventListener("click", () => irADia(Number(b.dataset.dia))));
  contenedor.querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", () => activarModulo(b.dataset.ir)));
  const activo = contenedor.querySelector(".lg-dia.activo");
  if (activo) activo.parentElement.scrollLeft = activo.offsetLeft - 120;

  crearGrafico("lg-graf-espera", {
    type: "line",
    data: {
      labels: HORAS_INI.map(horaTexto),
      datasets: [
        { label: "Actual", data: HORAS_INI.map((h) => Math.round(k.esperas[h] ?? 0)), borderColor: color("primario"),
          backgroundColor: "rgba(124,92,255,.12)", fill: true, tension: 0.4, pointRadius: 0, borderWidth: 3 },
        { label: "Gate Inteligente", data: HORAS_INI.map((h) => Math.round(p.esperas[h] ?? 0)), borderColor: "#b8b9c3",
          borderDash: [4, 4], tension: 0.4, pointRadius: 0 },
      ],
    },
    options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 6 }, grid: { display: false } }, y: { display: false, beginAtZero: true } } },
  });
}

// -----------------------------------------------------------------------------
// B · Técnico
// -----------------------------------------------------------------------------
function renderTecnico(contenedor, estado) {
  const D = datosInicio(estado.dia);
  const { k, capVia } = D;
  const M = KPI.METAS;
  const primeraDesb = HORAS_INI.find((h) => k.colas[h] > capVia);
  const alarmas = [];
  if (primeraDesb !== undefined) alarmas.push(`La cola supera la vía de acceso desde las ${horaTexto(primeraDesb)} (${fmt(k.colas[primeraDesb])} camiones).`);
  if (k.rhoPico > M.rho_pct) alarmas.push(`Utilización pico ρ = ${fmt(k.rhoPico)} % a las ${horaTexto(k.horaPico)}. Máximo permitido ${M.rho_pct} %.`);
  if (k.wqPromedio > M.wq_min) alarmas.push(`Espera promedio ${fmt(k.wqPromedio)} min. Meta ${M.wq_min} min.`);

  const abiertas = HORAS_INI.filter((h) => k.capacidades[h] > 0);
  const rhoMedio = promedio(abiertas.map((h) => k.rho[h]));
  const cumplimiento = KPI.cumplimientoCitas(D.citas.dentro_franja, D.citas.usadas);
  const franjas = [["Mañana (05–11)", 5, 11], ["Mediodía (11–15)", 11, 15], ["Tarde (15–22)", 15, 22]].map(([n, a, b]) => {
    const hs = abiertas.filter((h) => h >= a && h < b);
    return { n, rho: promedio(hs.map((h) => k.rho[h])) };
  });
  const tttDesglose = desgloseTTT(estado.dia, escenario());
  const barraOp = (nombre, pct, col, valor) => `<div class="tc-op"><span class="tc-barra"><i style="width:${Math.min(100, pct)}%;background:${col}"></i></span>
    <div><span>${nombre}</span><strong style="color:var(--texto)">${valor}</strong></div></div>`;

  contenedor.innerHTML = `
    <div class="tc-rejilla">
      <div class="ini-tarjeta">
        <svg viewBox="0 0 260 120" class="hero-svg" style="border-radius:12px;background:#f3f6f4;margin-bottom:12px">
          ${[0, 1, 2, 3, 4].map((c) => [0, 1].map((r) => `<rect x="${110 + c * 26}" y="${30 + r * 30}" width="22" height="24" fill="${(c + r) % 3 ? "#dfe6e3" : "#cfe5e4"}" stroke="#9aa6a2"/>`).join("")).join("")}
          <path d="M10 100 L240 100" stroke="#9aa6a2" stroke-width="10"/>
          <rect x="70" y="40" width="26" height="54" fill="#e8ece9" stroke="#55625e"/>
          ${[0, 1, 2].map((i) => `<circle cx="${180 + i * 22}" cy="108" r="4" fill="#3f9b6f"/>`).join("")}
          <circle cx="40" cy="96" r="7" fill="#e0533c"/><path d="M40 70 L40 89" stroke="#e0533c" stroke-width="2"/>
        </svg>
        <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Alarmas de alto riesgo</h3>
          <a href="#" class="ini-sub" data-ir="mejora">Ver decisión ›</a></div>
        <div style="margin-top:8px">${alarmas.length ? alarmas.map((a) => `<div class="tc-alarma"><span class="ico">!</span><span>${a}</span></div>`).join("")
          : `<div class="tc-alarma" style="border-color:#bfe3cf;background:#eaf6ef;color:var(--ok)"><span class="ico" style="background:var(--ok)">✓</span><span>Sin alarmas: la garita opera dentro de las metas.</span></div>`}</div>
        <h3 style="margin-top:14px">Información de operación</h3>
        ${barraOp("Carriles abiertos", 5 / 6 * 100, color("primario"), "5 de 6")}
        ${barraOp("Utilización promedio (ρ)", rhoMedio, rhoMedio > M.rho_pct ? color("alerta") : color("aviso"), fmt(rhoMedio) + " %")}
        ${barraOp("Cumplimiento de citas (piloto)", cumplimiento, color("ok"), fmt(cumplimiento, 1) + " %")}
      </div>
      <div class="tc-diagrama">
        ${svgDiagramaGarita({ colaMax: k.lqMax, capVia, enViaPublica: k.viaPublicaMax, horaCritica: horaTexto(D.horaCola), servicio: fmt(D.servicio, 1) })}
      </div>
    </div>

    <div class="tc-abajo">
      <div class="ini-tarjeta"><span class="tc-flecha">↗</span><h3>Resumen</h3>
        <div style="display:grid;grid-template-columns:1fr 1.3fr;align-items:center;gap:6px">
          <div><div class="ini-medio">${fmt(D.info.llegadas)}</div><div class="ini-sub">camiones llegaron</div>
            <div class="ini-medio" style="margin-top:10px">${fmt(k.lqMax)}</div><div class="ini-sub">cola máxima</div></div>
          ${svgMedidor({ valor: k.wqPromedio, max: 120, meta: M.wq_min, color: color("primario"), texto: fmt(k.wqPromedio), sub: "min de espera", marcas: true, grosor: 12 })}
        </div></div>
      <div class="ini-tarjeta"><span class="tc-flecha">↗</span><h3>Información de la garita</h3>
        <div class="tc-fila"><span>Carriles instalados</span><strong>6</strong></div>
        <div class="tc-fila"><span>Estado de operación</span><span class="pill ok">En servicio</span></div>
        <div class="tc-fila"><span>Fuente de datos</span><span class="pill aviso">Simulados</span></div>
        <div class="tc-fila"><span>Tiempo de servicio</span><strong>${fmt(D.servicio, 1)} min</strong></div></div>
      <div class="ini-tarjeta"><span class="tc-flecha">↗</span><h3>Utilización por franja</h3>
        ${franjas.map((f) => `<div class="tc-temp"><span class="tc-barra"><i style="width:${Math.min(100, f.rho / 1.5)}%;background:${f.rho > M.rho_pct ? "linear-gradient(90deg,#f6b7a8,#e0533c)" : "linear-gradient(90deg,#b8dcdc,#2c7c83)"}"></i></span>
          <div><span>${f.rho > M.rho_pct ? "⚠ " : ""}${f.n}</span><strong style="color:var(--texto)">${fmt(f.rho)} %</strong></div></div>`).join("")}</div>
      <div class="ini-tarjeta"><span class="tc-flecha">↗</span><h3>Truck Turn Time</h3>
        ${svgMedidor({ valor: tttDesglose.ttt, max: 150, meta: M.ttt_min, color: "#f2a7b8", fondo: "#fbe3e9", texto: fmt(tttDesglose.ttt), sub: "minutos · meta " + M.ttt_min, marcas: true, grosor: 18 })}
        <div style="display:flex;justify-content:space-between;text-align:center;font-size:.75rem">
          <div><strong>${fmt(tttDesglose.etapas[0])}</strong><div class="ini-sub">espera</div></div>
          <div><strong>${fmt(tttDesglose.etapas[1], 1)}</strong><div class="ini-sub">garita</div></div>
          <div><strong>${fmt(tttDesglose.etapas[2])}</strong><div class="ini-sub">patio</div></div></div></div>
    </div>`;
  contenedor.querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); activarModulo(b.dataset.ir); }));
}

// -----------------------------------------------------------------------------
// C · Ejecutivo
// -----------------------------------------------------------------------------
function renderEjecutivo(contenedor, estado) {
  const D = datosInicio(estado.dia);
  const { k, p, info } = D;
  const M = KPI.METAS;
  const todos = kpiTodosLosDias();
  const h = new Date().getHours();
  const saludo = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  const dTTT = desgloseTTT(estado.dia, escenario());
  const tttA = dTTT.ttt, tttP = desgloseTTT(estado.dia, escPropuesta()).ttt;
  const kpis = [
    { id: "ej-sp1", nombre: "Espera promedio", valor: fmt(k.wqPromedio) + " min", delta: `−${fmt(k.wqPromedio - p.wqPromedio)} min con la propuesta`, serie: HORAS_INI.map((x) => k.esperas[x] ?? 0), ico: "⏱" },
    { id: "ej-sp2", nombre: "Camiones del día", valor: fmt(info.llegadas), delta: info.dia_buque ? "día de buque" : "día sin buque", serie: HORAS_INI.map((x) => k.llegadas[x]), ico: "🚛" },
    { id: "ej-sp3", nombre: "Cola máxima", valor: fmt(k.lqMax) + " camiones", delta: `${fmt(p.lqMax)} con la propuesta`, serie: HORAS_INI.map((x) => k.colas[x]), ico: "📈" },
    { id: "ej-sp4", nombre: "Truck Turn Time", valor: fmt(tttA) + " min", delta: `−${fmt(tttA - tttP)} min con la propuesta`, serie: HORAS_INI.slice(0, -1).map((x) => dTTT.porHora[x].ttt), ico: "🔁" },
  ];
  const criticos = [...todos.map((x, i) => ({ dia: i + 1, x }))].sort((a, b) => b.x.wqPromedio - a.x.wqPromedio).slice(0, 5);
  const mezcla = ["importacion", "exportacion", "vacio"].map((t) => DATOS.horas.reduce((s, r) => s + r[t], 0));
  const totM = mezcla.reduce((a, b) => a + b, 0);
  const colMezcla = [color("primario"), color("aviso"), "#3d4a5c"];

  contenedor.innerHTML = `
    <div class="ej-rejilla">
      <div>
        <div class="ej-saludo">${saludo}, equipo Gate Balboa 👋</div>
        <div class="ini-sub" style="font-size:.85rem;margin-bottom:12px">Esto es lo que pasa en la garita el día ${estado.dia} (${info.dia_semana}${info.dia_buque ? ", día de buque" : ""}).</div>
        ${svgPuerto()}
      </div>
      <div>
        <div class="ej-kpis">${kpis.map((x) => `
          <div class="ini-tarjeta"><div style="display:flex;justify-content:space-between"><span class="ini-sub">${x.nombre}</span><span>${x.ico}</span></div>
            <div class="ej-kpi"><div><div class="ini-medio">${x.valor}</div><div class="ej-delta">${x.delta}</div></div>
            <div class="sp"><canvas id="${x.id}"></canvas></div></div></div>`).join("")}</div>
        <div class="ini-tarjeta">
          <div style="display:flex;justify-content:space-between"><h3>Espera por hora: actual vs propuesta</h3>
            <span class="ini-sub"><span style="color:var(--primario)">●</span> Actual <span style="color:var(--aviso)">●</span> Gate Inteligente</span></div>
          <div class="ini-grafico" style="height:190px"><canvas id="ej-graf-barras"></canvas></div>
          <div class="ej-tres">
            <div><div class="ini-medio">${fmt(k.wqPromedio)} min</div><div class="ini-sub">Espera actual</div></div>
            <div><div class="ini-medio">${fmt(p.wqPromedio)} min</div><div class="ini-sub">Con la propuesta</div></div>
            <div><div class="ini-medio" style="color:var(--ok)">−${fmt(k.wqPromedio - p.wqPromedio)} min</div><div class="ini-sub">Mejora por camión</div></div>
          </div>
        </div>
      </div>
    </div>
    <div class="ej-abajo">
      <div class="ini-tarjeta">
        <div style="display:flex;justify-content:space-between"><h3>Tendencia de la espera</h3><span class="ini-sub">30 días · meta ${M.wq_min} min</span></div>
        <div class="ini-medio">${fmt(promedio(todos.map((x) => x.wqPromedio)))} min <span class="ini-sub">promedio</span></div>
        <div class="ini-grafico" style="height:170px"><canvas id="ej-graf-tendencia"></canvas></div>
      </div>
      <div class="ini-tarjeta">
        <h3>Días más críticos</h3>
        <table class="ej-tabla"><tr><th>Día</th><th>Tipo</th><th>Camiones</th><th>Espera</th><th></th></tr>
          ${criticos.map((c) => { const d = DATOS.dias[c.dia - 1]; return `<tr>
            <td><span class="ej-ico">${d.dia_buque ? "⚓" : "🚛"}</span>Día ${c.dia}</td><td>${d.dia_semana}</td>
            <td>${fmt(d.llegadas)}</td><td><strong>${fmt(c.x.wqPromedio)} min</strong></td>
            <td><button class="boton secundario" data-dia="${c.dia}" style="padding:3px 9px">⋮</button></td></tr>`; }).join("")}
        </table>
      </div>
      <div class="ini-tarjeta">
        <div style="display:flex;justify-content:space-between"><h3>Mezcla de transacciones</h3><span class="ini-sub">30 días</span></div>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);align-items:center;gap:12px">
          <div style="position:relative;height:150px"><canvas id="ej-graf-dona"></canvas></div>
          <ul class="ej-leyenda">${["Importación", "Exportación", "Vacío"].map((n, i) =>
            `<li><span><i style="background:${colMezcla[i]}"></i>${n}</span><strong>${fmt(mezcla[i] / totM * 100)}%</strong></li>`).join("")}</ul>
        </div>
      </div>
    </div>`;

  contenedor.querySelectorAll("[data-dia]").forEach((b) => b.addEventListener("click", () => irADia(Number(b.dataset.dia))));
  kpis.forEach((x) => crearGrafico(x.id, {
    type: "line",
    data: { labels: x.serie.map((_, i) => i), datasets: [{ data: x.serie, borderColor: color("primario"), backgroundColor: "rgba(242,140,40,.18)", fill: true, pointRadius: 0, tension: 0.4, borderWidth: 2 }] },
    options: { plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, beginAtZero: true } } },
  }));
  crearGrafico("ej-graf-barras", {
    type: "bar",
    data: { labels: HORAS_INI.map(horaTexto), datasets: [
      { label: "Actual", data: HORAS_INI.map((x) => Math.round(k.esperas[x] ?? 0)), backgroundColor: color("primario"), borderRadius: 4 },
      { label: "Gate Inteligente", data: HORAS_INI.map((x) => Math.round(p.esperas[x] ?? 0)), backgroundColor: color("aviso"), borderRadius: 4 },
    ] },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }, y: { beginAtZero: true, title: { display: true, text: "min" } } } },
  });
  crearGrafico("ej-graf-tendencia", {
    type: "bar",
    data: { labels: todos.map((_, i) => "D" + (i + 1)), datasets: [
      { label: "Espera (min)", data: todos.map((x) => Math.round(x.wqPromedio)), borderRadius: 3,
        backgroundColor: todos.map((_, i) => (i + 1 === estado.dia ? "#141414" : color("primario"))) },
      { type: "line", label: "Meta", data: todos.map(() => M.wq_min), borderColor: "#999", borderDash: [4, 4], pointRadius: 0 },
    ] },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }, y: { beginAtZero: true } } },
  });
  crearGrafico("ej-graf-dona", {
    type: "doughnut",
    data: { labels: ["Importación", "Exportación", "Vacío"], datasets: [{ data: mezcla, backgroundColor: colMezcla, borderWidth: 4, borderColor: "#fff" }] },
    options: { cutout: "62%", plugins: { legend: { display: false } } },
  });
}
