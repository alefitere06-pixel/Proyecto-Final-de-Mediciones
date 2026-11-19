# Fichas de KPI · GateFlow (BORRADOR)

> Borrador para el Hito 2. Cada responsable revisa y completa la ficha de los KPI de su módulo.
> Fórmulas implementadas en `js/kpi.js`. Fuente de todos los datos: `data/llegadas.js`
> (generado por `data/generar_datos.py`, datos **simulados**).

---

## 1. Llegadas por hora (λ)
| Campo | Detalle |
|---|---|
| Definición | Camiones que llegan a la garita en cada hora del día |
| Fórmula | Conteo de llegadas por hora |
| Unidad y frecuencia | camiones/h · por hora y por día |
| Meta | No aplica (es la demanda); se vigila la hora pico |
| Fuente del dato | `DATOS.horas[].llegadas` |
| Decisión que apoya | Cuándo abrir más carriles y cómo repartir franjas del TAS |

## 2. Capacidad de la garita (μ·c)
| Campo | Detalle |
|---|---|
| Definición | Camiones que la garita puede atender por hora |
| Fórmula | μ·c = (60 ÷ tiempo de servicio en min) × carriles abiertos |
| Unidad y frecuencia | camiones/h · por hora |
| Meta | Debe ser ≥ λ ÷ 0,85 en la hora pico |
| Fuente del dato | `servicio_min`, `carriles_abiertos` |
| Decisión que apoya | Cuántos carriles abrir |

## 3. Utilización de carriles (ρ)
| Campo | Detalle |
|---|---|
| Definición | Qué tan ocupados están los carriles. Si ρ ≥ 100 % la cola crece sin parar |
| Fórmula | ρ = λ ÷ (μ·c) × 100 |
| Unidad y frecuencia | % · por hora (se reporta la hora pico) |
| Meta | ≤ 85 % en hora pico (margen para la variabilidad de llegadas) |
| Fuente del dato | λ y μ·c |
| Decisión que apoya | Cuántos carriles hacen falta en la hora pico |

## 4. Longitud de cola (Lq)
| Campo | Detalle |
|---|---|
| Definición | Camiones esperando para entrar al final de cada hora |
| Fórmula | Cola(t+1) = máx[0; Cola(t) + λ(t) − μc] |
| Unidad y frecuencia | camiones · por hora (se reporta el máximo del día) |
| Meta | ≤ 40 camiones (capacidad supuesta de la vía de acceso) |
| Fuente del dato | λ y μ·c |
| Decisión que apoya | Si la cola llega a la vía pública |

## 5. Tiempo de espera (Wq)
| Campo | Detalle |
|---|---|
| Definición | Minutos que un camión espera desde que llega a la cola hasta que entra a la garita |
| Fórmula | Ley de Little: Wq = Lq ÷ λ (× 60 para minutos) |
| Unidad y frecuencia | min · por hora y promedio del día |
| Meta | ≤ 30 min (propuesta del grupo: _justificar_) |
| Fuente del dato | Lq y λ |
| Decisión que apoya | Cuántos carriles abrir y si conviene el TAS |

## 6. Truck Turn Time (TTT)
| Campo | Detalle |
|---|---|
| Definición | Tiempo total del camión desde que llega a la cola hasta que sale |
| Fórmula | TTT = espera afuera + gate de entrada + patio + gate de salida |
| Unidad y frecuencia | min · promedio del día ponderado por llegadas |
| Meta | ≤ 90 min (_justificar_) |
| Fuente del dato | Wq, `servicio_min`, `patio_min`, `gate_salida_min` |
| Decisión que apoya | En qué etapa se pierde el tiempo |

## 7. Horas con desborde
| Campo | Detalle |
|---|---|
| Definición | Horas en que la cola supera la capacidad de la vía de acceso |
| Fórmula | Número de horas con Lq > 40 |
| Unidad y frecuencia | h/día |
| Meta | 0 h/día |
| Fuente del dato | Lq y supuesto de capacidad de vía |
| Decisión que apoya | Impacto en la vía pública / Puente de las Américas |

## 8. Cumplimiento de citas
| Campo | Detalle |
|---|---|
| Definición | Porcentaje de camiones con cita que llegan dentro de su franja |
| Fórmula | Camiones dentro de su franja ÷ camiones con cita × 100 |
| Unidad y frecuencia | % · por día |
| Meta | ≥ 85 % |
| Fuente del dato | `DATOS.citas_piloto` (`dentro_franja`, `usadas`) |
| Decisión que apoya | Si el TAS funciona o hace falta penalizar llegadas fuera de franja |
| Nota | Se toma "camiones con cita" = camiones que llegaron con cita (`usadas`). _Confirmar con el profesor._ |

## 9. No-show
| Campo | Detalle |
|---|---|
| Definición | Citas reservadas que no se usaron |
| Fórmula | Citas no usadas ÷ citas reservadas × 100 |
| Unidad y frecuencia | % · por día |
| Meta | ≤ 10 % |
| Fuente del dato | `DATOS.citas_piloto` (`reservadas`, `usadas`) |
| Decisión que apoya | Sobre-reservar franjas o penalizar el no-show |

## 10. Camiones en la vía pública (KPI extra de la propuesta)
| Campo | Detalle |
|---|---|
| Definición | Camiones de la cola que no caben en la vía de acceso y ocupan la vía pública |
| Fórmula | máx(0; Lq − capacidad de la vía de acceso) — derivado de Lq y del supuesto de vía |
| Unidad y frecuencia | camiones · máximo del día |
| Meta | 0 |
| Fuente del dato | Lq |
| Decisión que apoya | Beneficio de la cola virtual con pre-estacionamiento |
