// ===== UTILITY FUNCTIONS =====
function gaussianPDF(x, mu, sigma) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

// t-distribution PDF using the beta function approximation
function tPDF(t, df) {
  return (gamma((df + 1) / 2) / (Math.sqrt(df * Math.PI) * gamma(df / 2))) *
         Math.pow(1 + t * t / df, -(df + 1) / 2);
}

// Log-gamma via Lanczos approximation
function logGamma(z) {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
function gamma(z) { return Math.exp(logGamma(z)); }

// Two-tailed p-value from t and df using numerical integration (Simpson's rule)
function tCDF(tVal, df) {
  // Compute P(T <= tVal) using integration from -inf to tVal
  // We integrate from -large to tVal
  const a = -40, b = tVal;
  const nSteps = 2000;
  const h = (b - a) / nSteps;
  let sum = tPDF(a, df) + tPDF(b, df);
  for (let i = 1; i < nSteps; i++) {
    const x = a + i * h;
    sum += tPDF(x, df) * (i % 2 === 0 ? 2 : 4);
  }
  return Math.max(0, Math.min(1, (h / 3) * sum));
}

function twoTailP(tVal, df) {
  const cdf = tCDF(Math.abs(tVal), df);
  return 2 * (1 - cdf);
}

const dpr = window.devicePixelRatio || 1;

function setupCanvas(canvas) {
  const w = canvas.getAttribute('width') | 0;
  const h = canvas.getAttribute('height') | 0;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}

// ===== ONE-SAMPLE T-TEST =====
(function() {
  const canvas = document.getElementById('oneSampleCanvas');
  const ctx = setupCanvas(canvas);
  const W = 820, H = 340;

  function draw() {
    const xbar = parseFloat(document.getElementById('os_mean').value);
    const s = parseFloat(document.getElementById('os_sd').value);
    const n = parseInt(document.getElementById('os_n').value);
    const mu0 = parseFloat(document.getElementById('os_mu').value);

    document.getElementById('os_mean_val').textContent = xbar.toFixed(1);
    document.getElementById('os_sd_val').textContent = s.toFixed(1);
    document.getElementById('os_n_val').textContent = n;
    document.getElementById('os_mu_val').textContent = mu0.toFixed(1);

    const se = s / Math.sqrt(n);
    const tVal = (xbar - mu0) / se;
    const df = n - 1;
    const pVal = twoTailP(tVal, df);

    ctx.clearRect(0, 0, W, H);

    // Draw t-distribution
    const plotL = 70, plotR = W - 30, plotT = 30, plotB = H - 60;
    const plotW = plotR - plotL, plotH = plotB - plotT;

    const tRange = 5;
    function tToX(t) { return plotL + (t + tRange) / (2 * tRange) * plotW; }
    function yToScreen(y, maxY) { return plotB - (y / maxY) * plotH; }

    // Compute max pdf
    let maxPdf = 0;
    for (let i = -tRange; i <= tRange; i += 0.01) {
      maxPdf = Math.max(maxPdf, tPDF(i, df));
    }
    maxPdf *= 1.15;

    // Shaded rejection regions (two-tailed)
    const abst = Math.abs(tVal);
    ctx.fillStyle = 'rgba(37, 99, 235, 0.15)';
    ctx.beginPath();
    ctx.moveTo(tToX(abst), plotB);
    for (let t = abst; t <= tRange; t += 0.02) {
      ctx.lineTo(tToX(t), yToScreen(tPDF(t, df), maxPdf));
    }
    ctx.lineTo(tToX(tRange), plotB);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(tToX(-tRange), plotB);
    for (let t = -tRange; t <= -abst; t += 0.02) {
      ctx.lineTo(tToX(t), yToScreen(tPDF(t, df), maxPdf));
    }
    ctx.lineTo(tToX(-abst), plotB);
    ctx.fill();

    // t-distribution curve
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let t = -tRange; t <= tRange; t += 0.02) {
      const x = tToX(t);
      const y = yToScreen(tPDF(t, df), maxPdf);
      t === -tRange ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Observed t line
    if (Math.abs(tVal) <= tRange) {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(tToX(tVal), plotB);
      ctx.lineTo(tToX(tVal), plotT);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#dc2626';
      ctx.font = '600 13px "Source Sans 3", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('t = ' + tVal.toFixed(2), tToX(tVal), plotT - 8);
    }

    // Axes
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotL, plotB);
    ctx.lineTo(plotR, plotB);
    ctx.stroke();

    ctx.fillStyle = '#666';
    ctx.font = '12px "Source Sans 3", sans-serif';
    ctx.textAlign = 'center';
    for (let t = -4; t <= 4; t++) {
      const x = tToX(t);
      ctx.beginPath();
      ctx.moveTo(x, plotB);
      ctx.lineTo(x, plotB + 5);
      ctx.stroke();
      ctx.fillText(t, x, plotB + 18);
    }
    ctx.fillText('t-value', plotL + plotW / 2, plotB + 40);

    // Label
    ctx.fillStyle = '#2563eb';
    ctx.font = '600 12px "Source Sans 3", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('t-distribution (df = ' + df + ')', plotL + 8, plotT + 16);

    ctx.fillStyle = 'rgba(37, 99, 235, 0.5)';
    ctx.font = '12px "Source Sans 3", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Shaded area = p-value', plotR - 8, plotT + 16);

    // Stats readout
    document.getElementById('os_stats').innerHTML =
      `<span class="stat">t = <strong>${tVal.toFixed(3)}</strong></span>` +
      `<span class="stat">df = <strong>${df}</strong></span>` +
      `<span class="stat">p = <strong>${pVal < 0.001 ? '< 0.001' : pVal.toFixed(4)}</strong></span>` +
      `<span class="stat">SE = <strong>${se.toFixed(3)}</strong></span>` +
      `<span class="stat ${pVal < 0.05 ? 'is-success' : 'is-danger'}">` +
      `${pVal < 0.05 ? '✓ Significant' : '✗ Not significant'} at α = 0.05</span>`;
  }

  ['os_mean', 'os_sd', 'os_n', 'os_mu'].forEach(id => {
    document.getElementById(id).addEventListener('input', draw);
  });
  draw();
})();


