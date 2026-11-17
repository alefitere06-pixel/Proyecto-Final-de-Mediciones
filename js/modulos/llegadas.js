// Módulo 1 · Llegadas
// Responsable: Integrante 1 · Rama: modulo-llegadas
// Datos disponibles: DATOS.horas (dia, fecha, dia_semana, dia_buque, hora, llegadas,
//   importacion, exportacion, vacio), DATOS.dias. Use crearGrafico(idCanvas, config).
MODULOS.push({
  id: "llegadas",
  titulo: "Llegadas",
  dueno: "Integrante 1",
  rama: "modulo-llegadas",
  render(contenedor, estado) {
    // TODO: reemplazar este aviso por el módulo real.
    avisoEnConstruccion(contenedor, this, [
      "Perfil de llegadas por hora (λ) del día elegido y promedio de los 30 días.",
      "Llegadas por día de la semana; comparar días con buque vs sin buque.",
      "Filtro por tipo de transacción: importación, exportación, vacío.",
      "Marcar las horas pico (las de mayor λ).",
    ], "Lee CLAUDE.md. Propón un plan para el módulo 1 (Llegadas) en js/modulos/llegadas.js usando DATOS.horas y crearGrafico. No escribas código todavía.");
  },
});
