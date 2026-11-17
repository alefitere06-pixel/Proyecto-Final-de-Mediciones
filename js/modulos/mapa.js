// =============================================================================
// Módulo · Mapa y fila en vivo
// Abierto a todo el grupo · Rama: mejora-mapa
// -----------------------------------------------------------------------------
// La fila de camiones dibujada sobre el mapa del Puerto de Balboa (js/mapaFila.js).
// Botones Hoy / Con nuestra propuesta y reproducción del día completo.
// La comparación "en línea recta" (js/animacion.js) queda en "Ver más".
// =============================================================================

MODULOS.unshift({   // unshift: queda antes de Llegadas (Inicio se agrega después y queda primero)
  id: "mapa",
  titulo: "La fila en el mapa",
  intro: "Cada punto es un camión esperando para entrar al puerto. Toquen ▶ para ver cómo crece la fila durante el día.",
  render(contenedor, estado) {
    contenedor.innerHTML = `
      <h2>La fila en el mapa del Puerto de Balboa · día ${estado.dia}</h2>
      <div id="mapa-fila"></div>
      <details class="mas">
        <summary>Ver más: comparación lado a lado (hoy vs propuesta)</summary>
        <div id="anim-mapa"></div>
      </details>`;
    crearMapaFila(contenedor.querySelector("#mapa-fila"), { dia: estado.dia, prefijo: "mf-mapa" });
    const det = contenedor.querySelector("details.mas");
    det.addEventListener("toggle", () => {
      if (det.open && !det.dataset.listo) {
        det.dataset.listo = "1";
        crearAnimacionCola(contenedor.querySelector("#anim-mapa"), { dia: estado.dia, prefijo: "anim-mapa" });
      }
    });
  },
});
