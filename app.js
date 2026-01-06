/* global Papa */

const els = {
  btnOpenImport: document.querySelector('#btnOpenImport'),
  importDialog: document.querySelector('#importDialog'),
  btnCloseImport: document.querySelector('#btnCloseImport'),
  btnApplyImport: document.querySelector('#btnApplyImport'),

  fileInput: document.querySelector('#fileInput'),
  delimiterSelect: document.querySelector('#delimiterSelect'),
  hasHeader: document.querySelector('#hasHeader'),
  preview: document.querySelector('#preview'),
  importError: document.querySelector('#importError'),

  rowsPerRound: document.querySelector('#rowsPerRound'),
  colsList: document.querySelector('#colsList'),

  btnStart: document.querySelector('#btnStart'),
  btnPrev: document.querySelector('#btnPrev'),
  btnNext: document.querySelector('#btnNext'),
  btnShuffle: document.querySelector('#btnShuffle'),

  cardPool: document.querySelector('#cardPool'),
  groups: document.querySelector('#groups'),
  roundInfo: document.querySelector('#roundInfo'),

  encodingSelect: document.querySelector('#encodingSelect'),
  dropzone: document.querySelector('#dropzone'),
};

const state = {
  file: null,
  delimiter: ',',
  firstRowHeader: false,

  // Parsed
  rawRows: [],        // array of arrays, INCLUDING header row if checkbox on
  headerRow: null,    // array of strings or null
  dataRows: [],       // array of arrays, WITHOUT header row
  maxCols: 0,

  // Setup
  selectedCols: [],   // array of colIndex, sorted asc
  k: 10,
  roundIndex: 0,

  // Game
  cards: new Map(),   // cardId -> card
  groups: [],         // {groupId, slots:[cardId|null], state:"open|bad|good"}
  cardEls: new Map(), // cardId -> element
  dragging: null,     // {cardId, el, pointerId, offsetX, offsetY}
};

function normalizeText(s) {
  return String(s ?? '').trim().toLowerCase();
}

function clampInt(v, min, max) {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function openImport() {
  els.importError.textContent = '';
  els.preview.innerHTML = '';
  els.btnApplyImport.disabled = !state.file;
  els.importDialog.open = true;
}

function closeImport() {
  els.importDialog.open = false;
}

function parsePreview() {
  if (!state.file) return;

  els.importError.textContent = '';
  els.preview.innerHTML = '';

  const delimiter = els.delimiterSelect.value === '\\t' ? '\t' : els.delimiterSelect.value;

  Papa.parse(state.file, {
    delimiter,
    encoding: els.encodingSelect.value,
    skipEmptyLines: true,
    preview: 5, // first 5 rows for preview
    complete: (res) => {
      const rows = res.data || [];
      renderPreview(rows);
      els.btnApplyImport.disabled = rows.length === 0;
    },
    error: (err) => {
      els.importError.textContent = err?.message || String(err);
      els.btnApplyImport.disabled = true;
    }
  });
}

function parseFullAndApply() {
  if (!state.file) return;

  state.delimiter = els.delimiterSelect.value === '\\t' ? '\t' : els.delimiterSelect.value;
  state.firstRowHeader = els.hasHeader.checked;

  Papa.parse(state.file, {
    delimiter: state.delimiter,
    encoding: els.encodingSelect.value,
    skipEmptyLines: true,
    complete: (res) => {
      const rows = (res.data || []).filter(r => Array.isArray(r));
      applyParsedRows(rows);
      closeImport();
    },
    error: (err) => {
      els.importError.textContent = err?.message || String(err);
    }
  });
}

function applyParsedRows(rows) {
  state.rawRows = rows;
  state.maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);

  if (state.firstRowHeader && rows.length > 0) {
    state.headerRow = rows[0].map(x => String(x ?? '').trim() || '(empty)');
    state.dataRows = rows.slice(1);
  } else {
    state.headerRow = null;
    state.dataRows = rows;
  }

  // Default select first 2 columns if possible
  state.selectedCols = [];
  for (let i = 0; i < Math.min(2, state.maxCols); i++) state.selectedCols.push(i);

  state.roundIndex = 0;

  renderColumnsSelector();
  enableSetupButtons();
  updateRoundInfo();
  resetBoardUI();
}

