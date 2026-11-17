// =============================================================================
// ilustraciones.js · Dibujos SVG propios (sin fotos ni imágenes externas)
//   svgCamion()        camión con contenedores

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

