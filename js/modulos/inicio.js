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
  const soloCitas = simularDia(estado.dia, escenario({ tas: { activo: true } }));
  contenedor.innerHTML = `
    <section class="hero-balboa hero-puerto-interactivo" id="hero-puerto">
      <div class="hero-balboa-contenido">
        <span class="hero-etiqueta">GATEFLOW · PUERTO DE BALBOA</span>
        <h2>Tecnología que mueve el puerto.</h2>
        <p>Conectamos buques, camiones y garitas para reducir la congestión y agilizar cada retiro de carga.</p>
        <div class="hero-acciones">
          <a class="boton hero-principal" href="#solucion">Generar una solución</a>
          <a class="boton hero-secundario" href="#mapa">Explorar el puerto</a>
        </div>
        <dl class="hero-metricas" aria-label="Resumen del día elegido">
          <div><dt>Llegadas</dt><dd>${fmt(info.llegadas)}</dd><small>camiones</small></div>
          <div><dt>Espera actual</dt><dd class="${k.wqPromedio > M.wq_min ? "peor" : "mejor"}">${fmt(k.wqPromedio)}</dd><small>minutos</small></div>
          <div><dt>Con la solución</dt><dd class="mejor">${fmt(p.wqPromedio)}</dd><small>minutos</small></div>
        </dl>
      </div>
      <div class="hero-escena" aria-label="Ilustración interactiva de la operación del Puerto de Balboa">
        <span class="hero-instruccion">Toca los puntos para entender la operación</span>
        <button type="button" class="hero-punto hero-punto-buque" data-hero-punto="buque" aria-expanded="false" aria-controls="hero-ficha-operacion">
          <span class="hero-pulso" aria-hidden="true"></span><span class="punto-etiqueta">Buque</span>
          <span class="punto-info"><strong>Más carga</strong>Conoce cómo la llegada de un buque cambia la demanda terrestre.</span>
        </button>
        <button type="button" class="hero-punto hero-punto-flujo" data-hero-punto="flujo" aria-expanded="false" aria-controls="hero-ficha-operacion">
          <span class="hero-pulso" aria-hidden="true"></span><span class="punto-etiqueta">Flujo</span>
          <span class="punto-info"><strong>Llegadas coordinadas</strong>Revisa cuándo llegan los camiones y por qué se forma la fila.</span>
        </button>
        <button type="button" class="hero-punto hero-punto-garita" data-hero-punto="garita" aria-expanded="false" aria-controls="hero-ficha-operacion">
          <span class="hero-pulso" aria-hidden="true"></span><span class="punto-etiqueta">Garita</span>
          <span class="punto-info"><strong>Capacidad de entrada</strong>Entiende cómo las ventanillas procesan y autorizan cada camión.</span>
        </button>
        <div class="hero-ruta-animada" aria-hidden="true"><span class="hero-camion"></span></div>
        <small class="hero-credito">Ilustración conceptual creada para GateFlow</small>
      </div>
    </section>

    <section class="hero-ficha-operacion" id="hero-ficha-operacion" data-tema="buque" aria-live="polite" aria-labelledby="hero-ficha-titulo" tabindex="-1" hidden>
      <button type="button" class="hero-ficha-cerrar" aria-label="Cerrar información">×</button>
      <div class="hero-ficha-cabecera">
        <span class="seccion-etiqueta" id="hero-ficha-etiqueta"></span>
        <h3 id="hero-ficha-titulo"></h3>
        <p id="hero-ficha-resumen"></p>
      </div>
      <div class="hero-ficha-indicadores" id="hero-ficha-indicadores"></div>
      <div class="hero-ficha-accion">
        <strong>¿Qué hacemos?</strong>
        <p id="hero-ficha-accion-texto"></p>
        <a class="boton hero-ficha-enlace" id="hero-ficha-enlace" href="#llegadas"></a>
      </div>
    </section>

    <section class="mensaje-clave ${enCalle > 0 ? "con-alerta" : "sin-alerta"}" aria-label="Diagnóstico sencillo">
      <span>${enCalle > 0 ? "ATENCIÓN" : "BUEN ESTADO"}</span>
      <p>En el día ${estado.dia}, la fila máxima es de <strong>${fmt(k.lqMax)} camiones</strong>. ${enCalle > 0
        ? `<strong>${enCalle} quedarían en la calle</strong> cerca de la zona portuaria.`
        : `La fila cabe en el acceso y <strong>no invade la calle</strong>.`}</p>
      <a href="#solucion">Generar una solución →</a>
    </section>

    <div class="rutas-cabecera">
      <div><span class="seccion-etiqueta">EXPLORAR SIN COMPLICACIONES</span><h3>Elige una ruta</h3></div>
      <p>Cada ruta abre sus detalles solo cuando los necesitas.</p>
    </div>
    <section class="rutas-inteligentes" aria-label="Rutas del dashboard">
      <details class="ruta-inteligente">
        <summary><span class="ruta-icono">01</span><span><strong>Ubicar el problema</strong><small>Puerto, accesos y fila de camiones</small></span></summary>
        <div class="ruta-ramas">
          <a href="#mapa">Ver la fila simulada</a>
          <a href="https://www.google.com/maps/search/?api=1&amp;query=Puerto+de+Balboa%2C+Panam%C3%A1" target="_blank" rel="noopener">Abrir Puerto de Balboa en Google Maps ↗</a>
          <a href="https://www.google.com/maps/@?api=1&amp;map_action=map&amp;center=8.9559%2C-79.5676&amp;zoom=14" target="_blank" rel="noopener">Explorar las vías cercanas ↗</a>
        </div>
      </details>
      <details class="ruta-inteligente">
        <summary><span class="ruta-icono">02</span><span><strong>Probar alternativas</strong><small>Cambia ventanillas, servicio y demanda</small></span></summary>
        <div class="ruta-ramas">
          <a href="#simulador">Abrir el simulador y evaluar la sexta ventanilla</a>
        </div>
      </details>
      <details class="ruta-inteligente destacada">
        <summary><span class="ruta-icono">03</span><span><strong>Aplicar la solución</strong><small>Citas + cola virtual + viajes combinados</small></span></summary>
        <div class="ruta-ramas">
          <a href="#solucion">Generar un plan para el día elegido</a>
          <a href="#citas">Explorar el sistema de citas</a>
        </div>
      </details>
      <details class="ruta-inteligente">
        <summary><span class="ruta-icono">04</span><span><strong>Consultar los datos</strong><small>Indicadores y análisis detallado</small></span></summary>
        <div class="ruta-ramas">
          <a href="#llegadas">Llegadas por hora y por día</a>
          <a href="#ttt">Etapas del recorrido del camión</a>
          <button type="button" id="abrir-tablero-completo">Abrir el tablero completo del día</button>
        </div>
      </details>
    </section>

    <details class="mas" id="ini-detalle">
    <summary>Ver el tablero completo del día (gráficos, los 30 días y hora por hora)</summary>
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
          <a class="boton secundario" href="#simulador" title="Abrir el simulador">⚙</a>
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
    </div>
    </details>`;

  const abrirTablero = contenedor.querySelector("#abrir-tablero-completo");
  if (abrirTablero) abrirTablero.addEventListener("click", () => {
    const detalle = contenedor.querySelector("#ini-detalle");
    detalle.open = true;
    detalle.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // La portada responde suavemente al cursor y muestra explicaciones puntuales.
  const heroPuerto = contenedor.querySelector("#hero-puerto");
  const movimientoPermitido = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches;
  if (heroPuerto && movimientoPermitido) {
    heroPuerto.addEventListener("pointermove", (evento) => {
      const caja = heroPuerto.getBoundingClientRect();
      const x = ((evento.clientX - caja.left) / caja.width - 0.5) * -14;
      const y = ((evento.clientY - caja.top) / caja.height - 0.5) * -10;
      heroPuerto.style.setProperty("--hero-x", `${x}px`);
      heroPuerto.style.setProperty("--hero-y", `${y}px`);
    });
    heroPuerto.addEventListener("pointerleave", () => {
      heroPuerto.style.setProperty("--hero-x", "0px");
      heroPuerto.style.setProperty("--hero-y", "0px");
    });
  }
  const fichaOperacion = contenedor.querySelector("#hero-ficha-operacion");
  const informacionOperacion = {
    buque: {
      etiqueta: "BUQUE · OPERACIÓN MARÍTIMA",
      titulo: "El buque activa la demanda de transporte terrestre",
      resumen: info.dia_buque
        ? `El día ${estado.dia} está marcado como día de buque. La descarga y el retiro de contenedores elevan la cantidad de viajes que debe absorber el acceso portuario.`
        : `El día ${estado.dia} no está marcado como día de buque grande, pero la terminal mantiene movimientos regulares de contenedores y camiones.`,
      indicadores: [
        { valor: info.dia_buque ? "Sí" : "No", texto: "Día de buque" },
        { valor: fmt(info.llegadas), texto: "Camiones previstos" },
        { valor: horaTexto(k.horaPico), texto: "Hora de mayor demanda" },
      ],
      accion: "Cruzar el plan del buque con las citas de retiro permite anticipar la demanda y evitar que todos los camiones lleguen en la misma franja.",
      enlace: "Ver llegadas y días de buque",
      destino: "#llegadas",
    },
    flujo: {
      etiqueta: "FLUJO · LLEGADA DE CAMIONES",
      titulo: "El problema no es solo cuántos llegan, sino cuándo llegan",
      resumen: `Durante el día ${estado.dia}, el mayor movimiento ocurre cerca de las ${horaTexto(k.horaPico)}. Si muchos conductores llegan sin coordinación, la fila puede superar el espacio disponible y alcanzar la vía pública.`,
      indicadores: [
        { valor: fmt(k.lqMax), texto: "Camiones en la fila máxima" },
        { valor: `${fmt(k.wqPromedio)} min`, texto: "Espera promedio" },
        { valor: enCalle > 0 ? fmt(enCalle) : "0", texto: "Camiones en la calle" },
      ],
      accion: "Las citas y la cola virtual distribuyen las llegadas por horarios. El conductor recibe una franja y se aproxima a la garita cuando existe capacidad.",
      enlace: "Ver cómo funcionan las citas",
      destino: "#citas",
    },
    garita: {
      etiqueta: "GARITA · CONTROL DE ACCESO",
      titulo: "La garita decide la velocidad con que avanza la fila",
      resumen: `Cada camión requiere validación antes de entrar. En este escenario, la revisión tarda aproximadamente ${fmt(D.servicio, 1)} minutos y la ocupación máxima de la garita alcanza ${fmt(k.rhoPico)} %.`,
      indicadores: [
        { valor: "5 de 6", texto: "Ventanillas activas" },
        { valor: `${fmt(D.servicio, 1)} min`, texto: "Revisión por camión" },
        { valor: `${fmt(k.rhoPico)} %`, texto: "Ocupación en hora pico" },
      ],
      accion: "Abrir la sexta ventanilla en horas pico y validar previamente documentos y QR aumenta la capacidad sin mantener recursos adicionales durante todo el día.",
      enlace: "Probar mejoras en la garita",
      destino: "#simulador",
    },
  };

  const cerrarFichaOperacion = () => {
    fichaOperacion.hidden = true;
    contenedor.querySelectorAll("[data-hero-punto]").forEach((otro) => otro.setAttribute("aria-expanded", "false"));
  };

  contenedor.querySelectorAll("[data-hero-punto]").forEach((punto) => punto.addEventListener("click", () => {
    const clave = punto.dataset.heroPunto;
    const detalle = informacionOperacion[clave];
    const yaAbierto = punto.getAttribute("aria-expanded") === "true" && !fichaOperacion.hidden;
    if (yaAbierto) {
      cerrarFichaOperacion();
      return;
    }

    contenedor.querySelectorAll("[data-hero-punto]").forEach((otro) => otro.setAttribute("aria-expanded", String(otro === punto)));
    fichaOperacion.dataset.tema = clave;
    fichaOperacion.querySelector("#hero-ficha-etiqueta").textContent = detalle.etiqueta;
    fichaOperacion.querySelector("#hero-ficha-titulo").textContent = detalle.titulo;
    fichaOperacion.querySelector("#hero-ficha-resumen").textContent = detalle.resumen;
    fichaOperacion.querySelector("#hero-ficha-indicadores").innerHTML = detalle.indicadores.map((indicador) =>
      `<div><strong>${indicador.valor}</strong><span>${indicador.texto}</span></div>`).join("");
    fichaOperacion.querySelector("#hero-ficha-accion-texto").textContent = detalle.accion;
    const enlace = fichaOperacion.querySelector("#hero-ficha-enlace");
    enlace.textContent = `${detalle.enlace} →`;
    enlace.href = detalle.destino;
    fichaOperacion.hidden = false;
    fichaOperacion.focus({ preventScroll: true });
    fichaOperacion.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }));
  fichaOperacion.querySelector(".hero-ficha-cerrar").addEventListener("click", cerrarFichaOperacion);

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

