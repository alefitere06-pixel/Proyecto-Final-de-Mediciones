// =============================================================================
// Pase GateFlow · registro del transportista, expediente, QR y avisos WhatsApp
// -----------------------------------------------------------------------------
// Portal exclusivo del camionero. La analítica, los KPI y los controles de la
// operación permanecen dentro de Terminal User.
// =============================================================================

const PASE_ESTADO = {
  paso: 1,
  afiliado: null,
  expediente: null,
  pase: null,
  posicion: 10,
  temporizador: null,
};

const PASE_SEMAFORO = Object.freeze({
  rojo: { titulo: "No acercarse", detalle: "Permanece en tu base o estacionamiento autorizado.", color: "Rojo" },
  amarillo: { titulo: "Prepárate", detalle: "Tu turno se aproxima. Verifica documentos y ubicación.", color: "Amarillo" },
  verde: { titulo: "Ingreso autorizado", detalle: "Dirígete al gate dentro de la franja asignada.", color: "Verde" },
});

function idPase(prefijo) {
  return `${prefijo}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function telefonoWhatsApp(valor) {
  const digitos = String(valor || "").replace(/\D/g, "");
  return digitos.length === 8 ? `507${digitos}` : digitos;
}

function estadoPorPosicion(posicion) {
  if (posicion === 0) return {
    estado: "verde",
    titulo: "Es tu turno: ingreso autorizado",
    mensaje: "Ya no tienes camiones por delante. Dirígete al gate por el carril asignado.",
  };
  if (posicion <= 5) return {
    estado: "amarillo",
    titulo: `${posicion} ${posicion === 1 ? "camión" : "camiones"} por delante`,
    mensaje: posicion === 1
      ? "Prepárate para iniciar el traslado. GateFlow te avisará cuando el QR cambie a verde."
      : "Tu turno se aproxima. Revisa documentos y mantente atento al siguiente aviso.",
  };
  return {
    estado: "rojo",
    titulo: `${posicion} camiones por delante`,
    mensaje: "Permanece en tu ubicación. Todavía no te acerques a la terminal.",
  };
}

function renderPaseQR(contenedor) {
  const s = PASE_ESTADO;
  if (s.temporizador) {
    clearInterval(s.temporizador);
    s.temporizador = null;
  }

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
    descargar.href = qr.createDataURL(8, 16);
    descargar.download = `${s.pase.id}.gif`;
    descargar.hidden = false;
  }

  function textoWhatsApp(info) {
    return `GateFlow · Cita ${s.pase.id}\nHola ${s.afiliado.conductor}.\n${info.titulo}. ${info.mensaje}\nHorario: ${s.expediente.horario}\nCarril asignado: ${s.expediente.carril}`;
  }

  function actualizarNotificacion() {
    if (!s.pase) return;
    const info = estadoPorPosicion(s.posicion);
    s.pase.estado = info.estado;
    pintarQR();

    contenedor.querySelector("[data-cola-numero]").textContent = s.posicion;
    contenedor.querySelector("[data-cola-etiqueta]").textContent = s.posicion === 0 ? "turno activo" : "por delante";
    contenedor.querySelector("[data-whatsapp-titulo]").textContent = info.titulo;
    contenedor.querySelector("[data-whatsapp-mensaje]").textContent = info.mensaje;
    contenedor.querySelector("[data-whatsapp-progreso]").style.width = `${(10 - s.posicion) * 10}%`;
    contenedor.querySelector("[data-whatsapp-telefono]").textContent = `+${s.afiliado.whatsapp}`;

    const enlace = contenedor.querySelector("#pase-whatsapp");
    enlace.href = `https://wa.me/${s.afiliado.whatsapp}?text=${encodeURIComponent(textoWhatsApp(info))}`;
    enlace.textContent = s.posicion === 0 ? "Abrir autorización en WhatsApp ↗" : "Abrir este aviso en WhatsApp ↗";

    contenedor.querySelectorAll("[data-cola-paso]").forEach((paso) => {
      const valor = Number(paso.dataset.colaPaso);
      paso.classList.toggle("actual", valor === s.posicion);
      paso.classList.toggle("completado", valor > s.posicion);
    });
    const avanzar = contenedor.querySelector("#pase-avanzar");
    avanzar.disabled = s.posicion === 0;
    avanzar.textContent = s.posicion === 0 ? "Turno autorizado" : "Simular siguiente aviso";
    contenedor.querySelector("#pase-secuencia").disabled = s.posicion === 0;
  }

  function avanzarFila() {
    if (!s.pase || s.posicion === 0) return;
    s.posicion -= 1;
    actualizarNotificacion();
    if (s.posicion === 0 && s.temporizador) {
      clearInterval(s.temporizador);
      s.temporizador = null;
      contenedor.querySelector("#pase-secuencia").textContent = "Secuencia completada";
    }
  }

  activarPaso(s.paso);
  estadoPaso(1, Boolean(s.afiliado));
  estadoPaso(2, Boolean(s.expediente));
  estadoPaso(3, Boolean(s.pase));
  pintarQR();
  if (s.pase) actualizarNotificacion();

  botones.forEach((boton) => boton.addEventListener("click", () => {
    const paso = Number(boton.dataset.pasePaso);
    const permitido = paso === 1 || (paso === 2 && s.afiliado) || (paso === 3 && s.expediente);
    if (permitido) activarPaso(paso);
    else contenedor.querySelector("#pase-aviso").textContent = "Completa el paso anterior para continuar.";
  }));

  contenedor.querySelector("#pase-afiliacion").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const whatsapp = telefonoWhatsApp(formulario.get("telefono"));
    if (whatsapp.length < 11) {
      contenedor.querySelector("#pase-aviso").textContent = "Escribe un número de WhatsApp válido con código de país.";
      return;
    }
    s.afiliado = {
      id: idPase("AFI"),
      empresa: String(formulario.get("empresa")).trim(),
      identificacion: String(formulario.get("identificacion")).trim(),
      conductor: String(formulario.get("conductor")).trim(),
      placa: String(formulario.get("placa")).trim().toUpperCase(),
      whatsapp,
      correo: String(formulario.get("correo")).trim(),
      notificaciones: Boolean(formulario.get("notificaciones")),
    };
    estadoPaso(1, true);
    contenedor.querySelector("#pase-afiliado-resumen").textContent = `${s.afiliado.empresa} · placa ${s.afiliado.placa} · WhatsApp +${s.afiliado.whatsapp}`;
    contenedor.querySelector("#pase-aviso").textContent = "Registro creado. Ahora completa la operación y la cita.";
    activarPaso(2);
  });

  contenedor.querySelector("#pase-expediente").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const validaciones = ["cita", "naviera", "aduana", "terminal"];
    const pendientes = validaciones.filter((campo) => !formulario.get(campo));
    if (pendientes.length) {
      contenedor.querySelector("#pase-aviso").textContent = `Faltan ${pendientes.length} validaciones para emitir el pase.`;
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
    s.posicion = 10;
    s.pase = { id: idPase("GF"), estado: "rojo" };
    estadoPaso(2, true);
    estadoPaso(3, true);
    contenedor.querySelector("#pase-aviso").textContent = "Registro completado. El QR está en rojo y WhatsApp avisará cada avance de la fila virtual.";
    activarPaso(3);
    actualizarNotificacion();
  });

  contenedor.querySelector("#pase-avanzar").addEventListener("click", avanzarFila);
  contenedor.querySelector("#pase-secuencia").addEventListener("click", (evento) => {
    if (!s.pase || s.posicion === 0 || s.temporizador) return;
    evento.currentTarget.textContent = "Enviando avisos 10 → 0…";
    s.temporizador = setInterval(avanzarFila, 1100);
  });

  contenedor.querySelector("#pase-simular").addEventListener("click", () => {
    if (!s.pase) return;
    const lectura = contenedor.querySelector("#pase-lectura");
    const autorizado = s.pase.estado === "verde";
    lectura.className = `pase-lectura ${autorizado ? "autorizado" : "bloqueado"}`;
    lectura.innerHTML = autorizado
      ? `<strong>✓ Acceso autorizado</strong><span>Avance al carril ${s.expediente.carril} dentro de ${s.expediente.horario}.</span>`
      : `<strong>Acceso bloqueado</strong><span>El QR es válido, pero todavía hay ${s.posicion} camiones por delante.</span>`;
  });

  contenedor.querySelector("#pase-reiniciar").addEventListener("click", () => {
    if (s.temporizador) clearInterval(s.temporizador);
    Object.assign(PASE_ESTADO, { paso: 1, afiliado: null, expediente: null, pase: null, posicion: 10, temporizador: null });
    MODULOS.find((modulo) => modulo.id === "pase").render(contenedor, ESTADO);
  });
}

