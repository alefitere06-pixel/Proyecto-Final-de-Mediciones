// =============================================================================
// ilustraciones.js · Dibujos SVG propios (sin fotos ni imágenes externas)
//   svgCamion()        camión con contenedores (estilo A)
//   svgDiagramaGarita()diagrama técnico de la garita con etiquetas y alarma (estilo B)
//   svgPuerto()        puerto con buque, grúa y contenedores (estilo C)
//   svgMedidor()       medidor semicircular para KPI
// =============================================================================

// Medidor semicircular: valor en un rango [0, max], con marca de meta
function svgMedidor({ valor, max, meta, color: col, fondo = "#e6e8ec", texto, sub, marcas = false, grosor = 14 }) {
  const r = 70, cx = 90, cy = 90;
  const ang = (v) => Math.PI * (1 - Math.min(Math.max(v / max, 0), 1));
  const punto = (v, rr = r) => [cx + rr * Math.cos(ang(v)), cy - rr * Math.sin(ang(v))];
  const arco = (v) => {
    const [x, y] = punto(v);
    return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
  };
  let ticks = "";
  if (marcas) {
    for (let i = 0; i <= 5; i++) {
      const v = (max / 5) * i;
      const [x1, y1] = punto(v, r + 10), [x2, y2] = punto(v, r + 15);
      const [tx, ty] = punto(v, r + 25);
      ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#9aa3a0" stroke-width="1"/>
        <text x="${tx}" y="${ty + 3}" font-size="8" text-anchor="middle" fill="#7d8784">${Math.round(v)}</text>`;
    }
  }
  const [mx1, my1] = punto(meta, r - grosor / 2 - 3), [mx2, my2] = punto(meta, r + grosor / 2 + 3);
  return `<svg viewBox="-12 -14 204 120" class="medidor" role="img" aria-label="${texto}">
    ${ticks}
    <path d="${arco(max)}" fill="none" stroke="${fondo}" stroke-width="${grosor}" stroke-linecap="round"/>
    <path d="${arco(valor)}" fill="none" stroke="${col}" stroke-width="${grosor}" stroke-linecap="round"/>
    <line x1="${mx1}" y1="${my1}" x2="${mx2}" y2="${my2}" stroke="#222" stroke-width="2"/>
    <text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="26" font-weight="700" fill="currentColor">${texto}</text>
    <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="9" fill="#7d8784">${sub}</text>
  </svg>`;
}

// Camión de perfil con remolque de contenedores. `lleno` (0–1) colorea cajas.
function svgCamion(lleno = 0.6) {
  let cajas = "";
  const cols = 7, filas = 4, n = Math.round(cols * filas * Math.min(Math.max(lleno, 0.1), 1));
  for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) {
    const i = f * cols + c;
    const activo = (filas - 1 - f) * cols + c < n;
    cajas += `<rect x="${262 + c * 49}" y="${52 + f * 38}" width="45" height="34" rx="3"
      fill="${activo ? "#c9b6ff" : "#eceaf3"}" stroke="${activo ? "#a990f5" : "#dcd9e6"}"/>`;
  }
  return `<svg viewBox="0 0 640 320" class="hero-svg" role="img" aria-label="Camión de contenedores">
    <defs>
      <linearGradient id="cab" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe1e6"/></linearGradient>
      <linearGradient id="trailer" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f7f7fa"/><stop offset="1" stop-color="#e2e3ea"/></linearGradient>
    </defs>
    <ellipse cx="330" cy="292" rx="300" ry="14" fill="#000" opacity=".10"/>
    <!-- remolque -->
    <rect x="252" y="40" width="360" height="170" rx="6" fill="url(#trailer)" stroke="#d3d5dd"/>
    ${cajas}
    <rect x="252" y="210" width="360" height="22" fill="#cfd2da"/>
    <rect x="560" y="232" width="40" height="14" fill="#b9bcc6"/>
    <!-- cabina -->
    <rect x="128" y="20" width="10" height="120" rx="4" fill="#c4c7cf"/>
    <rect x="144" y="12" width="10" height="130" rx="4" fill="#d6d8de"/>
    <path d="M64 250 L64 168 Q66 128 100 118 L150 108 Q158 62 196 58 L242 58 L244 250 Z" fill="url(#cab)" stroke="#c9ccd4"/>
    <path d="M106 126 L150 116 L150 166 L94 166 Q94 136 106 126 Z" fill="#9fb3c6" opacity=".75"/>
    <rect x="172" y="108" width="52" height="68" rx="4" fill="#e9ebef" stroke="#c9ccd4"/>
    <rect x="180" y="116" width="36" height="28" rx="3" fill="#9fb3c6" opacity=".6"/>
    <rect x="62" y="196" width="34" height="44" rx="4" fill="#e1e3e8" stroke="#c9ccd4"/>
    <rect x="58" y="236" width="190" height="16" rx="5" fill="#cfd2d9"/>
    <!-- ruedas -->
    ${[118, 212, 420, 478, 536].map((x) => `
      <circle cx="${x}" cy="258" r="30" fill="#2b2d33"/><circle cx="${x}" cy="258" r="15" fill="#c9ccd3"/>
      <circle cx="${x}" cy="258" r="5" fill="#8a8e98"/>`).join("")}
  </svg>`;
}

// Diagrama técnico de la garita (vista lateral) con etiquetas tipo "plano"
function svgDiagramaGarita(info) {
  const { carrilesAbiertos = 5, carrilesInstalados = 6, colaMax = 0, capVia = 40, enViaPublica = 0, horaCritica = "—", servicio = 4 } = info;
  const desborde = enViaPublica > 0;
  // camiones en la vía de acceso y en la pública (1 dibujo ≈ 5 camiones)
  const enAcceso = Math.min(8, Math.round(Math.min(colaMax, capVia) / 5));
  const enPublica = Math.min(9, Math.round(enViaPublica / 5));
  const camion = (x, y, rojo) => `<g transform="translate(${x},${y})" stroke="${rojo ? "#e0533c" : "#55625e"}" fill="${rojo ? "#f7c8bd" : "#f4f6f5"}" stroke-width="1.2">
      <rect x="0" y="0" width="22" height="12" rx="1.5"/><rect x="23" y="3" width="7" height="9" rx="1.5"/>
      <circle cx="6" cy="14" r="2.5" fill="#55625e"/><circle cx="25" cy="14" r="2.5" fill="#55625e"/></g>`;
  let camiones = "";
  for (let i = 0; i < enAcceso; i++) camiones += camion(668 - i * 31, 262, false);
  for (let i = 0; i < enPublica; i++) camiones += camion(400 - i * 31, 262, true);
  const lanes = Array.from({ length: carrilesInstalados }, (_, i) => {
    const abierto = i < carrilesAbiertos;
    return `<rect x="${708 + i * 13}" y="232" width="9" height="42" rx="1.5" fill="${abierto ? "#cfe5e4" : "#e9ecea"}" stroke="${abierto ? "#2c7c83" : "#a7b0ad"}"/>
      <circle cx="${712.5 + i * 13}" cy="226" r="2.5" fill="${abierto ? "#3f9b6f" : "#e0533c"}"/>`;
  }).join("");
  const etiqueta = (x, y, tx, ty, texto, ancla = "middle") => `
    <line x1="${x}" y1="${y}" x2="${tx}" y2="${ty + 4}" stroke="#55625e" stroke-width=".8"/>
    <circle cx="${x}" cy="${y}" r="2.2" fill="#55625e"/>
    <text x="${tx}" y="${ty}" text-anchor="${ancla}" font-size="11" fill="#2f3b37">${texto}</text>`;
  return `<svg viewBox="0 0 900 400" class="hero-svg diagrama" role="img" aria-label="Diagrama técnico de la garita de Balboa">
    <defs>
      <pattern id="rejilla" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0 L0 0 0 20" fill="none" stroke="#cfd8d3" stroke-width=".5"/></pattern>
    </defs>
    <rect x="0" y="0" width="900" height="400" fill="url(#rejilla)" opacity=".6"/>
    <!-- Puente de las Américas -->
    <path d="M20 280 Q 130 110 240 280" fill="none" stroke="#7d8a85" stroke-width="3"/>
    <line x1="10" y1="226" x2="250" y2="226" stroke="#7d8a85" stroke-width="4"/>
    ${[50, 80, 110, 140, 170, 200].map((x) => `<line x1="${x}" y1="226" x2="${x}" y2="${280 - Math.max(0, 170 - Math.abs(130 - x) * 1.6) * 0.95}" stroke="#a3aeaa" stroke-width="1"/>`).join("")}
    <!-- vías -->
    <rect x="250" y="276" width="440" height="22" fill="${desborde ? "#f6cfc6" : "#e3e8e5"}"/>
    <rect x="${250 + 440 * 0.45}" y="276" width="${440 * 0.55}" height="22" fill="#d6dcd9"/>
    <line x1="250" y1="287" x2="690" y2="287" stroke="#fff" stroke-width="1.5" stroke-dasharray="10 8"/>
    <line x1="10" y1="300" x2="890" y2="300" stroke="#7d8a85" stroke-width="1.5"/>
    ${desborde ? `<rect x="250" y="270" width="${440 * 0.45}" height="34" fill="#e0533c" opacity=".18" rx="3"/>` : ""}
    ${camiones}
    <!-- garita: techo, columnas y carriles -->
    <rect x="696" y="196" width="${carrilesInstalados * 13 + 20}" height="10" rx="2" fill="#dfe6e3" stroke="#55625e"/>
    <line x1="700" y1="206" x2="700" y2="300" stroke="#55625e"/><line x1="${700 + carrilesInstalados * 13 + 12}" y1="206" x2="${700 + carrilesInstalados * 13 + 12}" y2="300" stroke="#55625e"/>
    ${lanes}
    <!-- terminal y grúa pórtico -->
    <rect x="800" y="210" width="84" height="90" fill="#eef2f0" stroke="#55625e"/>
    ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${808 + c * 25}" y="${222 + r * 24}" width="20" height="18" fill="${(r + c) % 2 ? "#cfe5e4" : "#f2d4c4"}" stroke="#55625e" stroke-width=".6"/>`).join("")).join("")}
    <path d="M812 210 L812 110 L872 110 L872 210 M812 130 L872 130 M792 110 L890 110" fill="none" stroke="#55625e" stroke-width="2"/>
    <!-- etiquetas -->
    ${etiqueta(130, 226, 130, 60, "Puente de las Américas")}
    ${etiqueta(300, 287, 300, 120, desborde ? "Vía pública · cola desbordada" : "Vía pública")}
    ${etiqueta(560, 287, 560, 80, `Vía de acceso · ${capVia} camiones`)}
    ${etiqueta(712, 230, 650, 150, `Carriles abiertos · ${carrilesAbiertos} de ${carrilesInstalados}`)}
    ${etiqueta(706 + carrilesInstalados * 13, 220, 770, 60, `Cabinas de garita · servicio ${servicio} min`, "end")}
    ${etiqueta(842, 160, 842, 40, "Terminal de Balboa")}
    ${desborde ? `
      <line x1="330" y1="304" x2="330" y2="330" stroke="#e0533c" stroke-width="1.2"/>
      <rect x="250" y="330" width="440" height="56" rx="6" fill="#fdebe7" stroke="#e0533c"/>
      <circle cx="272" cy="358" r="11" fill="#e0533c"/><text x="272" y="362" text-anchor="middle" font-size="12" fill="#fff" font-weight="700">!</text>
      <text x="292" y="352" font-size="12" font-weight="700" fill="#e0533c">DESBORDE</text>
      <text x="292" y="370" font-size="11" fill="#e0533c">${Math.round(enViaPublica)} camiones en la vía pública (${horaCritica}): la cola supera la vía de acceso.</text>`
    : `<rect x="250" y="330" width="300" height="40" rx="6" fill="#e6f4ec" stroke="#3f9b6f"/>
      <text x="270" y="355" font-size="12" fill="#2f7a55" font-weight="600">Sin desborde: la cola cabe en la vía de acceso.</text>`}
  </svg>`;
}

// Puerto: buque portacontenedores, grúa pórtico y patio
function svgPuerto() {
  const colores = ["#f28c28", "#f7c04a", "#3d4a5c", "#9aa6b2", "#e76f51", "#2a9d8f"];
  let pilaBuque = "";
  for (let c = 0; c < 9; c++) for (let f = 0; f < 3 + (c % 3 === 1 ? 1 : 0); f++) {
    pilaBuque += `<rect x="${300 + c * 30}" y="${262 - f * 18}" width="28" height="16" fill="${colores[(c * 3 + f) % colores.length]}" stroke="#fff" stroke-width=".8"/>`;
  }
  let patio = "";
  for (let c = 0; c < 6; c++) for (let f = 0; f < 2 + (c % 2); f++) {
    patio += `<rect x="${30 + c * 34}" y="${318 - f * 20}" width="32" height="18" fill="${colores[(c + f * 2) % colores.length]}" stroke="#fff" stroke-width=".8"/>`;
  }
  return `<svg viewBox="0 0 600 400" class="hero-svg" role="img" aria-label="Puerto con buque y grúa">
    <defs>
      <linearGradient id="cielo" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fde7cf"/><stop offset="1" stop-color="#fff8f0"/></linearGradient>
      <linearGradient id="agua" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#9cc5d6"/><stop offset="1" stop-color="#6fa6bd"/></linearGradient>
    </defs>
    <rect width="600" height="400" rx="18" fill="url(#cielo)"/>
    <circle cx="500" cy="80" r="34" fill="#f7c04a" opacity=".85"/>
    <!-- puente al fondo -->
    <path d="M0 200 Q 120 120 240 200" fill="none" stroke="#c9b8a4" stroke-width="3"/>
    <line x1="0" y1="180" x2="250" y2="180" stroke="#c9b8a4" stroke-width="3"/>
    <rect y="290" width="600" height="110" fill="url(#agua)"/>
    <!-- buque -->
    <path d="M270 280 L590 280 L570 330 L290 330 Z" fill="#3d4a5c"/>
    <rect x="540" y="230" width="34" height="50" fill="#e9ecef" stroke="#3d4a5c"/>
    <rect x="546" y="238" width="22" height="8" fill="#9cc5d6"/>
    ${pilaBuque}
    <!-- muelle y patio -->
    <rect x="0" y="336" width="290" height="64" fill="#d9d4cc"/>
    ${patio}
    <!-- grúa pórtico -->
    <g stroke="#f28c28" stroke-width="7" fill="none" stroke-linecap="round">
      <path d="M232 336 L232 120 M282 336 L282 120 M232 190 L282 190 M232 120 L282 120"/>
      <path d="M200 120 L470 120"/>
    </g>
    <path d="M232 120 L262 70 L282 120" fill="none" stroke="#f28c28" stroke-width="4"/>
    <line x1="400" y1="120" x2="400" y2="210" stroke="#3d4a5c" stroke-width="2"/>
    <rect x="386" y="210" width="28" height="16" fill="#f28c28"/>
    <!-- camión -->
    <g transform="translate(70,350)"><rect width="70" height="20" fill="#2a9d8f"/><rect x="72" y="4" width="22" height="16" rx="3" fill="#3d4a5c"/>
      <circle cx="14" cy="24" r="6" fill="#222"/><circle cx="56" cy="24" r="6" fill="#222"/><circle cx="84" cy="24" r="6" fill="#222"/></g>
  </svg>`;
}
