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

## Cómo abrir el dashboard
1. Descargar o clonar el repositorio.
2. Abrir **`index.html` con doble clic** (Chrome o Edge). No hace falta instalar nada ni servidor:
   Chart.js está guardado en `js/lib/` y los datos en `data/llegadas.js`.

## Módulos
| # | Módulo | Qué muestra |
|---|---|---|
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

## KPI
Fichas completas en [`docs/fichas_kpi.md`](docs/fichas_kpi.md). Fórmulas en `js/kpi.js`.
Verificación a mano en [`docs/verificacion_manual.md`](docs/verificacion_manual.md).

## Cómo trabajamos (Git)
- **Nadie es dueño de un módulo.** Cualquier integrante puede tomar cualquier tarea y mejorar cualquier parte.
- Lista de tareas en [`docs/tareas.md`](docs/tareas.md): antes de empezar, anoten su usuario en
  "Tomada por" para no trabajar los dos en lo mismo.
- `main` siempre funciona. Cada mejora va en su propia rama (`mejora-<tema>`, por ejemplo
  `mejora-grafico-llegadas`) y entra por Pull Request.
- El **otro** integrante revisa el PR (abre el dashboard y verifica un número) antes del merge.
- Commits pequeños y frecuentes: así los dos quedan con commits propios en todo el proyecto.
- Ambos deben poder explicar cualquier KPI y cualquier módulo (lo exige la defensa).
- Prompts importantes y correcciones a la IA: [`docs/bitacora_ia.md`](docs/bitacora_ia.md).