function enableSetupButtons() {
  const ok = state.dataRows.length > 0 && state.maxCols >= 2;
  els.btnStart.disabled = !ok;
  els.btnPrev.disabled = !ok;
  els.btnNext.disabled = !ok;
  els.btnShuffle.disabled = true;
}

function renderPreview(rows) {
  const html = [];
  html.push('<table><tbody>');
  for (const r of rows) {
    html.push('<tr>');
    for (let i = 0; i < Math.max(1, state.maxCols || r.length); i++) {
      html.push(`<td>${escapeHtml(String(r[i] ?? ''))}</td>`);
    }
    html.push('</tr>');
  }
  html.push('</tbody></table>');
  els.preview.innerHTML = html.join('');
}

function renderColumnsSelector() {
  if (state.maxCols === 0) {
    els.colsList.textContent = 'Import a CSV to select columns.';
    els.colsList.classList.add('muted');
    return;
  }

  els.colsList.classList.remove('muted');
  els.colsList.innerHTML = '';

  for (let col = 0; col < state.maxCols; col++) {
    const name = state.headerRow?.[col] ?? `Column ${col + 1}`;
    const id = `col_${col}`;

    const wrap = document.createElement('div');
    wrap.className = 'colsItem';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;
    cb.checked = state.selectedCols.includes(col);

    cb.addEventListener('change', () => {
      const next = new Set(state.selectedCols);
      if (cb.checked) next.add(col);
      else next.delete(col);

      const arr = [...next].sort((a, b) => a - b);

      // Enforce 2..6
      if (arr.length < 2) {
        cb.checked = true;
        return;
      }
      if (arr.length > 6) {
        cb.checked = false;
        return;
      }

      state.selectedCols = arr;
      // No auto-restart; user can press Start
    });

    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = name;

    wrap.appendChild(cb);
    wrap.appendChild(label);
    els.colsList.appendChild(wrap);
  }
}

function updateRoundInfo() {
  const k = clampInt(els.rowsPerRound.value, 1, 200);
  state.k = k;

  const start = state.roundIndex * state.k;
  const end = Math.min(start + state.k, state.dataRows.length);

  els.roundInfo.textContent = state.dataRows.length
    ? `Rows ${start + 1}-${end} of ${state.dataRows.length} (K=${state.k}, cols=${state.selectedCols.length})`
    : '';
}

function resetBoardUI() {
  els.cardPool.innerHTML = '';
  els.groups.innerHTML = '';
  state.cards.clear();
  state.groups = [];
  state.cardEls.clear();
}

function startRound() {
  updateRoundInfo();
  resetBoardUI();

  const start = state.roundIndex * state.k;
  const rows = state.dataRows.slice(start, start + state.k);
  const n = state.selectedCols.length;

  if (rows.length === 0 || n < 2) return;

  // Build groups (one group per row, but user can match any row into any group)
  state.groups = Array.from({ length: rows.length }, (_, i) => ({
    groupId: i,
    slots: Array.from({ length: n }, () => null),
    state: 'open',
    movedToBottom: false,
  }));

  // Create cards
  // rowId is absolute index in dataRows (not local index), so hint can work across navigation if needed.
  const cardsArr = [];
  for (let local = 0; local < rows.length; local++) {
    const absoluteRowId = start + local;
    const row = rows[local];

    for (let slotIndex = 0; slotIndex < n; slotIndex++) {
      const colIndex = state.selectedCols[slotIndex];
      const text = String(row[colIndex] ?? '').trim();

      const cardId = `${absoluteRowId}:${colIndex}`;
      const card = {
        cardId,
        rowId: absoluteRowId,
        colIndex,
        slotIndexExpected: slotIndex, // position in selectedCols
        text,
        state: 'free',
        placed: null,
      };
      state.cards.set(cardId, card);
      cardsArr.push(card);
    }
  }

  applyDuplicateMarkers(cardsArr);
  renderPool(cardsArr);
  renderGroups();

  els.btnShuffle.disabled = false;
}

