"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/loading-state";
import { loadPdfJs } from "./pdf-js";
import { saveReadProgress, type MyPolicyDocument } from "./queries";
import { MY_POLICIES_KEY } from "./use-policies";

interface Loaded {
  pdf: PDFDocumentProxy;
  /** height / width of every page, so placeholders keep the scroll length. */
  ratios: number[];
}

/** Shows a policy PDF inside the app and records how far it has been read. A
 * page counts once it has been drawn and its bottom edge has been on screen,
 * in order, so jumping straight to the end does not complete a document. */
export function PdfReader({ document: doc }: { document: MyPolicyDocument }) {
  const t = useTranslations("policies.reader");
  const queryClient = useQueryClient();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [furthest, setFurthest] = useState(doc.furthestPage);
  /** The furthest page the server has confirmed. */
  const [stored, setStored] = useState(doc.completed ? doc.pageCount : doc.furthestPage);
  /** Failed saves in a row; each one schedules another try. */
  const [failures, setFailures] = useState(0);
  const furthestRef = useRef(doc.furthestPage);
  const savedRef = useRef(doc.opened ? doc.furthestPage : -1);
  const drawn = useRef(new Set<number>());
  const seen = useRef(new Set<number>());
  const pageElements = useRef(new Map<number, HTMLDivElement>());
  const resumedRef = useRef(false);
  const total = doc.pageCount;

  const save = useCallback(async () => {
    const page = furthestRef.current;
    if (page <= savedRef.current) return;
    const previous = savedRef.current;
    savedRef.current = page;
    try {
      await saveReadProgress(doc.id, page);
      setFailures(0);
      setStored((current) => Math.max(current, page));
      await queryClient.invalidateQueries({ queryKey: MY_POLICIES_KEY });
    } catch (error) {
      console.error(error);
      // Forget the claim, unless a later page was queued in the meantime.
      if (savedRef.current === page) savedRef.current = previous;
      setFailures((count) => count + 1);
    }
  }, [doc.id, queryClient]);

  const advance = useCallback(() => {
    let page = furthestRef.current;
    while (drawn.current.has(page + 1) && seen.current.has(page + 1)) page++;
    if (page !== furthestRef.current) {
      furthestRef.current = page;
      setFurthest(page);
    }
  }, []);

  // Record the opening, then save as reading moves on; the last page at once.
  useEffect(() => {
    const timer = window.setTimeout(() => void save(), furthest >= total ? 0 : 800);
    return () => window.clearTimeout(timer);
  }, [furthest, total, save]);
  useEffect(() => () => void save(), [save]);
  // On a weak connection keep trying; the last page has nothing after it that
  // would trigger another save.
  useEffect(() => {
    if (failures === 0) return;
    const timer = window.setTimeout(() => void save(), 5000);
    return () => window.clearTimeout(timer);
  }, [failures, save]);

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => Promise<void>) | undefined;
    setFailed(false);
    setLoaded(null);
    drawn.current.clear();
    (async () => {
      const response = await fetch(`/api/policies/documents/${doc.id}/file`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = new Uint8Array(await response.arrayBuffer());
      const pdfjs = await loadPdfJs();
      const task = pdfjs.getDocument({ data, isEvalSupported: false });
      destroy = () => task.destroy();
      const pdf = await task.promise;
      const ratios = await Promise.all(
        Array.from({ length: pdf.numPages }, async (_, index) => {
          const viewport = (await pdf.getPage(index + 1)).getViewport({ scale: 1 });
          return viewport.height / viewport.width;
        }),
      );
      if (!cancelled) setLoaded({ pdf, ratios });
    })().catch((error) => {
      console.error(error);
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      void destroy?.();
    };
  }, [doc.id, attempt]);

  // Continue where the reader left off.
  useEffect(() => {
    if (!loaded || resumedRef.current) return;
    resumedRef.current = true;
    const next = doc.furthestPage + 1;
    if (doc.furthestPage > 0 && next <= total) {
      pageElements.current.get(next)?.scrollIntoView({ block: "start" });
    }
  }, [loaded, doc.furthestPage, total]);

  if (failed) {
    return (
      <div className="space-y-3 py-12 text-center">
        <p className="text-muted-foreground text-sm">{t("error")}</p>
        <Button onClick={() => setAttempt((n) => n + 1)}>{t("retry")}</Button>
      </div>
    );
  }
  if (!loaded) return <LoadingState label={t("loading")} />;

  const reachedEnd = furthest >= total;
  const done = stored >= total;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="space-y-3">
        {loaded.ratios.map((ratio, index) => (
          <PdfPage
            key={index}
            pdf={loaded.pdf}
            pageNumber={index + 1}
            ratio={ratio}
            label={t("page", { page: index + 1, total })}
            register={(element) => {
              if (element) pageElements.current.set(index + 1, element);
              else pageElements.current.delete(index + 1);
            }}
            onDrawn={(page) => {
              drawn.current.add(page);
              advance();
            }}
            onBottomSeen={(page) => {
              seen.current.add(page);
              advance();
            }}
          />
        ))}
      </div>
      {/* Room for the status bar, so the last page's end can come into view. */}
      <div className="h-32" aria-hidden="true" />

      <div className="bg-card fixed inset-x-3 bottom-20 z-30 mx-auto flex max-w-md items-center gap-3 rounded-xl border px-4 py-2.5 shadow-lg md:bottom-4">
        {done ? (
          <>
            <CheckCircle2 className="text-chart-3 size-5 shrink-0" />
            <p className="text-sm font-medium">{t("completed")}</p>
          </>
        ) : reachedEnd ? (
          <>
            <p className={failures > 0 ? "text-destructive min-w-0 flex-1 text-xs" : "min-w-0 flex-1 text-xs font-medium"}>
              {failures > 0 ? t("saveError") : t("saving")}
            </p>
            {failures > 0 && (
              <Button size="sm" variant="outline" onClick={() => void save()}>
                {t("retry")}
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{t("readUpTo", { page: furthest, total })}</p>
              <div className="bg-muted mt-1 h-1.5 overflow-hidden rounded-full">
                <div className="bg-primary h-full transition-all" style={{ width: `${(furthest / total) * 100}%` }} />
              </div>
              {failures > 0 && <p className="text-destructive mt-1 text-xs">{t("saveError")}</p>}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => pageElements.current.get(furthest + 1)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <ArrowDown className="size-3.5" />
              {t("goToPage", { page: furthest + 1 })}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function PdfPage({
  pdf,
  pageNumber,
  ratio,
  label,
  register,
  onDrawn,
  onBottomSeen,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  ratio: number;
  label: string;
  register: (element: HTMLDivElement | null) => void;
  onDrawn: (page: number) => void;
  onBottomSeen: (page: number) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const callbacks = useRef({ register, onDrawn, onBottomSeen });
  callbacks.current = { register, onDrawn, onBottomSeen };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const bottom = bottomRef.current;
    if (!wrapper || !bottom) return;
    callbacks.current.register(wrapper);
    // Draw pages shortly before they scroll into view.
    const nearObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          nearObserver.disconnect();
        }
      },
      { rootMargin: "900px 0px" },
    );
    const bottomObserver = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        callbacks.current.onBottomSeen(pageNumber);
        bottomObserver.disconnect();
      }
    });
    nearObserver.observe(wrapper);
    bottomObserver.observe(bottom);
    return () => {
      callbacks.current.register(null);
      nearObserver.disconnect();
      bottomObserver.disconnect();
    };
  }, [pageNumber]);

  useEffect(() => {
    if (!near) return;
    let cancelled = false;
    let cancelRender: (() => void) | undefined;
    (async () => {
      const page = await pdf.getPage(pageNumber);
      const canvas = canvasRef.current;
      const width = wrapperRef.current?.clientWidth;
      if (cancelled || !canvas || !width) return;
      // Sharp on phone screens without letting canvases grow without limit.
      const density = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width * density) / page.getViewport({ scale: 1 }).width });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) return;
      const task = page.render({ canvasContext: context, viewport });
      cancelRender = () => task.cancel();
      await task.promise;
      if (!cancelled) callbacks.current.onDrawn(pageNumber);
    })().catch((error) => {
      if (!cancelled) console.error(`Page ${pageNumber} failed to render`, error);
    });
    return () => {
      cancelled = true;
      cancelRender?.();
    };
  }, [near, pdf, pageNumber]);

  return (
    <div ref={wrapperRef} className="relative scroll-mt-3 overflow-hidden rounded-md border bg-white shadow-sm">
      <div style={{ aspectRatio: `1 / ${ratio}` }}>
        <canvas ref={canvasRef} className="block h-full w-full" role="img" aria-label={label} />
      </div>
      <div ref={bottomRef} className="absolute inset-x-0 bottom-0 h-px" aria-hidden="true" />
    </div>
  );
}
