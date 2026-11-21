// Vice Cover Studio — editor wiring.
// Owns the state, the preview canvas, panel picking (click to select, drag to
// pan a photo, wheel to zoom), uploads, samples, the one-click fill and PNG
// export. The drawing itself lives in cover.js.

import { GRADES, LAYOUTS, SIZES, loadImageFile, loadImageUrl, panelRects, renderCover } from './cover.js';

const $ = (id) => document.getElementById(id);

export const state = {
  layout: 'hero',
  grade: 'sunset',
  size: '1080x1080',
  title: 'VICE HEIST',
  subtitle: 'one last job under the sunset',
  panels: [{ img: null, scale: 1, dx: 0, dy: 0 }, { img: null, scale: 1, dx: 0, dy: 0 }, { img: null, scale: 1, dx: 0, dy: 0 }],
  selected: 0,
};

const canvas = $('preview');
const ctx = canvas.getContext('2d');
let lastRects = [];

function previewSize() {
  const size = SIZES[state.size];
  const long = 640;
  if (size.w >= size.h) return { w: long, h: Math.round(long * size.h / size.w) };
  return { w: Math.round(long * size.w / size.h), h: long };
}

export function redraw() {
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  lastRects = renderCover(ctx, w, h, state, false);
  updatePanelButtons();
}

function updatePanelButtons() {
  document.querySelectorAll('[data-panel]').forEach((btn) => {
    const i = Number(btn.dataset.panel);
    btn.classList.toggle('active', i === state.selected);
    btn.textContent = `Panel ${i + 1}${state.panels[i].img ? ' · photo set' : ''}`;
  });
  const selected = state.panels[state.selected];
  $('fillBtn').disabled = !selected.img;
  $('allBtn').disabled = !selected.img;
}

function buildPickers() {
  const layoutBox = $('layoutPicker');
  Object.entries(LAYOUTS).forEach(([key, layout]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip' + (key === state.layout ? ' active' : '');
    btn.textContent = layout.name;
    btn.addEventListener('click', () => {
      state.layout = key;
      layoutBox.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      redraw();
    });
    layoutBox.appendChild(btn);
  });

  const gradeBox = $('gradePicker');
  Object.entries(GRADES).forEach(([key, grade]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip swatch' + (key === state.grade ? ' active' : '');
    btn.innerHTML = `<span class="dot" style="background:linear-gradient(135deg,${grade.skyMid},${grade.skyLow})"></span>${grade.name}`;
    btn.addEventListener('click', () => {
      state.grade = key;
      gradeBox.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      redraw();
    });
    gradeBox.appendChild(btn);
  });

  const sizeBox = $('sizePicker');
  Object.entries(SIZES).forEach(([key, size]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip' + (key === state.size ? ' active' : '');
    btn.textContent = size.label;
    btn.addEventListener('click', () => {
      state.size = key;
      sizeBox.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      redraw();
    });
    sizeBox.appendChild(btn);
  });
}

function setPanelPhoto(i, img) {
  state.panels[i] = { img, scale: 1, dx: 0, dy: 0 };
  state.selected = i;
  redraw();
}

function bindControls() {
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });

  document.querySelectorAll('[data-panel]').forEach((btn) => {
    btn.addEventListener('click', () => { state.selected = Number(btn.dataset.panel); redraw(); });
  });

  const fileInput = $('fileInput');
  $('uploadBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    try {
      const img = await loadImageFile(file);
      setPanelPhoto(state.selected, img);
      setStatus(`Photo loaded into Panel ${state.selected + 1}. Drag it to crop, scroll to zoom.`);
    } catch (err) {
      setStatus('That file could not be read as an image.');
    }
    fileInput.value = '';
  });

  document.querySelectorAll('[data-sample]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const img = await loadImageUrl(btn.dataset.sample);
        setPanelPhoto(state.selected, img);
        setStatus(`Sample photo placed in Panel ${state.selected + 1}.`);
      } catch (err) {
        setStatus('Sample photo failed to load.');
      }
    });
  });

  $('fillBtn').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    if (!panel.img) return;
    panel.scale = 1; panel.dx = 0; panel.dy = 0;
    redraw();
    setStatus(`Panel ${state.selected + 1} filled edge to edge.`);
  });

  $('allBtn').addEventListener('click', () => {
    const source = state.panels[state.selected];
    if (!source.img) return;
    state.panels = state.panels.map(() => ({ img: source.img, scale: 1, dx: 0, dy: 0 }));
    redraw();
    setStatus('Same photo now fills all three panels.');
  });

  $('zoomInBtn').addEventListener('click', () => zoomSelected(1.25));
  $('zoomOutBtn').addEventListener('click', () => zoomSelected(0.8));
  $('exportBtn').addEventListener('click', exportCover);
}

function zoomSelected(factor) {
  const panel = state.panels[state.selected];
  if (!panel.img) return;
  panel.scale = Math.min(6, Math.max(0.6, panel.scale * factor));
  redraw();
}

function setStatus(text) {
  $('status').textContent = text;
}

function canvasPoint(event) {
  const box = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - box.left) * (canvas.width / box.width),
    y: (event.clientY - box.top) * (canvas.height / box.height),
  };
}

function bindCanvas() {
  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const hit = lastRects.findIndex((r) => point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h);
    if (hit === -1) return;
    state.selected = hit;
    const panel = state.panels[hit];
    drag = { panel, x: point.x, y: point.y, moved: false };
    canvas.setPointerCapture(event.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || !drag.panel.img) return;
    const point = canvasPoint(event);
    drag.panel.dx += point.x - drag.x;
    drag.panel.dy += point.y - drag.y;
    drag.x = point.x;
    drag.y = point.y;
    drag.moved = true;
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag && drag.moved) setStatus(`Panel ${state.selected + 1} cropped. Scroll on it to zoom.`);
    drag = null;
  });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const point = canvasPoint(event);
    const hit = lastRects.findIndex((r) => point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h);
    const panel = state.panels[hit === -1 ? state.selected : hit];
    if (!panel.img) return;
    if (hit !== -1) state.selected = hit;
    panel.scale = Math.min(6, Math.max(0.6, panel.scale * Math.exp(-event.deltaY * 0.0012)));
    redraw();
  }, { passive: false });
}

export function exportCover() {
  const size = SIZES[state.size];
  const out = document.createElement('canvas');
  out.width = size.w;
  out.height = size.h;
  renderCover(out.getContext('2d'), size.w, size.h, state, true);
  out.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — try again.'); return; }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vice-cover-${size.w}x${size.h}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    setStatus(`Saved vice-cover-${size.w}x${size.h}.png — ${size.label}.`);
  }, 'image/png');
}

export function initEditor() {
  buildPickers();
  bindControls();
  bindCanvas();
  redraw();
}

if (!new URLSearchParams(location.search).has('shot')) {
  initEditor();
}
