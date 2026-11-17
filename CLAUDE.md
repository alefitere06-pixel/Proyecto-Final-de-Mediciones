# Instrucciones para el agente de IA (Claude Code / Codex)

Proyecto semestral UMIP · Medición y Rendimiento de Terminales Portuarias.
**Idea 1 · Cola para entrar a la garita de Balboa.**

## El problema
En horas pico se forma una cola de camiones para entrar a la garita de la terminal de Balboa.
Causa de diseño: no existe una vía de espera fuera de la terminal que no afecte el tránsito del
Puente de las Américas. Cuando la cola supera lo que cabe en la vía de acceso, los camiones ocupan
la vía pública. El dashboard simula llegadas y cola durante el día, mide tiempos de espera y evalúa
nuestra propuesta **"Gate Inteligente: 3 palancas"**:
1. **TAS dinámico**: capacidad por franja = carriles abiertos × μ × 0,85 (meta de ρ).
2. **Cola virtual**: pre-estacionamiento fuera de la vía + llamada por app → menos camiones en vía pública.
3. **Doble transacción**: incentivo para entregar export y retirar import en la misma visita → menos llegadas.

## Reglas
- Todo en **español** (textos, comentarios, nombres de variables cuando sea razonable).
- **Un solo `index.html`** que abre con doble clic, sin servidor y sin instalar nada.
  Por eso los datos se leen desde `data/llegadas.js` (no usar `fetch`).
- **No inventar fórmulas.** Usar solo las del curso, ya implementadas en `js/kpi.js`.
  Si una fórmula nueva hace falta, primero proponerla y esperar aprobación del grupo.
- No editar `data/llegadas.js` a mano: se genera con `python data/generar_datos.py` (semilla fija).
- Cada módulo vive en su archivo `js/modulos/<modulo>.js` y se registra con `MODULOS.push({...})`.
- Gráficos con Chart.js (`js/lib/chart.umd.js`, v4.4.1 local) usando `crearGrafico(idCanvas, config)`.
- Cada KPI muestra su **meta** y una alerta visual si no se cumple.
- Siempre mostrar en pantalla que los datos son **simulados**.
- Nunca poner claves, contraseñas ni tokens en el repositorio.
- Primero proponer un **plan**, después el código. Cambios pequeños, un módulo a la vez.

## KPI y fórmulas (ver docs/fichas_kpi.md)
| KPI | Fórmula | Unidad | Meta |
|---|---|---|---|
| Llegadas por hora (λ) | camiones que llegan a la garita en cada hora | camiones/h | — |
| Capacidad (μ·c) | (60 ÷ tiempo de servicio) × carriles abiertos | camiones/h | — |
| Utilización (ρ) | λ ÷ (μ·c) | % | ≤ 85 % en hora pico |
| Cola (Lq) | Cola(t+1) = máx[0; Cola(t) + λ(t) − μc] | camiones | ≤ 40 (vía de acceso) |
| Espera (Wq) | Ley de Little: Wq = Lq ÷ λ | min | ≤ 30 min |
| Truck Turn Time | espera + gate entrada + patio + gate salida | min | ≤ 90 min |
| Horas con desborde | horas con cola > capacidad de la vía de acceso | h/día | 0 |
| Cumplimiento de citas | dentro de franja ÷ camiones con cita × 100 | % | ≥ 85 % |
| No-show | citas no usadas ÷ citas reservadas × 100 | % | ≤ 10 % |
| Camiones en vía pública (extra) | máx(0; cola − capacidad vía) | camiones | 0 |

## Estructura
```
index.html              dashboard (pestañas + tarjetas KPI)
css/estilos.css
js/kpi.js               fórmulas (KPI.*, kpiDelDia, registrosDelDia)
js/app.js               pestañas, filtro de día, tarjetas, crearGrafico, avisoEnConstruccion
js/modulos/*.js         un archivo por módulo (llegadas, simulador, ttt, citas, mejora)
js/lib/chart.umd.js     Chart.js 4.4.1
data/generar_datos.py   genera data/llegadas.js y data/llegadas.json
docs/fichas_kpi.md      ficha de cada KPI
docs/bitacora_ia.md     prompts importantes y decisiones
docs/verificacion_manual.md  3 KPI verificados a mano
presentacion/           diapositivas en PDF
```
