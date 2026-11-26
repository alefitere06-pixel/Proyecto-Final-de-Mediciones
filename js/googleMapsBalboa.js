// Google Maps para GateFlow: mapa real, tráfico oficial y huella operativa de acceso.
// La clave y el Map ID se reciben en tiempo de ejecución; nunca se guardan en Git.
(function () {
  const CENTRO_BALBOA = { lat: 8.9572, lng: -79.5654 };
  const ORIGEN_CORREDOR = { lat: 8.9728, lng: -79.5574 };
  const GARITA_BALBOA = { lat: 8.9510, lng: -79.5659 };
  const RUTA_RESPALDO = [
    ORIGEN_CORREDOR,
    { lat: 8.9696, lng: -79.5591 },
    { lat: 8.9666, lng: -79.5608 },
    { lat: 8.9633, lng: -79.5624 },
    { lat: 8.9600, lng: -79.5637 },
    { lat: 8.9567, lng: -79.5648 },
    { lat: 8.9537, lng: -79.5655 },
    GARITA_BALBOA,
  ];
  const NIVELES = {
    fluido: { etiqueta: "Fluido", color: "#16a34a" },
    moderado: { etiqueta: "Moderado", color: "#facc15" },
    congestion: { etiqueta: "Congestionado", color: "#dc2626" },
  };
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

  function horaActualPanama() {
    const partes = new Intl.DateTimeFormat("es-PA", {
      timeZone: "America/Panama",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const hora = Number(partes.find((parte) => parte.type === "hour")?.value ?? 12);
    return Math.max(4, Math.min(22, hora));
  }

  function estadoOperativo(dia, hora) {
    const capacidad = Number(
      (typeof DATOS !== "undefined" ? DATOS.supuestos?.capacidad_via_camiones : null) ?? 40
    );
    let cola = 0;
    try {
      if (typeof simularDia === "function" && typeof escenario === "function") {
        const operacion = simularDia(dia, escenario());
        cola = Math.max(0, Math.round(Number(operacion.colas?.[hora] ?? 0)));
      }
    } catch (_) {
      cola = 0;
    }
    const nivel = cola > capacidad ? "congestion" : cola > capacidad * 0.25 ? "moderado" : "fluido";
    return { ...NIVELES[nivel], nivel, cola, capacidad, hora };
  }

  function pintarEstado(raiz, huella, dia, hora) {
    const lectura = estadoOperativo(dia, hora);
    huella?.setOptions({ strokeColor: lectura.color });

    const resumen = raiz.querySelector("[data-huella-resumen]");
    const titulo = raiz.querySelector("[data-huella-estado]");
    const detalle = raiz.querySelector("[data-huella-detalle]");
    const horaTexto = raiz.querySelector("[data-huella-hora-valor]");
    if (resumen) resumen.dataset.nivel = lectura.nivel;
    if (titulo) titulo.textContent = lectura.etiqueta;
    if (detalle) detalle.textContent = `${lectura.cola} camiones en cola · capacidad vial ${lectura.capacidad}`;
    if (horaTexto) horaTexto.textContent = `${String(lectura.hora).padStart(2, "0")}:00`;
    return lectura;
  }

  function conectarSemaforo(raiz, huella, dia, horaInicial) {
    const barra = raiz.querySelector("[data-huella-hora]");
    const ahora = raiz.querySelector("[data-huella-ahora]");
    const controlador = { estado: null };
    controlador.actualizar = (hora) => {
      const normalizada = Math.max(4, Math.min(22, Number(hora)));
      if (barra) barra.value = normalizada;
      controlador.estado = pintarEstado(raiz, huella, dia, normalizada);
      return controlador.estado;
    };
    barra?.addEventListener("input", () => controlador.actualizar(barra.value));
    ahora?.addEventListener("click", () => controlador.actualizar(horaActualPanama()));
    controlador.actualizar(horaInicial);
    return controlador;
  }

  async function montar(raiz, opciones = {}) {
    const lienzo = raiz.querySelector("[data-google-mapa]");
    const aviso = raiz.querySelector("[data-google-aviso]");
    const controles = raiz.querySelector("[data-google-controles]");
    const estadoTexto = raiz.querySelector("[data-google-estado]");
    const dia = Number(opciones.dia || 1);
    const horaInicial = horaActualPanama();
    if (!lienzo) return;

    let semaforo = { estado: pintarEstado(raiz, null, dia, horaInicial) };

    try {
      const configuracion = await obtenerConfiguracion();
      if (!configuracion.enabled) {
        semaforo = conectarSemaforo(raiz, null, dia, horaInicial);
        if (estadoTexto) estadoTexto.textContent = "Google Maps activo · vista estándar";
        mostrarAviso(
          raiz,
          "El mapa ya está visible. Falta la credencial de Google Cloud para activar tráfico, 3D y la huella sobre las calles."
        );
        return;
      }

      await cargarSdk(configuracion);
      const { Map, TrafficLayer, Polyline, InfoWindow, LatLngBounds } = await google.maps.importLibrary("maps");
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

      const mapa = new Map(lienzo, {
        center: CENTRO_BALBOA,
        zoom: 15,
        tilt: 52,
        heading: 18,
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

      const bordeHuella = new Polyline({
        map: mapa,
        path: RUTA_RESPALDO,
        strokeColor: "#071a2f",
        strokeOpacity: 0.78,
        strokeWeight: 12,
        clickable: false,
        zIndex: 6,
      });
      const huella = new Polyline({
        map: mapa,
        path: RUTA_RESPALDO,
        strokeColor: NIVELES.fluido.color,
        strokeOpacity: 0.96,
        strokeWeight: 7,
        clickable: true,
        zIndex: 7,
      });

      semaforo = conectarSemaforo(raiz, huella, dia, horaInicial);

      new AdvancedMarkerElement({ map: mapa, position: ORIGEN_CORREDOR, title: "Inicio del corredor de acceso" });
      new AdvancedMarkerElement({ map: mapa, position: GARITA_BALBOA, title: "Garita de acceso · Balboa" });

      const encuadrar = (ruta) => {
        const limites = new LatLngBounds();
        ruta.forEach((punto) => limites.extend(punto));
        mapa.fitBounds(limites, 58);
        window.setTimeout(() => {
          if (vistaInclinada) {
            mapa.setTilt(52);
            mapa.setHeading(18);
          }
        }, 250);
      };
      encuadrar(RUTA_RESPALDO);

      // Google ajusta la huella a calles transitables. Si no responde, se conserva
      // la geometría de respaldo sobre el mismo mapa real.
      if (google.maps.DirectionsService) {
        const servicioRuta = new google.maps.DirectionsService();
        servicioRuta.route({
          origin: ORIGEN_CORREDOR,
          destination: GARITA_BALBOA,
          travelMode: google.maps.TravelMode.DRIVING,
        }, (resultado, estadoRuta) => {
          const ruta = resultado?.routes?.[0]?.overview_path;
          if (estadoRuta === "OK" && ruta?.length) {
            bordeHuella.setPath(ruta);
            huella.setPath(ruta);
            encuadrar(ruta);
          }
        });
      }

      const globo = new InfoWindow();
      huella.addListener("click", (evento) => {
        const lectura = semaforo.estado || estadoOperativo(dia, horaInicial);
        globo.setPosition(evento.latLng);
        globo.setContent(`<strong>Huella de acceso GateFlow</strong><br>${lectura.etiqueta}: ${lectura.cola} camiones a las ${String(lectura.hora).padStart(2, "0")}:00.`);
        globo.open({ map: mapa });
      });

      lienzo.hidden = false;
      aviso.hidden = true;
      controles.hidden = false;
      estadoTexto.textContent = `Tráfico Google activo · ${new Date().toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit", timeZone: "America/Panama" })}`;

      raiz.querySelector("[data-mapa-centro]")?.addEventListener("click", () => encuadrar(huella.getPath().getArray()));

      raiz.querySelector("[data-mapa-3d]")?.addEventListener("click", (evento) => {
        vistaInclinada = !vistaInclinada;
        mapa.setTilt(vistaInclinada ? 52 : 0);
        mapa.setHeading(vistaInclinada ? 18 : 0);
        evento.currentTarget.textContent = vistaInclinada ? "Vista cenital" : "Activar vista 3D";
        evento.currentTarget.setAttribute("aria-pressed", String(vistaInclinada));
      });

      raiz.querySelector("[data-mapa-trafico]")?.addEventListener("click", (evento) => {
        traficoVisible = !traficoVisible;
        capaTrafico.setMap(traficoVisible ? mapa : null);
        evento.currentTarget.textContent = traficoVisible ? "Ocultar tráfico" : "Mostrar tráfico";
        evento.currentTarget.setAttribute("aria-pressed", String(traficoVisible));
        estadoTexto.textContent = traficoVisible
          ? "Tráfico Google activo · actualización periódica"
          : "Capa de tráfico de Google oculta";
      });

      raiz.querySelector("[data-mapa-tipo]")?.addEventListener("click", (evento) => {
        sateliteActivo = !sateliteActivo;
        mapa.setMapTypeId(sateliteActivo ? "hybrid" : "roadmap");
        evento.currentTarget.textContent = sateliteActivo ? "Ver calles" : "Ver satélite";
      });
    } catch (error) {
      if (estadoTexto) estadoTexto.textContent = "Google Maps activo · vista estándar";
      mostrarAviso(raiz, error.message || "No fue posible iniciar el mapa de Google.", "error");
    }
  }

  window.GateFlowMapaGoogle = { montar };
})();
