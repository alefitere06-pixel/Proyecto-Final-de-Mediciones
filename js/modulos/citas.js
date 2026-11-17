// Módulo 4 · Citas (TAS dinámico)
// Responsable: Integrante 4 · Rama: modulo-citas
// Supuestos del piloto en DATOS.supuestos (pct_con_cita, puntualidad, no_show)
// y resultados diarios en DATOS.citas_piloto (reservadas, usadas, dentro_franja).
MODULOS.push({
  id: "citas",
  titulo: "Citas (TAS)",
  dueno: "Integrante 4",
  rama: "modulo-citas",
  render(contenedor, estado) {
    // TODO: reemplazar este aviso por el módulo real.
    avisoEnConstruccion(contenedor, this, [
      "Definir franjas horarias y capacidad por franja.",
      "TAS DINÁMICO (nuestra propuesta): capacidad por franja = carriles abiertos × μ × 0,85 (meta de ρ), no un número fijo.",
      "Redistribuir las llegadas con cita (los puntuales van a su franja; los no puntuales llegan a su hora original; los no-show no llegan) y pasar el nuevo λ a kpiDelDia({ llegadas }).",
      "Comparar sin TAS vs con TAS: espera, cola máxima, horas con desborde, cumplimiento y no-show.",
      "Responder: ¿qué pasa si el no-show es alto (ej. 25 %)?",
    ], "Lee CLAUDE.md. Propón un plan para el módulo 4 (TAS dinámico): cómo redistribuir las llegadas por franja y comparar sin TAS vs con TAS. No escribas código todavía.");
  },
});
