// Integración de Google Maps para Balboa.
// La clave y el Map ID se reciben en tiempo de ejecución; nunca se guardan en Git.
(function () {
  const CENTRO_BALBOA = { lat: 8.9559, lng: -79.5676 };
  let promesaSdk = null;

  async function obtenerConfiguracion() {
    const respuesta = await fetch("/api/maps-config", { cache: "no-store" });
    if (!respuesta.ok) throw new Error("No fue posible consultar la configuración del mapa.");
    return respuesta.json();
  }

  function cargarSdk(configuracion) {
    if (window.google?.maps) return Promise.resolve(window.google);
    if (promesaSdk) return promesaSdk;

    promesaSdk = new Promise((resolve, reject) => {
      const callback = "__gateflowGoogleMapsListo";
      const parametros = new URLSearchParams({
        key: configuracion.apiKey,
        v: "weekly",
        loading: "async",
        libraries: "maps,marker",
        map_ids: configuracion.mapId,
        language: "es",
        region: "PA",
        auth_referrer_policy: "origin",
        callback,
      });

      window[callback] = () => {
        delete window[callback];
        resolve(window.google);
      };
      window.gm_authFailure = () => reject(new Error("Google rechazó la clave del mapa. Revisa sus restricciones y facturación."));

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?${parametros}`;
      script.async = true;
      script.onerror = () => reject(new Error("No fue posible cargar Google Maps. Revisa la conexión a internet."));
      document.head.appendChild(script);
    });

    return promesaSdk;
  }

  function mostrarAviso(raiz, mensaje, tipo = "pendiente") {
    const aviso = raiz.querySelector("[data-google-aviso]");
    const mapa = raiz.querySelector("[data-google-mapa]");
    const controles = raiz.querySelector("[data-google-controles]");
    if (mapa) mapa.hidden = true;
    if (controles) controles.hidden = true;
    if (!aviso) return;
    aviso.hidden = false;
    aviso.dataset.tipo = tipo;
    const detalle = aviso.querySelector("[data-google-detalle]");
    if (detalle) detalle.textContent = mensaje;
  }

  async function montar(raiz) {
    const lienzo = raiz.querySelector("[data-google-mapa]");
    const aviso = raiz.querySelector("[data-google-aviso]");
    const controles = raiz.querySelector("[data-google-controles]");
    const estado = raiz.querySelector("[data-google-estado]");
    if (!lienzo) return;

    try {
      const configuracion = await obtenerConfiguracion();
      if (!configuracion.enabled) {
        mostrarAviso(
          raiz,
          "La interfaz ya está preparada. Falta conectar una clave de Maps JavaScript API y un Map ID vectorial de Google Cloud."
        );
        return;
      }

      await cargarSdk(configuracion);
      const { Map, TrafficLayer } = await google.maps.importLibrary("maps");
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

      const mapa = new Map(lienzo, {
        center: CENTRO_BALBOA,
        zoom: 16,
        tilt: 60,
        heading: 22,
        mapId: configuracion.mapId,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: true,
        zoomControl: true,
        gestureHandling: "cooperative",
      });

      const capaTrafico = new TrafficLayer({ autoRefresh: true });
      capaTrafico.setMap(mapa);
      let traficoVisible = true;
      let vistaInclinada = true;
      let sateliteActivo = false;

      new AdvancedMarkerElement({
        map: mapa,
        position: CENTRO_BALBOA,
        title: "Terminal de Balboa · área de operación",
      });

      lienzo.hidden = false;
      aviso.hidden = true;
      controles.hidden = false;
      estado.textContent = `Tráfico Google activo · consulta iniciada ${new Date().toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" })}`;

      raiz.querySelector("[data-mapa-centro]")?.addEventListener("click", () => {
        mapa.setCenter(CENTRO_BALBOA);
        mapa.setZoom(16);
      });

      raiz.querySelector("[data-mapa-3d]")?.addEventListener("click", (evento) => {
        vistaInclinada = !vistaInclinada;
        mapa.setTilt(vistaInclinada ? 60 : 0);
        mapa.setHeading(vistaInclinada ? 22 : 0);
        evento.currentTarget.textContent = vistaInclinada ? "Vista cenital" : "Activar vista 3D";
        evento.currentTarget.setAttribute("aria-pressed", String(vistaInclinada));
      });

      raiz.querySelector("[data-mapa-trafico]")?.addEventListener("click", (evento) => {
        traficoVisible = !traficoVisible;
        capaTrafico.setMap(traficoVisible ? mapa : null);
        evento.currentTarget.textContent = traficoVisible ? "Ocultar tráfico" : "Mostrar tráfico";
        evento.currentTarget.setAttribute("aria-pressed", String(traficoVisible));
        estado.textContent = traficoVisible
          ? "Tráfico Google activo · Google actualiza la capa periódicamente"
          : "Capa de tráfico oculta";
      });

      raiz.querySelector("[data-mapa-tipo]")?.addEventListener("click", (evento) => {
        sateliteActivo = !sateliteActivo;
        mapa.setMapTypeId(sateliteActivo ? "hybrid" : "roadmap");
        evento.currentTarget.textContent = sateliteActivo ? "Ver calles" : "Ver satélite";
      });
    } catch (error) {
      mostrarAviso(raiz, error.message || "No fue posible iniciar el mapa de Google.", "error");
    }
  }

  window.GateFlowMapaGoogle = { montar };
})();
