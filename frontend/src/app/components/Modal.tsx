"use client";
import React from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl sm:max-h-[calc(100dvh-2rem)]">
        <div className="px-4 py-3 border-b border-border">
          <div className="text-sm font-semibold">{title}</div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {footer}
        </div>
      </div>
    </div>
  );
}
