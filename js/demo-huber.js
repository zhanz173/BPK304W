// Section 8: OLS vs Huber interactive demo
// Requires: utils.js (setupCanvas)

(function () {
  const cv = document.getElementById('robustCanvas');
  if (!cv) return;
  const ctx = setupCanvas(cv);

  const CW = 820, CH = 380;
  const PAD = {l: 60, r: 24, t: 36, b: 60};
  const PW  = CW - PAD.l - PAD.r;
  const PH  = CH - PAD.t - PAD.b;

  // Dataset: weekly aerobic training (h/week) vs VO₂max improvement (mL/kg/min)
  const CLEAN_X = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const CLEAN_Y = [1.5, 2.8, 4.2, 5.5, 6.8, 8.1, 9.3, 10.6, 11.8, 13.1];
  const OUT_X   = 12;  // subject 12 — equipment malfunction

  const xMin = 0, xMax = 14, yMin = -12, yMax = 18;
  const toX  = v => PAD.l + (v - xMin) / (xMax - xMin) * PW;
  const toY  = v => PAD.t + PH - (v - yMin) / (yMax - yMin) * PH;

  // ── Weighted Least Squares (arrays) ──────────────────────────────────────
  function wls(xs, ys, ws) {
    const sw  = ws.reduce((s, v) => s + v, 0);
    const wmX = ws.reduce((s, v, i) => s + v * xs[i], 0) / sw;
    const wmY = ws.reduce((s, v, i) => s + v * ys[i], 0) / sw;
    const wxx = ws.reduce((s, v, i) => s + v * (xs[i] - wmX) ** 2, 0);
    const wxy = ws.reduce((s, v, i) => s + v * (xs[i] - wmX) * (ys[i] - wmY), 0);
    const b1  = wxx > 1e-10 ? wxy / wxx : 0;
    return {b0: wmY - b1 * wmX, b1};
  }

  function fitOLS(xs, ys)  { return wls(xs, ys, xs.map(() => 1)); }

  // IRLS Huber regression (MAD scale estimate, δ = 1.345)
  function fitHuber(xs, ys) {
    const delta = 1.345;
    let {b0, b1} = fitOLS(xs, ys);
    for (let iter = 0; iter < 40; iter++) {
      const res    = xs.map((xi, i) => ys[i] - (b0 + b1 * xi));
      const sorted = res.map(Math.abs).slice().sort((a, b) => a - b);
      const s      = Math.max(sorted[Math.floor(xs.length / 2)] / 0.6745, 0.001);
      const weights = res.map(e => { const u = Math.abs(e / s); return u <= delta ? 1 : delta / u; });
      const prev   = {b0, b1};
      ({b0, b1}    = wls(xs, ys, weights));
      if (Math.abs(b0 - prev.b0) < 1e-9 && Math.abs(b1 - prev.b1) < 1e-9) break;
    }
    return {b0, b1};
  }

  function getHuberWeights(xs, ys, b0, b1) {
    const delta  = 1.345;
    const res    = xs.map((xi, i) => ys[i] - (b0 + b1 * xi));
    const sorted = res.map(Math.abs).slice().sort((a, b) => a - b);
    const s      = Math.max(sorted[Math.floor(xs.length / 2)] / 0.6745, 0.001);
    return res.map(e => { const u = Math.abs(e / s); return u <= delta ? 1 : delta / u; });
  }

  function calcR2(xs, ys, b0, b1) {
    const mY  = ys.reduce((s, v) => s + v, 0) / ys.length;
    const sse = xs.reduce((s, xi, i) => s + (ys[i] - (b0 + b1 * xi)) ** 2, 0);
    const sst = ys.reduce((s, yi)    => s + (yi - mY) ** 2, 0);
    return sst > 0 ? Math.max(0, 1 - sse / sst) : 0;
  }

  function calcRobustR2(xs, ys, b0, b1, ws) {
    const sw   = ws.reduce((s, v) => s + v, 0);
    const wmY  = ws.reduce((s, v, i) => s + v * ys[i], 0) / sw;
    const wsse = ws.reduce((s, v, i) => s + v * (ys[i] - (b0 + b1 * xs[i])) ** 2, 0);
    const wsst = ws.reduce((s, v, i) => s + v * (ys[i] - wmY) ** 2, 0);
    return wsst > 0 ? Math.max(0, 1 - wsse / wsst) : 0;
  }

  // ── Drawing helpers ───────────────────────────────────────────────────────
  function drawRegLine(b0, b1, color, dash) {
    ctx.strokeStyle = color; ctx.lineWidth = 2.8;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    ctx.moveTo(toX(xMin), toY(b0 + b1 * xMin));
    ctx.lineTo(toX(xMax), toY(b0 + b1 * xMax));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function labelAtRightEdge(b0, b1, color, text, offsetY) {
    const ey = Math.max(PAD.t + 10, Math.min(PAD.t + PH - 10, toY(b0 + b1 * xMax) + (offsetY || 0)));
    ctx.fillStyle = color; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(text, toX(xMax) - 5, ey);
  }

  // ── Main render ───────────────────────────────────────────────────────────
  function render(severity) {
    const outY  = 15.0 - severity * 2.5;
    const allX  = [...CLEAN_X, OUT_X];
    const allY  = [...CLEAN_Y, outY];

    const ols   = fitOLS(allX, allY);
    const hub   = fitHuber(allX, allY);
    const ws    = getHuberWeights(allX, allY, hub.b0, hub.b1);
    const outW  = ws[ws.length - 1];
    const r2Ols = calcR2(allX, allY, ols.b0, ols.b1);
    const r2Rob = calcRobustR2(allX, allY, hub.b0, hub.b1, ws);

    ctx.clearRect(0, 0, CW, CH);

    // Grid
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
    [-10, -5, 0, 5, 10, 15].forEach(v => {
      const y = toY(v);
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + PW, y); ctx.stroke();
      ctx.fillStyle = '#9ca3af'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(v, PAD.l - 7, y + 4);
    });
    [2, 4, 6, 8, 10, 12].forEach(v => {
      const x = toX(v);
      ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, PAD.t + PH); ctx.stroke();
      ctx.fillStyle = '#9ca3af'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(v, x, PAD.t + PH + 18);
    });

    // y = 0 reference
    ctx.setLineDash([4, 3]); ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD.l, toY(0)); ctx.lineTo(PAD.l + PW, toY(0)); ctx.stroke();
    ctx.setLineDash([]);

    // Axes
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PAD.l, PAD.t);       ctx.lineTo(PAD.l, PAD.t + PH + 4);  ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD.l - 4, PAD.t + PH); ctx.lineTo(PAD.l + PW, PAD.t + PH); ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#64748b'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Weekly aerobic training (hours/week)', PAD.l + PW / 2, PAD.t + PH + 46);
    ctx.save(); ctx.translate(18, PAD.t + PH / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('VO₂max improvement (mL/kg/min)', 0, 0); ctx.restore();

    // Regression lines
    drawRegLine(ols.b0, ols.b1, '#2563eb', [8, 5]);  // OLS dashed
    drawRegLine(hub.b0, hub.b1, '#059669');            // Huber solid

    // Clean data points
    CLEAN_X.forEach((xi, i) => {
      const px = toX(xi), py = toY(CLEAN_Y[i]);
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.stroke();
    });

    // Outlier (larger, red)
    const opx = toX(OUT_X), opy = toY(outY);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath(); ctx.arc(opx, opy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(opx, opy, 9, 0, Math.PI * 2); ctx.stroke();

    // Weight annotation
    const wPct   = Math.round(outW * 100);
    const annotY = opy < PAD.t + 50 ? opy + 22 : opy - 14;
    ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = '#dc2626'; ctx.textAlign = 'left';
    ctx.fillText('w₁₂ = ' + wPct + '%', opx + 13, annotY);

    // Line labels
    labelAtRightEdge(ols.b0, ols.b1, '#2563eb', 'OLS',   -8);
    labelAtRightEdge(hub.b0, hub.b1, '#059669', 'Huber', 12);

    // Stats readout
    const isDistorted = r2Rob - r2Ols > 0.05;
    document.getElementById('rob-stats').innerHTML =
      '<div class="stat"><strong>OLS:</strong> ŷ = '   + ols.b0.toFixed(2) + ' + ' + ols.b1.toFixed(3) + 'x</div>' +
      '<div class="stat"><strong>Huber:</strong> ŷ = ' + hub.b0.toFixed(2) + ' + ' + hub.b1.toFixed(3) + 'x</div>' +
      '<div class="stat ' + (isDistorted ? 'is-danger' : 'is-success') + '"><strong>OLS R²</strong> = ' + r2Ols.toFixed(3) + '</div>' +
      '<div class="stat is-success"><strong>Robust R²</strong> = ' + r2Rob.toFixed(3) + '</div>' +
      '<div class="stat">Outlier weight: <strong>' + wPct + '%</strong>' +
        (wPct < 25 ? ' — nearly ignored by Huber' : '') + '</div>';
  }

  const sevSlider = document.getElementById('rob_sev');
  const sevLabel  = document.getElementById('rob_sev_v');

  sevSlider.addEventListener('input', () => {
    sevLabel.textContent = parseFloat(sevSlider.value).toFixed(1);
    render(parseFloat(sevSlider.value));
  });
  document.getElementById('rob_reset').addEventListener('click', () => {
    sevSlider.value      = 0;
    sevLabel.textContent = '0.0';
    render(0);
  });

  render(0);
})();
