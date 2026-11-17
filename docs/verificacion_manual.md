# Verificación a mano de KPI

> El enunciado pide verificar **a mano al menos 3 KPI**. Abajo hay un ejemplo resuelto.
> Cada integrante verifica el suyo con calculadora y lo compara con lo que muestra el dashboard.

## Ejemplo resuelto · Día 2 (martes 08-09-2026, día de buque), hora 08:00–09:00

Datos de `data/llegadas.json` (día 2):

| Hora | λ (llegadas) | Servicio (min) | Carriles |
|---|---|---|---|
| 07:00 | 93 | 4,10 | 5 |
| 08:00 | 106 | 4,08 | 5 |

Cola al final de las 07:00 (del dashboard / script): **19,83 camiones**.

**1) Capacidad (μ·c) a las 08:00**
μ = 60 ÷ 4,08 = 14,706 camiones/h por carril → μ·c = 14,706 × 5 = **73,53 camiones/h**

**2) Utilización (ρ) a las 08:00**
ρ = λ ÷ (μ·c) = 106 ÷ 73,53 = 1,442 → **144,2 %** (≥ 100 %: la cola crece)

**3) Cola (Lq) al final de las 08:00**
Cola(08) = máx[0; 19,83 + 106 − 73,53] = **52,30 camiones** → supera la vía de acceso (40): hora con desborde.

**4) Espera (Wq) a las 08:00 — Ley de Little**
Wq = Lq ÷ λ = 52,30 ÷ 106 = 0,4934 h × 60 = **29,6 min**

| KPI | A mano | Dashboard | ¿Coincide? |
|---|---|---|---|
| μ·c | 73,53 | 73,53 | ✓ |
| ρ | 144,2 % | 144,2 % | ✓ |
| Lq | 52,30 | 52,30 | ✓ |
| Wq | 29,6 min | 29,6 min | ✓ |

**5) Cumplimiento y no-show del piloto, día 2**
Reservadas 717 · usadas 621 · dentro de franja 483
Cumplimiento = 483 ÷ 621 × 100 = **77,8 %** · No-show = (717 − 621) ÷ 717 × 100 = **13,4 %**

---

## Verificaciones del grupo
| # | KPI | Responsable | Día/hora | A mano | Dashboard | ¿Coincide? |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