// ===== INDEPENDENT SAMPLES T-TEST =====
(function() {
  const canvas = document.getElementById('indCanvas');
  const ctx = setupCanvas(canvas);
  const W = 820, H = 360;

  function draw() {
    const m1 = parseFloat(document.getElementById('ind_m1').value);
    const s1 = parseFloat(document.getElementById('ind_s1').value);
    const n1 = parseInt(document.getElementById('ind_n1').value);
    const m2 = parseFloat(document.getElementById('ind_m2').value);
    const s2 = parseFloat(document.getElementById('ind_s2').value);
    const n2 = parseInt(document.getElementById('ind_n2').value);

    document.getElementById('ind_m1_val').textContent = m1.toFixed(1);
    document.getElementById('ind_s1_val').textContent = s1.toFixed(1);
    document.getElementById('ind_n1_val').textContent = n1;
    document.getElementById('ind_m2_val').textContent = m2.toFixed(1);
    document.getElementById('ind_s2_val').textContent = s2.toFixed(1);
    document.getElementById('ind_n2_val').textContent = n2;

    const se = Math.sqrt(s1*s1/n1 + s2*s2/n2);
    const tVal = (m1 - m2) / se;

    // Welch's df
    const v1 = s1*s1/n1, v2 = s2*s2/n2;
    const df = Math.floor((v1 + v2) * (v1 + v2) / (v1*v1/(n1-1) + v2*v2/(n2-1)));
    const pVal = twoTailP(tVal, df);

    // Cohen's d
    const sp = Math.sqrt(((n1-1)*s1*s1 + (n2-1)*s2*s2) / (n1+n2-2));
    const cohensD = Math.abs(m1 - m2) / sp;

    ctx.clearRect(0, 0, W, H);

    const plotL = 60, plotR = W - 30, plotT = 30, plotB = H - 60;
    const plotW = plotR - plotL, plotH = plotB - plotT;

    // Determine x range
    const lo = Math.min(m1 - 4*s1, m2 - 4*s2);
    const hi = Math.max(m1 + 4*s1, m2 + 4*s2);
    function valToX(v) { return plotL + (v - lo) / (hi - lo) * plotW; }

    // Max pdf
    let maxPdf = Math.max(gaussianPDF(m1, m1, s1), gaussianPDF(m2, m2, s2)) * 1.15;
    function yToScreen(y) { return plotB - (y / maxPdf) * plotH; }

    // Draw Group A distribution
    ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
    ctx.beginPath();
    ctx.moveTo(valToX(lo), plotB);
    for (let v = lo; v <= hi; v += (hi-lo)/400) {
      ctx.lineTo(valToX(v), yToScreen(gaussianPDF(v, m1, s1)));
    }
    ctx.lineTo(valToX(hi), plotB);
    ctx.fill();

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let v = lo; v <= hi; v += (hi-lo)/400) {
      const x = valToX(v), y = yToScreen(gaussianPDF(v, m1, s1));
      v === lo ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Group B distribution
    ctx.fillStyle = 'rgba(220, 38, 38, 0.12)';
    ctx.beginPath();
    ctx.moveTo(valToX(lo), plotB);
    for (let v = lo; v <= hi; v += (hi-lo)/400) {
      ctx.lineTo(valToX(v), yToScreen(gaussianPDF(v, m2, s2)));
    }
    ctx.lineTo(valToX(hi), plotB);
    ctx.fill();

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let v = lo; v <= hi; v += (hi-lo)/400) {
      const x = valToX(v), y = yToScreen(gaussianPDF(v, m2, s2));
      v === lo ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Mean markers
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#2563eb';
    ctx.beginPath(); ctx.moveTo(valToX(m1), plotB); ctx.lineTo(valToX(m1), plotT + 20); ctx.stroke();
    ctx.strokeStyle = '#dc2626';
    ctx.beginPath(); ctx.moveTo(valToX(m2), plotB); ctx.lineTo(valToX(m2), plotT + 20); ctx.stroke();
    ctx.setLineDash([]);

    // Axis
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotL, plotB); ctx.lineTo(plotR, plotB); ctx.stroke();

    const tickStep = Math.ceil((hi - lo) / 10);
    const startTick = Math.ceil(lo / tickStep) * tickStep;
    ctx.fillStyle = '#666';
    ctx.font = '12px "Source Sans 3", sans-serif';
    ctx.textAlign = 'center';
    for (let v = startTick; v <= hi; v += tickStep) {
      ctx.beginPath(); ctx.moveTo(valToX(v), plotB); ctx.lineTo(valToX(v), plotB + 5); ctx.stroke();
      ctx.fillText(v, valToX(v), plotB + 18);
    }
    ctx.fillText('Score', plotL + plotW/2, plotB + 42);

    // Legends
    ctx.font = '600 13px "Source Sans 3", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2563eb'; ctx.fillText('● Group A (x̄ = ' + m1.toFixed(1) + ')', plotL + 10, plotT + 16);
    ctx.fillStyle = '#dc2626'; ctx.fillText('● Group B (x̄ = ' + m2.toFixed(1) + ')', plotL + 10, plotT + 34);

    // Difference arrow
    if (Math.abs(m1 - m2) > 0.5) {
      const arrY = plotT + 50;
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(valToX(m1), arrY);
      ctx.lineTo(valToX(m2), arrY);
      ctx.stroke();
      // arrowhead
      const dir = m2 > m1 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(valToX(m2), arrY);
      ctx.lineTo(valToX(m2) - dir*8, arrY - 5);
      ctx.lineTo(valToX(m2) - dir*8, arrY + 5);
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.font = '12px "Source Sans 3", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Δ = ' + Math.abs(m1-m2).toFixed(1), (valToX(m1)+valToX(m2))/2, arrY - 8);
    }

    document.getElementById('ind_stats').innerHTML =
      `<span class="stat">t = <strong>${tVal.toFixed(3)}</strong></span>` +
      `<span class="stat">df ≈ <strong>${df}</strong></span>` +
      `<span class="stat">p = <strong>${pVal < 0.001 ? '< 0.001' : pVal.toFixed(4)}</strong></span>` +
      `<span class="stat">Cohen's d = <strong>${cohensD.toFixed(2)}</strong></span>` +
      `<span class="stat ${pVal < 0.05 ? 'is-success' : 'is-danger'}">` +
      `${pVal < 0.05 ? '✓ Significant' : '✗ Not significant'} at α = 0.05</span>`;
  }

  ['ind_m1','ind_s1','ind_n1','ind_m2','ind_s2','ind_n2'].forEach(id => {
    document.getElementById(id).addEventListener('input', draw);
  });
  draw();
})();


