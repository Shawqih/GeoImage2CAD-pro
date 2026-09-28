/**
 * High-Performance CAD & GIS Canvas Viewport
 * Supports multi-layer rendering, original/vector/overlay modes with opacity slider,
 * mouse pan/zoom, feature picking, vertex editing, distance measurement,
 * and FULL MOBILE TOUCH SUPPORT (1-finger drag, 2-finger pinch-to-zoom & pan).
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CADFeature, CADLayer, Point2D, ScaleCalibration } from '../types/cad';
import { distance } from '../engine/geometryRegularizer';

export type ViewMode = 'original' | 'vector' | 'overlay';
export type ToolType = 'select' | 'move' | 'edit_vertex' | 'measure' | 'calibrate_pick';

interface CADCanvasProps {
  imageElement: HTMLImageElement | null;
  features: CADFeature[];
  layers: CADLayer[];
  selectedFeatureId: string | null;
  onSelectFeature: (featureId: string | null) => void;
  onUpdateFeature: (updatedFeature: CADFeature) => void;
  viewMode: ViewMode;
  overlayOpacity: number;
  activeTool: ToolType;
  scaleCalibration: ScaleCalibration;
  onPickCalibratePoints?: (p1: Point2D, p2: Point2D) => void;
}

export const CADCanvas: React.FC<CADCanvasProps> = ({
  imageElement,
  features,
  layers,
  selectedFeatureId,
  onSelectFeature,
  onUpdateFeature,
  viewMode,
  overlayOpacity,
  activeTool,
  scaleCalibration,
  onPickCalibratePoints,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Transform matrix state: pan and zoom
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 40 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hover and selection state
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMovingFeature, setIsMovingFeature] = useState<boolean>(false);
  const [draggedVertexIndex, setDraggedVertexIndex] = useState<number | null>(null);

  // Measure & Calibration tools state
  const [measurePts, setMeasurePts] = useState<Point2D[]>([]);
  const [calibratePts, setCalibratePts] = useState<Point2D[]>([]);

  // Mobile Pinch-to-Zoom touch state
  const touchStartDist = useRef<number | null>(null);
  const touchStartCenter = useRef<{ x: number; y: number } | null>(null);
  const touchStartZoom = useRef<number>(1.0);

  // Coordinate transforms: Screen <-> Canvas world space
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point2D => {
      return {
        x: (screenX - pan.x) / zoom,
        y: (screenY - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // Fit Image / Features to Screen
  const fitToScreen = useCallback(() => {
    if (!containerRef.current || !imageElement) return;
    const rect = containerRef.current.getBoundingClientRect();
    const imgW = imageElement.naturalWidth || imageElement.width || 800;
    const imgH = imageElement.naturalHeight || imageElement.height || 600;

    const scaleX = (rect.width - 40) / imgW;
    const scaleY = (rect.height - 40) / imgH;
    const fitZoom = Math.min(scaleX, scaleY, 2.5);

    setZoom(fitZoom);
    setPan({
      x: (rect.width - imgW * fitZoom) / 2,
      y: (rect.height - imgH * fitZoom) / 2,
    });
  }, [imageElement]);

  useEffect(() => {
    if (imageElement) {
      fitToScreen();
    }
  }, [imageElement, fitToScreen]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Background Canvas Fill (Dark CAD Charcoal)
    ctx.fillStyle = '#0B1120';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 1. Draw CAD Engineering Grid
    const imgW = imageElement?.naturalWidth || 1000;
    const imgH = imageElement?.naturalHeight || 800;
    const gridSize = 50;

    ctx.lineWidth = 0.5 / zoom;
    ctx.strokeStyle = '#1E293B';
    ctx.beginPath();
    for (let x = 0; x <= imgW; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, imgH);
    }
    for (let y = 0; y <= imgH; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(imgW, y);
    }
    ctx.stroke();

    // 2. Render Image (Original or Overlay)
    if (imageElement && (viewMode === 'original' || viewMode === 'overlay')) {
      ctx.save();
      ctx.globalAlpha = viewMode === 'original' ? 1.0 : overlayOpacity;
      ctx.drawImage(imageElement, 0, 0, imgW, imgH);
      ctx.restore();
    }

    // 3. Render CAD Features (Vector Result or Overlay)
    if (viewMode === 'vector' || viewMode === 'overlay') {
      const layerMap = new Map<string, CADLayer>();
      layers.forEach((l) => layerMap.set(l.name, l));

      for (const feat of features) {
        const layer = layerMap.get(feat.layer);
        if (layer && !layer.visible) continue;

        const isSelected = feat.id === selectedFeatureId;
        const isHovered = feat.id === hoveredFeatureId;

        const strokeColor = isSelected ? '#00F5FF' : isHovered ? '#FFFFFF' : layer?.color || '#3B82F6';
        const strokeWidth = (isSelected ? 2.5 : isHovered ? 2.0 : (layer?.lineweight || 0.25) * 4) / zoom;

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;

        if (layer?.linetype === 'DASHED') {
          ctx.setLineDash([8 / zoom, 4 / zoom]);
        } else if (layer?.linetype === 'CENTER') {
          ctx.setLineDash([16 / zoom, 4 / zoom, 4 / zoom, 4 / zoom]);
        } else {
          ctx.setLineDash([]);
        }

        if (feat.geometryType === 'CIRCLE') {
          const c = feat.center || feat.points[0] || { x: 0, y: 0 };
          const r = feat.radius || 10;
          ctx.beginPath();
          ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? 'rgba(0, 245, 255, 0.25)' : `${layer?.color || '#3B82F6'}33`;
          ctx.fill();
          ctx.stroke();

          // Center crosshair
          const ch = 4 / zoom;
          ctx.beginPath();
          ctx.moveTo(c.x - ch, c.y);
          ctx.lineTo(c.x + ch, c.y);
          ctx.moveTo(c.x, c.y - ch);
          ctx.lineTo(c.x, c.y + ch);
          ctx.stroke();
        } else if (feat.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(feat.points[0].x, feat.points[0].y);
          for (let i = 1; i < feat.points.length; i++) {
            ctx.lineTo(feat.points[i].x, feat.points[i].y);
          }

          if (feat.isClosed && feat.points.length >= 3) {
            ctx.closePath();
            ctx.fillStyle = isSelected ? 'rgba(0, 245, 255, 0.2)' : `${layer?.color || '#3B82F6'}26`;
            ctx.fill();
          }
          ctx.stroke();

          // Draw vertex handles if selected
          if (isSelected) {
            ctx.setLineDash([]);
            for (let i = 0; i < feat.points.length; i++) {
              const p = feat.points[i];
              ctx.fillStyle = i === draggedVertexIndex ? '#FF0055' : '#00F5FF';
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 1 / zoom;
              const handleSize = 7 / zoom;
              ctx.fillRect(p.x - handleSize / 2, p.y - handleSize / 2, handleSize, handleSize);
              ctx.strokeRect(p.x - handleSize / 2, p.y - handleSize / 2, handleSize, handleSize);
            }
          }
        }
      }
    }

    // 4. Render Distance Measure Line
    if (measurePts.length > 0) {
      ctx.setLineDash([4 / zoom, 2 / zoom]);
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2 / zoom;
      ctx.beginPath();
      ctx.moveTo(measurePts[0].x, measurePts[0].y);
      const target = measurePts.length >= 2 ? measurePts[1] : cursorPos;
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const pxDist = distance(measurePts[0], target);
      const mDist = scaleCalibration.isCalibrated
        ? (pxDist * scaleCalibration.metersPerPixel).toFixed(2) + ' m'
        : pxDist.toFixed(1) + ' px';

      const mid = { x: (measurePts[0].x + target.x) / 2, y: (measurePts[0].y + target.y) / 2 };
      ctx.fillStyle = '#000000CC';
      ctx.font = `${Math.max(10, 13 / zoom)}px monospace`;
      const text = ` ${mDist} `;
      const metrics = ctx.measureText(text);
      ctx.fillRect(mid.x - metrics.width / 2, mid.y - 12 / zoom, metrics.width, 16 / zoom);
      ctx.fillStyle = '#FACC15';
      ctx.fillText(text, mid.x - metrics.width / 2, mid.y);
    }

    // 5. Render Calibrate Scale Points
    if (calibratePts.length > 0) {
      for (let i = 0; i < calibratePts.length; i++) {
        const p = calibratePts[i];
        ctx.fillStyle = '#E11D48';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5 / zoom;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${12 / zoom}px sans-serif`;
        ctx.fillText(i === 0 ? ' A' : ' B', p.x + 8 / zoom, p.y + 4 / zoom);
      }

      if (calibratePts.length === 2) {
        ctx.strokeStyle = '#E11D48';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([4 / zoom, 4 / zoom]);
        ctx.beginPath();
        ctx.moveTo(calibratePts[0].x, calibratePts[0].y);
        ctx.lineTo(calibratePts[1].x, calibratePts[1].y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  }, [
    imageElement,
    features,
    layers,
    selectedFeatureId,
    hoveredFeatureId,
    viewMode,
    overlayOpacity,
    zoom,
    pan,
    measurePts,
    cursorPos,
    calibratePts,
    draggedVertexIndex,
    scaleCalibration,
  ]);

  // Pointer Interaction logic (Unified for Mouse & Single-Touch)
  const processPointerDown = (clientX: number, clientY: number, button: number, shift: boolean) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const world = screenToWorld(mouseX, mouseY);

    if (button === 1 || shift) {
      setIsDragging(true);
      setDragStart({ x: mouseX - pan.x, y: mouseY - pan.y });
      return;
    }

    if (activeTool === 'calibrate_pick') {
      if (calibratePts.length === 0) {
        setCalibratePts([world]);
      } else if (calibratePts.length === 1) {
        const pts = [calibratePts[0], world];
        setCalibratePts(pts);
        onPickCalibratePoints?.(pts[0], pts[1]);
      } else {
        setCalibratePts([world]);
      }
      return;
    }

    if (activeTool === 'measure') {
      if (measurePts.length === 0) {
        setMeasurePts([world]);
      } else {
        setMeasurePts([measurePts[0], world]);
      }
      return;
    }

    if (activeTool === 'edit_vertex' && selectedFeatureId) {
      const feat = features.find((f) => f.id === selectedFeatureId);
      if (feat) {
        const threshold = 14 / zoom; // Generous for mobile touch
        for (let i = 0; i < feat.points.length; i++) {
          if (distance(world, feat.points[i]) <= threshold) {
            setDraggedVertexIndex(i);
            return;
          }
        }
      }
    }

    let picked: CADFeature | null = null;
    const pickThreshold = 12 / zoom; // Generous for mobile touch

    for (let i = features.length - 1; i >= 0; i--) {
      const f = features[i];
      if (f.geometryType === 'CIRCLE') {
        const c = f.center || f.points[0] || { x: 0, y: 0 };
        const d = distance(world, c);
        if (Math.abs(d - (f.radius || 10)) <= pickThreshold || d <= (f.radius || 10)) {
          picked = f;
          break;
        }
      } else if (f.points.length >= 2) {
        if (f.isClosed && isPointInsidePolygon(world, f.points)) {
          picked = f;
          break;
        }
        for (let j = 0; j < f.points.length - 1; j++) {
          if (distanceToSegment(world, f.points[j], f.points[j + 1]) <= pickThreshold) {
            picked = f;
            break;
          }
        }
        if (picked) break;
      }
    }

    if (picked) {
      onSelectFeature(picked.id);
      if (activeTool === 'move') {
        setIsMovingFeature(true);
        setDragStart(world);
      }
    } else {
      if (activeTool === 'select') {
        setIsDragging(true);
        setDragStart({ x: mouseX - pan.x, y: mouseY - pan.y });
      }
    }
  };

  const processPointerMove = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const world = screenToWorld(mouseX, mouseY);
    setCursorPos(world);

    if (isDragging) {
      setPan({
        x: mouseX - dragStart.x,
        y: mouseY - dragStart.y,
      });
      return;
    }

    if (isMovingFeature && selectedFeatureId) {
      const feat = features.find((f) => f.id === selectedFeatureId);
      if (feat) {
        const dx = world.x - dragStart.x;
        const dy = world.y - dragStart.y;
        const updated = {
          ...feat,
          points: feat.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          center: feat.center ? { x: feat.center.x + dx, y: feat.center.y + dy } : undefined,
        };
        onUpdateFeature(updated);
        setDragStart(world);
      }
      return;
    }

    if (draggedVertexIndex !== null && selectedFeatureId) {
      const feat = features.find((f) => f.id === selectedFeatureId);
      if (feat && feat.points[draggedVertexIndex]) {
        const updatedPts = [...feat.points];
        updatedPts[draggedVertexIndex] = { x: Math.round(world.x * 10) / 10, y: Math.round(world.y * 10) / 10 };
        onUpdateFeature({
          ...feat,
          points: updatedPts,
        });
      }
      return;
    }

    const pickThreshold = 8 / zoom;
    let hovered: string | null = null;
    for (let i = features.length - 1; i >= 0; i--) {
      const f = features[i];
      if (f.points.length >= 2) {
        for (let j = 0; j < f.points.length - 1; j++) {
          if (distanceToSegment(world, f.points[j], f.points[j + 1]) <= pickThreshold) {
            hovered = f.id;
            break;
          }
        }
        if (hovered) break;
      }
    }
    setHoveredFeatureId(hovered);
  };

  // Mouse Handlers
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(0.05, Math.min(zoom * zoomFactor, 30.0));

    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newPan = {
      x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
      y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
    };

    setZoom(newZoom);
    setPan(newPan);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    processPointerDown(e.clientX, e.clientY, e.button, e.shiftKey);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    processPointerMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsMovingFeature(false);
    setDraggedVertexIndex(null);
  };

  // Mobile Touch Handlers (Pinch Zoom & Drag Pan)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      processPointerDown(touch.clientX, touch.clientY, 0, false);
    } else if (e.touches.length === 2) {
      // Two fingers: initialize pinch to zoom
      setIsDragging(false);
      setIsMovingFeature(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const rect = canvasRef.current!.getBoundingClientRect();
      const center = {
        x: (t1.clientX + t2.clientX) / 2 - rect.left,
        y: (t1.clientY + t2.clientY) / 2 - rect.top,
      };

      touchStartDist.current = dist;
      touchStartCenter.current = center;
      touchStartZoom.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && touchStartDist.current === null) {
      const touch = e.touches[0];
      processPointerMove(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2 && touchStartDist.current !== null && touchStartCenter.current !== null) {
      // Two-finger pinch zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const curDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scale = curDist / touchStartDist.current;
      const newZoom = Math.max(0.05, Math.min(touchStartZoom.current * scale, 30.0));

      const center = touchStartCenter.current;
      const newPan = {
        x: center.x - (center.x - pan.x) * (newZoom / zoom),
        y: center.y - (center.y - pan.y) * (newZoom / zoom),
      };

      setZoom(newZoom);
      setPan(newPan);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length < 2) {
      touchStartDist.current = null;
      touchStartCenter.current = null;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
      setIsMovingFeature(false);
      setDraggedVertexIndex(null);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-slate-950 select-none touch-none">
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Coordinate & Zoom HUD */}
      <div className="absolute bottom-16 sm:bottom-3 start-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 text-slate-300 text-[11px] px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg flex items-center gap-2 sm:gap-3 font-mono tabular-nums shadow-lg pointer-events-none z-10">
        <span>X: {cursorPos.x.toFixed(1)}</span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span>Y: {cursorPos.y.toFixed(1)}</span>
        {scaleCalibration.isCalibrated && (
          <>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-emerald-400">
              {(cursorPos.x * scaleCalibration.metersPerPixel).toFixed(1)}m
            </span>
          </>
        )}
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span>{(zoom * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
};

function isPointInsidePolygon(point: Point2D, vs: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x,
      yi = vs[i].y;
    const xj = vs[j].x,
      yj = vs[j].y;
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distanceToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const l2 = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
  if (l2 === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2));
  const projection = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };
  return distance(p, projection);
}
