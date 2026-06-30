// lib/offline/db.ts
// IndexedDB layer for BizDoc offline support.
// Stores: invoices, customers (clients), products (inventory), expenses,
// business profile, and a write-queue for pending sync operations.

const DB_NAME = "bizdoc-offline";
const DB_VERSION = 1;

export const STORES = {
  invoices: "invoices",
  inventory: "inventory",
  expenses: "expenses",
  business: "business",
  queue: "sync_queue",
  meta: "meta",
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.invoices)) {
        db.createObjectStore(STORES.invoices, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.inventory)) {
        db.createObjectStore(STORES.inventory, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.expenses)) {
        db.createObjectStore(STORES.expenses, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.business)) {
        db.createObjectStore(STORES.business, { keyPath: "user_id" });
      }
      if (!db.objectStoreNames.contains(STORES.queue)) {
        const qs = db.createObjectStore(STORES.queue, { keyPath: "queueId", autoIncrement: true });
        qs.createIndex("created_at", "created_at");
      }
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const result = fn(store);
    if (result) {
      result.onsuccess = () => resolve(result.result);
      result.onerror = () => reject(result.error);
    } else {
      t.oncomplete = () => resolve(undefined as unknown as T);
      t.onerror = () => reject(t.error);
    }
  });
}

// ── Generic helpers ──────────────────────────────────────────
export async function putAll(storeName: string, items: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, "readwrite");
    const store = t.objectStore(storeName);
    items.forEach((item) => store.put(item));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function put(storeName: string, item: any): Promise<void> {
  await tx(storeName, "readwrite", (store) => store.put(item) as any);
}

export async function getAll(storeName: string): Promise<any[]> {
  return tx(storeName, "readonly", (store) => store.getAll() as any);
}

export async function getById(storeName: string, id: string): Promise<any> {
  return tx(storeName, "readonly", (store) => store.get(id) as any);
}

export async function deleteById(storeName: string, id: string): Promise<void> {
  await tx(storeName, "readwrite", (store) => store.delete(id) as any);
}

export async function clearStore(storeName: string): Promise<void> {
  await tx(storeName, "readwrite", (store) => store.clear() as any);
}

// ── Meta (last sync timestamps, etc) ─────────────────────────
export async function setMeta(key: string, value: any): Promise<void> {
  await put(STORES.meta, { key, value, updated_at: Date.now() });
}

export async function getMeta(key: string): Promise<any> {
  const row = await getById(STORES.meta, key);
  return row?.value;
}

// ── Sync Queue ────────────────────────────────────────────────
export interface QueueItem {
  queueId?: number;
  type: "invoice_create" | "invoice_update" | "invoice_delete"
      | "inventory_create" | "inventory_update" | "inventory_delete"
      | "expense_create" | "expense_delete";
  payload: any;
  local_id: string; // client-generated id used for optimistic UI
  created_at: number;
  attempts: number;
  last_error?: string;
}

export async function enqueue(item: Omit<QueueItem, "queueId" | "created_at" | "attempts">): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORES.queue, "readwrite");
    const store = t.objectStore(STORES.queue);
    const req = store.add({ ...item, created_at: Date.now(), attempts: 0 });
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getQueue(): Promise<QueueItem[]> {
  const items = await getAll(STORES.queue);
  return items.sort((a, b) => a.created_at - b.created_at);
}

export async function removeFromQueue(queueId: number): Promise<void> {
  await deleteById(STORES.queue, String(queueId));
}

export async function updateQueueItem(queueId: number, patch: Partial<QueueItem>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORES.queue, "readwrite");
    const store = t.objectStore(STORES.queue);
    const getReq = store.get(queueId);
    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) { resolve(); return; }
      store.put({ ...existing, ...patch });
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function queueCount(): Promise<number> {
  const items = await getQueue();
  return items.length;
}
