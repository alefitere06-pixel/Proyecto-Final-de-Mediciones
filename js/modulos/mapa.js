// =============================================================================
// Módulo · Mapa y fila en vivo
// Abierto a todo el grupo · Rama: mejora-mapa
// -----------------------------------------------------------------------------
// Google Maps muestra el tráfico real y la huella GateFlow se dibuja directamente
// sobre el mapa para representar el estado operativo del acceso.
// =============================================================================

MODULOS.unshift({   // unshift: queda antes de Llegadas (Inicio se agrega después y queda primero)
  id: "mapa",
  titulo: "Puerto y fila",
  intro: "Consulta el tráfico de Google y la huella operativa del acceso al Puerto de Balboa en un solo mapa interactivo.",
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
            <span class="seccion-etiqueta">GOOGLE MAPS · TRÁFICO + HUELLA GATEFLOW</span>
            <h3 id="mapa-google-titulo">Acceso a Balboa en un solo mapa operativo</h3>
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

        <div class="mapa-operacion" aria-label="Estado de la huella de acceso">
          <div class="mapa-huella-resumen" data-huella-resumen data-nivel="fluido">
            <i aria-hidden="true"></i>
            <div>
              <small>HUELLA DE ACCESO</small>
              <strong data-huella-estado>Calculando estado…</strong>
              <span data-huella-detalle>Conectando los indicadores operativos</span>
            </div>
          </div>
          <label class="mapa-hora-control">
            <span>Hora operativa <b data-huella-hora-valor>--:--</b></span>
            <input type="range" min="4" max="22" step="1" value="12" data-huella-hora aria-label="Hora para consultar la cola">
          </label>
          <button type="button" class="mapa-ahora" data-huella-ahora>Ver ahora</button>
        </div>

        <div class="mapa-leyenda" aria-label="Leyenda del tráfico">
          <span><i class="fluido"></i> Fluido</span>
          <span><i class="moderado"></i> Moderado</span>
          <span><i class="congestion"></i> Congestión</span>
          <span><i class="severo"></i> Congestión severa</span>
          <small>Google muestra el tráfico vial real donde hay cobertura. La línea gruesa es la huella GateFlow y cambia con el nivel de cola del tablero.</small>
        </div>
      </section>
      <details class="mas">
        <summary>Cómo interpretar el mapa</summary>
        <p>Las calles coloreadas corresponden a la capa de tráfico de Google. La huella resaltada identifica el corredor de acceso de GateFlow: verde indica flujo normal, amarillo requiere atención y rojo indica que la cola supera la capacidad vial configurada.</p>
      </details>`;
    const seccionGoogle = contenedor.querySelector(".mapa-google-seccion");
    if (window.GateFlowMapaGoogle) window.GateFlowMapaGoogle.montar(seccionGoogle, { dia: estado.dia });
  },
});
