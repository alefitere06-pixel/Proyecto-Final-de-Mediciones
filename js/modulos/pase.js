// =============================================================================
// Pase GateFlow · afiliación, expediente único y QR autorizado
// -----------------------------------------------------------------------------
// Prototipo educativo: trabaja solo en la sesión del navegador. No consulta ni
// sustituye los sistemas oficiales de Aduanas, navieras o terminales.
// =============================================================================

const PASE_ESTADO = {
  paso: 1,
  afiliado: null,
  expediente: null,
  pase: null,
};

const PASE_CONTROL = {
  capacidad: 40,
  limitePct: 80,
  espera: 20,
  camino: 5,
  virtual: 65,
};

const PASE_SEMAFORO = Object.freeze({
  rojo: { titulo: "No acercarse", detalle: "Permanece en tu base o estacionamiento autorizado.", color: "Rojo" },
  amarillo: { titulo: "Prepárate", detalle: "Tu turno se aproxima. Verifica documentos y ubicación.", color: "Amarillo" },
  verde: { titulo: "Ingreso autorizado", detalle: "Dirígete al gate dentro de la franja asignada.", color: "Verde" },
});

function calcularControlPase() {
  const limite = Math.floor(PASE_CONTROL.capacidad * PASE_CONTROL.limitePct / 100);
  const proyectada = PASE_CONTROL.espera + PASE_CONTROL.camino;
  const autorizaciones = Math.max(0, Math.min(PASE_CONTROL.virtual, limite - proyectada));
  return {
    limite,
    proyectada,
    ocupacionPct: PASE_CONTROL.capacidad ? Math.round(proyectada / PASE_CONTROL.capacidad * 100) : 0,
    autorizaciones,
    permanecen: Math.max(0, PASE_CONTROL.virtual - autorizaciones),
  };
}