function applyDuplicateMarkers(cardsArr) {
  const counts = new Map(); // key -> count
  for (const c of cardsArr) {
    const key = `${c.colIndex}:${normalizeText(c.text)}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const ord = new Map(); // key -> current
  for (const c of cardsArr) {
    const key = `${c.colIndex}:${normalizeText(c.text)}`;
    const total = counts.get(key) || 1;
    if (total <= 1) {
      c.duplicateOrdinal = null;
      continue;
    }
    const next = (ord.get(key) || 0) + 1;
    ord.set(key, next);
    c.duplicateOrdinal = next;
  }
}

function renderPool(cardsArr) {
  // Shuffle initial layout for a bit of "chaos"
  const shuffled = cardsArr.slice().sort(() => Math.random() - 0.5);

  for (const card of shuffled) {
    const el = renderCard(card);
    els.cardPool.appendChild(el);
  }
}

function renderGroups() {
  const n = state.selectedCols.length;

  for (const g of state.groups) {
    const groupEl = document.createElement('div');
    groupEl.className = 'group';
    groupEl.dataset.groupId = String(g.groupId);

    const title = document.createElement('div');
    title.className = 'groupTitle';
    title.innerHTML = `<span>Group</span><span>${n} slots</span>`;

    const slotsEl = document.createElement('div');
    slotsEl.className = 'slots';
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    const minCol = isMobile ? 120 : 160;
    slotsEl.style.gridTemplateColumns = `repeat(${n}, minmax(${minCol}px, 1fr))`;

    for (let slotIndex = 0; slotIndex < n; slotIndex++) {
      const colIndex = state.selectedCols[slotIndex];
      const label = state.headerRow?.[colIndex] ?? `Column ${colIndex + 1}`;

      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.groupId = String(g.groupId);
      slot.dataset.slotIndex = String(slotIndex);

      slot.innerHTML = `
        <div class="slotLabel">${escapeHtml(label)}</div>
        <div class="slotInner"></div>
      `;

      slotsEl.appendChild(slot);
    }

    groupEl.appendChild(title);
    groupEl.appendChild(slotsEl);
    els.groups.appendChild(groupEl);
  }
}

function renderCard(card) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.cardId = card.cardId;

  const badge = card.duplicateOrdinal ? `<span class="badge">#${card.duplicateOrdinal}</span>` : '';
  el.innerHTML = `
    <div class="cardMeta">
      ${badge}
      <button class="hintBtn" title="Highlight siblings">?</button>
    </div>
    <div class="cardText">${escapeHtml(card.text || '(empty)')}</div>
  `;

  // Hint
  const hintBtn = el.querySelector('.hintBtn');

  hintBtn.addEventListener('pointerdown', (ev) => {
    ev.stopPropagation(); // prevent starting drag from the parent card [web:173]
  });

  hintBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    highlightRow(card.rowId);
  });

  // Drag
  el.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest && ev.target.closest('.hintBtn')) return;
    const c = state.cards.get(card.cardId);
    if (!c || c.state === 'solved') return;

    const rect = el.getBoundingClientRect();
    state.dragging = {
      cardId: card.cardId,
      el,
      pointerId: ev.pointerId,
      offsetX: ev.clientX - rect.left,
      offsetY: ev.clientY - rect.top,
    };

    ev.preventDefault();
    document.body.classList.add('draggingPage');

    el.setPointerCapture(ev.pointerId);
    el.classList.add('dragging');
    moveDragging(ev.clientX, ev.clientY);
  });

  el.addEventListener('pointermove', (ev) => {
    if (!state.dragging || state.dragging.pointerId !== ev.pointerId) return;
    moveDragging(ev.clientX, ev.clientY);
  });

  el.addEventListener('pointerup', (ev) => {
    if (!state.dragging || state.dragging.pointerId !== ev.pointerId) return;
    finishDrag(ev.clientX, ev.clientY);
  });

  el.addEventListener('pointercancel', (ev) => {
    if (!state.dragging || state.dragging.pointerId !== ev.pointerId) return;
    finishDrag(ev.clientX, ev.clientY, true);
  });

  state.cardEls.set(card.cardId, el);
  return el;
}

function moveDragging(clientX, clientY) {
  const d = state.dragging;
  if (!d) return;
  d.el.style.left = `${clientX - d.offsetX}px`;
  d.el.style.top = `${clientY - d.offsetY}px`;
  d.el.style.width = `${d.el.offsetWidth}px`;
}

