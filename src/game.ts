import { els } from "./els";
import { clampInt, escapeHtml, normalizeText, state } from "./state";
import type { Card } from "./types";

export function resetBoardUI(): void {
	els.cardPool.innerHTML = "";
	els.groups.innerHTML = "";
	state.cards.clear();
	state.groups = [];
	state.cardEls.clear();
}

export function updateRoundInfo(): void {
	const k = clampInt(els.rowsPerRound.value, 1, 200);
	state.k = k;

	const start = state.roundIndex * state.k;
	const end = Math.min(start + state.k, state.dataRows.length);

	els.roundInfo.textContent = state.dataRows.length
		? `Rows ${start + 1}-${end} of ${state.dataRows.length} (K=${state.k}, cols=${state.selectedCols.length})`
		: "";
}

export function renderColumnsSelector(): void {
	if (state.maxCols === 0) {
		els.colsList.textContent = "Import a CSV to select columns.";
		els.colsList.classList.add("muted");
		return;
	}

	els.colsList.classList.remove("muted");
	els.colsList.innerHTML = "";

	for (let col = 0; col < state.maxCols; col++) {
		const name = state.headerRow?.[col] ?? `Column ${col + 1}`;
		const id = `col_${col}`;

		const wrap = document.createElement("div");
		wrap.className = "colsItem";

		const cb = document.createElement("input");
		cb.type = "checkbox";
		cb.id = id;
		cb.checked = state.selectedCols.includes(col);

		cb.addEventListener("change", () => {
			const next = new Set(state.selectedCols);
			if (cb.checked) next.add(col);
			else next.delete(col);

			const arr = [...next].sort((a, b) => a - b);

			if (arr.length < 2) {
				cb.checked = true;
				return;
			}
			if (arr.length > 6) {
				cb.checked = false;
				return;
			}

			state.selectedCols = arr;
			if (state.dataRows.length > 0) {
				startRound();
			} else {
				updateRoundInfo();
			}
		});

		const label = document.createElement("label");
		label.htmlFor = id;
		label.textContent = name;

		wrap.appendChild(cb);
		wrap.appendChild(label);
		els.colsList.appendChild(wrap);
	}
}

