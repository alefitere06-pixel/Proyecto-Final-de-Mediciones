// =============================================================================
// presentacion.js · Modo presentación (defensa oral de 15 minutos)
// -----------------------------------------------------------------------------
// Botón "▶ Presentación" en la barra superior. Muestra diapositivas a pantalla
// completa con los números calculados EN VIVO por el modelo (si cambian un supuesto,
// la presentación cambia). Teclas: → / espacio = siguiente, ← = anterior, Esc = salir.
// "Guardar PDF" imprime todas las diapositivas (para la carpeta presentacion/).
// =============================================================================

const INTEGRANTES = ["alefitere06-pixel", "tejadaoperaciones-star"];
const DURACION_MIN = 15;

const PRES = { indice: 0, inicio: null, reloj: null, abierta: false };

function datosPresentacion() {
  const dias = diasConBuque();
  return {
    actual: simularPeriodo(dias, escenario()),
    clasico: simularPeriodo(dias, escenario({ tas: { activo: true, modo: "fija" } })),
    propuesta: simularPeriodo(dias, escPropuesta()),
    dia2: simularDia(2, escenario()),
  };
}

// Cada diapositiva: { titulo, html(d), despues(d, raiz) }
const DIAPOSITIVAS = [
  {
    titulo: "Portada",
    html: () => `
      <div class="pres-portada">
        <div class="pres-etiqueta">Proyecto semestral · UMIP · Medición y Rendimiento de Terminales Portuarias</div>
        <h1>Gate Inteligente</h1>
        <p class="pres-sub">Cómo sacar de la vía pública la cola de camiones de la garita de Balboa</p>
        <p class="pres-equipo">${INTEGRANTES.join(" · ")}</p>
        <span class="sello-simulado">DATOS SIMULADOS</span>
      </div>`,
  },
  {
    titulo: "El problema",
    html: (d) => `
      <h2>El problema</h2>
      <p class="pres-lead">En horas pico, la cola para entrar a la garita de Balboa no cabe en la vía de acceso
      y <strong class="peor">sale a la vía pública</strong>, cerca del Puente de las Américas.</p>
      <div class="pres-numeros">
        <div><span class="peor">${fmt(d.actual.wqPromedio)} min</span>espera promedio<br><small>meta ≤ 30</small></div>
        <div><span class="peor">${fmt(d.actual.viaPublicaMax)}</span>camiones en la vía pública<br><small>meta 0</small></div>
        <div><span class="peor">${fmt(d.actual.horasDesborde, 1)} h</span>al día con desborde<br><small>meta 0</small></div>
        <div><span class="peor">${fmt(d.actual.rhoPico)} %</span>utilización en hora pico<br><small>meta ≤ 85 %</small></div>
      </div>
      <p class="suave">Promedio de los días con buque · datos simulados.</p>`,
  },
  {
    titulo: "¿Por qué pasa?",
    html: () => `
      <h2>¿Por qué pasa? (causa raíz)</h2>
      <div class="pres-dos">
        <ol class="pres-lista">
          <li>Llegan más camiones (λ) de los que la garita atiende (μ·c).</li>
          <li>Todos llegan a la misma hora: no hay citas.</li>
          <li>Abrir carriles no alcanza: harían falta 11 y hay 6.</li>
          <li><strong>Diseño:</strong> no hay área de espera fuera de la vía.</li>
        </ol>
        <div class="pres-grafico"><canvas id="pres-graf-lambda"></canvas></div>
      </div>`,
    despues: (d) => {
      const horas = Array.from({ length: 18 }, (_, i) => i + 4);
      crearGrafico("pres-graf-lambda", {
        type: "line",
        data: { labels: horas.map(horaTexto), datasets: [
          { label: "Llegan (λ)", data: horas.map((h) => d.dia2.llegadas[h]), borderColor: color("primario"), backgroundColor: color("primario"), tension: 0.3 },
          { label: "La garita atiende (μ·c)", data: horas.map((h) => Math.round(d.dia2.capacidades[h])), borderColor: color("alerta"), borderDash: [6, 4], pointRadius: 0, stepped: "middle" },
        ] },
        options: { plugins: { title: { display: true, text: "Día 2 (martes con buque)" } }, scales: { y: { beginAtZero: true } } },
      });
    },
  },
  {
    titulo: "Cómo lo medimos",
    html: () => `
      <h2>Cómo lo medimos: KPI del curso</h2>
      <table class="pres-tabla">
        <tr><th>KPI</th><th>Fórmula</th><th>Meta</th></tr>
        <tr><td>Utilización (ρ)</td><td>λ ÷ (μ·c)</td><td>≤ 85 %</td></tr>
        <tr><td>Cola (Lq)</td><td>Cola(t+1) = máx[0; Cola(t) + λ − μc]</td><td>≤ 40 camiones</td></tr>
        <tr><td>Espera (Wq)</td><td>Ley de Little: Lq ÷ λ</td><td>≤ 30 min</td></tr>
        <tr><td>Truck Turn Time</td><td>espera + gate + patio + salida</td><td>≤ 90 min</td></tr>
        <tr><td>Horas con desborde</td><td>horas con cola &gt; vía de acceso</td><td>0 h/día</td></tr>
        <tr><td>Cumplimiento de citas</td><td>en su franja ÷ con cita × 100</td><td>≥ 85 %</td></tr>
        <tr><td>No-show</td><td>citas no usadas ÷ reservadas × 100</td><td>≤ 10 %</td></tr>
        <tr><td>Camiones en vía pública</td><td>máx(0; cola − espacio de espera)</td><td>0</td></tr>
      </table>`,
  },
  {
    titulo: "Datos simulados",
    html: () => `
      <h2>Datos simulados (y verificados a mano)</h2>
      <div class="pres-dos">
        <ul class="pres-lista">
          <li>30 días × 24 horas, semilla fija (reproducible).</li>
          <li>Picos 07–10 y 15–18 · días de buque +20 %.</li>
          <li>5 carriles abiertos · servicio 2–6 min.</li>
          <li>Vía de acceso: 40 camiones.</li>
        </ul>
        <div class="pres-caja">
          <strong>Verificación a mano · día 2, 08:00</strong><br>
          μ·c = 60 ÷ 4,08 × 5 = <strong>73,5</strong> camiones/h<br>
          ρ = 106 ÷ 73,5 = <strong>144 %</strong><br>
          Lq = 19,8 + 106 − 73,5 = <strong>52,3</strong> camiones<br>
          Wq = 52,3 ÷ 106 × 60 = <strong>29,6 min</strong> ✓ igual al dashboard
        </div>
      </div>`,
  },
  {
    titulo: "Nuestra solución",
    html: () => `
      <h2>Nuestra solución: Gate Inteligente</h2>
      <div class="pres-palancas">
        <div><div class="pres-icono">📅</div><h3>TAS dinámico</h3>
          <p>Citas que se ajustan a la capacidad real de cada hora: μ·c × 0,85. Nivela las llegadas (heijunka).</p></div>
        <div><div class="pres-icono">📲</div><h3>Cola virtual</h3>
          <p>Pre-estacionamiento fuera de la vía; una app llama al camión cuando hay espacio.</p></div>
        <div><div class="pres-icono">🔁</div><h3>Doble transacción</h3>
          <p>Descuento por entregar exportación y retirar importación en la misma visita: menos viajes.</p></div>
      </div>
      <p class="pres-lead">Sin construir carriles nuevos: usamos mejor la capacidad que ya existe.</p>`,
  },
  {
    titulo: "Antes y después",
    html: () => `<h2>Antes y después (en vivo)</h2><div id="pres-anim"></div>`,
    despues: () => crearAnimacionCola(document.getElementById("pres-anim"), { dia: 2, prefijo: "anim-pres" }),
  },
  {
    titulo: "Resultados",
    html: (d) => {
      const metas = { wqPromedio: (v) => v <= 30, lqMax: (v) => v <= 40, horasDesborde: (v) => v <= 0,
        viaPublicaMax: (v) => v <= 0, tttPromedio: (v) => v <= 90, rhoPico: (v) => v <= 85 };
      const cl = (c, v) => (metas[c](Math.round(v * 10) / 10) ? "mejor" : "peor");
      const fila = (n, c, dec = 0, meta = "") => `<tr><td>${n}</td><td class="${cl(c, d.actual[c])}">${fmt(d.actual[c], dec)}</td>
        <td class="${cl(c, d.clasico[c])}">${fmt(d.clasico[c], dec)}</td>
        <td class="${cl(c, d.propuesta[c])}"><strong>${fmt(d.propuesta[c], dec)}</strong></td><td>${meta}</td></tr>`;
      return `
      <h2>Resultados (promedio días con buque)</h2>
      <div class="pres-dos">
        <table class="pres-tabla">
          <tr><th>KPI</th><th>Actual</th><th>TAS clásico</th><th>Gate Inteligente</th><th>Meta</th></tr>
          ${fila("Espera Wq (min)", "wqPromedio", 0, "≤ 30")}
          ${fila("Cola máxima", "lqMax", 0, "≤ 40")}
          ${fila("Desborde (h/día)", "horasDesborde", 1, "0")}
          ${fila("En vía pública", "viaPublicaMax", 0, "0")}
          ${fila("TTT (min)", "tttPromedio", 0, "≤ 90")}
          ${fila("ρ pico (%)", "rhoPico", 0, "≤ 85")}
        </table>
        <div class="pres-grafico"><canvas id="pres-graf-cascada"></canvas></div>
      </div>`;
    },
    despues: () => {
      if (typeof pasosCascada === "function") {
        graficoCascada("pres-graf-cascada", pasosCascada(diasConBuque()), "wqPromedio", "Aporte de cada palanca a la espera (min)", "min");
      }
    },
  },
  {
    titulo: "Demo en vivo",
    html: () => `
      <h2>Demo en vivo del dashboard</h2>
      <p class="pres-lead">Elijan un módulo: la presentación se cierra y se abre esa pestaña.</p>
      <div class="pres-botones">
        ${MODULOS.map((m) => `<button class="boton" data-ir="${m.id}">${m.titulo}</button>`).join("")}
      </div>
      <p class="suave">Para volver a las diapositivas: botón "▶ Presentación" (sigue en esta diapositiva).</p>`,
    despues: (d, raiz) => raiz.querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", () => {
      cerrarPresentacion(); activarModulo(b.dataset.ir); window.scrollTo(0, 0);
    })),
  },
  {
    titulo: "Conclusiones",
    html: (d) => `
      <h2>Conclusiones</h2>
      <ul class="pres-lista">
        <li>El problema no es solo de carriles: es <strong>cuándo</strong> llegan los camiones y <strong>dónde</strong> esperan.</li>
        <li>Gate Inteligente baja la espera de ${fmt(d.actual.wqPromedio)} a <strong class="mejor">${fmt(d.propuesta.wqPromedio, 1)} min</strong>
          y deja <strong class="mejor">${fmt(d.propuesta.viaPublicaMax)}</strong> camiones en la vía pública.</li>
        <li>El TAS dinámico supera al TAS clásico porque mira la capacidad real de la garita.</li>
        <li>Pendiente: ρ pico queda en ${fmt(d.propuesta.rhoPico)} % (meta 85 %) → abrir el 6.º carril en horas pico de días de buque.</li>
        <li>Riesgo: si el no-show sube, el beneficio baja → penalidad y confirmación 2 h antes.</li>
      </ul>`,
  },
  {
    titulo: "Preguntas",
    html: () => `
      <div class="pres-portada">
        <h1>¡Gracias!</h1>
        <p class="pres-sub">¿Preguntas?</p>
        <p class="pres-equipo">${INTEGRANTES.join(" · ")}</p>
      </div>`,
  },
];