function finishDrag(clientX, clientY, cancelled = false) {
  const d = state.dragging;
  state.dragging = null;
  document.body.classList.remove('draggingPage');
  if (!d) return;

  const el = d.el;

  // IMPORTANT: find drop target BEFORE removing .dragging / styles
  el.style.visibility = 'hidden';
  const target = document.elementFromPoint(clientX, clientY);
  const slotEl = target?.closest?.('.slot');
  el.style.visibility = '';

  // now cleanup the dragging visuals
  el.classList.remove('dragging');
  el.style.left = '';
  el.style.top = '';
  el.style.width = '';

  const card = state.cards.get(d.cardId);
  if (!card) return;

  if (cancelled) {
    rerenderCardToCurrentContainer(card);
    return;
  }

  if (!slotEl) {
    moveCardToPool(card);
    recomputeAllGroupsUI();
    return;
  }

  const groupId = Number(slotEl.dataset.groupId);
  const slotIndex = Number(slotEl.dataset.slotIndex);
  placeCardIntoSlot(card, groupId, slotIndex);
  recomputeAllGroupsUI();
}

function placeCardIntoSlot(card, groupId, slotIndex) {
  if (card.state === 'solved') return;

  // Remove from previous slot if it was placed
  if (card.placed) {
    const prevG = state.groups[card.placed.groupId];
    if (prevG) prevG.slots[card.placed.slotIndex] = null;
  }

  const group = state.groups[groupId];
  if (!group) return;

  // If slot is occupied: kick existing card to pool
  const existingId = group.slots[slotIndex];
  if (existingId && existingId !== card.cardId) {
    const existing = state.cards.get(existingId);
    if (existing) {
      existing.placed = null;
      existing.state = 'free';
      moveCardToPool(existing);
    }
  }

  group.slots[slotIndex] = card.cardId;
  card.placed = { groupId, slotIndex };
  card.state = 'placed';

  // Attach DOM into slot
  const slotInner = document
    .querySelector(`.slot[data-group-id="${groupId}"][data-slot-index="${slotIndex}"] .slotInner`);
  const cardEl = state.cardEls.get(card.cardId);
  if (slotInner && cardEl) slotInner.appendChild(cardEl);
}

function moveCardToPool(card) {
  if (card.state === 'solved') return;

  // Remove from slot bookkeeping if needed
  if (card.placed) {
    const g = state.groups[card.placed.groupId];
    if (g) g.slots[card.placed.slotIndex] = null;
    card.placed = null;
  }
  card.state = 'free';

  const el = state.cardEls.get(card.cardId);
  if (el) els.cardPool.appendChild(el);
}

function rerenderCardToCurrentContainer(card) {
  if (card.placed) {
    const { groupId, slotIndex } = card.placed;
    const slotInner = document
      .querySelector(`.slot[data-group-id="${groupId}"][data-slot-index="${slotIndex}"] .slotInner`);
    const el = state.cardEls.get(card.cardId);
    if (slotInner && el) slotInner.appendChild(el);
  } else {
    moveCardToPool(card);
  }
}

function flashSuccess() {
  document.body.classList.add('successFlash');
  window.setTimeout(() => document.body.classList.remove('successFlash'), 600);
}

function recomputeAllGroupsUI() {
  for (const g of state.groups) {
    const full = g.slots.every(Boolean);
    let isGood = false;

    if (full) {
      const cards = g.slots.map(id => state.cards.get(id)).filter(Boolean);
      const sameRow = cards.every(c => c.rowId === cards[0].rowId);
      const columnsOk = cards.every((c, slotIndex) => c.colIndex === state.selectedCols[slotIndex]);
      isGood = sameRow && columnsOk;
    }

    g.state = full ? (isGood ? 'good' : 'bad') : 'open';

    const groupEl = document.querySelector(`.group[data-group-id="${g.groupId}"]`);
    if (!groupEl) continue;

    groupEl.classList.toggle('good', g.state === 'good');
    groupEl.classList.toggle('bad', g.state === 'bad');

    // Lock cards if solved
    if (g.state === 'good') {
      for (const id of g.slots) {
        const c = state.cards.get(id);
        if (!c) continue;
        c.state = 'solved';
        const el = state.cardEls.get(id);
        if (el) el.classList.add('locked');
      }
    }
    // Move solved groups to the bottom (once)
    if (g.state === 'good' && !g.movedToBottom && groupEl) {
      groupEl.classList.add('justSolved');
      els.groups.appendChild(groupEl);        // move DOM node to bottom
      g.movedToBottom = true;
      flashSuccess();

      window.setTimeout(() => groupEl.classList.remove('justSolved'), 400);
    }
  }

  els.btnShuffle.disabled = !hasUnsolvedCards();
}

