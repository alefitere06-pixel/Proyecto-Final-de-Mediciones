// =============================================================================
// Módulo · Mapa y fila en vivo
// Abierto a todo el grupo · Rama: mejora-mapa
// -----------------------------------------------------------------------------
// Google Maps muestra el tráfico real en vista vectorial inclinada.
// El modelo GateFlow permanece debajo y se identifica como escenario del proyecto.
// =============================================================================

MODULOS.unshift({   // unshift: queda antes de Llegadas (Inicio se agrega después y queda primero)
  id: "mapa",
  titulo: "Puerto y fila",
  intro: "Consulta el tráfico de Google alrededor del Puerto de Balboa y compáralo con el modelo operativo GateFlow.",
  render(contenedor, estado) {
    contenedor.innerHTML = `
      <section class="mapa-portada">
        <div class="mapa-portada-texto">
          <span class="seccion-etiqueta">TRÁFICO REAL + VISTA 3D</span>
          <h2>Balboa se mueve en un mapa vivo</h2>
          <p>Explora Panama Ports Company, la entrada de la terminal, el Puente de las Américas y las calles aledañas. Google marca en rojo las vías congestionadas y en verde las que mantienen fluidez, donde exista cobertura.</p>
          <div class="mapa-enlaces">
            <a class="boton" href="https://www.google.com/maps/search/?api=1&amp;query=Puerto+de+Balboa%2C+Panam%C3%A1" target="_blank" rel="noopener">Abrir en Google Maps ↗</a>
            <a class="mapa-enlace-simple" href="https://www.google.com/maps/dir/?api=1&amp;destination=Puerto+de+Balboa%2C+Panam%C3%A1" target="_blank" rel="noopener">Trazar ruta al puerto ↗</a>
          </div>
        </div>
        <figure class="mapa-foto-real">
          <img src="img/operacion-contenedor-balboa.jpg" alt="Camión con contenedor pasando por equipo de inspección en el Puerto de Balboa">
          <figcaption>Operación real en Balboa · Foto: U.S. GAO, <a href="https://commons.wikimedia.org/wiki/File:Figure_3-_Panama_Customs_Examining_a_Container_Using_Imaging_Equipment,_Port_of_Balboa,_Panama_(10408265725).jpg" target="_blank" rel="noopener">dominio público</a></figcaption>
        </figure>
      </section>

      <section class="mapa-google-seccion" aria-labelledby="mapa-google-titulo">
        <div class="mapa-seccion-cabecera">
          <div>
            <span class="seccion-etiqueta">GOOGLE MAPS · CAPA DE TRÁFICO</span>
            <h3 id="mapa-google-titulo">Estado de las vías alrededor de Balboa</h3>
          </div>
          <p data-google-estado>Preparando conexión con Google Maps…</p>
        </div>

        <div class="mapa-google-marco">
          <div class="mapa-google-lienzo" data-google-mapa hidden role="application" aria-label="Mapa 3D de Google del área de Balboa con tráfico"></div>
          <div class="mapa-google-aviso" data-google-aviso>
            <span class="mapa-google-icono" aria-hidden="true">3D</span>
            <div>
              <strong>Mapa preparado para conexión segura</strong>
              <p data-google-detalle>Consultando la configuración de Google Maps…</p>
              <small>La clave se configura en el servidor y no se guarda en GitHub.</small>
            </div>
          </div>

          <div class="mapa-google-controles" data-google-controles hidden aria-label="Controles del mapa">
            <button type="button" data-mapa-centro>Balboa</button>
            <button type="button" data-mapa-3d aria-pressed="true">Vista cenital</button>
            <button type="button" data-mapa-trafico aria-pressed="true">Ocultar tráfico</button>
            <button type="button" data-mapa-tipo>Ver satélite</button>
          </div>
        </div>

        <div class="mapa-leyenda" aria-label="Leyenda del tráfico">
          <span><i class="fluido"></i> Fluido</span>
          <span><i class="moderado"></i> Moderado</span>
          <span><i class="congestion"></i> Congestión</span>
          <span><i class="severo"></i> Congestión severa</span>
          <small>Los colores y su actualización son proporcionados por Google; no son inventados por GateFlow.</small>
        </div>
      </section>

      <section class="mapa-simulacion">
        <div class="mapa-seccion-cabecera"><div><span class="seccion-etiqueta">MODELO OPERATIVO GATEFLOW</span><h3>Escenario de fila del día ${estado.dia}</h3></div><p>Este modelo permite probar decisiones; no sustituye los datos de Google.</p></div>
        <div id="mapa-fila"></div>
      </section>
      <details class="mas">
        <summary>Ver más: comparación lado a lado (hoy vs propuesta)</summary>
        <div id="anim-mapa"></div>
      </details>`;
    const seccionGoogle = contenedor.querySelector(".mapa-google-seccion");
    if (window.GateFlowMapaGoogle) window.GateFlowMapaGoogle.montar(seccionGoogle);
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
