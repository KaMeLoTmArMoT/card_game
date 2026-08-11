const PLAIN_KEY = "mistral_api_key";
const ENCRYPTED_KEY = "mistral_encrypted_key";

const DB_NAME = "card-match";
const DB_STORE = "keys";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			if (!req.result.objectStoreNames.contains(DB_STORE)) {
				req.result.createObjectStore(DB_STORE);
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
	return dbPromise;
}

async function idbGet(key: string): Promise<string | null> {
	try {
		const db = await openDb();
		return await new Promise<string | null>((resolve, reject) => {
			const tx = db.transaction(DB_STORE, "readonly");
			const r = tx.objectStore(DB_STORE).get(key);
			r.onsuccess = () => resolve((r.result as string | undefined) ?? null);
			r.onerror = () => reject(r.error);
		});
	} catch {
		return null;
	}
}

async function idbSet(key: string, value: string): Promise<void> {
	try {
		const db = await openDb();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(DB_STORE, "readwrite");
			tx.objectStore(DB_STORE).put(value, key);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	} catch {
		// best-effort only
	}
}

async function idbDelete(key: string): Promise<void> {
	try {
		const db = await openDb();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(DB_STORE, "readwrite");
			tx.objectStore(DB_STORE).delete(key);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	} catch {
		// best-effort only
	}
}

export interface ApiKeyBundle {
	plain: string | null;
	encrypted: string | null;
}

export async function saveApiKey(bundle: ApiKeyBundle): Promise<void> {
	if (bundle.plain) localStorage.setItem(PLAIN_KEY, bundle.plain);
	else localStorage.removeItem(PLAIN_KEY);
	if (bundle.encrypted) localStorage.setItem(ENCRYPTED_KEY, bundle.encrypted);
	else localStorage.removeItem(ENCRYPTED_KEY);

	await Promise.all([
		bundle.plain ? idbSet(PLAIN_KEY, bundle.plain) : idbDelete(PLAIN_KEY),
		bundle.encrypted
			? idbSet(ENCRYPTED_KEY, bundle.encrypted)
			: idbDelete(ENCRYPTED_KEY),
	]);
}

export async function loadApiKey(): Promise<ApiKeyBundle> {
	let plain = localStorage.getItem(PLAIN_KEY);
	let encrypted = localStorage.getItem(ENCRYPTED_KEY);

	if (!plain && !encrypted) {
		const [p, e] = await Promise.all([
			idbGet(PLAIN_KEY),
			idbGet(ENCRYPTED_KEY),
		]);
		plain = p;
		encrypted = e;
	}

	return { plain, encrypted };
}
