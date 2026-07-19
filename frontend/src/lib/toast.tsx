"use client";

import { toast as sonnerToast } from "sonner";
import { CheckCircle, AlertTriangle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning";

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 shrink-0 text-sync-emerald" aria-hidden="true" />,
  error: <AlertTriangle className="h-5 w-5 shrink-0 text-conflict-red" aria-hidden="true" />,
  warning: <Info className="h-5 w-5 shrink-0 text-sync-amber" aria-hidden="true" />,
};

const borderMap: Record<ToastType, string> = {
  success: "border-l-sync-emerald",
  error: "border-l-conflict-red",
  warning: "border-l-sync-amber",
};

const containerStyle: React.CSSProperties = {
  background: "#FFFFFF",
  borderRadius: "12px",
  padding: 0,
  fontFamily: "var(--font-ibm-plex-sans), ui-sans-serif, system-ui, sans-serif",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  border: "1px solid rgba(0,0,0,0.06)",
  width: "100%",
};

function ToastContent({ type, message }: { type: ToastType; message: string }) {
  return (
    <div className={`flex items-start gap-3 border-l-4 ${borderMap[type]} pl-4 pr-3 py-3`}>
      {iconMap[type]}
      <p className="text-sm text-ink">{message}</p>
    </div>
  );
}

function createToast(type: ToastType, message: string) {
  sonnerToast.custom(
    () => <ToastContent type={type} message={message} />,
    { duration: 4000, style: containerStyle },
  );
}

export const toast = {
  success: (message: string) => createToast("success", message),
  error: (message: string) => createToast("error", message),
  warning: (message: string) => createToast("warning", message),
};
