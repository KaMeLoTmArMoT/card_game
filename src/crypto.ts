import type { EncryptedKeyBundle } from "./types";

const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveCryptoKey(
	passphrase: string,
	salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
	const keyMaterial = await window.crypto.subtle.importKey(
		"raw",
		enc.encode(passphrase),
		"PBKDF2",
		false,
		["deriveKey"],
	);
	return window.crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt,
			iterations: 100000,
			hash: "SHA-256",
		},
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

export async function encryptApiKey(
	apiKey: string,
	passphrase: string,
): Promise<string> {
	const salt = window.crypto.getRandomValues(new Uint8Array(16));
	const iv = window.crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveCryptoKey(passphrase, salt);
	const ciphertext = await window.crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		enc.encode(apiKey),
	);
	const bundle: EncryptedKeyBundle = {
		salt: Array.from(salt),
		iv: Array.from(iv),
		ciphertext: Array.from(new Uint8Array(ciphertext)),
	};
	return JSON.stringify(bundle);
}

export async function decryptApiKey(
	encryptedJson: string,
	passphrase: string,
): Promise<string> {
	const bundle = JSON.parse(encryptedJson) as EncryptedKeyBundle;
	const salt = new Uint8Array(bundle.salt);
	const iv = new Uint8Array(bundle.iv);
	const ciphertext = new Uint8Array(bundle.ciphertext);
	const key = await deriveCryptoKey(passphrase, salt);
	const decrypted = await window.crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		key,
		ciphertext,
	);
	return dec.decode(decrypted);
}
