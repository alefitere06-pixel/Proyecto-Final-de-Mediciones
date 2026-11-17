// =============================================================================
// temas.js · Estilos visuales del dashboard (para elegir uno)
// -----------------------------------------------------------------------------
//   logistica  · A: tarjetas claras sobre gris, acentos morado/verde, camión al centro
//   tecnico    · B: verde salvia, diagrama técnico de la garita con alarmas
//   ejecutivo  · C: blanco con naranja, saludo, KPI con mini-gráficos
//   clasico    · el diseño original
// Se elige con el selector "Estilo" de la barra o con ?tema=logistica en la dirección.
// Cuando el grupo escoja uno, cambien TEMA_POR_DEFECTO.
// =============================================================================

const TEMAS = {
  logistica: "A · Logística",
  tecnico: "B · Técnico",
  ejecutivo: "C · Ejecutivo",
  clasico: "Original",
};
const TEMA_POR_DEFECTO = "logistica";

function temaInicial() {
  try {
    const url = new URLSearchParams(location.search).get("tema");
    if (url && TEMAS[url]) return url;
  } catch (e) { /* sin acceso a la URL */ }
  if (typeof TEMA_FORZADO !== "undefined" && TEMAS[TEMA_FORZADO]) return TEMA_FORZADO;
  try {
    const guardado = localStorage.getItem("gate-balboa-tema");
    if (guardado && TEMAS[guardado]) return guardado;
  } catch (e) { /* almacenamiento bloqueado */ }
  return TEMA_POR_DEFECTO;
}

function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  try { localStorage.setItem("gate-balboa-tema", tema); } catch (e) { /* sin almacenamiento */ }
}

aplicarTema(temaInicial());

document.addEventListener("DOMContentLoaded", () => {
  const barra = document.querySelector(".barra-titulo");
  const etq = document.createElement("label");
  etq.className = "selector-tema";
  etq.innerHTML = `Estilo <select id="selector-tema">${Object.entries(TEMAS)
    .map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>`;
  barra.appendChild(etq);
  const sel = etq.querySelector("select");
  sel.value = document.documentElement.dataset.tema;
  sel.addEventListener("change", () => {
    aplicarTema(sel.value);
    refrescar(); // los gráficos leen los colores del tema al dibujarse
  });
});
