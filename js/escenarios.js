// =============================================================================
// escenarios.js · Simulación de escenarios "qué pasa si"
// -----------------------------------------------------------------------------
// Aquí NO hay fórmulas de KPI nuevas: solo se cambian las ENTRADAS (llegadas por
// hora, capacidad, capacidad de espera) y luego se calculan los KPI con las
// fórmulas del curso (kpiDelDia y KPI.* en js/kpi.js).
//
// Palancas de la propuesta "Gate Inteligente":
//   1. TAS dinámico .......... redistribuye llegadas con cita a franjas con espacio
//   2. Cola virtual .......... pre-estacionamiento fuera de la vía (+ capacidad de espera)
//   3. Doble transacción ..... menos visitas (una visita hace entrega + retiro)
// Todos los supuestos están en ESCENARIO_BASE y explicados en el README.
// =============================================================================

const HORAS_PICO = [7, 8, 9, 10, 15, 16, 17, 18];

// Valores por defecto de la propuesta (supuestos del grupo, ver README)
const ESCENARIO_BASE = {
  carriles: null,          // null = los de los datos (5)
  servicioMin: null,       // null = los de los datos (≈ 4 min, varía por hora)
  extraPicoPct: 0,         // % extra de llegadas en horas pico
  capacidadVia: null,      // null = supuesto de los datos (40 camiones)
  tas: {
    activo: false,
    pctCita: 70,           // % de camiones que reservan cita
    puntualidad: 85,       // % de los que llegan dentro de su franja
    noShow: 10,            // % de citas reservadas que no se usan
    modo: "dinamica",      // "dinamica" (nuestra propuesta) | "fija" (TAS clásico)
    factorRho: 0.85,       // capacidad dinámica = μ·c × 0,85 (meta de ρ)
    capacidadFija: 60,     // camiones por franja en el TAS clásico
    flexibilidadH: 2,      // horas que un transportista acepta mover su cita (±)
  },
  colaVirtual: {
    activo: false,
    capacidadPreEst: 60,   // camiones que caben en el pre-estacionamiento
  },
  doble: {
    activo: false,
    pct: 30,               // % de camiones de import/export que combinan entrega + retiro
  },
};

// Copia profunda simple de un escenario, con cambios
function escenario(cambios = {}) {
  const e = JSON.parse(JSON.stringify(ESCENARIO_BASE));
  for (const k in cambios) {
    if (typeof cambios[k] === "object" && cambios[k] !== null) Object.assign(e[k], cambios[k]);
    else e[k] = cambios[k];
  }
  return e;
}

// --- TAS: redistribuir llegadas con cita -------------------------------------
// Supuestos del modelo:
//  - Cada camión con cita RESERVA una franja. Se le asigna la franja más cercana a la
//    hora que quería que tenga espacio libre, pero el transportista solo acepta moverse
//    hasta ±flexibilidadH horas. Si no hay espacio en ese rango, se queda en su hora.
//  - Los camiones SIN cita llegan a su hora original.
//  - Los NO-SHOW no usan su franja (queda vacía) y, como no pierden el viaje, llegan
//    sin cita a su hora original: el sistema no los esperaba.
//  - Los NO PUNTUALES tampoco llegan en su franja: llegan a su hora original.
//  - Solo los PUNTUALES llegan en la franja asignada.
//  - Espacio libre por franja:
//      dinámica (propuesta): μ·c × 0,85 − camiones sin cita previstos para esa hora
//      fija (TAS clásico):   capacidad fija por franja, igual todo el día
//  Por eso un no-show alto empeora el resultado: franjas reservadas que quedan vacías
//  y camiones que llegan a la hora pico sin estar previstos.
function redistribuirTAS(llegadas, capacidades, t) {
  const n = llegadas.length;
  const reservas = new Array(n).fill(0);   // camiones con cita según la hora que querían
  const fueraDeFranja = new Array(n).fill(0); // no-show + no puntuales (llegan a su hora)
  const sinCita = new Array(n).fill(0);
  const fraccionEnFranja = (1 - t.noShow / 100) * (t.puntualidad / 100);
  let reservadas = 0, usadas = 0, dentro = 0;

  for (let h = 0; h < n; h++) {
    const conCita = llegadas[h] * t.pctCita / 100;
    const presentes = conCita * (1 - t.noShow / 100);
    reservas[h] = conCita;
    sinCita[h] = llegadas[h] - conCita;
    fueraDeFranja[h] = conCita * (1 - fraccionEnFranja);
    reservadas += conCita; usadas += presentes; dentro += presentes * t.puntualidad / 100;
  }

  const libre = capacidades.map((c, h) => {
    if (c <= 0) return 0; // garita cerrada: no hay franjas
    return t.modo === "fija" ? t.capacidadFija : Math.max(0, c * t.factorRho - sinCita[h]);
  });

  // Asignar franjas: h, h-1, h+1, h-2, h+2, ... (primero adelantar, después atrasar)
  const asignadas = new Array(n).fill(0);
  let sobrante = 0;
  for (let h = 0; h < n; h++) {
    let pendiente = reservas[h];
    for (let d = 0; d <= (t.flexibilidadH ?? 2) && pendiente > 1e-9; d++) {
      for (const k of d === 0 ? [h] : [h - d, h + d]) {
        if (k < 0 || k >= n || pendiente <= 1e-9) continue;
        const toma = Math.min(pendiente, libre[k]);
        libre[k] -= toma; asignadas[k] += toma; pendiente -= toma;
      }
    }
    asignadas[h] += pendiente; // sin espacio dentro de su flexibilidad: llega a su hora
    sobrante += pendiente;
  }

  return {
    llegadas: llegadas.map((_, h) => sinCita[h] + fueraDeFranja[h] + asignadas[h] * fraccionEnFranja),
    citas: { reservadas, usadas, dentro, noUsadas: reservadas - usadas },
    sobrante,
  };
}

