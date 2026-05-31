"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { submitFeedbackReport } from "@/lib/feedback-actions";

export default function FeedbackModal() {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const closeModal = useCallback(() => {
    setOpen(false);
    formRef.current?.reset();
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeModal, open]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function openModal() {
    setSuccess(false);
    setErrorMsg(null);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    if (typeof window !== "undefined") {
      formData.set("page_url", window.location.href);
      formData.set("user_agent", navigator.userAgent.slice(0, 500));
    }
    startTransition(async () => {
      const result = await submitFeedbackReport(formData);
      if (result.ok) {
        setSuccess(true);
      } else {
        setErrorMsg(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      <button type="button" className="feedback-trigger-btn" onClick={openModal}>
        Give feedback
      </button>

      {open && (
        <div
          className="feedback-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="feedback-modal">
            <div className="feedback-modal__inner">
              <div className="feedback-modal__header">
                <h2 id="feedback-modal-title" className="feedback-modal__title">
                  Share feedback
                </h2>
                <button
                  type="button"
                  className="feedback-modal__close"
                  aria-label="Close feedback form"
                  onClick={closeModal}
                >
                  ✕
                </button>
              </div>

              {success ? (
                <div className="feedback-modal__success" role="status">
                  <p>Thank you — your feedback has been sent.</p>
                  <button type="button" className="admin-button" onClick={closeModal}>
                    Close
                  </button>
                </div>
              ) : (
                <form ref={formRef} onSubmit={handleSubmit} className="feedback-modal__form">
                  {errorMsg && (
                    <p className="feedback-modal__error" role="alert">
                      {errorMsg}
                    </p>
                  )}

                  <label className="feedback-modal__field">
                    <span>Type</span>
                    <select name="type" required defaultValue="">
                      <option value="" disabled>Choose one</option>
                      <option value="bug">Bug report</option>
                      <option value="suggestion">Suggestion</option>
                      <option value="content">Content issue</option>
                      <option value="accessibility">Accessibility</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label className="feedback-modal__field">
                    <span>Message</span>
                    <textarea
                      name="message"
                      rows={5}
                      required
                      minLength={10}
                      maxLength={5000}
                      placeholder="Describe the issue or suggestion…"
                    />
                  </label>

                  <button
                    type="submit"
                    className="admin-button"
                    disabled={isPending}
                    aria-busy={isPending}
                  >
                    {isPending ? "Sending…" : "Send feedback"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
