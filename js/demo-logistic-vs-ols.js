// demo-logistic-vs-ols.js
// Interactive: Logistic Regression vs. OLS (Linear Probability Model)
// Requires: utils.js (setupCanvas, olsCoefficients)

// ----------------------------------------------------------------
// Dataset: study hours (x) vs. pass/fail outcome (y = 0 or 1)
// Generated from a logistic model with β₀ ≈ -5, β₁ ≈ 1.0
// ----------------------------------------------------------------
const lgData = [
  {x:1.0,y:0},{x:1.5,y:0},{x:2.0,y:0},{x:2.0,y:0},
  {x:2.5,y:0},{x:3.0,y:0},{x:3.0,y:0},{x:3.5,y:0},
  {x:4.0,y:0},{x:4.0,y:1},{x:4.5,y:0},{x:5.0,y:1},
  {x:5.0,y:0},{x:5.5,y:1},{x:5.5,y:0},{x:6.0,y:1},
  {x:6.0,y:1},{x:6.5,y:1},{x:7.0,y:0},{x:7.0,y:1},
  {x:7.5,y:1},{x:8.0,y:1},{x:8.5,y:1},{x:9.0,y:1},
  {x:9.5,y:1}
];

// Canvas setup
const lgCanvas = document.getElementById('logistic-canvas');
const lgCtx    = setupCanvas(lgCanvas);

// Plot region in CSS pixel coordinates (canvas is 520×380 in CSS)
const LG = { left: 58, right: 20, top: 24, bottom: 50, W: 520, H: 380 };
const X_MIN = 0, X_MAX = 10.5;
const Y_MIN = -0.28, Y_MAX = 1.28;

function lgPx(x) { return LG.left + (x - X_MIN) / (X_MAX - X_MIN) * (LG.W - LG.left - LG.right); }
function lgPy(y) { return LG.H - LG.bottom - (y - Y_MIN) / (Y_MAX - Y_MIN) * (LG.H - LG.top - LG.bottom); }

// OLS fit (fixed — computed once from data)
const ols     = olsCoefficients(lgData);
const olsAt   = x => ols.intercept + ols.slope * x;

// Logistic sigmoid
function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
function logitP(b0, b1, x) { return sigmoid(b0 + b1 * x); }

// Log-likelihood
function logLikelihood(b0, b1, data) {
  return data.reduce((s, p) => {
    const prob = logitP(b0, b1, p.x);
    const pp = Math.max(1e-12, Math.min(1 - 1e-12, prob));
    return s + (p.y === 1 ? Math.log(pp) : Math.log(1 - pp));
  }, 0);
}

// MLE via gradient ascent
function fitMLE(data, iterations = 8000, lr = 0.02) {
  let b0 = 0, b1 = 0;
  const n = data.length;
  for (let iter = 0; iter < iterations; iter++) {
    let g0 = 0, g1 = 0;
    for (const p of data) {
      const err = p.y - logitP(b0, b1, p.x);
      g0 += err;
      g1 += err * p.x;
    }
    b0 += (lr / n) * g0;
    b1 += (lr / n) * g1;
  }
  return { b0, b1 };
}

// ----------------------------------------------------------------
// UI refs
// ----------------------------------------------------------------
const b0Slider   = document.getElementById('lg-b0');
const b1Slider   = document.getElementById('lg-b1');
const b0Val      = document.getElementById('lg-b0-val');
const b1Val      = document.getElementById('lg-b1-val');
const fitBtn     = document.getElementById('lg-fit');
const resetBtn   = document.getElementById('lg-reset');
const toggleOLS  = document.getElementById('lg-toggle-ols');

const olsEqEl    = document.getElementById('lg-ols-eq');
const logEqEl    = document.getElementById('lg-log-eq');
const olsNegEl   = document.getElementById('lg-ols-neg');
const olsGt1El   = document.getElementById('lg-ols-gt1');
const boundaryEl = document.getElementById('lg-boundary');
const llEl       = document.getElementById('lg-ll');

let showOLS = true;

