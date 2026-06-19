// demo-chi-squared.js
// Interactive modules for:
//   1. Chi-Squared Goodness-of-Fit (Section 2)
//   2. Chi-Squared Test of Independence (Section 3)

// ============================================================
// Shared: Chi-squared p-value via regularised incomplete gamma
// ============================================================

function logGamma(x) {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313,  -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function gammaSeries(a, x) {
  let ap = a, del = 1 / a, sum = del;
  for (let n = 1; n < 300; n++) {
    ap++;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * 3e-7) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

function gammaCF(a, x) {
  const FPMIN = 1e-300;
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i < 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;  if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

function chiSqPValue(chi2, df) {
  if (chi2 <= 0 || df <= 0) return chi2 === 0 ? 1 : NaN;
  const a = df / 2, x = chi2 / 2;
  const p = (x < a + 1) ? gammaSeries(a, x) : 1 - gammaCF(a, x);
  return Math.max(0, Math.min(1, 1 - p));
}

function fmtPVal(p) {
  if (isNaN(p)) return '—';
  if (p < 0.001) return '< 0.001';
  return p.toFixed(3);
}

function contribClass(v) {
  if (v < 1)  return 'contrib-low';
  if (v < 3.8) return 'contrib-mid';
  return 'contrib-high';
}

// ============================================================
// MODULE 1: Goodness-of-Fit
// ============================================================
(function () {
  const N = 105;
  const K = 7;
  const E = N / K; // 15.0

  const DEFAULTS = [18, 12, 15, 10, 22, 17, 11];

  const obsInputs  = Array.from(document.querySelectorAll('.gof-obs'));
  const diffCells  = Array.from(document.querySelectorAll('.gof-diff'));
  const sqCells    = Array.from(document.querySelectorAll('.gof-sq'));
  const ctbCells   = Array.from(document.querySelectorAll('.gof-contrib'));
  const totalCell  = document.getElementById('gof-obs-total');
  const chi2Cell   = document.getElementById('gof-chi2-cell');
  const chi2Span   = document.getElementById('gof-chi2');
  const pvalSpan   = document.getElementById('gof-pval');
  const dfSpan     = document.getElementById('gof-df');
  const verdict    = document.getElementById('gof-verdict');
  const warning    = document.getElementById('gof-warning');
  const resetBtn   = document.getElementById('gof-reset');

  function update() {
    const obs = obsInputs.map(el => Math.max(0, parseInt(el.value) || 0));
    const total = obs.reduce((s, v) => s + v, 0);
    const valid = total === N;

    totalCell.textContent = total;
    totalCell.style.color = valid ? '' : '#dc2626';
    warning.classList.toggle('is-hidden', valid);

    let chi2 = 0;
    obs.forEach((o, i) => {
      const diff = o - E;
      const sq   = diff * diff;
      const ctb  = sq / E;
      chi2 += ctb;

      diffCells[i].textContent = (diff >= 0 ? '+' : '') + diff.toFixed(1);
      sqCells[i].textContent   = sq.toFixed(1);
      ctbCells[i].textContent  = ctb.toFixed(3);
      ctbCells[i].className    = 'gof-contrib ' + contribClass(ctb);
    });

    if (!valid) {
      chi2Cell.textContent = 'χ² = (fix total)';
      chi2Span.textContent = '—';
      pvalSpan.textContent = '—';
      verdict.textContent  = '';
      verdict.className    = 'chi-verdict';
      return;
    }

    const df = K - 1;
    const p  = chiSqPValue(chi2, df);

    chi2Cell.textContent = 'χ² = ' + chi2.toFixed(3);
    dfSpan.textContent   = df;
    chi2Span.textContent = chi2.toFixed(3);
    pvalSpan.textContent = fmtPVal(p);

    if (p < 0.05) {
      verdict.textContent = 'Reject H₀ — injury risk differs significantly by day (α = 0.05)';
      verdict.className   = 'chi-verdict sig';
    } else {
      verdict.textContent = 'Fail to reject H₀ — no significant evidence of unequal daily risk (α = 0.05)';
      verdict.className   = 'chi-verdict ns';
    }
  }

  obsInputs.forEach(el => el.addEventListener('input', update));

  resetBtn.addEventListener('click', () => {
    obsInputs.forEach((el, i) => { el.value = DEFAULTS[i]; });
    update();
  });

  update();
})();


// ============================================================
// MODULE 2: Test of Independence
// ============================================================
(function () {
  const ROWS = 2, COLS = 3;
  const DEFAULTS = [[40, 7, 3], [20, 18, 12]];

  const obsInputs = Array.from(document.querySelectorAll('.ind-obs'));

  function getObs() {
    const m = [[0, 0, 0], [0, 0, 0]];
    obsInputs.forEach(el => {
      const r = +el.dataset.r, c = +el.dataset.c;
      m[r][c] = Math.max(0, parseInt(el.value) || 0);
    });
    return m;
  }

  function update() {
    const obs = getObs();

    // Row/col totals
    const rowT = obs.map(row => row.reduce((s, v) => s + v, 0));
    const colT = [0, 1, 2].map(c => obs.reduce((s, row) => s + row[c], 0));
    const N    = rowT.reduce((s, v) => s + v, 0);

    document.getElementById('ind-row-0').textContent = rowT[0];
    document.getElementById('ind-row-1').textContent = rowT[1];
    document.getElementById('ind-col-0').textContent = colT[0];
    document.getElementById('ind-col-1').textContent = colT[1];
    document.getElementById('ind-col-2').textContent = colT[2];
    document.getElementById('ind-n').textContent     = N;

    if (N === 0) return;

    // Expected, contributions
    let chi2 = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const expVal = (N > 0) ? (rowT[r] * colT[c]) / N : 0;
        const expCell = document.getElementById('exp-' + r + '-' + c);
        expCell.textContent = expVal.toFixed(2);
        expCell.classList.toggle('exp-low', expVal < 5 && expVal > 0);

        const ctrCell = document.getElementById('ctr-' + r + '-' + c);
        if (expVal > 0) {
          const o   = obs[r][c];
          const ctr = Math.pow(o - expVal, 2) / expVal;
          chi2 += ctr;
          ctrCell.textContent = ctr.toFixed(3);
          ctrCell.className   = 'chi-contrib ' + contribClass(ctr);
        } else {
          ctrCell.textContent = '—';
          ctrCell.className   = 'chi-contrib';
        }
      }
    }

    const df = (ROWS - 1) * (COLS - 1);
    const p  = chiSqPValue(chi2, df);

    document.getElementById('ind-df').textContent   = df;
    document.getElementById('ind-chi2').textContent = chi2.toFixed(3);
    document.getElementById('ind-pval').textContent = fmtPVal(p);

    const verdict = document.getElementById('ind-verdict');
    if (p < 0.05) {
      verdict.textContent = 'Reject H₀ — treatment type and recovery outcome are associated (α = 0.05)';
      verdict.className   = 'chi-verdict sig';
    } else {
      verdict.textContent = 'Fail to reject H₀ — no significant association detected (α = 0.05)';
      verdict.className   = 'chi-verdict ns';
    }
  }

  obsInputs.forEach(el => el.addEventListener('input', update));

  document.getElementById('ind-reset').addEventListener('click', () => {
    obsInputs.forEach(el => {
      el.value = DEFAULTS[+el.dataset.r][+el.dataset.c];
    });
    update();
  });

  update();
})();
