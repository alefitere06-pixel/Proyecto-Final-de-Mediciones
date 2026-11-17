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

// Gráficos de Chart.js activos (para destruirlos antes de redibujar)
const GRAFICOS = {};
function crearGrafico(idCanvas, config) {
  if (GRAFICOS[idCanvas]) GRAFICOS[idCanvas].destroy();
  const canvas = document.getElementById(idCanvas);
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
    { nombre: "Espera promedio (Wq)", valor: fmt(k.wqPromedio) + " min", meta: `meta ≤ ${M.wq_min} min`, cumple: k.wqPromedio <= M.wq_min },
    { nombre: "Cola máxima (Lq)", valor: fmt(k.lqMax) + " camiones", meta: `límite vía ${M.lq_max}`, cumple: k.lqMax <= M.lq_max },
    { nombre: `Utilización pico (ρ) ${horaTexto(k.horaPico)}`, valor: fmt(k.rhoPico) + " %", meta: `meta ≤ ${M.rho_pct} %`, cumple: k.rhoPico <= M.rho_pct },
    { nombre: "Truck Turn Time (TTT)", valor: fmt(k.tttPromedio) + " min", meta: `meta ≤ ${M.ttt_min} min`, cumple: k.tttPromedio <= M.ttt_min },
    { nombre: "Horas con desborde", valor: fmt(k.horasDesborde) + " h/día", meta: `meta ${M.desborde_h}`, cumple: k.horasDesborde <= M.desborde_h },
    { nombre: "Cumplimiento de citas", valor: fmt(cumplimiento, 1) + " %", meta: `meta ≥ ${M.cumplimiento_pct} % (piloto)`, cumple: cumplimiento >= M.cumplimiento_pct },
    { nombre: "No-show", valor: fmt(noShow, 1) + " %", meta: `meta ≤ ${M.noshow_pct} % (piloto)`, cumple: noShow <= M.noshow_pct },
  ];
}

function pintarTarjetas() {
  const k = kpiDelDia(registrosDelDia(ESTADO.dia));
  const citasDia = DATOS.citas_piloto.find((c) => c.dia === ESTADO.dia);
  const html = definirTarjetas(k, citasDia).map((t) => `
    <div class="tarjeta ${t.cumple ? "" : "no-cumple"}">
      <div class="nombre">${t.nombre}</div>
      <div class="valor">${t.valor}</div>
      <div class="meta">${t.meta}</div>
      <div class="estado">${t.cumple ? "✓ cumple" : "✗ no cumple"}</div>
    </div>`).join("");
  document.getElementById("tarjetas-kpi").innerHTML = html;
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
    `${fmt(d.llegadas)} camiones llegaron · ` +
    (d.dia_buque ? `<span class="etiqueta-buque">día de buque</span>` : "día sin buque");
}

// ---- Pestañas ---------------------------------------------------------------
function prepararPestanas() {
  const nav = document.getElementById("pestanas");
  nav.innerHTML = MODULOS.map((m, i) =>
    `<button data-id="${m.id}">${i + 1} · ${m.titulo}</button>`).join("");
  nav.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => activarModulo(b.dataset.id)));
}

function activarModulo(id) {
  ESTADO.moduloActivo = id;
  document.querySelectorAll("#pestanas button").forEach((b) =>
    b.classList.toggle("activa", b.dataset.id === id));
  pintarModulo();
}

function pintarModulo() {
  const m = MODULOS.find((x) => x.id === ESTADO.moduloActivo);
  const contenedor = document.getElementById("contenido-modulo");
  contenedor.innerHTML = "";
  m.render(contenedor, ESTADO);
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
      <p><strong>Módulo en construcción.</strong> Responsable: ${modulo.dueno} ·
      Rama sugerida: <code>${modulo.rama}</code></p>
      <p>Qué debe mostrar y hacer:</p>
      <ul>${tareas.map((t) => `<li>${t}</li>`).join("")}</ul>
      <p>Prompt sugerido para el agente de IA:</p>
      <p><code>${prompt}</code></p>
    </div>`;
}

// ---- Inicio -----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  prepararFiltroDia();
  prepararPestanas();
  activarModulo(MODULOS[0].id);
  refrescar();
});