MODULOS.push({
  id: "pase",
  titulo: "Registro y Pase QR",
  intro: "Registro del transportista, cita, QR y alertas de avance por WhatsApp.",
  dueno: "tejadaoperaciones-star",
  rama: "codex/tejada-simulador-cola",

  render(contenedor) {
    contenedor.innerHTML = `
      <section class="pase-portada">
        <div class="pase-portada-texto">
          <span class="seccion-etiqueta">PORTAL DEL CAMIONERO</span>
          <h2>Regístrate y recibe tu turno por WhatsApp.</h2>
          <p>Completa una sola vez tus datos y la operación. GateFlow te mantiene en la fila virtual y te avisa cuando faltan 10, 9, 8… camiones, hasta autorizar tu traslado al gate.</p>
          <div class="pase-portada-acciones"><button type="button" class="boton" data-pase-paso="1">Comenzar registro</button><a href="#pase-flujo">Ver los pasos ↓</a></div>
        </div>
        <div class="pase-beneficio"><strong>Fila virtual</strong><span>avisos desde</span><b>10 → 0</b></div>
      </section>

      <div class="pase-nota"><strong>Portal del transportista.</strong> Esta sección contiene únicamente registro, cita, QR y notificaciones. La logística, estadísticas y decisiones operativas están protegidas en Terminal User.</div>

      <section class="pase-aporte" aria-label="Recorrido del camionero">
        <div><span>01</span><strong>Registro único</strong><small>Conductor, vehículo y WhatsApp</small></div>
        <div><span>02</span><strong>Operación y cita</strong><small>Retiro, documentos y franja</small></div>
        <div><span>03</span><strong>Fila virtual + QR</strong><small>Avisos progresivos hasta ingresar</small></div>
      </section>

      <section class="pase-flujo" id="pase-flujo">
        <nav class="pase-pasos" aria-label="Pasos del registro">
          <button type="button" data-pase-paso="1"><span>1</span>Registro</button>
          <button type="button" data-pase-paso="2"><span>2</span>Operación</button>
          <button type="button" data-pase-paso="3"><span>3</span>Turno y QR</button>
        </nav>
        <p id="pase-aviso" class="pase-aviso" aria-live="polite">Completa el registro con datos de demostración.</p>

        <div class="pase-panel" data-pase-panel="1">
          <div class="pase-panel-cabecera"><span class="seccion-etiqueta">PASO 1</span><h3>Registro del transportista</h3><p>Estos datos identifican al conductor y permiten enviarle cada actualización de la fila virtual.</p></div>
          <form id="pase-afiliacion" class="pase-formulario">
            <label>Empresa o transportista<input required name="empresa" placeholder="Ej.: Transportes del Istmo"></label>
            <label>RUC o identificación<input required name="identificacion" placeholder="Dato de ejemplo"></label>
            <label>Nombre del conductor<input required name="conductor" placeholder="Nombre completo"></label>
            <label>Placa del camión<input required name="placa" placeholder="AB1234" maxlength="12"></label>
            <label>Número de WhatsApp<input required name="telefono" type="tel" placeholder="+507 6000-0000"></label>
            <label>Correo<input required name="correo" type="email" placeholder="conductor@empresa.com"></label>
            <label class="pase-consentimiento"><input required type="checkbox" name="notificaciones"><span><strong>Acepto recibir alertas operativas por WhatsApp</strong><small>GateFlow enviará cambios de posición, preparación y autorización de ingreso.</small></span></label>
            <p id="pase-afiliado-resumen" class="pase-resumen-linea"></p>
            <button class="pase-accion" type="submit">Registrar y continuar →</button>
          </form>
        </div>

        <div class="pase-panel" data-pase-panel="2" hidden>
          <div class="pase-panel-cabecera"><span class="seccion-etiqueta">PASO 2</span><h3>Operación y cita</h3><p>GateFlow emite el turno únicamente cuando la documentación está completa.</p></div>
          <form id="pase-expediente" class="pase-formulario pase-expediente">
            <label>Referencia de retiro<input required name="referencia" placeholder="BOOKING-0001"></label>
            <label>Número de contenedor<input required name="contenedor" placeholder="ABCD1234567" maxlength="14"></label>
            <label>Operación<select required name="operacion"><option>Retiro de contenedor</option><option>Entrega de contenedor</option><option>Doble transacción</option></select></label>
            <label>Horario asignado<select required name="horario"><option>10:15 – 10:30</option><option>10:30 – 10:45</option><option>10:45 – 11:00</option></select></label>
            <label>Carril asignado<select required name="carril"><option>03</option><option>02</option><option>04</option></select></label>
            <div class="pase-validaciones">
              <label><input type="checkbox" name="cita"><span><strong>Cita asignada</strong><small>Franja de llegada disponible</small></span></label>
              <label><input type="checkbox" name="naviera"><span><strong>Naviera confirmó</strong><small>Orden de retiro liberada</small></span></label>
              <label><input type="checkbox" name="aduana"><span><strong>Aduanas autorizó</strong><small>Controles completados</small></span></label>
              <label><input type="checkbox" name="terminal"><span><strong>Terminal confirmó</strong><small>Carga lista y pagos validados</small></span></label>
            </div>
            <button class="pase-accion" type="submit">Emitir turno y QR →</button>
          </form>
        </div>

        <div class="pase-panel" data-pase-panel="3" hidden>
          <div class="pase-panel-cabecera"><span class="seccion-etiqueta">PASO 3</span><h3>Tu turno avanza por WhatsApp</h3><p>El transportista no controla el semáforo. GateFlow actualiza el QR cuando la terminal libera capacidad.</p></div>
          <div class="pase-qr-zona pase-qr-notificaciones">
            <article class="pase-credencial">
              <span class="pase-demo">PASE DIGITAL · DEMOSTRACIÓN</span>
              <div class="pase-estado-qr rojo" data-pase-estado-qr><i></i><span><small>Rojo</small><strong>No acercarse</strong><b>Permanece en tu ubicación.</b></span></div>
              <div id="pase-qr" class="pase-qr"></div>
              <div id="pase-qr-datos" class="pase-qr-datos"></div>
              <a id="pase-descargar" class="boton" hidden>Descargar QR</a>
            </article>

            <article class="pase-whatsapp-panel">
              <div class="pase-whatsapp-cabecera"><span class="pase-whatsapp-icono">WA</span><div><small>ALERTAS WHATSAPP</small><strong data-whatsapp-telefono>+507 6000-0000</strong></div><i>Activo</i></div>
              <div class="pase-cola-posicion"><strong data-cola-numero>10</strong><span>camiones<br><b data-cola-etiqueta>por delante</b></span></div>
              <div class="pase-cola-progreso"><i data-whatsapp-progreso></i></div>
              <div class="pase-whatsapp-mensaje"><small>ÚLTIMO AVISO</small><strong data-whatsapp-titulo>10 camiones por delante</strong><p data-whatsapp-mensaje>Permanece en tu ubicación. Todavía no te acerques a la terminal.</p></div>
              <ol class="pase-cola-secuencia" aria-label="Secuencia de avisos de posición">
                ${Array.from({ length: 11 }, (_, indice) => 10 - indice).map((numero) => `<li data-cola-paso="${numero}" class="${numero === 10 ? "actual" : ""}">${numero}</li>`).join("")}
              </ol>
              <div class="pase-whatsapp-acciones">
                <button id="pase-avanzar" class="pase-accion" type="button">Simular siguiente aviso</button>
                <button id="pase-secuencia" class="pase-accion secundario" type="button">Probar secuencia 10 → 0</button>
              </div>
              <a id="pase-whatsapp" class="pase-whatsapp-link" target="_blank" rel="noopener">Abrir este aviso en WhatsApp ↗</a>
              <p class="pase-whatsapp-nota">La demostración prepara cada mensaje y lo abre en WhatsApp. El envío automático en producción requiere conectar GateFlow con el servicio empresarial autorizado.</p>
            </article>
          </div>

          <div class="pase-control pase-control-garita">
            <div><span class="seccion-etiqueta">CONTROL DE ACCESO</span><h3>La garita solo acepta el QR verde.</h3><p>Prueba la lectura en cualquier momento para comprobar que el turno aún no autorizado permanece bloqueado.</p></div>
            <button id="pase-simular" class="pase-accion" type="button">Simular lectura en garita</button>
            <div id="pase-lectura" class="pase-lectura"><strong>Esperando lectura</strong><span>El QR cambiará a verde cuando no queden camiones por delante.</span></div>
            <button id="pase-reiniciar" class="pase-reiniciar" type="button">Crear otro registro</button>
          </div>
        </div>
      </section>

      <section class="pase-separacion-roles">
        <strong>Vista del camionero</strong><span>Registro · turno · WhatsApp · QR</span><i></i><strong>Vista de la terminal</strong><span>Logística · KPI · capacidad · decisiones</span>
      </section>`;

    renderPaseQR(contenedor);
  },
});
