import { enableSetupButtons } from "./csv";
import { els } from "./els";
import { renderColumnsSelector, startRound } from "./game";
import { escapeHtml, state } from "./state";

interface EditorOptions {
	regenerable?: boolean;
	onRegenerate?: () => void;
}

let headers: string[] = [];
let rows: string[][] = [];
let onRegenerate: (() => void) | null = null;

export function openEditor(
	headerNames: string[],
	dataRows: string[][],
	opts?: EditorOptions,
): void {
	headers = headerNames.map((h) => String(h ?? ""));
	rows = dataRows.map((r) =>
		Array.isArray(r) ? r.map((c) => String(c ?? "")) : [],
	);
	onRegenerate = opts?.onRegenerate ?? null;

	els.editorError.textContent = "";
	els.btnRegenerateEditor.hidden = !(opts?.regenerable ?? false);

	renderEditor();
	els.editorDialog.open = true;
}

export function closeEditor(): void {
	els.editorDialog.open = false;
}

export function addEditorRow(): void {
	rows.push(Array.from({ length: headers.length }, () => ""));
	renderEditor();
}

export function addEditorColumn(): void {
	headers.push(`Column ${headers.length + 1}`);
	for (const r of rows) r.push("");
	renderEditor();
}

function deleteEditorRow(index: number): void {
	if (rows.length <= 1) return;
	rows.splice(index, 1);
	renderEditor();
}

function deleteEditorColumn(index: number): void {
	if (headers.length <= 1) return;
	headers.splice(index, 1);
	for (const r of rows) r.splice(index, 1);
	renderEditor();
}

export function commitEditor(): void {
	const headerInputs =
		els.editorTable.querySelectorAll<HTMLInputElement>("input.editHeader");
	const bodyInputs = els.editorTable.querySelectorAll<HTMLInputElement>(
		".editTable tbody input",
	);

	const newHeaders: string[] = [];
	headerInputs.forEach((inp, c) => {
		newHeaders[c] = inp.value;
	});

	const newRows: string[][] = [];
	bodyInputs.forEach((inp) => {
		const r = Number(inp.dataset.row);
		const c = Number(inp.dataset.col);
		if (!newRows[r]) newRows[r] = [];
		newRows[r][c] = inp.value;
	});

	const cleanHeaders = newHeaders.map((h) => h.trim());
	const cleanRows = newRows.map((row) => row.map((cell) => cell.trim()));

	if (cleanHeaders.length < 2) {
		els.editorError.textContent = "Need at least 2 columns.";
		return;
	}
	if (cleanRows.length < 1) {
		els.editorError.textContent = "Need at least 1 row.";
		return;
	}

	state.headerRow = cleanHeaders.map((h) => h || "(empty)");
	state.dataRows = cleanRows;
	state.maxCols = cleanHeaders.length;
	state.selectedCols = [];
	for (let i = 0; i < Math.min(cleanHeaders.length, 6); i++)
		state.selectedCols.push(i);
	state.roundIndex = 0;

	renderColumnsSelector();
	enableSetupButtons();
	startRound();

	closeEditor();
}

export function backFromEditor(): void {
	closeEditor();
	if (onRegenerate) onRegenerate();
}

function renderEditor(): void {
	const html: string[] = [];
	html.push(
		'<table class="editTable"><thead><tr><th class="editRowHead"></th>',
	);
	for (let c = 0; c < headers.length; c++) {
		html.push(
			`<th><input class="editInput editHeader" type="text" data-col="${c}" value="${escapeHtml(headers[c] ?? "")}"><button type="button" class="editDelCol" data-col="${c}" title="Delete column" aria-label="Delete column">✕</button></th>`,
		);
	}
	html.push("</tr></thead><tbody>");
	for (let r = 0; r < rows.length; r++) {
		html.push(
			`<tr><td class="editRowHead"><span>${r + 1}</span><button type="button" class="editDelRow" data-row="${r}" title="Delete row" aria-label="Delete row">✕</button></td>`,
		);
		for (let c = 0; c < headers.length; c++) {
			html.push(
				`<td><input class="editInput" type="text" data-row="${r}" data-col="${c}" value="${escapeHtml(rows[r][c] ?? "")}"></td>`,
			);
		}
		html.push("</tr>");
	}
	html.push("</tbody></table>");

	els.editorTable.innerHTML = html.join("");
	els.editorInfo.textContent = `${rows.length} rows × ${headers.length} cols`;
	els.btnStartEditor.disabled = rows.length < 1 || headers.length < 2;
}

els.editorTable.addEventListener("click", (e) => {
	const target = e.target as HTMLElement;
	const delRow = target.closest<HTMLElement>(".editDelRow");
	if (delRow) {
		deleteEditorRow(Number(delRow.dataset.row));
		return;
	}
	const delCol = target.closest<HTMLElement>(".editDelCol");
	if (delCol) deleteEditorColumn(Number(delCol.dataset.col));
});
