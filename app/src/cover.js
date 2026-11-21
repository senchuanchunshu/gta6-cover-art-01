// Vice Cover Studio — procedural cover renderer.
// Everything on the cover is drawn in code: gradient skies, a striped retro
// sun, a generated skyline, palm silhouettes, panel photos, bold double-stroke
// lettering and film grain. No image, font or logo is borrowed from any game.

export const LAYOUTS = {
  hero: { name: 'Hero Left', panels: 3 },
  columns: { name: 'Three Columns', panels: 3 },
  banner: { name: 'Wide Banner', panels: 3 },
};

export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    skyTop: '#2b1055', skyMid: '#ff5e7a', skyLow: '#ff9a3d',
    sun: '#ffd76a', sunCore: '#fff3b0', haze: '#ff7e5f',
    titleFill: '#ffffff', titleEdge: '#ff2e88', titleCore: '#1a1033',
    band: '#160a2e', accent: '#ffd76a', stars: 0,
  },
  neon: {
    name: 'Neon Night',
    skyTop: '#05081f', skyMid: '#3b0f6e', skyLow: '#ff2e88',
    sun: '#00e5ff', sunCore: '#b8fff9', haze: '#b537f2',
    titleFill: '#e8fbff', titleEdge: '#ff2e88', titleCore: '#12002e',
    band: '#0a0618', accent: '#00e5ff', stars: 90,
  },
  gold: {
    name: 'Golden Hour',
    skyTop: '#0f2e26', skyMid: '#8a5a1d', skyLow: '#f5c95c',
    sun: '#fff3b0', sunCore: '#ffffff', haze: '#e8a33d',
    titleFill: '#fff8dc', titleEdge: '#0f2e26', titleCore: '#7a4d12',
    band: '#12241c', accent: '#f5c95c', stars: 24,
  },
};

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide · 1920 × 1080' },
};

