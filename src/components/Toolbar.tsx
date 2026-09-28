/**
 * Floating CAD / GIS Viewport Toolbar
 * Controls view mode (Original/Vector/Overlay), opacity slider, CAD tools, and zoom.
 * Touch-optimized and collapsible for seamless mobile & desktop experience.
 */
import React, { useState } from 'react';
import {
  MousePointer,
  Move,
  Edit3,
  Trash2,
  Ruler,
  Maximize2,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
  RotateCcw,
  RotateCw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { ToolType, ViewMode } from './CADCanvas';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface ToolbarProps {
  lang: Language;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  overlayOpacity: number;
  onChangeOpacity: (opacity: number) => void;
  activeTool: ToolType;
  onChangeTool: (tool: ToolType) => void;
  onFitToScreen: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onDeleteSelected: () => void;
  onClosePolygon: () => void;
  hasSelected: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  lang,
  viewMode,
  onChangeViewMode,
  overlayOpacity,
  onChangeOpacity,
  activeTool,
  onChangeTool,
  onFitToScreen,
  onZoomIn,
  onZoomOut,
  onDeleteSelected,
  onClosePolygon,
  hasSelected,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const t = TRANSLATIONS[lang];
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="absolute top-2.5 start-2.5 z-20 flex flex-col gap-1.5 pointer-events-auto max-w-[calc(100vw-20px)] select-none">
      {/* 1. View Mode Segmented Controls + Collapse Button */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-xl flex items-center gap-1 text-xs self-start overflow-x-auto">
        <button
          onClick={() => onChangeViewMode('original')}
          className={`min-h-[34px] px-2.5 sm:px-3 py-1 font-medium rounded-lg transition-colors whitespace-nowrap text-xs ${
            viewMode === 'original'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          {t.viewOriginal.split(' ')[0]}
        </button>
        <button
          onClick={() => onChangeViewMode('vector')}
          className={`min-h-[34px] px-2.5 sm:px-3 py-1 font-medium rounded-lg transition-colors whitespace-nowrap text-xs ${
            viewMode === 'vector'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          {t.viewVector.split(' ')[0]}
        </button>
        <button
          onClick={() => onChangeViewMode('overlay')}
          className={`min-h-[34px] px-2.5 sm:px-3 py-1 font-medium rounded-lg transition-colors whitespace-nowrap text-xs ${
            viewMode === 'overlay'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          {t.viewOverlay.split(' ')[0]}
        </button>

        <div className="w-px h-4 bg-slate-800 mx-0.5" />

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="min-h-[34px] min-w-[34px] p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
          title={isCollapsed ? (lang === 'ar' ? 'إظهار الأدوات' : 'Expand Tools') : (lang === 'ar' ? 'طي الأدوات' : 'Collapse Tools')}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* 2. Overlay Opacity Slider (visible when in overlay mode) */}
          {viewMode === 'overlay' && (
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 text-xs text-slate-300 self-start animate-in fade-in duration-150">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px] whitespace-nowrap hidden sm:inline">{t.overlayOpacity}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={overlayOpacity}
                onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
                className="w-20 sm:w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                {Math.round(overlayOpacity * 100)}%
              </span>
            </div>
          )}

          {/* 3. CAD Editing Tools */}
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-xl flex items-center gap-1 self-start overflow-x-auto max-w-full animate-in fade-in duration-150">
            <button
              onClick={() => onChangeTool('select')}
              className={`min-h-[36px] min-w-[36px] p-2 rounded-lg flex items-center justify-center transition-colors ${
                activeTool === 'select'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={t.toolSelect}
            >
              <MousePointer className="w-4 h-4" />
            </button>

            <button
              onClick={() => onChangeTool('move')}
              className={`min-h-[36px] min-w-[36px] p-2 rounded-lg flex items-center justify-center transition-colors ${
                activeTool === 'move'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={t.toolMove}
            >
              <Move className="w-4 h-4" />
            </button>

            <button
              onClick={() => onChangeTool('edit_vertex')}
              className={`min-h-[36px] min-w-[36px] p-2 rounded-lg flex items-center justify-center transition-colors ${
                activeTool === 'edit_vertex'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={t.toolEditVertex}
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              onClick={() => onChangeTool('measure')}
              className={`min-h-[36px] min-w-[36px] p-2 rounded-lg flex items-center justify-center transition-colors ${
                activeTool === 'measure'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={t.toolMeasure}
            >
              <Ruler className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-800 my-auto mx-0.5 shrink-0" />

            {/* Close Polygon */}
            <button
              onClick={onClosePolygon}
              disabled={!hasSelected}
              className="min-h-[36px] min-w-[36px] p-2 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title={t.toolClosePoly}
            >
              <span className="text-sm font-bold font-mono">⧈</span>
            </button>

            {/* Delete Feature */}
            <button
              onClick={onDeleteSelected}
              disabled={!hasSelected}
              className="min-h-[36px] min-w-[36px] p-2 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title={t.toolDelete}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-800 my-auto mx-0.5 shrink-0" />

            {/* Undo & Redo */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="min-h-[36px] min-w-[36px] p-2 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Undo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="min-h-[36px] min-w-[36px] p-2 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Redo"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-800 my-auto mx-0.5 shrink-0" />

            {/* Zoom Controls */}
            <button
              onClick={onZoomIn}
              className="min-h-[36px] min-w-[36px] p-2 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={t.zoomIn}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={onZoomOut}
              className="min-h-[36px] min-w-[36px] p-2 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={t.zoomOut}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={onFitToScreen}
              className="min-h-[36px] min-w-[36px] p-2 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={t.zoomFit}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
