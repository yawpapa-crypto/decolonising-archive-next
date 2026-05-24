"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/** Default page width (US Letter at 96dpi), capped for a comfortable writing measure. */
export const DOCUMENT_PAGE_WIDTH_PX = 816;
export const DOCUMENT_PAGE_MIN_WIDTH_PX = 816;
export const DOCUMENT_PAGE_MIN_WIDTH_MOBILE_PX = 280;
export const DOCUMENT_PAGE_MAX_WIDTH_PX = 840;
export const DOCUMENT_PAGE_HEIGHT_PX = 1056;
export const DOCUMENT_PAGE_GAP_PX = 28;
const PAGE_LEFT_GUTTER_PX = 12;
/** Breathing room between the page edge and the format drawer */
const DRAWER_GAP_PX = 10;

type Props = {
  title: ReactNode;
  editor: ReactNode;
  pageLabel?: string;
  zoom?: number;
  wordCount?: number;
  documentFontFamily?: string;
  /** When true, page fills width and sits flush against the format drawer */
  flushToDrawer?: boolean;
};

/**
 * Word-style page stack inside `.workbench-document-pages-scroll` (parent scroll viewport).
 */
export default function WorkbenchDocumentPageView({
  title,
  editor,
  pageLabel = "Page 1",
  zoom = 100,
  wordCount,
  documentFontFamily,
  flushToDrawer = false,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [pageWidth, setPageWidth] = useState(DOCUMENT_PAGE_WIDTH_PX);

  const scale = zoom / 100;
  const visualWidth = Math.ceil(pageWidth * scale);

  const measurePages = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const contentHeight = el.scrollHeight;
    const manualBreaks = el.querySelectorAll('hr[data-type="page-break"]').length;
    const autoPages = Math.ceil(contentHeight / DOCUMENT_PAGE_HEIGHT_PX);
    setPageCount(Math.max(1, autoPages, manualBreaks + 1));
  }, []);

  useLayoutEffect(() => {
    measurePages();
    const el = contentRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => measurePages());
    observer.observe(el);

    const prose = el.querySelector(".ProseMirror");
    if (prose) observer.observe(prose);

    return () => observer.disconnect();
  }, [measurePages, editor, title, zoom, pageWidth]);

  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    const syncPageWidth = () => {
      const isMobile = window.matchMedia("(max-width: 900px)").matches;
      const leftGutter = isMobile ? 0 : PAGE_LEFT_GUTTER_PX;
      const rightGutter = flushToDrawer ? DRAWER_GAP_PX : isMobile ? 0 : PAGE_LEFT_GUTTER_PX;
      const available = Math.max(0, scroll.clientWidth - leftGutter - rightGutter);
      const minWidth =
        available < DOCUMENT_PAGE_MIN_WIDTH_PX
          ? DOCUMENT_PAGE_MIN_WIDTH_MOBILE_PX
          : DOCUMENT_PAGE_MIN_WIDTH_PX;
      const next = Math.min(DOCUMENT_PAGE_MAX_WIDTH_PX, Math.max(minWidth, available));
      setPageWidth(next);
    };

    syncPageWidth();
    const observer = new ResizeObserver(syncPageWidth);
    observer.observe(scroll);
    return () => observer.disconnect();
  }, [flushToDrawer]);

  const stackHeight =
    pageCount * DOCUMENT_PAGE_HEIGHT_PX +
    Math.max(0, pageCount - 1) * DOCUMENT_PAGE_GAP_PX;

  const scaledHeight = Math.ceil(stackHeight * scale);

  return (
    <div
      ref={scrollRef}
      className={[
        "workbench-document-pages-scroll",
        "workbench-reading-surface-host",
        "workbench-reading-surface-host--paginated",
        flushToDrawer ? "is-flush-to-drawer" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Document pages"
      style={
        {
          "--document-page-width": `${pageWidth}px`,
          "--workbench-document-font-family": documentFontFamily,
        } as CSSProperties
      }
    >
      <div className="workbench-document-pages-outer">
        <div
          className="workbench-document-zoom-spacer"
          style={{ width: visualWidth, height: scaledHeight }}
        >
          <div
            className="workbench-document-pages-stack"
            style={{
              width: pageWidth,
              transform: `scale(${scale})`,
              transformOrigin: flushToDrawer ? "top right" : "top center",
              minHeight: stackHeight,
            }}
          >
            <div className="workbench-document-page-frames" aria-hidden="true">
              {Array.from({ length: pageCount }, (_, index) => (
                <div
                  key={index}
                  className="workbench-document-page-frame"
                  style={{
                    top:
                      index * (DOCUMENT_PAGE_HEIGHT_PX + DOCUMENT_PAGE_GAP_PX),
                  }}
                />
              ))}
            </div>

            <div className="workbench-reading-page workbench-reading-page--document">
              <div ref={contentRef} className="workbench-document-page-content">
                {title}
                {editor}
              </div>
              <span className="workbench-reading-page__folio" aria-hidden="true">
                {pageCount > 1 ? `${pageCount} pages` : pageLabel}
                {zoom !== 100 ? ` · ${zoom}%` : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
      {typeof wordCount === "number" ? (
        <p className="workbench-document-word-count" aria-live="polite">
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </p>
      ) : null}
    </div>
  );
}