// ----------------------------------------------------------------
// Drawing
// ----------------------------------------------------------------
function drawLG() {
  const b0 = parseFloat(b0Slider.value);
  const b1 = parseFloat(b1Slider.value);
  const W = LG.W, H = LG.H;

  lgCtx.clearRect(0, 0, W, H);
  lgCtx.fillStyle = '#fff';
  lgCtx.fillRect(0, 0, W, H);

  // ---- Invalid OLS probability regions ----
  // Region where OLS predicts p < 0 (if OLS line crosses y=0 for x in visible range)
  // OLS line: y = intercept + slope * x; crosses y=0 at x = -intercept/slope
  const xCross0  = -ols.intercept / ols.slope; // OLS predicts 0 here
  const xCross1  = (1 - ols.intercept) / ols.slope; // OLS predicts 1 here

  lgCtx.save();
  lgCtx.globalAlpha = 0.18;

  // Below y = 0 region
  if (showOLS) {
    lgCtx.fillStyle = '#dc2626';
    // Left of xCross0 (OLS < 0) — or right, depending on slope
    if (ols.slope > 0) {
      // OLS < 0 for x < xCross0
      const leftX = Math.max(X_MIN, 0);
      const rightX = Math.min(X_MAX, xCross0);
      if (rightX > leftX) {
        lgCtx.fillRect(lgPx(leftX), lgPy(0), lgPx(rightX) - lgPx(leftX), lgPy(Y_MIN) - lgPy(0));
      }
      // OLS > 1 for x > xCross1
      const leftX2 = Math.max(X_MIN, xCross1);
      const rightX2 = X_MAX;
      if (rightX2 > leftX2) {
        lgCtx.fillRect(lgPx(leftX2), lgPy(Y_MAX), lgPx(rightX2) - lgPx(leftX2), lgPy(1) - lgPy(Y_MAX));
      }
    }
  }
  lgCtx.restore();

  // ---- Grid lines ----
  lgCtx.strokeStyle = '#e5e7eb';
  lgCtx.lineWidth   = 1;
  for (let xg = 1; xg <= 10; xg++) {
    lgCtx.beginPath();
    lgCtx.moveTo(lgPx(xg), LG.top);
    lgCtx.lineTo(lgPx(xg), H - LG.bottom);
    lgCtx.stroke();
  }
  lgCtx.setLineDash([4, 4]);
  lgCtx.strokeStyle = '#d1d5db';
  for (const yg of [0.25, 0.5, 0.75]) {
    lgCtx.beginPath();
    lgCtx.moveTo(LG.left, lgPy(yg));
    lgCtx.lineTo(W - LG.right, lgPy(yg));
    lgCtx.stroke();
  }
  lgCtx.setLineDash([]);

  // ---- Probability bounds y=0 and y=1 (thick lines) ----
  lgCtx.strokeStyle = '#6b7280';
  lgCtx.lineWidth   = 1.5;
  lgCtx.beginPath(); lgCtx.moveTo(LG.left, lgPy(0)); lgCtx.lineTo(W - LG.right, lgPy(0)); lgCtx.stroke();
  lgCtx.beginPath(); lgCtx.moveTo(LG.left, lgPy(1)); lgCtx.lineTo(W - LG.right, lgPy(1)); lgCtx.stroke();

  // ---- Axes ----
  lgCtx.strokeStyle = '#9ca3af';
  lgCtx.lineWidth   = 1.5;
  lgCtx.beginPath();
  lgCtx.moveTo(LG.left, LG.top);
  lgCtx.lineTo(LG.left, H - LG.bottom);
  lgCtx.lineTo(W - LG.right, H - LG.bottom);
  lgCtx.stroke();

  // ---- Axis labels ----
  lgCtx.fillStyle  = '#4b5563';
  lgCtx.font       = '12px "Source Sans 3", sans-serif';
  lgCtx.textAlign  = 'center';
  lgCtx.fillText('Study Hours', LG.left + (W - LG.left - LG.right) / 2, H - 6);

  lgCtx.save();
  lgCtx.translate(14, LG.top + (H - LG.top - LG.bottom) / 2);
  lgCtx.rotate(-Math.PI / 2);
  lgCtx.fillText('P(pass)', 0, 0);
  lgCtx.restore();

  // Tick labels
  lgCtx.textAlign = 'center';
  lgCtx.fillStyle = '#6b7280';
  lgCtx.font      = '11px "Source Sans 3", sans-serif';
  for (let xg = 0; xg <= 10; xg += 2) {
    lgCtx.fillText(String(xg), lgPx(xg), H - LG.bottom + 14);
  }
  lgCtx.textAlign = 'right';
  for (const yg of [0, 0.25, 0.5, 0.75, 1]) {
    lgCtx.fillText(yg.toFixed(2), LG.left - 6, lgPy(yg) + 4);
  }

  // Boundary labels for y=0 and y=1
  lgCtx.fillStyle = '#6b7280';
  lgCtx.font      = '10px "Source Sans 3", sans-serif';
  lgCtx.textAlign = 'left';
  lgCtx.fillText('p = 1', W - LG.right + 2, lgPy(1) + 4);
  lgCtx.fillText('p = 0', W - LG.right + 2, lgPy(0) + 4);

  // ---- OLS line ----
  if (showOLS) {
    lgCtx.strokeStyle = '#2563eb';
    lgCtx.lineWidth   = 2.5;
    lgCtx.beginPath();
    lgCtx.moveTo(lgPx(X_MIN), lgPy(olsAt(X_MIN)));
    lgCtx.lineTo(lgPx(X_MAX), lgPy(olsAt(X_MAX)));
    lgCtx.stroke();
  }

  // ---- Logistic S-curve ----
  lgCtx.strokeStyle = '#059669';
  lgCtx.lineWidth   = 3;
  lgCtx.beginPath();
  let first = true;
  for (let px = LG.left; px <= LG.W - LG.right; px++) {
    const dataX = X_MIN + (px - LG.left) / (LG.W - LG.left - LG.right) * (X_MAX - X_MIN);
    const prob  = logitP(b0, b1, dataX);
    const py    = lgPy(prob);
    if (first) { lgCtx.moveTo(px, py); first = false; }
    else        { lgCtx.lineTo(px, py); }
  }
  lgCtx.stroke();

  // ---- Decision boundary (logistic p = 0.5) ----
  const xBound = -b0 / b1;
  if (xBound >= X_MIN && xBound <= X_MAX && b1 !== 0) {
    lgCtx.strokeStyle = '#059669';
    lgCtx.lineWidth   = 1.5;
    lgCtx.setLineDash([6, 4]);
    lgCtx.beginPath();
    lgCtx.moveTo(lgPx(xBound), lgPy(0.5) - 6);
    lgCtx.lineTo(lgPx(xBound), lgPy(0) + 4);
    lgCtx.stroke();
    lgCtx.setLineDash([]);

    lgCtx.fillStyle  = '#059669';
    lgCtx.font       = 'bold 11px "Source Sans 3", sans-serif';
    lgCtx.textAlign  = 'center';
    lgCtx.fillText('p = 0.5', lgPx(xBound), lgPy(0.5) - 10);
  }

  // ---- Data points ----
  lgData.forEach(p => {
    const cx = lgPx(p.x);
    const cy = lgPy(p.y);

    // Outer ring
    lgCtx.beginPath();
    lgCtx.arc(cx, cy, 6, 0, Math.PI * 2);
    lgCtx.fillStyle   = p.y === 1 ? '#059669' : '#dc2626';
    lgCtx.fill();

    lgCtx.beginPath();
    lgCtx.arc(cx, cy, 6, 0, Math.PI * 2);
    lgCtx.strokeStyle = '#fff';
    lgCtx.lineWidth   = 1.5;
    lgCtx.stroke();
  });

  // ---- Red label on invalid regions ----
  if (showOLS) {
    lgCtx.fillStyle = '#dc2626';
    lgCtx.font      = 'italic 10px "Source Sans 3", sans-serif';
    lgCtx.textAlign = 'center';
    if (xCross0 > X_MIN && xCross0 < 4) {
      lgCtx.fillText('OLS < 0', lgPx(Math.max(X_MIN + 0.3, xCross0 / 2)), lgPy(-0.14));
    }
    if (xCross1 < X_MAX && xCross1 > 7) {
      lgCtx.fillText('OLS > 1', lgPx(Math.min(X_MAX - 0.3, (xCross1 + X_MAX) / 2)), lgPy(1.14));
    }
  }
}

