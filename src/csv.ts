import Papa from "papaparse";
import { els } from "./els";
import {
	renderColumnsSelector,
	resetBoardUI,
	startRound,
	updateRoundInfo,
} from "./game";
import { escapeHtml, state } from "./state";

function toRows(data: unknown): string[][] {
	if (!Array.isArray(data)) return [];
	return data
		.filter((r): r is unknown[] => Array.isArray(r))
		.map((r) => r.map((c) => String(c ?? "")));
}

export function openImport(): void {
	els.importError.textContent = "";
	els.preview.innerHTML = "";
	els.btnApplyImport.disabled = !state.file;
	els.importDialog.open = true;
}

export function closeImport(): void {
	els.importDialog.open = false;
}

export function parsePreview(): void {
	if (!state.file) return;

	els.importError.textContent = "";
	els.preview.innerHTML = "";

	const delimiter =
		els.delimiterSelect.value === "\\t" ? "\t" : els.delimiterSelect.value;

	Papa.parse(state.file, {
		delimiter,
		encoding: els.encodingSelect.value,
		skipEmptyLines: true,
		preview: 5,
		complete: (res) => {
			const rows = toRows(res.data);
			renderPreview(rows);
			els.btnApplyImport.disabled = rows.length === 0;
		},
		error: (err) => {
			els.importError.textContent = err?.message || String(err);
			els.btnApplyImport.disabled = true;
		},
	});
}

export function parseFullAndApply(): void {
	if (!state.file) return;

	state.delimiter =
		els.delimiterSelect.value === "\\t" ? "\t" : els.delimiterSelect.value;
	state.firstRowHeader = els.hasHeader.checked;

	Papa.parse(state.file, {
		delimiter: state.delimiter,
		encoding: els.encodingSelect.value,
		skipEmptyLines: true,
		complete: (res) => {
			const rows = toRows(res.data);
			applyParsedRows(rows);
			startRound();
			closeImport();
		},
		error: (err) => {
			els.importError.textContent = err?.message || String(err);
		},
	});
}

export function applyParsedRows(rows: string[][]): void {
	state.rawRows = rows;
	state.maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);

	if (state.firstRowHeader && rows.length > 0) {
		state.headerRow = rows[0].map((x) => String(x ?? "").trim() || "(empty)");
		state.dataRows = rows.slice(1);
	} else {
		state.headerRow = null;
		state.dataRows = rows;
	}

	state.selectedCols = [];
	for (let i = 0; i < Math.min(2, state.maxCols); i++)
		state.selectedCols.push(i);

	state.roundIndex = 0;

	renderColumnsSelector();
	enableSetupButtons();
	updateRoundInfo();
	resetBoardUI();
}

export function enableSetupButtons(): void {
	const ok = state.dataRows.length > 0 && state.maxCols >= 2;
	els.btnStart.disabled = !ok;
	els.btnPrev.disabled = !ok;
	els.btnNext.disabled = !ok;
	els.btnShuffle.disabled = true;
}

function renderPreview(rows: string[][]): void {
	const html: string[] = [];
	html.push("<table><tbody>");
	for (const r of rows) {
		html.push("<tr>");
		for (let i = 0; i < Math.max(1, state.maxCols || r.length); i++) {
			html.push(`<td>${escapeHtml(String(r[i] ?? ""))}</td>`);
		}
		html.push("</tr>");
	}
	html.push("</tbody></table>");
	els.preview.innerHTML = html.join("");
}

export function setImportedFile(file: File): void {
	state.file = file;
	els.btnApplyImport.disabled = !state.file;
	parsePreview();
}
