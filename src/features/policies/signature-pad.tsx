"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { isSignatureSufficient, type Signature } from "./schema";

type Stroke = Signature["strokes"][number];

/** Draw-with-a-finger signature field. Reports pen strokes, not an image. */
export function SignaturePad({
  disabled,
  onChange,
}: {
  disabled?: boolean;
  onChange: (signature: Signature | null) => void;
}) {
  const t = useTranslations("policies.confirm");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const size = useRef({ width: 0, height: 0 });
  const activePointer = useRef<number | null>(null);
  const [state, setState] = useState<"empty" | "short" | "ok">("empty");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const clear = useCallback(() => {
    strokes.current = [];
    activePointer.current = null;
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setState("empty");
    onChangeRef.current(null);
  }, []);

  // Match the backing store to the screen. A width change (rotating the phone)
  // would distort what is already drawn, so the pad starts over.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || Math.round(width) === size.current.width) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 3);
      size.current = { width: Math.round(width), height: Math.round(height) };
      canvas.width = size.current.width * ratio;
      canvas.height = size.current.height * ratio;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineWidth = 2.2;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#111827";
      context.fillStyle = "#111827";
      if (strokes.current.length > 0) clear();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [clear]);

  function pointAt(event: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = event.currentTarget.getBoundingClientRect();
    const clamp = (value: number, max: number) => Math.round(Math.min(Math.max(value, 0), max) * 10) / 10;
    return [clamp(event.clientX - rect.left, size.current.width), clamp(event.clientY - rect.top, size.current.height)];
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || activePointer.current !== null) return;
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointAt(event);
    strokes.current.push([point]);
    const context = canvasRef.current?.getContext("2d");
    context?.beginPath();
    context?.arc(point[0], point[1], 1.1, 0, Math.PI * 2);
    context?.fill();
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId) return;
    const stroke = strokes.current[strokes.current.length - 1];
    const previous = stroke[stroke.length - 1];
    const point = pointAt(event);
    if (Math.hypot(point[0] - previous[0], point[1] - previous[1]) < 1.5) return;
    stroke.push(point);
    const context = canvasRef.current?.getContext("2d");
    context?.beginPath();
    context?.moveTo(previous[0], previous[1]);
    context?.lineTo(point[0], point[1]);
    context?.stroke();
  }

  function end(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    const signature: Signature = { ...size.current, strokes: strokes.current.map((s) => [...s]) };
    const sufficient = isSignatureSufficient(signature);
    setState(sufficient ? "ok" : "short");
    onChangeRef.current(sufficient ? signature : null);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t("signTitle")}
          className="h-44 w-full touch-none rounded-lg border-2 border-dashed bg-white data-disabled:cursor-not-allowed data-disabled:opacity-50"
          data-disabled={disabled || undefined}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
        {state === "empty" && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-slate-400">
            {t("signHint")}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-destructive text-xs">{state === "short" ? t("signTooShort") : ""}</p>
        <Button type="button" variant="outline" size="sm" disabled={state === "empty"} onClick={clear}>
          <Eraser className="size-3.5" />
          {t("signClear")}
        </Button>
      </div>
    </div>
  );
}
