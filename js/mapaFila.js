// =============================================================================
// mapaFila.js · La fila de camiones dibujada sobre el mapa del Puerto de Balboa
// -----------------------------------------------------------------------------
// Fondo: img/mapa-fila-cuarto-puente.png (acercamiento aportado por el grupo, con la
// vía de acceso marcada en amarillo, junto a la vía 266 / Panama Canal Fourth Bridge).
// Encima se dibuja un punto por cada camión esperando: empiezan en la entrada al puerto
// (extremo suroeste de la línea amarilla, junto a la vía 266) y la fila crece hacia el
// noreste sobre esa línea. Los primeros 40 caben en el carril de espera (morado); el resto
// queda en la calle (rojo). Con la propuesta, el estacionamiento de espera (verde) recibe
// a los camiones antes de que salgan a la calle.
// Coordenadas en píxeles de la imagen (669 × 465). La ruta se midió sobre la línea amarilla.
// =============================================================================

const MAPA_IMG = "img/mapa-fila-cuarto-puente.png";
const MAPA_ANCHO = 669, MAPA_ALTO = 465;
const PUERTA = [210, 289];
// Recorrido de la fila (de la puerta hacia afuera), medido sobre la imagen
const RUTA_FILA = [[210, 289], [229, 270.5], [249, 255], [269, 244.5], [289, 234], [309, 218], [329, 202.5], [349, 185.5],
  [369, 168.5], [389, 153], [409, 140.5], [429, 131.5], [449, 115], [469, 95], [489, 64.5], [511, 20]];
const PRE_EST = { x: 222, y: 150, ancho: 96, alto: 50 }; // ubicación propuesta (a validar por el grupo)
const SEPARACION = 4.5;   // píxeles entre camiones
const MAX_POS = 92;       // posiciones por carril (2 carriles)

// Puntos a lo largo de la ruta cada `paso` píxeles, con su dirección
function puntosRuta(ruta, paso, n) {
  const pts = [];
  let seg = 0, t = 0;
  let [x, y] = ruta[0];
  for (let i = 0; i < n && seg < ruta.length - 1; i++) {
    const [ax, ay] = ruta[seg], [bx, by] = ruta[seg + 1];
    const largo = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / largo, uy = (by - ay) / largo;
    pts.push({ x: ax + ux * t, y: ay + uy * t, nx: -uy, ny: ux });
    t += paso;
    while (seg < ruta.length - 1 && t > Math.hypot(ruta[seg + 1][0] - ruta[seg][0], ruta[seg + 1][1] - ruta[seg][1])) {
      t -= Math.hypot(ruta[seg + 1][0] - ruta[seg][0], ruta[seg + 1][1] - ruta[seg][1]);
      seg++;
    }
  }
  return pts;
}

const MAPAS_FILA = {};

