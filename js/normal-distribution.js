// ===== UTILITY FUNCTIONS =====
function gaussianPDF(x, mu, sigma) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

function randNormal(mu, sigma) {
  let u, v;
  do { u = Math.random(); } while (u <= 0);
  v = Math.random();
  return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function randUniform(a, b) { return a + Math.random() * (b - a); }

function randCauchy(x0, gamma) {
  return x0 + gamma * Math.tan(Math.PI * (Math.random() - 0.5));
}

// AR(1) time series, returns array of length n
function generateAR1(n, phi, sigma) {
  const initSD = sigma / Math.sqrt(1 - phi * phi);
  const series = [randNormal(0, initSD)];
  for (let i = 1; i < n; i++) {
    series.push(phi * series[i - 1] + randNormal(0, sigma));
  }
  return series;
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


// ===== FIGURE 1: OUTLIER EFFECT =====
(function () {
  const canvas = document.getElementById('outlierCanvas');
  const ctx = setupCanvas(canvas);
  const W = 820, H = 230;

  const BASE_DATA = [22, 25, 28, 30, 32, 35, 38, 40, 44, 48];
  let data = [...BASE_DATA];
  let hasBillionaire = false;

  function stats(arr) {
    const n = arr.length;
    const sorted = [...arr].sort((a, b) => a - b);
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[(n - 1) / 2];
    return { mean, median };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const { mean, median } = stats(data);

    const padL = 60, padR = 40, padT = 40, padB = 60;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const xMin = 0;
    const xMax = hasBillionaire ? 5200 : 60;
    function valToX(v) { return padL + (v - xMin) / (xMax - xMin) * plotW; }

    // Axis
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT + plotH * 0.5);
    ctx.lineTo(W - padR, padT + plotH * 0.5);
    ctx.stroke();

    // X-axis ticks
    ctx.fillStyle = '#888';
    ctx.font = '12px "Source Sans 3", sans-serif';
    ctx.textAlign = 'center';
    const tickCount = 6;
    for (let i = 0; i <= tickCount; i++) {
      const v = xMin + (xMax - xMin) * i / tickCount;
      const xS = valToX(v);
      ctx.beginPath();
      ctx.moveTo(xS, padT + plotH * 0.5);
      ctx.lineTo(xS, padT + plotH * 0.5 + 5);
      ctx.stroke();
      const label = v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0);
      ctx.fillText('$' + label, xS, padT + plotH * 0.5 + 20);
    }
    ctx.fillText('Annual Income (CAD thousands)', padL + plotW / 2, H - 5);

    // Dots
    const dotY = padT + plotH * 0.5;
    data.forEach((v, i) => {
      const xS = valToX(v);
      const isBill = hasBillionaire && i === data.length - 1;
      ctx.fillStyle = isBill ? '#ea580c' : '#93c5fd';
      ctx.strokeStyle = isBill ? '#c2410c' : '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(xS, dotY, isBill ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Median label on top row, mean label on row below — prevents overlap when values are close
    const meanX = valToX(mean);
    const medX  = valToX(median);
    const meanLabel = mean   >= 1000 ? '$' + (mean   / 1000).toFixed(1) + 'M' : '$' + mean.toFixed(0)   + 'k';
    const medLabel  = median >= 1000 ? '$' + (median / 1000).toFixed(1) + 'M' : '$' + median.toFixed(0) + 'k';

    // Median line — starts from row 1 label baseline
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(medX, padT + 8);
    ctx.lineTo(medX, padT + plotH * 0.5 + 6);
    ctx.stroke();

    ctx.fillStyle = '#059669';
    ctx.font = '700 13px "Source Sans 3", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Median ' + medLabel, medX, padT + 4);

    // Mean line — starts from row 2 label baseline
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(meanX, padT + 24);
    ctx.lineTo(meanX, padT + plotH * 0.5 + 6);
    ctx.stroke();

    ctx.fillStyle = '#2563eb';
    ctx.font = '700 13px "Source Sans 3", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Mean ' + meanLabel, meanX, padT + 20);

    // Readout
    const fmtK = v => v >= 1000 ? '$' + (v / 1000).toFixed(1) + 'M' : '$' + v.toFixed(1) + 'k';
    document.getElementById('outlier-stats').innerHTML =
      '<span class="stat">Mean = <strong>' + fmtK(mean) + '</strong></span>' +
      '<span class="stat">Median = <strong>' + fmtK(median) + '</strong></span>' +
      '<span class="stat">n = <strong>' + data.length + '</strong></span>' +
      (hasBillionaire ? '<span class="stat is-danger">Mean shifted by <strong>' + fmtK(mean - stats(BASE_DATA).mean) + '</strong> ↑ · Median shifted by <strong>' + fmtK(median - stats(BASE_DATA).median) + '</strong></span>' : '');
  }

  document.getElementById('outlier-add-btn').addEventListener('click', () => {
    if (!hasBillionaire) { data = [...BASE_DATA, 4800]; hasBillionaire = true; }
    draw();
  });
  document.getElementById('outlier-reset-btn').addEventListener('click', () => {
    data = [...BASE_DATA]; hasBillionaire = false; draw();
  });
  draw();
})();


