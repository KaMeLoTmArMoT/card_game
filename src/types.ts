export type CardState = "free" | "placed" | "solved";
export type GroupState = "open" | "good" | "bad";

export interface Placement {
	groupId: number;
	slotIndex: number;
}

export interface Card {
	cardId: string;
	rowId: number;
	colIndex: number;
	slotIndexExpected: number;
	text: string;
	state: CardState;
	placed: Placement | null;
	duplicateOrdinal: number | null;
}

export interface Group {
	groupId: number;
	slots: (string | null)[];
	state: GroupState;
	movedToBottom: boolean;
}

export interface Dragging {
	cardId: string;
	el: HTMLElement;
	pointerId: number;
	offsetX: number;
	offsetY: number;
}

export interface GameState {
	file: File | null;
	delimiter: string;
	firstRowHeader: boolean;

	rawRows: string[][];
	headerRow: string[] | null;
	dataRows: string[][];
	maxCols: number;

	selectedCols: number[];
	k: number;
	roundIndex: number;

	cards: Map<string, Card>;
	groups: Group[];
	cardEls: Map<string, HTMLElement>;
	dragging: Dragging | null;
}

export interface MistralResponse {
	headers?: unknown;
	data?: unknown;
}

export interface EncryptedKeyBundle {
	salt: number[];
	iv: number[];
	ciphertext: number[];
}

export interface DialogElement extends HTMLElement {
	open: boolean;
	show(): void;
	close(): void;
}

export interface TextFieldElement extends HTMLElement {
	value: string;
	disabled: boolean;
	label: string;
}

export interface CheckboxElement extends HTMLElement {
	checked: boolean;
}

export interface ButtonElement extends HTMLElement {
	disabled: boolean;
}