// ----------------------------------------------------------------
// Readout
// ----------------------------------------------------------------
function updateReadout() {
  const b0 = parseFloat(b0Slider.value);
  const b1 = parseFloat(b1Slider.value);

  const olsNeg  = -ols.intercept / ols.slope;  // OLS = 0
  const olsGt1  = (1 - ols.intercept) / ols.slope; // OLS = 1

  olsEqEl.textContent  = `ŷ = ${ols.intercept.toFixed(3)} + ${ols.slope.toFixed(3)}·x`;
  logEqEl.textContent  = `ln(p/(1−p)) = ${b0.toFixed(2)} + ${b1.toFixed(2)}·x`;
  olsNegEl.textContent = ols.slope > 0
    ? `x < ${olsNeg.toFixed(2)} hrs`
    : 'n/a';
  olsGt1El.textContent = ols.slope > 0
    ? `x > ${olsGt1.toFixed(2)} hrs`
    : 'n/a';

  const xBound = b1 !== 0 ? (-b0 / b1).toFixed(2) : '∞';
  boundaryEl.textContent = `x = ${xBound} hrs`;

  const ll = logLikelihood(b0, b1, lgData);
  llEl.textContent = ll.toFixed(3);

  b0Val.textContent = b0 >= 0 ? b0.toFixed(2) : '−' + Math.abs(b0).toFixed(2);
  b1Val.textContent = b1.toFixed(2);
}

function redraw() {
  drawLG();
  updateReadout();
}

// ----------------------------------------------------------------
// Controls
// ----------------------------------------------------------------
b0Slider.addEventListener('input', redraw);
b1Slider.addEventListener('input', redraw);

fitBtn.addEventListener('click', () => {
  fitBtn.textContent = 'Fitting…';
  fitBtn.disabled    = true;
  setTimeout(() => {
    const mle = fitMLE(lgData);
    b0Slider.value = Math.max(parseFloat(b0Slider.min), Math.min(parseFloat(b0Slider.max), mle.b0)).toFixed(2);
    b1Slider.value = Math.max(0, Math.min(parseFloat(b1Slider.max), mle.b1)).toFixed(2);
    fitBtn.textContent = 'Fit MLE';
    fitBtn.disabled    = false;
    redraw();
  }, 30);
});

resetBtn.addEventListener('click', () => {
  b0Slider.value = '-5.0';
  b1Slider.value = '1.0';
  redraw();
});

toggleOLS.addEventListener('click', () => {
  showOLS = !showOLS;
  toggleOLS.textContent = showOLS ? 'Hide OLS' : 'Show OLS';
  redraw();
});

// Initial render
redraw();
