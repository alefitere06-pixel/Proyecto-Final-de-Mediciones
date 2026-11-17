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
  titulo: "Puerto y fila",
  intro: "Mira primero la ubicación real del Puerto de Balboa y después reproduce la fila simulada del día elegido.",
  render(contenedor, estado) {
    contenedor.innerHTML = `
      <section class="mapa-portada">
        <div class="mapa-portada-texto">
          <span class="seccion-etiqueta">UBICACIÓN REAL</span>
          <h2>Puerto de Balboa y sus alrededores</h2>
          <p>Consulta la terminal, el Puente de las Américas y las vías cercanas en Google Maps. Los enlaces se abren en una pestaña nueva y necesitan internet.</p>
          <div class="mapa-enlaces">
            <a class="boton" href="https://www.google.com/maps/search/?api=1&amp;query=Puerto+de+Balboa%2C+Panam%C3%A1" target="_blank" rel="noopener">Ver el puerto en Google Maps ↗</a>
            <a class="boton secundario" href="https://www.google.com/maps/@?api=1&amp;map_action=map&amp;center=8.9559%2C-79.5676&amp;zoom=14" target="_blank" rel="noopener">Explorar alrededores ↗</a>
            <a class="mapa-enlace-simple" href="https://www.google.com/maps/dir/?api=1&amp;destination=Puerto+de+Balboa%2C+Panam%C3%A1" target="_blank" rel="noopener">Cómo llegar al Puerto de Balboa ↗</a>
          </div>
        </div>
        <figure class="mapa-foto-real">
          <img src="img/operacion-contenedor-balboa.jpg" alt="Camión con contenedor pasando por equipo de inspección en el Puerto de Balboa">
          <figcaption>Operación real en Balboa · Foto: U.S. GAO, <a href="https://commons.wikimedia.org/wiki/File:Figure_3-_Panama_Customs_Examining_a_Container_Using_Imaging_Equipment,_Port_of_Balboa,_Panama_(10408265725).jpg" target="_blank" rel="noopener">dominio público</a></figcaption>
        </figure>
      </section>
      <section class="mapa-simulacion">
        <div class="mapa-seccion-cabecera"><div><span class="seccion-etiqueta">SIMULACIÓN DEL PROYECTO</span><h3>Así crece la fila durante el día ${estado.dia}</h3></div><p>Cada punto representa un camión. Pulsa ▶ para reproducir el día.</p></div>
        <div id="mapa-fila"></div>
      </section>
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
