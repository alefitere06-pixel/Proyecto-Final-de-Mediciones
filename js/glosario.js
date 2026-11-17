// =============================================================================
// glosario.js · Palabras explicadas para cualquier persona (sin saber de puertos)
// -----------------------------------------------------------------------------
// ayuda("espera")  -> ícono ⓘ con la explicación (al pasar el mouse o tocarlo)
// Botón "📖 ¿Qué significa?" en la barra: abre el glosario completo.
// =============================================================================

const GLOSARIO = {
  garita: ["Garita", "", "La puerta de entrada del puerto. Ahí revisan los papeles y el contenedor de cada camión antes de dejarlo entrar."],
  carril: ["Carril de la garita", "c", "Cada ventanilla de la puerta donde se atiende un camión a la vez. Hay 6; normalmente se abren 5."],
  llegadas: ["Camiones que llegan por hora", "λ", "Cuántos camiones llegan a la puerta en una hora."],
  capacidad: ["Camiones que la puerta puede atender por hora", "μ·c", "Si revisar un camión toma 4 minutos, un carril atiende 15 por hora; con 5 carriles, 75 por hora."],
  ocupacion: ["Qué tan llena está la puerta", "ρ", "Camiones que llegan ÷ camiones que puede atender. Más de 100 % significa que llegan más de los que se atienden y la fila crece sin parar. Lo sano es 85 % o menos."],
  fila: ["Camiones esperando (fila)", "Lq", "Cuántos camiones están haciendo fila para entrar en ese momento."],
  espera: ["Minutos de espera", "Wq", "Cuánto espera un camión en la fila antes de entrar. Se calcula con la Ley de Little: camiones en la fila ÷ camiones que llegan por hora."],
  carrilEspera: ["Carril de espera (vía de acceso)", "", "El tramo de calle frente a la puerta donde los camiones pueden hacer fila sin molestar a nadie. Caben unos 40."],
  calle: ["Fila en la calle (vía pública)", "", "Cuando la fila no cabe en el carril de espera, los camiones quedan en la calle y bloquean el tránsito cerca del Puente de las Américas."],
  desborde: ["Hora con fila en la calle (desborde)", "", "Una hora en la que la fila no cupo en el carril de espera y salió a la calle."],
  ttt: ["Tiempo total del camión", "TTT", "Todo el tiempo que pasa un camión: esperar afuera + pasar la puerta + cargar o descargar adentro + salir."],
  citas: ["Sistema de citas", "TAS", "Como reservar turno en el médico: cada camión elige una hora para llegar, así no llegan todos juntos."],
  citasDinamicas: ["Citas inteligentes (TAS dinámico)", "", "Nuestra versión: cada hora solo ofrece las citas que la puerta realmente puede atender, sin llenarse más del 85 %."],
  noShow: ["Citas sin usar (no-show)", "", "Camiones que reservaron cita y no llegaron a su hora."],
  cumplimiento: ["Llegan a su hora", "", "De los camiones con cita, cuántos llegaron a la hora que reservaron."],
  preEst: ["Estacionamiento de espera (fila virtual)", "", "Un estacionamiento fuera de la calle donde esperan los camiones; una app les avisa cuando pueden ir a la puerta."],
  doble: ["Doble viaje en uno (doble transacción)", "", "Que un camión deje un contenedor y se lleve otro en la misma visita, en vez de hacer dos viajes."],
  buque: ["Día de buque", "", "Día en que llega un barco grande. Ese día llegan más camiones a dejar o recoger contenedores."],
  pico: ["Hora pico", "", "Las horas con más camiones: en la mañana (7 a 10) y en la tarde (3 a 6)."],
  simulados: ["Datos simulados", "", "Números creados por un programa con reglas realistas, para practicar. No son datos reales del puerto."],
  kpi: ["Indicador (KPI)", "", "Un número que dice si algo va bien o mal comparándolo con una meta."],
  lean: ["Lean y desperdicio", "", "Forma de mejorar quitando lo que no agrega valor. Esperar en una fila es un desperdicio: nadie gana nada."],
};

function ayuda(clave) {
  const g = GLOSARIO[clave];
  if (!g) return "";
  return `<button type="button" class="ayuda" data-glosario="${clave}" title="${g[0]}: ${g[2]}" aria-label="¿Qué significa ${g[0]}?">i</button>`;
}

function abrirGlosario(clave) {
  let capa = document.getElementById("glosario");
  if (!capa) {
    capa = document.createElement("div");
    capa.id = "glosario";
    capa.className = "glosario";
    capa.innerHTML = `<div class="glosario-caja" role="dialog" aria-label="Glosario">
      <div class="glosario-cabeza"><strong>📖 ¿Qué significa cada palabra?</strong>
        <button class="boton secundario" id="glosario-cerrar">✕ Cerrar</button></div>
      <dl>${Object.entries(GLOSARIO).map(([k, g]) => `<div id="glo-${k}" class="glosario-item">
        <dt>${g[0]} ${g[1] ? `<span class="simbolo">${g[1]}</span>` : ""}</dt><dd>${g[2]}</dd></div>`).join("")}</dl>
    </div>`;
    document.body.appendChild(capa);
    capa.addEventListener("click", (e) => { if (e.target === capa) capa.classList.remove("abierto"); });
    capa.querySelector("#glosario-cerrar").addEventListener("click", () => capa.classList.remove("abierto"));
  }
  capa.classList.add("abierto");
  capa.querySelectorAll(".glosario-item").forEach((x) => x.classList.remove("resaltado"));
  if (clave) {
    const item = capa.querySelector("#glo-" + clave);
    if (item) { item.classList.add("resaltado"); item.scrollIntoView({ block: "center" }); }
  }
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-glosario]");
  if (b) { e.preventDefault(); abrirGlosario(b.dataset.glosario); }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { const c = document.getElementById("glosario"); if (c) c.classList.remove("abierto"); }
});
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.createElement("button");
  btn.className = "boton-glosario";
  btn.textContent = "📖 ¿Qué significa?";
  btn.addEventListener("click", () => abrirGlosario());
  document.querySelector(".barra-titulo").appendChild(btn);
});
