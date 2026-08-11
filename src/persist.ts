import { state } from "./state";
import type { Card, Group } from "./types";

const KEY = "card-match-game";

export interface PersistedGame {
	delimiter: string;
	firstRowHeader: boolean;
	headerRow: string[] | null;
	dataRows: string[][];
	maxCols: number;
	selectedCols: number[];
	k: number;
	roundIndex: number;
	cards: Card[];
	groups: Group[];
}

export function saveGame(): void {
	if (!Array.isArray(state.dataRows) || state.dataRows.length === 0) return;

	const snap: PersistedGame = {
		delimiter: state.delimiter,
		firstRowHeader: state.firstRowHeader,
		headerRow: state.headerRow,
		dataRows: state.dataRows,
		maxCols: state.maxCols,
		selectedCols: state.selectedCols,
		k: state.k,
		roundIndex: state.roundIndex,
		cards: [...state.cards.values()],
		groups: state.groups,
	};

	try {
		localStorage.setItem(KEY, JSON.stringify(snap));
	} catch {
		// best-effort only
	}
}

export function loadGame(): PersistedGame | null {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return null;
		const p = JSON.parse(raw) as PersistedGame;
		if (!Array.isArray(p.dataRows) || p.dataRows.length === 0) return null;
		return p;
	} catch {
		return null;
	}
}
