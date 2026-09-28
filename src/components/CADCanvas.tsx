/**
 * High-Performance CAD & GIS Canvas Viewport
 * Supports multi-layer rendering, original/vector/overlay modes with opacity slider,
 * mouse pan/zoom, feature picking, vertex editing, distance measurement,
 * and FULL MOBILE TOUCH SUPPORT (1-finger drag, 2-finger pinch-to-zoom & pan, floating quick zoom buttons).
 */
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { CADFeature, CADLayer, Point2D, ScaleCalibration } from '../types/cad';
import { distance } from '../engine/geometryRegularizer';

export type ViewMode = 'original' | 'vector' | 'overlay';
export type ToolType = 'select' | 'move' | 'edit_vertex' | 'measure' | 'calibrate_pick';

export interface CADCanvasHandle {
  fitToScreen: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

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

export const CADCanvas = forwardRef<CADCanvasHandle, CADCanvasProps>(({
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
}, ref) => {
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

    const scaleX = (rect.width - 32) / imgW;
    const scaleY = (rect.height - 32) / imgH;
    const fitZoom = Math.min(scaleX, scaleY, 2.5);

    setZoom(fitZoom);
    setPan({
      x: (rect.width - imgW * fitZoom) / 2,
      y: (rect.height - imgH * fitZoom) / 2,
    });
  }, [imageElement]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.25, 30.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev * 0.8, 0.05));
  }, []);

  useImperativeHandle(ref, () => ({
    fitToScreen,
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut,
  }));

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

        // Apply Linetype Dash Pattern
        if (layer?.linetype === 'DASHED') {
          ctx.setLineDash([8 / zoom, 5 / zoom]);
        } else if (layer?.linetype === 'CENTER') {
          ctx.setLineDash([14 / zoom, 4 / zoom, 4 / zoom, 4 / zoom]);
        } else {
          ctx.setLineDash([]);
        }

        if (feat.geometryType === 'POINT' && feat.points.length > 0) {
          const p = feat.points[0];
          ctx.fillStyle = strokeColor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4 / zoom, 0, 2 * Math.PI);
          ctx.fill();
        } else if (feat.geometryType === 'CIRCLE') {
          const c = feat.center || feat.points[0] || { x: 0, y: 0 };
          const r = feat.radius || 10;
          ctx.beginPath();
          ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
          if (feat.layer === 'TREES') {
            ctx.fillStyle = isSelected ? 'rgba(0, 245, 255, 0.35)' : 'rgba(34, 197, 94, 0.25)';
            ctx.fill();
          }
          ctx.stroke();
        } else if (feat.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(feat.points[0].x, feat.points[0].y);
          for (let i = 1; i < feat.points.length; i++) {
            ctx.lineTo(feat.points[i].x, feat.points[i].y);
          }
          if (feat.isClosed) {
            ctx.closePath();
          }

          if (feat.isClosed && (feat.layer === 'BUILDINGS' || feat.layer === 'WATER' || feat.layer === 'PARCELS')) {
            if (feat.layer === 'BUILDINGS') {
              ctx.fillStyle = isSelected ? 'rgba(0, 245, 255, 0.35)' : 'rgba(239, 68, 68, 0.20)';
            } else if (feat.layer === 'WATER') {
              ctx.fillStyle = isSelected ? 'rgba(0, 245, 255, 0.35)' : 'rgba(59, 130, 246, 0.25)';
            } else {
              ctx.fillStyle = isSelected ? 'rgba(0, 245, 255, 0.35)' : 'rgba(168, 85, 247, 0.15)';
            }
            ctx.fill();
          }
          ctx.stroke();

          // Render Vertex Handles if Selected or Editing
          if (isSelected || activeTool === 'edit_vertex') {
            ctx.fillStyle = '#00F5FF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1 / zoom;
            ctx.setLineDash([]);
            for (let i = 0; i < feat.points.length; i++) {
              const pt = feat.points[i];
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 4 / zoom, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
            }
          }
        }
      }
    }

    // 4. Render Active Measurement Tool Line
    if (activeTool === 'measure' && measurePts.length > 0) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);

      ctx.beginPath();
      ctx.moveTo(measurePts[0].x, measurePts[0].y);
      const endPt = measurePts.length > 1 ? measurePts[1] : cursorPos;
      ctx.lineTo(endPt.x, endPt.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Distance Text Callout
      const distPx = distance(measurePts[0], endPt);
      const distM = scaleCalibration.isCalibrated
        ? `${(distPx * scaleCalibration.metersPerPixel).toFixed(2)} m`
        : `${distPx.toFixed(1)} px`;

      const midX = (measurePts[0].x + endPt.x) / 2;
      const midY = (measurePts[0].y + endPt.y) / 2;

      ctx.font = `${Math.max(10, 12 / zoom)}px monospace`;
      ctx.fillStyle = '#000000';
      const textWidth = ctx.measureText(distM).width;
      ctx.fillRect(midX - 4 / zoom, midY - 14 / zoom, textWidth + 8 / zoom, 18 / zoom);
      ctx.fillStyle = '#F59E0B';
      ctx.fillText(distM, midX, midY);
    }

    // 5. Render Active Calibration Pick Points
    if (activeTool === 'calibrate_pick' && calibratePts.length > 0) {
      ctx.fillStyle = '#10B981';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5 / zoom;
      for (let i = 0; i < calibratePts.length; i++) {
        const pt = calibratePts[i];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5 / zoom, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
      if (calibratePts.length === 1) {
        ctx.strokeStyle = '#10B981';
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.beginPath();
        ctx.moveTo(calibratePts[0].x, calibratePts[0].y);
        ctx.lineTo(cursorPos.x, cursorPos.y);
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
    pan,
    zoom,
    viewMode,
    overlayOpacity,
    activeTool,
    measurePts,
    calibratePts,
    cursorPos,
    scaleCalibration,
  ]);

  // Pointer & Touch Interaction Handlers
  const processPointerDown = (clientX: number, clientY: number, button: number, shiftKey: boolean) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const world = screenToWorld(mouseX, mouseY);

    if (button === 1 || (button === 0 && shiftKey)) {
      setIsDragging(true);
      setDragStart({ x: mouseX - pan.x, y: mouseY - pan.y });
      return;
    }

    if (activeTool === 'calibrate_pick') {
      if (calibratePts.length === 0) {
        setCalibratePts([world]);
      } else if (calibratePts.length === 1) {
        const p1 = calibratePts[0];
        const p2 = world;
        setCalibratePts([p1, p2]);
        onPickCalibratePoints?.(p1, p2);
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
        const threshold = 14 / zoom;
        for (let i = 0; i < feat.points.length; i++) {
          if (distance(world, feat.points[i]) <= threshold) {
            setDraggedVertexIndex(i);
            return;
          }
        }
      }
    }

    let picked: CADFeature | null = null;
    const pickThreshold = 14 / zoom;

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

      {/* Floating Quick Zoom Buttons for Mobile & Desktop */}
      <div className="absolute bottom-20 sm:bottom-4 end-3 flex flex-col gap-1.5 z-10 select-none pointer-events-auto">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-white border border-slate-700/80 shadow-lg flex items-center justify-center transition-all"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-white border border-slate-700/80 shadow-lg flex items-center justify-center transition-all"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={fitToScreen}
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-white border border-slate-700/80 shadow-lg flex items-center justify-center transition-all"
          title="Fit to Screen"
          aria-label="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Coordinate & Zoom HUD */}
      <div className="absolute bottom-20 sm:bottom-4 start-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 text-slate-300 text-[11px] px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg flex items-center gap-2 sm:gap-3 font-mono tabular-nums shadow-lg pointer-events-none z-10">
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
});

CADCanvas.displayName = 'CADCanvas';

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
