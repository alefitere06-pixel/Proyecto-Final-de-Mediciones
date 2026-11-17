// Módulo 3 · Truck Turn Time
// Abierto a todo el grupo · Rama sugerida: mejora-ttt
// TTT = espera afuera + gate de entrada + patio + gate de salida  (KPI.ttt en js/kpi.js)
// Datos por hora: servicio_min (gate entrada), patio_min, gate_salida_min; la espera
// sale de kpiDelDia(...).esperas.
MODULOS.push({
  id: "ttt",
  titulo: "Truck Turn Time",
  dueno: "Todo el grupo",
  rama: "mejora-ttt",
  render(contenedor, estado) {
    // TODO: reemplazar este aviso por el módulo real.
    avisoEnConstruccion(contenedor, this, [
      "Desglose del TTT por etapa (espera, gate entrada, patio, gate salida) en barras apiladas.",
      "TTT por hora del día: ¿en qué horas sube y por qué etapa?",
      "Comparar días con buque vs sin buque.",
      "Mostrar en qué etapa se pierde más tiempo (desperdicio Lean: espera).",
    ], "Lee CLAUDE.md. Propón un plan para el módulo 3 (Truck Turn Time) usando KPI.ttt y kpiDelDia. No escribas código todavía.");
  },
});