// ===== FIGURE 2: CLT SIMULATOR =====
(function () {
  const canvas = document.getElementById('cltCanvas');
  const ctx = setupCanvas(canvas);
  const W = 820, H = 400;

  // Distribution definitions: all centred near 5, xRange for population panel
  const DISTS = {
    normal: {
      mu: 5, sigma: 1.5, xMin: 0, xMax: 10,
      pdf: x => gaussianPDF(x, 5, 1.5),
      sample: () => randNormal(5, 1.5)
    },
    uniform: {
      mu: 5, sigma: 2.887, xMin: 0, xMax: 10,
      pdf: x => (x >= 0 && x <= 10) ? 0.1 : 0,
      sample: () => randUniform(0, 10)
    },
    skewed: {
      mu: 5, sigma: 2, xMin: 3, xMax: 15,
      pdf: x => x >= 3 ? 0.5 * Math.exp(-0.5 * (x - 3)) : 0,
      sample: () => { let u; do { u = Math.random(); } while (u <= 0); return 3 + (-2 * Math.log(u)); }
    },
    bimodal: {
      mu: 5, sigma: 2.15, xMin: 0, xMax: 10,
      pdf: x => 0.5 * gaussianPDF(x, 3, 0.8) + 0.5 * gaussianPDF(x, 7, 0.8),
      sample: () => Math.random() < 0.5 ? randNormal(3, 0.8) : randNormal(7, 0.8)
    }
  };

  let distType = 'normal';
  let sampleMeans = [];
  let currentDots = [];
  let currentMean = null;
  let showDots = false;
  let dotTimer = null;

  // Sampling distribution fixed x range [1, 9]
  const SAMP_MIN = 1, SAMP_MAX = 9, NUM_BINS = 40;
  const BIN_W = (SAMP_MAX - SAMP_MIN) / NUM_BINS;
  let histBins = new Array(NUM_BINS).fill(0);

  // Panel bounds
  const LP = { l: 40, r: 383, t: 50, b: 340 };
  const RP = { l: 437, r: 800, t: 50, b: 340 };

  function getDist() { return DISTS[distType]; }
  function getN() { return parseInt(document.getElementById('clt_n').value); }

  function addToHist(mean) {
    const bin = Math.max(0, Math.min(NUM_BINS - 1, Math.floor((mean - SAMP_MIN) / BIN_W)));
    histBins[bin]++;
  }

  function resetSim() {
    sampleMeans = [];
    histBins = new Array(NUM_BINS).fill(0);
    currentDots = [];
    currentMean = null;
    showDots = false;
    if (dotTimer) { clearTimeout(dotTimer); dotTimer = null; }
    updateStats();
    render();
  }

  function updateStats() {
    const d = getDist();
    const n = getN();
    const se = d.sigma / Math.sqrt(n);
    const k = sampleMeans.length;
    let html = '<span class="stat">n = <strong>' + n + '</strong></span>' +
      '<span class="stat">Population σ = <strong>' + d.sigma.toFixed(2) + '</strong></span>' +
      '<span class="stat">Expected SE = <strong>' + se.toFixed(3) + '</strong></span>' +
      '<span class="stat">Samples drawn = <strong>' + k + '</strong></span>';
    if (k >= 5) {
      const obsMean = sampleMeans.reduce((a, b) => a + b, 0) / k;
      const obsSE = Math.sqrt(sampleMeans.map(m => (m - obsMean) ** 2).reduce((a, b) => a + b, 0) / (k - 1));
      html += '<span class="stat">Observed SD(x̄) = <strong>' + obsSE.toFixed(3) + '</strong></span>';
    }
    document.getElementById('clt-stats').innerHTML = html;
  }

  function drawPopPanel() {
    const d = getDist();
    const pw = LP.r - LP.l, ph = LP.b - LP.t;

    function valToX(v) { return LP.l + (v - d.xMin) / (d.xMax - d.xMin) * pw; }

    // Max pdf
    let maxPdf = 0;
    for (let x = d.xMin; x <= d.xMax; x += (d.xMax - d.xMin) / 300)
      maxPdf = Math.max(maxPdf, d.pdf(x));
    maxPdf = Math.max(maxPdf * 1.15, 0.001);
    function pdfToY(p) { return LP.b - (p / maxPdf) * ph; }

    // Fill
    ctx.fillStyle = 'rgba(37,99,235,0.12)';
    ctx.beginPath();
    ctx.moveTo(valToX(d.xMin), LP.b);
    for (let x = d.xMin; x <= d.xMax; x += (d.xMax - d.xMin) / 300)
      ctx.lineTo(valToX(x), pdfToY(d.pdf(x)));
    ctx.lineTo(valToX(d.xMax), LP.b);
    ctx.fill();

    // Curve
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let first = true;
    for (let x = d.xMin; x <= d.xMax; x += (d.xMax - d.xMin) / 300) {
      first ? ctx.moveTo(valToX(x), pdfToY(d.pdf(x))) : ctx.lineTo(valToX(x), pdfToY(d.pdf(x)));
      first = false;
    }
    ctx.stroke();

    // Population mean dashed line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    const muX = valToX(d.mu);
    ctx.beginPath(); ctx.moveTo(muX, LP.b); ctx.lineTo(muX, LP.t + 10); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px "Source Sans 3",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('μ = ' + d.mu, muX, LP.t + 6);

    // Sample dots
    if (showDots && currentDots.length > 0) {
      ctx.fillStyle = '#ea580c';
      currentDots.forEach(v => {
        const xd = valToX(Math.max(d.xMin, Math.min(d.xMax, v)));
        ctx.beginPath();
        ctx.arc(xd, LP.b - 8, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
      // Sample mean marker
      if (currentMean !== null) {
        const mx = valToX(Math.max(d.xMin, Math.min(d.xMax, currentMean)));
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(mx, LP.b - 18); ctx.lineTo(mx, LP.t + 10); ctx.stroke();
        ctx.fillStyle = '#dc2626';
        ctx.font = '700 11px "Source Sans 3",sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('x̄ = ' + currentMean.toFixed(2), mx, LP.t + 6);
      }
    }

    // Axis
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(LP.l, LP.b); ctx.lineTo(LP.r, LP.b); ctx.stroke();
    ctx.fillStyle = '#777'; ctx.font = '11px "Source Sans 3",sans-serif'; ctx.textAlign = 'center';
    const step = (d.xMax - d.xMin) <= 12 ? 2 : 3;
    for (let x = Math.ceil(d.xMin / step) * step; x <= d.xMax; x += step) {
      const xS = valToX(x);
      ctx.beginPath(); ctx.moveTo(xS, LP.b); ctx.lineTo(xS, LP.b + 4); ctx.stroke();
      ctx.fillText(x, xS, LP.b + 16);
    }

    // Panel label
    ctx.fillStyle = '#2563eb';
    ctx.font = '700 12px "Source Sans 3",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Population Distribution', LP.l, LP.t - 12);
    if (showDots && currentDots.length > 0) {
      ctx.fillStyle = '#ea580c';
      ctx.font = '600 11px "Source Sans 3",sans-serif';
      ctx.fillText('● Current sample (n = ' + currentDots.length + ')', LP.l, LP.b + 32);
    }
  }

  function drawSampPanel() {
    const d = getDist();
    const n = getN();
    const se = d.sigma / Math.sqrt(n);
    const pw = RP.r - RP.l, ph = RP.b - RP.t;

    function sampToX(v) { return RP.l + (v - SAMP_MIN) / (SAMP_MAX - SAMP_MIN) * pw; }

    // Theoretical normal overlay height anchor
    const maxTheoryPdf = gaussianPDF(d.mu, d.mu, se);

    if (sampleMeans.length === 0) {
      ctx.fillStyle = '#bbb';
      ctx.font = '14px "Source Sans 3",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Draw samples to build the', (RP.l + RP.r) / 2, (RP.t + RP.b) / 2 - 8);
      ctx.fillText('sampling distribution →', (RP.l + RP.r) / 2, (RP.t + RP.b) / 2 + 12);
    } else {
      const total = sampleMeans.length;
      const maxBinDensity = Math.max(...histBins.map(c => c / (total * BIN_W)), 0.001);
      const refDensity = total >= 20 ? Math.max(maxTheoryPdf * 1.15, maxBinDensity) : maxBinDensity * 1.15;
      const yScale = ph / refDensity;

      // Histogram bars
      ctx.fillStyle = 'rgba(5,150,105,0.3)';
      ctx.strokeStyle = 'rgba(5,150,105,0.7)';
      ctx.lineWidth = 0.5;
      for (let b = 0; b < NUM_BINS; b++) {
        if (histBins[b] === 0) continue;
        const density = histBins[b] / (total * BIN_W);
        const bh = density * yScale;
        const bx = sampToX(SAMP_MIN + b * BIN_W);
        const bxEnd = sampToX(SAMP_MIN + (b + 1) * BIN_W);
        ctx.fillRect(bx, RP.b - bh, bxEnd - bx, bh);
        ctx.strokeRect(bx, RP.b - bh, bxEnd - bx, bh);
      }

      // Theoretical normal overlay (show after 20 samples)
      if (total >= 20) {
        ctx.strokeStyle = 'rgba(100,116,139,0.65)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        let first = true;
        for (let v = SAMP_MIN; v <= SAMP_MAX; v += (SAMP_MAX - SAMP_MIN) / 300) {
          const pdf = gaussianPDF(v, d.mu, se);
          const yS = RP.b - pdf * yScale;
          first ? ctx.moveTo(sampToX(v), yS) : ctx.lineTo(sampToX(v), yS);
          first = false;
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Current mean marker
      if (showDots && currentMean !== null) {
        const mx = sampToX(Math.max(SAMP_MIN, Math.min(SAMP_MAX, currentMean)));
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(mx, RP.b); ctx.lineTo(mx, RP.t); ctx.stroke();
      }
    }

    // Axis
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(RP.l, RP.b); ctx.lineTo(RP.r, RP.b); ctx.stroke();
    ctx.fillStyle = '#777'; ctx.font = '11px "Source Sans 3",sans-serif'; ctx.textAlign = 'center';
    for (let v = 2; v <= 8; v++) {
      const xS = sampToX(v);
      ctx.beginPath(); ctx.moveTo(xS, RP.b); ctx.lineTo(xS, RP.b + 4); ctx.stroke();
      ctx.fillText(v, xS, RP.b + 16);
    }

    // Panel label
    ctx.fillStyle = '#059669';
    ctx.font = '700 12px "Source Sans 3",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Sampling Distribution of x̄', RP.l, RP.t - 12);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Source Sans 3",sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('n = ' + n + '   SE = ' + se.toFixed(3), RP.r, RP.t - 12);

    if (sampleMeans.length >= 20) {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(100,116,139,0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(RP.r - 140, RP.t + 14); ctx.lineTo(RP.r - 110, RP.t + 14); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px "Source Sans 3",sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('N(μ, σ/√n) predicted', RP.r - 106, RP.t + 18);
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = '#e5e5e5'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(410, LP.t - 20); ctx.lineTo(410, LP.b + 40); ctx.stroke();
    drawPopPanel();
    drawSampPanel();
    ctx.fillStyle = '#aaa'; ctx.font = '11px "Source Sans 3",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Individual sample value', (LP.l + LP.r) / 2, LP.b + 32);
    ctx.fillText('Sample mean (x̄)', (RP.l + RP.r) / 2, RP.b + 32);
  }

  function drawOneSample() {
    const d = getDist();
    const n = getN();
    currentDots = Array.from({ length: n }, () => d.sample());
    currentMean = currentDots.reduce((a, b) => a + b, 0) / n;
    sampleMeans.push(currentMean);
    addToHist(currentMean);
    showDots = true;
    updateStats();
    render();
    if (dotTimer) clearTimeout(dotTimer);
    dotTimer = setTimeout(() => { showDots = false; render(); }, 1500);
  }

  function draw50() {
    const d = getDist();
    const n = getN();
    for (let s = 0; s < 50; s++) {
      const dots = Array.from({ length: n }, () => d.sample());
      const mean = dots.reduce((a, b) => a + b, 0) / n;
      sampleMeans.push(mean);
      addToHist(mean);
    }
    showDots = false;
    updateStats();
    render();
  }

  // Distribution tab switching
  document.getElementById('clt-dist-tabs').querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('clt-dist-tabs').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      distType = btn.dataset.dist;
      resetSim();
    });
  });

  document.getElementById('clt_n').addEventListener('input', () => {
    document.getElementById('clt_n_val').textContent = document.getElementById('clt_n').value;
    resetSim();
  });

  document.getElementById('clt-draw1-btn').addEventListener('click', drawOneSample);
  document.getElementById('clt-draw50-btn').addEventListener('click', draw50);
  document.getElementById('clt-reset-btn').addEventListener('click', resetSim);

  resetSim();
})();


