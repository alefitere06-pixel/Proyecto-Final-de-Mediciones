"""
Generador de datos simulados · Cola en la garita de Balboa
===========================================================

Genera 30 días de llegadas de camiones por hora a la garita, con picos en la
mañana y en la tarde y más llegadas los días de buque. También genera un
piloto simulado de citas (TAS) para medir cumplimiento y no-show.

Uso (desde la carpeta del proyecto):
    python data/generar_datos.py

Salida:
    data/llegadas.json  -> datos en JSON (para revisar o usar en Python/Excel)
    data/llegadas.js    -> los mismos datos como `const DATOS = {...}` para que
                           index.html los lea con doble clic (sin servidor).

Reproducible: usa una semilla fija (SEMILLA). Si se ejecuta otra vez, se
obtienen exactamente los mismos datos. Solo usa la librería estándar.

TODOS LOS VALORES DE ABAJO SON SUPUESTOS DEL GRUPO. Cada uno se explica en el
README (sección "Supuestos"). Si cambian uno, actualicen el README.
"""

import json
import math
import random
from datetime import date, timedelta
from pathlib import Path

SEMILLA = 42
DIAS = 30
FECHA_INICIO = date(2026, 9, 7)  # lunes

# --- Horario -----------------------------------------------------------------
HORA_APERTURA = 5    # la garita abre a las 05:00
HORA_CIERRE = 22     # última hora de atención: 21:00-22:00
# Los camiones empiezan a llegar a las 04:00 (antes de abrir) y dejan de llegar
# a las 21:00. Los que llegan antes de abrir hacen cola desde temprano.
HORAS_LLEGADA = range(4, 21)

# --- Perfil de llegadas (camiones/hora en un día normal sin buque) -----------
# Dos picos: mañana (07-10) y tarde (15-18). Suma ~ 900 camiones/día.
PERFIL_BASE = {
    4: 20, 5: 35, 6: 55, 7: 75, 8: 85, 9: 82, 10: 70, 11: 58,
    12: 45, 13: 50, 14: 60, 15: 72, 16: 80, 17: 74, 18: 55, 19: 35, 20: 20,
}

# Factor por día de la semana (0 = lunes ... 6 = domingo)
FACTOR_DIA_SEMANA = {0: 1.05, 1: 1.00, 2: 1.00, 3: 1.00, 4: 1.08, 5: 0.75, 6: 0.45}

# Días de buque: martes, jueves y sábado tienen escala grande; además 15 % de
# probabilidad de escala extra cualquier otro día.
DIAS_BUQUE_FIJOS = {1, 3, 5}
PROB_BUQUE_EXTRA = 0.15
FACTOR_BUQUE = 1.20           # +20 % de llegadas el día de buque

# Mezcla de transacciones (importación, exportación, vacío)
MEZCLA_TRANSACCION = {"importacion": 0.45, "exportacion": 0.35, "vacio": 0.20}

# --- Garita ------------------------------------------------------------------
CARRILES_INSTALADOS = 6
CARRILES_ABIERTOS_NORMAL = 5   # lo que la terminal abre hoy en un día típico
SERVICIO_MIN_RANGO = (2.0, 6.0)  # minutos por camión en un carril (enunciado)
SERVICIO_MIN_MEDIO = 4.0

# --- Otros tiempos del TTT (minutos) -----------------------------------------
PATIO_MIN_MEDIO = 35          # tiempo dentro del patio (cargar/descargar)
PATIO_MIN_BUQUE_EXTRA = 10    # el patio está más congestionado con buque
GATE_SALIDA_MIN = 3.0

# --- Vía de acceso -----------------------------------------------------------
# Camiones que caben en la vía de acceso sin ocupar la vía pública
# (supuesto: ~ 700 m de vía útil / ~ 18 m por camión con separación).
CAPACIDAD_VIA_CAMIONES = 40

# --- Piloto de citas (TAS) simulado ------------------------------------------
PCT_CON_CITA = 0.60           # % de camiones que reservan cita
PUNTUALIDAD = 0.80            # % de los que llegan dentro de su franja
NO_SHOW = 0.12                # % de citas reservadas que no se usan


def poisson(rng, lam):
    """Número aleatorio con distribución de Poisson (método de Knuth)."""
    if lam <= 0:
        return 0
    limite = math.exp(-lam)
    k, p = 0, 1.0
    while True:
        p *= rng.random()
        if p <= limite:
            return k
        k += 1


