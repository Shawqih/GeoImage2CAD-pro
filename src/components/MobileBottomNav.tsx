/**
 * Mobile Bottom Navigation Bar (< 1024px)
 * Thumb-friendly native-feel navigation bar:
 * - 44px+ hitboxes
 * - Safe area inset padding for modern iOS & Android devices
 * - Clear active states & tactile feedback
 * - Direct drawer toggling and instant action triggers
 */
import React from 'react';
import { Layers, Sliders, Download, Play, Ruler, Smartphone } from 'lucide-react';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface MobileBottomNavProps {
  lang: Language;
  activeDrawer: 'none' | 'layers' | 'properties';
  onToggleDrawer: (drawer: 'none' | 'layers' | 'properties') => void;
  onOpenExportModal: () => void;
  onOpenScaleModal: () => void;
  onOpenAndroidModal: () => void;
  onRunProcessing: () => void;
  isProcessing: boolean;
  hasImage: boolean;
  featuresCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  lang,
  activeDrawer,
  onToggleDrawer,
  onOpenExportModal,
  onOpenScaleModal,
  onRunProcessing,
  isProcessing,
  hasImage,
  featuresCount,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 pb-[env(safe-area-inset-bottom,0px)] h-16 flex items-center justify-around select-none shadow-2xl">
      {/* 1. Layers Tab */}
      <button
        onClick={() => onToggleDrawer(activeDrawer === 'layers' ? 'none' : 'layers')}
        className={`flex-1 min-h-[44px] flex flex-col items-center justify-center transition-colors active:scale-95 ${
          activeDrawer === 'layers'
            ? 'text-blue-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        aria-label={t.layers}
      >
        <div className="relative">
          <Layers className="w-5 h-5" />
          {featuresCount > 0 && (
            <span className="absolute -top-1 -end-2 w-2 h-2 rounded-full bg-blue-500" />
          )}
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight">{t.layers.split(' ')[0]}</span>
      </button>

      {/* 2. Settings / Properties Tab */}
      <button
        onClick={() => onToggleDrawer(activeDrawer === 'properties' ? 'none' : 'properties')}
        className={`flex-1 min-h-[44px] flex flex-col items-center justify-center transition-colors active:scale-95 ${
          activeDrawer === 'properties'
            ? 'text-blue-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        aria-label={t.properties}
      >
        <Sliders className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 tracking-tight">
          {lang === 'ar' ? 'الإعدادات' : 'Settings'}
        </span>
      </button>

      {/* 3. Primary Center Action: Convert / Run */}
      <div className="flex-1 flex justify-center items-center">
        <button
          onClick={onRunProcessing}
          disabled={isProcessing || !hasImage}
          className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white shadow-lg shadow-blue-500/25 flex flex-col items-center justify-center active:scale-90 transition-transform disabled:opacity-40 disabled:pointer-events-none"
          title={isProcessing ? t.processing : t.convertNow}
          aria-label={t.convertNow}
        >
          <Play className={`w-5 h-5 fill-current ${isProcessing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 4. Scale Calibrator Tab */}
      <button
        onClick={onOpenScaleModal}
        className="flex-1 min-h-[44px] flex flex-col items-center justify-center text-slate-400 hover:text-blue-400 transition-colors active:scale-95"
        aria-label={t.scaleCalibrate}
      >
        <Ruler className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 tracking-tight">
          {lang === 'ar' ? 'المقياس' : 'Scale'}
        </span>
      </button>

      {/* 5. Export Tab */}
      <button
        onClick={onOpenExportModal}
        disabled={featuresCount === 0}
        className="flex-1 min-h-[44px] flex flex-col items-center justify-center text-slate-400 hover:text-blue-400 disabled:opacity-40 transition-colors active:scale-95"
        aria-label={t.export}
      >
        <Download className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 tracking-tight">
          {lang === 'ar' ? 'تصدير' : 'Export'}
        </span>
      </button>
    </nav>
  );
};
