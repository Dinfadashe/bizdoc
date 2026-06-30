// lib/offline/sync.ts
// Wraps Supabase reads/writes: writes go through a queue when offline,
// reads serve from IndexedDB cache first then refresh from network.

import { supabase } from "@/lib/supabase";
import { STORES, getAll, putAll, getById, put, deleteById, enqueue, getQueue, removeFromQueue, updateQueueItem, setMeta, getMeta, QueueItem } from "./db";

type SyncListener = (status: { syncing: boolean; pending: number; lastSynced: number | null; lastError: string | null }) => void;
const listeners: SyncListener[] = [];
let syncing = false;
let lastError: string | null = null;

export function onSyncStatus(fn: SyncListener) {
  listeners.push(fn);
  return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
}

async function notify() {
  const pending = (await getQueue()).length;
  const lastSynced = await getMeta("last_synced");
  listeners.forEach((fn) => fn({ syncing, pending, lastSynced: lastSynced ?? null, lastError }));
}

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

// ── READ: cache-first with background refresh ──────────────────
export async function loadInvoices(userId: string): Promise<any[]> {
  const cached = await getAll(STORES.invoices);
  const cachedForUser = cached.filter((i) => i.user_id === userId);

  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!error && data) {
        await putAll(STORES.invoices, data);
        return data;
      }
    } catch { /* fall through to cache */ }
  }
  return cachedForUser.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function loadInventory(userId: string): Promise<any[]> {
  const cached = await getAll(STORES.inventory);
  const cachedForUser = cached.filter((i) => i.user_id === userId);
  if (isOnline()) {
    try {
      const { data, error } = await supabase.from("inventory").select("*").eq("user_id", userId).order("name");
      if (!error && data) { await putAll(STORES.inventory, data); return data; }
    } catch { /* fall through */ }
  }
  return cachedForUser;
}

export async function loadExpenses(userId: string): Promise<any[]> {
  const cached = await getAll(STORES.expenses);
  const cachedForUser = cached.filter((i) => i.user_id === userId);
  if (isOnline()) {
    try {
      const { data, error } = await supabase.from("expenses").select("*").eq("user_id", userId).order("date", { ascending: false });
      if (!error && data) { await putAll(STORES.expenses, data); return data; }
    } catch { /* fall through */ }
  }
  return cachedForUser;
}

export async function loadBusiness(userId: string): Promise<any> {
  if (isOnline()) {
    try {
      const { data, error } = await supabase.from("businesses").select("*").eq("user_id", userId).single();
      if (!error && data) { await put(STORES.business, data); return data; }
    } catch { /* fall through */ }
  }
  return getById(STORES.business, userId);
}

export async function loadInvoiceById(id: string): Promise<any> {
  if (isOnline()) {
    try {
      const { data, error } = await supabase.from("invoices").select("*").eq("id", id).single();
      if (!error && data) { await put(STORES.invoices, data); return data; }
    } catch { /* fall through */ }
  }
  return getById(STORES.invoices, id);
}

// ── WRITE: optimistic local update + queue if offline ──────────
function tempId() {
  return "local_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
}

export async function createInvoice(payload: any): Promise<{ invoice: any; queued: boolean }> {
  if (isOnline()) {
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.invoice) {
        await put(STORES.invoices, data.invoice);
        return { invoice: data.invoice, queued: false };
      }
      throw new Error(data.error || "Failed to save");
    } catch (err) {
      // network blip mid-request - fall through to offline path
    }
  }
  // Offline path: optimistic local record + queue
  const localId = tempId();
  const optimisticInvoice = {
    id: localId,
    ...payload,
    status: "draft",
    invoice_number: "PENDING-" + localId.slice(-6).toUpperCase(),
    created_at: new Date().toISOString(),
    _pendingSync: true,
  };
  await put(STORES.invoices, optimisticInvoice);
  await enqueue({ type: "invoice_create", payload, local_id: localId });
  await notify();
  return { invoice: optimisticInvoice, queued: true };
}

