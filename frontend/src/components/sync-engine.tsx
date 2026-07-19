"use client";

import { useEffect, useRef } from "react";
import { useNetworkStore } from "@/store/network-store";
import { syncPendingTransactions } from "@/lib/sync";

export function SyncEngine() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let prevOnline = useNetworkStore.getState().isOnline;

    const unsub = useNetworkStore.subscribe((state) => {
      if (!prevOnline && state.isOnline) {
        syncPendingTransactions();
      }
      prevOnline = state.isOnline;
    });

    const intervalId = setInterval(() => {
      if (useNetworkStore.getState().isOnline) {
        syncPendingTransactions();
      }
    }, 30_000);

    return () => {
      unsub();
      clearInterval(intervalId);
    };
  }, []);

  return null;
}
