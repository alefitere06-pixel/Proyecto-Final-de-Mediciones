// =============================================================================
// Pase Smart Gate · afiliación, expediente único y QR autorizado
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

    const contenido = `SMARTGATE|DEMO|${s.pase.id}|PLACA:${s.afiliado.placa}|CONT:${s.expediente.contenedor}|AUTORIZADO`;
    const qr = qrcode(0, "M");
    qr.addData(contenido);
    qr.make();
    caja.innerHTML = qr.createSvgTag({
      cellSize: 5,
      margin: 3,
      scalable: true,
      alt: "Código QR demostrativo del Pase Smart Gate",
      title: "Pase Smart Gate autorizado",
    });
    const identificador = document.createElement("strong");
    const referencia = document.createElement("span");
    const vigencia = document.createElement("small");
    identificador.textContent = s.pase.id;
    referencia.textContent = `Placa ${s.afiliado.placa} · Contenedor ${s.expediente.contenedor}`;
    vigencia.textContent = `Válido para una entrada demostrativa · Día ${ESTADO.dia}`;
    datos.replaceChildren(identificador, referencia, vigencia);
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
      validaciones,
    };
    s.pase = { id: idPase("SG"), autorizado: true };
    estadoPaso(2, true);
    estadoPaso(3, true);
    contenedor.querySelector("#pase-aviso").textContent = "Expediente consolidado. Pase expedito autorizado para la demostración.";
    activarPaso(3);
    pintarQR();
  });

  contenedor.querySelector("#pase-simular").addEventListener("click", () => {
    if (!s.pase) return;
    const lectura = contenedor.querySelector("#pase-lectura");
    lectura.className = "pase-lectura autorizado";
    lectura.innerHTML = `<strong>✓ QR reconocido</strong><span>Documentos consolidados · avance al carril expedito.</span>`;
  });

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
  titulo: "Pase Smart Gate",
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
              <div id="pase-qr" class="pase-qr"></div>
              <div id="pase-qr-datos" class="pase-qr-datos"></div>
              <a id="pase-descargar" class="boton" hidden>Descargar QR</a>
            </article>
            <div class="pase-control">
              <span class="seccion-etiqueta">CONTROL DE ACCESO</span>
              <h3>Simula la lectura en la garita</h3>
              <p>En una implementación real, el lector consultaría las autorizaciones firmadas por cada entidad antes de abrir la barrera.</p>
              <button id="pase-simular" class="pase-accion" type="button">Simular lectura del QR</button>
              <div id="pase-lectura" class="pase-lectura"><strong>Esperando lectura</strong><span>Presenta el QR en el punto de control.</span></div>
              <button id="pase-reiniciar" class="pase-reiniciar" type="button">Reiniciar demostración</button>
            </div>
          </div>
        </div>
      </section>

      <section class="pase-integracion">
        <div><span class="seccion-etiqueta">SOLUCIÓN CONSOLIDADA</span><h3>Antes: muchos trámites. Propuesta: un expediente visible para todos.</h3></div>
        <div class="pase-entidades"><span>Transportista</span><span>Naviera</span><span>Aduanas</span><span>Terminal</span><span>Citas</span><b>Expediente Smart Gate</b></div>
      </section>`;

    renderPaseQR(contenedor);
  },
});
