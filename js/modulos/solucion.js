// =============================================================================
// Solucionador Smart Gate · recomendación operativa sin gráficos
// -----------------------------------------------------------------------------
// La persona elige el problema principal y el nivel de cambio posible. La página
// prueba un paquete de medidas con las mismas fórmulas y datos de los demás módulos.
// =============================================================================

const SOLUCION_ESTADO = {
  problema: "calle",
  nivel: "control",
};

const PROBLEMAS_SOLUCION = {
  calle: {
    titulo: "Sacar la fila de la calle",
    diagnostico: (a) => `Hasta ${fmt(a.viaPublicaMax)} camiones quedan fuera del acceso en el día elegido.`,
    cumple: (p) => p.viaPublicaMax <= 0,
    meta: "cero camiones en la vía pública",
  },
  espera: {
    titulo: "Reducir el tiempo de espera",
    diagnostico: (a) => `Cada camión espera ${fmt(a.wqPromedio)} minutos en promedio antes de entrar.`,
    cumple: (p) => p.wqPromedio <= KPI.METAS.wq_min,
    meta: `${KPI.METAS.wq_min} minutos o menos`,
  },
  orden: {
    titulo: "Ordenar las horas de llegada",
    diagnostico: (a) => `En la hora más exigente, la puerta trabaja al ${fmt(a.rhoPico)} % de su capacidad.`,
    cumple: (p) => p.rhoPico <= KPI.METAS.rho_pct,
    meta: `ocupación de ${KPI.METAS.rho_pct} % o menos`,
  },
};

function paqueteSolucion(nivel) {
  const capacidadPico = { carrilExtraPico: true };
  const controlLlegadas = { ...capacidadPico, tas: true };
  const paquetes = {
    inmediato: {
      nombre: "Plan inmediato · sin obra mayor",
      escenario: escPalancas(capacidadPico),
      acciones: [
        ["Esta semana", "Abrir la sexta ventanilla en horas pico", "Usar la ventanilla instalada solo de 07:00–11:00 y 15:00–19:00."],
        ["Esta semana", "Ajustar el turno del personal", "Concentrar descansos y relevos fuera de las horas de mayor llegada."],
        ["Cada día", "Activar la medida con una regla simple", "Abrir el puesto extra cuando la ocupación proyectada supere la meta del 85 %."],
      ],
    },
    control: {
      nombre: "Plan de control · protege la vía pública",
      escenario: escPalancas({ ...controlLlegadas, colaVirtual: true }),
      acciones: [
        ["Esta semana", "Abrir la sexta ventanilla en horas pico", "Atender el aumento de demanda sin mantener seis puestos todo el día."],
        ["Primer mes", "Distribuir llegadas con citas inteligentes", "Cada franja ofrece únicamente los cupos disponibles."],
        ["Meses 2–3", "Crear una cola virtual", `Esperar fuera de la vía y llamar por turno hasta ${MEJORA_ESTADO.capacidadPreEst} camiones.`],
      ],
    },
    integral: {
      nombre: "Plan integral · Gate Inteligente",
      escenario: escPalancas({ ...controlLlegadas, colaVirtual: true, doble: true }),
      acciones: [
        ["Esta semana", "Activar capacidad extra solo cuando hace falta", "Sexta ventanilla en horas pico y seguimiento diario de la fila."],
        ["Primer mes", "Digitalizar citas y pre-registro", "Asignar franjas, validar documentos y avisar cambios antes del viaje."],
        ["Meses 2–3", "Operar una cola virtual fuera de la calle", "Llamar al conductor cuando la garita tenga espacio disponible."],
        ["Meses 3–4", "Combinar entrega y retiro", "Dar un incentivo para hacer dos trámites en una sola visita."],
      ],
    },
  };
  return paquetes[nivel];
}

function tarjetaCambio(nombre, antes, despues, unidad, dec = 0) {
  const mejora = antes > 0 ? Math.max(0, (antes - despues) / antes * 100) : 0;
  return `<article class="sol-metrica">
    <span>${nombre}</span>
    <div><s>${fmt(antes, dec)}</s><b>${fmt(despues, dec)}</b><small>${unidad}</small></div>
    <em>${mejora > 0 ? `−${fmt(mejora)} %` : "sin cambio"}</em>
  </article>`;
}

