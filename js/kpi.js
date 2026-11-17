// =============================================================================
// kpi.js · Fórmulas de los KPI (Idea 1 · Cola en la garita de Balboa)
// -----------------------------------------------------------------------------
// REGLA DEL GRUPO: aquí solo van las fórmulas del curso (ver docs/fichas_kpi.md).
// No se inventan fórmulas. Si cambian algo, actualicen la ficha y la bitácora.
// Todas las funciones son "puras": reciben números/arreglos y devuelven números,
// así se pueden verificar a mano (docs/verificacion_manual.md).
// =============================================================================

const KPI = {
  // ---- Metas (propuestas por el grupo, justificar en docs/fichas_kpi.md) ----
  METAS: {
    wq_min: 30,          // Tiempo de espera promedio en hora pico  ≤ 30 min
    lq_max: 40,          // Cola máxima ≤ capacidad de la vía de acceso (camiones)
    rho_pct: 85,         // Utilización de carriles en hora pico   ≤ 85 %
    ttt_min: 90,         // Truck Turn Time promedio               ≤ 90 min
    desborde_h: 0,       // Horas con desborde por día             = 0 h/día
    cumplimiento_pct: 85,// Cumplimiento de citas                   ≥ 85 %
    noshow_pct: 10,      // No-show                                 ≤ 10 %
  },

  // Capacidad de la garita (μ·c) en camiones/h.
  //   μ = 60 / tiempo de servicio (min)  -> camiones por carril por hora
  //   c = carriles abiertos
  capacidad(carriles, servicioMin) {
    if (!carriles || !servicioMin) return 0;
    return (60 / servicioMin) * carriles;
  },

  // Utilización de carriles ρ = λ ÷ (μ·c), en %. Si ρ ≥ 100 % la cola crece sin parar.
  utilizacion(lambda, capacidad) {
    if (capacidad <= 0) return lambda > 0 ? Infinity : 0;
    return (lambda / capacidad) * 100;
  },

  // Longitud de cola por hora (Lq):  Cola(t+1) = máx[0; Cola(t) + λ(t) − μc(t)]
  //   llegadas[]    -> λ(t) de cada hora
  //   capacidades[] -> μc(t) de cada hora (0 si la garita está cerrada)
  // Devuelve la cola al FINAL de cada hora (camiones esperando).
  colaPorHora(llegadas, capacidades, colaInicial = 0) {
    const cola = [];
    let actual = colaInicial;
    for (let t = 0; t < llegadas.length; t++) {
      actual = Math.max(0, actual + llegadas[t] - capacidades[t]);
      cola.push(actual);
    }
    return cola;
  },

  // Tiempo de espera Wq por Ley de Little: Wq = Lq ÷ λ  (en minutos).
  // Para una hora: Lq de esa hora ÷ λ de esa hora × 60.
  esperaHora(lq, lambda) {
    if (lambda <= 0) return lq > 0 ? null : 0; // sin llegadas Little no aplica
    return (lq / lambda) * 60;
  },

  // Wq promedio de un periodo = Lq promedio ÷ λ promedio × 60 (min).
  esperaPromedio(colas, llegadas) {
    const lq = promedio(colas);
    const lambda = promedio(llegadas);
    return lambda > 0 ? (lq / lambda) * 60 : 0;
  },

  // Truck Turn Time = espera afuera + gate de entrada + patio + gate de salida (min)
  ttt(esperaMin, gateEntradaMin, patioMin, gateSalidaMin) {
    return esperaMin + gateEntradaMin + patioMin + gateSalidaMin;
  },

  // Horas con desborde: horas en que la cola supera la capacidad de la vía de acceso.
  horasDesborde(colas, capacidadVia) {
    return colas.filter((c) => c > capacidadVia).length;
  },

  // Camiones en la vía pública (KPI extra de la propuesta): lo que excede la vía de acceso.
  camionesEnViaPublica(cola, capacidadVia) {
    return Math.max(0, cola - capacidadVia);
  },

  // Cumplimiento de citas = camiones que llegan dentro de su franja ÷ camiones con cita × 100
  cumplimientoCitas(dentroFranja, conCita) {
    return conCita > 0 ? (dentroFranja / conCita) * 100 : 0;
  },

  // No-show = citas no usadas ÷ citas reservadas × 100
  noShow(noUsadas, reservadas) {
    return reservadas > 0 ? (noUsadas / reservadas) * 100 : 0;
  },
};

// ---- Utilidades ------------------------------------------------------------
function promedio(arr) {
  const v = arr.filter((x) => x !== null && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}
function maximo(arr) {
  return arr.length ? Math.max(...arr) : 0;
}

// Calcula todos los KPI de UN día a partir de sus 24 registros horarios.
// `opciones` permite cambiar supuestos (lo usará el simulador del módulo 2):
//   { carriles, servicioMin, capacidadVia, llegadas (arreglo de 24 que reemplaza λ),
//     capacidades (arreglo de 24 con μ·c ya calculado; si se da, reemplaza carriles/servicio) }
function kpiDelDia(registros, opciones = {}) {
  const capVia = opciones.capacidadVia ?? DATOS.supuestos.capacidad_via_camiones;
  const llegadas = opciones.llegadas ?? registros.map((r) => r.llegadas);
  const capacidades = opciones.capacidades ?? registros.map((r) => {
    if (!r.garita_abierta) return 0;
    const c = opciones.carriles ?? r.carriles_abiertos;
    const s = opciones.servicioMin ?? r.servicio_min;
    return KPI.capacidad(c, s);
  });
  const colas = KPI.colaPorHora(llegadas, capacidades);
  const rho = llegadas.map((l, i) => KPI.utilizacion(l, capacidades[i]));
  const esperas = colas.map((q, i) => KPI.esperaHora(q, llegadas[i]));

  // Hora pico = hora con más llegadas del día
  const iPico = llegadas.indexOf(maximo(llegadas));
  // Wq del día (horas con llegadas) por Little
  const conLlegadas = llegadas.map((l, i) => i).filter((i) => llegadas[i] > 0);
  const wqDia = KPI.esperaPromedio(conLlegadas.map((i) => colas[i]), conLlegadas.map((i) => llegadas[i]));

  // TTT promedio del día (ponderado por llegadas)
  let sumaTTT = 0, n = 0;
  conLlegadas.forEach((i) => {
    const r = registros[i];
    const espera = esperas[i] ?? 0;
    sumaTTT += llegadas[i] * KPI.ttt(espera, r.servicio_min, r.patio_min, r.gate_salida_min);
    n += llegadas[i];
  });

  return {
    llegadas, capacidades, colas, rho, esperas,
    horaPico: registros[iPico].hora,
    wqPromedio: wqDia,
    wqMax: maximo(esperas.filter((x) => x !== null)),
    lqMax: maximo(colas),
    rhoPico: rho[iPico],
    tttPromedio: n ? sumaTTT / n : 0,
    horasDesborde: KPI.horasDesborde(colas, capVia),
    viaPublicaMax: KPI.camionesEnViaPublica(maximo(colas), capVia),
  };
}

// Registros horarios de un día (1..30)
function registrosDelDia(dia) {
  return DATOS.horas.filter((h) => h.dia === dia);
}