// ===== PAIRED SAMPLES T-TEST =====
(function() {
  const canvas = document.getElementById('pairedCanvas');
  const ctx = setupCanvas(canvas);
  const W = 820, H = 380;

  let data = [];

  function generateData() {
    const n = parseInt(document.getElementById('pr_n').value);
    const eff = parseFloat(document.getElementById('pr_effect').value);
    const sdWithin = parseFloat(document.getElementById('pr_sd').value);
    data = [];
    for (let i = 0; i < n; i++) {
      const baseMean = 65 + Math.random() * 20; // between-subject variability
      const before = baseMean + (Math.random() + Math.random() + Math.random() - 1.5) * 6;
      const after = before + eff + (Math.random() + Math.random() + Math.random() - 1.5) * sdWithin * 0.816;
      data.push({ before, after, diff: after - before });
    }
    drawPaired();
  }

  function drawPaired() {
    const n = data.length;
    if (n === 0) return;

    document.getElementById('pr_n_val').textContent = n;
    document.getElementById('pr_effect_val').textContent = parseFloat(document.getElementById('pr_effect').value).toFixed(1);
    document.getElementById('pr_sd_val').textContent = parseFloat(document.getElementById('pr_sd').value).toFixed(1);

    const diffs = data.map(d => d.diff);
    const meanD = diffs.reduce((a,b) => a+b, 0) / n;
    const sdD = Math.sqrt(diffs.reduce((a,b) => a + (b - meanD)**2, 0) / (n-1));
    const se = sdD / Math.sqrt(n);
    const tVal = se > 0 ? meanD / se : 0;
    const df = n - 1;
    const pVal = twoTailP(tVal, df);

    ctx.clearRect(0, 0, W, H);

    // LEFT PANEL: slope chart (before/after)
    const panelGap = 40;
    const leftW = (W - panelGap) * 0.5;
    const rightW = (W - panelGap) * 0.5;
    const plotT = 60, plotB = H - 50;

    const allVals = data.flatMap(d => [d.before, d.after]);
    const minV = Math.min(...allVals) - 5;
    const maxV = Math.max(...allVals) + 5;
    function valToY(v) { return plotB - (v - minV) / (maxV - minV) * (plotB - plotT); }

    const colBefore = 100, colAfter = leftW - 40;

    // Panel labels
    ctx.fillStyle = '#999';
    ctx.font = '600 12px "Source Sans 3", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Before', colBefore, plotT - 10);
    ctx.fillText('After', colAfter, plotT - 10);

    // Left panel title
    ctx.fillStyle = '#2563eb';
    ctx.font = '700 13px "Source Sans 3", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Paired Observations', 20, 28);

    // Draw lines & dots
    for (let i = 0; i < n; i++) {
      const d = data[i];
      const yB = valToY(d.before);
      const yA = valToY(d.after);
      const positive = d.after >= d.before;

      ctx.strokeStyle = positive ? 'rgba(5, 150, 105, 0.4)' : 'rgba(220, 38, 38, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(colBefore, yB); ctx.lineTo(colAfter, yA); ctx.stroke();

      ctx.fillStyle = '#2563eb';
      ctx.beginPath(); ctx.arc(colBefore, yB, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = positive ? '#059669' : '#dc2626';
      ctx.beginPath(); ctx.arc(colAfter, yA, 4, 0, Math.PI*2); ctx.fill();
    }

    // Y axis ticks (left panel)
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#999';
    ctx.font = '11px "Source Sans 3", sans-serif';
    ctx.textAlign = 'right';
    const tickStepV = Math.ceil((maxV - minV) / 8);
    const startV = Math.ceil(minV / tickStepV) * tickStepV;
    for (let v = startV; v <= maxV; v += tickStepV) {
      ctx.beginPath(); ctx.moveTo(50, valToY(v)); ctx.lineTo(leftW - 20, valToY(v)); ctx.stroke();
      ctx.fillText(Math.round(v), 46, valToY(v) + 4);
    }

    // RIGHT PANEL: difference bar chart
    const rStart = leftW + panelGap;
    const barAreaW = rightW - 60;
    const barW = Math.min(24, (barAreaW - n) / n);
    const barGap = (barAreaW - barW * n) / (n + 1);
    const zeroY = plotT + (plotB - plotT) / 2;

    const maxAbsDiff = Math.max(...diffs.map(Math.abs), 1);
    function diffToH(d) { return (d / maxAbsDiff) * (plotB - plotT) / 2 * 0.85; }

    // Zero line
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(rStart, zeroY); ctx.lineTo(rStart + barAreaW, zeroY); ctx.stroke();

    // Right panel title
    ctx.fillStyle = '#2563eb';
    ctx.font = '700 13px "Source Sans 3", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Difference Scores (After − Before)', rStart, 28);

    for (let i = 0; i < n; i++) {
      const d = diffs[i];
      const bx = rStart + barGap + i * (barW + barGap);
      const bh = diffToH(d);
      ctx.fillStyle = d >= 0 ? 'rgba(5, 150, 105, 0.65)' : 'rgba(220, 38, 38, 0.65)';
      if (d >= 0) {
        ctx.fillRect(bx, zeroY - bh, barW, bh);
      } else {
        ctx.fillRect(bx, zeroY, barW, -bh);
      }
    }

    // Mean difference line
    const meanH = diffToH(meanD);
    const meanLineY = zeroY - meanH;
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.beginPath(); ctx.moveTo(rStart, meanLineY); ctx.lineTo(rStart + barAreaW, meanLineY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#1a1a2e';
    ctx.font = '600 11px "Source Sans 3", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('d̄ = ' + meanD.toFixed(2), rStart + barAreaW + 4, meanLineY + 4);

    // Zero label
    ctx.fillStyle = '#999';
    ctx.font = '11px "Source Sans 3", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('0', rStart + barAreaW + 4, zeroY + 4);

    document.getElementById('pr_stats').innerHTML =
      `<span class="stat">Mean diff (d̄) = <strong>${meanD.toFixed(2)}</strong></span>` +
      `<span class="stat">SD of diffs = <strong>${sdD.toFixed(2)}</strong></span>` +
      `<span class="stat">t = <strong>${tVal.toFixed(3)}</strong></span>` +
      `<span class="stat">df = <strong>${df}</strong></span>` +
      `<span class="stat">p = <strong>${pVal < 0.001 ? '< 0.001' : pVal.toFixed(4)}</strong></span>` +
      `<span class="stat ${pVal < 0.05 ? 'is-success' : 'is-danger'}">` +
      `${pVal < 0.05 ? '✓ Significant' : '✗ Not significant'} at α = 0.05</span>`;
  }

  ['pr_n', 'pr_effect', 'pr_sd'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => generateData());
  });
  document.getElementById('pr_regen').addEventListener('click', generateData);
  generateData();
})();


// ===== RENDER KATEX =====
document.addEventListener('DOMContentLoaded', () => {
  renderMathInElement(document.body, {
    delimiters: [
      {left: '$$', right: '$$', display: true},
      {left: '\\(', right: '\\)', display: false},
      {left: '$', right: '$', display: false}
    ],
    throwOnError: false
  });
});