// Small deterministic pseudo-random stream so the skyline is stable per grade.
export function seededRandom(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeNoiseTile() {
  const tile = document.createElement('canvas');
  tile.width = 140; tile.height = 140;
  const g = tile.getContext('2d');
  const img = g.createImageData(140, 140);
  const rnd = seededRandom(20261120);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return tile;
}

let noiseTile = null;
function grainTile() {
  if (!noiseTile) noiseTile = makeNoiseTile();
  return noiseTile;
}

// Panel rectangles for a layout, in fractions of the cover (x, y, w, h).
// The bottom band is reserved for the title block.
export function panelRects(layout, W, H) {
  const bandH = H * 0.20;
  const stripH = H * 0.095; // Open sky strip: the sunset shows above the panels.
  const bottom = H - bandH;
  const gap = Math.round(W * 0.012);
  const pad = Math.round(W * 0.016);
  const availW = W - pad * 2;
  const top = stripH + pad * 0.5;
  const availH = bottom - top - pad;
  if (layout === 'columns') {
    const cw = (availW - gap * 2) / 3;
    return [0, 1, 2].map((i) => ({
      x: pad + i * (cw + gap), y: top, w: cw, h: availH,
    }));
  }
  if (layout === 'banner') {
    const topH = availH * 0.58;
    const botH = availH - topH - gap;
    const half = (availW - gap) / 2;
    return [
      { x: pad, y: top, w: availW, h: topH },
      { x: pad, y: top + topH + gap, w: half, h: botH },
      { x: pad + half + gap, y: top + topH + gap, w: half, h: botH },
    ];
  }
  // hero: big panel left, two stacked panels right.
  const leftW = availW * 0.60;
  const rightW = availW - leftW - gap;
  const halfH = (availH - gap) / 2;
  return [
    { x: pad, y: top, w: leftW, h: availH },
    { x: pad + leftW + gap, y: top, w: rightW, h: halfH },
    { x: pad + leftW + gap, y: top + halfH + gap, w: rightW, h: halfH },
  ];
}

function drawSky(ctx, W, H, grade) {
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.82);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.52, grade.skyMid);
  sky.addColorStop(1, grade.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  if (grade.stars > 0) {
    const rnd = seededRandom(77);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < grade.stars; i++) {
      const x = rnd() * W, y = rnd() * H * 0.34, r = rnd() * 1.6 + 0.5;
      ctx.globalAlpha = 0.25 + rnd() * 0.6;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawRetroSun(ctx, W, H, grade) {
  // The sun sits in the open sky strip, half-hidden behind the panels below.
  const cx = W * 0.5, cy = H * 0.095, r = Math.min(W, H) * 0.17;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.9);
  glow.addColorStop(0, grade.sunCore + '55');
  glow.addColorStop(0.5, grade.haze + '33');
  glow.addColorStop(1, grade.haze + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  const sunGrad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  sunGrad.addColorStop(0, grade.sunCore);
  sunGrad.addColorStop(0.55, grade.sun);
  sunGrad.addColorStop(1, grade.haze);
  ctx.fillStyle = sunGrad;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Retro slits across the lower half of the sun.
  ctx.fillStyle = grade.skyMid;
  let y = cy + r * 0.08, slit = r * 0.045;
  while (y < cy + r) {
    ctx.globalAlpha = 0.85;
    ctx.fillRect(cx - r, y, r * 2, slit);
    y += slit + r * 0.13;
    slit *= 1.55;
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawSkyline(ctx, W, H, grade, seed) {
  const rnd = seededRandom(seed);
  const base = H * 0.095; // Building tops rise out of the sky strip.
  // Keep a clear window around the sun so it is never hidden by a block.
  const sunCx = W * 0.5, sunR = Math.min(W, H) * 0.17;
  const inSunWindow = (x, w) => x + w > sunCx - sunR * 0.95 && x < sunCx + sunR * 0.95;
  ctx.fillStyle = 'rgba(20,8,40,0.55)';
  let x = 0;
  while (x < W) {
    const bw = W * (0.04 + rnd() * 0.07);
    const bh = H * (0.05 + rnd() * 0.13);
    if (!inSunWindow(x, bw)) {
      ctx.fillRect(x, base - bh, bw, bh + H * 0.2);
    }
    // A few lit windows on taller blocks (only where the block was drawn).
    if (bh > H * 0.11 && !inSunWindow(x, bw)) {
      ctx.fillStyle = grade.accent;
      ctx.globalAlpha = 0.75;
      for (let k = 0; k < 5; k++) {
        if (rnd() > 0.5) ctx.fillRect(x + bw * (0.15 + rnd() * 0.6), base - bh + rnd() * bh * 0.7, 3, 4);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(20,8,40,0.55)';
    }
    x += bw + W * 0.008;
  }
  // Nearer, darker row in front.
  ctx.fillStyle = '#14082a';
  x = -W * 0.02;
  while (x < W) {
    const bw = W * (0.06 + rnd() * 0.09);
    const bh = H * (0.03 + rnd() * 0.07);
    if (!inSunWindow(x, bw)) ctx.fillRect(x, base - bh + H * 0.02, bw, bh + H * 0.2);
    x += bw + W * 0.01;
  }
}

function drawPalm(ctx, x, baseY, s, lean) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.rotate(lean);
  ctx.scale(s, s);
  ctx.strokeStyle = '#12061f';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -52, 16, -96);
  ctx.stroke();
  ctx.fillStyle = '#12061f';
  ctx.translate(16, -96);
  for (let i = 0; i < 7; i++) {
    const a = (-Math.PI * 0.92) + (i * Math.PI * 0.30);
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(34, -12, 62, 10);
    ctx.quadraticCurveTo(30, 2, 0, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawBackground(ctx, W, H, grade, layoutSeed) {
  drawSky(ctx, W, H, grade);
  drawSkyline(ctx, W, H, grade, layoutSeed);
  drawRetroSun(ctx, W, H, grade);
  const stripBase = H * 0.095;
  drawPalm(ctx, W * 0.045, stripBase, Math.min(W, H) * 0.00085, -0.10);
  drawPalm(ctx, W * 0.955, stripBase, Math.min(W, H) * 0.0010, 0.12);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPanelPhoto(ctx, rect, panel, grade) {
  const r = Math.max(6, rect.w * 0.02);
  ctx.save();
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, r);
  ctx.clip();
  if (panel && panel.img) {
    const img = panel.img;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const base = Math.max(rect.w / iw, rect.h / ih);
    const scale = base * (panel.scale || 1);
    const dw = iw * scale, dh = ih * scale;
    // Centre horizontally; vertically favour the top of the photo (faces sit
    // high), so a wide, short panel shows heads instead of torsos by default.
    const dx = rect.x + (rect.w - dw) / 2 + (panel.dx || 0);
    const dy = dh > rect.h
      ? rect.y - (dh - rect.h) * 0.30 + (panel.dy || 0)
      : rect.y + (rect.h - dh) / 2 + (panel.dy || 0);
    ctx.drawImage(img, dx, dy, dw, dh);
    // Warm grade tint so photos sit in the sunset.
    ctx.fillStyle = grade.haze;
    ctx.globalAlpha = 0.10;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalAlpha = 1;
  } else {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    g.addColorStop(0, grade.skyMid);
    g.addColorStop(1, grade.band);
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 ${Math.max(13, rect.w * 0.055)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+ Add photo', rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
  // Inner shade at the panel's foot so photos read as one poster.
  const shade = ctx.createLinearGradient(0, rect.y + rect.h * 0.62, 0, rect.y + rect.h);
  shade.addColorStop(0, 'rgba(10,4,24,0)');
  shade.addColorStop(1, 'rgba(10,4,24,0.38)');
  ctx.fillStyle = shade;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  // Crisp white frame, thicker on the selected panel (editor only).
  ctx.save();
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, r);
  ctx.strokeStyle = panel && panel.selected ? grade.accent : 'rgba(255,255,255,0.92)';
  ctx.lineWidth = panel && panel.selected ? Math.max(4, rect.w * 0.012) : Math.max(2, rect.w * 0.006);
  ctx.stroke();
  ctx.restore();
}

function fitTitleFont(ctx, text, maxW, startPx) {
  let px = startPx;
  ctx.font = `900 ${px}px "Arial Black", "Helvetica Neue", system-ui, sans-serif`;
  while (px > 24 && ctx.measureText(text).width > maxW) {
    px -= 4;
    ctx.font = `900 ${px}px "Arial Black", "Helvetica Neue", system-ui, sans-serif`;
  }
  return px;
}

function drawTitleBlock(ctx, W, H, grade, title, subtitle) {
  const bandY = H * 0.80;
  const band = ctx.createLinearGradient(0, bandY, 0, H);
  band.addColorStop(0, grade.band + '00');
  band.addColorStop(0.18, grade.band);
  band.addColorStop(1, '#0b0616');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, W, H - bandY);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(W * 0.05, bandY + H * 0.028, W * 0.09, Math.max(3, H * 0.006));

  const words = (title || 'VICE HEIST').toUpperCase();
  const maxW = W * 0.90;
  const px = fitTitleFont(ctx, words, maxW, H * 0.105);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  try { ctx.letterSpacing = `${Math.max(1, px * 0.015)}px`; } catch (e) { /* older canvas */ }
  const ty = bandY + H * 0.135;
  ctx.lineJoin = 'round';
  // Outer neon edge, then dark core stroke, then the fill.
  ctx.lineWidth = px * 0.16;
  ctx.strokeStyle = grade.titleEdge;
  ctx.strokeText(words, W * 0.05, ty);
  ctx.lineWidth = px * 0.07;
  ctx.strokeStyle = grade.titleCore;
  ctx.strokeText(words, W * 0.05, ty);
  ctx.fillStyle = grade.titleFill;
  ctx.fillText(words, W * 0.05, ty);
  try { ctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }

  if (subtitle) {
    ctx.font = `600 ${Math.max(14, H * 0.026)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(subtitle, W * 0.05, ty + H * 0.052);
  }
}

function drawGrain(ctx, W, H) {
  const pattern = ctx.createPattern(grainTile(), 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const vig = ctx.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.42, W / 2, H * 0.5, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(8,2,18,0.34)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

// Full cover render. `state` holds layout, grade key, title, subtitle and
// panels [{img, scale, dx, dy}]. `forExport` hides the selection frame.
export function renderCover(ctx, W, H, state, forExport) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const seed = state.layout === 'columns' ? 41 : state.layout === 'banner' ? 97 : 13;
  drawBackground(ctx, W, H, grade, seed);
  const rects = panelRects(state.layout, W, H);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] || null;
    const shown = panel ? { ...panel, selected: !forExport && i === state.selected } : null;
    drawPanelPhoto(ctx, rect, shown, grade);
  });
  drawTitleBlock(ctx, W, H, grade, state.title, state.subtitle);
  drawGrain(ctx, W, H);
  return rects;
}

export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')); };
    img.src = url;
  });
}

export function loadImageUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load ' + url));
    img.src = url;
  });
}
