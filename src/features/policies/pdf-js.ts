/** pdf.js is loaded on demand and only in the browser. The "legacy" build is
 * used on purpose: many tutors are on older phones. */
export async function loadPdfJs() {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as typeof import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  return pdfjs;
}

export async function countPdfPages(file: File): Promise<number> {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
  try {
    return (await task.promise).numPages;
  } finally {
    await task.destroy();
  }
}