// ===== FIGURE 3: SD vs SE =====
(function () {
  const canvas = document.getElementById('sdseCanvas');
  const ctx = setupCanvas(canvas);
  const W = 820, H = 260;

  function draw() {
    const sd = parseFloat(document.getElementById('sdse_sd').value);
    const n = parseInt(document.getElementById('sdse_n').value);
    const se = sd / Math.sqrt(n);
    const mu = 5;

    document.getElementById('sdse_sd_val').textContent = sd.toFixed(1);
    document.getElementById('sdse_n_val').textContent = n;

    ctx.clearRect(0, 0, W, H);
    const padL = 60, padR = 40, padT = 40, padB = 50;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const xMin = 0, xMax = 10;
    function valToX(v) { return padL + (v - xMin) / (xMax - xMin) * plotW; }

    // Height scaling: anchor so the taller of the two curves fills ~80% of plotH
    const maxSdPdf = gaussianPDF(mu, mu, sd);
    const maxSePdf = gaussianPDF(mu, mu, se);
    const maxPdf = Math.max(maxSdPdf, maxSePdf) * 1.2;
    function pdfToY(p) { return padT + plotH - (p / maxPdf) * plotH; }

    // Draw population distribution (SD) — blue
    ctx.fillStyle = 'rgba(37,99,235,0.1)';
    ctx.beginPath();
    ctx.moveTo(valToX(xMin), padT + plotH);
    for (let x = xMin; x <= xMax; x += (xMax - xMin) / 400)
      ctx.lineTo(valToX(x), pdfToY(gaussianPDF(x, mu, sd)));
    ctx.lineTo(valToX(xMax), padT + plotH);
    ctx.fill();

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let first = true;
    for (let x = xMin; x <= xMax; x += (xMax - xMin) / 400) {
      first ? ctx.moveTo(valToX(x), pdfToY(gaussianPDF(x, mu, sd))) : ctx.lineTo(valToX(x), pdfToY(gaussianPDF(x, mu, sd)));
      first = false;
    }
    ctx.stroke();

    // Draw sampling distribution (SE) — green
    ctx.fillStyle = 'rgba(5,150,105,0.15)';
    ctx.beginPath();
    ctx.moveTo(valToX(xMin), padT + plotH);
    for (let x = xMin; x <= xMax; x += (xMax - xMin) / 400)
      ctx.lineTo(valToX(x), pdfToY(gaussianPDF(x, mu, se)));
    ctx.lineTo(valToX(xMax), padT + plotH);
    ctx.fill();

    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    first = true;
    for (let x = xMin; x <= xMax; x += (xMax - xMin) / 400) {
      first ? ctx.moveTo(valToX(x), pdfToY(gaussianPDF(x, mu, se))) : ctx.lineTo(valToX(x), pdfToY(gaussianPDF(x, mu, se)));
      first = false;
    }
    ctx.stroke();

    // Axis
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, padT + plotH); ctx.lineTo(W - padR, padT + plotH); ctx.stroke();
    ctx.fillStyle = '#777'; ctx.font = '11px "Source Sans 3",sans-serif'; ctx.textAlign = 'center';
    for (let x = 0; x <= 10; x += 2) {
      const xS = valToX(x);
      ctx.beginPath(); ctx.moveTo(xS, padT + plotH); ctx.lineTo(xS, padT + plotH + 4); ctx.stroke();
      ctx.fillText(x, xS, padT + plotH + 17);
    }

    // Labels
    ctx.fillStyle = '#2563eb';
    ctx.font = '700 12px "Source Sans 3",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Population Distribution (σ = ' + sd.toFixed(1) + ')', padL + 10, padT + 20);
    ctx.fillStyle = '#059669';
    ctx.fillText('Sampling Distribution of x̄  (SE = σ/√n = ' + se.toFixed(3) + ')', padL + 10, padT + 38);

    // Readout
    document.getElementById('sdse-stats').innerHTML =
      '<span class="stat">σ (population SD) = <strong>' + sd.toFixed(2) + '</strong></span>' +
      '<span class="stat">n = <strong>' + n + '</strong></span>' +
      '<span class="stat">SE = σ/√n = <strong>' + se.toFixed(4) + '</strong></span>' +
      '<span class="stat">SE is <strong>' + (sd / se).toFixed(1) + '×</strong> narrower than σ</span>';
  }

  ['sdse_sd', 'sdse_n'].forEach(id => document.getElementById(id).addEventListener('input', draw));
  draw();
})();


