/**
 * GeoImage2CAD Pro - Top Navigation Bar
 * Follows the 3-Zone Contract: Brand, Nav links/status, Primary Action buttons.
 * Fully responsive and compact for small mobile screens (down to 320px) up to 4K displays.
 */
import React from 'react';
import {
  FolderOpen,
  Play,
  Download,
  Smartphone,
  CheckCircle2,
  Globe,
  Sun,
  Moon,
  Ruler,
  Layers,
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../i18n/translations';
import { ImageAnalysisReport, ScaleCalibration } from '../types/cad';

interface TopNavProps {
  lang: Language;
  onToggleLang: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSampleModal: () => void;
  onTriggerFileInput: () => void;
  onRunProcessing: () => void;
  isProcessing: boolean;
  hasImage: boolean;
  featuresCount: number;
  report: ImageAnalysisReport | null;
  scaleCalibration: ScaleCalibration;
  onOpenScaleModal: () => void;
  onOpenValidationModal: () => void;
  onOpenExportModal: () => void;
  onOpenAndroidModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  lang,
  onToggleLang,
  isDark,
  onToggleTheme,
  onOpenSampleModal,
  onTriggerFileInput,
  onRunProcessing,
  isProcessing,
  hasImage,
  featuresCount,
  scaleCalibration,
  onOpenScaleModal,
  onOpenValidationModal,
  onOpenExportModal,
  onOpenAndroidModal,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <header className="h-13 sm:h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2.5 sm:px-4 flex items-center justify-between select-none shrink-0 z-20">
      {/* Zone 1: Wordmark & Live Status */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm shrink-0">
            G2C
          </div>
          <span className="font-bold text-xs sm:text-sm md:text-base tracking-tight text-slate-900 dark:text-white truncate max-w-[110px] xs:max-w-[140px] sm:max-w-none">
            GeoImage2CAD
          </span>
        </div>

        {/* Status indicator unboxed text (desktop) */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 ms-2 border-s border-slate-200 dark:border-slate-800 ps-2.5">
          <span>{hasImage ? (featuresCount > 0 ? `${featuresCount} ${t.featuresCount}` : 'Image Loaded') : 'Ready'}</span>
          <span aria-hidden="true">·</span>
          <button
            onClick={onOpenScaleModal}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 font-mono tabular-nums min-h-[32px]"
          >
            <Ruler className="w-3.5 h-3.5" />
            {scaleCalibration.isCalibrated
              ? `${scaleCalibration.metersPerPixel} m/px`
              : t.scaleUncalibrated}
          </button>
        </div>
      </div>

      {/* Zone 2: Fast Action Tools (Visible on tablet & desktop) */}
      <nav className="hidden md:flex items-center gap-1.5 text-xs font-medium">
        <button
          onClick={onTriggerFileInput}
          className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
        >
          <FolderOpen className="w-4 h-4 text-blue-600" />
          <span>{t.importImage}</span>
        </button>

        <button
          onClick={onOpenSampleModal}
          className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
        >
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>{t.sampleDatasets}</span>
        </button>

        {featuresCount > 0 && (
          <button
            onClick={onOpenValidationModal}
            className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
            <span className="hidden xl:inline">{t.validation}</span>
          </button>
        )}
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* On Mobile: Import & Samples Quick Buttons */}
        <button
          onClick={onTriggerFileInput}
          className="md:hidden min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          title={t.importImage}
          aria-label={t.importImage}
        >
          <FolderOpen className="w-4 h-4 text-blue-600" />
        </button>

        <button
          onClick={onOpenSampleModal}
          className="md:hidden min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          title={t.sampleDatasets}
          aria-label={t.sampleDatasets}
        >
          <Layers className="w-4 h-4 text-emerald-600" />
        </button>

        {/* Desktop Primary Run & Export Buttons */}
        {hasImage && (
          <button
            onClick={onRunProcessing}
            disabled={isProcessing}
            className="hidden md:flex min-h-[36px] px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 rounded-lg shadow-sm transition-all items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isProcessing ? t.processing : t.convertNow}</span>
          </button>
        )}

        {featuresCount > 0 && (
          <button
            onClick={onOpenExportModal}
            className="hidden md:flex min-h-[36px] px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 active:scale-95 rounded-lg shadow-sm transition-all items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.export}</span>
          </button>
        )}

        {/* Android Code Modal Button */}
        <button
          onClick={onOpenAndroidModal}
          className="min-h-[36px] min-w-[36px] px-2 sm:px-2.5 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 active:scale-95 transition-all flex items-center gap-1.5"
          title="Android Studio Source Code & GitHub"
          aria-label="Android Source Code"
        >
          <Smartphone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="hidden sm:inline text-xs">{lang === 'ar' ? 'أندرويد' : 'Android'}</span>
        </button>

        {/* Language switch */}
        <button
          onClick={onToggleLang}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all text-xs font-semibold"
          title="Toggle Language"
          aria-label="Toggle Language"
        >
          <span className="text-[11px] font-bold">{lang === 'ar' ? 'EN' : 'عربي'}</span>
        </button>

        {/* Theme switch */}
        <button
          onClick={onToggleTheme}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          title="Toggle Theme"
          aria-label="Toggle Theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};