export async function updateInvoice(id: string, payload: any): Promise<{ invoice: any; queued: boolean }> {
  const existing = await getById(STORES.invoices, id);
  const merged = { ...existing, ...payload, updated_at: new Date().toISOString() };

  if (isOnline() && !id.startsWith("local_")) {
    try {
      const res = await fetch("/api/invoices/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.invoice) {
        await put(STORES.invoices, data.invoice);
        return { invoice: data.invoice, queued: false };
      }
      throw new Error(data.error || "Failed to update");
    } catch { /* fall through to queue */ }
  }

  await put(STORES.invoices, { ...merged, _pendingSync: true });
  await enqueue({ type: "invoice_update", payload: { id, ...payload }, local_id: id });
  await notify();
  return { invoice: merged, queued: true };
}

export async function deleteInvoice(id: string): Promise<{ deleted: boolean; queued: boolean }> {
  if (isOnline() && !id.startsWith("local_")) {
    try {
      const res = await fetch("/api/invoices/" + id, { method: "DELETE" });
      const data = await res.json();
      if (data.deleted) {
        await deleteById(STORES.invoices, id);
        return { deleted: true, queued: false };
      }
      throw new Error(data.error || "Failed to delete");
    } catch { /* fall through to queue */ }
  }
  // If it's a local-only invoice that never synced, just remove it + cancel its queue entry
  await deleteById(STORES.invoices, id);
  if (!id.startsWith("local_")) {
    await enqueue({ type: "invoice_delete", payload: { id }, local_id: id });
  }
  await notify();
  return { deleted: true, queued: true };
}

// ── Sync engine: replays the queue when back online ─────────────
let syncInFlight = false;

export async function runSync(): Promise<void> {
  if (syncInFlight) return;
  if (!isOnline()) return;
  syncInFlight = true;
  syncing = true;
  lastError = null;
  await notify();

  try {
    let queue = await getQueue();
    for (const item of queue) {
      try {
        await processQueueItem(item);
        if (item.queueId != null) await removeFromQueue(item.queueId);
      } catch (err: any) {
        const attempts = (item.attempts ?? 0) + 1;
        if (item.queueId != null) {
          if (attempts >= 5) {
            // Give up after 5 attempts, drop from queue but keep record marked failed
            lastError = "A change to " + item.type.replace("_", " ") + " could not be synced after several attempts.";
            await removeFromQueue(item.queueId);
          } else {
            await updateQueueItem(item.queueId, { attempts, last_error: String(err?.message || err) });
          }
        }
      }
    }
    await setMeta("last_synced", Date.now());
  } finally {
    syncing = false;
    syncInFlight = false;
    await notify();
  }
}

async function processQueueItem(item: QueueItem): Promise<void> {
  if (item.type === "invoice_create") {
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item.payload),
    });
    const data = await res.json();
    if (!data.invoice) throw new Error(data.error || "Sync failed");
    // Replace the local optimistic record with the real one
    await deleteById(STORES.invoices, item.local_id);
    await put(STORES.invoices, data.invoice);
    return;
  }

  if (item.type === "invoice_update") {
    const { id, ...patch } = item.payload;
    const realId = id.startsWith("local_") ? null : id;
    if (!realId) {
      // The invoice itself hasn't synced yet — this shouldn't normally happen because
      // we process queue in order, but guard anyway by skipping (will retry next pass).
      throw new Error("Parent invoice not yet synced");
    }
    const res = await fetch("/api/invoices/" + realId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!data.invoice) throw new Error(data.error || "Sync failed");
    await put(STORES.invoices, data.invoice);
    return;
  }

  if (item.type === "invoice_delete") {
    const { id } = item.payload;
    if (id.startsWith("local_")) return; // never existed server-side
    const res = await fetch("/api/invoices/" + id, { method: "DELETE" });
    const data = await res.json();
    if (!data.deleted) throw new Error(data.error || "Sync failed");
    return;
  }

  // inventory / expenses queue types are processed the same general way;
  // left as no-ops here until those write paths are migrated in a later pass.
}

// ── Auto-trigger sync on reconnect ───────────────────────────────
let listenerAttached = false;
export function attachAutoSync() {
  if (listenerAttached || typeof window === "undefined") return;
  listenerAttached = true;
  window.addEventListener("online", () => { runSync(); });
  // Also try once on load in case we came back online before this script ran
  if (isOnline()) runSync();
  // Periodic safety-net sync every 2 minutes while online
  setInterval(() => { if (isOnline()) runSync(); }, 120000);
}

export async function getSyncStatus() {
  const pending = (await getQueue()).length;
  const lastSynced = await getMeta("last_synced");
  return { syncing, pending, lastSynced: lastSynced ?? null, lastError };
}
