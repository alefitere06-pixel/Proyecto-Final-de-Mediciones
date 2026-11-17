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
  const estadoDia = k.horasDesborde > 0 ? `<span class="pill mal">Fila en la calle</span>` : `<span class="pill ok">Sin problemas</span>`;

  // Estado de cada hora para la tabla
  const filas = HORAS_INI.map((h) => {
    const cola = k.colas[h];
    const estadoH = k.capacidades[h] === 0 && cola > 0 ? "Puerta cerrada"
      : cola > capVia ? "Fila en la calle" : cola > 0.5 ? "Hay fila" : "Sin fila";
    return { h, cola, estadoH };
  });
  const cuenta = (e) => filas.filter((f) => f.estadoH === e).length;

  const enCalle = Math.round(k.viaPublicaMax);
  contenedor.innerHTML = `
    <div class="guia">
      <div class="guia-paso"><span class="num">1</span><div><strong>🚛 Llegan camiones</strong>
        <p>Traen o recogen contenedores. Entran al puerto por una puerta llamada <b>garita</b>${ayuda("garita")}.</p></div></div>
      <div class="guia-paso"><span class="num">2</span><div><strong>⏳ Se forma una fila</strong>
        <p>Si llegan más camiones de los que la puerta puede revisar, esperan en un carril (caben ${capVia}).</p></div></div>
      <div class="guia-paso malo"><span class="num">3</span><div><strong>🚧 La fila sale a la calle</strong>
        <p>Si no caben, quedan en la calle y bloquean el tránsito cerca del Puente de las Américas.</p></div></div>
      <div class="guia-paso bueno"><span class="num">4</span><div><strong>💡 Nuestra solución</strong>
        <p>Citas para llegar, un estacionamiento de espera con app y dos trámites en un solo viaje.</p></div></div>
    </div>

    <div class="resumen-simple">
      <div class="fila-res"><span class="ico">😟</span><div><strong>Hoy (día ${estado.dia}, ${info.dia_semana}${info.dia_buque ? ", llegó un barco grande" : ""}):</strong>
        llegaron <b>${fmt(info.llegadas)}</b> camiones. Cada uno esperó en promedio <b class="${k.wqPromedio > M.wq_min ? "peor" : "mejor"}">${fmt(k.wqPromedio)} minutos</b> para entrar.
        ${enCalle > 0 ? `A las ${horaTexto(D.horaCola)} había <b>${fmt(k.lqMax)}</b> camiones esperando y <b class="peor">${enCalle} no cabían y estaban en la calle</b>.`
          : `La fila siempre cupo en su carril: <b class="mejor">nadie quedó en la calle</b>.`}</div></div>
      <div class="fila-res"><span class="ico">😀</span><div><strong>Con nuestra propuesta:</strong>
        la espera bajaría a <b class="mejor">${fmt(p.wqPromedio)} ${fmt(p.wqPromedio) === "1" ? "minuto" : "minutos"}</b> y quedarían <b class="mejor">${fmt(p.viaPublicaMax)}</b> camiones en la calle.
        <a href="#" data-ir="mapa">Ver la animación ›</a></div></div>
    </div>

    <div class="lg-rejilla">
      <div class="lg-izq">
        <div class="ini-tarjeta">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="ini-medio">#Día-${String(estado.dia).padStart(2, "0")}</span>${estadoDia}
          </div>
          <div class="ini-sub" style="display:flex;justify-content:space-between;margin-top:8px">
            <span>${fmt(info.llegadas)} camiones</span><span>${info.dia_semana}${info.dia_buque ? " · barco" : ""}</span><span>más tráfico ${horaTexto(k.horaPico)}</span>
          </div>
          <div class="lg-barra-dia"><i style="width:${((D.horaCola - 4) / 18 * 100).toFixed(0)}%"></i>
            <b style="left:calc(${((D.horaCola - 4) / 18 * 100).toFixed(0)}% - 4px)"></b></div>
          <div class="lg-ruta"><span>Carril de espera · caben ${capVia} camiones</span><br><span>Fila más larga a las ${horaTexto(D.horaCola)}</span></div>
        </div>
        <div class="ini-tarjeta">
          <div style="display:flex;justify-content:space-between"><h3>¿Cuántos días salió bien?</h3><span class="ini-sub">30 días</span></div>
          <div style="display:flex;align-items:flex-end;gap:10px">
            <div class="lg-minibarras" style="flex:1">${todos.map((x, i) =>
              `<i class="${i + 1 === estado.dia ? "hoy" : x.wqPromedio > M.wq_min ? "mal" : ""}" style="height:${Math.max(6, x.wqPromedio / maxWq * 100)}%" title="Día ${i + 1}: espera ${fmt(x.wqPromedio)} min"></i>`).join("")}</div>
            <strong>${fmt(okDias / todos.length * 100)}%</strong>
          </div>
          <div class="ini-sub">de los días la espera fue de ${M.wq_min} min o menos (barra naranja = hoy)</div>
        </div>
        <div class="ini-tarjeta" style="display:flex;align-items:center;gap:10px">
          <div class="pill morado" style="font-size:1.1rem;padding:8px 10px">⛩</div>
          <div style="flex:1"><strong style="font-size:.88rem">La puerta (garita)${ayuda("garita")}</strong><div class="ini-sub">5 de 6 ventanillas abiertas · revisa cada camión en ${fmt(D.servicio, 1)} min</div></div>
          <button class="boton secundario" data-ir="simulador" title="Abrir simulador">⚙</button>
        </div>
      </div>

      <div class="lg-centro">${svgCamion(Math.min(1, k.lqMax / (capVia * 3)))}</div>

      <div class="lg-der">
        <div class="lg-der-arriba">
          <div class="ini-tarjeta lg-cola ${k.lqMax > capVia ? "mal" : ""}">
            <div style="font-size:1.6rem">🚛</div>
            <div class="ini-medio">${fmt(k.lqMax)}/${capVia}</div>
            <div class="ini-sub">camiones esperando · solo caben ${capVia}</div>
          </div>
          <div class="ini-tarjeta">
            <h3>¿Qué tan llena está la puerta?${ayuda("ocupacion")}</h3><div class="ini-sub">${k.rhoPico > 100 ? "Llegan más de los que puede atender" : "En la hora de más tráfico"} · sano: ${M.rho_pct} % o menos</div>
            ${svgMedidor({ valor: k.rhoPico, max: 200, meta: M.rho_pct, color: k.rhoPico > M.rho_pct ? color("aviso") : color("ok"), texto: fmt(k.rhoPico) + "%", sub: horaTexto(k.horaPico) })}
          </div>
        </div>
        <div class="ini-tarjeta" style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div><h3 style="margin:0">Minutos de espera según la hora${ayuda("espera")}</h3><span class="ini-grande">${fmt(k.wqPromedio)} min</span><div class="ini-sub">espera promedio hoy</div></div>
            <div style="text-align:right"><span class="ini-sub">con nuestra propuesta</span><br><strong style="color:var(--primario)">${fmt(p.wqPromedio)} min</strong></div>
          </div>
          <div class="ini-grafico"><canvas id="lg-graf-espera"></canvas></div>
        </div>
      </div>
    </div>

    <div class="lg-tira">${DATOS.dias.map((d) => {
      const kd = todos[d.dia - 1];
      return `<button class="lg-dia ${d.dia === estado.dia ? "activo" : ""}" data-dia="${d.dia}">
        <span><strong>#Día-${String(d.dia).padStart(2, "0")}</strong><span class="ini-sub">${d.dia_semana} · ${fmt(d.llegadas)} cam.</span></span>
        <span class="pill ${kd.horasDesborde ? "mal" : "ok"}" title="espera promedio">${fmt(kd.wqPromedio)} min</span></button>`;
    }).join("")}</div>

    <div class="lg-abajo">
      <div class="ini-tarjeta">
        <div style="display:flex;justify-content:space-between"><h3>¿Qué día y a qué hora hay más fila?</h3><span class="ini-sub">promedio de 30 días</span></div>
        <div id="lg-calor" class="lg-calor"></div>
        <div style="display:flex;justify-content:space-between;margin-top:12px;align-items:flex-end">
          <div><span class="ini-sub">Camiones en 30 días</span><div class="ini-medio">${fmt(DATOS.dias.reduce((s, d) => s + d.llegadas, 0))}</div></div>
          <div><span class="ini-sub">Días con fila en la calle</span><div class="ini-medio">${todos.filter((x) => x.horasDesborde > 0).length}</div></div>
          <div class="ini-sub"><span class="pill morado">poca fila</span> <span class="pill mal">mucha fila</span></div>
        </div>
      </div>
      <div class="ini-tarjeta">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <h3 style="margin:0">Hora por hora <span class="pill morado">${filas.length}</span></h3>
          <div class="lg-filtros" id="lg-filtros">
            ${["Todas", "Fila en la calle", "Hay fila", "Sin fila"].map((e, i) =>
              `<button data-f="${e}" class="${i === 0 ? "activo" : ""}">${e}<em>${e === "Todas" ? filas.length : cuenta(e)}</em></button>`).join("")}
          </div>
        </div>
        <div class="lg-tabla-caja"><table class="lg-tabla" id="lg-tabla"></table></div>
      </div>
    </div>`;

  // Tabla filtrable
  const pintarTabla = (f) => {
    const pillDe = { "Fila en la calle": "mal", "Hay fila": "aviso", "Sin fila": "ok", "Puerta cerrada": "morado" };
    contenedor.querySelector("#lg-tabla").innerHTML = `
      <tr><th>Hora</th><th>Llegan</th><th>Puede atender</th><th>Esperando</th><th>Espera</th><th style="text-align:right">¿Cómo está?</th></tr>
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
      `<i style="background:${celda(v)}" title="${s} ${horaTexto(horasCalor[j])}: ${fmt(v)} camiones esperando"></i>`).join("")}`).join("");

  contenedor.querySelectorAll("[data-dia]").forEach((b) => b.addEventListener("click", () => irADia(Number(b.dataset.dia))));
  contenedor.querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); activarModulo(b.dataset.ir); window.scrollTo(0, 0); }));
  const activo = contenedor.querySelector(".lg-dia.activo");
  if (activo) activo.parentElement.scrollLeft = activo.offsetLeft - 120;

  crearGrafico("lg-graf-espera", {
    type: "line",
    data: {
      labels: HORAS_INI.map(horaTexto),
      datasets: [
        { label: "Hoy", data: HORAS_INI.map((h) => Math.round(k.esperas[h] ?? 0)), borderColor: color("primario"),
          backgroundColor: "rgba(124,92,255,.12)", fill: true, tension: 0.4, pointRadius: 0, borderWidth: 3 },
        { label: "Con propuesta", data: HORAS_INI.map((h) => Math.round(p.esperas[h] ?? 0)), borderColor: "#b8b9c3",
          borderDash: [4, 4], tension: 0.4, pointRadius: 0 },
      ],
    },
    options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 6 }, grid: { display: false } }, y: { display: false, beginAtZero: true } } },
  });
}

