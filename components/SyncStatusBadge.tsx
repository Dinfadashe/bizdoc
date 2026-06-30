"use client";
import { useEffect, useState } from "react";
import { onSyncStatus, attachAutoSync, isOnline, runSync } from "@/lib/offline/sync";

export default function SyncStatusBadge() {
  const [online, setOnline] = useState(true);
  const [status, setStatus] = useState<{ syncing: boolean; pending: number; lastSynced: number | null; lastError: string | null }>({
    syncing: false, pending: 0, lastSynced: null, lastError: null,
  });
  const [show, setShow] = useState(false);

  useEffect(() => {
    setOnline(isOnline());
    attachAutoSync();
    const unsub = onSyncStatus((s) => {
      setStatus(s);
      setShow(true);
      if (!s.syncing && s.pending === 0) {
        const t = setTimeout(() => setShow(false), 3000);
        return () => clearTimeout(t);
      }
    });
    const goOnline = () => { setOnline(true); setShow(true); runSync(); };
    const goOffline = () => { setOnline(false); setShow(true); };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      unsub();
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!online) {
    return (
      <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 500, background: "#1a1a2e", color: "white", padding: "9px 18px", borderRadius: 100, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff8a8a" }} />
        Offline {status.pending > 0 ? `· ${status.pending} change${status.pending > 1 ? "s" : ""} will sync when reconnected` : "· viewing saved data"}
      </div>
    );
  }

  if (!show) return null;

  if (status.syncing) {
    return (
      <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 500, background: "var(--green)", color: "white", padding: "9px 18px", borderRadius: 100, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", animation: "pulse 1s infinite" }} />
        Syncing {status.pending > 0 ? `${status.pending} change${status.pending > 1 ? "s" : ""}...` : "..."}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      </div>
    );
  }

  if (status.pending > 0) {
    return (
      <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 500, background: "#b36000", color: "white", padding: "9px 18px", borderRadius: 100, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
        {status.pending} change{status.pending > 1 ? "s" : ""} pending sync
      </div>
    );
  }

  if (status.lastError) {
    return (
      <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 500, background: "#cc2222", color: "white", padding: "9px 18px", borderRadius: 100, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
        Sync issue — will retry automatically
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 500, background: "var(--green)", color: "white", padding: "9px 18px", borderRadius: 100, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#a8d5b5" }} />
      All changes synced
    </div>
  );
}
