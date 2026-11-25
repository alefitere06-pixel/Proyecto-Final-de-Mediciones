// =============================================================================
// app.js · Navegación por pestañas, filtro de día y tarjetas KPI
// -----------------------------------------------------------------------------
// Cada módulo (js/modulos/*.js) se registra con MODULOS.push({...}) y tiene:
//   id, titulo, dueno, render(contenedor, estado)
// `estado` es compartido por todos los módulos (día elegido, escenario, etc.).
// =============================================================================

const ESTADO = {
  dia: 2,               // día por defecto: un día de buque con cola
  moduloActivo: null,
};

// Las rutas analíticas ya no aparecen como páginas independientes. Si alguien
// abre un enlace antiguo, se conserva la sección solicitada dentro de Terminal
// User, donde la sesión por rol controla el acceso.
const RUTAS_TERMINAL = Object.freeze({
  llegadas: "llegadas",
  simulador: "operacion",
  ttt: "ttt",
  citas: "citas",
  mejora: "mejora",
});

function resolverRutaTerminal(id) {
  const vista = RUTAS_TERMINAL[id];
  if (!vista) return id;
  if (typeof TERMINAL_ESTADO !== "undefined") TERMINAL_ESTADO.vista = vista;
  if (location.hash.slice(1) !== "terminal") {
    try { history.replaceState(null, "", "#terminal"); } catch (_) { /* file:// */ }
  }
  return "terminal";
}

// Gráficos de Chart.js activos (para destruirlos antes de redibujar)
const GRAFICOS = {};
function crearGrafico(idCanvas, config) {
  if (GRAFICOS[idCanvas]) GRAFICOS[idCanvas].destroy();
  const canvas = document.getElementById(idCanvas);
  config.options = Object.assign({ animation: false, maintainAspectRatio: false }, config.options);
  GRAFICOS[idCanvas] = new Chart(canvas, config);
  return GRAFICOS[idCanvas];
}

