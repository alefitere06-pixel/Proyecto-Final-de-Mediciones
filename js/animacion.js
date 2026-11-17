// =============================================================================
// animacion.js · Animación de la cola de camiones (sin y con la propuesta)
// -----------------------------------------------------------------------------
// Dibuja (SVG) la vía de acceso a la garita de Balboa con un camioncito por cada
// camión en cola. Cuando la cola supera la vía de acceso, los camiones salen a la
// vía pública (en rojo), hacia el Puente de las Américas. Con la propuesta, el
// pre-estacionamiento (cola virtual) recibe los camiones antes de que salgan a la calle.
// Los números vienen de simularDia (js/escenarios.js): cola al final de cada hora,
// interpolada para que el movimiento sea suave.
// Uso: crearAnimacionCola(contenedor, { dia, prefijo })
// =============================================================================

const ANIMACIONES = {}; // una por prefijo, para detener la anterior al redibujar

function crearAnimacionCola(contenedor, opciones) {
  const prefijo = opciones.prefijo || "anim";
  if (ANIMACIONES[prefijo]) ANIMACIONES[prefijo].detener();

  const dia = opciones.dia;
  const actual = simularDia(dia, escenario());
  const propuesta = simularDia(dia, escPropuesta());
  const capVia = DATOS.supuestos.capacidad_via_camiones;
  const capPre = propuesta.capacidadEspera - capVia;
  const H_INI = 4, H_FIN = 22;

  contenedor.innerHTML = `
    <div class="anim-controles">
      <button class="boton" id="${prefijo}-play">▶ Reproducir el día</button>
      <label class="anim-vel">Velocidad
        <select id="${prefijo}-vel">
          <option value="0.25">lenta</option><option value="0.5" selected>normal</option><option value="1">rápida</option>
        </select></label>
      <div class="anim-reloj" id="${prefijo}-reloj">04:00</div>
      <input type="range" class="anim-barra" id="${prefijo}-barra" min="${H_INI}" max="${H_FIN}" step="0.05" value="${H_INI}" aria-label="Hora del día">
    </div>
    ${filaHTML("actual", "😟 Hoy, sin cambios", false)}
    ${filaHTML("prop", "😀 Con nuestra propuesta (citas + estacionamiento de espera + dos trámites en un viaje)", true)}
    <p class="suave nota">Día ${dia} · cada cuadrito = 1 camión esperando · datos simulados.</p>`;

  function filaHTML(id, titulo, conPre) {
    return `<div class="anim-fila">
      <div class="anim-titulo">${titulo}</div>
      <svg viewBox="0 18 900 ${conPre ? 155 : 95}" class="anim-svg" id="${prefijo}-${id}-svg" role="img" aria-label="${titulo}"></svg>
      <div class="anim-datos" id="${prefijo}-${id}-datos"></div>
    </div>`;
  }

  // ---- Dibujo de una fila ----
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, padre, texto) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (texto !== undefined) e.textContent = texto;
    padre.appendChild(e);
    return e;
  }
  function camion(padre, x, y, clase) {
    const g = el("g", { class: "camion " + clase, transform: `translate(${x},${y})` }, padre);
    el("rect", { x: 0, y: 0, width: 11, height: 9, rx: 1.5 }, g);   // contenedor
    el("rect", { x: 11.5, y: 2, width: 4, height: 7, rx: 1 }, g);   // cabina
    return g;
  }

  function dibujarFila(id, conPre) {
    const svg = contenedor.querySelector(`#${prefijo}-${id}-svg`);
    // Puente y vía pública
    el("rect", { x: 10, y: 50, width: 420, height: 34, class: "via-publica" }, svg);
    el("text", { x: 14, y: 44, class: "anim-etq peor" }, svg, "◀ La calle · hacia el Puente de las Américas");
    // Vía de acceso
    el("rect", { x: 430, y: 50, width: 360, height: 34, class: "via-acceso" }, svg);
    el("text", { x: 434, y: 44, class: "anim-etq" }, svg, `Carril de espera (caben ${capVia} camiones)`);
    // Garita y terminal
    el("rect", { x: 792, y: 40, width: 14, height: 54, class: "garita" }, svg);
    el("text", { x: 806, y: 106, class: "anim-etq", "text-anchor": "end" }, svg, "Puerta ▲");
    el("rect", { x: 812, y: 22, width: 80, height: 90, rx: 4, class: "terminal" }, svg);
    el("text", { x: 852, y: 62, class: "anim-etq centro blanco" }, svg, "Terminal");
    el("text", { x: 852, y: 76, class: "anim-etq centro blanco" }, svg, "Balboa");

    const slots = { acceso: [], pre: [], publica: [] };
    // Vía de acceso: 2 filas de 20 (desde la garita hacia afuera)
    for (let i = 0; i < capVia; i++) {
      const col = Math.floor(i / 2), fila = i % 2;
      slots.acceso.push(camion(svg, 772 - col * 18 * (20 / Math.ceil(capVia / 2)), 54 + fila * 14, "en-acceso"));
    }
    // Vía pública: 2 filas de 23
    for (let i = 0; i < 46; i++) {
      const col = Math.floor(i / 2), fila = i % 2;
      slots.publica.push(camion(svg, 412 - col * 17.5, 54 + fila * 14, "en-publica"));
    }
    const extra = el("text", { x: 14, y: 100, class: "anim-etq peor fuerte" }, svg, "");
    if (conPre) {
      el("rect", { x: 430, y: 112, width: 360, height: 56, rx: 4, class: "pre-est" }, svg);
      el("text", { x: 434, y: 106, class: "anim-etq mejor" }, svg, `Estacionamiento de espera (${capPre} camiones, fuera de la calle)`);
      for (let i = 0; i < capPre; i++) {
        const col = Math.floor(i / 3), fila = i % 3;
        slots.pre.push(camion(svg, 772 - col * 17.5, 116 + fila * 16, "en-pre"));
      }
    }
    return { slots, extra };
  }

  const filas = { actual: dibujarFila("actual", false), prop: dibujarFila("prop", true) };

  // Cola en el instante t (hora decimal): interpolación entre el final de la hora anterior y la actual
  function colaEn(k, t) {
    const h = Math.min(Math.floor(t), 23);
    const antes = h > 0 ? k.colas[h - 1] : 0;
    return antes + (k.colas[h] - antes) * (t - h);
  }

  function pintar(t) {
    const hh = Math.floor(t), mm = Math.floor((t - hh) * 60);
    contenedor.querySelector(`#${prefijo}-reloj`).textContent =
      String(Math.min(hh, 23)).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
    [["actual", actual, 0], ["prop", propuesta, capPre]].forEach(([id, k, pre]) => {
      const q = Math.max(0, colaEn(k, t));
      const n = Math.round(q);
      const enAcceso = Math.min(n, capVia);
      const enPre = Math.min(pre, Math.max(0, n - capVia));
      const enPublica = Math.max(0, n - capVia - pre);
      const f = filas[id];
      f.slots.acceso.forEach((c, i) => c.classList.toggle("visible", i < enAcceso));
      f.slots.pre.forEach((c, i) => c.classList.toggle("visible", i < enPre));
      f.slots.publica.forEach((c, i) => c.classList.toggle("visible", i < enPublica));
      f.extra.textContent = enPublica > 46 ? `+${enPublica - 46} camiones más en la vía pública` : "";
      const h = Math.min(Math.floor(t), 23);
      const espera = k.esperas[h];
      contenedor.querySelector(`#${prefijo}-${id}-datos`).innerHTML = `
        <span><strong>${n}</strong> camiones esperando</span>
        ${pre ? `<span class="mejor"><strong>${enPre}</strong> en el estacionamiento</span>` : ""}
        <span class="${enPublica ? "peor" : "mejor"}"><strong>${enPublica}</strong> en la calle</span>
        <span>Si llegas a esta hora esperas: <strong>${espera === null ? "—" : fmt(espera)} min</strong></span>
        <span>La puerta atiende ${fmt(k.capacidades[h])} por hora y llegan ${fmt(k.llegadas[h])}</span>`;
    });
  }

  // ---- Reproducción ----
  let t = H_INI, corriendo = false, ultimo = null, frame = null;
  const btn = contenedor.querySelector(`#${prefijo}-play`);
  const barra = contenedor.querySelector(`#${prefijo}-barra`);
  const vel = contenedor.querySelector(`#${prefijo}-vel`);

  function paso(ahora) {
    if (!corriendo) return;
    if (ultimo !== null) t += ((ahora - ultimo) / 1000) * Number(vel.value);
    ultimo = ahora;
    if (t >= H_FIN) { t = H_FIN; parar(); }
    barra.value = t;
    pintar(t);
    if (corriendo) frame = requestAnimationFrame(paso);
  }
  function arrancar() {
    if (t >= H_FIN) t = H_INI;
    corriendo = true; ultimo = null;
    btn.textContent = "⏸ Pausa";
    frame = requestAnimationFrame(paso);
  }
  function parar() {
    corriendo = false;
    if (frame) cancelAnimationFrame(frame);
    btn.textContent = t >= H_FIN ? "↺ Repetir el día" : "▶ Continuar";
  }
  btn.addEventListener("click", () => (corriendo ? parar() : arrancar()));
  barra.addEventListener("input", () => { t = Number(barra.value); pintar(t); });

  // Empieza mostrando la hora más crítica de la situación actual
  const peor = actual.colas.indexOf(Math.max(...actual.colas));
  t = opciones.horaInicial ?? Math.min(H_FIN, Math.max(H_INI, peor + 0.99));
  barra.value = t;
  pintar(t);

  const api = { detener: () => { corriendo = false; if (frame) cancelAnimationFrame(frame); }, reproducir: arrancar, irA: (h) => { t = h; barra.value = h; pintar(h); } };
  ANIMACIONES[prefijo] = api;
  return api;
}