function crearMapaFila(contenedor, { dia, prefijo = "mf", conControles = true }) {
  if (MAPAS_FILA[prefijo]) MAPAS_FILA[prefijo].detener();
  const capVia = DATOS.supuestos.capacidad_via_camiones;
  const escenarios = { hoy: simularDia(dia, escenario()), prop: simularDia(dia, escPropuesta()) };
  const capPre = escenarios.prop.capacidadEspera - capVia;
  let modo = "hoy";

  contenedor.innerHTML = `
    <div class="mf-controles">
      <div class="mf-modos" role="tablist">
        <button data-modo="hoy" class="activo">😟 Hoy</button>
        <button data-modo="prop">😀 Con nuestra propuesta</button>
      </div>
      <button class="boton" id="${prefijo}-play">▶ Reproducir el día</button>
      <span class="mf-reloj" id="${prefijo}-reloj">--:--</span>
      <input type="range" class="anim-barra" id="${prefijo}-barra" min="4" max="22" step="0.05" aria-label="Hora del día">
    </div>
    <div class="mf-cuerpo">
      <svg class="mf-svg mf-oscuro" viewBox="0 0 ${MAPA_ANCHO} ${MAPA_ALTO}" role="img" aria-label="Mapa de la vía de acceso al Puerto de Balboa con la fila de camiones">
        <image href="${MAPA_IMG}" x="0" y="0" width="${MAPA_ANCHO}" height="${MAPA_ALTO}"/>
        <polyline points="${RUTA_FILA.map((p) => p.join(",")).join(" ")}" class="mf-ruta"/>
        <g id="${prefijo}-pre" class="mf-pre-grupo">
          <rect x="${PRE_EST.x}" y="${PRE_EST.y}" width="${PRE_EST.ancho}" height="${PRE_EST.alto}" rx="4" class="mf-pre"/>
          <text x="${PRE_EST.x + PRE_EST.ancho / 2}" y="${PRE_EST.y - 4}" class="mf-etq verde" text-anchor="middle">Estacionamiento de espera (propuesto)</text>
          <path d="M${PRE_EST.x + 20} ${PRE_EST.y + PRE_EST.alto} Q ${PRE_EST.x + 10} ${PUERTA[1] - 30} ${PUERTA[0] + 2} ${PUERTA[1] - 6}" class="mf-llamado"/>
        </g>
        <g id="${prefijo}-camiones"></g>
        <circle cx="${PUERTA[0]}" cy="${PUERTA[1]}" r="6" class="mf-puerta"/>
        <text x="${PUERTA[0] - 4}" y="${PUERTA[1] + 22}" class="mf-etq" text-anchor="middle">Entrada al puerto</text>
        <text x="505" y="40" class="mf-etq rojo" text-anchor="end">la fila crece hacia aquí ↗</text>
      </svg>
      <div class="mf-lado">
        <div class="mf-dato"><span id="${prefijo}-n" class="mf-num">0</span><span>camiones esperando</span></div>
        <div class="mf-dato morado"><span id="${prefijo}-acc" class="mf-num">0</span><span>en el carril de espera (caben ${capVia})</span></div>
        <div class="mf-dato verde" id="${prefijo}-pre-dato"><span id="${prefijo}-preN" class="mf-num">0</span><span>en el estacionamiento (caben ${capPre})</span></div>
        <div class="mf-dato rojo"><span id="${prefijo}-calle" class="mf-num">0</span><span>en la calle 🚧</span></div>
        <div class="mf-dato"><span id="${prefijo}-espera" class="mf-num">0</span><span>minutos de espera si llegas a esta hora</span></div>
        <p class="suave">Cada punto es un camión. La fila sigue la vía marcada en amarillo; los puntos y el estacionamiento son dibujos nuestros (datos simulados).</p>
      </div>
    </div>`;

  // Posiciones: carril A y B (dos filas de camiones lado a lado)
  const pts = puntosRuta(RUTA_FILA, SEPARACION, MAX_POS);
  const NS = "http://www.w3.org/2000/svg";
  const grupo = contenedor.querySelector(`#${prefijo}-camiones`);
  const puntosFila = [];
  pts.forEach((p) => [-2.3, 2.3].forEach((d) => {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", (p.x + p.nx * d).toFixed(1));
    c.setAttribute("cy", (p.y + p.ny * d).toFixed(1));
    c.setAttribute("r", "2.4");
    grupo.appendChild(c);
    puntosFila.push(c);
  }));
  const puntosPre = [];
  for (let i = 0; i < capPre; i++) {
    const col = i % 15, fila = Math.floor(i / 15);
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", PRE_EST.x + 6 + col * 6);
    c.setAttribute("cy", PRE_EST.y + 9 + fila * 10);
    c.setAttribute("r", "2");
    c.setAttribute("class", "mf-c pre");
    grupo.appendChild(c);
    puntosPre.push(c);
  }

  const colaEn = (k, t) => {
    const h = Math.min(Math.floor(t), 23);
    const antes = h > 0 ? k.colas[h - 1] : 0;
    return Math.max(0, antes + (k.colas[h] - antes) * (t - h));
  };

  function pintar(t) {
    const k = escenarios[modo];
    const pre = modo === "prop" ? capPre : 0;
    const n = Math.round(colaEn(k, t));
    const enAcc = Math.min(n, capVia);
    const enPre = Math.min(pre, Math.max(0, n - capVia));
    const enCalle = Math.max(0, n - capVia - pre);
    puntosFila.forEach((c, i) => {
      let clase = "mf-c";
      if (i < enAcc) clase += " acc visible";
      else if (i >= capVia && i < capVia + enCalle) clase += " calle visible";
      c.setAttribute("class", clase);
    });
    puntosPre.forEach((c, i) => c.classList.toggle("visible", i < enPre));
    contenedor.querySelector(`#${prefijo}-pre`).style.display = modo === "prop" ? "" : "none";
    contenedor.querySelector(`#${prefijo}-pre-dato`).style.display = modo === "prop" ? "" : "none";
    const hh = Math.floor(t), mm = Math.floor((t - hh) * 60);
    contenedor.querySelector(`#${prefijo}-reloj`).textContent = `${String(Math.min(hh, 23)).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    contenedor.querySelector(`#${prefijo}-n`).textContent = n;
    contenedor.querySelector(`#${prefijo}-acc`).textContent = enAcc;
    contenedor.querySelector(`#${prefijo}-preN`).textContent = enPre;
    contenedor.querySelector(`#${prefijo}-calle`).textContent = enCalle;
    const esp = k.esperas[Math.min(hh, 23)];
    contenedor.querySelector(`#${prefijo}-espera`).textContent = esp === null ? "—" : fmt(esp);
  }

  // Reproducción
  let t = 4, corriendo = false, ultimo = null, frame = null;
  const barra = contenedor.querySelector(`#${prefijo}-barra`);
  const btn = contenedor.querySelector(`#${prefijo}-play`);
  function paso(ahora) {
    if (!corriendo) return;
    if (ultimo !== null) t += ((ahora - ultimo) / 1000) * 0.6;
    ultimo = ahora;
    if (t >= 22) { t = 22; parar(); }
    barra.value = t; pintar(t);
    if (corriendo) frame = requestAnimationFrame(paso);
  }
  function arrancar() { if (t >= 22) t = 4; corriendo = true; ultimo = null; btn.textContent = "⏸ Pausa"; frame = requestAnimationFrame(paso); }
  function parar() { corriendo = false; if (frame) cancelAnimationFrame(frame); btn.textContent = t >= 22 ? "↺ Repetir" : "▶ Continuar"; }
  btn.addEventListener("click", () => (corriendo ? parar() : arrancar()));
  barra.addEventListener("input", () => { t = Number(barra.value); pintar(t); });
  contenedor.querySelectorAll("[data-modo]").forEach((b) => b.addEventListener("click", () => {
    modo = b.dataset.modo;
    contenedor.querySelectorAll("[data-modo]").forEach((x) => x.classList.toggle("activo", x === b));
    pintar(t);
  }));

  // Empieza en la hora con la fila más larga de hoy
  const k0 = escenarios.hoy;
  t = Math.min(22, k0.colas.indexOf(Math.max(...k0.colas)) + 0.99);
  barra.value = t;
  pintar(t);

  const api = { detener: () => { corriendo = false; if (frame) cancelAnimationFrame(frame); } };
  MAPAS_FILA[prefijo] = api;
  ANIMACIONES[prefijo] = api; // para que app.js la detenga al cambiar de pestaña
  return api;
}
