(function() {
  const hasUtils = typeof setupCanvas === 'function';

  function fallbackSetupCanvas(el) {
    const dpr = window.devicePixelRatio || 1;
    const w = +el.getAttribute('width');
    const h = +el.getAttribute('height');
    el.width = w * dpr;
    el.height = h * dpr;
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    const ctx = el.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
  }

  const getCtx = hasUtils ? setupCanvas : fallbackSetupCanvas;

  function clamp(value, lo, hi) {
    return Math.max(lo, Math.min(hi, value));
  }

  function readNumber(id, fallback, min) {
    const el = document.getElementById(id);
    const value = Number(el.value);
    if (!Number.isFinite(value)) return fallback;
    if (min !== undefined) return Math.max(min, value);
    return value;
  }

  function fmtP(p) {
    if (!Number.isFinite(p)) return 'n/a';
    if (p < 0.001) return '< 0.001';
    return p.toFixed(4);
  }

  // Lanczos log-gamma and regularized upper incomplete gamma.
  function logGamma(z) {
    const g = 7;
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    let x = c[0];
    for (let i = 1; i < c.length; i++) x += c[i] / (z + i);
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function gammaPSeries(a, x) {
    if (x <= 0) return 0;
    let sum = 1 / a;
    let del = sum;
    let ap = a;
    for (let n = 1; n <= 100; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }

  function gammaQContinuedFraction(a, x) {
    const fpmin = 1e-30;
    let b = x + 1 - a;
    let c = 1 / fpmin;
    let d = 1 / Math.max(b, fpmin);
    let h = d;
    for (let i = 1; i <= 100; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < fpmin) d = fpmin;
      c = b + an / c;
      if (Math.abs(c) < fpmin) c = fpmin;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-12) break;
    }
    return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
  }

  function chiSquarePValue(x, df) {
    if (x < 0 || df <= 0) return NaN;
    const a = df / 2;
    const xx = x / 2;
    return xx < a + 1 ? 1 - gammaPSeries(a, xx) : gammaQContinuedFraction(a, xx);
  }

  function drawBarChart(canvasId, labels, observed, expected) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas._ctx || (canvas._ctx = getCtx(canvas));
    const W = +canvas.getAttribute('width');
    const H = +canvas.getAttribute('height');
    const pad = { l: 48, r: 20, t: 28, b: 54 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;
    const maxVal = Math.max(...observed, ...expected, 1) * 1.22;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i <= 4; i++) {
      const y = pad.t + ph - (i / 4) * ph;
      ctx.strokeStyle = '#e5e5e5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + pw, y);
      ctx.stroke();
      ctx.fillStyle = '#777';
      ctx.font = '11px "Source Sans 3", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((maxVal * i / 4).toFixed(0), pad.l - 8, y + 4);
    }

    const groupW = pw / labels.length;
    const barW = Math.min(28, groupW * 0.28);
    labels.forEach((label, i) => {
      const cx = pad.l + groupW * (i + 0.5);
      const obsH = observed[i] / maxVal * ph;
      const expH = expected[i] / maxVal * ph;
      const base = pad.t + ph;

      ctx.fillStyle = 'rgba(37, 99, 235, 0.72)';
      ctx.fillRect(cx - barW - 2, base - obsH, barW, obsH);
      ctx.fillStyle = 'rgba(217, 119, 6, 0.65)';
      ctx.fillRect(cx + 2, base - expH, barW, expH);

      ctx.fillStyle = '#555';
      ctx.font = '11px "Source Sans 3", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, cx, base + 18);
    });

    ctx.fillStyle = '#2563eb';
    ctx.fillRect(pad.l, 8, 12, 8);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(pad.l + 92, 8, 12, 8);
    ctx.fillStyle = '#555';
    ctx.font = '12px "Source Sans 3", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Observed', pad.l + 16, 16);
    ctx.fillText('Expected', pad.l + 108, 16);
  }

  function initChiSquare() {
    const tabButtons = document.querySelectorAll('[data-chi-tab]');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.chi-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.chiTab).classList.add('active');
      });
    });

    function updateGoodness() {
      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      const observed = labels.map((_, i) => readNumber('gof_o' + (i + 1), 0, 0));
      const expectedRaw = labels.map((_, i) => readNumber('gof_e' + (i + 1), 1, 0.01));
      const totalO = observed.reduce((a, b) => a + b, 0);
      const totalERaw = expectedRaw.reduce((a, b) => a + b, 0);
      if (totalO <= 0) {
        document.getElementById('gof-stats').innerHTML = '<span class="stat is-danger">Add at least one observed count.</span>';
        document.getElementById('gof-expected').innerHTML = '';
        document.getElementById('gof-note').innerHTML = '<strong>No test calculated:</strong> the total observed count must be greater than zero.';
        drawBarChart('gof-canvas', labels, observed, labels.map(() => 0));
        return;
      }
      const expected = expectedRaw.map(v => v / totalERaw * totalO);
      const chi = observed.reduce((sum, o, i) => sum + Math.pow(o - expected[i], 2) / expected[i], 0);
      const df = labels.length - 1;
      const p = chiSquarePValue(chi, df);
      const minExpected = Math.min(...expected);

      document.getElementById('gof-stats').innerHTML =
        `<span class="stat">chi-square = <strong>${chi.toFixed(3)}</strong></span>` +
        `<span class="stat">df = <strong>${df}</strong></span>` +
        `<span class="stat">p = <strong>${fmtP(p)}</strong></span>` +
        `<span class="stat ${p < 0.05 ? 'is-success' : 'is-danger'}">${p < 0.05 ? 'Reject H0' : 'Fail to reject H0'}</span>`;

      document.getElementById('gof-expected').innerHTML = labels.map((label, i) =>
        `<tr><td>${label}</td><td>${observed[i].toFixed(0)}</td><td class="expected-cell">${expected[i].toFixed(2)}</td><td>${((observed[i] - expected[i]) ** 2 / expected[i]).toFixed(2)}</td></tr>`
      ).join('');

      document.getElementById('gof-note').innerHTML =
        minExpected < 5
          ? '<strong>Assumption warning:</strong> at least one expected count is below 5, so the chi-square approximation may be unreliable.'
          : '<strong>Assumption check:</strong> all expected counts are at least 5, so the usual chi-square approximation is reasonable.';

      drawBarChart('gof-canvas', labels, observed, expected);
    }

    function updateIndependence() {
      const cells = {
        a: readNumber('ind_a', 28, 0),
        b: readNumber('ind_b', 12, 0),
        c: readNumber('ind_c', 18, 0),
        d: readNumber('ind_d', 22, 0)
      };
      const row1 = cells.a + cells.b;
      const row2 = cells.c + cells.d;
      const col1 = cells.a + cells.c;
      const col2 = cells.b + cells.d;
      const total = row1 + row2;
      if (total <= 0) {
        document.getElementById('ind-stats').innerHTML = '<span class="stat is-danger">Add at least one observed count.</span>';
        document.getElementById('ind-expected').innerHTML = '';
        document.getElementById('ind-note').innerHTML = '<strong>No test calculated:</strong> the contingency table must contain at least one observation.';
        drawBarChart('ind-canvas', ['Treat/Yes', 'Treat/No', 'Ctrl/Yes', 'Ctrl/No'], [0, 0, 0, 0], [0, 0, 0, 0]);
        return;
      }
      const expected = [
        row1 * col1 / total,
        row1 * col2 / total,
        row2 * col1 / total,
        row2 * col2 / total
      ];
      const observed = [cells.a, cells.b, cells.c, cells.d];
      const chi = observed.reduce((sum, o, i) => sum + Math.pow(o - expected[i], 2) / expected[i], 0);
      const df = 1;
      const p = chiSquarePValue(chi, df);
      const minExpected = Math.min(...expected);
      const phi = Math.sqrt(chi / Math.max(total, 1));

      document.getElementById('ind-stats').innerHTML =
        `<span class="stat">chi-square = <strong>${chi.toFixed(3)}</strong></span>` +
        `<span class="stat">df = <strong>${df}</strong></span>` +
        `<span class="stat">p = <strong>${fmtP(p)}</strong></span>` +
        `<span class="stat">phi = <strong>${phi.toFixed(3)}</strong></span>` +
        `<span class="stat ${p < 0.05 ? 'is-success' : 'is-danger'}">${p < 0.05 ? 'Evidence of association' : 'No clear association'}</span>`;

      document.getElementById('ind-expected').innerHTML = `
        <tr><td>Treatment</td><td class="expected-cell">${expected[0].toFixed(2)}</td><td class="expected-cell">${expected[1].toFixed(2)}</td><td>${row1.toFixed(0)}</td></tr>
        <tr><td>Control</td><td class="expected-cell">${expected[2].toFixed(2)}</td><td class="expected-cell">${expected[3].toFixed(2)}</td><td>${row2.toFixed(0)}</td></tr>
        <tr><td>Total</td><td>${col1.toFixed(0)}</td><td>${col2.toFixed(0)}</td><td>${total.toFixed(0)}</td></tr>
      `;

      document.getElementById('ind-note').innerHTML =
        minExpected < 5
          ? '<strong>Assumption warning:</strong> at least one expected cell is below 5. Fisher exact test may be preferable for a 2x2 table.'
          : '<strong>Expected counts:</strong> each cell is at least 5. The table is suitable for the standard chi-square approximation.';

      drawBarChart('ind-canvas', ['Treat/Yes', 'Treat/No', 'Ctrl/Yes', 'Ctrl/No'], observed, expected);
    }

    document.querySelectorAll('[id^="gof_o"], [id^="gof_e"]').forEach(el => el.addEventListener('input', updateGoodness));
    document.querySelectorAll('#ind_a, #ind_b, #ind_c, #ind_d').forEach(el => el.addEventListener('input', updateIndependence));
    updateGoodness();
    updateIndependence();
  }

  function logistic(x, intercept, slope) {
    return 1 / (1 + Math.exp(-(intercept + slope * x)));
  }

  function initLogisticDemo() {
    const canvas = document.getElementById('logit-canvas');
    if (!canvas) return;
    const ctx = getCtx(canvas);
    const W = +canvas.getAttribute('width');
    const H = +canvas.getAttribute('height');
    const pad = { l: 48, r: 18, t: 18, b: 46 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    function seededRandom(seed) {
      let state = seed >>> 0;
      return function() {
        state = (1664525 * state + 1013904223) >>> 0;
        return state / 4294967296;
      };
    }

    function gaussianPair(rand) {
      const u1 = Math.max(rand(), 1e-9);
      const u2 = rand();
      const mag = Math.sqrt(-2 * Math.log(u1));
      return [mag * Math.cos(2 * Math.PI * u2), mag * Math.sin(2 * Math.PI * u2)];
    }

    function makeClusteredData() {
      const rand = seededRandom(30405);
      const points = [];
      function addCluster(n, cx, cy, sx, sy, label) {
        for (let i = 0; i < n; i++) {
          const [z1, z2] = gaussianPair(rand);
          const tail = rand() < 0.08 ? 1.85 : 1;
          points.push({
            x: clamp(cx + z1 * sx * tail, 0.05, 9.95),
            y: clamp(cy + z2 * sy * tail, 0.05, 9.95),
            label
          });
        }
      }
      addCluster(330, 3.0, 2.2, 1.05, 0.95, 0);
      addCluster(340, 7.1, 7.0, 1.05, 0.85, 1);
      for (let i = 0; i < 34; i++) {
        const [z1, z2] = gaussianPair(rand);
        points.push({
          x: clamp(5.1 + z1 * 1.4, 0.05, 9.95),
          y: clamp(4.9 + z2 * 1.4, 0.05, 9.95),
          label: rand() < 0.48 ? 1 : 0
        });
      }
      return points;
    }

    const data = makeClusteredData();

    function toX(x) { return pad.l + x / 10 * pw; }
    function toY(y) { return pad.t + (10 - y) / 10 * ph; }

    function drawBoundary(coeffs, color, width, dash) {
      const { intercept, b1, b2, cutoff } = coeffs;
      if (Math.abs(b2) < 1e-6) {
        const x = (cutoff - intercept) / b1;
        if (x < 0 || x > 10) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.setLineDash(dash || []);
        ctx.beginPath();
        ctx.moveTo(toX(x), toY(0));
        ctx.lineTo(toX(x), toY(10));
        ctx.stroke();
        ctx.setLineDash([]);
        return;
      }

      const candidates = [];
      const yAt0 = (cutoff - intercept) / b2;
      const yAt10 = (cutoff - intercept - b1 * 10) / b2;
      if (yAt0 >= 0 && yAt0 <= 10) candidates.push([0, yAt0]);
      if (yAt10 >= 0 && yAt10 <= 10) candidates.push([10, yAt10]);
      if (Math.abs(b1) >= 1e-6) {
        const xAt0 = (cutoff - intercept) / b1;
        const xAt10 = (cutoff - intercept - b2 * 10) / b1;
        if (xAt0 >= 0 && xAt0 <= 10) candidates.push([xAt0, 0]);
        if (xAt10 >= 0 && xAt10 <= 10) candidates.push([xAt10, 10]);
      }

      if (candidates.length < 2) return;
      const p1 = candidates[0];
      const p2 = candidates.find(p => Math.abs(p[0] - p1[0]) > 0.01 || Math.abs(p[1] - p1[1]) > 0.01);
      if (!p2) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      ctx.moveTo(toX(p1[0]), toY(p1[1]));
      ctx.lineTo(toX(p2[0]), toY(p2[1]));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function draw() {
      const intercept = readNumber('log_intercept', -4.4);
      const b1 = readNumber('log_slope', 1.0);
      const b2 = readNumber('lin_intercept', 1.0);
      const linearTilt = readNumber('lin_slope', 0.15);
      const threshold = readNumber('class_threshold', 0.5, 0);
      const thresholdLogit = Math.log(clamp(threshold, 0.001, 0.999) / clamp(1 - threshold, 0.001, 0.999));

      document.getElementById('log_intercept_v').textContent = intercept.toFixed(1);
      document.getElementById('log_slope_v').textContent = b1.toFixed(2);
      document.getElementById('lin_intercept_v').textContent = b2.toFixed(2);
      document.getElementById('lin_slope_v').textContent = linearTilt.toFixed(2);
      document.getElementById('class_threshold_v').textContent = threshold.toFixed(2);

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);

      const cell = 8;
      for (let y = pad.t; y < pad.t + ph; y += cell) {
        for (let x = pad.l; x < pad.l + pw; x += cell) {
          const xVal = ((x + cell / 2 - pad.l) / pw) * 10;
          const yVal = 10 - ((y + cell / 2 - pad.t) / ph) * 10;
          const p = logistic(0, intercept + b1 * xVal + b2 * yVal, 1);
          const alpha = Math.abs(p - 0.5) * 0.20;
          ctx.fillStyle = p >= threshold ? `rgba(220, 38, 38, ${alpha})` : `rgba(5, 150, 105, ${alpha})`;
          ctx.fillRect(x, y, cell + 1, cell + 1);
        }
      }

      for (let i = 0; i <= 10; i++) {
        const gx = toX(i);
        const gy = toY(i);
        ctx.strokeStyle = '#c7c7c7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gx, pad.t);
        ctx.lineTo(gx, pad.t + ph);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pad.l, gy);
        ctx.lineTo(pad.l + pw, gy);
        ctx.stroke();
        ctx.fillStyle = '#777';
        ctx.font = '11px "Source Sans 3", sans-serif';
        ctx.textAlign = 'center';
        if (i % 2 === 0) ctx.fillText(i, gx, pad.t + ph + 18);
        ctx.textAlign = 'right';
        if (i % 2 === 0) ctx.fillText(i, pad.l - 8, gy + 4);
      }

      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(pad.l, pad.t, pw, ph);
      ctx.stroke();

      drawBoundary({
        intercept: -0.95 + linearTilt,
        b1: 0.105 + linearTilt * 0.018,
        b2: 0.105 - linearTilt * 0.018,
        cutoff: threshold
      }, '#1f2937', 2.2, []);

      drawBoundary({
        intercept,
        b1,
        b2,
        cutoff: thresholdLogit
      }, '#166534', 2.8, []);

      data.forEach(p => {
        const sx = toX(p.x);
        const sy = toY(p.y);
        ctx.fillStyle = p.label ? 'rgba(255, 0, 0, 0.9)' : 'rgba(0, 128, 0, 0.9)';
        ctx.beginPath();
        ctx.arc(sx, sy, 3.6, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#555';
      ctx.font = '12px "Source Sans 3", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Predictor 1', pad.l + pw / 2, H - 8);
      ctx.save();
      ctx.translate(16, pad.t + ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Predictor 2', 0, 0);
      ctx.restore();

      let correct = 0;
      let linearCorrect = 0;
      let logLik = 0;
      data.forEach(d => {
        const pred = logistic(0, intercept + b1 * d.x + b2 * d.y, 1);
        const cls = pred >= threshold ? 1 : 0;
        const linearPred = -0.95 + linearTilt + (0.105 + linearTilt * 0.018) * d.x + (0.105 - linearTilt * 0.018) * d.y;
        const linearCls = linearPred >= threshold ? 1 : 0;
        if (cls === d.label) correct += 1;
        if (linearCls === d.label) linearCorrect += 1;
        logLik += d.label * Math.log(clamp(pred, 1e-8, 1 - 1e-8)) + (1 - d.label) * Math.log(clamp(1 - pred, 1e-8, 1 - 1e-8));
      });

      document.getElementById('logit-readout').innerHTML =
        `<div><strong>Logistic model</strong><br><span class="model-equation">logit(p) = ${intercept.toFixed(1)} + ${b1.toFixed(2)}x1 + ${b2.toFixed(2)}x2</span></div>` +
        `<div><strong>Decision line</strong><br><span class="model-equation">${intercept.toFixed(1)} + ${b1.toFixed(2)}x1 + ${b2.toFixed(2)}x2 = ${thresholdLogit.toFixed(2)}</span></div>` +
        `<div><strong>Logistic classification:</strong> ${correct} / ${data.length} correct at threshold <span class="threshold-chip">${threshold.toFixed(2)}</span></div>` +
        `<div><strong>Linear probability line:</strong> ${linearCorrect} / ${data.length} correct with its fixed comparison boundary</div>` +
        `<div><strong>Log-likelihood:</strong> ${logLik.toFixed(2)}</div>`;

      document.getElementById('linear-warning').innerHTML =
        '<strong>Decision boundary:</strong> the green line is where logistic regression predicts exactly the selected threshold. The darker line shows a linear probability model boundary, which can separate points but still does not naturally constrain probabilities to 0-1.';
    }

    ['log_intercept', 'log_slope', 'lin_intercept', 'lin_slope', 'class_threshold'].forEach(id => {
      document.getElementById(id).addEventListener('input', draw);
    });
    document.getElementById('logit_reset').addEventListener('click', () => {
      document.getElementById('log_intercept').value = -9.5;
      document.getElementById('log_slope').value = 1.00;
      document.getElementById('lin_intercept').value = 1.00;
      document.getElementById('lin_slope').value = 0.15;
      document.getElementById('class_threshold').value = 0.50;
      draw();
    });
    draw();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initChiSquare();
    initLogisticDemo();
  });
})();
