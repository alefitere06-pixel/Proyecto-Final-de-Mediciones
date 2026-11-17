// =============================================================================
// Módulo · Mapa y cola en vivo
// Abierto a todo el grupo · Rama: mejora-mapa
// -----------------------------------------------------------------------------
// 1) Mapa real del Puerto de Balboa (Leaflet + OpenStreetMap; necesita internet).
//    Los puntos son APROXIMADOS: el grupo puede arrastrarlos a su lugar exacto y
//    copiar las coordenadas a PUNTOS_MAPA.
// 2) Animación de la cola (js/animacion.js): situación actual vs Gate Inteligente.
// =============================================================================

// Ubicaciones aproximadas — VERIFICAR en el mapa y corregir aquí
const PUNTOS_MAPA = {
  terminal: { nombre: "Terminal de Balboa (patio de contenedores)", coord: [8.9555, -79.5675], tipo: "terminal" },
  garita:   { nombre: "Garita de entrada (aprox.)", coord: [8.9590, -79.5620], tipo: "garita" },
  puente:   { nombre: "Puente de las Américas", coord: [8.9390, -79.5600], tipo: "puente" },
  preest:   { nombre: "Pre-estacionamiento propuesto (a definir)", coord: [8.9665, -79.5600], tipo: "preest" },
};

let MAPA = null;

MODULOS.unshift({   // unshift: queda como primera pestaña
  id: "mapa",
  titulo: "Mapa y fila en vivo",
  dueno: "Todo el grupo",
  rama: "mejora-mapa",

  render(contenedor, estado) {
    contenedor.innerHTML = `
      <h2>¿Dónde está el problema? · Puerto de Balboa, Panamá</h2>
      <div class="rejilla-2 mapa-rejilla">
        <div class="mapa-texto">
          <p><strong>¿Qué pasa?</strong> Los camiones que traen o recogen contenedores entran al puerto por una puerta llamada
          <strong>garita</strong>${ayuda("garita")}. En las horas de más tráfico llegan más camiones de los que la puerta puede revisar,
          y se forma una fila. Cuando la fila ya no cabe en su carril, <span class="peor">los camiones quedan en la calle</span>
          cerca del <strong>Puente de las Américas</strong> y bloquean el tránsito.</p>
          <p><strong>¿Por qué pasa?</strong> El puerto no tiene un lugar para que los camiones esperen fuera de la calle,
          y casi todos llegan a la misma hora.</p>
          <p><strong>Nuestra idea:</strong> <span class="mejor">Gate Inteligente</span> — 1) los camiones reservan una hora para llegar (citas),
          2) esperan en un estacionamiento fuera de la calle y una app los llama, y 3) se premia hacer dos trámites en un solo viaje.</p>
          <p class="suave">Puntos del mapa aproximados: arrástrenlos para corregirlos; las coordenadas aparecen al hacer clic.</p>
        </div>
        <div>
          <div id="mapa-balboa" class="mapa"></div>
          <p id="mapa-aviso" class="suave nota"></p>
        </div>
      </div>
      <h3>Mira cómo crece la fila durante el día ${estado.dia} (cada cuadrito es un camión)</h3>
      <div id="anim-mapa"></div>`;

    this.dibujarMapa(contenedor);
    crearAnimacionCola(contenedor.querySelector("#anim-mapa"), { dia: estado.dia, prefijo: "anim-mapa" });
  },

  dibujarMapa(contenedor) {
    const aviso = contenedor.querySelector("#mapa-aviso");
    if (typeof L === "undefined") { aviso.textContent = "No se pudo cargar la librería del mapa."; return; }
    if (MAPA) { MAPA.remove(); MAPA = null; }
    MAPA = L.map("mapa-balboa", { scrollWheelZoom: false }).setView([8.953, -79.564], 14);
    let errores = 0;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).on("tileerror", () => {
      errores++;
      if (errores === 1) aviso.innerHTML = "⚠️ Sin internet el mapa de fondo no carga. Los puntos y la animación de abajo funcionan igual.";
    }).addTo(MAPA);

    const marcadores = {};
    const linea = L.polyline([PUNTOS_MAPA.garita.coord, PUNTOS_MAPA.puente.coord],
      { color: "#b3261e", weight: 6, opacity: 0.7, dashArray: "8 6" }).addTo(MAPA)
      .bindTooltip("Hacia aquí crece la cola en horas pico", { sticky: true });
    const lineaPre = L.polyline([PUNTOS_MAPA.preest.coord, PUNTOS_MAPA.garita.coord],
      { color: "#1e7b4a", weight: 4, opacity: 0.8 }).addTo(MAPA)
      .bindTooltip("Llamado por app: el camión sale del pre-estacionamiento cuando hay espacio", { sticky: true });

    Object.entries(PUNTOS_MAPA).forEach(([clave, p]) => {
      const m = L.marker(p.coord, {
        draggable: true,
        icon: L.divIcon({ className: "", html: `<div class="pin pin-${p.tipo}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] }),
      }).addTo(MAPA);
      m.bindTooltip(p.nombre, { permanent: true, direction: "right", offset: [10, 0], className: "etq-mapa" });
      const popup = () => `<strong>${p.nombre}</strong><br>${m.getLatLng().lat.toFixed(5)}, ${m.getLatLng().lng.toFixed(5)}`;
      m.bindPopup(popup);
      m.on("dragend", () => {
        p.coord = [m.getLatLng().lat, m.getLatLng().lng];
        linea.setLatLngs([PUNTOS_MAPA.garita.coord, PUNTOS_MAPA.puente.coord]);
        lineaPre.setLatLngs([PUNTOS_MAPA.preest.coord, PUNTOS_MAPA.garita.coord]);
        m.setPopupContent(popup()).openPopup();
      });
      marcadores[clave] = m;
    });
    setTimeout(() => MAPA && MAPA.invalidateSize(), 50);
  },
});