// ===== FIGURE 4: CLT FAILURE MODES =====
(function () {
  const canvas = document.getElementById('failCanvas');
  const ctx = setupCanvas(canvas);
  const W = 820, H = 340;

  let activeTab = 'cauchy';
  const N_SIMS = 200;
  const SAMPLE_N = 30;

  // Reference: Normal(0,1) means, n=30
  let refMeans = [];
  let failMeans = [];

  function sampleMeansFrom(sampleFn) {
    const arr = [];
    for (let s = 0; s < N_SIMS; s++) {
      let sum = 0;
      for (let i = 0; i < SAMPLE_N; i++) sum += sampleFn();
      arr.push(sum / SAMPLE_N);
    }
    return arr;
  }

  function simulate() {
    // Reference is always iid N(0,1)
    refMeans = sampleMeansFrom(() => randNormal(0, 1));

    if (activeTab === 'cauchy') {
      failMeans = sampleMeansFrom(() => randCauchy(0, 1));
    } else if (activeTab === 'autocorr') {
      const phi = parseFloat(document.getElementById('fail_phi').value);
      failMeans = [];
      for (let s = 0; s < N_SIMS; s++) {
        const series = generateAR1(SAMPLE_N, phi, 1);
        failMeans.push(series.reduce((a, b) => a + b, 0) / SAMPLE_N);
      }
    } else {
      // exploding variance: 90% N(0,1) + 10% N(0, explSD)
      const explSD = parseFloat(document.getElementById('fail_explsd').value);
      failMeans = sampleMeansFrom(() => Math.random() < 0.9 ? randNormal(0, 1) : randNormal(0, explSD));
    }
    drawFail();
  }

  function computeHistogram(data, xMin, xMax, numBins) {
    const bins = new Array(numBins).fill(0);
    const bw = (xMax - xMin) / numBins;
    let clipped = 0;
    for (const v of data) {
      const b = Math.floor((v - xMin) / bw);
      if (b >= 0 && b < numBins) bins[b]++;
      else clipped++;
    }
    return { bins, bw, clipped };
  }

  function drawPanel(x0, x1, pT, pB, means, label, color, xMin, xMax, theoreticalSE) {
    const pw = x1 - x0;
    const ph = pB - pT;
    const NUM_BINS = 30;
    const { bins, bw, clipped } = computeHistogram(means, xMin, xMax, NUM_BINS);

    function valToX(v) { return x0 + (v - xMin) / (xMax - xMin) * pw; }

    const total = means.length;
    const maxBinDensity = Math.max(...bins.map(c => c / (total * bw)), 0.001);
    const maxThPdf = theoreticalSE > 0 ? gaussianPDF(0, 0, theoreticalSE) : 0;
    const refDensity = Math.max(maxBinDensity, maxThPdf) * 1.2;
    function densToY(d) { return pB - (d / refDensity) * ph; }

    // Histogram
    const rgb = color === 'blue' ? '37,99,235' : '220,38,38';
    ctx.fillStyle = 'rgba(' + rgb + ',0.2)';
    ctx.strokeStyle = 'rgba(' + rgb + ',0.6)';
    ctx.lineWidth = 0.5;
    for (let b = 0; b < NUM_BINS; b++) {
      if (bins[b] === 0) continue;
      const density = bins[b] / (total * bw);
      const bh = (density / refDensity) * ph;
      const bx = valToX(xMin + b * bw);
      const bxEnd = valToX(xMin + (b + 1) * bw);
      ctx.fillRect(bx, pB - bh, bxEnd - bx, bh);
      ctx.strokeRect(bx, pB - bh, bxEnd - bx, bh);
    }

    // Theoretical normal overlay
    if (theoreticalSE > 0) {
      ctx.strokeStyle = 'rgba(100,116,139,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      let first = true;
      for (let v = xMin; v <= xMax; v += (xMax - xMin) / 300) {
        const pdf = gaussianPDF(v, 0, theoreticalSE);
        first ? ctx.moveTo(valToX(v), densToY(pdf)) : ctx.lineTo(valToX(v), densToY(pdf));
        first = false;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Axis
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, pB); ctx.lineTo(x1, pB); ctx.stroke();
    ctx.fillStyle = '#777'; ctx.font = '11px "Source Sans 3",sans-serif'; ctx.textAlign = 'center';
    const tickStep = (xMax - xMin) <= 4 ? 0.5 : ((xMax - xMin) <= 10 ? 1 : 5);
    const startTick = Math.ceil(xMin / tickStep) * tickStep;
    for (let v = startTick; v <= xMax + 0.001; v += tickStep) {
      const xS = valToX(v);
      if (xS >= x0 && xS <= x1) {
        ctx.beginPath(); ctx.moveTo(xS, pB); ctx.lineTo(xS, pB + 4); ctx.stroke();
        ctx.fillText(v.toFixed(tickStep < 1 ? 1 : 0), xS, pB + 16);
      }
    }

    // Panel label
    ctx.fillStyle = 'rgba(' + rgb + ',0.9)';
    ctx.font = '700 12px "Source Sans 3",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x0 + 4, pT - 10);

    // Clipped label
    if (clipped > 0) {
      ctx.fillStyle = '#dc2626';
      ctx.font = '600 11px "Source Sans 3",sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(clipped + ' means outside axis (' + (clipped / total * 100).toFixed(0) + '%)', x1 - 4, pT - 10);
    }

    // Actual SD of means
    const meanOfMeans = means.reduce((a, b) => a + b, 0) / means.length;
    const sdMeans = Math.sqrt(means.map(m => (m - meanOfMeans) ** 2).reduce((a, b) => a + b, 0) / (means.length - 1));
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Source Sans 3",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Actual SD(x̄) = ' + sdMeans.toFixed(3), x0 + 4, pB + 30);
    if (theoreticalSE > 0) {
      ctx.fillText('Predicted SE = ' + theoreticalSE.toFixed(3), x0 + 4, pB + 44);
    }
  }

  function drawFail() {
    ctx.clearRect(0, 0, W, H);
    const LP = { l: 40, r: 390, t: 50, b: 280 };
    const RP = { l: 430, r: 790, t: 50, b: 280 };
    const theorSE = 1 / Math.sqrt(SAMPLE_N); // σ=1, n=30 → ≈ 0.183

    // Separator
    ctx.strokeStyle = '#e5e5e5'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(410, 30); ctx.lineTo(410, 300); ctx.stroke();

    // Left: always the reference (Normal)
    drawPanel(LP.l, LP.r, LP.t, LP.b, refMeans, 'Normal Distribution  (CLT works)', 'blue', -1.5, 1.5, theorSE);

    // Right: the failure mode
    if (activeTab === 'cauchy') {
      // Cauchy means also Cauchy — clip histogram to show contrast
      drawPanel(RP.l, RP.r, RP.t, RP.b, failMeans, 'Cauchy Distribution  (CLT fails)', 'red', -10, 10, 0);
    } else if (activeTab === 'autocorr') {
      const phi = parseFloat(document.getElementById('fail_phi').value);
      // Actual SE for AR(1) with given phi
      const actualSE = Math.sqrt((1 + phi) / (SAMPLE_N * (1 - phi)));
      const xRange = Math.max(1.5, actualSE * 5);
      drawPanel(RP.l, RP.r, RP.t, RP.b, failMeans, 'AR(1) φ=' + phi.toFixed(2) + '  (CLT fails)', 'red', -xRange, xRange, actualSE);
    } else {
      const explSD = parseFloat(document.getElementById('fail_explsd').value);
      // Effective SD: mixture variance = 0.9*1 + 0.1*explSD²
      const effVar = 0.9 * 1 + 0.1 * explSD * explSD;
      const effSE = Math.sqrt(effVar / SAMPLE_N);
      const xRange = Math.max(1.5, effSE * 4);
      drawPanel(RP.l, RP.r, RP.t, RP.b, failMeans, 'Mixture (10% explosive σ=' + explSD + ')', 'red', -xRange, xRange, effSE);
    }

    // Legend
    ctx.strokeStyle = 'rgba(100,116,139,0.65)'; ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(LP.l + 4, LP.t + 14); ctx.lineTo(LP.l + 34, LP.t + 14); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748b'; ctx.font = '11px "Source Sans 3",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Predicted N(0, SE) by CLT', LP.l + 38, LP.t + 18);

    // Stats readout
    let statsHtml = '<span class="stat">n = <strong>' + SAMPLE_N + '</strong></span>' +
      '<span class="stat">Samples simulated = <strong>' + N_SIMS + '</strong></span>';
    if (activeTab === 'autocorr') {
      const phi = parseFloat(document.getElementById('fail_phi').value);
      const actualSE = Math.sqrt((1 + phi) / (SAMPLE_N * (1 - phi)));
      const effN = Math.round(SAMPLE_N * (1 - phi) / (1 + phi));
      statsHtml += '<span class="stat">Theoretical SE (if independent) = <strong>' + theorSE.toFixed(3) + '</strong></span>' +
        '<span class="stat">Actual SE (AR φ=' + phi.toFixed(2) + ') = <strong>' + actualSE.toFixed(3) + '</strong></span>' +
        '<span class="stat is-danger">Effective n = <strong>' + effN + '</strong> (not ' + SAMPLE_N + ')</span>';
    }
    document.getElementById('fail-stats').innerHTML = statsHtml;
  }

  // Tab switching
  document.getElementById('fail-tabs').querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('fail-tabs').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.fail;
      // Show/hide controls
      document.querySelectorAll('.fail-ctrl').forEach(el => el.classList.add('is-hidden'));
      document.getElementById('fail-' + activeTab + '-controls').classList.remove('is-hidden');
      simulate();
    });
  });

  document.getElementById('fail-resim-btn').addEventListener('click', simulate);
  document.getElementById('fail_phi').addEventListener('input', () => {
    document.getElementById('fail_phi_val').textContent = parseFloat(document.getElementById('fail_phi').value).toFixed(2);
    simulate();
  });
  document.getElementById('fail_explsd').addEventListener('input', () => {
    document.getElementById('fail_explsd_val').textContent = document.getElementById('fail_explsd').value;
    simulate();
  });

  simulate();
})();