function hasUnsolvedCards() {
  for (const c of state.cards.values()) {
    if (c.state !== 'solved') return true;
  }
  return false;
}

function highlightRow(rowId) {
  const toHighlight = [];
  for (const c of state.cards.values()) {
    if (c.rowId === rowId) toHighlight.push(c.cardId);
  }

  for (const id of toHighlight) {
    const el = state.cardEls.get(id);
    if (el) el.classList.add('highlight');
  }

  window.setTimeout(() => {
    for (const id of toHighlight) {
      const el = state.cardEls.get(id);
      if (el) el.classList.remove('highlight');
    }
  }, 1000);
}

function shuffleUnsolved() {
  // Pull all non-solved cards to pool, clear non-solved groups
  for (const g of state.groups) {
    if (g.state === 'good') continue;
    for (let i = 0; i < g.slots.length; i++) {
      const id = g.slots[i];
      if (!id) continue;
      const c = state.cards.get(id);
      if (!c || c.state === 'solved') continue;
      g.slots[i] = null;
      c.placed = null;
      c.state = 'free';
    }
  }

  const free = [];
  for (const c of state.cards.values()) {
    if (c.state !== 'solved') free.push(c);
  }

  // Shuffle + render
  free.sort(() => Math.random() - 0.5);
  for (const c of free) moveCardToPool(c);

  recomputeAllGroupsUI();
}

function goPrev() {
  state.roundIndex = Math.max(0, state.roundIndex - 1);
  startRound();
}
function goNext() {
  const maxRound = Math.floor((state.dataRows.length - 1) / state.k);
  state.roundIndex = Math.min(maxRound, state.roundIndex + 1);
  startRound();
}

function escapeHtml(s) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setImportedFile(file) {
  state.file = file;
  els.btnApplyImport.disabled = !state.file;
  parsePreview();
}

// Wire UI
els.btnOpenImport.addEventListener('click', openImport);
els.btnCloseImport.addEventListener('click', closeImport);

els.fileInput.addEventListener('change', () => {
  state.file = els.fileInput.files?.[0] || null;
  els.btnApplyImport.disabled = !state.file;
  parsePreview();
});
els.delimiterSelect.addEventListener('change', parsePreview);
els.hasHeader.addEventListener('change', parsePreview);
els.encodingSelect.addEventListener('change', parsePreview);

els.btnApplyImport.addEventListener('click', parseFullAndApply);

els.rowsPerRound.addEventListener('input', updateRoundInfo);
els.btnStart.addEventListener('click', startRound);
els.btnPrev.addEventListener('click', goPrev);
els.btnNext.addEventListener('click', goNext);
els.btnShuffle.addEventListener('click', shuffleUnsolved);

// Dropzone: click -> open picker
els.dropzone.addEventListener('click', () => els.fileInput.click());

// Prevent default browser behavior for drag/drop and handle file drop [web:165]
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evtName => {
  els.dropzone.addEventListener(evtName, (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
  });
});

['dragenter', 'dragover'].forEach(evtName => {
  els.dropzone.addEventListener(evtName, () => els.dropzone.classList.add('over'));
});

['dragleave', 'drop'].forEach(evtName => {
  els.dropzone.addEventListener(evtName, () => els.dropzone.classList.remove('over'));
});

els.dropzone.addEventListener('drop', (ev) => {
  const file = ev.dataTransfer?.files?.[0];
  if (file) setImportedFile(file);
});

if (window.matchMedia('(max-width: 900px)').matches) {
  els.rowsPerRound.value = '5';
}

// Initial
updateRoundInfo();
