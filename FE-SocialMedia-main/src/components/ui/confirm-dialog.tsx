"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/theme/ui";

type ConfirmDialogOptions = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PromptDialogOptions = ConfirmDialogOptions & {
  defaultValue?: string;
  placeholder?: string;
};

type DialogRequest =
  | {
      kind: "confirm";
      options: ConfirmDialogOptions;
      resolve: (value: boolean) => void;
    }
  | {
      kind: "prompt";
      options: PromptDialogOptions;
      value: string;
      resolve: (value: string | null) => void;
    };

export function useConfirmDialog() {
  const [request, setRequest] = useState<DialogRequest | null>(null);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ kind: "confirm", options, resolve });
    });
  }, []);

  const prompt = useCallback((options: PromptDialogOptions) => {
    return new Promise<string | null>((resolve) => {
      setRequest({ kind: "prompt", options, value: options.defaultValue ?? "", resolve });
    });
  }, []);

  const close = useCallback(
    (value: boolean | string | null) => {
      if (!request) {
        return;
      }

      const current = request;
      setRequest(null);

      if (current.kind === "confirm") {
        current.resolve(Boolean(value));
        return;
      }

      current.resolve(typeof value === "string" ? value : null);
    },
    [request],
  );

  useEffect(() => {
    if (!request) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, request]);

  const dialog =
    request && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 px-4 py-6">
            <div className="absolute inset-0" onClick={() => close(false)} role="presentation" />
            <div
              aria-modal="true"
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border-light bg-surface text-t-primary shadow-[var(--shadow-elevated)]"
              dir="auto"
              role="dialog"
            >
              <div className="flex items-center gap-3 border-b border-border-light px-4 py-3">
                <button
                  aria-label={request.options.cancelLabel ?? "Cancel"}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-2xl leading-none text-t-muted transition hover:bg-surface-muted"
                  onClick={() => close(false)}
                  type="button"
                >
                  ×
                </button>
                <h2 className="min-w-0 flex-1 text-center text-[18px] font-bold">{request.options.title}</h2>
                <span className="h-9 w-9 shrink-0" />
              </div>

              <form
                className="space-y-5 px-5 py-5"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  close(request.kind === "prompt" ? request.value : true);
                }}
              >
                {request.options.message ? (
                  <p className="text-[14px] leading-6 text-t-secondary">{request.options.message}</p>
                ) : null}

                {request.kind === "prompt" ? (
                  <input
                    autoFocus
                    className="w-full rounded-xl border border-border-light bg-surface-input px-4 py-3 text-[15px] text-t-primary outline-none focus:border-fb focus:ring-2 focus:ring-fb/20"
                    onChange={(event) =>
                      setRequest((current) =>
                        current?.kind === "prompt" ? { ...current, value: event.target.value } : current,
                      )
                    }
                    placeholder={request.options.placeholder}
                    value={request.value}
                  />
                ) : null}

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    className="rounded-lg px-4 py-2 text-[14px] font-bold text-fb transition hover:bg-fb/10"
                    onClick={() => close(false)}
                    type="button"
                  >
                    {request.options.cancelLabel ?? "Cancel"}
                  </button>
                  <button
                    className={cn(
                      "rounded-lg px-4 py-2 text-[14px] font-bold text-white transition disabled:opacity-50",
                      request.options.destructive ? "bg-red-600 hover:bg-red-700" : "bg-fb hover:bg-fb-hover",
                    )}
                    disabled={request.kind === "prompt" && !request.value.trim()}
                    type="submit"
                  >
                    {request.options.confirmLabel ?? "OK"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null;

  return { confirm, prompt, ConfirmDialog: dialog };
}
