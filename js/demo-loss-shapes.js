// Section 8: Static loss-function shape canvas (L2, L1, Huber)
// Requires: utils.js (setupCanvas)

(function () {
  const cv = document.getElementById('lossCanvas');
  if (!cv) return;
  const ctx = setupCanvas(cv);

  const CW = 820, CH = 260;
  const PAD = {l: 54, r: 24, t: 28, b: 48};
  const PW  = CW - PAD.l - PAD.r;
  const PH  = CH - PAD.t - PAD.b;

  const eMin = -5, eMax = 5, lMin = 0, lMax = 12;
  const toX  = e => PAD.l + (e - eMin) / (eMax - eMin) * PW;
  const toY  = l => PAD.t + PH - (l - lMin) / (lMax - lMin) * PH;
  const DELTA = 2;

  const lossL2    = e => e * e;
  const lossL1    = e => Math.abs(e);
  const lossHuber = e => {
    const ae = Math.abs(e);
    return ae <= DELTA ? 0.5 * e * e : DELTA * ae - 0.5 * DELTA * DELTA;
  };

  // Grid
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
  [0, 3, 6, 9, 12].forEach(l => {
    const y = toY(l);
    ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + PW, y); ctx.stroke();
    ctx.fillStyle = '#9ca3af'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(l, PAD.l - 6, y + 4);
  });
  [-4, -2, 0, 2, 4].forEach(e => {
    const x = toX(e);
    ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, PAD.t + PH); ctx.stroke();
    ctx.fillStyle = '#9ca3af'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(e, x, PAD.t + PH + 18);
  });

  // Huber δ threshold markers
  [-DELTA, DELTA].forEach(e => {
    const x = toX(e);
    ctx.setLineDash([4, 3]); ctx.strokeStyle = '#059669'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x, PAD.t + 16); ctx.lineTo(x, PAD.t + PH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#059669'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('δ = ' + (e > 0 ? '+' : '') + e, x, PAD.t + 12);
  });

  // Loss curves
  const CURVES = [
    {fn: lossL2,    color: '#2563eb', label: 'L2: e²',  ex: 3.7},
    {fn: lossL1,    color: '#d97706', label: 'L1: |e|', ex: 4.3},
    {fn: lossHuber, color: '#059669', label: 'Huber',   ex: 3.0}
  ];

  CURVES.forEach(({fn, color, label, ex}) => {
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash([]);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= 500; i++) {
      const e = eMin + (i / 500) * (eMax - eMin);
      const l = fn(e);
      if (l > lMax) { started = false; continue; }
      const px = toX(e), py = toY(l);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    const lv = fn(ex);
    if (lv <= lMax) {
      ctx.fillStyle = color; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(label, toX(ex) + 5, toY(lv) - 4);
    }
  });

  // Axes
  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(PAD.l, PAD.t + PH); ctx.lineTo(PAD.l + PW, PAD.t + PH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PAD.l, PAD.t); ctx.lineTo(PAD.l, PAD.t + PH + 4); ctx.stroke();

  ctx.fillStyle = '#64748b'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Residual  e = Y − Ŷ', PAD.l + PW / 2, PAD.t + PH + 38);
  ctx.save(); ctx.translate(16, PAD.t + PH / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText('Loss ρ(e)', 0, 0); ctx.restore();
})();
