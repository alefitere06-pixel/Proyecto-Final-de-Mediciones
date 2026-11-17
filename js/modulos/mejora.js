// Módulo 5 · Mejora (A3 Lean) · Propuesta "Gate Inteligente: 3 palancas"
// Abierto a todo el grupo · Rama sugerida: mejora-propuesta-a3
//   Palanca 1: TAS dinámico (módulo 4)
//   Palanca 2: Cola virtual con pre-estacionamiento fuera de la vía + llamada por app
//   Palanca 3: Incentivo de doble transacción (menos visitas por contenedor)
MODULOS.push({
  id: "mejora",
  titulo: "Mejora",
  dueno: "Todo el grupo",
  rama: "mejora-propuesta-a3",
  render(contenedor, estado) {
    // TODO: reemplazar este aviso por el módulo real.
    avisoEnConstruccion(contenedor, this, [
      "Resumen A3: problema, causa raíz (diseño sin vía de espera + llegadas concentradas en picos), desperdicio (espera).",
      "Interruptores para activar cada palanca: TAS dinámico · cola virtual · doble transacción.",
      "Gráfico cascada: cuántos minutos de Wq y cuántas horas con desborde quita cada palanca.",
      "KPI extra: camiones en la vía pública (cola virtual los saca de la vía).",
      "Tabla actual vs propuesta con KPI meta y resultado esperado.",
    ], "Lee CLAUDE.md. Propón un plan para el módulo 5 (Mejora A3) con las 3 palancas y un gráfico cascada. No escribas código todavía.");
  },
});
