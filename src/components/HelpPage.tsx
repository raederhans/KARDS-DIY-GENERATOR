import { useEffect, useRef } from "react";
import type { UiText } from "../i18n";
import "./HelpPage.css";

interface HelpPageProps {
  open: boolean;
  text: UiText["help"];
  onClose: () => void;
}

export function HelpPage({ open, text, onClose }: HelpPageProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  return (
    <section id="help-page" className="help-page" aria-labelledby="help-page-title" hidden={!open}>
      <div className="help-page-inner">
        <header className="help-page-header">
          <div>
            <span className="help-eyebrow">{text.eyebrow}</span>
            <h2 id="help-page-title">{text.title}</h2>
            <p>{text.intro}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="help-close"
            aria-label={text.closeAria}
            onClick={onClose}
          >
            {text.close}
          </button>
        </header>

        <section className="help-section" aria-labelledby="help-start-title">
          <h3 id="help-start-title">{text.quickStart}</h3>
          <ol className="help-steps">
            {text.quickSteps.map((step, index) => (
              <li key={step.title}>
                <span className="help-step-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="help-guide-grid">
          <section className="help-section help-card" aria-labelledby="help-workspace-title">
            <h3 id="help-workspace-title">{text.workspaceTitle}</h3>
            <dl className="help-definition-list">
              {text.workspaceItems.map((item) => (
                <div key={item.title}>
                  <dt>{item.title}</dt>
                  <dd>{item.body}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="help-section help-card" aria-labelledby="help-save-title">
            <h3 id="help-save-title">{text.saveTitle}</h3>
            <dl className="help-definition-list">
              {text.saveItems.map((item) => (
                <div key={item.title}>
                  <dt>{item.title}</dt>
                  <dd>{item.body}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <div className="help-note-grid">
          <section className="help-note" aria-labelledby="help-reference-title">
            <span className="help-note-mark" aria-hidden="true">↔</span>
            <div>
              <h3 id="help-reference-title">{text.referenceTitle}</h3>
              <p>{text.referenceBody}</p>
            </div>
          </section>
          <section className="help-note" aria-labelledby="help-privacy-title">
            <span className="help-note-mark" aria-hidden="true">⌂</span>
            <div>
              <h3 id="help-privacy-title">{text.privacyTitle}</h3>
              <p>{text.privacyBody}</p>
            </div>
          </section>
        </div>

        <section className="help-section help-tips" aria-labelledby="help-tips-title">
          <h3 id="help-tips-title">{text.tipsTitle}</h3>
          <ul>
            {text.tips.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
        </section>
      </div>
    </section>
  );
}
