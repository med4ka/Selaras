"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle } from "lucide-react";
import { cn } from "@/utils/cn";

type SyncStatus = "synced" | "pending" | "offline";

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>("synced");
  const [label, setLabel] = useState("Synced");

  useEffect(() => {
    function updateOnlineStatus() {
      if (!navigator.onLine) {
        setStatus("offline");
        setLabel("Offline");
        return;
      }
    }

    window.addEventListener("online", () => updateOnlineStatus());
    window.addEventListener("offline", () => updateOnlineStatus());
    updateOnlineStatus();

    return () => {
      window.removeEventListener("online", () => updateOnlineStatus());
      window.removeEventListener("offline", () => updateOnlineStatus());
    };
  }, []);

  const colorMap = {
    synced: "bg-sync-emerald/10 text-sync-emerald border-sync-emerald/20",
    pending: "bg-sync-amber/10 text-sync-amber border-sync-amber/20",
    offline: "bg-sync-amber/10 text-sync-amber border-sync-amber/20",
  };

  const iconMap = {
    synced: CheckCircle,
    pending: RefreshCw,
    offline: WifiOff,
  };

  const Icon = iconMap[status];

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        colorMap[status]
      )}
      role="status"
      aria-live="polite"
      aria-label={`Sync status: ${label}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span className="font-mono text-[11px]">{label}</span>
    </div>
  );
}
