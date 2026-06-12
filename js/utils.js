// Shared canvas utilities used by all correlation_regression demos.

const DPR = window.devicePixelRatio || 1;

function setupCanvas(el) {
  const w = +el.getAttribute('width'), h = +el.getAttribute('height');
  el.width  = w * DPR;
  el.height = h * DPR;
  el.style.width  = w + 'px';
  el.style.height = h + 'px';
  const ctx = el.getContext('2d');
  ctx.scale(DPR, DPR);
  return ctx;
}

// OLS on an array of {x, y} objects.  Returns {slope, intercept, meanY}.
function olsCoefficients(data) {
  const n     = data.length;
  const meanX = data.reduce((s, p) => s + p.x, 0) / n;
  const meanY = data.reduce((s, p) => s + p.y, 0) / n;
  const num   = data.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0);
  const den   = data.reduce((s, p) => s + Math.pow(p.x - meanX, 2), 0);
  const slope = num / den;
  return { slope, intercept: meanY - slope * meanX, meanY };
}
