/**
 * GeoImage2CAD Pro - Main Application Entry
 * On-Device Computer Vision, AI Segmentation, CAD Geometry Regularization,
 * AutoCAD DXF R2013, and GIS Multi-Format Exporter.
 * Fully Responsive for Mobile, Tablet, and Desktop.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopNav } from './components/TopNav';
import { CADCanvas, ViewMode, ToolType, CADCanvasHandle } from './components/CADCanvas';
import { Toolbar } from './components/Toolbar';
import { LayerManager } from './components/LayerManager';
import { PropertiesPanel } from './components/PropertiesPanel';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ScaleCalibratorModal } from './components/ScaleCalibratorModal';
import { TopologyValidationModal } from './components/TopologyValidationModal';
import { ExportModal } from './components/ExportModal';
import { AndroidCodeModal } from './components/AndroidCodeModal';
import { SampleDatasetsModal } from './components/SampleDatasetsModal';
import { ProcessingProgressModal } from './components/ProcessingProgressModal';
import { Layers, Sliders, X } from 'lucide-react';
import {
  CADFeature,
  CADLayer,
  ImageAnalysisReport,
  Point2D,
  ProcessingParameters,
  ScaleCalibration,
  TopologyIssue,
} from './types/cad';
import { DEFAULT_PARAMETERS, STANDARD_LAYERS } from './constants/layers';
import { analyzeImage } from './engine/imageAnalyzer';
import { convertRasterToCAD } from './engine/cvSegmentation';
import { autoFixTopology, validateTopology } from './engine/topologyValidator';
import { generateSampleDatasets, SampleDataset } from './engine/sampleDatasets';
import { calibrateScaleFromPoints } from './engine/georeferencing';
import { Language, TRANSLATIONS } from './i18n/translations';

export default function App() {
  // Theme & Language (Arabic RTL default)
  const [lang, setLang] = useState<Language>('ar');
  const [isDark, setIsDark] = useState<boolean>(true);
  const t = TRANSLATIONS[lang];

  // Project & Image State
  const [projectName, setProjectName] = useState<string>('Aerial_Urban_Plan');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [report, setReport] = useState<ImageAnalysisReport | null>(null);

  // CAD Vector Data
  const [features, setFeatures] = useState<CADFeature[]>([]);
  const [layers, setLayers] = useState<CADLayer[]>(Object.values(STANDARD_LAYERS));
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  // History for Undo / Redo
  const [history, setHistory] = useState<CADFeature[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Processing Parameters
  const [params, setParams] = useState<ProcessingParameters>(DEFAULT_PARAMETERS as ProcessingParameters);

  // Scale & Georeferencing
  const [scaleCalibration, setScaleCalibration] = useState<ScaleCalibration>({
    isCalibrated: false,
    knownDistanceMeters: 20,
    pixelDistance: 400,
    metersPerPixel: 0.05,
    unit: 'm',
  });

  // Viewport & Tools
  const [viewMode, setViewMode] = useState<ViewMode>('overlay');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.55);
  const [activeTool, setActiveTool] = useState<ToolType>('select');

  // Mobile Drawer State ('none' | 'layers' | 'properties')
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'layers' | 'properties'>('none');

  // Processing Progress State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Modals
  const [showSampleModal, setShowSampleModal] = useState<boolean>(false);
  const [showScaleModal, setShowScaleModal] = useState<boolean>(false);
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showAndroidModal, setShowAndroidModal] = useState<boolean>(false);

  // Topology Issues
  const [topologyIssues, setTopologyIssues] = useState<TopologyIssue[]>([]);

  // Hidden File Input Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasHandleRef = useRef<CADCanvasHandle | null>(null);

  // Datasets
  const datasets = useRef<SampleDataset[]>(generateSampleDatasets());

  // Record undoable history
  const pushHistory = useCallback(
    (newFeatures: CADFeature[]) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, newFeatures];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  // Load an image from data URL or File
  const loadImage = useCallback(
    async (src: string, name: string, suggestedScale?: number) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        setImageElement(img);
        setImageSrc(src);
        setProjectName(name);

        const analysis = await analyzeImage(img);
        setReport(analysis);

        const scaleVal = suggestedScale || analysis.estimatedScaleMetersPerPx || 0.05;
        setScaleCalibration((prev) => ({
          ...prev,
          isCalibrated: true,
          metersPerPixel: scaleVal,
        }));

        runVectorization(img, analysis);
      };
      img.src = src;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params]
  );

  // Preload Sample 1 (Aerial Drone Urban Sector) on first mount
  useEffect(() => {
    const firstSample = datasets.current[0];
    if (firstSample) {
      loadImage(firstSample.dataUrl, firstSample.name, firstSample.suggestedScaleMetersPerPx);
    }
  }, [loadImage]);

  // Run Vector Conversion Engine
  const runVectorization = async (imgOverride?: HTMLImageElement, reportOverride?: ImageAnalysisReport) => {
    const img = imgOverride || imageElement;
    const rep = reportOverride || report;
    if (!img) return;

    setIsProcessing(true);
    setProgressPercent(5);
    setProgressStage('Starting Computer Vision Pipeline...');

    try {
      const actualReport = rep || (await analyzeImage(img));
      const result = await convertRasterToCAD(img, actualReport, params, (stage, pct) => {
        setProgressStage(stage);
        setProgressPercent(pct);
      });

      setFeatures(result.features);
      setLayers(result.layers);
      pushHistory(result.features);

      const issues = validateTopology(result.features);
      setTopologyIssues(issues);

      setViewMode('overlay');
      setMobileDrawer('none');
    } catch (err) {
      console.error('Vectorization failed', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle local user image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        loadImage(event.target.result, file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      setFeatures(history[nextIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setFeatures(history[nextIdx]);
    }
  };

  // Feature Updates
  const handleUpdateFeature = (updated: CADFeature) => {
    const next = features.map((f) => (f.id === updated.id ? updated : f));
    setFeatures(next);
  };

  // Layer Actions
  const handleToggleLayerVisibility = (layerName: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.name === layerName ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleToggleLayerLock = (layerName: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.name === layerName ? { ...l, locked: !l.locked } : l))
    );
  };

  const handleChangeLayerColor = (layerName: string, color: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.name === layerName ? { ...l, color } : l))
    );
  };

  const handleAddLayer = (newLayer: CADLayer) => {
    setLayers((prev) => [...prev, newLayer]);
  };

  // Selected Feature Management
  const selectedFeature = features.find((f) => f.id === selectedFeatureId) || null;

  const handleAssignFeatureLayer = (layerName: string) => {
    if (!selectedFeatureId) return;
    const next = features.map((f) => (f.id === selectedFeatureId ? { ...f, layer: layerName } : f));
    setFeatures(next);
    pushHistory(next);
  };

  const handleDeleteSelected = () => {
    if (!selectedFeatureId) return;
    const next = features.filter((f) => f.id !== selectedFeatureId);
    setFeatures(next);
    setSelectedFeatureId(null);
    pushHistory(next);
  };

  const handleClosePolygon = () => {
    if (!selectedFeatureId) return;
    const next = features.map((f) =>
      f.id === selectedFeatureId ? { ...f, isClosed: true } : f
    );
    setFeatures(next);
    pushHistory(next);
  };

  // Topology Auto-Fix
  const handleAutoFixTopology = () => {
    const { repairedFeatures } = autoFixTopology(features);
    setFeatures(repairedFeatures);
    pushHistory(repairedFeatures);
    setTopologyIssues([]);
  };

  // Scale calibration from canvas pick
  const handlePickCalibratePoints = (p1: Point2D, p2: Point2D) => {
    const calibrated = calibrateScaleFromPoints(p1, p2, scaleCalibration.knownDistanceMeters, scaleCalibration.unit);
    setScaleCalibration(calibrated);
    setActiveTool('select');
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className={`w-full h-[100dvh] min-h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden font-sans select-none ${
        isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.tiff,.tif,.bmp,.webp"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Navigation Bar */}
      <TopNav
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        onOpenSampleModal={() => setShowSampleModal(true)}
        onTriggerFileInput={() => fileInputRef.current?.click()}
        onRunProcessing={() => runVectorization()}
        isProcessing={isProcessing}
        hasImage={!!imageElement}
        featuresCount={features.length}
        report={report}
        scaleCalibration={scaleCalibration}
        onOpenScaleModal={() => setShowScaleModal(true)}
        onOpenValidationModal={() => setShowValidationModal(true)}
        onOpenExportModal={() => setShowExportModal(true)}
        onOpenAndroidModal={() => setShowAndroidModal(true)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Left Sidebar: CAD Layer Manager (Hidden on mobile) */}
        <div className="hidden lg:flex shrink-0">
          <LayerManager
            lang={lang}
            layers={layers}
            onToggleVisibility={handleToggleLayerVisibility}
            onToggleLock={handleToggleLayerLock}
            onChangeColor={handleChangeLayerColor}
            onAddLayer={handleAddLayer}
            selectedFeatureLayer={selectedFeature?.layer}
            onAssignSelectedFeatureLayer={handleAssignFeatureLayer}
          />
        </div>

        {/* Center: CAD Viewport Canvas with Floating Toolbar */}
        <main className="flex-1 relative overflow-hidden bg-slate-950 pb-16 lg:pb-0">
          <CADCanvas
            ref={canvasHandleRef}
            imageElement={imageElement}
            features={features}
            layers={layers}
            selectedFeatureId={selectedFeatureId}
            onSelectFeature={(id) => {
              setSelectedFeatureId(id);
              if (id && window.innerWidth < 1024) {
                // On mobile, auto-show properties if a feature is picked
                setMobileDrawer('properties');
              }
            }}
            onUpdateFeature={handleUpdateFeature}
            viewMode={viewMode}
            overlayOpacity={overlayOpacity}
            activeTool={activeTool}
            scaleCalibration={scaleCalibration}
            onPickCalibratePoints={handlePickCalibratePoints}
          />

          {/* Floating CAD Toolbar */}
          <Toolbar
            lang={lang}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            overlayOpacity={overlayOpacity}
            onChangeOpacity={setOverlayOpacity}
            activeTool={activeTool}
            onChangeTool={setActiveTool}
            onFitToScreen={() => canvasHandleRef.current?.fitToScreen()}
            onZoomIn={() => canvasHandleRef.current?.zoomIn()}
            onZoomOut={() => canvasHandleRef.current?.zoomOut()}
            onDeleteSelected={handleDeleteSelected}
            onClosePolygon={handleClosePolygon}
            hasSelected={!!selectedFeatureId}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        </main>

        {/* Desktop Right Sidebar: Properties & Parameters (Hidden on mobile) */}
        <div className="hidden lg:flex shrink-0">
          <PropertiesPanel
            lang={lang}
            selectedFeature={selectedFeature}
            layers={layers}
            onUpdateFeatureLayer={handleAssignFeatureLayer}
            params={params}
            onChangeParams={setParams}
            scaleCalibration={scaleCalibration}
          />
        </div>
      </div>

      {/* Mobile Drawer (Bottom Sheet) for Layers or Properties */}
      {mobileDrawer !== 'none' && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          {/* Backdrop tap to dismiss */}
          <div className="flex-1" onClick={() => setMobileDrawer('none')} />

          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl shadow-2xl max-h-[82dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Drag Handle */}
            <div
              className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0 cursor-pointer"
              onClick={() => setMobileDrawer('none')}
            />

            {/* Mobile Drawer Header with Segmented Switcher & Close */}
            <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-900/80 p-1 rounded-xl text-xs font-medium">
                <button
                  onClick={() => setMobileDrawer('layers')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    mobileDrawer === 'layers'
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t.layers}</span>
                </button>
                <button
                  onClick={() => setMobileDrawer('properties')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    mobileDrawer === 'properties'
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{t.properties}</span>
                </button>
              </div>

              <button
                onClick={() => setMobileDrawer('none')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              {mobileDrawer === 'layers' && (
                <LayerManager
                  lang={lang}
                  layers={layers}
                  onToggleVisibility={handleToggleLayerVisibility}
                  onToggleLock={handleToggleLayerLock}
                  onChangeColor={handleChangeLayerColor}
                  onAddLayer={handleAddLayer}
                  selectedFeatureLayer={selectedFeature?.layer}
                  onAssignSelectedFeatureLayer={handleAssignFeatureLayer}
                  onCloseMobileDrawer={() => setMobileDrawer('none')}
                />
              )}

              {mobileDrawer === 'properties' && (
                <PropertiesPanel
                  lang={lang}
                  selectedFeature={selectedFeature}
                  layers={layers}
                  onUpdateFeatureLayer={handleAssignFeatureLayer}
                  params={params}
                  onChangeParams={setParams}
                  scaleCalibration={scaleCalibration}
                  onCloseMobileDrawer={() => setMobileDrawer('none')}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom Navigation Bar (< 1024px) */}
      <MobileBottomNav
        lang={lang}
        activeDrawer={mobileDrawer}
        onToggleDrawer={setMobileDrawer}
        onOpenExportModal={() => setShowExportModal(true)}
        onOpenScaleModal={() => setShowScaleModal(true)}
        onOpenAndroidModal={() => setShowAndroidModal(true)}
        onRunProcessing={() => runVectorization()}
        isProcessing={isProcessing}
        hasImage={!!imageElement}
        featuresCount={features.length}
      />

      {/* Modals */}
      <SampleDatasetsModal
        lang={lang}
        isOpen={showSampleModal}
        onClose={() => setShowSampleModal(false)}
        datasets={datasets.current}
        onSelectDataset={(d) => loadImage(d.dataUrl, d.name, d.suggestedScaleMetersPerPx)}
      />

      <ScaleCalibratorModal
        lang={lang}
        isOpen={showScaleModal}
        onClose={() => setShowScaleModal(false)}
        scaleCalibration={scaleCalibration}
        onApplyCalibration={(mPerPx, dist, unit) => {
          setScaleCalibration((prev) => ({
            ...prev,
            isCalibrated: true,
            metersPerPixel: mPerPx,
            knownDistanceMeters: dist,
            unit,
          }));
        }}
        onActivateCanvasPick={() => setActiveTool('calibrate_pick')}
      />

      <TopologyValidationModal
        lang={lang}
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        issues={topologyIssues}
        onAutoFix={handleAutoFixTopology}
      />

      <ExportModal
        lang={lang}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        features={features}
        layers={layers}
        scaleCalibration={scaleCalibration}
        georeference={{
          crsName: 'Local Engineering Grid',
          epsgCode: '0',
          isReferenced: false,
          gcps: [],
        }}
        imageWidth={imageElement?.naturalWidth || 1000}
        imageHeight={imageElement?.naturalHeight || 800}
        projectName={projectName}
      />

      <AndroidCodeModal
        lang={lang}
        isOpen={showAndroidModal}
        onClose={() => setShowAndroidModal(false)}
      />

      <ProcessingProgressModal
        lang={lang}
        isOpen={isProcessing}
        stage={progressStage}
        percent={progressPercent}
      />
    </div>
  );
}