// ---- Construcción del modo presentación ------------------------------------
function prepararPresentacion() {
  const barra = document.querySelector(".barra-titulo");
  const btn = document.createElement("button");
  btn.className = "boton-presentar";
  btn.textContent = "▶ Presentación";
  btn.addEventListener("click", abrirPresentacion);
  barra.appendChild(btn);

  const capa = document.createElement("div");
  capa.id = "presentacion";
  capa.className = "presentacion";
  capa.innerHTML = `
    <div class="pres-barra">
      <span id="pres-contador"></span>
      <span id="pres-reloj" title="Tiempo de exposición (meta 15 min)">00:00</span>
      <button class="boton secundario" id="pres-pdf">🖨 Guardar PDF</button>
      <button class="boton secundario" id="pres-ant">◀</button>
      <button class="boton" id="pres-sig">▶</button>
      <button class="boton secundario" id="pres-salir">✕ Salir</button>
    </div>
    <div class="pres-progreso"><div id="pres-progreso-barra"></div></div>
    <div id="pres-diapositivas"></div>`;
  document.body.appendChild(capa);

  capa.querySelector("#pres-sig").addEventListener("click", () => irDiapositiva(PRES.indice + 1));
  capa.querySelector("#pres-ant").addEventListener("click", () => irDiapositiva(PRES.indice - 1));
  capa.querySelector("#pres-salir").addEventListener("click", cerrarPresentacion);
  capa.querySelector("#pres-pdf").addEventListener("click", imprimirPresentacion);
  document.addEventListener("keydown", (e) => {
    if (!PRES.abierta) return;
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); irDiapositiva(PRES.indice + 1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); irDiapositiva(PRES.indice - 1); }
    if (e.key === "Escape") cerrarPresentacion();
  });
}

