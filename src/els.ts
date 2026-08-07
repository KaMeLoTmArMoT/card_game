import type {
	ButtonElement,
	CheckboxElement,
	DialogElement,
	TextFieldElement,
} from "./types";

function el<T extends HTMLElement>(selector: string): T {
	const node = document.querySelector(selector);
	if (!node) throw new Error(`Missing element: ${selector}`);
	return node as T;
}

export const els = {
	btnOpenImport: el<ButtonElement>("#btnOpenImport"),
	importDialog: el<DialogElement>("#importDialog"),
	btnCloseImport: el<ButtonElement>("#btnCloseImport"),
	btnApplyImport: el<ButtonElement>("#btnApplyImport"),

	fileInput: el<HTMLInputElement>("#fileInput"),
	delimiterSelect: el<HTMLSelectElement>("#delimiterSelect"),
	hasHeader: el<CheckboxElement>("#hasHeader"),
	preview: el<HTMLElement>("#preview"),
	importError: el<HTMLElement>("#importError"),

	rowsPerRound: el<TextFieldElement>("#rowsPerRound"),
	colsList: el<HTMLElement>("#colsList"),

	btnStart: el<ButtonElement>("#btnStart"),
	btnPrev: el<ButtonElement>("#btnPrev"),
	btnNext: el<ButtonElement>("#btnNext"),
	btnShuffle: el<ButtonElement>("#btnShuffle"),

	cardPool: el<HTMLElement>("#cardPool"),
	groups: el<HTMLElement>("#groups"),
	roundInfo: el<HTMLElement>("#roundInfo"),

	encodingSelect: el<HTMLSelectElement>("#encodingSelect"),
	dropzone: el<HTMLElement>("#dropzone"),

	btnOpenAi: el<ButtonElement>("#btnOpenAi"),
	aiDialog: el<DialogElement>("#aiDialog"),
	btnCloseAi: el<ButtonElement>("#btnCloseAi"),
	btnGenerateAi: el<ButtonElement>("#btnGenerateAi"),
	aiApiKey: el<TextFieldElement>("#aiApiKey"),
	aiPassphrase: el<TextFieldElement>("#aiPassphrase"),
	aiSaveKey: el<CheckboxElement>("#aiSaveKey"),
	aiTheme: el<TextFieldElement>("#aiTheme"),
	aiCustomCols: el<TextFieldElement>("#aiCustomCols"),
	aiColsCount: el<TextFieldElement>("#aiColsCount"),
	aiRowsCount: el<TextFieldElement>("#aiRowsCount"),
	aiStatus: el<HTMLElement>("#aiStatus"),
	aiError: el<HTMLElement>("#aiError"),
	presetChips: el<HTMLElement>("#presetChips"),
};