export function startRound(): void {
	updateRoundInfo();
	resetBoardUI();

	const start = state.roundIndex * state.k;
	const rows = state.dataRows.slice(start, start + state.k);
	const n = state.selectedCols.length;

	if (rows.length === 0 || n < 2) {
		return;
	}

	state.groups = Array.from({ length: rows.length }, (_, i) => ({
		groupId: i,
		slots: Array.from({ length: n }, () => null),
		state: "open" as const,
		movedToBottom: false,
	}));

	const cardsArr: Card[] = [];
	for (let local = 0; local < rows.length; local++) {
		const absoluteRowId = start + local;
		const row = rows[local];

		for (let slotIndex = 0; slotIndex < n; slotIndex++) {
			const colIndex = state.selectedCols[slotIndex];
			const text = String(row[colIndex] ?? "").trim();

			const cardId = `${absoluteRowId}:${colIndex}`;
			const card: Card = {
				cardId,
				rowId: absoluteRowId,
				colIndex,
				slotIndexExpected: slotIndex,
				text,
				state: "free",
				placed: null,
				duplicateOrdinal: null,
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

function applyDuplicateMarkers(cardsArr: Card[]): void {
	const counts = new Map<string, number>();
	for (const c of cardsArr) {
		const key = `${c.colIndex}:${normalizeText(c.text)}`;
		counts.set(key, (counts.get(key) || 0) + 1);
	}

	const ord = new Map<string, number>();
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

function renderPool(cardsArr: Card[]): void {
	const shuffled = cardsArr.slice().sort(() => Math.random() - 0.5);

	for (const card of shuffled) {
		const el = renderCard(card);
		els.cardPool.appendChild(el);
	}
}

function renderGroups(): void {
	const n = state.selectedCols.length;

	for (const g of state.groups) {
		const groupEl = document.createElement("div");
		groupEl.className = "group";
		groupEl.dataset.groupId = String(g.groupId);

		const title = document.createElement("div");
		title.className = "groupTitle";
		title.innerHTML = `<span>Group</span><span>${n} slots</span>`;

		const slotsEl = document.createElement("div");
		slotsEl.className = "slots";
		const isMobile = window.matchMedia("(max-width: 900px)").matches;
		const minCol = isMobile ? 120 : 160;
		slotsEl.style.gridTemplateColumns = `repeat(${n}, minmax(${minCol}px, 1fr))`;

		for (let slotIndex = 0; slotIndex < n; slotIndex++) {
			const colIndex = state.selectedCols[slotIndex];
			const label = state.headerRow?.[colIndex] ?? `Column ${colIndex + 1}`;

			const slot = document.createElement("div");
			slot.className = "slot";
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

function renderCard(card: Card): HTMLElement {
	const el = document.createElement("div");
	el.className = "card";
	el.dataset.cardId = card.cardId;

	const badge = card.duplicateOrdinal
		? `<span class="badge">#${card.duplicateOrdinal}</span>`
		: "";
	el.innerHTML = `
    <div class="cardMeta">
      ${badge}
      <button class="hintBtn" type="button" title="Highlight siblings">?</button>
    </div>
    <div class="cardText">${escapeHtml(card.text || "(empty)")}</div>
  `;

	const hintBtn = el.querySelector(".hintBtn") as HTMLButtonElement;

	hintBtn.addEventListener("pointerdown", (ev) => {
		ev.stopPropagation();
	});

	hintBtn.addEventListener("click", (ev) => {
		ev.stopPropagation();
		ev.preventDefault();
		highlightRow(card.rowId);
	});

	el.addEventListener("pointerdown", (ev) => {
		if (ev.target instanceof Element && ev.target.closest(".hintBtn")) return;
		const c = state.cards.get(card.cardId);
		if (!c || c.state === "solved") return;

		const rect = el.getBoundingClientRect();
		state.dragging = {
			cardId: card.cardId,
			el,
			pointerId: ev.pointerId,
			offsetX: ev.clientX - rect.left,
			offsetY: ev.clientY - rect.top,
		};

		ev.preventDefault();
		document.body.classList.add("draggingPage");

		el.setPointerCapture(ev.pointerId);
		el.classList.add("dragging");
		moveDragging(ev.clientX, ev.clientY);
	});

	el.addEventListener("pointermove", (ev) => {
		if (!state.dragging || state.dragging.pointerId !== ev.pointerId) return;
		moveDragging(ev.clientX, ev.clientY);
	});

	el.addEventListener("pointerup", (ev) => {
		if (!state.dragging || state.dragging.pointerId !== ev.pointerId) return;
		finishDrag(ev.clientX, ev.clientY);
	});

	el.addEventListener("pointercancel", (ev) => {
		if (!state.dragging || state.dragging.pointerId !== ev.pointerId) return;
		finishDrag(ev.clientX, ev.clientY, true);
	});

	state.cardEls.set(card.cardId, el);
	return el;
}

function moveDragging(clientX: number, clientY: number): void {
	const d = state.dragging;
	if (!d) return;
	d.el.style.left = `${clientX - d.offsetX}px`;
	d.el.style.top = `${clientY - d.offsetY}px`;
	d.el.style.width = `${d.el.offsetWidth}px`;
}

function finishDrag(clientX: number, clientY: number, cancelled = false): void {
	const d = state.dragging;
	state.dragging = null;
	document.body.classList.remove("draggingPage");
	if (!d) return;

	const el = d.el;

	el.style.visibility = "hidden";
	const target = document.elementFromPoint(clientX, clientY);
	const slotEl = target?.closest?.(".slot") as HTMLElement | null;
	el.style.visibility = "";

	el.classList.remove("dragging");
	el.style.left = "";
	el.style.top = "";
	el.style.width = "";

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

function placeCardIntoSlot(
	card: Card,
	groupId: number,
	slotIndex: number,
): void {
	if (card.state === "solved") return;

	if (card.placed) {
		const prevG = state.groups[card.placed.groupId];
		if (prevG) prevG.slots[card.placed.slotIndex] = null;
	}

	const group = state.groups[groupId];
	if (!group) return;

	const existingId = group.slots[slotIndex];
	if (existingId && existingId !== card.cardId) {
		const existing = state.cards.get(existingId);
		if (existing) {
			existing.placed = null;
			existing.state = "free";
			moveCardToPool(existing);
		}
	}

	group.slots[slotIndex] = card.cardId;
	card.placed = { groupId, slotIndex };
	card.state = "placed";

	const slotInner = document.querySelector(
		`.slot[data-group-id="${groupId}"][data-slot-index="${slotIndex}"] .slotInner`,
	);
	const cardEl = state.cardEls.get(card.cardId);
	if (slotInner && cardEl) slotInner.appendChild(cardEl);
}

function moveCardToPool(card: Card): void {
	if (card.state === "solved") return;

	if (card.placed) {
		const g = state.groups[card.placed.groupId];
		if (g) g.slots[card.placed.slotIndex] = null;
		card.placed = null;
	}
	card.state = "free";

	const el = state.cardEls.get(card.cardId);
	if (el) els.cardPool.appendChild(el);
}

function rerenderCardToCurrentContainer(card: Card): void {
	if (card.placed) {
		const { groupId, slotIndex } = card.placed;
		const slotInner = document.querySelector(
			`.slot[data-group-id="${groupId}"][data-slot-index="${slotIndex}"] .slotInner`,
		);
		const el = state.cardEls.get(card.cardId);
		if (slotInner && el) slotInner.appendChild(el);
	} else {
		moveCardToPool(card);
	}
}

function flashSuccess(): void {
	document.body.classList.add("successFlash");
	window.setTimeout(() => document.body.classList.remove("successFlash"), 600);
}

function recomputeAllGroupsUI(): void {
	for (const g of state.groups) {
		const full = g.slots.every(Boolean);
		let isGood = false;

		if (full) {
			const cards = g.slots
				.map((id) => state.cards.get(id as string))
				.filter((c): c is Card => Boolean(c));
			const sameRow = cards.every((c) => c.rowId === cards[0].rowId);
			const columnsOk = cards.every(
				(c, slotIndex) => c.colIndex === state.selectedCols[slotIndex],
			);
			isGood = sameRow && columnsOk;
		}

		g.state = full ? (isGood ? "good" : "bad") : "open";

		const groupEl = document.querySelector(
			`.group[data-group-id="${g.groupId}"]`,
		);
		if (!groupEl) continue;

		groupEl.classList.toggle("good", g.state === "good");
		groupEl.classList.toggle("bad", g.state === "bad");

		if (g.state === "good") {
			for (const id of g.slots) {
				if (!id) continue;
				const c = state.cards.get(id);
				if (!c) continue;
				c.state = "solved";
				const el = state.cardEls.get(id);
				if (el) el.classList.add("locked");
			}
		}
		if (g.state === "good" && !g.movedToBottom && groupEl) {
			groupEl.classList.add("justSolved");
			els.groups.appendChild(groupEl);
			g.movedToBottom = true;
			flashSuccess();

			window.setTimeout(() => groupEl.classList.remove("justSolved"), 400);
		}
	}

	els.btnShuffle.disabled = !hasUnsolvedCards();
}

function hasUnsolvedCards(): boolean {
	for (const c of state.cards.values()) {
		if (c.state !== "solved") return true;
	}
	return false;
}

export function highlightRow(rowId: number): void {
	const toHighlight: string[] = [];
	for (const c of state.cards.values()) {
		if (c.rowId === rowId) toHighlight.push(c.cardId);
	}

	for (const id of toHighlight) {
		const el = state.cardEls.get(id);
		if (el) el.classList.add("highlight");
	}

	window.setTimeout(() => {
		for (const id of toHighlight) {
			const el = state.cardEls.get(id);
			if (el) el.classList.remove("highlight");
		}
	}, 1000);
}

export function shuffleUnsolved(): void {
	for (const g of state.groups) {
		if (g.state === "good") continue;
		for (let i = 0; i < g.slots.length; i++) {
			const id = g.slots[i];
			if (!id) continue;
			const c = state.cards.get(id);
			if (!c || c.state === "solved") continue;
			g.slots[i] = null;
			c.placed = null;
			c.state = "free";
		}
	}

	const free: Card[] = [];
	for (const c of state.cards.values()) {
		if (c.state !== "solved") free.push(c);
	}

	free.sort(() => Math.random() - 0.5);
	for (const c of free) moveCardToPool(c);

	recomputeAllGroupsUI();
}

export function goPrev(): void {
	state.roundIndex = Math.max(0, state.roundIndex - 1);
	startRound();
}

export function goNext(): void {
	const maxRound = Math.floor((state.dataRows.length - 1) / state.k);
	state.roundIndex = Math.min(maxRound, state.roundIndex + 1);
	startRound();
}
