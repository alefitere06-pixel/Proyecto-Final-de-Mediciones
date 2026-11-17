# Gate Balboa · Dashboard de cola y citas

Proyecto semestral · **Medición y Rendimiento de Terminales Portuarias** · Universidad Marítima Internacional de Panamá
**Idea 1 · Cola para entrar a la garita de Balboa** — Propuesta: **Gate Inteligente (3 palancas)**

> ⚠️ Todos los datos del dashboard son **simulados**.

## Integrantes
| Nombre | Usuario GitHub |
|---|---|
| alefitere06-pixel | alefitere06-pixel |
| tejadaoperaciones-star | tejadaoperaciones-star |

El proyecto **no está dividido por integrante**: cada uno puede mejorar cualquier parte
(ver [Cómo trabajamos](#cómo-trabajamos-git)).

## El problema
En horas pico se forma una cola de camiones para entrar a la garita de la terminal de Balboa.
La causa está en el **diseño de la terminal**: no hay una vía de espera fuera de la terminal que no
afecte el tránsito del Puente de las Américas. Cuando la cola supera lo que cabe en la vía de acceso,
los camiones ocupan la vía pública.

Con los datos simulados, la situación actual muestra que **los días de buque** la llegada en hora
pico supera la capacidad de la garita (ρ > 100 %), la cola pasa el límite de la vía de acceso y hay
varias horas de desborde, mientras que los días sin buque la garita casi siempre alcanza.

## Nuestra propuesta: Gate Inteligente (3 palancas)
1. **TAS dinámico** — el sistema de citas no usa una capacidad fija por franja: la calcula como
   *carriles abiertos × μ × 0,85*, para que ρ quede bajo la meta en cada franja.
2. **Cola virtual con pre-estacionamiento** — los camiones esperan en un área fuera de la vía y se
   llaman por app cuando hay espacio. KPI extra: **camiones en la vía pública**.
3. **Incentivo de doble transacción** — entregar exportación y retirar importación en la misma visita
   reduce las llegadas totales.

El módulo 5 mide cuánto aporta cada palanca (gráfico cascada).

## Estilos visuales
El dashboard tiene 3 estilos (selector **Estilo** en la barra, o `index.html?tema=logistica|tecnico|ejecutivo`):
**A · Logística** (tarjetas claras con camión al centro), **B · Técnico** (diagrama de la garita con alarmas) y
**C · Ejecutivo** (saludo, KPI con mini-gráficos, puerto). Cada uno tiene su portada **Inicio**. Cuando el grupo
escoja uno, cambien `TEMA_POR_DEFECTO` en `js/temas.js`.

## Lo más fácil de ver (para la defensa)
- **Pestaña 1 · Mapa y cola en vivo:** mapa real del Puerto de Balboa (OpenStreetMap, necesita internet) con la
  garita, el Puente de las Américas y el pre-estacionamiento propuesto, y una **animación** con un camioncito por
  cada camión en cola: arriba la situación actual (los camiones salen a la vía pública en rojo), abajo con
  Gate Inteligente. Botón ▶ para reproducir el día completo.
- **Botón ▶ Presentación** (arriba): diapositivas a pantalla completa para los 15 minutos de exposición, con los
  números calculados en vivo, la animación antes/después, un reloj y botones para ir a la demo de cada módulo.
  Teclas → ← y Esc. "Guardar PDF" imprime todas las diapositivas: copia en
  [`presentacion/presentacion_gate_balboa.pdf`](presentacion/presentacion_gate_balboa.pdf).

> Los puntos del mapa son **aproximados**: arrástrenlos a su lugar exacto, hagan clic para ver las coordenadas
> y cópienlas en `PUNTOS_MAPA` (`js/modulos/mapa.js`).

## Cómo abrir el dashboard
1. Descargar o clonar el repositorio.
2. Abrir **`index.html` con doble clic** (Chrome o Edge). No hace falta instalar nada ni servidor:
   Chart.js y Leaflet están guardados en `js/lib/` y los datos en `data/llegadas.js`.
   Solo el fondo del mapa necesita internet; todo lo demás funciona sin conexión.

## Módulos
| # | Módulo | Qué muestra |
|---|---|---|
| 0 | Mapa y cola en vivo | Mapa del Puerto de Balboa + animación de la cola sin y con la propuesta |
| 1 | Llegadas | Perfil de llegadas por hora y día, horas pico, filtro por transacción |
| 2 | Simulador de cola | Carriles, servicio y llegadas → Lq, Wq, ρ y horas con desborde |
| 3 | Truck Turn Time | Desglose del TTT por etapa y por hora |
| 4 | Citas (TAS) | TAS dinámico: franjas, sin TAS vs con TAS, cumplimiento y no-show |
| 5 | Mejora | A3 Lean y gráfico cascada de las 3 palancas |

## Datos simulados
Se generan con `python data/generar_datos.py` (Python 3, sin librerías extra). Usa **semilla fija (42)**:
si se ejecuta otra vez se obtienen exactamente los mismos datos. Produce `data/llegadas.json` y
`data/llegadas.js` (30 días × 24 horas + piloto de citas).

### Supuestos (justificación)
| Supuesto | Valor | Por qué |
|---|---|---|
| Periodo | 30 días desde el lunes 07-09-2026 | Pide el enunciado (30 días). |
| Horario de garita | 05:00–22:00; camiones llegan desde las 04:00 | Los camiones llegan antes de abrir para evitar la cola: se forma cola temprana. |
| Perfil de llegadas | Picos 07–10 y 15–18; ~920 camiones en un día normal (lunes a jueves) | Picos de mañana y tarde que pide el enunciado. _(Pendiente: comparar con una cifra publicada de Balboa y citar la fuente.)_ |
| Llegadas por hora | Distribución de Poisson alrededor del perfil | Llegadas independientes y aleatorias, modelo clásico de colas. |
| Días de buque | Martes, jueves y sábado + 15 % de probabilidad otros días; +20 % llegadas | El enunciado pide más llegadas los días de buque. |
| Día de la semana | Viernes +8 %, sábado −25 %, domingo −55 % | Menos actividad el fin de semana. |
| Mezcla de transacciones | 45 % importación, 35 % exportación, 20 % vacío | Supuesto del grupo, revisable. |
| Carriles | 6 instalados, 5 abiertos hoy | Supuesto del grupo; con 4 la cola no se vaciaba nunca (irreal). |
| Tiempo de servicio | Media 4 min (rango 2–6 min) | Rango que da el enunciado. |
| Tiempo en patio | 35 min (+10 min día de buque) ± 5 | Supuesto: patio más congestionado con buque. |
| Gate de salida | 3 min | Supuesto. |
| Capacidad de la vía de acceso | 40 camiones | ~700 m de vía útil ÷ ~18 m por camión con separación. _(Pendiente: medir en mapa y justificar.)_ |
| Piloto TAS | 60 % con cita, 80 % puntuales, 12 % no-show | Supuestos del grupo para el piloto de citas. |

### Supuestos de la propuesta (escenarios, `js/escenarios.js`)
| Supuesto | Valor por defecto | Por qué / cómo se modela |
|---|---|---|
| Camiones con cita | 70 % | Meta de adopción del TAS (el piloto simulado tiene 60 %). Ajustable en el módulo 4. |
| Puntualidad | 85 % | Igual a la meta de cumplimiento. Los impuntuales llegan a su hora original. |
| No-show | 10 % | Igual a la meta. Los no-show no usan su franja y llegan sin cita a su hora original (no estaban previstos). |
| Flexibilidad del transportista | ±2 h | Un transportista acepta mover su cita como máximo 2 horas; si no hay espacio, llega a su hora. |
| Capacidad por franja (TAS dinámico) | μ·c × 0,85 − camiones sin cita previstos | Para que ρ quede en la meta de 85 % en cada hora. |
| Capacidad por franja (TAS clásico) | 60 camiones/h fija | El TAS del ejemplo del profesor: no mira la capacidad real ni a los camiones sin cita. |
| Pre-estacionamiento (cola virtual) | 60 camiones | Supuesto: lote de ~1 ha fuera de la vía. Suma espacio de espera; no cambia la espera Wq. |
| Doble transacción | 30 % de camiones import/export | Cada par entrega + retiro se hace en una sola visita: las llegadas bajan en (imp + exp) × 30 % ÷ 2. |
| Extra en hora pico (módulo 2) | 0 % | Para probar picos más fuertes (07–10 y 15–18). |

Ningún escenario usa fórmulas nuevas: solo cambian las entradas (llegadas por hora, capacidad, espacio de
espera) y los KPI se calculan con las fórmulas del curso en `js/kpi.js`.

## Resultados principales (promedio de los días con buque, datos simulados)
| KPI | Actual | TAS clásico | Gate Inteligente (3 palancas) | Meta |
|---|---|---|---|---|
| Espera promedio Wq | 31 min | 26 min | 1,5 min | ≤ 30 min |
| Cola máxima Lq | 80 camiones | 68 | 12 | ≤ 40 |
| Horas con desborde | 6,1 h/día | 5,3 | 0 | 0 |
| Camiones en vía pública (máx) | 46 | 37 | 0 | 0 |
| Truck Turn Time | 82 min | 78 | 53 | ≤ 90 |
| ρ en hora pico | 132 % | 119 % | 93 % | ≤ 85 % (aún no se cumple) |

## KPI
Fichas completas en [`docs/fichas_kpi.md`](docs/fichas_kpi.md). Fórmulas en `js/kpi.js`.
Verificación a mano en [`docs/verificacion_manual.md`](docs/verificacion_manual.md).

## Cómo trabajamos (Git)
- **Nadie es dueño de un módulo.** Cualquier integrante puede tomar cualquier tarea y mejorar cualquier parte.
- Lista de tareas en [`docs/tareas.md`](docs/tareas.md): antes de empezar, anoten su usuario en
  "Tomada por" para no trabajar los dos en lo mismo.
- La rama principal `Proyecto-Final-mediciones` siempre funciona. Cada mejora va en su propia rama (`mejora-<tema>`, por ejemplo
  `mejora-grafico-llegadas`) y entra por Pull Request.
- El **otro** integrante revisa el PR (abre el dashboard y verifica un número) antes del merge.
- Commits pequeños y frecuentes: así los dos quedan con commits propios en todo el proyecto.
- Ambos deben poder explicar cualquier KPI y cualquier módulo (lo exige la defensa).
- Prompts importantes y correcciones a la IA: [`docs/bitacora_ia.md`](docs/bitacora_ia.md).
