/**
 * Preloaded Sample Engineering Benchmarks Modal
 * Responsive for mobile and desktop screens.
 */
import React from 'react';
import { X, Layers, Play } from 'lucide-react';
import { SampleDataset } from '../engine/sampleDatasets';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface SampleDatasetsModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  datasets: SampleDataset[];
  onSelectDataset: (dataset: SampleDataset) => void;
}

export const SampleDatasetsModal: React.FC<SampleDatasetsModalProps> = ({
  lang,
  isOpen,
  onClose,
  datasets,
  onSelectDataset,
}) => {
  const t = TRANSLATIONS[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200 flex flex-col my-auto max-h-[92dvh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                {t.sampleDatasets}
              </h3>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                {lang === 'ar' ? 'اختر صورة مرجعية لاختبار محرك الرؤية والتحويل الهندسي الفوري' : 'Choose a benchmark test image to verify on-device CV & DXF generation.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dataset Grid */}
        <div className="p-3 sm:p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5 flex-1">
          {datasets.map((d) => (
            <div
              key={d.id}
              onClick={() => {
                onSelectDataset(d);
                onClose();
              }}
              className="group cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-blue-500 dark:hover:border-blue-500 transition-all flex flex-col justify-between active:scale-[0.99]"
            >
              <div>
                {/* Thumbnail Preview */}
                <div className="w-full h-32 sm:h-36 rounded-lg overflow-hidden bg-slate-900 mb-2.5 border border-slate-200/60 dark:border-slate-800 relative">
                  <img
                    src={d.dataUrl}
                    alt={d.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 start-2 bg-slate-950/80 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-0.5 rounded">
                    {d.category}
                  </div>
                </div>

                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {lang === 'ar' ? d.nameAr : d.name}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  {lang === 'ar' ? d.descriptionAr : d.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px]">
                <span className="font-mono text-slate-500 text-[10px] sm:text-[11px]">
                  {d.width}x{d.height}px · ~{d.suggestedScaleMetersPerPx}m/px
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{lang === 'ar' ? 'تشغيل العينة' : 'Load & Run'}</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/40 shrink-0">
          <button
            onClick={onClose}
            className="min-h-[38px] px-4 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
