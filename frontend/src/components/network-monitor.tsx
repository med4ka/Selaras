"use client";

import { useEffect } from "react";
import { useNetworkStore } from "@/store/network-store";

export function NetworkMonitor() {
  const startMonitoring = useNetworkStore((s) => s.startMonitoring);

  useEffect(() => {
    const cleanup = startMonitoring();
    return cleanup;
  }, [startMonitoring]);

  return null;
}
