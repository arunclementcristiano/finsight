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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-t-2xl sm:rounded-xl border border-border bg-card shadow-xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0">
        {/* Mobile-optimized header */}
        <div className="px-4 sm:px-6 py-4 sm:py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="text-base sm:text-sm font-semibold">{title}</div>
            <button 
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-muted transition-colors touch-manipulation flex items-center justify-center"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Mobile-optimized content */}
        <div className="p-4 sm:p-6 max-h-[60vh] sm:max-h-[70vh] overflow-auto">
          {children}
        </div>
        
        {/* Mobile-optimized footer */}
        <div className="px-4 sm:px-6 py-4 sm:py-3 border-t border-border">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-2">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

