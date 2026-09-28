/**
 * Scale Calibration & Metric Units Modal
 * Mobile & Desktop touch-optimized dialog for calibrating real-world scale (m/px).
 */
import React, { useState } from 'react';
import { X, Ruler, Crosshair } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Ruler className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              {t.scaleCalibrate}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {t.calibratePrompt}
          </p>

          {/* Interactive Canvas Pick Option */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-200">
                {lang === 'ar' ? 'القياس التفاعلي بين نقطتين' : 'Interactive Two-Point Measure'}
              </div>
              <div className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                {lang === 'ar' ? 'حدد النقطتين A و B مباشرة على شاشة المخطط' : 'Pick reference points A & B directly on image canvas'}
              </div>
            </div>
            <button
              onClick={() => {
                onActivateCanvasPick();
                onClose();
              }}
              className="min-h-[38px] px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shrink-0"
            >
              <Crosshair className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تحديد من المخطط' : 'Pick on Canvas'}</span>
            </button>
          </div>

          {/* Manual inputs */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'المسافة الفعلية المعروفة' : 'Known Ground Distance'}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={knownDist}
                  onChange={(e) => setKnownDist(parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium"
                >
                  <option value="m">Meters (متر)</option>
                  <option value="ft">Feet (قدم)</option>
                  <option value="cm">Centimeters (سم)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'مقياس البكسل المباشر (متر لكل بكسل)' : 'Meters per Pixel'}
              </label>
              <input
                type="number"
                step="0.001"
                min="0.0001"
                value={customMetersPerPx}
                onChange={(e) => setCustomMetersPerPx(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                {lang === 'ar' ? 'القيمة الشائعة لصور الدرون: 0.03 إلى 0.08 م/بكسل، وصور الأقمار: 0.3 إلى 0.5 م/بكسل' : 'Typical drone imagery: 0.03–0.08 m/px; Satellite: 0.3–0.5 m/px'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/40 shrink-0">
          <button
            onClick={onClose}
            className="min-h-[38px] px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            className="min-h-[38px] px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            {t.applyCalibration}
          </button>
        </div>
      </div>
    </div>
  );
};
