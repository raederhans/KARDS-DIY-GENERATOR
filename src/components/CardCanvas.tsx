import { useEffect, useRef, useState } from "react";
import { CARD_HEIGHT, CARD_WIDTH, isPointInsideArtwork, renderCard } from "../canvas/cardRenderer";
import type { CardSpec } from "../types";

type CardCanvasProps = {
  card: CardSpec;
  artworkImage: HTMLImageElement | null;
  onCropChange: (crop: CardSpec["artwork"]["crop"]) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  cropX: number;
  cropY: number;
};

export function CardCanvas({ card, artworkImage, onCropChange, canvasRef }: CardCanvasProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderCard(canvasRef.current, card, artworkImage);
    }
  }, [artworkImage, canvasRef, card]);

  function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement> | React.WheelEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CARD_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CARD_HEIGHT,
    };
  }

  function isInsideArtwork(x: number, y: number): boolean {
    return isPointInsideArtwork(card.kind, x, y);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!artworkImage) {
      return;
    }
    const point = getCanvasPoint(event);
    if (!isInsideArtwork(point.x, point.y)) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      cropX: card.artwork.crop.x,
      cropY: card.artwork.crop.y,
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const point = getCanvasPoint(event);
    onCropChange({
      ...card.artwork.crop,
      x: clamp(dragState.cropX + point.x - dragState.startX, -300, 300),
      y: clamp(dragState.cropY + point.y - dragState.startY, -300, 300),
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (dragState?.pointerId === event.pointerId) {
      setDragState(null);
    }
  }

  function handleWheel(event: React.WheelEvent<HTMLCanvasElement>) {
    if (!artworkImage) {
      return;
    }
    const point = getCanvasPoint(event);
    if (!isInsideArtwork(point.x, point.y)) {
      return;
    }

    event.preventDefault();
    const direction = event.deltaY > 0 ? -0.06 : 0.06;
    onCropChange({
      ...card.artwork.crop,
      scale: clamp(Number((card.artwork.crop.scale + direction).toFixed(2)), 0.6, 3),
    });
  }

  return (
    <section className="canvas-stage" aria-label="Card canvas preview" ref={previewRef}>
      <canvas
        ref={canvasRef}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        className={artworkImage ? "card-canvas is-draggable" : "card-canvas"}
        aria-label="Generated card preview"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      />
      <p className="canvas-hint">
        Drag uploaded artwork inside the frame. Use the mouse wheel over artwork to zoom.
      </p>
    </section>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