// --- Simular un día con un escenario -----------------------------------------
function simularDia(dia, esc = ESCENARIO_BASE) {
  const regs = registrosDelDia(dia);
  const capVia = esc.capacidadVia ?? DATOS.supuestos.capacidad_via_camiones;

  // Tiempo de servicio: si se da un promedio, se escalan las horas para conservar su variación
  const servAbiertas = regs.filter((r) => r.garita_abierta).map((r) => r.servicio_min);
  const factorServ = esc.servicioMin ? esc.servicioMin / promedio(servAbiertas) : 1;
  const capacidades = regs.map((r) => r.garita_abierta
    ? KPI.capacidad(esc.carriles ?? r.carriles_abiertos, r.servicio_min * factorServ) : 0);

  // Llegadas: base + extra en horas pico
  let llegadas = regs.map((r) =>
    r.llegadas * (HORAS_PICO.includes(r.hora) ? 1 + esc.extraPicoPct / 100 : 1));

  // Palanca 3 · doble transacción: dos visitas (import + export) se vuelven una
  if (esc.doble.activo) {
    llegadas = llegadas.map((l, h) => {
      const r = regs[h];
      const impExp = r.llegadas ? (r.importacion + r.exportacion) / r.llegadas : 0;
      return l - l * impExp * (esc.doble.pct / 100) / 2;
    });
  }

  // Palanca 1 · TAS
  let citas = null;
  if (esc.tas.activo) {
    const r = redistribuirTAS(llegadas, capacidades, esc.tas);
    llegadas = r.llegadas;
    citas = r.citas;
  }

  // Palanca 2 · cola virtual: el pre-estacionamiento suma espacio de espera fuera de la vía
  const capEspera = capVia + (esc.colaVirtual.activo ? esc.colaVirtual.capacidadPreEst : 0);

  const k = kpiDelDia(regs, { llegadas, capacidades, capacidadVia: capEspera });
  k.capacidadEspera = capEspera;
  k.totalLlegadas = llegadas.reduce((a, b) => a + b, 0);
  if (citas) {
    k.cumplimiento = KPI.cumplimientoCitas(citas.dentro, citas.usadas);
    k.noShow = KPI.noShow(citas.noUsadas, citas.reservadas);
    k.citas = citas;
  }
  return k;
}

// Promedio de los KPI resumen sobre varios días
function simularPeriodo(dias, esc) {
  const r = dias.map((d) => simularDia(d, esc));
  const campos = ["wqPromedio", "wqMax", "lqMax", "rhoPico", "tttPromedio", "horasDesborde",
    "viaPublicaMax", "totalLlegadas", "cumplimiento", "noShow"];
  const out = { dias: r };
  campos.forEach((c) => {
    const v = r.map((x) => x[c]).filter((x) => x !== undefined);
    out[c] = v.length ? promedio(v) : undefined;
  });
  return out;
}

function diasConBuque() { return DATOS.dias.filter((d) => d.dia_buque).map((d) => d.dia); }
function todosLosDias() { return DATOS.dias.map((d) => d.dia); }
