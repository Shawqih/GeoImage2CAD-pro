/**
 * GeoImage2CAD Pro - Top Navigation Bar
 * Follows the 3-Zone Contract: Brand, Nav links/status, Primary Action buttons.
 * Fully responsive for mobile viewports and desktop workstations.
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
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 sm:px-4 flex items-center justify-between select-none shrink-0 z-20">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
            G2C
          </div>
          <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white truncate">
            GeoImage2CAD Pro
          </span>
        </div>

        {/* Status indicator unboxed text */}
        <div className="hidden xl:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 ms-3 border-s border-slate-200 dark:border-slate-800 ps-3">
          <span>{hasImage ? (featuresCount > 0 ? `${featuresCount} ${t.featuresCount}` : 'Image Loaded') : 'Ready'}</span>
          <span aria-hidden="true">·</span>
          <button
            onClick={onOpenScaleModal}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 font-mono tabular-nums min-h-[36px]"
          >
            <Ruler className="w-3.5 h-3.5" />
            {scaleCalibration.isCalibrated
              ? `${scaleCalibration.metersPerPixel} m/px`
              : t.scaleUncalibrated}
          </button>
        </div>
      </div>

      {/* Zone 2: Fast Action Tools (Visible on tablet & desktop) */}
      <nav className="hidden md:flex items-center gap-2 text-xs font-medium">
        <button
          onClick={onTriggerFileInput}
          className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
        >
          <FolderOpen className="w-4 h-4 text-blue-600" />
          <span>{t.importImage}</span>
        </button>

        <button
          onClick={onOpenSampleModal}
          className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
        >
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>{t.sampleDatasets}</span>
        </button>

        {featuresCount > 0 && (
          <button
            onClick={onOpenValidationModal}
            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
            <span className="hidden lg:inline">{t.validation}</span>
          </button>
        )}
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* On Mobile: Import & Samples Quick Buttons */}
        <button
          onClick={onTriggerFileInput}
          className="md:hidden min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          title={t.importImage}
        >
          <FolderOpen className="w-4 h-4 text-blue-600" />
        </button>

        <button
          onClick={onOpenSampleModal}
          className="md:hidden min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          title={t.sampleDatasets}
        >
          <Layers className="w-4 h-4 text-emerald-600" />
        </button>

        {hasImage && (
          <button
            onClick={onRunProcessing}
            disabled={isProcessing}
            className="hidden md:flex min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isProcessing ? t.processing : t.convertNow}</span>
          </button>
        )}

        {featuresCount > 0 && (
          <button
            onClick={onOpenExportModal}
            className="hidden md:flex min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-lg shadow-sm transition-colors items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.export}</span>
          </button>
        )}

        <button
          onClick={onOpenAndroidModal}
          className="hidden sm:flex min-h-[38px] px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 transition-colors items-center gap-1.5"
          title="Android Kotlin & GitHub CI/CD Hub"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">{t.androidSource}</span>
        </button>

        {/* Language switch */}
        <button
          onClick={onToggleLang}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Language (العربية / English)"
        >
          <Globe className="w-4 h-4" />
        </button>

        {/* Theme switch */}
        <button
          onClick={onToggleTheme}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};
