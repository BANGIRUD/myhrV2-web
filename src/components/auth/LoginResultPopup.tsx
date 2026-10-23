import { useEffect, useId, type CSSProperties } from "react";
import { createPortal } from "react-dom";

export type LoginResultStatus = "success" | "error";

type LoginResultPopupProps = {
  open: boolean;
  status: LoginResultStatus;
  title: string;
  message: string;
  onClose?: () => void;
  /** Auto-close after ms (used for success before redirect). */
  autoCloseMs?: number;
};

export default function LoginResultPopup({
  open,
  status,
  title,
  message,
  onClose,
  autoCloseMs,
}: LoginResultPopupProps) {
  const titleId = useId();
  const descId = useId();
  const isSuccess = status === "success";

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSuccess) onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);

    let timer: number | undefined;
    if (autoCloseMs && autoCloseMs > 0) {
      timer = window.setTimeout(() => onClose?.(), autoCloseMs);
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (timer) window.clearTimeout(timer);
    };
  }, [open, autoCloseMs, onClose, isSuccess]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="login-result-root fixed inset-0 z-99999 flex items-center justify-center p-4"
      role="presentation"
    >
      <style>{`
        @keyframes lr-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lr-card-in {
          0% { opacity: 0; transform: translateY(28px) scale(0.88); filter: blur(6px); }
          60% { opacity: 1; transform: translateY(-4px) scale(1.02); filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes lr-ring-burst {
          0% { transform: scale(0.55); opacity: 0.7; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes lr-icon-pop {
          0% { transform: scale(0.2) rotate(-12deg); opacity: 0; }
          55% { transform: scale(1.12) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes lr-check-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes lr-x-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes lr-shake {
          0%, 100% { transform: translateX(0); }
          18% { transform: translateX(-10px); }
          36% { transform: translateX(9px); }
          54% { transform: translateX(-7px); }
          72% { transform: translateX(5px); }
          90% { transform: translateX(-2px); }
        }
        @keyframes lr-glow-pulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes lr-particle {
          0% { transform: translate(0, 0) scale(1); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes lr-progress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        .lr-backdrop { animation: lr-backdrop-in 0.28s ease-out both; }
        .lr-card { animation: lr-card-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .lr-card-error { animation: lr-card-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both, lr-shake 0.55s ease-in-out 0.2s both; }
        .lr-icon { animation: lr-icon-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.12s both; }
        .lr-ring { animation: lr-ring-burst 0.9s ease-out 0.2s both; }
        .lr-glow { animation: lr-glow-pulse 2s ease-in-out infinite; }
        .lr-check-path {
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: lr-check-draw 0.45s ease-out 0.35s forwards;
        }
        .lr-x-path {
          stroke-dasharray: 28;
          stroke-dashoffset: 28;
          animation: lr-x-draw 0.35s ease-out 0.35s forwards;
        }
        .lr-particle {
          animation: lr-particle 0.9s ease-out 0.3s both;
        }
        .lr-progress {
          transform-origin: left center;
          animation: lr-progress var(--lr-duration, 1.6s) linear 0.2s both;
        }
      `}</style>

      {isSuccess ? (
        <div
          className="lr-backdrop absolute inset-0 bg-[#07121f]/55 backdrop-blur-md"
          aria-hidden="true"
        />
      ) : (
        <button
          type="button"
          className="lr-backdrop absolute inset-0 border-0 bg-[#07121f]/55 backdrop-blur-md"
          aria-label="Dismiss"
          onClick={onClose}
        />
      )}

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={`${isSuccess ? "lr-card" : "lr-card-error"} relative w-full max-w-[360px] overflow-hidden rounded-2xl border border-white/15 bg-white/95 p-7 shadow-[0_28px_80px_-28px_rgba(7,18,31,0.7)] backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/95`}
      >
        <div
          className={`pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl ${
            isSuccess ? "bg-sky-400/40" : "bg-rose-500/35"
          } lr-glow`}
          aria-hidden="true"
        />

        {isSuccess ? (
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {[
              { tx: "-56px", ty: "-48px", left: "48%", top: "28%" },
              { tx: "60px", ty: "-40px", left: "52%", top: "30%" },
              { tx: "-70px", ty: "20px", left: "46%", top: "34%" },
              { tx: "68px", ty: "28px", left: "54%", top: "34%" },
              { tx: "0px", ty: "-64px", left: "50%", top: "26%" },
              { tx: "-40px", ty: "52px", left: "48%", top: "36%" },
            ].map((p, i) => (
              <span
                key={i}
                className="lr-particle absolute h-1.5 w-1.5 rounded-full bg-sky-400"
                style={
                  {
                    left: p.left,
                    top: p.top,
                    "--tx": p.tx,
                    "--ty": p.ty,
                    animationDelay: `${0.28 + i * 0.04}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        ) : null}

        <div className="relative flex flex-col items-center text-center">
          <div className="lr-icon relative mb-5 flex h-20 w-20 items-center justify-center">
            <span
              className={`lr-ring absolute inset-0 rounded-full border-2 ${
                isSuccess ? "border-sky-400/70" : "border-rose-400/70"
              }`}
              aria-hidden="true"
            />
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg ${
                isSuccess
                  ? "bg-gradient-to-br from-sky-400 to-brand-500 shadow-sky-500/40"
                  : "bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/40"
              }`}
            >
              {isSuccess ? (
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                  <path
                    className="lr-check-path"
                    d="M8 17.5L14.5 24L26 11"
                    stroke="white"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
                  <path
                    className="lr-x-path"
                    d="M9 9L21 21"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    className="lr-x-path"
                    d="M21 9L9 21"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    style={{ animationDelay: "0.45s" }}
                  />
                </svg>
              )}
            </span>
          </div>

          <p
            className={`mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] ${
              isSuccess ? "text-sky-600 dark:text-sky-300" : "text-rose-600 dark:text-rose-300"
            }`}
          >
            {isSuccess ? "Authenticated" : "Access denied"}
          </p>
          <h2
            id={titleId}
            className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white/90"
          >
            {title}
          </h2>
          <p
            id={descId}
            className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400"
          >
            {message}
          </p>

          {isSuccess ? (
            <div className="mt-6 w-full">
              <div className="mb-2 flex items-center justify-between text-[11px] text-gray-400">
                <span>Opening workspace</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                  Redirecting…
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="lr-progress h-full rounded-full bg-gradient-to-r from-sky-400 to-brand-500"
                  style={
                    {
                      "--lr-duration": `${(autoCloseMs ?? 1600) / 1000}s`,
                    } as CSSProperties
                  }
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(244,63,94,0.85)] transition-colors hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
