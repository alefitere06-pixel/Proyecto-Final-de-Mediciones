# Bitácora de uso de IA

Registren aquí los prompts importantes, qué aceptaron, qué corrigieron y por qué.

| Fecha | Integrante | Herramienta | Prompt (resumen) | Qué se aceptó | Qué se corrigió y por qué |
|---|---|---|---|---|---|
| 2026-11-17 | _(quien lo pidió)_ | Claude Code | Leer el enunciado (Idea 1) y crear la base del proyecto: estructura, CLAUDE.md, README, generador de datos con semilla, fórmulas KPI, index.html con 5 pestañas vacías y fichas en borrador. Propuesta innovadora: "Gate Inteligente, 3 palancas". | Estructura, fórmulas de `js/kpi.js` (las del curso), generador reproducible, tarjetas KPI con meta y alerta. | Con 4 carriles abiertos la cola nunca se vaciaba (irreal): se cambió a 5 carriles y el efecto buque de +30 % a +20 %. Pendiente del grupo: revisar todos los supuestos y metas. |
| 2026-11-17 | alefitere06-pixel | Claude Code | Construir el Módulo 1 · Llegadas según el plan aprobado: λ por hora con horas pico, promedio de 30 días, capacidad μ·c, filtro por transacción, promedio por día de la semana con/sin buque y tabla resumen. | Gráficos, filtros y tabla. Se reutiliza `kpiDelDia` para μ·c (sin fórmulas nuevas). | La IA marcaba las 04:00 como hora de cola sin explicar: se agregó "(garita cerrada)" porque a esa hora μ·c = 0. En celular los gráficos desbordaban la pantalla: se corrigió el CSS. Verificado a mano: día 2 = 1.195 camiones, hora pico 08:00 con λ = 106. |
| | | | | | |
