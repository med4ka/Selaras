import { create } from "zustand";
import { toast } from "@/lib/toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

interface NetworkState {
  isOnline: boolean;
  lastCheckedAt: number;
  startMonitoring: () => () => void;
}

async function checkServer(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    await fetch(`${API_URL}/outlets`, {
      signal: controller.signal,
      credentials: "include",
    });
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  lastCheckedAt: Date.now(),

  startMonitoring: () => {
    let prevOnline = get().isOnline;

    const updateStatus = async (browserOnline: boolean) => {
      const now = Date.now();
      let nextOnline: boolean;

      if (browserOnline) {
        nextOnline = await checkServer();
      } else {
        nextOnline = false;
      }

      if (prevOnline !== nextOnline) {
        prevOnline = nextOnline;
        if (!nextOnline) {
          toast.warning("Koneksi terputus — transaksi akan disimpan secara lokal");
        } else {
          toast.success("Koneksi tersambung kembali — menyinkronkan data...");
        }
      }

      set({ isOnline: nextOnline, lastCheckedAt: now });
    };

    const handleOnline = () => updateStatus(true);
    const handleOffline = () => updateStatus(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const intervalId = setInterval(() => {
      if (!navigator.onLine) return;
      updateStatus(true);
    }, 15_000);

    // Immediate initial verification — jangan nunggu interval pertama
    updateStatus(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
    };
  },
}));
