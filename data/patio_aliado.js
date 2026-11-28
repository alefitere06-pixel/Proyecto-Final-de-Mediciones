// Contrato de integración GateFlow ↔ Patio en Flujo.
// Corte académico verificado manualmente por el proyecto aliado. Estos valores
// no se presentan como telemetría en vivo; sirven para probar la decisión
// conjunta patio → citas → camiones → gate con una fuente reproducible.
const PATIO_ALIADO = Object.freeze({
  proyecto: "Patio en Flujo",
  periodo: "60 días · corte día 60",
  actualizado: "2026-11-19",
  naturaleza: "Datos académicos simulados y verificados",
  fuente: "https://osmarborel16-hub.github.io/Proyecto-semestral-de-mediciones-y-rendimiento-portuario/",
  verificacion: "https://github.com/osmarborel16-hub/Proyecto-semestral-de-mediciones-y-rendimiento-portuario/blob/main/docs/verificacion_manual.md",
  capacidadTeu: 4600,
  inventarioTeu: 3690,
  densidadPct: 80.22,
  dwellGlobalDias: 6.35,
  remanejosPct: 39.27,
  diasAlertaRoja: 31.6,
  metas: Object.freeze({
    densidadPct: 70,
    dwellGlobalDias: 5,
    remanejosPct: 30,
    diasAlertaRoja: 30,
  }),
  categorias: Object.freeze([
    Object.freeze({ id: "importacion", nombre: "Importación", contenedores: 6356, dwellDias: 7.14, metaDias: 5 }),
    Object.freeze({ id: "exportacion", nombre: "Exportación", contenedores: 5806, dwellDias: 4.16, metaDias: 4 }),
    Object.freeze({ id: "transbordo", nombre: "Transbordo", contenedores: 5593, dwellDias: 4.99, metaDias: 4 }),
    Object.freeze({ id: "vacios", nombre: "Vacíos", contenedores: 2242, dwellDias: 13.17, metaDias: 7 }),
  ]),
});

const PATIO_ALIADO_CONTRATO_URL = "https://osmarborel16-hub.github.io/Proyecto-semestral-de-mediciones-y-rendimiento-portuario/data/gateflow-integration.json";
let PATIO_ALIADO_REMOTO = null;
let PATIO_ALIADO_PROMESA = null;

function cargarPatioAliado() {
  if (PATIO_ALIADO_REMOTO) return Promise.resolve(PATIO_ALIADO_REMOTO);
  if (PATIO_ALIADO_PROMESA) return PATIO_ALIADO_PROMESA;
  PATIO_ALIADO_PROMESA = fetch(`${PATIO_ALIADO_CONTRATO_URL}?v=${Date.now()}`, { cache: "no-store" })
    .then((respuesta) => {
      if (!respuesta.ok) throw new Error("CONTRATO_NO_DISPONIBLE");
      return respuesta.json();
    })
    .then((datos) => {
      const numericos = ["capacidadTeu", "inventarioTeu", "densidadPct", "dwellGlobalDias", "remanejosPct", "diasAlertaRoja"];
      const valido = datos && numericos.every((campo) => Number.isFinite(Number(datos[campo])))
        && Array.isArray(datos.categorias) && datos.categorias.length === 4;
      if (!valido) throw new Error("CONTRATO_INVALIDO");
      PATIO_ALIADO_REMOTO = {
        ...datos,
        proyecto: datos.proyecto || datos.project,
        periodo: datos.periodo || datos.period,
        actualizado: datos.actualizado || datos.updatedAt,
        naturaleza: datos.naturaleza || datos.nature,
        fuente: datos.fuente || datos.source,
        verificacion: datos.verificacion || datos.verification,
      };
      return PATIO_ALIADO_REMOTO;
    })
    .catch(() => PATIO_ALIADO);
  return PATIO_ALIADO_PROMESA;
}