function abrirPresentacion() {
  PRES.abierta = true;
  document.body.classList.add("presentando");
  if (!PRES.inicio) PRES.inicio = Date.now();
  clearInterval(PRES.reloj);
  PRES.reloj = setInterval(actualizarReloj, 1000);
  actualizarReloj();
  irDiapositiva(PRES.indice);
}

function cerrarPresentacion() {
  PRES.abierta = false;
  document.body.classList.remove("presentando");
  clearInterval(PRES.reloj);
  if (ANIMACIONES["anim-pres"]) ANIMACIONES["anim-pres"].detener();
}

function actualizarReloj() {
  const s = Math.floor((Date.now() - PRES.inicio) / 1000);
  const el = document.getElementById("pres-reloj");
  el.textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  el.classList.toggle("peor", s > DURACION_MIN * 60);
}

function renderDiapositiva(i, d) {
  const sec = document.createElement("section");
  sec.className = "diapositiva";
  sec.innerHTML = DIAPOSITIVAS[i].html(d) + `<div class="pres-pie">Gate Balboa · ${i + 1}/${DIAPOSITIVAS.length} · datos simulados</div>`;
  return sec;
}

function irDiapositiva(i) {
  PRES.indice = Math.max(0, Math.min(DIAPOSITIVAS.length - 1, i));
  if (ANIMACIONES["anim-pres"]) ANIMACIONES["anim-pres"].detener();
  const d = datosPresentacion();
  const cont = document.getElementById("pres-diapositivas");
  cont.innerHTML = "";
  const sec = renderDiapositiva(PRES.indice, d);
  cont.appendChild(sec);
  if (DIAPOSITIVAS[PRES.indice].despues) DIAPOSITIVAS[PRES.indice].despues(d, sec);
  document.getElementById("pres-contador").textContent =
    `${PRES.indice + 1} / ${DIAPOSITIVAS.length} · ${DIAPOSITIVAS[PRES.indice].titulo}`;
  document.getElementById("pres-progreso-barra").style.width = ((PRES.indice + 1) / DIAPOSITIVAS.length * 100) + "%";
}

// Dibuja TODAS las diapositivas una debajo de otra (una por página) e imprime
function imprimirPresentacion() {
  if (ANIMACIONES["anim-pres"]) ANIMACIONES["anim-pres"].detener();
  const d = datosPresentacion();
  const cont = document.getElementById("pres-diapositivas");
  cont.innerHTML = "";
  DIAPOSITIVAS.forEach((diapo, i) => {
    const sec = renderDiapositiva(i, d);
    cont.appendChild(sec);
    if (diapo.despues) diapo.despues(d, sec);
  });
  document.body.classList.add("imprimiendo");
  setTimeout(() => {
    window.print();
    document.body.classList.remove("imprimiendo");
    irDiapositiva(PRES.indice);
  }, 300);
}

document.addEventListener("DOMContentLoaded", prepararPresentacion);