MODULOS.push({
  id: "solucion",
  titulo: "Generador de solución",
  intro: "Responde dos preguntas. La página prueba las medidas con los datos del día elegido y crea un plan fácil de explicar.",
  dueno: "tejadaoperaciones-star",
  rama: "codex/tejada-simulador-cola",

  render(contenedor, estado) {
    const s = SOLUCION_ESTADO;
    contenedor.innerHTML = `
      <section class="solucionador">
        <header class="sol-encabezado">
          <span class="seccion-etiqueta">ASESOR OPERATIVO</span>
          <h2>Genera una solución para la entrada de Balboa</h2>
          <p>No necesitas interpretar gráficos. Elige el problema y el alcance posible; la recomendación cambia con el día seleccionado.</p>
        </header>

        <div class="sol-preguntas">
          <fieldset>
            <legend><span>1</span> ¿Qué problema quieres resolver primero?</legend>
            <div class="sol-opciones tres">
              <label class="sol-opcion"><input type="radio" name="sol-problema" value="calle" ${s.problema === "calle" ? "checked" : ""}><span><strong>Fila en la calle</strong><small>Evitar camiones en la vía pública</small></span></label>
              <label class="sol-opcion"><input type="radio" name="sol-problema" value="espera" ${s.problema === "espera" ? "checked" : ""}><span><strong>Demasiada espera</strong><small>Reducir minutos antes de entrar</small></span></label>
              <label class="sol-opcion"><input type="radio" name="sol-problema" value="orden" ${s.problema === "orden" ? "checked" : ""}><span><strong>Llegadas desordenadas</strong><small>Evitar que todos lleguen a la vez</small></span></label>
            </div>
          </fieldset>

          <fieldset>
            <legend><span>2</span> ¿Cuánto puede cambiar la operación?</legend>
            <div class="sol-opciones tres">
              <label class="sol-opcion"><input type="radio" name="sol-nivel" value="inmediato" ${s.nivel === "inmediato" ? "checked" : ""}><span><strong>Usar lo disponible</strong><small>Sexta ventanilla + piloto digital</small></span></label>
              <label class="sol-opcion"><input type="radio" name="sol-nivel" value="control" ${s.nivel === "control" ? "checked" : ""}><span><strong>Cambio moderado</strong><small>Añadir un punto de espera virtual</small></span></label>
              <label class="sol-opcion"><input type="radio" name="sol-nivel" value="integral" ${s.nivel === "integral" ? "checked" : ""}><span><strong>Solución completa</strong><small>Transformar la gestión del acceso</small></span></label>
            </div>
          </fieldset>

          <button type="button" class="sol-generar" id="sol-generar">Generar mi plan para el día ${estado.dia} →</button>
        </div>

        <div id="sol-resultado" class="sol-resultado" aria-live="polite"></div>
      </section>

      <details class="mas sol-respaldo">
        <summary>Ver respaldo técnico: fórmulas, tabla y gráficos del proyecto</summary>
        <div class="sol-respaldo-enlaces">
          <a href="#mejora">Abrir análisis A3 y gráficos</a>
          <a href="#simulador">Comprobar parámetros en el simulador</a>
          <a href="#citas">Revisar el sistema de citas</a>
        </div>
      </details>`;

    contenedor.querySelectorAll('input[name="sol-problema"]').forEach((input) => input.addEventListener("change", (e) => {
      s.problema = e.target.value;
    }));
    contenedor.querySelectorAll('input[name="sol-nivel"]').forEach((input) => input.addEventListener("change", (e) => {
      s.nivel = e.target.value;
    }));
    contenedor.querySelector("#sol-generar").addEventListener("click", () => this.generar(contenedor, estado, true));
    this.generar(contenedor, estado, false);
  },

  generar(contenedor, estado, desplazar = true) {
    const problema = PROBLEMAS_SOLUCION[SOLUCION_ESTADO.problema];
    const paquete = paqueteSolucion(SOLUCION_ESTADO.nivel);
    const actual = simularDia(estado.dia, escenario());
    const propuesto = simularDia(estado.dia, paquete.escenario);
    const cumple = problema.cumple(propuesto);
    const info = DATOS.dias.find((d) => d.dia === estado.dia);
    const salida = contenedor.querySelector("#sol-resultado");

    salida.innerHTML = `
      <section class="sol-diagnostico">
        <div><span class="seccion-etiqueta">DIAGNÓSTICO DEL DÍA ${estado.dia}</span>
          <h3>${problema.titulo}</h3>
          <p>${problema.diagnostico(actual)} Se analizaron ${fmt(info.llegadas)} llegadas simuladas${info.dia_buque ? " en un día con buque" : ""}.</p></div>
        <span class="sol-estado ${cumple ? "cumple" : "parcial"}">${cumple ? "META ALCANZADA" : "MEJORA PARCIAL"}</span>
      </section>

      <div class="sol-comparacion" aria-label="Comparación antes y después">
        ${tarjetaCambio("Espera promedio", actual.wqPromedio, propuesto.wqPromedio, "min")}
        ${tarjetaCambio("Fila máxima", actual.lqMax, propuesto.lqMax, "camiones")}
        ${tarjetaCambio("Camiones en la calle", actual.viaPublicaMax, propuesto.viaPublicaMax, "camiones")}
      </div>

      <section class="sol-plan-generado">
        <div class="sol-plan-titulo"><span class="seccion-etiqueta">PLAN RECOMENDADO</span><h3>${paquete.nombre}</h3></div>
        <ol>${paquete.acciones.map(([plazo, titulo, detalle]) => `<li><span>${plazo}</span><div><strong>${titulo}</strong><p>${detalle}</p></div></li>`).join("")}</ol>
      </section>

      <section class="sol-conclusion ${cumple ? "cumple" : "parcial"}">
        <div><strong>${cumple ? "Este plan resuelve la prioridad seleccionada." : "Este plan ayuda, pero necesita seguimiento."}</strong>
          <p>${cumple
            ? `El resultado simulado cumple la meta de ${problema.meta}. Empieza con el primer paso y controla los indicadores cada semana.`
            : `El resultado mejora la situación, pero todavía no llega a ${problema.meta}. Prueba “Solución completa” o ajusta los parámetros en el simulador.`}</p></div>
        <div class="sol-conclusion-enlaces"><a class="boton" href="#simulador">Comprobar en el simulador</a><a href="#mapa">Ver el efecto en el mapa →</a></div>
      </section>
      <p class="suave nota">Recomendación educativa basada en datos simulados y en los supuestos documentados por el grupo; debe validarse con datos reales antes de aplicarse.</p>`;

    if (desplazar) salida.scrollIntoView({ behavior: "smooth", block: "start" });
  },
});
