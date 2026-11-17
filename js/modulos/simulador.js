// Módulo 2 · Simulador de cola
// Abierto a todo el grupo · Rama sugerida: mejora-simulador
// Use kpiDelDia(registrosDelDia(dia), { carriles, servicioMin, capacidadVia, llegadas })
// que ya calcula colas, ρ, Wq, horas con desborde (fórmulas en js/kpi.js).
MODULOS.push({
  id: "simulador",
  titulo: "Simulador de cola",
  dueno: "Todo el grupo",
  rama: "mejora-simulador",
  render(contenedor, estado) {
    // TODO: reemplazar este aviso por el módulo real.
    avisoEnConstruccion(contenedor, this, [
      "Sliders: carriles abiertos (1–6), tiempo de servicio (2–6 min), % extra de llegadas en hora pico.",
      "Gráfico de cola hora por hora (Lq) con línea del límite de la vía de acceso.",
      "Mostrar Wq, Lq y ρ por hora y marcar las horas con desborde.",
      "Responder: ¿cuántos carriles hacen falta para que ρ quede bajo 85 % en la hora pico?",
    ], "Lee CLAUDE.md. Propón un plan para el módulo 2 (simulador de cola) con los KPI Wq, Lq y ρ usando kpiDelDia de js/kpi.js. No escribas código todavía.");
  },
});
