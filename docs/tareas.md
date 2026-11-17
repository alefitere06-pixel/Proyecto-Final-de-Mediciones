# Lista de tareas del grupo

Nadie es dueño de un módulo: **cualquier integrante puede tomar cualquier tarea**.
Antes de empezar, escriban su usuario de GitHub en "Tomada por" (y hagan commit/push de este
archivo) para no trabajar los dos en lo mismo. Al terminar, marquen la casilla `[x]`.

Flujo: rama `mejora-<tema>` → commits pequeños → Pull Request → el **otro** integrante revisa → merge.

**Orden sugerido:** primero Módulos 1 y 2 (el Hito 2 pide 2 módulos funcionando), luego 3 y 4, al final 5.

## Módulo 1 · Llegadas
| Hecho | Tarea | Tomada por |
|---|---|---|
| [x] | Gráfico de llegadas por hora (λ) del día elegido + promedio de los 30 días | Claude (rama `mejora-llegadas`) |
| [x] | Llegadas por día de la semana; días con buque vs sin buque | Claude (rama `mejora-llegadas`) |
| [x] | Filtro por tipo de transacción (importación, exportación, vacío) | Claude (rama `mejora-llegadas`) |
| [x] | Marcar las horas pico | Claude (rama `mejora-llegadas`) |

## Módulo 2 · Simulador de cola
| Hecho | Tarea | Tomada por |
|---|---|---|
| [ ] | Sliders: carriles abiertos, tiempo de servicio, % extra de llegadas en pico | |
| [ ] | Gráfico de cola por hora (Lq) con línea del límite de la vía de acceso | |
| [ ] | Wq, Lq y ρ por hora; marcar horas con desborde | |
| [ ] | Responder: ¿cuántos carriles para ρ ≤ 85 % en la hora pico? | |

## Módulo 3 · Truck Turn Time
| Hecho | Tarea | Tomada por |
|---|---|---|
| [ ] | Desglose del TTT por etapa (barras apiladas) | |
| [ ] | TTT por hora del día | |
| [ ] | Comparar días con buque vs sin buque | |

## Módulo 4 · Citas (TAS dinámico)
| Hecho | Tarea | Tomada por |
|---|---|---|
| [ ] | Franjas y capacidad dinámica por franja (carriles × μ × 0,85) | |
| [ ] | Redistribuir llegadas con cita (puntualidad y no-show) | |
| [ ] | Comparación sin TAS vs con TAS | |
| [ ] | Escenario de no-show alto | |

## Módulo 5 · Mejora (A3 + 3 palancas)
| Hecho | Tarea | Tomada por |
|---|---|---|
| [ ] | Resumen A3: problema, causa raíz, desperdicio, propuesta | |
| [ ] | Interruptores de las 3 palancas (TAS dinámico, cola virtual, doble transacción) | |
| [ ] | Gráfico cascada del aporte de cada palanca | |
| [ ] | Tabla actual vs propuesta con KPI meta | |

## Tareas generales
| Hecho | Tarea | Tomada por |
|---|---|---|
| [ ] | Justificar capacidad de la vía de acceso (40 camiones) con mapa/medición | |
| [ ] | Comparar volumen diario simulado con una cifra publicada y citar la fuente | |
| [ ] | Confirmar con el profesor el denominador de "cumplimiento de citas" | |
| [ ] | Completar y revisar las fichas de KPI (`docs/fichas_kpi.md`) | |
| [ ] | Verificar a mano 3 KPI (`docs/verificacion_manual.md`) | |
| [ ] | Registrar prompts en la bitácora (`docs/bitacora_ia.md`) — cada uno los suyos | |
| [ ] | Diapositivas en PDF (`presentacion/`) | |
| [ ] | Opcional (+2): publicar con GitHub Pages | |