// ===== NORMAL DISTRIBUTION EXPLORER =====
(function () {
  const canvas = document.getElementById('normalDistCanvas');
  const ctx = setupCanvas(canvas);
  const W = 820, H = 270;

  // Band definitions: drawn outside-in so inner fills sit on top
  const BANDS = [
    { mult: 3, fill: 'rgba(219,234,254,0.75)', stroke: '#93c5fd', pct: '99.7%' },
    { mult: 2, fill: 'rgba(147,197,253,0.55)', stroke: '#60a5fa', pct: '95.5%' },
    { mult: 1, fill: 'rgba(59,130,246,0.30)',  stroke: '#3b82f6', pct: '68.3%' },
  ];

  function draw() {
    const mu    = parseFloat(document.getElementById('nd_mu').value);
    const sigma = parseFloat(document.getElementById('nd_sigma').value);
    document.getElementById('nd_mu_val').textContent    = mu.toFixed(1);
    document.getElementById('nd_sigma_val').textContent = sigma.toFixed(1);

    ctx.clearRect(0, 0, W, H);

    const padL = 70, padR = 30, padT = 55, padB = 50;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const xMin = -12;
    const xMax = 12;
    function valToX(v) { return padL + (v - xMin) / (xMax - xMin) * plotW; }
    const maxPdf = gaussianPDF(mu, mu, sigma) * 1.18;
    function pdfToY(p) { return padT + plotH - (p / maxPdf) * plotH; }

    // Shaded bands
    for (const band of BANDS) {
      const lo = mu - band.mult * sigma, hi = mu + band.mult * sigma;
      ctx.fillStyle = band.fill;
      ctx.beginPath();
      ctx.moveTo(valToX(lo), padT + plotH);
      for (let x = lo; x <= hi; x += (hi - lo) / 200)
        ctx.lineTo(valToX(x), pdfToY(gaussianPDF(x, mu, sigma)));
      ctx.lineTo(valToX(hi), padT + plotH);
      ctx.fill();
    }

    // PDF curve
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let first = true;
    for (let x = xMin; x <= xMax; x += (xMax - xMin) / 400) {
      first ? ctx.moveTo(valToX(x), pdfToY(gaussianPDF(x, mu, sigma)))
            : ctx.lineTo(valToX(x), pdfToY(gaussianPDF(x, mu, sigma)));
      first = false;
    }
    ctx.stroke();

    // μ dashed vertical
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(valToX(mu), padT + plotH);
    ctx.lineTo(valToX(mu), padT + 4);
    ctx.stroke();
    ctx.setLineDash([]);

    // Empirical-rule brackets drawn above the curve peak, stacked by band
    const bracketColors = ['#1d4ed8', '#1e40af', '#1e3a8a'];
    const bracketY      = [padT + 12, padT + 26, padT + 40]; // row for each band (1σ, 2σ, 3σ)
    for (let i = 0; i < 3; i++) {
      const m  = i + 1;
      const lx = valToX(mu - m * sigma);
      const rx = valToX(mu + m * sigma);
      const cy = bracketY[i];

      ctx.strokeStyle = bracketColors[i];
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(lx, cy); ctx.lineTo(rx, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx, cy - 4); ctx.lineTo(lx, cy + 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx, cy - 4); ctx.lineTo(rx, cy + 4); ctx.stroke();

      ctx.fillStyle = bracketColors[i];
      ctx.font = '700 11px "Source Sans 3",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(BANDS[2 - i].pct, valToX(mu), cy - 6);
    }

    // X-axis
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, padT + plotH); ctx.lineTo(W - padR, padT + plotH); ctx.stroke();

    // Sigma tick labels on x-axis
    ctx.fillStyle = '#555';
    ctx.font = '11px "Source Sans 3",sans-serif';
    ctx.textAlign = 'center';
    for (let x = -12; x <= 12; x += 2) {
      const xS = valToX(x);
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xS, padT + plotH); ctx.lineTo(xS, padT + plotH + 5); ctx.stroke();
      ctx.fillStyle = '#555';
      ctx.fillText(x.toFixed(0), xS, padT + plotH + 18);
    }

    ctx.fillStyle = '#777';
    ctx.font = '12px "Source Sans 3",sans-serif';
    ctx.fillText('x', padL + plotW / 2, H - 5);

    // Y-axis label
    ctx.save();
    ctx.translate(18, padT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#888';
    ctx.font = '11px "Source Sans 3",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Probability Density', 0, 0);
    ctx.restore();

    // Stats readout
    document.getElementById('nd-stats').innerHTML =
      `<span class="stat">μ = <strong>${mu.toFixed(1)}</strong></span>` +
      `<span class="stat">σ = <strong>${sigma.toFixed(1)}</strong></span>` +
      `<span class="stat">μ ± 1σ → <strong>68.3%</strong></span>` +
      `<span class="stat">μ ± 2σ → <strong>95.5%</strong></span>` +
      `<span class="stat">μ ± 3σ → <strong>99.7%</strong></span>`;
  }

  ['nd_mu', 'nd_sigma'].forEach(id => document.getElementById(id).addEventListener('input', draw));
  draw();
})();


// ===== RENDER KATEX =====
document.addEventListener('DOMContentLoaded', () => {
  renderMathInElement(document.body, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\(', right: '\\)', display: false },
      { left: '$', right: '$', display: false }
    ],
    throwOnError: false
  });
});
