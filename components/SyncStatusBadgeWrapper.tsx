"use client";
import dynamic from "next/dynamic";

const SyncStatusBadge = dynamic(() => import("./SyncStatusBadge"), { ssr: false });

export default function SyncStatusBadgeWrapper() {
  return <SyncStatusBadge />;
}
