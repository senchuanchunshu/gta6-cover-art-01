// Screenshot mode for Vice Cover Studio.
// ?shot=editor shows the editor with sample photos loaded.
// ?shot=cover shows one exported cover alone, filling the viewport.
// Both set window.__shotReady once painted, so a screenshot tool can wait
// for it instead of guessing. Nothing here is needed to use the app.

import { SIZES, loadImageUrl, renderCover } from './cover.js';
import { state } from './main.js';

const query = new URLSearchParams(location.search);

async function loadSamples() {
  const names = ['pier', 'boulevard', 'pier'];
  for (let i = 0; i < 3; i++) {
    try {
      state.panels[i] = { img: await loadImageUrl(`samples/${names[i]}.jpg`), scale: 1, dx: 0, dy: 0 };
    } catch (err) { /* a missing sample leaves its panel empty */ }
  }
}

function applyQuery() {
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('size') && SIZES[query.get('size')]) state.size = query.get('size');
  if (query.get('caption')) state.title = query.get('caption');
  if (query.get('sub') !== null) state.subtitle = query.get('sub') || '';
}

function markReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

export async function runShot() {
  const shot = query.get('shot');
  applyQuery();
  await loadSamples();
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = SIZES[state.size];
    const canvas = document.getElementById('preview');
    canvas.width = size.w;
    canvas.height = size.h;
    renderCover(canvas.getContext('2d'), size.w, size.h, state, true);
    document.getElementById('previewWrap').classList.add('cover-only');
  } else {
    const { initEditor, redraw } = await import('./main.js');
    initEditor();
    redraw();
  }
  markReady();
}

if (query.has('shot')) {
  runShot();
}
