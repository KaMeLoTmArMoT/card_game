import type { GameState } from "./types";

export const state: GameState = {
	file: null,
	delimiter: ",",
	firstRowHeader: false,

	rawRows: [],
	headerRow: null,
	dataRows: [],
	maxCols: 0,

	selectedCols: [],
	k: 10,
	roundIndex: 0,

	cards: new Map(),
	groups: [],
	cardEls: new Map(),
	dragging: null,
};

export function normalizeText(s: unknown): string {
	return String(s ?? "")
		.trim()
		.toLowerCase();
}

export function clampInt(v: string, min: number, max: number): number {
	const n = Number.parseInt(v, 10);
	if (Number.isNaN(n)) return min;
	return Math.max(min, Math.min(max, n));
}

export function escapeHtml(s: string): string {
	return s
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}
