// Demo A (Section 9): OLS residuals slider
// Requires: utils.js (setupCanvas, olsCoefficients)

const demoData = [
  {x: 1, y: 38}, {x: 2, y: 40}, {x: 2.5, y: 43}, {x: 3.5, y: 44},
  {x: 4, y: 45}, {x: 5, y: 48}, {x: 6, y: 51},   {x: 7, y: 50},
  {x: 8, y: 55}
];

const canvas        = document.getElementById('ols-canvas');
const ctx           = setupCanvas(canvas);
const slopeSlider   = document.getElementById('slope-slider');
const interceptSlider = document.getElementById('intercept-slider');
const slopeVal      = document.getElementById('slope-val');
const interceptVal  = document.getElementById('intercept-val');
const modelReadout  = document.getElementById('model-readout');
const sseReadout    = document.getElementById('sse-readout');
const r2Readout     = document.getElementById('r2-readout');
const sseMeterFill  = document.getElementById('sse-meter-fill');
const revealBtn     = document.getElementById('reveal-ols');
const resetBtn      = document.getElementById('reset-demo');

const ols    = olsCoefficients(demoData);
const maxSSE = 520;
const plot   = {left: 54, right: 24, top: 22, bottom: 46, width: 520, height: 360};

function px(x) { return plot.left + (x / 9) * (plot.width - plot.left - plot.right); }
function py(y) { return plot.height - plot.bottom - ((y - 30) / 30) * (plot.height - plot.top - plot.bottom); }

function stats(slope, intercept) {
  const sse = demoData.reduce((sum, p) => sum + Math.pow(p.y - (intercept + slope * p.x), 2), 0);
  const sst = demoData.reduce((sum, p) => sum + Math.pow(p.y - ols.meanY, 2), 0);
  return {sse, r2: Math.max(0, 1 - sse / sst)};
}

function draw() {
  const slope     = Number(slopeSlider.value);
  const intercept = Number(interceptSlider.value);
  const {sse, r2} = stats(slope, intercept);

  ctx.clearRect(0, 0, 520, 360);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 520, 360);

  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(plot.left, plot.top);
  ctx.lineTo(plot.left, plot.height - plot.bottom);
  ctx.lineTo(plot.width - plot.right, plot.height - plot.bottom);
  ctx.stroke();

  ctx.fillStyle = '#555';
  ctx.font      = '12px Source Sans 3, sans-serif';
  ctx.fillText('Training hours/week', 195, 350);
  ctx.save();
  ctx.translate(16, 224);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('VO2 max (ml/kg/min)', 0, 0);
  ctx.restore();

  ctx.strokeStyle = '#eef2f7';
  ctx.fillStyle   = '#64748b';
  for (let x = 0; x <= 8; x += 2) {
    ctx.beginPath();
    ctx.moveTo(px(x), plot.top);
    ctx.lineTo(px(x), plot.height - plot.bottom);
    ctx.stroke();
    ctx.fillText(String(x), px(x) - 4, 330);
  }
  for (let y = 30; y <= 60; y += 10) {
    ctx.beginPath();
    ctx.moveTo(plot.left, py(y));
    ctx.lineTo(plot.width - plot.right, py(y));
    ctx.stroke();
    ctx.fillText(String(y), 28, py(y) + 4);
  }

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth   = 2;
  demoData.forEach(p => {
    ctx.beginPath();
    ctx.moveTo(px(p.x), py(p.y));
    ctx.lineTo(px(p.x), py(intercept + slope * p.x));
    ctx.stroke();
  });

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth   = 3;
  ctx.beginPath();
  ctx.moveTo(px(0), py(intercept));
  ctx.lineTo(px(9), py(intercept + slope * 9));
  ctx.stroke();

  ctx.fillStyle = '#1a1a2e';
  demoData.forEach(p => {
    ctx.beginPath();
    ctx.arc(px(p.x), py(p.y), 5, 0, Math.PI * 2);
    ctx.fill();
  });

  slopeVal.textContent      = slope.toFixed(1);
  interceptVal.textContent  = intercept.toFixed(1);
  modelReadout.textContent  = `VO2 max = ${intercept.toFixed(1)} + ${slope.toFixed(1)}(hours)`;
  sseReadout.textContent    = sse.toFixed(1);
  r2Readout.textContent     = r2.toFixed(3);
  sseMeterFill.style.width  = Math.min(100, (sse / maxSSE) * 100).toFixed(1) + '%';
}

slopeSlider.addEventListener('input', draw);
interceptSlider.addEventListener('input', draw);

revealBtn.addEventListener('click', () => {
  slopeSlider.value     = ols.slope.toFixed(1);
  interceptSlider.value = (Math.round(ols.intercept * 2) / 2).toFixed(1);
  draw();
});

resetBtn.addEventListener('click', () => {
  slopeSlider.value     = '1.4';
  interceptSlider.value = '37';
  draw();
});

draw();
