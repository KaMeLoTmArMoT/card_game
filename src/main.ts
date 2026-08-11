import "@material/web/all.js";
import { styles as typescaleStyles } from "@material/web/typography/md-typescale-styles.js";

import "./styles.css";

import {
	closeImport,
	openImport,
	parseFullAndApply,
	parsePreview,
	setImportedFile,
} from "./csv";
import {
	addEditorColumn,
	addEditorRow,
	backFromEditor,
	commitEditor,
} from "./editor";
import { els } from "./els";
import {
	goNext,
	goPrev,
	shuffleUnsolved,
	startRound,
	updateRoundInfo,
} from "./game";
import {
	closeAiDialog,
	generateCardsWithMistral,
	handlePresetClick,
	openAiDialog,
} from "./mistral";
import { state } from "./state";

if (typescaleStyles.styleSheet) {
	document.adoptedStyleSheets.push(typescaleStyles.styleSheet);
}

if (navigator.storage?.persist) {
	navigator.storage.persist().catch(() => {});
}

interface MdDialogLike extends HTMLElement {
	nextClickIsFromContent?: boolean;
}

document.querySelectorAll("md-dialog").forEach((dialog) => {
	const md = dialog as unknown as MdDialogLike;
	md.addEventListener(
		"pointerdown",
		(e) => {
			const container = md.shadowRoot?.querySelector(".container");
			md.nextClickIsFromContent = Boolean(
				container && e.composedPath().includes(container),
			);
		},
		true,
	);
});

els.btnOpenImport.addEventListener("click", (e) => {
	e.preventDefault();
	openImport();
});
els.btnCloseImport.addEventListener("click", (e) => {
	e.preventDefault();
	closeImport();
});

els.fileInput.addEventListener("change", () => {
	state.file = els.fileInput.files?.[0] || null;
	els.btnApplyImport.disabled = !state.file;
	parsePreview();
});
els.delimiterSelect.addEventListener("change", parsePreview);
els.hasHeader.addEventListener("change", parsePreview);
els.encodingSelect.addEventListener("change", parsePreview);

els.btnApplyImport.addEventListener("click", (e) => {
	e.preventDefault();
	parseFullAndApply();
});

els.rowsPerRound.addEventListener("input", () => {
	updateRoundInfo();
	if (state.dataRows.length > 0) startRound();
});
els.btnStart.addEventListener("click", (e) => {
	e.preventDefault();
	startRound();
});
els.btnPrev.addEventListener("click", (e) => {
	e.preventDefault();
	goPrev();
});
els.btnNext.addEventListener("click", (e) => {
	e.preventDefault();
	goNext();
});
els.btnShuffle.addEventListener("click", (e) => {
	e.preventDefault();
	shuffleUnsolved();
});

els.dropzone.addEventListener("click", (e) => {
	e.preventDefault();
	els.fileInput.click();
});

["dragenter", "dragover", "dragleave", "drop"].forEach((evtName) => {
	els.dropzone.addEventListener(evtName, (ev) => {
		ev.preventDefault();
		ev.stopPropagation();
	});
});

["dragenter", "dragover"].forEach((evtName) => {
	els.dropzone.addEventListener(evtName, () =>
		els.dropzone.classList.add("over"),
	);
});

["dragleave", "drop"].forEach((evtName) => {
	els.dropzone.addEventListener(evtName, () =>
		els.dropzone.classList.remove("over"),
	);
});

els.dropzone.addEventListener("drop", (ev) => {
	const file = ev.dataTransfer?.files?.[0];
	if (file) setImportedFile(file);
});

if (window.matchMedia("(max-width: 900px)").matches) {
	els.rowsPerRound.value = "5";
}

els.btnOpenAi.addEventListener("click", (e) => {
	e.preventDefault();
	openAiDialog();
});
els.btnCloseAi.addEventListener("click", (e) => {
	e.preventDefault();
	closeAiDialog();
});
els.btnGenerateAi.addEventListener("click", generateCardsWithMistral);
els.presetChips.addEventListener("click", handlePresetClick);

els.btnAddRow.addEventListener("click", (e) => {
	e.preventDefault();
	addEditorRow();
});
els.btnAddCol.addEventListener("click", (e) => {
	e.preventDefault();
	addEditorColumn();
});
els.btnStartEditor.addEventListener("click", (e) => {
	e.preventDefault();
	commitEditor();
});
els.btnBackEditor.addEventListener("click", (e) => {
	e.preventDefault();
	backFromEditor();
});
els.btnRegenerateEditor.addEventListener("click", (e) => {
	e.preventDefault();
	backFromEditor();
});

updateRoundInfo();
