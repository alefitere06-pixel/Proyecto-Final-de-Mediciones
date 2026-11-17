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
| [x] | Sliders: carriles abiertos, tiempo de servicio, % extra de llegadas en pico | Claude (rama `mejora-modulos-2-5`) |
| [x] | Gráfico de cola por hora (Lq) con línea del límite de la vía de acceso | Claude (rama `mejora-modulos-2-5`) |
| [x] | Wq, Lq y ρ por hora; marcar horas con desborde | Claude (rama `mejora-modulos-2-5`) |
| [x] | Responder: ¿cuántos carriles para ρ ≤ 85 % en la hora pico? | Claude (rama `mejora-modulos-2-5`) |

## Módulo 3 · Truck Turn Time
| Hecho | Tarea | Tomada por |
|---|---|---|
| [x] | Desglose del TTT por etapa (barras apiladas) | Claude (rama `mejora-modulos-2-5`) |
| [x] | TTT por hora del día | Claude (rama `mejora-modulos-2-5`) |
| [x] | Comparar días con buque vs sin buque | Claude (rama `mejora-modulos-2-5`) |

## Módulo 4 · Citas (TAS dinámico)
| Hecho | Tarea | Tomada por |
|---|---|---|
| [x] | Franjas y capacidad dinámica por franja (carriles × μ × 0,85) | Claude (rama `mejora-modulos-2-5`) |
| [x] | Redistribuir llegadas con cita (puntualidad y no-show) | Claude (rama `mejora-modulos-2-5`) |
| [x] | Comparación sin TAS vs con TAS | Claude (rama `mejora-modulos-2-5`) |
| [x] | Escenario de no-show alto | Claude (rama `mejora-modulos-2-5`) |

## Módulo 5 · Mejora (A3 + 3 palancas)
| Hecho | Tarea | Tomada por |
|---|---|---|
| [x] | Resumen A3: problema, causa raíz, desperdicio, propuesta | Claude (rama `mejora-modulos-2-5`) |
| [x] | Interruptores de las 3 palancas (TAS dinámico, cola virtual, doble transacción) | Claude (rama `mejora-modulos-2-5`) |
| [x] | Gráfico cascada del aporte de cada palanca | Claude (rama `mejora-modulos-2-5`) |
| [x] | Tabla actual vs propuesta con KPI meta | Claude (rama `mejora-modulos-2-5`) |

## Para mejorar (ideas del grupo)
| Hecho | Tarea | Tomada por |
|---|---|---|
| [ ] | Revisar cada número del dashboard y anotar lo que no se entienda | |
| [ ] | Discutir si los supuestos de la propuesta (70 % citas, ±2 h, 60 camiones de pre-estacionamiento) son razonables | |
| [x] | ρ pico sigue en ~93 % con la propuesta: probar una ventanilla adicional solo en horas pico y mostrar su impacto antes/después | tejadaoperaciones-star (rama `codex/tejada-simulador-cola`) |
| [ ] | Costo-beneficio de la propuesta (opcional) | |

## Mapa, animación y presentación
| Hecho | Tarea | Tomada por |
|---|---|---|
| [x] | Mapa del Puerto de Balboa, animación de la cola y modo presentación | Claude (rama `mejora-mapa-animacion-presentacion`) |
| [x] | Simplificar la portada, agrupar enlaces por ramas y añadir accesos a Google Maps con imágenes reales de Balboa | tejadaoperaciones-star (rama `codex/tejada-simulador-cola`) |
| [x] | Crear un generador de solución sin gráficos: problema + alcance → diagnóstico, resultado y plan por etapas | tejadaoperaciones-star (rama `codex/tejada-simulador-cola`) |
| [ ] | Confirmar la puerta principal y la ruta de la fila en el mapa; elegir dónde iría el estacionamiento de espera (`js/mapaFila.js`) | |
| [ ] | Anotar la fuente del mapa del puerto (img/mapa-puerto-balboa.png) en el README y la presentación | |
| [ ] | Ensayar la presentación con el reloj (15 min) y repartir qué diapositiva explica cada uno | |
| [ ] | Volver a exportar el PDF si cambian los supuestos (botón Guardar PDF) | |

## Tareas generales
| Hecho | Tarea | Tomada por |
|---|---|---|
| [ ] | Justificar capacidad de la vía de acceso (40 camiones) con mapa/medición | |
| [ ] | Comparar volumen diario simulado con una cifra publicada y citar la fuente | |
| [ ] | Confirmar con el profesor el denominador de "cumplimiento de citas" | |
| [ ] | Completar y revisar las fichas de KPI (`docs/fichas_kpi.md`) | |
| [ ] | Verificar a mano 3 KPI (`docs/verificacion_manual.md`) | |
| [ ] | Registrar prompts en la bitácora (`docs/bitacora_ia.md`) — cada uno los suyos | |
| [x] | Diapositivas en PDF (`presentacion/`) | Claude (modo presentación) |
| [ ] | Opcional (+2): publicar con GitHub Pages | |
