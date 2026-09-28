/**
 * Mobile Bottom Navigation Bar (< 1024px)
 * Thumb-friendly navigation bar designed according to Mobile Touch Guidelines:
 * 44px+ hitboxes, clean unboxed metadata, and direct access to Drawers.
 */
import React from 'react';
import { Layers, Sliders, Download, Play, Smartphone, Eye } from 'lucide-react';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface MobileBottomNavProps {
  lang: Language;
  activeDrawer: 'none' | 'layers' | 'properties';
  onToggleDrawer: (drawer: 'none' | 'layers' | 'properties') => void;
  onOpenExportModal: () => void;
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
  onOpenAndroidModal,
  onRunProcessing,
  isProcessing,
  hasImage,
  featuresCount,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 h-14 flex items-center justify-around select-none">
      {/* 1. Layers Tab */}
      <button
        onClick={() => onToggleDrawer(activeDrawer === 'layers' ? 'none' : 'layers')}
        className={`flex-1 min-h-[44px] flex flex-col items-center justify-center transition-colors ${
          activeDrawer === 'layers'
            ? 'text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Layers className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">{t.layers.split(' ')[0]}</span>
      </button>

      {/* 2. Properties / Settings Tab */}
      <button
        onClick={() => onToggleDrawer(activeDrawer === 'properties' ? 'none' : 'properties')}
        className={`flex-1 min-h-[44px] flex flex-col items-center justify-center transition-colors ${
          activeDrawer === 'properties'
            ? 'text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Sliders className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Settings</span>
      </button>

      {/* 3. Primary Center Action: Convert / Run */}
      {hasImage && (
        <button
          onClick={onRunProcessing}
          disabled={isProcessing}
          className="min-h-[44px] px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md flex items-center gap-1.5 text-xs font-semibold shrink-0 mx-1 active:scale-95 transition-transform disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current" />
          <span className="text-[11px] whitespace-nowrap">{isProcessing ? '...' : 'Convert'}</span>
        </button>
      )}

      {/* 4. Export Tab */}
      {featuresCount > 0 && (
        <button
          onClick={onOpenExportModal}
          className="flex-1 min-h-[44px] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
        >
          <Download className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t.export.split(' ')[0]}</span>
        </button>
      )}

      {/* 5. Android Code Hub */}
      <button
        onClick={onOpenAndroidModal}
        className="flex-1 min-h-[44px] flex flex-col items-center justify-center text-purple-600 dark:text-purple-400 transition-colors"
        title="Android Studio Source"
      >
        <Smartphone className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Android</span>
      </button>
    </nav>
  );
};
