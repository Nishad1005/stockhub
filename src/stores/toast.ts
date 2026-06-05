/**
 * Toast store — the v0.2 equivalent of v0.1's `toast(msg, type)`. Never use
 * alert()/confirm() (CLAUDE.md §6). Call `toast(...)` from anywhere; render
 * <Toaster/> once near the app root.
 */
import { create } from "zustand";

export type ToastType = "ok" | "warn" | "err";

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, type?: ToastType) => void;
  dismiss: (id: number) => void;
}

let seq = 0;
const TIMEOUT_MS = 3200;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, type = "ok") => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), TIMEOUT_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper, mirrors v0.1 `toast(msg, type)`. */
export const toast = (message: string, type: ToastType = "ok") =>
  useToastStore.getState().show(message, type);