// Formato de números en español
function fmt(n, dec = 0) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("es-PA", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function horaTexto(h) {
  return String(h).padStart(2, "0") + ":00";
}

// ---- Tarjetas KPI -----------------------------------------------------------
// cumple(valor) devuelve true si se cumple la meta.
function definirTarjetas(k, citasDia) {
  const M = KPI.METAS;
  const cumplimiento = KPI.cumplimientoCitas(citasDia.dentro_franja, citasDia.usadas);
  const noShow = KPI.noShow(citasDia.reservadas - citasDia.usadas, citasDia.reservadas);
  return [
    { nombre: "Espera promedio", ayuda: "espera", valor: fmt(k.wqPromedio) + " min", meta: `ideal: ${M.wq_min} min o menos`, cumple: k.wqPromedio <= M.wq_min,
      explica: `Cada camión esperó unos ${fmt(k.wqPromedio)} minutos para entrar.` },
    { nombre: "Camiones esperando (máximo)", ayuda: "fila", valor: fmt(k.lqMax), meta: `solo caben ${M.lq_max} en el carril de espera`, cumple: k.lqMax <= M.lq_max,
      explica: k.lqMax > M.lq_max ? `${fmt(k.lqMax - M.lq_max)} quedaron en la calle.` : "La fila cupo en su carril." },
    { nombre: "¿Qué tan llena está la puerta?", ayuda: "ocupacion", valor: fmt(k.rhoPico) + " %", meta: `sano: ${M.rho_pct} % o menos`, cumple: k.rhoPico <= M.rho_pct,
      explica: k.rhoPico > 100 ? `A las ${horaTexto(k.horaPico)} llegan más camiones de los que puede atender.` : `A las ${horaTexto(k.horaPico)}, la hora con más camiones.` },
    { nombre: "Tiempo total del camión", ayuda: "ttt", valor: fmt(k.tttPromedio) + " min", meta: `ideal: ${M.ttt_min} min o menos`, cumple: k.tttPromedio <= M.ttt_min,
      explica: "Desde que llega a la fila hasta que sale del puerto." },
    { nombre: "Horas con fila en la calle", ayuda: "desborde", valor: fmt(k.horasDesborde) + " h", meta: `ideal: ${M.desborde_h} horas`, cumple: k.horasDesborde <= M.desborde_h,
      explica: "Horas en que la fila bloqueó la calle." },
    { nombre: "Llegan a su hora (citas)", ayuda: "cumplimiento", valor: fmt(cumplimiento, 1) + " %", meta: `ideal: ${M.cumplimiento_pct} % o más · prueba piloto`, cumple: cumplimiento >= M.cumplimiento_pct,
      explica: "De los camiones con cita, cuántos llegaron a su hora." },
    { nombre: "Citas sin usar", ayuda: "noShow", valor: fmt(noShow, 1) + " %", meta: `ideal: ${M.noshow_pct} % o menos · prueba piloto`, cumple: noShow <= M.noshow_pct,
      explica: "Reservaron turno y no llegaron." },
  ];
}

function pintarTarjetas() {
  const k = kpiDelDia(registrosDelDia(ESTADO.dia));
  const citasDia = DATOS.citas_piloto.find((c) => c.dia === ESTADO.dia);
  const lista = definirTarjetas(k, citasDia);
  const malos = lista.filter((x) => x.cumple === false).length;
  document.getElementById("kpi-resumen").innerHTML = `📊 Indicadores del día ${ESTADO.dia}: ` +
    (malos ? `<span class="peor">${malos} de ${lista.length} en rojo</span>` : `<span class="mejor">todos en verde</span>`) +
    ` <span class="suave">(tocar para ver)</span>`;
  document.getElementById("tarjetas-kpi").innerHTML = htmlTarjetas(lista)
    .replace(/^<div class="tarjetas">/, "").replace(/<\/div>$/, "");
}

// ---- Filtro de día ----------------------------------------------------------
function prepararFiltroDia() {
  const sel = document.getElementById("filtro-dia");
  sel.innerHTML = DATOS.dias.map((d) =>
    `<option value="${d.dia}">Día ${d.dia} · ${d.dia_semana} ${d.fecha}${d.dia_buque ? " · buque" : ""}</option>`
  ).join("");
  sel.value = ESTADO.dia;
  sel.addEventListener("change", () => {
    ESTADO.dia = Number(sel.value);
    refrescar();
  });
}

function pintarInfoDia() {
  const d = DATOS.dias.find((x) => x.dia === ESTADO.dia);
  document.getElementById("info-dia").innerHTML =
    `${fmt(d.llegadas)} camiones llegaron este día · ` +
    (d.dia_buque ? `<span class="etiqueta-buque">llegó un barco grande (día de buque)</span>${ayuda("buque")}` : "no llegó barco grande");
}

// ---- Pestañas ---------------------------------------------------------------
// ---- Pestañas como enlaces (#inicio, #mapa, ...) ------------------------------
// Cada pestaña es un hipervínculo: se puede compartir el enlace, usar "atrás" del
// navegador y saltar de una sección a otra con <a href="#simulador">.
function prepararPestanas() {
  const nav = document.getElementById("pestanas");
  const principales = ["inicio", "mapa", "pase", "terminal", "cliente"];
  const nombres = { mapa: "Mapa", pase: "Pase QR", terminal: "Terminal User", cliente: "Customer User" };
  const visibles = principales.map((id) => MODULOS.find((m) => m.id === id)).filter(Boolean);
  nav.innerHTML = visibles.map((m) =>
    `<a href="#${m.id}" data-id="${m.id}">${nombres[m.id] || m.titulo}</a>`).join("");
  window.addEventListener("hashchange", () => {
    const solicitado = location.hash.slice(1) || "inicio";
    const id = resolverRutaTerminal(solicitado);
    if (MODULOS.some((m) => m.id === id) && (id !== ESTADO.moduloActivo || Boolean(RUTAS_TERMINAL[solicitado]))) mostrarModulo(id);
  });
}

// Ir a un módulo desde el código (botones, presentación): cambia el enlace
function activarModulo(id) {
  id = resolverRutaTerminal(id);
  if (location.hash.slice(1) !== id) {
    try { history.pushState(null, "", "#" + id); } catch (e) { /* file:// sin historial */ }
  }
  mostrarModulo(id);
}

function mostrarModulo(id) {
  id = resolverRutaTerminal(id);
  ESTADO.moduloActivo = id;
  document.body.dataset.modulo = id;   // permite estilos por pestaña (ej. ocultar tarjetas en Inicio)
  document.querySelectorAll("#pestanas a").forEach((b) =>
    b.classList.toggle("activa", b.dataset.id === id));
  pintarModulo();
  window.scrollTo(0, 0);
}

function pintarModulo() {
  const i = MODULOS.findIndex((x) => x.id === ESTADO.moduloActivo);
  const m = MODULOS[i];
  const contenedor = document.getElementById("contenido-modulo");
  // Detener animaciones de la pestaña anterior (no las de la presentación)
  Object.entries(ANIMACIONES).forEach(([k, a]) => { if (k !== "anim-pres") a.detener(); });
  contenedor.innerHTML = "";
  m.render(contenedor, ESTADO);
  if (m.intro && !["inicio", "mapa", "pase", "solucion"].includes(m.id)) {
    const titulo = Array.from(contenedor.children).find((elemento) => elemento.tagName === "H2");
    if (titulo) {
      const cabecera = document.createElement("header");
      const etiqueta = document.createElement("span");
      const introduccion = document.createElement("p");
      cabecera.className = "cabecera-modulo-foto";
      etiqueta.className = "seccion-etiqueta";
      etiqueta.textContent = "GATEFLOW · PUERTO DE BALBOA";
      titulo.classList.add("cabecera-modulo-titulo");
      introduccion.textContent = m.intro;
      cabecera.append(etiqueta, titulo, introduccion);
      contenedor.insertAdjacentElement("afterbegin", cabecera);
    } else {
      contenedor.insertAdjacentHTML("afterbegin", `<p class="intro-modulo">${m.intro}</p>`);
    }
  }

  // Migas: Inicio › Sección
  document.getElementById("migas").innerHTML = m.id === "inicio" ? "" :
    `<a href="#inicio">Inicio</a> <span>›</span> <strong>${m.titulo}</strong>`;
  // Anterior / Siguiente: recorrido guiado por todas las secciones
  const ant = MODULOS[i - 1], sig = MODULOS[i + 1];
  document.getElementById("nav-pie").innerHTML = `
    ${ant ? `<a href="#${ant.id}" class="nav-ant">← ${ant.titulo}</a>` : "<span></span>"}
    ${sig ? `<a href="#${sig.id}" class="nav-sig">Siguiente: ${sig.titulo} →</a>` : `<a href="#inicio" class="nav-sig">Volver al inicio ↺</a>`}`;
}

function refrescar() {
  pintarInfoDia();
  pintarTarjetas();
  pintarModulo();
}

// Aviso estándar para módulos que todavía no se construyen
function avisoEnConstruccion(contenedor, modulo, tareas, prompt) {
  contenedor.innerHTML = `
    <h2>${modulo.titulo}</h2>
    <div class="en-construccion">
      <p><strong>Módulo en construcción.</strong> Abierto a todo el grupo: cualquiera puede mejorarlo
      (anoten su usuario en <code>docs/tareas.md</code>) · Rama sugerida: <code>${modulo.rama}</code></p>
      <p>Qué debe mostrar y hacer:</p>
      <ul>${tareas.map((t) => `<li>${t}</li>`).join("")}</ul>
      <p>Prompt sugerido para el agente de IA:</p>
      <p><code>${prompt}</code></p>
    </div>`;
}

// ---- Ayudas para los módulos ------------------------------------------------
// Tarjetas KPI pequeñas: lista de { nombre, valor, meta, cumple }
function htmlTarjetas(lista) {
  return `<div class="tarjetas">` + lista.map((t) => `
    <div class="tarjeta ${t.cumple === false ? "no-cumple" : t.cumple === undefined ? "neutra" : ""}">
      <div class="nombre">${t.nombre}${t.ayuda ? ayuda(t.ayuda) : ""}</div>
      <div class="valor">${t.valor}</div>
      <div class="meta">${t.meta ?? ""}</div>
      ${t.cumple === undefined ? "" : `<div class="estado">${t.cumple ? "✓ Bien" : "✗ Mal"}</div>`}
      ${t.explica ? `<div class="explica">${t.explica}</div>` : ""}
    </div>`).join("") + `</div>`;
}

// Slider con etiqueta y valor visible
function htmlSlider(id, etiqueta, min, max, paso, valor, unidad = "") {
  return `<label class="slider">
      <span>${etiqueta}: <strong id="${id}-valor">${valor}${unidad}</strong></span>
      <input type="range" id="${id}" min="${min}" max="${max}" step="${paso}" value="${valor}" data-unidad="${unidad}">
    </label>`;
}

// Conecta un slider: actualiza el número visible y llama a alCambiar(valor)
function conectarSlider(contenedor, id, alCambiar) {
  const input = contenedor.querySelector("#" + id);
  const etiqueta = contenedor.querySelector("#" + id + "-valor");
  input.addEventListener("input", () => {
    etiqueta.textContent = input.value + input.dataset.unidad;
    alCambiar(Number(input.value));
  });
}

// Convierte una lista de horas en tramos: [7,8,9,15,16] -> "07:00–10:00 y 15:00–17:00"
function tramosHorarios(horas) {
  const tramos = [];
  horas.forEach((h) => {
    const ult = tramos[tramos.length - 1];
    if (ult && h === ult[1] + 1) ult[1] = h; else tramos.push([h, h]);
  });
  return tramos.map(([a, b]) => `${horaTexto(a)}–${horaTexto(b + 1)}`).join(" y ");
}

// Colores del tema (desde las variables CSS)
function color(nombre) {
  return getComputedStyle(document.documentElement).getPropertyValue("--" + nombre).trim();
}

// ---- Inicio -----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  prepararFiltroDia();
  prepararPestanas();
  const pedido = resolverRutaTerminal(location.hash.slice(1));
  ESTADO.moduloActivo = MODULOS.some((m) => m.id === pedido) ? pedido : "inicio";
  mostrarModulo(ESTADO.moduloActivo);
  pintarInfoDia();
  pintarTarjetas();
});