function idPase(prefijo) {
  return `${prefijo}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function renderPaseQR(contenedor) {
  const s = PASE_ESTADO;
  const paneles = contenedor.querySelectorAll("[data-pase-panel]");
  const botones = contenedor.querySelectorAll("[data-pase-paso]");

  function activarPaso(paso) {
    s.paso = paso;
    paneles.forEach((panel) => panel.hidden = Number(panel.dataset.pasePanel) !== paso);
    botones.forEach((boton) => {
      const activo = Number(boton.dataset.pasePaso) === paso;
      boton.classList.toggle("activo", activo);
      boton.setAttribute("aria-current", activo ? "step" : "false");
    });
  }

  function estadoPaso(numero, listo) {
    const boton = contenedor.querySelector(`.pase-pasos [data-pase-paso="${numero}"]`);
    if (boton) boton.classList.toggle("listo", listo);
  }

  function pintarQR() {
    const caja = contenedor.querySelector("#pase-qr");
    const datos = contenedor.querySelector("#pase-qr-datos");
    const descargar = contenedor.querySelector("#pase-descargar");
    if (!s.pase || typeof qrcode !== "function") {
      caja.innerHTML = `<span class="pase-qr-espera">Completa los pasos anteriores para generar el pase.</span>`;
      descargar.hidden = true;
      return;
    }

    const estadoQR = PASE_SEMAFORO[s.pase.estado] || PASE_SEMAFORO.rojo;
    const contenido = `GATEFLOW|DEMO|${s.pase.id}|PLACA:${s.afiliado.placa}|CONT:${s.expediente.contenedor}|ESTADO:${s.pase.estado.toUpperCase()}`;
    const qr = qrcode(0, "M");
    qr.addData(contenido);
    qr.make();
    caja.innerHTML = qr.createSvgTag({
      cellSize: 5,
      margin: 3,
      scalable: true,
      alt: `Código QR demostrativo del Pase GateFlow en estado ${estadoQR.color}`,
      title: `Pase GateFlow · ${estadoQR.titulo}`,
    });
    const identificador = document.createElement("strong");
    const referencia = document.createElement("span");
    const vigencia = document.createElement("small");
    identificador.textContent = s.pase.id;
    referencia.textContent = `Placa ${s.afiliado.placa} · ${s.expediente.operacion} · Carril ${s.expediente.carril}`;
    vigencia.textContent = `${s.expediente.horario} · ${estadoQR.titulo}`;
    datos.replaceChildren(identificador, referencia, vigencia);
    const credencial = contenedor.querySelector(".pase-credencial");
    credencial.dataset.estado = s.pase.estado;
    const indicador = contenedor.querySelector("[data-pase-estado-qr]");
    indicador.className = `pase-estado-qr ${s.pase.estado}`;
    indicador.innerHTML = `<i></i><span><small>${estadoQR.color}</small><strong>${estadoQR.titulo}</strong><b>${estadoQR.detalle}</b></span>`;
    contenedor.querySelectorAll("[data-pase-semaforo]").forEach((boton) => {
      boton.classList.toggle("activo", boton.dataset.paseSemaforo === s.pase.estado);
      boton.setAttribute("aria-pressed", boton.dataset.paseSemaforo === s.pase.estado ? "true" : "false");
    });
    descargar.href = qr.createDataURL(8, 16);
    descargar.download = `${s.pase.id}.gif`;
    descargar.hidden = false;
  }

  activarPaso(s.paso);
  estadoPaso(1, Boolean(s.afiliado));
  estadoPaso(2, Boolean(s.expediente));
  estadoPaso(3, Boolean(s.pase));
  pintarQR();

  botones.forEach((boton) => boton.addEventListener("click", () => {
    const paso = Number(boton.dataset.pasePaso);
    const permitido = paso === 1 || (paso === 2 && s.afiliado) || (paso === 3 && s.expediente);
    if (permitido) activarPaso(paso);
    else contenedor.querySelector("#pase-aviso").textContent = "Completa el paso anterior para continuar.";
  }));

  contenedor.querySelector("#pase-afiliacion").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    s.afiliado = {
      id: idPase("AFI"),
      empresa: String(formulario.get("empresa")).trim(),
      identificacion: String(formulario.get("identificacion")).trim(),
      conductor: String(formulario.get("conductor")).trim(),
      placa: String(formulario.get("placa")).trim().toUpperCase(),
      telefono: String(formulario.get("telefono")).trim(),
      correo: String(formulario.get("correo")).trim(),
    };
    estadoPaso(1, true);
    contenedor.querySelector("#pase-afiliado-resumen").textContent = `${s.afiliado.empresa} · placa ${s.afiliado.placa} · afiliación demo ${s.afiliado.id}`;
    contenedor.querySelector("#pase-aviso").textContent = "Afiliación demostrativa creada. Ahora consolida el retiro de carga.";
    activarPaso(2);
  });

  contenedor.querySelector("#pase-expediente").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const validaciones = ["cita", "naviera", "aduana", "terminal"];
    const pendientes = validaciones.filter((campo) => !formulario.get(campo));
    if (pendientes.length) {
      contenedor.querySelector("#pase-aviso").textContent = `Faltan ${pendientes.length} validaciones para autorizar el paso.`;
      return;
    }
    s.expediente = {
      id: idPase("EXP"),
      referencia: String(formulario.get("referencia")).trim().toUpperCase(),
      contenedor: String(formulario.get("contenedor")).trim().toUpperCase(),
      operacion: String(formulario.get("operacion")),
      horario: String(formulario.get("horario")),
      carril: String(formulario.get("carril")),
      validaciones,
    };
    s.pase = { id: idPase("GF"), estado: "rojo" };
    estadoPaso(2, true);
    estadoPaso(3, true);
    contenedor.querySelector("#pase-aviso").textContent = "Expediente consolidado. El QR fue emitido en rojo y cambiará cuando exista capacidad operativa.";
    activarPaso(3);
    pintarQR();
  });

  contenedor.querySelector("#pase-simular").addEventListener("click", () => {
    if (!s.pase) return;
    const lectura = contenedor.querySelector("#pase-lectura");
    const autorizado = s.pase.estado === "verde";
    lectura.className = `pase-lectura ${autorizado ? "autorizado" : "bloqueado"}`;
    lectura.innerHTML = autorizado
      ? `<strong>✓ Acceso autorizado</strong><span>Documentos consolidados · avance al carril ${s.expediente.carril}.</span>`
      : `<strong>Acceso todavía bloqueado</strong><span>El QR es válido, pero su estado es ${PASE_SEMAFORO[s.pase.estado].color.toLowerCase()}. ${PASE_SEMAFORO[s.pase.estado].detalle}</span>`;
  });

  contenedor.querySelectorAll("[data-pase-semaforo]").forEach((boton) => boton.addEventListener("click", () => {
    if (!s.pase) {
      contenedor.querySelector("#pase-aviso").textContent = "Primero completa el expediente para emitir el QR dinámico.";
      return;
    }
    s.pase.estado = boton.dataset.paseSemaforo;
    pintarQR();
    const estadoQR = PASE_SEMAFORO[s.pase.estado];
    contenedor.querySelector("#pase-lectura").className = "pase-lectura";
    contenedor.querySelector("#pase-lectura").innerHTML = `<strong>${estadoQR.titulo}</strong><span>${estadoQR.detalle}</span>`;
  }));

  function actualizarControlCapacidad() {
    const calculo = calcularControlPase();
    contenedor.querySelector("[data-capacidad-limite]").textContent = `${calculo.limite} camiones`;
    contenedor.querySelector("[data-capacidad-ocupacion]").textContent = `${calculo.ocupacionPct}%`;
    contenedor.querySelector("[data-capacidad-autorizaciones]").textContent = calculo.autorizaciones;
    contenedor.querySelector("[data-capacidad-permanecen]").textContent = calculo.permanecen;
    contenedor.querySelector("[data-capacidad-barra]").style.width = `${Math.min(100, calculo.ocupacionPct)}%`;
    contenedor.querySelector("[data-capacidad-barra]").dataset.nivel = calculo.ocupacionPct >= PASE_CONTROL.limitePct ? "alto" : calculo.ocupacionPct >= 60 ? "medio" : "bajo";
    contenedor.querySelector("[data-capacidad-decision]").textContent = calculo.autorizaciones > 0
      ? `GateFlow puede liberar ${calculo.autorizaciones} turnos sin superar el límite operativo.`
      : "No se liberan nuevos turnos. La fila permanece virtual hasta recuperar capacidad.";
  }

  contenedor.querySelectorAll("[data-capacidad-control]").forEach((input) => input.addEventListener("input", () => {
    PASE_CONTROL[input.dataset.capacidadControl] = Number(input.value);
    contenedor.querySelector(`[data-capacidad-valor="${input.dataset.capacidadControl}"]`).textContent = input.value + (input.dataset.capacidadControl === "limitePct" ? "%" : "");
    actualizarControlCapacidad();
  }));

  contenedor.querySelector("[data-capacidad-aplicar]").addEventListener("click", () => {
    const calculo = calcularControlPase();
    if (!s.pase) {
      contenedor.querySelector("#pase-aviso").textContent = "Crea el expediente y el QR antes de aplicar una autorización.";
      activarPaso(1);
      return;
    }
    s.pase.estado = calculo.autorizaciones > 0 ? "verde" : "rojo";
    pintarQR();
    activarPaso(3);
    contenedor.querySelector("#pase-aviso").textContent = calculo.autorizaciones > 0
      ? `Cupo disponible: el QR ${s.pase.id} cambió a verde.`
      : `Sin cupo operativo: el QR ${s.pase.id} permanece en rojo.`;
  });

  actualizarControlCapacidad();

  contenedor.querySelector("#pase-reiniciar").addEventListener("click", () => {
    PASE_ESTADO.paso = 1;
    PASE_ESTADO.afiliado = null;
    PASE_ESTADO.expediente = null;
    PASE_ESTADO.pase = null;
    MODULOS.find((modulo) => modulo.id === "pase").render(contenedor, ESTADO);
  });
}

MODULOS.push({
  id: "pase",
  titulo: "Pase GateFlow",
  intro: "Prototipo de un solo trámite: afilia al transportista, reúne las autorizaciones y genera un QR para el carril expedito.",
  dueno: "tejadaoperaciones-star",
  rama: "codex/tejada-simulador-cola",

  render(contenedor, estado) {
    contenedor.innerHTML = `
      <section class="pase-portada">
        <div class="pase-portada-texto">
          <span class="seccion-etiqueta">UN SOLO TRÁMITE · UN SOLO PASE</span>
          <h2>Afíliate, consolida tu retiro y entra con QR.</h2>
          <p>La propuesta reúne transportista, naviera, Aduanas, terminal y cita en un expediente digital. Cuando todo está validado, el conductor recibe un pase expedito.</p>
          <div class="pase-portada-acciones"><button type="button" class="boton" data-pase-paso="1">Crear afiliación demo</button><a href="#pase-flujo">Ver cómo funciona ↓</a></div>
        </div>
        <div class="pase-beneficio"><strong>5 validaciones</strong><span>convertidas en</span><b>1 QR</b></div>
      </section>

      <div class="pase-nota"><strong>Prototipo educativo.</strong> Usa datos de ejemplo. No está conectado con la Autoridad Nacional de Aduanas, navieras ni terminales y no reemplaza sus autorizaciones oficiales.</div>

      <section class="pase-aporte" aria-label="Propuesta de expediente único">
        <div><span>01</span><strong>Afiliación única</strong><small>Transportista, conductor y vehículo</small></div>
        <div><span>02</span><strong>Expediente consolidado</strong><small>Cita, naviera, Aduanas y terminal</small></div>
        <div><span>03</span><strong>QR autorizado</strong><small>Ingreso por carril expedito</small></div>
      </section>

      <section class="pase-ruta-inteligente" aria-labelledby="pase-ruta-titulo">
        <div class="pase-ruta-cabecera"><span class="seccion-etiqueta">FLUJO DE INGRESO INTELIGENTE</span><h3 id="pase-ruta-titulo">La terminal controla la llegada antes de que el camión salga.</h3><p>La cita reserva el turno; la fila virtual evita que el conductor espere en la calle; el semáforo del QR decide cuándo puede acercarse.</p></div>
        <ol>
          <li><span>01</span><strong>Reserva</strong><small>El transportista solicita una franja.</small></li>
          <li><span>02</span><strong>Fila virtual</strong><small>Espera en su base o zona autorizada.</small></li>
          <li><span>03</span><strong>Preparación</strong><small>El QR cambia a amarillo.</small></li>
          <li><span>04</span><strong>Autorización</strong><small>El QR verde libera el traslado.</small></li>
          <li><span>05</span><strong>Gate expedito</strong><small>La garita valida y asigna carril.</small></li>
        </ol>
      </section>

      <section class="pase-flujo" id="pase-flujo">
        <nav class="pase-pasos" aria-label="Pasos para generar el pase">
          <button type="button" data-pase-paso="1"><span>1</span>Afiliación</button>
          <button type="button" data-pase-paso="2"><span>2</span>Retiro único</button>
          <button type="button" data-pase-paso="3"><span>3</span>Pase QR</button>
        </nav>
        <p id="pase-aviso" class="pase-aviso" aria-live="polite">Completa los pasos con datos de ejemplo.</p>

        <div class="pase-panel" data-pase-panel="1">
          <div class="pase-panel-cabecera"><span class="seccion-etiqueta">PASO 1</span><h3>Afiliación del transportista</h3><p>Un registro para no repetir los mismos datos en cada retiro.</p></div>
          <form id="pase-afiliacion" class="pase-formulario">
            <label>Empresa o transportista<input required name="empresa" placeholder="Ej.: Transportes del Istmo"></label>
            <label>RUC o identificación<input required name="identificacion" placeholder="Dato de ejemplo"></label>
            <label>Nombre del conductor<input required name="conductor" placeholder="Conductor de ejemplo"></label>
            <label>Placa del camión<input required name="placa" placeholder="AB1234" maxlength="12"></label>
            <label>Teléfono<input required name="telefono" type="tel" placeholder="6000-0000"></label>
            <label>Correo<input required name="correo" type="email" placeholder="demo@empresa.com"></label>
            <p id="pase-afiliado-resumen" class="pase-resumen-linea"></p>
            <button class="pase-accion" type="submit">Crear afiliación y continuar →</button>
          </form>
        </div>

        <div class="pase-panel" data-pase-panel="2" hidden>
          <div class="pase-panel-cabecera"><span class="seccion-etiqueta">PASO 2</span><h3>Un solo expediente para retirar la carga</h3><p>La autorización se genera únicamente cuando todas las partes confirman.</p></div>
          <form id="pase-expediente" class="pase-formulario pase-expediente">
            <label>Referencia de retiro<input required name="referencia" placeholder="BOOKING-0001"></label>
            <label>Número de contenedor<input required name="contenedor" placeholder="ABCD1234567" maxlength="14"></label>
            <label>Operación<select required name="operacion"><option>Retiro de contenedor</option><option>Entrega de contenedor</option><option>Doble transacción</option></select></label>
            <label>Horario asignado<select required name="horario"><option>10:15 – 10:30</option><option>10:30 – 10:45</option><option>10:45 – 11:00</option></select></label>
            <label>Carril asignado<select required name="carril"><option>03</option><option>02</option><option>04</option></select></label>
            <div class="pase-validaciones">
              <label><input type="checkbox" name="cita"><span><strong>Cita asignada</strong><small>Franja de llegada disponible</small></span></label>
              <label><input type="checkbox" name="naviera"><span><strong>Naviera liberó la entrega</strong><small>Orden de retiro confirmada</small></span></label>
              <label><input type="checkbox" name="aduana"><span><strong>Aduanas autorizó</strong><small>Declaración y controles completados</small></span></label>
              <label><input type="checkbox" name="terminal"><span><strong>Terminal confirmó</strong><small>Carga lista y pagos validados</small></span></label>
            </div>
            <button class="pase-accion" type="submit">Consolidar y autorizar el QR →</button>
          </form>
        </div>

        <div class="pase-panel" data-pase-panel="3" hidden>
          <div class="pase-panel-cabecera"><span class="seccion-etiqueta">PASO 3</span><h3>Pase expedito autorizado</h3><p>El QR contiene solo el identificador del pase, la placa, el contenedor y el estado de autorización.</p></div>
          <div class="pase-qr-zona">
            <article class="pase-credencial">
              <span class="pase-demo">DEMOSTRACIÓN</span>
              <div class="pase-estado-qr rojo" data-pase-estado-qr><i></i><span><small>Rojo</small><strong>No acercarse</strong><b>Permanece en tu base o estacionamiento autorizado.</b></span></div>
              <div id="pase-qr" class="pase-qr"></div>
              <div id="pase-qr-datos" class="pase-qr-datos"></div>
              <a id="pase-descargar" class="boton" hidden>Descargar QR</a>
            </article>
            <div class="pase-control">
              <span class="seccion-etiqueta">CONTROL DE ACCESO</span>
              <h3>Simula la lectura en la garita</h3>
              <p>El QR identifica al camión, pero la barrera solo abre cuando el estado operativo está en verde.</p>
              <div class="pase-semaforo" role="group" aria-label="Estado dinámico del QR">
                <button type="button" class="rojo activo" data-pase-semaforo="rojo" aria-pressed="true"><i></i><span>Rojo<small>No acercarse</small></span></button>
                <button type="button" class="amarillo" data-pase-semaforo="amarillo" aria-pressed="false"><i></i><span>Amarillo<small>Prepararse</small></span></button>
                <button type="button" class="verde" data-pase-semaforo="verde" aria-pressed="false"><i></i><span>Verde<small>Autorizado</small></span></button>
              </div>
              <button id="pase-simular" class="pase-accion" type="button">Simular lectura del QR</button>
              <div id="pase-lectura" class="pase-lectura"><strong>Esperando lectura</strong><span>Presenta el QR en el punto de control.</span></div>
              <button id="pase-reiniciar" class="pase-reiniciar" type="button">Reiniciar demostración</button>
            </div>
          </div>
        </div>
      </section>

      <section class="pase-control-capacidad" aria-labelledby="capacidad-titulo">
        <div class="pase-control-intro"><span class="seccion-etiqueta">CONTROL AUTOMÁTICO DE CONGESTIÓN</span><h3 id="capacidad-titulo">GateFlow libera turnos según la capacidad disponible.</h3><p>El límite preventivo se mantiene en 80% para conservar un margen de seguridad. Cambia los valores y observa cuántos camiones pueden recibir autorización verde.</p></div>
        <div class="pase-simulador-grid">
          <div class="pase-capacidad-controles">
            <label><span>Capacidad física <strong data-capacidad-valor="capacidad">40</strong></span><input type="range" min="20" max="80" step="5" value="40" data-capacidad-control="capacidad"></label>
            <label><span>Límite operativo <strong data-capacidad-valor="limitePct">80%</strong></span><input type="range" min="60" max="95" step="5" value="80" data-capacidad-control="limitePct"></label>
            <label><span>Camiones en espera <strong data-capacidad-valor="espera">20</strong></span><input type="range" min="0" max="60" value="20" data-capacidad-control="espera"></label>
            <label><span>Autorizados en camino <strong data-capacidad-valor="camino">5</strong></span><input type="range" min="0" max="30" value="5" data-capacidad-control="camino"></label>
            <label><span>Fila virtual <strong data-capacidad-valor="virtual">65</strong></span><input type="range" min="0" max="120" step="5" value="65" data-capacidad-control="virtual"></label>
          </div>
          <div class="pase-capacidad-resultado">
            <div class="pase-ocupacion"><span>Ocupación proyectada</span><strong data-capacidad-ocupacion>63%</strong><div><i data-capacidad-barra></i></div><small>Límite seguro: <b data-capacidad-limite>32 camiones</b></small></div>
            <div class="pase-autorizaciones"><article><span>Nuevas autorizaciones máximas</span><strong data-capacidad-autorizaciones>7</strong><small>QR que pueden pasar a verde</small></article><article><span>Continúan en fila virtual</span><strong data-capacidad-permanecen>58</strong><small>Sin ocupar la vía pública</small></article></div>
            <p data-capacidad-decision>GateFlow puede liberar 7 turnos sin superar el límite operativo.</p>
            <button type="button" class="pase-accion" data-capacidad-aplicar>Aplicar decisión al QR actual</button>
          </div>
        </div>
      </section>

      <section class="pase-geocerca">
        <div><span class="seccion-etiqueta">GEOLOCALIZACIÓN + GEOFENCING</span><h3>El conductor inicia el traslado cuando corresponde.</h3><p>GateFlow compara el tiempo estimado de llegada con el turno y la capacidad prevista. Mientras espera, el camión permanece fuera de las vías próximas al puerto.</p></div>
        <div class="pase-geocerca-ejemplo"><span>ETA estimada</span><strong>25 min</strong><small>Notificación anticipada</small><b>“Prepárate. Tu turno se aproxima.”</b></div>
      </section>

      <section class="pase-plataforma" aria-labelledby="plataforma-titulo">
        <div class="pase-plataforma-cabecera"><span class="seccion-etiqueta">PLATAFORMA OPERATIVA</span><h3 id="plataforma-titulo">Siete módulos conectados, una sola decisión de ingreso.</h3></div>
        <div class="pase-modulos">
          <article><b>01</b><strong>Smart Scheduling</strong><small>Citas dinámicas según capacidad.</small></article>
          <article><b>02</b><strong>Virtual Queue</strong><small>Turnos sin fila en la calle.</small></article>
          <article><b>03</b><strong>QR Access</strong><small>Validación y semáforo operativo.</small></article>
          <article><b>04</b><strong>GPS Tracking</strong><small>Camiones en camino y ETA.</small></article>
          <article><b>05</b><strong>Yard Capacity</strong><small>Capacidad de patio y equipos.</small></article>
          <article><b>06</b><strong>Smart Alerts</strong><small>Avisos automáticos al conductor.</small></article>
          <article><b>07</b><strong>Gate Analytics</strong><small>Congestión y productividad.</small></article>
        </div>
        <div class="pase-kpis" aria-label="Indicadores del sistema"><span>Espera promedio</span><span>Truck Turnaround Time</span><span>Camiones por hora</span><span>Ocupación del área</span><span>Cumplimiento de citas</span><span>Validación del QR</span></div>
        <a class="pase-terminal-link" href="#terminal">Abrir el dashboard de Terminal User →</a>
      </section>

      <section class="pase-integracion">
        <div><span class="seccion-etiqueta">GESTIÓN CONSOLIDADA</span><h3>Antes: muchos trámites. GateFlow: un expediente visible para todos.</h3></div>
        <div class="pase-entidades"><span>Transportista</span><span>Naviera</span><span>Aduanas</span><span>Terminal</span><span>Citas</span><b>Expediente GateFlow</b></div>
      </section>`;

    renderPaseQR(contenedor);
  },
});
