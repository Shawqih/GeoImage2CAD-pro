/**
 * Feature Inspector & Processing Parameters Panel & Mobile Drawer
 */
import React from 'react';
import { Sliders, Layers, X } from 'lucide-react';
import { CADFeature, CADLayer, ProcessingParameters, ScaleCalibration } from '../types/cad';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface PropertiesPanelProps {
  lang: Language;
  selectedFeature: CADFeature | null;
  layers: CADLayer[];
  onUpdateFeatureLayer: (layerName: string) => void;
  params: ProcessingParameters;
  onChangeParams: (newParams: ProcessingParameters) => void;
  scaleCalibration: ScaleCalibration;
  onCloseMobileDrawer?: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  lang,
  selectedFeature,
  layers,
  onUpdateFeatureLayer,
  params,
  onChangeParams,
  scaleCalibration,
  onCloseMobileDrawer,
}) => {
  const t = TRANSLATIONS[lang];
  const isScale = scaleCalibration.isCalibrated;
  const unit = isScale ? 'm' : 'px';
  const areaUnit = isScale ? 'm²' : 'px²';

  return (
    <div className="w-full lg:w-80 bg-white dark:bg-slate-900 border-s border-slate-200 dark:border-slate-800 flex flex-col h-full select-none text-slate-800 dark:text-slate-200 text-xs">
      {/* 1. Selected Feature Properties */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-tight text-slate-900 dark:text-white">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.properties}</span>
          </div>
          {onCloseMobileDrawer && (
            <button
              onClick={onCloseMobileDrawer}
              className="lg:hidden min-h-[36px] min-w-[36px] p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {selectedFeature ? (
          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60 font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">ID:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedFeature.id}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Layer:</span>
              <select
                value={selectedFeature.layer}
                onChange={(e) => onUpdateFeatureLayer(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-sans"
              >
                {layers.map((l) => (
                  <option key={l.name} value={l.name}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Geometry:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {selectedFeature.geometryType} {selectedFeature.isClosed ? '(Closed)' : ''}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Confidence:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${selectedFeature.confidence * 100}%` }}
                  />
                </div>
                <span className="text-emerald-500 font-bold tabular-nums">
                  {Math.round(selectedFeature.confidence * 100)}%
                </span>
              </div>
            </div>

            {selectedFeature.area !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Area:</span>
                <span className="tabular-nums">
                  {isScale
                    ? (selectedFeature.area * scaleCalibration.metersPerPixel * scaleCalibration.metersPerPixel).toFixed(1)
                    : selectedFeature.area}{' '}
                  {areaUnit}
                </span>
              </div>
            )}

            {selectedFeature.length !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Perimeter:</span>
                <span className="tabular-nums">
                  {isScale
                    ? (selectedFeature.length * scaleCalibration.metersPerPixel).toFixed(1)
                    : selectedFeature.length}{' '}
                  {unit}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Vertices:</span>
              <span className="tabular-nums">{selectedFeature.points.length}</span>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 dark:text-slate-500 text-[11px] p-2 bg-slate-50 dark:bg-slate-800/20 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
            {t.noFeatureSelected}
          </div>
        )}
      </div>

      {/* 2. Conversion Parameters */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-tight text-slate-900 dark:text-white">
          <Sliders className="w-3.5 h-3.5 text-blue-600" />
          <span>Conversion Parameters</span>
        </div>

        {/* Quality Preset */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            Detection Quality
          </label>
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(['DRAFT', 'NORMAL', 'HIGH', 'ULTRA'] as const).map((q) => (
              <button
                key={q}
                onClick={() => onChangeParams({ ...params, quality: q })}
                className={`min-h-[36px] py-1 text-[11px] font-medium rounded transition-colors ${
                  params.quality === q
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Processing Feature Toggles */}
        <div className="space-y-2.5">
          <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
            <input
              type="checkbox"
              checked={params.buildingRegularization}
              onChange={(e) =>
                onChangeParams({ ...params, buildingRegularization: e.target.checked })
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-medium">{t.paramBuildingReg}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
            <input
              type="checkbox"
              checked={params.roadCenterlineExtraction}
              onChange={(e) =>
                onChangeParams({ ...params, roadCenterlineExtraction: e.target.checked })
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-medium">{t.paramRoadCenterline}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
            <input
              type="checkbox"
              checked={params.treeDetection}
              onChange={(e) => onChangeParams({ ...params, treeDetection: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-medium">{t.paramTreeDetection}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
            <input
              type="checkbox"
              checked={params.waterDetection}
              onChange={(e) => onChangeParams({ ...params, waterDetection: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-medium">{t.paramWaterDetection}</span>
          </label>
        </div>

        {/* Precision Sliders */}
        <div className="space-y-3.5 pt-2 border-t border-slate-200 dark:border-slate-800 font-mono">
          <div>
            <div className="flex justify-between text-xs mb-1 font-sans">
              <span className="text-slate-600 dark:text-slate-400">{t.paramRdpTolerance}</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{params.rdpTolerance} px</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={6.0}
              step={0.1}
              value={params.rdpTolerance}
              onChange={(e) => onChangeParams({ ...params, rdpTolerance: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1 font-sans">
              <span className="text-slate-600 dark:text-slate-400">{t.paramMinFeatureSize}</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{params.minFeatureSize} px²</span>
            </div>
            <input
              type="range"
              min={20}
              max={400}
              step={10}
              value={params.minFeatureSize}
              onChange={(e) => onChangeParams({ ...params, minFeatureSize: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1 font-sans">
              <span className="text-slate-600 dark:text-slate-400">Orthogonalization Tolerance</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{params.orthogonalizationToleranceDeg}°</span>
            </div>
            <input
              type="range"
              min={5}
              max={25}
              step={1}
              value={params.orthogonalizationToleranceDeg}
              onChange={(e) =>
                onChangeParams({ ...params, orthogonalizationToleranceDeg: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
