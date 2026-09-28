/**
 * Scale Calibration & Metric Units Modal
 */
import React, { useState } from 'react';
import { X, Ruler, Check, Crosshair } from 'lucide-react';
import { ScaleCalibration } from '../types/cad';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface ScaleCalibratorModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  scaleCalibration: ScaleCalibration;
  onApplyCalibration: (metersPerPx: number, knownDistance: number, unit: 'm' | 'ft' | 'cm') => void;
  onActivateCanvasPick: () => void;
}

export const ScaleCalibratorModal: React.FC<ScaleCalibratorModalProps> = ({
  lang,
  isOpen,
  onClose,
  scaleCalibration,
  onApplyCalibration,
  onActivateCanvasPick,
}) => {
  const t = TRANSLATIONS[lang];
  const [knownDist, setKnownDist] = useState<number>(scaleCalibration.knownDistanceMeters || 20);
  const [unit, setUnit] = useState<'m' | 'ft' | 'cm'>('m');
  const [customMetersPerPx, setCustomMetersPerPx] = useState<string>(
    scaleCalibration.metersPerPixel ? scaleCalibration.metersPerPixel.toString() : '0.05'
  );

  if (!isOpen) return null;

  const handleSave = () => {
    const val = parseFloat(customMetersPerPx);
    if (!isNaN(val) && val > 0) {
      onApplyCalibration(val, knownDist, unit);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {t.scaleCalibrate}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {t.calibratePrompt}
          </p>

          {/* Interactive Canvas Pick Option */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-200">
                Interactive Two-Point Measure
              </div>
              <div className="text-[11px] text-blue-700 dark:text-blue-300">
                Pick reference points A & B directly on image canvas
              </div>
            </div>
            <button
              onClick={() => {
                onActivateCanvasPick();
                onClose();
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Pick on Canvas</span>
            </button>
          </div>

          {/* Manual inputs */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Known Ground Distance
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={knownDist}
                  onChange={(e) => setKnownDist(parseFloat(e.target.value) || 1)}
                  className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 font-mono"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as any)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
                >
                  <option value="m">Meters (m)</option>
                  <option value="ft">Feet (ft)</option>
                  <option value="cm">Centimeters (cm)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ground Resolution (Meters per Pixel)
              </label>
              <input
                type="text"
                value={customMetersPerPx}
                onChange={(e) => setCustomMetersPerPx(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 font-mono"
                placeholder="e.g. 0.05"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Typical Drone: 0.03 - 0.08 m/px | Satellite: 0.3 - 1.0 m/px
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/40">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t.applyCalibration}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
