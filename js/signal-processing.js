(function () {
  const AXIS = '#64748b';
  const GRID = '#e5e7eb';
  const BLUE = '#2563eb';
  const ORANGE = '#d97706';
  const GREEN = '#059669';
  const RED = '#dc2626';
  const TEXT = '#1a1a2e';

  function get(id) {
    return document.getElementById(id);
  }

  function setupHiDpiCanvas(canvas) {
    const width = Number(canvas.getAttribute('width'));
    const height = Number(canvas.getAttribute('height'));
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, width, height };
  }

  function drawAxes(ctx, plot, xLabel, yLabel) {
    ctx.save();
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = plot.top + (plot.height * i) / 4;
      ctx.beginPath();
      ctx.moveTo(plot.left, y);
      ctx.lineTo(plot.left + plot.width, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 5; i += 1) {
      const x = plot.left + (plot.width * i) / 5;
      ctx.beginPath();
      ctx.moveTo(x, plot.top);
      ctx.lineTo(x, plot.top + plot.height);
      ctx.stroke();
    }

    ctx.strokeStyle = AXIS;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(plot.left, plot.top);
    ctx.lineTo(plot.left, plot.top + plot.height);
    ctx.lineTo(plot.left + plot.width, plot.top + plot.height);
    ctx.stroke();

    ctx.fillStyle = TEXT;
    ctx.font = '13px Source Sans 3, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, plot.left + plot.width / 2, plot.top + plot.height + 34);
    ctx.save();
    ctx.translate(17, plot.top + plot.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
    ctx.restore();
  }

  function pathLine(ctx, points, color, width, dashed) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (dashed) ctx.setLineDash(dashed);
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  function drawDot(ctx, x, y, radius, color, stroke) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  function formatV(value) {
    if (Math.abs(value) >= 1) return value.toFixed(2) + ' V';
    return (value * 1000).toFixed(1) + ' mV';
  }

  function initQuantizationDemo() {
    const canvas = get('quant-canvas');
    if (!canvas) return;

    const bitsSlider = get('q-bits');
    const rangeSelect = get('q-range');
    const gainSlider = get('q-gain');
    const bitsVal = get('q-bits-val');
    const gainVal = get('q-gain-val');
    const levelsEl = get('q-levels');
    const stepEl = get('q-step');
    const errorEl = get('q-error');
    const clippingEl = get('q-clipping');
    const { ctx, width, height } = setupHiDpiCanvas(canvas);
    const plot = { left: 54, top: 24, width: width - 78, height: height - 78 };
    const duration = 1;
    const freq = 3;
    const quantizedTraceRate = 240;
    const sampleDotRate = 36;

    function draw() {
      const bits = Number(bitsSlider.value);
      const adcRange = Number(rangeSelect.value);
      const amp = Number(gainSlider.value);
      const minV = -adcRange / 2;
      const maxV = adcRange / 2;
      const levels = Math.pow(2, bits);
      const qStep = (maxV - minV) / (levels - 1);
      const yMin = -10.5;
      const yMax = 10.5;
      let absErrorSum = 0;
      let clipped = 0;

      const xMap = (t) => plot.left + (t / duration) * plot.width;
      const yMap = (v) => plot.top + ((yMax - v) / (yMax - yMin)) * plot.height;
      const analog = [];
      const quantizedTrace = [];
      const sampleDots = [];

      function quantizeVoltage(v) {
        const bounded = Math.max(minV, Math.min(maxV, v));
        const code = Math.round((bounded - minV) / qStep);
        return {
          value: minV + code * qStep,
          clipped: bounded !== v
        };
      }

      for (let i = 0; i <= 500; i += 1) {
        const t = (duration * i) / 500;
        const v = amp * Math.sin(2 * Math.PI * freq * t);
        analog.push({ x: xMap(t), y: yMap(v) });
      }

      for (let i = 0; i <= quantizedTraceRate * duration; i += 1) {
        const t = i / quantizedTraceRate;
        const trueV = amp * Math.sin(2 * Math.PI * freq * t);
        const quantized = quantizeVoltage(trueV);
        const qV = quantized.value;
        if (quantized.clipped) clipped += 1;
        absErrorSum += Math.abs(trueV - qV);
        quantizedTrace.push({ t, trueV, qV, x: xMap(t), y: yMap(qV) });
      }

      for (let i = 0; i <= sampleDotRate * duration; i += 1) {
        const t = i / sampleDotRate;
        const trueV = amp * Math.sin(2 * Math.PI * freq * t);
        const qV = quantizeVoltage(trueV).value;
        sampleDots.push({ t, trueV, qV, x: xMap(t), y: yMap(qV) });
      }

      ctx.clearRect(0, 0, width, height);
      drawAxes(ctx, plot, 'Time (s)', 'Voltage');

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(plot.left, yMap(maxV), plot.width, Math.max(0, yMap(minV) - yMap(maxV)));
      ctx.strokeStyle = '#cbd5e1';
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(plot.left, yMap(maxV));
      ctx.lineTo(plot.left + plot.width, yMap(maxV));
      ctx.moveTo(plot.left, yMap(minV));
      ctx.lineTo(plot.left + plot.width, yMap(minV));
      ctx.stroke();
      ctx.setLineDash([]);

      if (levels <= 32) {
        ctx.save();
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.14)';
        ctx.lineWidth = 1;
        for (let i = 0; i < levels; i += 1) {
          const levelV = minV + i * qStep;
          ctx.beginPath();
          ctx.moveTo(plot.left, yMap(levelV));
          ctx.lineTo(plot.left + plot.width, yMap(levelV));
          ctx.stroke();
        }
        ctx.restore();
      }

      pathLine(ctx, analog, BLUE, 2.5);

      ctx.save();
      ctx.strokeStyle = ORANGE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      quantizedTrace.forEach((p, i) => {
        if (i === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          const prev = quantizedTrace[i - 1];
          ctx.lineTo(p.x, prev.y);
          ctx.lineTo(p.x, p.y);
        }
      });
      ctx.stroke();
      ctx.restore();

      sampleDots.forEach((p) => drawDot(ctx, p.x, p.y, 3.3, ORANGE, '#fff'));

      ctx.fillStyle = AXIS;
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(maxV.toFixed(1) + ' V', plot.left - 8, yMap(maxV) + 4);
      ctx.fillText(minV.toFixed(1) + ' V', plot.left - 8, yMap(minV) + 4);
      ctx.fillText('0 V', plot.left - 8, yMap(0) + 4);

      bitsVal.textContent = bits + '-bit';
      gainVal.textContent = amp.toFixed(1) + ' V';
      levelsEl.textContent = levels.toLocaleString();
      stepEl.textContent = formatV(qStep);
      errorEl.textContent = formatV(absErrorSum / quantizedTrace.length);
      clippingEl.innerHTML = clipped
        ? '<span class="readout-danger">' + clipped + ' samples clipped</span>'
        : '<span class="readout-ok">none</span>';
    }

    [bitsSlider, rangeSelect, gainSlider].forEach((el) => el.addEventListener('input', draw));
    draw();
  }

  function aliasFrequency(signalFreq, samplingRate) {
    const folded = ((signalFreq + samplingRate / 2) % samplingRate + samplingRate) % samplingRate - samplingRate / 2;
    return folded;
  }

  function initAliasingDemo() {
    const canvas = get('alias-canvas');
    if (!canvas) return;

    const signalSlider = get('a-signal');
    const fsSlider = get('a-fs');
    const signalVal = get('a-signal-val');
    const fsVal = get('a-fs-val');
    const nyquistEl = get('a-nyquist');
    const ruleEl = get('a-rule');
    const aliasEl = get('a-alias');
    const statusEl = get('a-status');
    const goodBtn = get('a-good');
    const badBtn = get('a-bad');
    const { ctx, width, height } = setupHiDpiCanvas(canvas);
    const plotTop = { left: 54, top: 38, width: width - 78, height: 150 };
    const plotBottom = { left: 54, top: 268, width: width - 78, height: 150 };
    const duration = 1;

    function drawPanelTitle(label, plot) {
      ctx.save();
      ctx.fillStyle = TEXT;
      ctx.font = '700 13px Source Sans 3, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, plot.left, plot.top - 13);
      ctx.restore();
    }

    function draw() {
      const f = Number(signalSlider.value);
      const fs = Number(fsSlider.value);
      const nyquist = fs / 2;
      const fAlias = aliasFrequency(f, fs);
      const apparentFrequency = Math.abs(fAlias);
      const yMin = -1.35;
      const yMax = 1.35;
      const xMap = (t, plot) => plot.left + (t / duration) * plot.width;
      const yMap = (v, plot) => plot.top + ((yMax - v) / (yMax - yMin)) * plot.height;
      const trueWave = [];
      const apparentWave = [];
      const samples = [];

      for (let i = 0; i <= 1000; i += 1) {
        const t = (duration * i) / 1000;
        trueWave.push({
          x: xMap(t, plotTop),
          y: yMap(Math.sin(2 * Math.PI * f * t), plotTop)
        });
        apparentWave.push({
          x: xMap(t, plotBottom),
          y: yMap(Math.sin(2 * Math.PI * fAlias * t), plotBottom)
        });
      }

      for (let i = 0; i <= fs * duration; i += 1) {
        const t = i / fs;
        const value = Math.sin(2 * Math.PI * f * t);
        samples.push({
          xTop: xMap(t, plotTop),
          yTop: yMap(value, plotTop),
          xBottom: xMap(t, plotBottom),
          yBottom: yMap(value, plotBottom)
        });
      }

      ctx.clearRect(0, 0, width, height);
      drawAxes(ctx, plotTop, '', 'Amplitude');
      drawAxes(ctx, plotBottom, 'Time (s)', 'Amplitude');
      drawPanelTitle('Original signal with sampling points', plotTop);
      drawPanelTitle('Reconstructed signal from the sampled points', plotBottom);
      pathLine(ctx, trueWave, BLUE, 2.3);
      pathLine(ctx, apparentWave, GREEN, 2.4, fs > 2 * f ? null : [7, 5]);

      samples.forEach((p, i) => {
        ctx.save();
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.xTop, plotTop.top);
        ctx.lineTo(p.xTop, plotTop.top + plotTop.height);
        ctx.moveTo(p.xBottom, plotBottom.top);
        ctx.lineTo(p.xBottom, plotBottom.top + plotBottom.height);
        ctx.stroke();
        ctx.restore();

        if (i > 0) {
          const prev = samples[i - 1];
          ctx.save();
          ctx.strokeStyle = ORANGE;
          ctx.lineWidth = 1.7;
          ctx.beginPath();
          ctx.moveTo(prev.xTop, prev.yTop);
          ctx.lineTo(p.xTop, p.yTop);
          ctx.stroke();
          ctx.restore();
        }
        drawDot(ctx, p.xTop, p.yTop, 4, ORANGE, '#fff');
        drawDot(ctx, p.xBottom, p.yBottom, 4, ORANGE, '#fff');
      });

      ctx.fillStyle = AXIS;
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      [plotTop, plotBottom].forEach((plot) => {
        ctx.fillText('+1', plot.left - 8, yMap(1, plot) + 4);
        ctx.fillText('0', plot.left - 8, yMap(0, plot) + 4);
        ctx.fillText('-1', plot.left - 8, yMap(-1, plot) + 4);
      });

      signalVal.textContent = f + ' Hz';
      fsVal.textContent = fs + ' Hz';
      nyquistEl.textContent = nyquist.toFixed(1) + ' Hz';
      ruleEl.innerHTML = fs > 2 * f
        ? '<span class="readout-ok">' + fs + ' Hz > 2 x ' + f + ' Hz</span>'
        : '<span class="readout-danger">' + fs + ' Hz <= 2 x ' + f + ' Hz</span>';
      aliasEl.textContent = apparentFrequency.toFixed(1) + ' Hz';
      statusEl.innerHTML = fs > 2 * f
        ? '<span class="readout-ok">safe for this sine wave</span>'
        : '<span class="readout-danger">aliasing risk</span>';
    }

    signalSlider.addEventListener('input', draw);
    fsSlider.addEventListener('input', draw);
    goodBtn.addEventListener('click', () => {
      const f = Number(signalSlider.value);
      fsSlider.value = Math.min(80, Math.max(4, Math.ceil(4 * f)));
      draw();
    });
    badBtn.addEventListener('click', () => {
      const f = Number(signalSlider.value);
      fsSlider.value = Math.max(4, Math.round(1.5 * f));
      draw();
    });
    draw();
  }

  initQuantizationDemo();
  initAliasingDemo();
}());