def repartir(rng, total, mezcla):
    """Reparte `total` camiones entre los tipos de transacción."""
    tipos = list(mezcla)
    conteo = {t: 0 for t in tipos}
    for _ in range(total):
        r, acum = rng.random(), 0.0
        for t in tipos:
            acum += mezcla[t]
            if r <= acum:
                conteo[t] += 1
                break
        else:
            conteo[tipos[-1]] += 1
    return conteo


def generar():
    rng = random.Random(SEMILLA)
    horas = []
    dias = []
    citas = []
    nombres_dia = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]

    for d in range(DIAS):
        fecha = FECHA_INICIO + timedelta(days=d)
        dsem = fecha.weekday()
        buque = dsem in DIAS_BUQUE_FIJOS or rng.random() < PROB_BUQUE_EXTRA
        factor = FACTOR_DIA_SEMANA[dsem] * (FACTOR_BUQUE if buque else 1.0)
        # Ruido diario: algunos días son un poco más cargados que otros
        factor *= rng.uniform(0.92, 1.08)

        total_dia = 0
        for h in range(24):
            lam = PERFIL_BASE.get(h, 0) * factor if h in HORAS_LLEGADA else 0
            llegadas = poisson(rng, lam)
            total_dia += llegadas
            abierta = HORA_APERTURA <= h < HORA_CIERRE
            servicio = min(max(rng.gauss(SERVICIO_MIN_MEDIO, 0.4), SERVICIO_MIN_RANGO[0]),
                           SERVICIO_MIN_RANGO[1])
            patio = PATIO_MIN_MEDIO + (PATIO_MIN_BUQUE_EXTRA if buque else 0) + rng.uniform(-5, 5)
            horas.append({
                "dia": d + 1,
                "fecha": fecha.isoformat(),
                "dia_semana": nombres_dia[dsem],
                "dia_buque": buque,
                "hora": h,
                "llegadas": llegadas,
                **repartir(rng, llegadas, MEZCLA_TRANSACCION),
                "garita_abierta": abierta,
                "carriles_abiertos": CARRILES_ABIERTOS_NORMAL if abierta else 0,
                "servicio_min": round(servicio, 2),
                "patio_min": round(patio, 1),
                "gate_salida_min": GATE_SALIDA_MIN,
            })

        dias.append({"dia": d + 1, "fecha": fecha.isoformat(),
                     "dia_semana": nombres_dia[dsem], "dia_buque": buque,
                     "llegadas": total_dia})

        # Piloto TAS: citas reservadas, usadas y dentro de franja
        reservadas = round(total_dia * PCT_CON_CITA)
        no_usadas = sum(1 for _ in range(reservadas) if rng.random() < NO_SHOW)
        usadas = reservadas - no_usadas
        dentro = sum(1 for _ in range(usadas) if rng.random() < PUNTUALIDAD)
        citas.append({"dia": d + 1, "fecha": fecha.isoformat(), "reservadas": reservadas,
                      "usadas": usadas, "dentro_franja": dentro})

    supuestos = {
        "semilla": SEMILLA,
        "hora_apertura": HORA_APERTURA,
        "hora_cierre": HORA_CIERRE,
        "carriles_instalados": CARRILES_INSTALADOS,
        "carriles_abiertos_normal": CARRILES_ABIERTOS_NORMAL,
        "servicio_min_rango": list(SERVICIO_MIN_RANGO),
        "servicio_min_medio": SERVICIO_MIN_MEDIO,
        "capacidad_via_camiones": CAPACIDAD_VIA_CAMIONES,
        "factor_buque": FACTOR_BUQUE,
        "mezcla_transaccion": MEZCLA_TRANSACCION,
        "pct_con_cita": PCT_CON_CITA,
        "puntualidad": PUNTUALIDAD,
        "no_show": NO_SHOW,
        "gate_salida_min": GATE_SALIDA_MIN,
    }
    return {"supuestos": supuestos, "horas": horas, "dias": dias, "citas_piloto": citas}


def main():
    carpeta = Path(__file__).resolve().parent
    datos = generar()
    texto = json.dumps(datos, ensure_ascii=False, indent=1)
    (carpeta / "llegadas.json").write_text(texto + "\n", encoding="utf-8")
    (carpeta / "llegadas.js").write_text(
        "// Archivo generado por data/generar_datos.py — NO editar a mano.\n"
        "// DATOS SIMULADOS (semilla fija). Para cambiarlos, editen el script y vuelvan a ejecutarlo.\n"
        "const DATOS = " + texto + ";\n", encoding="utf-8")
    total = sum(d["llegadas"] for d in datos["dias"])
    print(f"OK: {len(datos['dias'])} días, {len(datos['horas'])} registros horarios, "
          f"{total} camiones en total ({total / DIAS:.0f} por día en promedio).")


if __name__ == "__main__":
    main()
