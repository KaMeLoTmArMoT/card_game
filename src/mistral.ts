import { decryptApiKey, encryptApiKey } from "./crypto";
import { closeEditor, openEditor } from "./editor";
import { els } from "./els";
import { loadApiKey, saveApiKey } from "./keyStore";
import type { MistralResponse } from "./types";

const MODEL_NAME = "mistral-medium-2508";

export async function openAiDialog(): Promise<void> {
	els.aiError.textContent = "";
	els.aiStatus.textContent = `Model: ${MODEL_NAME}`;
	els.aiStatus.classList.remove("keyNeeded");
	els.aiPassphrase.classList.remove("keyNeeded");
	els.btnUnlockKey.hidden = true;

	const { plain, encrypted } = await loadApiKey();

	if (plain) {
		els.aiApiKey.value = plain;
		els.aiStatus.textContent = `${MODEL_NAME} · key loaded`;
	} else if (encrypted) {
		els.aiApiKey.value = "";
		els.aiStatus.textContent =
			"Saved encrypted key found. Enter your PIN/passphrase and press “Unlock saved key”.";
		els.btnUnlockKey.hidden = false;
		els.aiPassphrase.focus();
	} else {
		els.aiApiKey.value = "";
		els.aiStatus.textContent =
			"No saved key. Enter your Mistral API key below.";
	}

	els.aiDialog.open = true;
}

export async function unlockSavedKey(): Promise<void> {
	els.aiError.textContent = "";

	const { encrypted } = await loadApiKey();
	if (!encrypted) {
		els.aiError.textContent = "No encrypted key is saved.";
		return;
	}

	const passphrase = els.aiPassphrase.value.trim();
	if (!passphrase) {
		els.aiError.textContent = "Enter your PIN/passphrase first.";
		return;
	}

	try {
		const apiKey = await decryptApiKey(encrypted, passphrase);
		els.aiApiKey.value = apiKey;
		els.aiStatus.textContent = "Key unlocked.";
		els.btnUnlockKey.hidden = true;
		els.aiPassphrase.classList.remove("keyNeeded");
		els.aiStatus.classList.remove("keyNeeded");
	} catch {
		els.aiError.textContent =
			"Failed to decrypt API key with the provided PIN/passphrase.";
	}
}

export function closeAiDialog(): void {
	els.aiDialog.open = false;
}

export function handlePresetClick(e: Event): void {
	e.preventDefault();
	const chip = (e.target as HTMLElement).closest(".presetChip");
	if (!chip) return;
	const theme = chip.getAttribute("data-theme");
	const cols = chip.getAttribute("data-cols");
	const customCols = chip.getAttribute("data-custom-cols");

	if (theme) els.aiTheme.value = theme;
	if (cols) els.aiColsCount.value = cols;
	if (customCols) els.aiCustomCols.value = customCols;
}

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

export async function generateCardsWithMistral(e?: Event): Promise<void> {
	if (e) e.preventDefault();
	els.aiError.textContent = "";
	els.aiStatus.textContent = "Preparing request...";

	let apiKey = els.aiApiKey.value.trim();
	const passphrase = els.aiPassphrase.value.trim();

	const { encrypted: encKey } = await loadApiKey();
	if (!apiKey && encKey && passphrase) {
		try {
			apiKey = await decryptApiKey(encKey, passphrase);
			els.aiApiKey.value = apiKey;
		} catch {
			els.aiError.textContent =
				"Failed to decrypt API key with provided PIN/Passphrase.";
			els.aiStatus.textContent = "";
			return;
		}
	}

	if (!apiKey) {
		els.aiError.textContent = "Mistral API key is required.";
		els.aiStatus.textContent = "";
		return;
	}

	const theme = els.aiTheme.value.trim() || "General Knowledge";
	const colCount = Math.max(
		2,
		Math.min(6, Number.parseInt(els.aiColsCount.value, 10) || 3),
	);
	const rowCount = Math.max(
		5,
		Math.min(30, Number.parseInt(els.aiRowsCount.value, 10) || 15),
	);
	const customColsRaw = els.aiCustomCols.value.trim();
	const customCols = customColsRaw
		? customColsRaw
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean)
		: [];

	if (els.aiSaveKey.checked) {
		if (passphrase) {
			try {
				const encrypted = await encryptApiKey(apiKey, passphrase);
				await saveApiKey({ plain: null, encrypted });
			} catch {
				// encryption failure -> leave stored keys untouched
			}
		} else {
			await saveApiKey({ plain: apiKey, encrypted: null });
		}
	} else {
		await saveApiKey({ plain: null, encrypted: null });
	}

	els.btnGenerateAi.disabled = true;
	els.aiStatus.textContent = "Generating cards via Mistral API...";

	let colInstruction = `Generate ${colCount} descriptive header names in the "headers" array.`;
	if (customCols.length > 0) {
		colInstruction = `Use these exact header names in "headers": ${JSON.stringify(customCols)}.`;
	}

	const systemPrompt = `You are a helpful assistant generating matching tuples/cards for a learning card game.
Return ONLY a valid JSON object with the following schema:
{
  "headers": array of ${colCount} string column names,
  "data": array of ${rowCount} rows (each row is an array of exactly ${colCount} string values)
}
${colInstruction}
Ensure that elements across a row strictly match each other for the topic, and each row has unique/distinct content. Do NOT include markdown code fences or extra text outside JSON.`;

	const userPrompt = `Topic: "${theme}". Generate ${rowCount} distinct rows, each containing ${colCount} matching values.`;

	try {
		const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: MODEL_NAME,
				response_format: { type: "json_object" },
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userPrompt },
				],
			}),
		});

		if (!response.ok) {
			const errJson = (await response.json().catch(() => ({}))) as {
				message?: string;
				error?: { message?: string };
				detail?: string;
			};
			const msg =
				errJson.message ||
				errJson.error?.message ||
				errJson.detail ||
				`HTTP ${response.status} ${response.statusText}`;
			throw new Error(msg);
		}

		const resData = (await response.json()) as {
			choices?: { message?: { content?: string } }[];
		};

		const rawContent = resData.choices?.[0]?.message?.content;
		if (!rawContent)
			throw new Error("Received empty response content from Mistral");

		const parsed = JSON.parse(rawContent) as MistralResponse;
		if (
			!parsed.data ||
			!Array.isArray(parsed.data) ||
			parsed.data.length === 0
		) {
			throw new Error('Invalid JSON format: missing or empty "data" array');
		}

		const headers =
			Array.isArray(parsed.headers) && parsed.headers.length > 0
				? parsed.headers.map((h) => String(h).trim())
				: Array.from({ length: colCount }, (_, i) => `Col ${i + 1}`);

		const dataRows = (parsed.data as unknown[]).map((r) =>
			(Array.isArray(r) ? r : []).map((c) => String(c ?? "")),
		);

		els.aiStatus.textContent = `Generated ${dataRows.length} rows — review and edit them below.`;

		openEditor(headers, dataRows, {
			regenerable: true,
			onRegenerate: () => {
				closeEditor();
				openAiDialog();
			},
		});
		closeAiDialog();
	} catch (err) {
		els.aiError.textContent = `Error: ${errorMessage(err)}`;
		els.aiStatus.textContent = "";
	} finally {
		els.btnGenerateAi.disabled = false;
	}
}
