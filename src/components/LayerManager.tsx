/**
 * CAD Layer Manager Panel & Mobile Drawer
 * Professional CAD layer controls: Visibility, Lock, Color picker, Lineweight,
 * Feature count, and custom layer creation.
 */
import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, Plus, Layers, Check, X } from 'lucide-react';
import { CADLayer } from '../types/cad';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface LayerManagerProps {
  lang: Language;
  layers: CADLayer[];
  onToggleVisibility: (layerName: string) => void;
  onToggleLock: (layerName: string) => void;
  onChangeColor: (layerName: string, color: string) => void;
  onAddLayer: (newLayer: CADLayer) => void;
  selectedFeatureLayer?: string;
  onAssignSelectedFeatureLayer?: (layerName: string) => void;
  onCloseMobileDrawer?: () => void;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  lang,
  layers,
  onToggleVisibility,
  onToggleLock,
  onChangeColor,
  onAddLayer,
  selectedFeatureLayer,
  onAssignSelectedFeatureLayer,
  onCloseMobileDrawer,
}) => {
  const t = TRANSLATIONS[lang];
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerColor, setNewLayerColor] = useState('#3B82F6');

  const handleCreateLayer = () => {
    if (!newLayerName.trim()) return;
    const cleanName = newLayerName.trim().toUpperCase().replace(/\s+/g, '_');
    onAddLayer({
      name: cleanName,
      displayName: newLayerName.trim(),
      color: newLayerColor,
      dxfColorIndex: 7,
      lineweight: 0.25,
      linetype: 'CONTINUOUS',
      visible: true,
      locked: false,
      featureCount: 0,
    });
    setNewLayerName('');
    setShowAddModal(false);
  };

  return (
    <div className="w-full lg:w-72 bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 flex flex-col h-full select-none text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold tracking-tight uppercase text-slate-900 dark:text-white">
            {t.layers}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAddModal(true)}
            className="min-h-[36px] min-w-[36px] p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
            title="Create New Layer"
          >
            <Plus className="w-4 h-4" />
          </button>
          {onCloseMobileDrawer && (
            <button
              onClick={onCloseMobileDrawer}
              className="lg:hidden min-h-[36px] min-w-[36px] p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
        {layers.map((layer) => {
          const isSelected = selectedFeatureLayer === layer.name;

          return (
            <div
              key={layer.name}
              className={`p-2 rounded-lg flex items-center justify-between gap-2 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                isSelected ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''
              }`}
            >
              {/* Color swatch & Name */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <input
                  type="color"
                  value={layer.color}
                  onChange={(e) => onChangeColor(layer.name, e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent shrink-0"
                  title="Change Layer Color"
                />
                <div className="truncate">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {layer.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {layer.featureCount} obj · {layer.lineweight}mm
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {selectedFeatureLayer && onAssignSelectedFeatureLayer && !isSelected && (
                  <button
                    onClick={() => onAssignSelectedFeatureLayer(layer.name)}
                    className="min-h-[36px] min-w-[36px] p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors flex items-center justify-center"
                    title="Assign selected object to this layer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => onToggleLock(layer.name)}
                  className="min-h-[36px] min-w-[36px] p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center justify-center"
                  title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                >
                  {layer.locked ? (
                    <Lock className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Unlock className="w-4 h-4 opacity-40 hover:opacity-100" />
                  )}
                </button>

                <button
                  onClick={() => onToggleVisibility(layer.name)}
                  className="min-h-[36px] min-w-[36px] p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center justify-center"
                  title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                >
                  {layer.visible ? (
                    <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400 opacity-60" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Add Modal */}
      {showAddModal && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 shrink-0">
          <div className="text-[11px] font-semibold mb-2">Create New CAD Layer</div>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="e.g. BOUNDARY_WALL"
              value={newLayerName}
              onChange={(e) => setNewLayerName(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
            />
            <input
              type="color"
              value={newLayerColor}
              onChange={(e) => setNewLayerColor(e.target.value)}
              className="w-8 h-8 rounded-lg border-0 cursor-pointer shrink-0"
            />
          </div>
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => setShowAddModal(false)}
              className="min-h-[36px] px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleCreateLayer}
              className="min-h-[36px] px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
