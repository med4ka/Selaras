"use client";

import { useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { formatCurrency, formatDateTime } from "@/utils/format";

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface ReceiptData {
  outletName: string;
  outletAddress?: string;
  cashierName: string;
  date: Date;
  refNo: string;
  items: ReceiptItem[];
  total: number;
  method: "cash" | "qris" | "card";
}

interface ReceiptModalProps {
  data: ReceiptData;
  open: boolean;
  onClose: () => void;
}

const methodLabels: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  card: "Kartu",
};

export function ReceiptModal({ data, open, onClose }: ReceiptModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef });
  const [fontFaces, setFontFaces] = useState("");

  useEffect(() => {
    const rules: string[] = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSFontFaceRule && rule.cssText.includes("IBM Plex Mono")) {
            rules.push(rule.cssText);
          }
        }
      } catch {}
    }
    setFontFaces(rules.join("\n"));
  }, []);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="w-full max-w-sm rounded-xl border border-border/50 bg-surface p-5 shadow-lg">
          <p className="mb-4 text-sm font-medium text-ink">
            Cetak struk transaksi?
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border/50 px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-canvas"
            >
              Lewati
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 rounded-lg bg-ledger-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ledger-navy/90"
            >
              Cetak Struk
            </button>
          </div>
        </div>
      </div>

      <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
        <div ref={contentRef}>
          <style>{`
            ${fontFaces}
            @page { size: 80mm auto; margin: 4mm; }
            @media print {
              * { color: black !important; background: transparent !important; }
              body { background: white !important; margin: 0; padding: 0; }
              .receipt-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 11px; line-height: 1.5; max-width: 72mm; }
              .receipt-content .mono { font-family: "IBM Plex Mono", "Courier New", monospace !important; }
              .receipt-content hr { border: none; border-top: 1px dashed black !important; margin: 4px 0; }
            }
          `}</style>
          <div className="receipt-content">
            <p style={{ textAlign: "center", fontWeight: "bold", marginBottom: "2px" }}>
              {data.outletName}
            </p>
            {data.outletAddress && (
              <p style={{ textAlign: "center", fontSize: "10px", marginBottom: "4px" }}>
                {data.outletAddress}
              </p>
            )}
            <hr />
            <p style={{ fontSize: "10px" }}>
              Tanggal: <span className="mono">{formatDateTime(data.date)}</span>
            </p>
            <p style={{ fontSize: "10px" }}>
              Kasir: {data.cashierName}
            </p>
            <p style={{ fontSize: "10px" }}>
              No. Ref: <span className="mono">{data.refNo}</span>
            </p>
            <hr />
            {data.items.map((item, i) => (
              <div key={i} style={{ marginBottom: "3px" }}>
                <p style={{ fontSize: "10px" }}>{item.name}</p>
                <p className="mono" style={{ fontSize: "10px" }}>
                  {item.quantity} x {formatCurrency(item.price)}{" "}
                  <span style={{ float: "right" }}>{formatCurrency(item.subtotal)}</span>
                </p>
              </div>
            ))}
            <hr />
            <p className="mono" style={{ fontSize: "12px", fontWeight: "bold" }}>
              TOTAL{" "}
              <span style={{ float: "right" }}>{formatCurrency(data.total)}</span>
            </p>
            <p style={{ fontSize: "10px" }}>
              Metode: {methodLabels[data.method] || data.method}
            </p>
            <hr />
            <p style={{ textAlign: "center", fontSize: "10px", marginTop: "6px" }}>
              Terima kasih atas kunjungan Anda
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
