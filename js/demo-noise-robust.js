// Demo B (Section 9): Noise model vs. robust regression comparison
// Requires: utils.js (setupCanvas, olsCoefficients)

const robustCanvas     = document.getElementById('robust-canvas');
const robustCtx        = setupCanvas(robustCanvas);
const noiseModel       = document.getElementById('noise-model');
const noiseSigma       = document.getElementById('noise-sigma');
const outlierProb      = document.getElementById('outlier-prob');
const noiseSigmaVal    = document.getElementById('noise-sigma-val');
const outlierProbVal   = document.getElementById('outlier-prob-val');
const regenerateNoise  = document.getElementById('regenerate-noise');
const trueLineReadout  = document.getElementById('true-line-readout');
const l2Readout        = document.getElementById('l2-readout');
const l1Readout        = document.getElementById('l1-readout');
const huberReadout     = document.getElementById('huber-readout');

const trueRobustLine = {slope: 1.8, intercept: 5.5};
const robustPlot     = {left: 54, right: 24, top: 22, bottom: 46, width: 520, height: 360};
let robustSeed = 11;
let robustData = [];

function seededRandom(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function gaussian(rand) {
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function weightedLine(data, weightFn, iterations = 30) {
  let fit = olsCoefficients(data);
  for (let iter = 0; iter < iterations; iter++) {
    let sw = 0, swx = 0, swy = 0, swxx = 0, swxy = 0;
    data.forEach(p => {
      const residual = p.y - (fit.intercept + fit.slope * p.x);
      const w = weightFn(residual);
      sw   += w;
      swx  += w * p.x;
      swy  += w * p.y;
      swxx += w * p.x * p.x;
      swxy += w * p.x * p.y;
    });
    const den = sw * swxx - swx * swx;
    if (Math.abs(den) < 1e-9) break;
    const slope     = (sw * swxy - swx * swy) / den;
    const intercept = (swy - slope * swx) / sw;
    if (Math.abs(slope - fit.slope) + Math.abs(intercept - fit.intercept) < 1e-5) {
      fit = {slope, intercept};
      break;
    }
    fit = {slope, intercept};
  }
  return fit;
}

function robustLoss(data, fit, type) {
  const delta = 1.5;
  const total = data.reduce((sum, p) => {
    const r  = p.y - (fit.intercept + fit.slope * p.x);
    if (type === 'l2') return sum + r * r;
    if (type === 'l1') return sum + Math.abs(r);
    const ar = Math.abs(r);
    return sum + (ar <= delta ? 0.5 * r * r : delta * (ar - 0.5 * delta));
  }, 0);
  return total / data.length;
}

function generateRobustData() {
  const rand  = seededRandom(robustSeed);
  const sigma = Number(noiseSigma.value);
  const prob  = Number(outlierProb.value);
  const mode  = noiseModel.value;
  robustData  = [];

  for (let i = 0; i < 42; i++) {
    const x = 0.3 + rand() * 9.2;
    let noise     = gaussian(rand) * sigma;
    let isOutlier = false;

    if (mode === 'heavy') {
      const scale = rand() < prob ? 6 : 1;
      noise       = gaussian(rand) * sigma * scale;
      isOutlier   = scale > 1;
    }
    if (mode === 'outlier' && rand() < prob) {
      noise     = (rand() < 0.5 ? -1 : 1) * (8 + rand() * 10) * sigma;
      isOutlier = true;
    }

    robustData.push({
      x,
      y: trueRobustLine.intercept + trueRobustLine.slope * x + noise,
      isOutlier
    });
  }
}

function rpx(x) {
  return robustPlot.left + (x / 10) * (robustPlot.width - robustPlot.left - robustPlot.right);
}
function rpy(y) {
  return robustPlot.height - robustPlot.bottom
    - ((y + 6) / 34) * (robustPlot.height - robustPlot.top - robustPlot.bottom);
}

function drawRobustDemo() {
  noiseSigmaVal.textContent  = Number(noiseSigma.value).toFixed(1);
  outlierProbVal.textContent = Number(outlierProb.value).toFixed(2);
  generateRobustData();

  const l2Fit    = olsCoefficients(robustData);
  const l1Fit    = weightedLine(robustData, r => 1 / Math.max(Math.abs(r), 0.25));
  const huberFit = weightedLine(robustData, r => {
    const ar = Math.abs(r);
    return ar <= 1.5 ? 1 : 1.5 / Math.max(ar, 1e-6);
  });

  robustCtx.clearRect(0, 0, 520, 360);
  robustCtx.fillStyle = '#fff';
  robustCtx.fillRect(0, 0, 520, 360);

  robustCtx.strokeStyle = '#d4d4d8';
  robustCtx.lineWidth   = 1;
  robustCtx.beginPath();
  robustCtx.moveTo(robustPlot.left, robustPlot.top);
  robustCtx.lineTo(robustPlot.left, robustPlot.height - robustPlot.bottom);
  robustCtx.lineTo(robustPlot.width - robustPlot.right, robustPlot.height - robustPlot.bottom);
  robustCtx.stroke();

  robustCtx.strokeStyle = '#eef2f7';
  robustCtx.fillStyle   = '#64748b';
  robustCtx.font        = '12px Source Sans 3, sans-serif';
  for (let x = 0; x <= 10; x += 2) {
    robustCtx.beginPath();
    robustCtx.moveTo(rpx(x), robustPlot.top);
    robustCtx.lineTo(rpx(x), robustPlot.height - robustPlot.bottom);
    robustCtx.stroke();
    robustCtx.fillText(String(x), rpx(x) - 4, 330);
  }
  for (let y = 0; y <= 20; y += 5) {
    robustCtx.beginPath();
    robustCtx.moveTo(robustPlot.left, rpy(y));
    robustCtx.lineTo(robustPlot.width - robustPlot.right, rpy(y));
    robustCtx.stroke();
    robustCtx.fillText(String(y), 30, rpy(y) + 4);
  }

  robustCtx.fillStyle = '#555';
  robustCtx.fillText('X from underlying linear process', 176, 350);
  robustCtx.save();
  robustCtx.translate(16, 220);
  robustCtx.rotate(-Math.PI / 2);
  robustCtx.fillText('Observed Y', 0, 0);
  robustCtx.restore();

  function drawLine(fit, color, width, dash = []) {
    robustCtx.save();
    robustCtx.strokeStyle = color;
    robustCtx.lineWidth   = width;
    robustCtx.setLineDash(dash);
    robustCtx.beginPath();
    robustCtx.moveTo(rpx(0),  rpy(fit.intercept));
    robustCtx.lineTo(rpx(10), rpy(fit.intercept + fit.slope * 10));
    robustCtx.stroke();
    robustCtx.restore();
  }

  drawLine(trueRobustLine, '#1a1a2e', 2, [6, 5]);
  drawLine(l2Fit,          '#2563eb', 3);
  drawLine(l1Fit,          '#059669', 3);
  drawLine(huberFit,       '#dc2626', 3);

  robustData.forEach(p => {
    robustCtx.beginPath();
    robustCtx.fillStyle = p.isOutlier ? '#d97706' : '#1a1a2e';
    robustCtx.arc(rpx(p.x), rpy(p.y), p.isOutlier ? 5 : 4, 0, Math.PI * 2);
    robustCtx.fill();
  });

  trueLineReadout.textContent = `y = ${trueRobustLine.intercept.toFixed(1)} + ${trueRobustLine.slope.toFixed(1)}x`;
  l2Readout.textContent       = `y = ${l2Fit.intercept.toFixed(2)} + ${l2Fit.slope.toFixed(2)}x; MSE ${robustLoss(robustData, l2Fit, 'l2').toFixed(2)}`;
  l1Readout.textContent       = `y = ${l1Fit.intercept.toFixed(2)} + ${l1Fit.slope.toFixed(2)}x; MAE ${robustLoss(robustData, l1Fit, 'l1').toFixed(2)}`;
  huberReadout.textContent    = `y = ${huberFit.intercept.toFixed(2)} + ${huberFit.slope.toFixed(2)}x; Huber ${robustLoss(robustData, huberFit, 'huber').toFixed(2)}`;
}

noiseModel.addEventListener('change', drawRobustDemo);
noiseSigma.addEventListener('input',  drawRobustDemo);
outlierProb.addEventListener('input', drawRobustDemo);
regenerateNoise.addEventListener('click', () => {
  robustSeed += 1;
  drawRobustDemo();
});

drawRobustDemo();
